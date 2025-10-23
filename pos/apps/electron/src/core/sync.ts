/**
 * sync.ts
 * -----------------------------------------
 * Bidirectional synchronization logic (push and pull).
 * Phase 0.6 enhancements implemented here:
 *  - Classify 401 responses as auth-expired (do NOT increment attempt)
 *  - Drain queue until empty or a non-auth failure occurs (previously stopped on first failure)
 *  - Accurate remaining count (full COUNT instead of 0/1 heuristic)
 *  - Return authExpired flag so caller can clear auth state & notify renderer
 * Strategy:
 *  - Pop (peek) oldest operation from sync queue
 *  - Execute operation (POST/PATCH for push, GET for pull)
 *  - On success: remove from queue & (optionally) mark related records clean
 *  - On failure: increment attempt count for diagnostics / backoff logic
 *
 * Future Extensions (Phase 1+):
 *  - Exponential / jitter backoff + classification of permanent errors
 *  - Batch push to reduce HTTP round trips
 */
import axios from 'axios';
import { peekOldest, deleteItem, incrementAttempt, getQueueSize, type SyncQueueItem } from './sync-queue';
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
export interface SyncCycleResult {
  pushed: number;
  failures: number;
  remaining: number;
  authExpired: boolean;
  lastError?: { code: string; status?: number; message?: string; outboxId?: string };
}

