import { Router } from 'express';
import { z } from 'zod';
import { createBooking, findConflict, listBookings, listUserBookings, listRoomBookingsBetween } from '../repositories/bookingRepo';
import { getBooking, cancelBooking } from '../repositories/bookingRepo';
import { requireAuth } from '../middleware/requireAuth';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const router = Router();

function presentStatus(rawStatus: string, endTime: Date): 'booked' | 'completed' | 'canceled' {
  if (rawStatus === 'CANCELED') return 'canceled';
  return endTime.getTime() < Date.now() ? 'completed' : 'booked';
}

function presentBooking(b: any) {
  return {
    id: b.id,
    roomId: b.roomId,
    userId: b.userId,
    startTime: b.startTime,
    endTime: b.endTime,
    players: b.players,
    price: b.price,
    status: presentStatus(b.status, new Date(b.endTime)),
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

// Auth enforced for mutating and user-specific endpoints.

const createBookingSchema = z.object({
  roomId: z.string().uuid().or(z.string()),
  startTimeIso: z.string().datetime(), // ISO string from client (UTC)
  players: z.number().int().min(1).max(4),
  hours: z.number().int().min(1).max(4),
});

router.get('/', async (_req, res) => {
  const bookings = await listBookings();
  res.json({ bookings: bookings.map(presentBooking) });
});

// Optional helper to fetch rooms (basic list)
router.get('/rooms', async (_req, res) => {
  try {
    // Lazy import prisma to avoid circulars; small helper here
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const rooms = await prisma.room.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    res.json({ rooms });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load rooms' });
  }
});

router.get('/mine', requireAuth, async (req, res) => {
  const bookings = await listUserBookings(req.user!.id);
  res.json({ bookings: bookings.map(presentBooking) });
});

// Cancel a booking (own bookings only for now)
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  const { id } = req.params as { id: string };
  try {
    const booking = await getBooking(id);
    if (!booking) return res.status(404).json({ error: 'Not found' });
    if (booking.userId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
    // Rule: cannot cancel past or already canceled
    if (booking.status === 'CANCELED') return res.status(400).json({ error: 'Already canceled' });
    if (booking.startTime <= new Date()) return res.status(400).json({ error: 'Cannot cancel past bookings' });

    const updated = await cancelBooking(id);
    return res.json({ booking: presentBooking(updated) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { roomId, startTimeIso, players, hours } = parsed.data;

  // Fetch room for status/hours validation
  const room: any = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.status && room.status !== 'ACTIVE') {
    return res.status(409).json({ error: 'Room not bookable (status)', status: room.status });
  }

  let start: Date;
  try {
    start = new Date(startTimeIso);
    if (isNaN(start.getTime())) throw new Error('Invalid date');
  } catch {
    return res.status(400).json({ error: 'Invalid startTimeIso' });
  }

  // Compute endTime for conflict detection
  const end = new Date(start.getTime() + hours * 60 * 60 * 1000);

  // Enforce within room operating window (local wall clock). Using server local time for now.
  const localY = start.getFullYear();
  const localM = start.getMonth();
  const localD = start.getDate();
  const minutesFromMidnight = (dt: Date) => dt.getHours() * 60 + dt.getMinutes();
  const startMinutes = minutesFromMidnight(start);
  const endMinutes = minutesFromMidnight(end);
  if (start.getFullYear() !== localY || start.getMonth() !== localM || start.getDate() !== localD) {
    // cross-day bookings not supported
    return res.status(400).json({ error: 'Cross-day bookings not supported' });
  }
  if (room.openMinutes !== undefined && room.closeMinutes !== undefined && !(startMinutes >= room.openMinutes && endMinutes <= room.closeMinutes)) {
    return res.status(400).json({ error: 'Booking outside room operating hours' });
  }

  // Rule: cannot book a past time slot
  const now = new Date();
  if (start.getTime() <= now.getTime()) {
    return res.status(400).json({ error: 'Cannot book a past time slot' });
  }

  // Conflict: overlap with any existing non-canceled booking in the same room
  const conflict = await findConflict(roomId, start, end);
  if (conflict) {
    return res.status(409).json({ error: 'Time slot overlaps an existing booking' });
  }

  const HOURLY_RATE = 50; // $50/hour per person
  const price = players * hours * HOURLY_RATE; // decimal dollars

  try {
  const booking = await createBooking({
      roomId,
      userId: req.user!.id,
      startTime: start,
      players,
      hours,
      price,
    });
  res.status(201).json({ booking: presentBooking(booking) });
  } catch (e: any) {
    if (e.code === 'P2002') { // unique constraint
      return res.status(409).json({ error: 'Time slot already booked' });
    }
    console.error(e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Compute availability without a new table. Query params:
// roomId (string), date (YYYY-MM-DD, local), slotMinutes (default 30), openStart (e.g., "09:00"), openEnd (e.g., "23:00"), hours (desired continuous hours, 1-4)
router.get('/availability', async (req, res) => {
  const { roomId } = req.query as { roomId?: string };
  const dateStr = (req.query.date as string) || undefined;
  const slotMinutes = parseInt((req.query.slotMinutes as string) || '30', 10);
  const hours = Math.min(Math.max(parseInt((req.query.hours as string) || '1', 10) || 1, 1), 4);

  if (!roomId) return res.status(400).json({ error: 'roomId required' });
  if (!dateStr) return res.status(400).json({ error: 'date required (YYYY-MM-DD)' });
  if (!(slotMinutes > 0 && slotMinutes <= 120)) return res.status(400).json({ error: 'slotMinutes must be 1-120' });

  // Fetch room (hours + status)
  const room: any = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.status && room.status !== 'ACTIVE') {
    return res.json({ meta: { roomId, date: dateStr, status: room.status, slots: 0 }, slots: [] });
  }

  // Build day window in UTC from the provided local date string.
  // Assumption: dateStr refers to local timezone of the venue; adjust if TZ handling is needed.
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return res.status(400).json({ error: 'invalid date format' });

  function makeTime(hours24: number, minutes: number) {
    // Create a Date in local time for the venue day and then rely on JS Date to carry timezone offset.
    return new Date(y, m - 1, d, hours24, minutes, 0, 0);
  }

  // Derive open/close from room minutes
  const minutesToHM = (mins: number) => ({ h: Math.floor(mins / 60), m: mins % 60 });
  const { h: openH, m: openM } = minutesToHM(room.openMinutes ?? 540);
  const { h: closeH, m: closeM } = minutesToHM(room.closeMinutes ?? 1140);
  const dayOpen = makeTime(openH, openM);
  const dayClose = makeTime(closeH, closeM);
  if (!(dayClose.getTime() > dayOpen.getTime())) return res.status(500).json({ error: 'Invalid room operating window' });

  // Fetch existing bookings that intersect the day window
  const existing = await listRoomBookingsBetween(roomId, dayOpen, dayClose);

  // Walk slots from open to close-slotWindow, mark available if the continuous window fits with no overlap
  const desiredMs = hours * 60 * 60 * 1000;
  const stepMs = slotMinutes * 60 * 1000;
  const lastStartAllowed = new Date(dayClose.getTime() - desiredMs);

  const slots: { startIso: string; endIso: string; available: boolean }[] = [];
  const now = new Date();
  for (let t = dayOpen.getTime(); t <= lastStartAllowed.getTime(); t += stepMs) {
    const s = new Date(t);
    const e = new Date(t + desiredMs);
    const overlaps = existing.some((b) => b.startTime < e && b.endTime > s);
    const futureStart = s.getTime() > now.getTime();
    slots.push({ startIso: s.toISOString(), endIso: e.toISOString(), available: futureStart && !overlaps });
  }

  res.json({
    meta: {
      roomId,
      date: dateStr,
  openMinutes: room.openMinutes ?? 540,
  closeMinutes: room.closeMinutes ?? 1140,
  status: room.status ?? 'ACTIVE',
      slotMinutes,
      hours,
    },
    slots,
  });
});

// Admin-only endpoint to update room schedule / status
const updateRoomSchema = z.object({
  openMinutes: z.number().int().min(0).max(1439).optional(),
  closeMinutes: z.number().int().min(1).max(1440).optional(),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'CLOSED']).optional(),
});

router.patch('/rooms/:id', requireAuth, async (req, res) => {
  const userRole = (req.user as any)?.role;
  if (userRole !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
  const parsed = updateRoomSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { id } = req.params as { id: string };
  const data = parsed.data;
  if (data.openMinutes !== undefined && data.closeMinutes !== undefined) {
    if (!(data.closeMinutes > data.openMinutes)) {
      return res.status(400).json({ error: 'closeMinutes must be greater than openMinutes' });
    }
  }
  try {
    // Prevent shrinking hours that would orphan existing future bookings
    if (data.openMinutes !== undefined || data.closeMinutes !== undefined) {
  const room: any = await prisma.room.findUnique({ where: { id } });
      if (!room) return res.status(404).json({ error: 'Room not found' });
  const newOpen = data.openMinutes ?? room.openMinutes ?? 540;
  const newClose = data.closeMinutes ?? room.closeMinutes ?? 1140;
      if (!(newClose > newOpen)) return res.status(400).json({ error: 'Invalid window' });
      // Look for future bookings outside new window
      const now = new Date();
      const future = await prisma.booking.findFirst({
        where: {
          roomId: id,
          startTime: { gt: now },
          status: { not: 'CANCELED' },
          OR: [
            { startTime: { lt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.floor(newOpen/60), newOpen%60) } },
            { endTime: { gt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.floor(newClose/60), newClose%60) } },
          ],
        },
      });
      if (future) {
        return res.status(409).json({ error: 'Future bookings exist outside new window' });
      }
    }
    const updated = await prisma.room.update({ where: { id }, data });
    res.json({ room: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as bookingRouter };
