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
import { getMetadata, setMetadata } from './db';
import log from 'electron-log';

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
      
      // Handle pull operations (menu:pull, bookings:pull, etc.)
      if (item.type.endsWith(':pull')) {
        const pullOutcome = await handlePullOperation(apiBase, item);
        if (pullOutcome === 'success') {
          pushed++; // count as successful sync operation
          continue;
        }
        if (pullOutcome === 'auth-expired') {
          authExpired = true;
          failures++;
          break;
        }
        failures++;
        if (!lastError) lastError = pendingErrorInfo;
        break;
      }
      
      // Handle booking status updates
      if (item.type === 'booking:updateStatus') {
        const statusOutcome = await pushBookingStatusUpdate(apiBase, item);
        if (statusOutcome === 'success') {
          pushed++;
          continue;
        }
        if (statusOutcome === 'auth-expired') {
          authExpired = true;
          failures++;
          break;
        }
        failures++;
        if (!lastError) lastError = pendingErrorInfo;
        break;
      }
      
      // Handle push operations (booking:create, etc.)
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
      log.info('[SYNC] Discovered room id', room.id, 'name', room.name);
      discoveredRoomId = room.id;
      return room.id;
    }
  } catch (e: any) {
    log.warn('[SYNC] room discovery failed', e?.message);
  }
  return null;
}

type PushOutcome = 'success' | 'auth-expired' | 'failure';

// Holds error info from the most recent failed push (module-level so processSyncCycle can read it)
let pendingErrorInfo: { code: string; status?: number; message?: string; outboxId?: string } | undefined;

