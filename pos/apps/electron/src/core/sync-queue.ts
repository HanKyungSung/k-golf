/**
 * sync-queue.ts
 * -----------------------------------------
 * Persistence-backed FIFO queue for sync operations (push and pull).
 * Supports both outgoing mutations (booking:create, room:update) and
 * incoming data requests (bookings:pull, menu:pull).
 * 
 * We store a raw JSON string payload to keep early iterations flexible
 * and avoid premature schema lock.
 *
 * The sync cycle will:
 *  1. peekOldest()
 *  2. Attempt operation (push to backend or pull from backend)
 *  3a. On success -> deleteItem(id)
 *  3b. On transient failure -> incrementAttempt(id) (potentially with backoff)
 *
 * UI indicators can call getQueueSize() to reflect pending operations.
 */
import { getDb } from './db';
import { v4 as uuid } from 'uuid';
import log from 'electron-log';

export interface SyncQueueItem {
  id: string;
  type: string;
  payloadJson: string;
  createdAt: number;
  attemptCount: number;
}

/**
 * Enqueue a sync operation (push or pull). Returns generated id (UUID v4).
 */
export function enqueue(type: string, payload: Record<string, unknown> = {}) {
  const db = getDb();
  const id = uuid();
  const stmt = db.prepare(`INSERT INTO SyncQueue (id, type, payloadJson, createdAt) VALUES (@id, @type, @payloadJson, @createdAt)`);
  stmt.run({ id, type, payloadJson: JSON.stringify(payload), createdAt: Date.now() });
  return id;
}

/**
 * Enqueue a pull request only if not already queued (prevents duplicates).
 * Returns id if enqueued, null if skipped.
 */
export function enqueuePullIfNotExists(type: string, payload: Record<string, unknown> = {}): string | null {
  const db = getDb();
  
  // For pull requests, check if already queued
  if (type.endsWith(':pull')) {
    const existing = db.prepare(
      'SELECT COUNT(*) as count FROM SyncQueue WHERE type = ?'
    ).get(type) as { count: number };
    
    if (existing.count > 0) {
      log.info(`[SYNC_QUEUE] ${type} already queued, skipping duplicate`);
      return null;
    }
  }
  
  // Otherwise enqueue normally
  return enqueue(type, payload);
}

/**
 * Enqueue a full pull of all bookings (used on login/startup).
 * This fetches complete history instead of just recent bookings.
 */
export function enqueueFullPullBookings(): string {
  log.info('[SYNC_QUEUE] Enqueuing FULL bookings pull (all history)');
  return enqueue('bookings:pull', { fullSync: true });
}

/**
 * Count queued operations.
 */
export function getQueueSize(): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as c FROM SyncQueue').get() as any;
  return row.c as number;
}

/**
 * Fetch (without removing) the oldest pending operation, or null if empty.
 */
export function peekOldest(): SyncQueueItem | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM SyncQueue ORDER BY createdAt ASC LIMIT 1').get();
  return (row as SyncQueueItem) || null;
}

/**
 * Delete an operation after successful completion.
 */
export function deleteItem(id: string) {
  const db = getDb();
  db.prepare('DELETE FROM SyncQueue WHERE id = ?').run(id);
}

/**
 * Increment attempt counter (used for diagnostics/backoff heuristics).
 */
export function incrementAttempt(id: string) {
  const db = getDb();
  db.prepare('UPDATE SyncQueue SET attemptCount = attemptCount + 1 WHERE id = ?').run(id);
}

/** List current queue items (debug / diagnostics). */
export function listQueue(): SyncQueueItem[] {
  const db = getDb();
  return db.prepare('SELECT * FROM SyncQueue ORDER BY createdAt ASC').all() as SyncQueueItem[];
}
