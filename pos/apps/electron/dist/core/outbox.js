"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueue = enqueue;
exports.getQueueSize = getQueueSize;
exports.peekOldest = peekOldest;
exports.deleteItem = deleteItem;
exports.incrementAttempt = incrementAttempt;
/**
 * outbox.ts
 * -----------------------------------------
 * Persistence-backed FIFO queue for offline mutations awaiting push.
 * Phase 0 supports booking:create events; future phases can extend with
 * additional domain mutation types. We deliberately store a raw JSON string
 * payload to keep early iterations flexible and avoid premature schema lock.
 *
 * The sync cycle will:
 *  1. peekOldest()
 *  2. Attempt network push
 *  3a. On success -> deleteItem(id)
 *  3b. On transient failure -> incrementAttempt(id) (potentially with backoff)
 *
 * UI indicators can call getQueueSize() to reflect pending operations.
 */
const db_1 = require("./db");
const uuid_1 = require("uuid");
/**
 * Enqueue a mutation. Returns generated id (UUID v4).
 */
function enqueue(type, payload) {
    const db = (0, db_1.getDb)();
    const id = (0, uuid_1.v4)();
    const stmt = db.prepare(`INSERT INTO Outbox (id, type, payloadJson, createdAt) VALUES (@id, @type, @payloadJson, @createdAt)`);
    stmt.run({ id, type, payloadJson: JSON.stringify(payload), createdAt: Date.now() });
    return id;
}
/**
 * Count queued mutations.
 */
function getQueueSize() {
    const db = (0, db_1.getDb)();
    const row = db.prepare('SELECT COUNT(*) as c FROM Outbox').get();
    return row.c;
}
/**
 * Fetch (without removing) the oldest pending mutation, or null if empty.
 */
function peekOldest() {
    const db = (0, db_1.getDb)();
    const row = db.prepare('SELECT * FROM Outbox ORDER BY createdAt ASC LIMIT 1').get();
    return row || null;
}
/**
 * Delete a mutation after successful remote application.
 */
function deleteItem(id) {
    const db = (0, db_1.getDb)();
    db.prepare('DELETE FROM Outbox WHERE id = ?').run(id);
}
/**
 * Increment attempt counter (used for diagnostics/backoff heuristics).
 */
function incrementAttempt(id) {
    const db = (0, db_1.getDb)();
    db.prepare('UPDATE Outbox SET attemptCount = attemptCount + 1 WHERE id = ?').run(id);
}
