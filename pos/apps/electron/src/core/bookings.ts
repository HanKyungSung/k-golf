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
  roomId: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  startsAt: string; // ISO string
  endsAt: string;   // ISO string
  players: number;
  price: number;
  bookingSource?: string; // 'WALK_IN' | 'ONLINE' | 'PHONE'
  createdBy?: string; // Admin user ID
  internalNotes?: string;
}

export interface EnqueueBookingResult {
  bookingId: string;      // local UUID
  syncQueueId: string;    // sync queue entry id
  queueSize: number;      // size AFTER enqueue
}

export function enqueueBooking(input: EnqueueBookingInput): EnqueueBookingResult {
  const db = getDb();
  const bookingId = uuid();
  const now = new Date().toISOString();
  
  const {
    roomId,
    userId,
    customerName,
    customerPhone,
    customerEmail,
    startsAt,
    endsAt,
    players,
    price,
    bookingSource = 'WALK_IN',
    createdBy,
    internalNotes
  } = input;

  // Insert local optimistic booking
  const stmt = db.prepare(`INSERT INTO Booking
    (id, serverId, roomId, userId, customerName, customerPhone, customerEmail, 
     startTime, endTime, players, price, bookingStatus, paymentStatus, bookingSource, createdBy, 
     internalNotes, createdAt, updatedAt, dirty)
    VALUES (@id, NULL, @roomId, @userId, @customerName, @customerPhone, @customerEmail,
            @startTime, @endTime, @players, @price, 'CONFIRMED', 'UNPAID', @bookingSource, @createdBy,
            @internalNotes, @createdAt, @updatedAt, 1)`);
  stmt.run({
    id: bookingId,
    roomId,
    userId,
    customerName,
    customerPhone,
    customerEmail: customerEmail || null,
    startTime: startsAt,
    endTime: endsAt,
    players,
    price,
    bookingSource,
    createdBy: createdBy || null,
    internalNotes: internalNotes || null,
    createdAt: now,
    updatedAt: now
  });

  // Enqueue sync operation
  const syncQueueId = enqueue('booking:create', {
    localId: bookingId,
    roomId,
    userId,
    customerName,
    customerPhone,
    customerEmail,
    startsAt,
    endsAt,
    players,
    price,
    bookingSource,
    createdBy,
    internalNotes
  });

  const queueSize = getQueueSize();
  return { bookingId, syncQueueId, queueSize };
}
