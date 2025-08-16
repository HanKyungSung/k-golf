import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Simple in-memory store (replace with DB later)
interface Booking {
  id: string;
  roomId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  players: number;
  hours: number;
  createdAt: string;
}

const bookings: Booking[] = [];

const createBookingSchema = z.object({
  roomId: z.string(),
  date: z.string().regex(/\d{4}-\d{2}-\d{2}/),
  startTime: z.string().regex(/^[0-2]\d:[0-5]\d$/),
  players: z.number().int().min(1).max(4),
});

router.get('/', (_req, res) => {
  res.json({ bookings });
});

router.post('/', (req, res) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { roomId, date, startTime, players } = parsed.data;
  // Each player = 1 hour rule
  const hours = players;

  // Basic conflict check
  const conflict = bookings.some(
    (b) => b.roomId === roomId && b.date === date && b.startTime === startTime
  );
  if (conflict) {
    return res.status(409).json({ error: 'Time slot already booked' });
  }
  const booking: Booking = {
    id: crypto.randomUUID(),
    roomId,
    date,
    startTime,
    players,
    hours,
    createdAt: new Date().toISOString(),
  };
  bookings.push(booking);
  res.status(201).json({ booking });
});

export { router as bookingRouter };
