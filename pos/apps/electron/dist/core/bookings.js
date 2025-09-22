"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueBooking = enqueueBooking;
/**
 * bookings.ts
 * -----------------------------------------
 * Local booking creation helper used by IPC layer. Inserts a booking row
 * (optimistic, dirty=1) and enqueues an outbox mutation for later sync.
 */
const uuid_1 = require("uuid");
const db_1 = require("./db");
const outbox_1 = require("./outbox");
function enqueueBooking(input) {
    const db = (0, db_1.getDb)();
    const bookingId = (0, uuid_1.v4)();
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
    const outboxId = (0, outbox_1.enqueue)('booking:create', {
        localId: bookingId,
        customerName,
        startsAt,
        endsAt
    });
    const queueSize = (0, outbox_1.getQueueSize)();
    return { bookingId, outboxId, queueSize };
}
