import { Router } from 'express';
import { z } from 'zod';
import { createBooking, findConflict, listBookings, listUserBookings, listRoomBookingsBetween } from '../repositories/bookingRepo';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

// Auth enforced for mutating and user-specific endpoints.

const createBookingSchema = z.object({
  roomId: z.string().uuid().or(z.string()),
  startTimeIso: z.string().datetime(), // ISO string from client (UTC)
  players: z.number().int().min(1).max(4),
  hours: z.number().int().min(1).max(4),
});

router.get('/', async (_req, res) => {
  const bookings = await listBookings();
  res.json({ bookings });
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
  res.json({ bookings });
});

router.post('/', requireAuth, async (req, res) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { roomId, startTimeIso, players, hours } = parsed.data;

  let start: Date;
  try {
    start = new Date(startTimeIso);
    if (isNaN(start.getTime())) throw new Error('Invalid date');
  } catch {
    return res.status(400).json({ error: 'Invalid startTimeIso' });
  }

  // Compute endTime for conflict detection
  const end = new Date(start.getTime() + hours * 60 * 60 * 1000);

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
    res.status(201).json({ booking });
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
  const openStart = (req.query.openStart as string) || '09:00';
  const openEnd = (req.query.openEnd as string) || '23:00';
  const hours = Math.min(Math.max(parseInt((req.query.hours as string) || '1', 10) || 1, 1), 4);

  if (!roomId) return res.status(400).json({ error: 'roomId required' });
  if (!dateStr) return res.status(400).json({ error: 'date required (YYYY-MM-DD)' });
  if (!(slotMinutes > 0 && slotMinutes <= 120)) return res.status(400).json({ error: 'slotMinutes must be 1-120' });

  // Build day window in UTC from the provided local date string.
  // Assumption: dateStr refers to local timezone of the venue; adjust if TZ handling is needed.
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return res.status(400).json({ error: 'invalid date format' });

  function makeTime(hours24: number, minutes: number) {
    // Create a Date in local time for the venue day and then rely on JS Date to carry timezone offset.
    return new Date(y, m - 1, d, hours24, minutes, 0, 0);
  }

  const [openSh, openSm] = openStart.split(':').map((n) => parseInt(n, 10));
  const [openEh, openEm] = openEnd.split(':').map((n) => parseInt(n, 10));
  const dayOpen = makeTime(openSh, openSm);
  const dayClose = makeTime(openEh, openEm);
  if (!(dayClose.getTime() > dayOpen.getTime())) return res.status(400).json({ error: 'openEnd must be after openStart' });

  // Fetch existing bookings that intersect the day window
  const existing = await listRoomBookingsBetween(roomId, dayOpen, dayClose);

  // Walk slots from open to close-slotWindow, mark available if the continuous window fits with no overlap
  const desiredMs = hours * 60 * 60 * 1000;
  const stepMs = slotMinutes * 60 * 1000;
  const lastStartAllowed = new Date(dayClose.getTime() - desiredMs);

  const slots: { startIso: string; endIso: string; available: boolean }[] = [];
  for (let t = dayOpen.getTime(); t <= lastStartAllowed.getTime(); t += stepMs) {
    const s = new Date(t);
    const e = new Date(t + desiredMs);
    const overlaps = existing.some((b) => b.startTime < e && b.endTime > s);
    slots.push({ startIso: s.toISOString(), endIso: e.toISOString(), available: !overlaps });
  }

  res.json({
    meta: {
      roomId,
      date: dateStr,
      openStart,
      openEnd,
      slotMinutes,
      hours,
    },
    slots,
  });
});

export { router as bookingRouter };