export async function processSyncCycle(apiBase: string): Promise<SyncCycleResult> {
  if (syncing) return { pushed: 0, failures: 0, remaining: 0, authExpired: false };
  syncing = true;
  let pushed = 0;
  let failures = 0;
  let authExpired = false;
  let lastError: SyncCycleResult['lastError'];
  try {
    // First: process room:update mutations (with collapse logic)
    const roomResult = await processRoomUpdates(apiBase);
    pushed += roomResult.pushed;
    failures += roomResult.failures;
    if (roomResult.authExpired) {
      authExpired = true;
      if (roomResult.lastError) lastError = roomResult.lastError;
      return { pushed, failures, remaining: getQueueSize(), authExpired, lastError };
    }

    // Then: process booking:create mutations (existing logic)
    while (true) {
      const item = peekOldest();
      if (!item) break;
      // Skip room updates (already handled above)
      if (item.type === 'room:update') {
        deleteItem(item.id); // shouldn't happen if collapse worked, but defensive
        continue;
      }
      const outcome = await pushSingle(apiBase, item.payloadJson, item.id);
      if (outcome === 'success') {
        pushed++;
        continue;
      }
      if (outcome === 'auth-expired') {
        authExpired = true;
        // treat as a failure for metrics (can differentiate later)
        failures++;
        break; // stop further processing; caller will clear auth
      }
      // Generic failure (attempt already incremented in pushSingle)
      failures++;
      if (!lastError) lastError = pendingErrorInfo; // capture most recent
      break;
    }
  } finally {
    const remaining = getQueueSize();
    syncing = false;
    return { pushed, failures, remaining, authExpired, lastError };
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

type PushOutcome = 'success' | 'auth-expired' | 'failure';

// Holds error info from the most recent failed push (module-level so processSyncCycle can read it)
let pendingErrorInfo: { code: string; status?: number; message?: string; outboxId?: string } | undefined;

async function pushSingle(apiBase: string, payloadJson: string, outboxId: string): Promise<PushOutcome> {
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
    pendingErrorInfo = { code: 'NO_ROOM_ID', message: 'Room discovery failed (no active rooms or network/auth issue)', outboxId };
    return 'failure';
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
    return 'success';
  } catch (e: any) {
    const status = e?.response?.status;
    const body = e?.response?.data;
    console.error('[SYNC] push failed', status, body || e?.message);
    if (status === 400 && body?.error) {
      console.error('[SYNC] server validation error:', body.error);
      const errMsg: string = (body.error?.message) || body.error;
      const rawErr = String(errMsg || '').toLowerCase();
      const permanent = rawErr.includes('outside room operating hours') || rawErr.includes('cannot book a past time slot') || rawErr.includes('cross-day');
      if (permanent) {
        // Treat as permanent validation failure: drop from outbox so queue can progress.
        console.warn('[SYNC] Dropping permanent validation failure (will not retry):', errMsg);
        // Remove the outbox item; mark booking clean so UI no longer treats it dirty.
        deleteItem(outboxId);
        if (raw.localId) markBookingClean(raw.localId);
        pendingErrorInfo = { code: 'VALIDATION_DROPPED', status, message: errMsg, outboxId };
        return 'success'; // returning success so loop continues draining others
      }
    }
    if (status === 401) {
      console.warn('[SYNC] Auth expired (401). Will signal caller to reset auth state.');
      // Do NOT increment attempt for auth-expired; user action required
  pendingErrorInfo = { code: 'AUTH_EXPIRED', status: 401, message: 'Authentication expired (401)', outboxId };
      return 'auth-expired';
    }
    incrementAttempt(outboxId); // only increment for non-auth failures
    // Classify generic failure
    if (status) {
      let code = 'HTTP_' + status;
      if (status >= 500) code = 'SERVER_ERROR';
      else if (status === 400) code = 'VALIDATION_ERROR';
      pendingErrorInfo = { code, status, message: body?.error || e?.message, outboxId };
    } else {
      pendingErrorInfo = { code: 'NETWORK_ERROR', message: e?.message || 'Network/timeout failure', outboxId };
    }
    return 'failure';
  }
}

/** Mark a booking row as no longer dirty (post-success hook). */
export function markBookingClean(localId: string) {
  const db = getDb();
  db.prepare('UPDATE Booking SET dirty=0 WHERE id = ?').run(localId);
}

/**
 * Process room:update mutations with collapse logic.
 * Collapses multiple status changes for the same room to only send the latest.
 * Returns metrics for integration into main sync cycle.
 */
async function processRoomUpdates(apiBase: string): Promise<{ pushed: number; failures: number; authExpired: boolean; lastError?: SyncCycleResult['lastError'] }> {
  let pushed = 0;
  let failures = 0;
  let authExpired = false;
  let lastError: SyncCycleResult['lastError'];

  // Gather all room:update items
  const db = getDb();
  const allRoomUpdates = db.prepare('SELECT * FROM SyncQueue WHERE type = ? ORDER BY createdAt ASC').all('room:update') as SyncQueueItem[];
  
  console.log('[SYNC][ROOM] Found', allRoomUpdates.length, 'room:update mutations in queue');
  
  if (allRoomUpdates.length === 0) {
    return { pushed: 0, failures: 0, authExpired: false };
  }

  // Collapse: keep only the latest mutation per roomId
  const byRoomId = new Map<string, SyncQueueItem>();
  for (const item of allRoomUpdates) {
    try {
      const payload = JSON.parse(item.payloadJson);
      const roomId = payload.roomId;
      if (!roomId) continue;
      
      const existing = byRoomId.get(roomId);
      if (!existing || item.createdAt > existing.createdAt) {
        byRoomId.set(roomId, item);
      }
    } catch (e) {
      console.error('[SYNC][ROOM] Invalid payload JSON for outbox item', item.id);
      deleteItem(item.id); // drop malformed entry
    }
  }

  // Delete superseded items (those not in the final map)
  const finalIds = new Set(Array.from(byRoomId.values()).map(i => i.id));
  for (const item of allRoomUpdates) {
    if (!finalIds.has(item.id)) {
      console.log('[SYNC][ROOM] Dropping superseded mutation', item.id);
      deleteItem(item.id);
    }
  }

  console.log('[SYNC][ROOM] After collapse:', byRoomId.size, 'unique room(s) to update');

  // Push each final (latest) room update
  for (const item of byRoomId.values()) {
    const outcome = await pushRoomUpdate(apiBase, item);
    if (outcome === 'success') {
      pushed++;
    } else if (outcome === 'auth-expired') {
      authExpired = true;
      failures++;
      lastError = pendingErrorInfo;
      break; // stop processing on auth failure
    } else {
      failures++;
      lastError = pendingErrorInfo;
      break; // stop on first failure for now
    }
  }

  return { pushed, failures, authExpired, lastError };
}

/**
 * Push a single room:update mutation to the backend.
 */
async function pushRoomUpdate(apiBase: string, item: SyncQueueItem): Promise<PushOutcome> {
  try {
    const payload = JSON.parse(item.payloadJson);
    const { roomId, status } = payload;
    
    if (!roomId || !status) {
      console.warn('[SYNC][ROOM] Missing roomId or status in payload', item.id);
      deleteItem(item.id); // drop invalid
      return 'success';
    }

    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const cookieHeader = getSessionCookieHeader();
    if (cookieHeader) headers.Cookie = cookieHeader;
    
    const url = `${apiBase}/api/bookings/rooms/${roomId}`;
    const body = { status };
    
    console.log('[SYNC][ROOM] PATCH', url, body);
    await axios.patch(url, body, { headers, timeout: 8000, withCredentials: true });
    
    deleteItem(item.id);
    console.log('[SYNC][ROOM] Successfully updated room', roomId, 'to', status);
    return 'success';
  } catch (e: any) {
    const status = e?.response?.status;
    const body = e?.response?.data;
    console.error('[SYNC][ROOM] push failed', status, body || e?.message);
    
    if (status === 401) {
      console.warn('[SYNC][ROOM] Auth expired (401)');
      pendingErrorInfo = { code: 'AUTH_EXPIRED', status: 401, message: 'Authentication expired (401)', outboxId: item.id };
      return 'auth-expired';
    }
    
    if (status === 400 || status === 404 || status === 409) {
      // Validation or conflict errors - log and drop to allow queue progress
      console.warn('[SYNC][ROOM] Dropping permanent validation/conflict failure:', body?.error);
      deleteItem(item.id);
      pendingErrorInfo = { code: 'VALIDATION_DROPPED', status, message: body?.error || 'Validation error', outboxId: item.id };
      return 'success'; // treat as success to continue draining
    }
    
    incrementAttempt(item.id);
    pendingErrorInfo = { 
      code: status >= 500 ? 'SERVER_ERROR' : 'NETWORK_ERROR', 
      status, 
      message: body?.error || e?.message,
      outboxId: item.id 
    };
    return 'failure';
  }
}
