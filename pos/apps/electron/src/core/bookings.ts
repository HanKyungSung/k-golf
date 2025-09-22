/**
 * bookings.ts
 * -----------------------------------------
 * Local booking creation helper used by IPC layer. Inserts a booking row
 * (optimistic, dirty=1) and enqueues an outbox mutation for later sync.
 */
import { v4 as uuid } from 'uuid';
import { getDb } from './db';
import { enqueue, getQueueSize } from './outbox';

export interface EnqueueBookingInput {
  customerName: string;
  startsAt: string; // ISO string
  endsAt: string;   // ISO string
}

export interface EnqueueBookingResult {
  bookingId: string;      // local UUID
  outboxId: string;       // outbox entry id
  queueSize: number;      // size AFTER enqueue
}

export function enqueueBooking(input: EnqueueBookingInput): EnqueueBookingResult {
  const db = getDb();
  const bookingId = uuid();
  const now = Date.now();
  const { customerName, startsAt, endsAt } = input;

  // Insert local optimistic booking
  const stmt = db.prepare(`INSERT INTO bookings
    (id, server_id, customer_name, starts_at, ends_at, status, updated_at, dirty)
    VALUES (@id, NULL, @customer_name, @starts_at, @ends_at, 'PENDING', @updated_at, 1)`);
  stmt.run({
    id: bookingId,
    customer_name: customerName,
    starts_at: startsAt,
    ends_at: endsAt,
    updated_at: now
  });

  // Enqueue mutation (payload carries minimal fields; server assigns canonical id later)
  const outboxId = enqueue('booking:create', {
    localId: bookingId,
    customerName,
    startsAt,
    endsAt
  });

  const queueSize = getQueueSize();
  return { bookingId, outboxId, queueSize };
}
