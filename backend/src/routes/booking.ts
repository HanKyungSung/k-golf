import { Router } from 'express';
import { z } from 'zod';
import { createBooking, findConflict, listBookings, listUserBookings, listRoomBookingsBetween } from '../repositories/bookingRepo';
import { getBooking, cancelBooking, updatePaymentStatus } from '../repositories/bookingRepo';
import { requireAuth } from '../middleware/requireAuth';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const router = Router();

function presentStatus(rawStatus: string, endTime: Date): 'booked' | 'completed' | 'canceled' {
  if (rawStatus === 'CANCELLED') return 'canceled';
  return endTime.getTime() < Date.now() ? 'completed' : 'booked';
}

function presentBooking(b: any) {
  return {
    id: b.id,
    roomId: b.roomId,
    userId: b.userId,
    customerName: b.customerName,
    customerPhone: b.customerPhone,
    customerEmail: b.customerEmail,
    startTime: b.startTime,
    endTime: b.endTime,
    players: b.players,
    price: b.price,
    status: presentStatus(b.bookingStatus, new Date(b.endTime)),
    bookingStatus: b.bookingStatus, // Send raw bookingStatus for POS
    bookingSource: b.bookingSource,
    internalNotes: b.internalNotes,
    paymentStatus: b.paymentStatus,
    billedAt: b.billedAt,
    paidAt: b.paidAt,
    paymentMethod: b.paymentMethod,
    tipAmount: b.tipAmount,
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

router.get('/', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const sortBy = (req.query.sortBy as 'startTime' | 'createdAt') || 'startTime';
  const order = (req.query.order as 'asc' | 'desc') || 'desc';
  const updatedAfter = req.query.updatedAfter as string | undefined;

  const result = await listBookings({ page, limit, sortBy, order, updatedAfter });
  
  res.json({
    bookings: result.bookings.map(presentBooking),
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  });
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

// Get single booking by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const booking = await getBooking(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({ booking: presentBooking(booking) });
  } catch (error) {
    console.error('[GET BOOKING] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update booking status (admin only)
const updateStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'COMPLETED', 'CANCELLED']),
});

