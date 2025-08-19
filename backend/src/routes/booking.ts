import { Router } from 'express';
import { z } from 'zod';
import { createBooking, findConflict, listBookings, listUserBookings } from '../repositories/bookingRepo';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

// Auth enforced for mutating and user-specific endpoints.

const createBookingSchema = z.object({
  roomId: z.string().uuid().or(z.string()),
  startTimeIso: z.string().datetime(), // ISO string from client (UTC)
  players: z.number().int().min(1).max(4),
});

router.get('/', async (_req, res) => {
  const bookings = await listBookings();
  res.json({ bookings });
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
  const { roomId, startTimeIso, players } = parsed.data;

  let start: Date;
  try {
    start = new Date(startTimeIso);
    if (isNaN(start.getTime())) throw new Error('Invalid date');
  } catch {
    return res.status(400).json({ error: 'Invalid startTimeIso' });
  }

  // Conflict: same room & exact start time (full overlap logic TBD)
  const conflict = await findConflict(roomId, start);
  if (conflict) {
    return res.status(409).json({ error: 'Time slot already booked' });
  }

  const priceCents = players * players * 5000; // $50/hour * hours(players)

  try {
    const booking = await createBooking({
      roomId,
      userId: req.user!.id,
      startTime: start,
      players,
      priceCents,
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

export { router as bookingRouter };
