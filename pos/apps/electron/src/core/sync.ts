/**
 * sync.ts
 * -----------------------------------------
 * Push-only (Phase 0) synchronization logic.
 * Strategy:
 *  - Pop (peek) oldest mutation from outbox
 *  - POST to backend (currently placeholder booking create endpoint)
 *  - On success: remove from outbox & (optionally) mark related booking clean
 *  - On failure: increment attempt count for diagnostics / backoff logic
 *
 * Future Extensions (Phase 1+):
 *  - Pull cycle (delta fetch) based on meta.last_sync_ts
 *  - Exponential / jitter backoff + classification of permanent errors
 *  - Batch push to reduce HTTP round trips
 */
import axios from 'axios';
import { peekOldest, deleteItem, incrementAttempt } from './outbox';
import { getAccessToken } from './auth';
import { getDb } from './db';

let syncing = false;

/** Are we currently processing a push operation? */
export function isSyncing() { return syncing; }

/**
 * Attempt a single push cycle. If queue empty or already syncing, returns fast.
 * apiBase: e.g. https://pos-api.example.com (no trailing slash required)
 */
export async function processSyncOnce(apiBase: string) {
  if (syncing) return;
  const item = peekOldest();
  if (!item) return;
  syncing = true;
  try {
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const url = `${apiBase}/api/booking`; // placeholder endpoint for create
    const payload = JSON.parse(item.payload_json);
    await axios.post(url, payload, { headers, timeout: 8000 });
    // On success remove from outbox (future: update bookings row dirty=0)
    deleteItem(item.id);
  } catch (e) {
    incrementAttempt(item.id);
  } finally {
    syncing = false;
  }
}

/** Mark a booking row as no longer dirty (post-success hook). */
export function markBookingClean(localId: string) {
  const db = getDb();
  db.prepare('UPDATE bookings SET dirty=0 WHERE id = ?').run(localId);
}