router.patch('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.flatten() 
      });
    }

    const { status } = parsed.data;

    const booking = await getBooking(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Business rules for status transitions
    if (status === 'CANCELLED') {
      // Cannot cancel completed bookings
      if (booking.bookingStatus === 'COMPLETED') {
        return res.status(400).json({ error: 'Cannot cancel completed bookings' });
      }
    }

    if (status === 'COMPLETED') {
      // Cannot complete cancelled bookings
      if (booking.bookingStatus === 'CANCELLED') {
        return res.status(400).json({ error: 'Cannot complete cancelled bookings' });
      }
    }

    // Update booking status
    const updated = await prisma.booking.update({
      where: { id },
      data: { 
        bookingStatus: status,
        updatedAt: new Date(),
      },
    });

    return res.json({ 
      booking: presentBooking(updated),
      message: `Booking ${status.toLowerCase()} successfully` 
    });
  } catch (error) {
    console.error('[UPDATE BOOKING STATUS] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel a booking (own bookings only for now)
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  const { id } = req.params as { id: string };
  try {
    const booking = await getBooking(id);
    if (!booking) return res.status(404).json({ error: 'Not found' });
    if (booking.userId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
    // Rule: cannot cancel past or already canceled
    if (booking.bookingStatus === 'CANCELLED') return res.status(400).json({ error: 'Already canceled' });
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
      customerName: (req.user as any).name || 'Guest',
      customerPhone: (req.user as any).phone || '111-111-1111',
      startTime: start,
      players,
      hours,
      price,
      bookingSource: 'ONLINE', // Web frontend bookings are always ONLINE
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
          bookingStatus: { not: 'CANCELLED' },
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
    console.error('[ROOM UPDATE] Error updating room:', id, 'data:', data);
    console.error('[ROOM UPDATE] Exception:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DEPRECATED: Old admin create endpoint - kept for reference but disabled
// Use the new /admin/create endpoint below that supports customerMode (existing/new/guest)
/*
const adminCreateBookingSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email('Valid email is required'),
  customerPhone: z.string().min(1, 'Customer phone is required'),
  roomId: z.string().uuid().or(z.string()),
  startTimeIso: z.string().datetime(),
  players: z.number().int().min(1).max(4),
  hours: z.number().int().min(1).max(4),
});

router.post('/admin/create-OLD', requireAuth, async (req, res) => {
  // Check if user is admin
  if ((req.user as any).role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const parsed = adminCreateBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { customerName, customerEmail, customerPhone, roomId, startTimeIso, players, hours } = parsed.data;

  // Fetch room for validation
  const room: any = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.status && room.status !== 'ACTIVE') {
    return res.status(409).json({ error: 'Room not bookable (status)', status: room.status });
  }

  let start: Date;
  try {
    start = new Date(startTimeIso);
    if (isNaN(start.getTime())) throw new Error('Invalid date');
  } catch (e) {
    return res.status(400).json({ error: 'Invalid startTimeIso' });
  }

  const end = new Date(start.getTime() + hours * 3600 * 1000);

  // Check room hours
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const openMinutes = room.openMinutes ?? 540;
  const closeMinutes = room.closeMinutes ?? 1140;

  if (startMinutes < openMinutes || endMinutes > closeMinutes) {
    return res.status(400).json({
      error: 'Booking outside room operating hours',
      roomHours: { open: openMinutes, close: closeMinutes },
      bookingHours: { start: startMinutes, end: endMinutes },
    });
  }

  // Check for conflicts
  const conflict = await findConflict(roomId, start, end);
  if (conflict) {
    return res.status(409).json({ error: 'Time slot already booked', conflictingBooking: conflict.id });
  }

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email: customerEmail.toLowerCase() } });
  if (!user) {
    // Create a customer account for this walk-in/phone booking
    user = await (prisma.user as any).create({
      data: {
        email: customerEmail.toLowerCase(),
        name: customerName,
        phone: customerPhone,
        role: UserRole.CUSTOMER,
        emailVerifiedAt: new Date(), // Auto-verify for admin-created accounts
      },
    });
  }

  // Calculate price (basic: hourlyRate * hours, if available)
  const hourlyRate = 50; // TODO: Get from room or pricing config
  const price = hourlyRate * hours;

  try {
    const booking = await createBooking({
      roomId,
      userId: user!.id,
      customerName,
      customerPhone,
      startTime: start,
      endTime: end,
      players,
      price,
      status: 'CONFIRMED',
    });

    res.status(201).json({ booking: presentBooking(booking) });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return res.status(409).json({ error: 'Time slot already booked' });
    }
    console.error('[ADMIN CREATE BOOKING] Error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});
*/

/**
 * Phase 1.4: Admin Manual Booking Creation
 * POST /api/bookings/admin/create
 * 
 * Supports two customer modes:
 * 1. existing - Lookup existing customer by phone (returns customer profile)
 * 2. new - Create new customer profile + booking in transaction
 * 
 * NOTE: All bookings now require a User (customer profile). "Guest" bookings
 * are now customer profiles without login credentials (passwordHash: null).
 * This allows tracking customer history while maintaining flexibility.
 */

// Zod schemas for admin booking creation
const customerDataSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().min(1, 'Customer phone is required'),
  email: z.string().email().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  password: z.string().min(1, 'Password is required'),
});

const guestDataSchema = z.object({
  name: z.string().min(1, 'Guest name is required'),
  phone: z.string().min(1, 'Guest phone is required'),
  email: z.string().email().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
});

const adminBookingSchema = z.object({
  // Customer mode
  customerMode: z.enum(['existing', 'new', 'guest']),
  customerPhone: z.string().optional(), // For existing mode
  newCustomer: customerDataSchema.optional(), // For new mode
  guest: guestDataSchema.optional(), // For guest mode
  
  // Booking details
  roomId: z.string().uuid().or(z.string()), // Accept UUID or simple string for mock rooms
  startTimeIso: z.string().datetime(),
  hours: z.number().int().min(1).max(8),
  players: z.number().int().min(1).max(4),
  
  // Booking source
  bookingSource: z.enum(['WALK_IN', 'PHONE']),
  
  // Optional overrides
  customPrice: z.number().positive().optional(),
  customTaxRate: z.number().min(0).max(1).optional(), // 0.13 = 13%
  internalNotes: z.string().optional(),
});

// Helper: Get global tax rate from settings
async function getGlobalTaxRate(): Promise<number> {
  const setting = await prisma.setting.findUnique({
    where: { key: 'global_tax_rate' },
  });
  return setting ? parseFloat(setting.value) : 0.13; // Default 13%
}

// Helper: Calculate price with tax
function calculatePricing(basePrice: number, taxRate: number) {
  const tax = basePrice * taxRate;
  const totalPrice = basePrice + tax;
  return {
    basePrice,
    taxRate,
    tax,
    totalPrice,
  };
}

// Middleware: Require ADMIN role
function requireAdmin(req: any, res: any, next: any) {
  if (!req.user || req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

router.post('/admin/create', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Validate request body
    const parsed = adminBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.flatten() 
      });
    }

    const {
      customerMode,
      customerPhone,
      newCustomer,
      guest,
      roomId,
      startTimeIso,
      hours,
      players,
      bookingSource,
      customPrice,
      customTaxRate,
      internalNotes,
    } = parsed.data;

    // Validate mode-specific data
    if (customerMode === 'existing' && !customerPhone) {
      return res.status(400).json({ error: 'customerPhone required for existing mode' });
    }
    if (customerMode === 'new' && !newCustomer) {
      return res.status(400).json({ error: 'newCustomer data required for new mode' });
    }
    if (customerMode === 'guest' && !guest) {
      return res.status(400).json({ error: 'guest data required for guest mode' });
    }

    // Validate room exists and is active
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    if (room.status !== 'ACTIVE') {
      return res.status(400).json({ 
        error: 'Room not available for booking', 
        roomStatus: room.status 
      });
    }

    // Parse and validate times
    const startTime = new Date(startTimeIso);
    const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);

    // Check for time slot conflicts
    const conflict = await findConflict(roomId, startTime, endTime);
    if (conflict) {
      return res.status(409).json({
        error: 'Time slot conflict',
        conflictingBooking: {
          id: conflict.id,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
        },
      });
    }

    // Calculate pricing
    const defaultHourlyRate = 50; // TODO: Get from room pricing config
    const basePrice = customPrice || (defaultHourlyRate * hours);
    const taxRate = customTaxRate !== undefined ? customTaxRate : await getGlobalTaxRate();
    const pricing = calculatePricing(basePrice, taxRate);

    // Import phone utilities
    const { normalizePhone } = await import('../utils/phoneUtils');

    let userId: string;
    let customerName: string;
    let customerPhoneNormalized: string;
    let customerEmail: string | undefined;
    let userCreated = false;

    // Handle customer modes
    if (customerMode === 'existing') {
      // Lookup existing customer profile
      const normalizedPhone = normalizePhone(customerPhone!);
      const user = await prisma.user.findUnique({
        where: { phone: normalizedPhone },
      });

      if (!user) {
        return res.status(404).json({ 
          error: 'Customer not found', 
          phone: normalizedPhone 
        });
      }

      // Take snapshot of current user data for this booking
      userId = user.id;
      customerName = user.name;
      customerPhoneNormalized = user.phone;
      customerEmail = user.email || undefined;

    } else if (customerMode === 'new') {
      // Create new customer account
      const normalizedPhone = normalizePhone(newCustomer!.phone);

      // Check for duplicate phone
      const existingUserByPhone = await prisma.user.findUnique({
        where: { phone: normalizedPhone },
      });

      if (existingUserByPhone) {
        return res.status(409).json({
          error: 'Phone number already registered',
          phone: normalizedPhone,
          userId: existingUserByPhone.id,
        });
      }

      // Check for duplicate email (if email is provided)
      if (newCustomer!.email) {
        const existingUserByEmail = await prisma.user.findUnique({
          where: { email: newCustomer!.email.toLowerCase() },
        });

        if (existingUserByEmail) {
          return res.status(409).json({
            error: 'Email already registered',
            email: newCustomer!.email,
            userId: existingUserByEmail.id,
          });
        }
      }

      // Create user + booking in transaction
      const result = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            name: newCustomer!.name,
            phone: normalizedPhone,
            email: newCustomer!.email || null,
            role: UserRole.CUSTOMER,
            registrationSource: bookingSource,
            registeredBy: req.user!.id,
            passwordHash: null, // No password initially
          },
        });

        const booking = await tx.booking.create({
          data: {
            roomId,
            userId: newUser.id,
            customerName: newUser.name,     // Snapshot at booking time
            customerPhone: newUser.phone,   // Snapshot at booking time
            customerEmail: newUser.email,   // Snapshot at booking time
            startTime,
            endTime,
            players,
            price: pricing.totalPrice,
            bookingStatus: 'CONFIRMED',
            paymentStatus: 'UNPAID',
            bookingSource,
            createdBy: req.user!.id,
            internalNotes,
          },
        });

        return { user: newUser, booking };
      });

      return res.status(201).json({
        booking: presentBooking(result.booking),
        userCreated: true,
        user: {
          id: result.user.id,
          name: result.user.name,
          phone: result.user.phone,
          email: result.user.email,
        },
        pricing: {
          basePrice: pricing.basePrice,
          taxRate: pricing.taxRate,
          tax: pricing.tax,
          totalPrice: pricing.totalPrice,
        },
        emailSent: false, // Placeholder for future feature
      });
    } else if (customerMode === 'guest') {
      // Create guest profile (no password, walk-in only)
      const normalizedPhone = normalizePhone(guest!.phone);

      // Check if user with this phone already exists
      const existingUser = await prisma.user.findUnique({
        where: { phone: normalizedPhone },
      });

      if (existingUser) {
        // Use existing profile for the booking
        userId = existingUser.id;
        customerName = existingUser.name;
        customerPhoneNormalized = existingUser.phone;
        customerEmail = existingUser.email || undefined;
      } else {
        // Create guest profile + booking in transaction
        const result = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              name: guest!.name,
              phone: normalizedPhone,
              email: guest!.email || null,
              role: UserRole.CUSTOMER,
              registrationSource: bookingSource,
              registeredBy: req.user!.id,
              passwordHash: null, // Guest - no login
            },
          });

          const booking = await tx.booking.create({
            data: {
              roomId,
              userId: newUser.id,
              customerName: newUser.name,
              customerPhone: newUser.phone,
              customerEmail: newUser.email,
              startTime,
              endTime,
              players,
              price: pricing.totalPrice,
              bookingStatus: 'CONFIRMED',
              paymentStatus: 'UNPAID',
              bookingSource,
              createdBy: req.user!.id,
              internalNotes,
            },
          });

          return { user: newUser, booking };
        });

        return res.status(201).json({
          booking: presentBooking(result.booking),
          userCreated: true,
          user: {
            id: result.user.id,
            name: result.user.name,
            phone: result.user.phone,
            email: result.user.email,
          },
          pricing: {
            basePrice: pricing.basePrice,
            taxRate: pricing.taxRate,
            tax: pricing.tax,
            totalPrice: pricing.totalPrice,
          },
          emailSent: false,
        });
      }
    } else {
      // This should never happen due to Zod validation, but TypeScript needs this
      return res.status(400).json({ error: 'Invalid customer mode' });
    }

    // Create booking for existing customer (customerMode === 'existing')
    const booking = await prisma.booking.create({
      data: {
        roomId,
        userId,
        customerName,                      // Snapshot from current User data
        customerPhone: customerPhoneNormalized,  // Snapshot from current User data
        customerEmail,                     // Snapshot from current User data
        startTime,
        endTime,
        players,
        price: pricing.totalPrice,
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'UNPAID',
        bookingSource,
        createdBy: req.user!.id,
        internalNotes,
      },
    });

    res.status(201).json({
      booking: presentBooking(booking),
      userCreated: false,
      pricing: {
        basePrice: pricing.basePrice,
        taxRate: pricing.taxRate,
        tax: pricing.tax,
        totalPrice: pricing.totalPrice,
      },
      emailSent: false, // Placeholder for future feature
    });

  } catch (error: any) {
    console.error('[ADMIN CREATE BOOKING] Error:', error);
    
    // Handle Prisma errors
    if (error.code === 'P2002') {
      // Log detailed information about which field caused the duplicate
      console.error('[ADMIN CREATE BOOKING] P2002 Duplicate constraint violation');
      console.error('[ADMIN CREATE BOOKING] Target fields:', error.meta?.target);
      console.error('[ADMIN CREATE BOOKING] Request payload:', JSON.stringify(req.body, null, 2));
      
      return res.status(409).json({ 
        error: 'Duplicate constraint violation',
        field: error.meta?.target,
        details: `A record with this ${error.meta?.target?.join(', ')} already exists`
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// Update payment status endpoint (admin only)
const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(['UNPAID', 'BILLED', 'PAID']),
  paymentMethod: z.enum(['CARD', 'CASH']).optional(),
  tipAmount: z.number().optional(),
});

router.patch('/:id/payment-status', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params as { id: string };
  
  try {
    const parsed = updatePaymentStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.flatten() 
      });
    }

    const { paymentStatus, paymentMethod, tipAmount } = parsed.data;

    const booking = await getBooking(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Set timestamps based on payment status
    const now = new Date();
    const billedAt = paymentStatus === 'BILLED' || paymentStatus === 'PAID' ? now : null;
    const paidAt = paymentStatus === 'PAID' ? now : null;

    const updated = await updatePaymentStatus(id, {
      paymentStatus,
      billedAt: billedAt ?? undefined,
      paidAt: paidAt ?? undefined,
      paymentMethod,
      tipAmount,
    });

    return res.json({ booking: presentBooking(updated) });
  } catch (error) {
    console.error('[UPDATE PAYMENT STATUS] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as bookingRouter };