async function pushSingle(apiBase: string, payloadJson: string, outboxId: string): Promise<PushOutcome> {
  const raw = JSON.parse(payloadJson);
  
  // New booking format includes all required fields
  // Extract data from payload
  const roomId = raw.roomId;
  const userId = raw.userId;
  const customerName = raw.customerName;
  const customerPhone = raw.customerPhone;
  const customerEmail = raw.customerEmail;
  const startTimeIso = raw.startsAt;
  const players = raw.players || 1;
  const bookingSource = raw.bookingSource || 'WALK_IN';
  const createdBy = raw.createdBy;
  const internalNotes = raw.internalNotes;
  
  // Calculate hours from start/end times
  let hours = 1;
  try {
    const start = new Date(raw.startsAt);
    const end = new Date(raw.endsAt);
    const diffH = (end.getTime() - start.getTime()) / 3600000;
    if (diffH >= 1 && diffH <= 8) hours = Math.round(diffH);
  } catch {/* keep default */}
  
  // Build request body matching backend API
  const body: any = {
    roomId,
    userId,
    startTimeIso,
    players,
    hours,
    bookingSource,
    customerName,
    customerPhone
  };
  
  // Optional fields
  if (customerEmail) body.customerEmail = customerEmail;
  if (createdBy) body.createdBy = createdBy;
  if (internalNotes) body.internalNotes = internalNotes;

  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const cookieHeader = getSessionCookieHeader();
  if (cookieHeader) headers.Cookie = cookieHeader;
  const url = `${apiBase}/api/bookings`; // plural endpoint
  try {
    log.info('[SYNC] POST', url, body);
    const response = await axios.post(url, body, { headers, timeout: 8000, withCredentials: true });
    
    // Update local booking with serverId from backend response
    if (response.data?.booking?.id && raw.localId) {
      const db = getDb();
      db.prepare('UPDATE Booking SET serverId = ?, dirty = 0 WHERE id = ?')
        .run(response.data.booking.id, raw.localId);
      log.info('[SYNC] Updated local booking', raw.localId, 'with serverId', response.data.booking.id);
    }
    
    deleteItem(outboxId);
    return 'success';
  } catch (e: any) {
    const status = e?.response?.status;
    const body = e?.response?.data;
    log.error('[SYNC] push failed', status, body || e?.message);
    if (status === 400 && body?.error) {
      log.error('[SYNC] server validation error:', body.error);
      const errMsg: string = (body.error?.message) || body.error;
      const rawErr = String(errMsg || '').toLowerCase();
      const permanent = rawErr.includes('outside room operating hours') || rawErr.includes('cannot book a past time slot') || rawErr.includes('cross-day');
      if (permanent) {
        // Treat as permanent validation failure: drop from outbox so queue can progress.
        log.warn('[SYNC] Dropping permanent validation failure (will not retry):', errMsg);
        // Remove the outbox item; mark booking clean so UI no longer treats it dirty.
        deleteItem(outboxId);
        if (raw.localId) markBookingClean(raw.localId);
        pendingErrorInfo = { code: 'VALIDATION_DROPPED', status, message: errMsg, outboxId };
        return 'success'; // returning success so loop continues draining others
      }
    }
    if (status === 401) {
      log.warn('[SYNC] Auth expired (401). Will signal caller to reset auth state.');
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
  
  log.info('[SYNC][ROOM] Found', allRoomUpdates.length, 'room:update mutations in queue');
  
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
      log.error('[SYNC][ROOM] Invalid payload JSON for outbox item', item.id);
      deleteItem(item.id); // drop malformed entry
    }
  }

  // Delete superseded items (those not in the final map)
  const finalIds = new Set(Array.from(byRoomId.values()).map(i => i.id));
  for (const item of allRoomUpdates) {
    if (!finalIds.has(item.id)) {
      log.info('[SYNC][ROOM] Dropping superseded mutation', item.id);
      deleteItem(item.id);
    }
  }

  log.info('[SYNC][ROOM] After collapse:', byRoomId.size, 'unique room(s) to update');

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
      log.warn('[SYNC][ROOM] Missing roomId or status in payload', item.id);
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
    
    log.info('[SYNC][ROOM] PATCH', url, body);
    await axios.patch(url, body, { headers, timeout: 8000, withCredentials: true });
    
    deleteItem(item.id);
    log.info('[SYNC][ROOM] Successfully updated room', roomId, 'to', status);
    return 'success';
  } catch (e: any) {
    const status = e?.response?.status;
    const body = e?.response?.data;
    log.error('[SYNC][ROOM] push failed', status, body || e?.message);
    
    if (status === 401) {
      log.warn('[SYNC][ROOM] Auth expired (401)');
      pendingErrorInfo = { code: 'AUTH_EXPIRED', status: 401, message: 'Authentication expired (401)', outboxId: item.id };
      return 'auth-expired';
    }
    
    if (status === 400 || status === 404 || status === 409) {
      // Validation or conflict errors - log and drop to allow queue progress
      log.warn('[SYNC][ROOM] Dropping permanent validation/conflict failure:', body?.error);
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

/**
 * Handle pull operations (menu:pull, bookings:pull, etc.)
 * Fetches data from backend and updates local SQLite
 */
async function handlePullOperation(apiBase: string, item: SyncQueueItem): Promise<PushOutcome> {
  try {
    // Log with specific category based on type
    if (item.type === 'menu:pull') {
      log.info('[SYNC][MENU][PULL] Processing menu:pull');
      return await pullMenuItems(apiBase, item);
    }
    
    if (item.type === 'rooms:pull') {
      log.info('[SYNC][ROOM][PULL] Processing rooms:pull');
      return await pullRooms(apiBase, item);
    }
    
    if (item.type === 'bookings:pull') {
      log.info('[SYNC][BOOKING][PULL] Processing bookings:pull');
      return await pullBookings(apiBase, item);
    }
    
    log.warn('[SYNC][PULL] Unknown pull type:', item.type);
    deleteItem(item.id); // drop unknown type
    return 'success';
  } catch (e: any) {
    log.error('[SYNC][PULL] Unexpected error:', e);
    incrementAttempt(item.id);
    pendingErrorInfo = { 
      code: 'PULL_ERROR', 
      message: e?.message,
      outboxId: item.id 
    };
    return 'failure';
  }
}

/**
 * Pull menu items from backend and sync to local SQLite
 */
async function pullMenuItems(apiBase: string, item: SyncQueueItem): Promise<PushOutcome> {
  try {
    const headers: Record<string,string> = {};
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const cookieHeader = getSessionCookieHeader();
    if (cookieHeader) headers.Cookie = cookieHeader;
    
    const url = `${apiBase}/api/menu/items`;
    log.info('[SYNC][MENU] GET', url);
    
    const response = await axios.get(url, { 
      headers, 
      timeout: 10000, 
      withCredentials: true 
    });
    
    const { success, items } = response.data;
    
    if (!success || !Array.isArray(items)) {
      log.error('[SYNC][MENU] Invalid response format:', response.data);
      incrementAttempt(item.id);
      pendingErrorInfo = { 
        code: 'INVALID_RESPONSE', 
        message: 'Invalid menu response format',
        outboxId: item.id 
      };
      return 'failure';
    }
    
    log.info('[SYNC][MENU] Received', items.length, 'menu items from backend');
    
    // Update local SQLite with backend menu items
    const db = getDb();
    
    // Use a transaction for atomic update
    const updateTransaction = db.transaction(() => {
      // Clear existing menu items
      db.prepare('DELETE FROM MenuItem').run();
      
      // Insert all items from backend
      const insertStmt = db.prepare(`
        INSERT INTO MenuItem (id, name, description, price, category, hours, available, sortOrder, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const item of items) {
        insertStmt.run(
          item.id,
          item.name,
          item.description,
          item.price,
          item.category,
          item.hours,
          item.available,
          item.sortOrder,
          item.createdAt || new Date().toISOString(),
          item.updatedAt || new Date().toISOString()
        );
      }
    });
    
    updateTransaction();
    
    log.info('[SYNC][MENU] Successfully synced', items.length, 'menu items to local SQLite');
    
    // Remove from queue
    deleteItem(item.id);
    return 'success';
    
  } catch (e: any) {
    const status = e?.response?.status;
    const body = e?.response?.data;
    log.error('[SYNC][MENU] Pull failed', status, body || e?.message);
    
    if (status === 401) {
      log.warn('[SYNC][MENU] Auth expired (401)');
      pendingErrorInfo = { 
        code: 'AUTH_EXPIRED', 
        status: 401, 
        message: 'Authentication expired (401)', 
        outboxId: item.id 
      };
      return 'auth-expired';
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


/**
 * Pull rooms from backend and sync to local SQLite
 */
async function pullRooms(apiBase: string, item: SyncQueueItem): Promise<PushOutcome> {
  try {
    const headers: Record<string,string> = {};
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const cookieHeader = getSessionCookieHeader();
    if (cookieHeader) headers.Cookie = cookieHeader;
    
    const url = `${apiBase}/api/bookings/rooms`;
    log.info('[SYNC][ROOMS] GET', url);
    
    const response = await axios.get(url, { 
      headers, 
      timeout: 10000, 
      withCredentials: true 
    });
    
    const { rooms } = response.data;
    
    if (!Array.isArray(rooms)) {
      log.error('[SYNC][ROOMS] Invalid response format:', response.data);
      incrementAttempt(item.id);
      pendingErrorInfo = { 
        code: 'INVALID_RESPONSE', 
        message: 'Invalid rooms response format',
        outboxId: item.id 
      };
      return 'failure';
    }
    
    log.info('[SYNC][ROOMS] Received', rooms.length, 'rooms from backend');
    
    // Update local SQLite with backend rooms
    const db = getDb();
    
    // Use a transaction for atomic update
    const updateTransaction = db.transaction(() => {
      // Clear existing rooms
      db.prepare('DELETE FROM Room').run();
      
      // Insert all rooms from backend
      const insertStmt = db.prepare(`
        INSERT INTO Room (id, name, capacity, active, openMinutes, closeMinutes, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const room of rooms) {
        insertStmt.run(
          room.id,
          room.name,
          room.capacity || 4,
          room.active ? 1 : 0,
          room.openMinutes || 540,
          room.closeMinutes || 1140,
          room.status || 'ACTIVE',
          room.createdAt || new Date().toISOString(),
          room.updatedAt || new Date().toISOString()
        );
      }
    });
    
    updateTransaction();
    
    log.info('[SYNC][ROOMS] Successfully synced', rooms.length, 'rooms to local SQLite');
    
    // Remove from queue
    deleteItem(item.id);
    return 'success';
    
  } catch (e: any) {
    const status = e?.response?.status;
    const body = e?.response?.data;
    log.error('[SYNC][ROOMS] Pull failed', status, body || e?.message);
    
    if (status === 401) {
      log.warn('[SYNC][ROOMS] Auth expired (401)');
      pendingErrorInfo = { 
        code: 'AUTH_EXPIRED', 
        status: 401, 
        message: 'Authentication expired (401)', 
        outboxId: item.id 
      };
      return 'auth-expired';
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

/**
 * Pull bookings from backend and sync to local SQLite
 * Strategy:
 * - On initial sync (fullSync=true): Fetch ALL bookings to populate complete history
 * - On incremental sync (fullSync=false): Fetch only bookings updated since lastSyncedAt
 * Uses UPSERT strategy and maps serverId <-> local id for coordination
 */
async function pullBookings(apiBase: string, item: SyncQueueItem): Promise<PushOutcome> {
  try {
    const headers: Record<string,string> = {};
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const cookieHeader = getSessionCookieHeader();
    if (cookieHeader) headers.Cookie = cookieHeader;
    
    // Check if this is a full sync (initial pull) or incremental
    const payload = JSON.parse(item.payloadJson || '{}');
    const isFullSync = payload.fullSync === true;
    
    let url = `${apiBase}/api/bookings`;
    let syncDescription = '';
    
    if (!isFullSync) {
      // Incremental sync: Only fetch bookings updated since last sync
      const lastSyncedAt = getMetadata('bookings_lastSyncedAt');
      
      if (lastSyncedAt) {
        // Backend supports ?updatedAfter filter + large limit to get all changed bookings
        url += `?updatedAfter=${encodeURIComponent(lastSyncedAt)}&limit=9999`;
        syncDescription = ` (updated after ${lastSyncedAt})`;
        log.info('[SYNC][BOOKINGS] Incremental sync since:', lastSyncedAt);
      } else {
        // No previous sync timestamp, treat as full sync
        url += '?limit=9999';
        log.info('[SYNC][BOOKINGS] No lastSyncedAt found, performing full sync with large limit');
        syncDescription = ' (full sync - no previous timestamp)';
      }
    } else {
      // Full sync: Fetch ALL bookings (use large limit to bypass pagination)
      url += '?limit=9999';
      syncDescription = ' (FULL SYNC - all bookings)';
    }
    
    log.info('[SYNC][BOOKINGS] GET', url, syncDescription);
    
    const response = await axios.get(url, { 
      headers, 
      timeout: 15000, // Longer timeout for full sync
      withCredentials: true 
    });
    
    const { bookings } = response.data;
    
    if (!Array.isArray(bookings)) {
      log.error('[SYNC][BOOKINGS] Invalid response format:', response.data);
      incrementAttempt(item.id);
      pendingErrorInfo = { 
        code: 'INVALID_RESPONSE', 
        message: 'Invalid bookings response format',
        outboxId: item.id 
      };
      return 'failure';
    }
    
    log.info('[SYNC][BOOKINGS] Received', bookings.length, 'bookings from backend', isFullSync ? '(full)' : '(incremental)');
    
    // Update local SQLite with UPSERT strategy
    const db = getDb();
    
    // Use transaction for atomic update
    let insertedCount = 0;
    let updatedCount = 0;
    const updateTransaction = db.transaction(() => {
      // UPSERT: Insert or update based on serverId
      const upsertStmt = db.prepare(`
        INSERT INTO Booking (
          id, serverId, roomId, userId, customerName, customerPhone, customerEmail,
          startTime, endTime, players, price, bookingStatus, paymentStatus,
          billedAt, paidAt, paymentMethod, tipAmount, bookingSource, createdBy, 
          internalNotes, createdAt, updatedAt, dirty
        ) VALUES (
          @id, @serverId, @roomId, @userId, @customerName, @customerPhone, @customerEmail,
          @startTime, @endTime, @players, @price, @bookingStatus, @paymentStatus,
          @billedAt, @paidAt, @paymentMethod, @tipAmount, @bookingSource, @createdBy,
          @internalNotes, @createdAt, @updatedAt, 0
        )
        ON CONFLICT(id) DO UPDATE SET
          serverId = @serverId,
          roomId = @roomId,
          userId = @userId,
          customerName = @customerName,
          customerPhone = @customerPhone,
          customerEmail = @customerEmail,
          startTime = @startTime,
          endTime = @endTime,
          players = @players,
          price = @price,
          bookingStatus = @bookingStatus,
          paymentStatus = @paymentStatus,
          billedAt = @billedAt,
          paidAt = @paidAt,
          paymentMethod = @paymentMethod,
          tipAmount = @tipAmount,
          bookingSource = @bookingSource,
          createdBy = @createdBy,
          internalNotes = @internalNotes,
          updatedAt = @updatedAt,
          dirty = CASE WHEN dirty = 1 THEN 1 ELSE 0 END
      `);
      
      // First, check for existing local bookings with serverIds
      const serverIdMap = new Map<string, string>(); // serverId -> localId
      const existingBookings = db.prepare('SELECT id, serverId FROM Booking WHERE serverId IS NOT NULL').all();
      for (const existing of existingBookings) {
        if (existing.serverId) {
          serverIdMap.set(existing.serverId, existing.id);
        }
      }
      
      for (const booking of bookings) {
        // Use existing local ID if we have a serverId mapping, otherwise use backend ID
        const localId = serverIdMap.get(booking.id) || booking.id;
        
        const result = upsertStmt.run({
          id: localId,
          serverId: booking.id, // Backend ID
          roomId: booking.roomId,
          userId: booking.userId,
          customerName: booking.customerName || '',
          customerPhone: booking.customerPhone || '',
          customerEmail: booking.customerEmail || null,
          startTime: booking.startTime,
          endTime: booking.endTime,
          players: booking.players || 1,
          price: booking.price || 0,
          bookingStatus: (booking as any).bookingStatus || booking.status || 'CONFIRMED',
          paymentStatus: (booking as any).paymentStatus || 'UNPAID',
          billedAt: (booking as any).billedAt || null,
          paidAt: (booking as any).paidAt || null,
          paymentMethod: (booking as any).paymentMethod || null,
          tipAmount: (booking as any).tipAmount || null,
          bookingSource: booking.bookingSource || 'ONLINE',
          createdBy: booking.createdBy || null,
          internalNotes: booking.internalNotes || null,
          createdAt: booking.createdAt || new Date().toISOString(),
          updatedAt: booking.updatedAt || new Date().toISOString()
        });
        
        if (result.changes > 0) {
          if (serverIdMap.has(booking.id)) {
            updatedCount++;
          } else {
            insertedCount++;
          }
        }
      }
    });
    
    updateTransaction();
    
    const finalCount = db.prepare('SELECT COUNT(*) as count FROM Booking').get().count;
    log.info('[SYNC][BOOKINGS] ✅ Sync complete:', insertedCount, 'inserted,', updatedCount, 'updated,', 'Total in SQLite:', finalCount);
    
    // Update lastSyncedAt timestamp for incremental sync
    const now = new Date().toISOString();
    setMetadata('bookings_lastSyncedAt', now);
    log.info('[SYNC][BOOKINGS] Updated lastSyncedAt to:', now);
    
    // Remove from queue
    deleteItem(item.id);
    return 'success';
    
  } catch (e: any) {
    const status = e?.response?.status;
    const body = e?.response?.data;
    log.error('[SYNC][BOOKINGS] Pull failed', status, body || e?.message);
    
    if (status === 401) {
      log.warn('[SYNC][BOOKINGS] Auth expired (401)');
      pendingErrorInfo = { 
        code: 'AUTH_EXPIRED', 
        status: 401, 
        message: 'Authentication expired (401)', 
        outboxId: item.id 
      };
      return 'auth-expired';
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

/**
 * Push booking status update to backend
 */
async function pushBookingStatusUpdate(apiBase: string, item: SyncQueueItem): Promise<PushOutcome> {
  try {
    const payload = JSON.parse(item.payloadJson);
    const { id, status } = payload;
    
    if (!id || !status) {
      log.error('[SYNC][BOOKING_STATUS] Missing id or status in payload');
      deleteItem(item.id);
      return 'success';
    }
    
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const cookieHeader = getSessionCookieHeader();
    if (cookieHeader) headers.Cookie = cookieHeader;
    
    // Get serverId for backend sync
    const db = getDb();
    const booking = db.prepare('SELECT serverId FROM Booking WHERE id = ?').get(id);
    const backendId = booking?.serverId || id; // Use serverId if available, else local id
    
    const url = `${apiBase}/api/bookings/${backendId}`;
    log.info('[SYNC][BOOKING_STATUS] PATCH', url, { status });
    
    await axios.patch(url, { status }, { 
      headers, 
      timeout: 8000, 
      withCredentials: true 
    });
    
    // Mark as clean
    db.prepare('UPDATE Booking SET dirty = 0 WHERE id = ?').run(id);
    deleteItem(item.id);
    
    log.info('[SYNC][BOOKING_STATUS] Successfully updated booking', id, 'to', status);
    return 'success';
    
  } catch (e: any) {
    const status = e?.response?.status;
    const body = e?.response?.data;
    log.error('[SYNC][BOOKING_STATUS] Update failed', status, body || e?.message);
    
    if (status === 401) {
      log.warn('[SYNC][BOOKING_STATUS] Auth expired (401)');
      pendingErrorInfo = { 
        code: 'AUTH_EXPIRED', 
        status: 401, 
        message: 'Authentication expired (401)', 
        outboxId: item.id 
      };
      return 'auth-expired';
    }
    
    if (status === 404) {
      log.warn('[SYNC][BOOKING_STATUS] Booking not found on backend, dropping update');
      deleteItem(item.id);
      return 'success';
    }
    
    incrementAttempt(item.id);
    pendingErrorInfo = { 
      code: status >= 500 ? 'SERVER_ERROR' : 'UPDATE_ERROR', 
      status, 
      message: body?.error || e?.message,
      outboxId: item.id 
    };
    return 'failure';
  }
}
