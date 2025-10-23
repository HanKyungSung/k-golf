/**
 * bookings.ts
 * -----------------------------------------
 * Local booking creation helper used by IPC layer. Inserts a booking row
 * (optimistic, dirty=1) and enqueues a sync operation for later push.
 */
import { v4 as uuid } from 'uuid';
import { getDb } from './db';
import { enqueue, getQueueSize } from './sync-queue';

export interface EnqueueBookingInput {
  customerName: string;
  startsAt: string; // ISO string
  endsAt: string;   // ISO string
}

export interface EnqueueBookingResult {
  bookingId: string;      // local UUID
  syncQueueId: string;    // sync queue entry id
  queueSize: number;      // size AFTER enqueue
}

export function enqueueBooking(input: EnqueueBookingInput): EnqueueBookingResult {
  const db = getDb();
  const bookingId = uuid();
  const now = Date.now();
  const { customerName, startsAt, endsAt } = input;

  // Insert local optimistic booking
  const stmt = db.prepare(`INSERT INTO Booking
    (id, serverId, customerName, startTime, endTime, status, updatedAt, dirty)
    VALUES (@id, NULL, @customerName, @startTime, @endTime, 'PENDING', @updatedAt, 1)`);
  stmt.run({
    id: bookingId,
    customerName,
    startTime: startsAt,
    endTime: endsAt,
    updatedAt: now
  });

  // Enqueue sync operation (payload carries minimal fields; server assigns canonical id later)
  const syncQueueId = enqueue('booking:create', {
    localId: bookingId,
    customerName,
    startsAt,
    endsAt
  });

  const queueSize = getQueueSize();
  return { bookingId, syncQueueId, queueSize };
}
