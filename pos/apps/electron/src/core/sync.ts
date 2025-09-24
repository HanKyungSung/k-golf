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
import { getAccessToken, getSessionCookieHeader } from './auth';
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
  const next = peekOldest();
  if (!next) return;
  syncing = true;
  try {
  await pushSingle(apiBase, next.payloadJson, next.id);
  } finally {
    syncing = false;
  }
}

/** Iterate through outbox until empty or a transient failure occurs. */
export async function processSyncCycle(apiBase: string): Promise<{ pushed: number; failures: number; remaining: number; }> {
  if (syncing) return { pushed: 0, failures: 0, remaining: 0 };
  syncing = true;
  let pushed = 0;
  let failures = 0;
  try {
    while (true) {
      const item = peekOldest();
      if (!item) break;
  const ok = await pushSingle(apiBase, item.payloadJson, item.id);
      if (ok) {
        pushed++;
      } else {
        failures++;
        // Stop loop on first failure (simple strategy Phase 0)
        break;
      }
    }
  } finally {
    const remainingItem = peekOldest();
    const remaining = remainingItem ? 1 : 0; // quick estimate (can refine with COUNT later)
    syncing = false;
    return { pushed, failures, remaining };
  }
}

let discoveredRoomId: string | null = null;

async function discoverRoomId(apiBase: string): Promise<string | null> {
  try {
    const res = await axios.get(`${apiBase}/api/bookings/rooms`, { timeout: 5000, withCredentials: true });
    const rooms = res.data?.rooms || [];
    if (rooms.length) {
      const room = rooms.find((r: any) => r.active) || rooms[0];
      console.log('[SYNC] Discovered room id', room.id, 'name', room.name);
      discoveredRoomId = room.id;
      return room.id;
    }
  } catch (e: any) {
    console.warn('[SYNC] room discovery failed', e?.message);
  }
  return null;
}

async function pushSingle(apiBase: string, payloadJson: string, outboxId: string): Promise<boolean> {
  const raw = JSON.parse(payloadJson);
  // Adapter: local Phase 0 booking payload -> backend create schema
  // Local: { localId, customerName, startsAt, endsAt }
  // Backend expects: { roomId, startTimeIso, players, hours }
  let roomId = process.env.POS_ROOM_ID || process.env.DEFAULT_ROOM_ID || discoveredRoomId;
  if (!roomId) {
    roomId = await discoverRoomId(apiBase) || null;
  }
  if (!roomId) {
    console.warn('[SYNC] No roomId (env or discovered); aborting push');
    incrementAttempt(outboxId);
    return false;
  }
  let hours = 1;
  try {
    const start = new Date(raw.startsAt);
    const end = new Date(raw.endsAt);
    const diffH = (end.getTime() - start.getTime()) / 3600000;
    if (diffH >= 1 && diffH <= 4) hours = Math.round(diffH);
  } catch {/* keep default */}
  const players = 1; // Phase 0 assumption
  const startTimeIso = raw.startsAt;
  const body = { roomId, startTimeIso, players, hours };

  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const cookieHeader = getSessionCookieHeader();
  if (cookieHeader) headers.Cookie = cookieHeader;
  const url = `${apiBase}/api/bookings`; // plural endpoint
  try {
    console.log('[SYNC] POST', url, body);
  await axios.post(url, body, { headers, timeout: 8000, withCredentials: true });
    deleteItem(outboxId);
    if (raw.localId) markBookingClean(raw.localId);
    return true;
  } catch (e: any) {
    const status = e?.response?.status;
    const body = e?.response?.data;
    console.error('[SYNC] push failed', status, body || e?.message);
    if (status === 400 && body?.error) {
      console.error('[SYNC] server validation error:', body.error);
    }
    incrementAttempt(outboxId);
    return false;
  }
}

/** Mark a booking row as no longer dirty (post-success hook). */
export function markBookingClean(localId: string) {
  const db = getDb();
  db.prepare('UPDATE Booking SET dirty=0 WHERE id = ?').run(localId);
}
