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
import { getDb } from './db';
import { v4 as uuid } from 'uuid';

export interface OutboxItem {
  id: string;
  type: string;
  payloadJson: string;
  createdAt: number;
  attemptCount: number;
}

/**
 * Enqueue a mutation. Returns generated id (UUID v4).
 */
export function enqueue(type: string, payload: Record<string, unknown>) {
  const db = getDb();
  const id = uuid();
  const stmt = db.prepare(`INSERT INTO Outbox (id, type, payloadJson, createdAt) VALUES (@id, @type, @payloadJson, @createdAt)`);
  stmt.run({ id, type, payloadJson: JSON.stringify(payload), createdAt: Date.now() });
  return id;
}

/**
 * Count queued mutations.
 */
export function getQueueSize(): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as c FROM Outbox').get() as any;
  return row.c as number;
}

/**
 * Fetch (without removing) the oldest pending mutation, or null if empty.
 */
export function peekOldest(): OutboxItem | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM Outbox ORDER BY createdAt ASC LIMIT 1').get();
  return (row as OutboxItem) || null;
}

/**
 * Delete a mutation after successful remote application.
 */
export function deleteItem(id: string) {
  const db = getDb();
  db.prepare('DELETE FROM Outbox WHERE id = ?').run(id);
}

/**
 * Increment attempt counter (used for diagnostics/backoff heuristics).
 */
export function incrementAttempt(id: string) {
  const db = getDb();
  db.prepare('UPDATE Outbox SET attemptCount = attemptCount + 1 WHERE id = ?').run(id);
}
