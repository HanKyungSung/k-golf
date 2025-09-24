"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSyncing = isSyncing;
exports.processSyncOnce = processSyncOnce;
exports.processSyncCycle = processSyncCycle;
exports.markBookingClean = markBookingClean;
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
const axios_1 = __importDefault(require("axios"));
const outbox_1 = require("./outbox");
const auth_1 = require("./auth");
const db_1 = require("./db");
let syncing = false;
/** Are we currently processing a push operation? */
function isSyncing() { return syncing; }
/**
 * Attempt a single push cycle. If queue empty or already syncing, returns fast.
 * apiBase: e.g. https://pos-api.example.com (no trailing slash required)
 */
async function processSyncOnce(apiBase) {
    if (syncing)
        return;
    const next = (0, outbox_1.peekOldest)();
    if (!next)
        return;
    syncing = true;
    try {
        await pushSingle(apiBase, next.payloadJson, next.id);
    }
    finally {
        syncing = false;
    }
}
/** Iterate through outbox until empty or a transient failure occurs. */
async function processSyncCycle(apiBase) {
    if (syncing)
        return { pushed: 0, failures: 0, remaining: 0 };
    syncing = true;
    let pushed = 0;
    let failures = 0;
    try {
        while (true) {
            const item = (0, outbox_1.peekOldest)();
            if (!item)
                break;
            const ok = await pushSingle(apiBase, item.payloadJson, item.id);
            if (ok) {
                pushed++;
            }
            else {
                failures++;
                // Stop loop on first failure (simple strategy Phase 0)
                break;
            }
        }
    }
    finally {
        const remainingItem = (0, outbox_1.peekOldest)();
        const remaining = remainingItem ? 1 : 0; // quick estimate (can refine with COUNT later)
        syncing = false;
        return { pushed, failures, remaining };
    }
}
let discoveredRoomId = null;
async function discoverRoomId(apiBase) {
    try {
        const res = await axios_1.default.get(`${apiBase}/api/bookings/rooms`, { timeout: 5000, withCredentials: true });
        const rooms = res.data?.rooms || [];
        if (rooms.length) {
            const room = rooms.find((r) => r.active) || rooms[0];
            console.log('[SYNC] Discovered room id', room.id, 'name', room.name);
            discoveredRoomId = room.id;
            return room.id;
        }
    }
    catch (e) {
        console.warn('[SYNC] room discovery failed', e?.message);
    }
    return null;
}
async function pushSingle(apiBase, payloadJson, outboxId) {
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
        (0, outbox_1.incrementAttempt)(outboxId);
        return false;
    }
    let hours = 1;
    try {
        const start = new Date(raw.startsAt);
        const end = new Date(raw.endsAt);
        const diffH = (end.getTime() - start.getTime()) / 3600000;
        if (diffH >= 1 && diffH <= 4)
            hours = Math.round(diffH);
    }
    catch { /* keep default */ }
    const players = 1; // Phase 0 assumption
    const startTimeIso = raw.startsAt;
    const body = { roomId, startTimeIso, players, hours };
    const headers = { 'Content-Type': 'application/json' };
    const token = (0, auth_1.getAccessToken)();
    if (token)
        headers.Authorization = `Bearer ${token}`;
    const cookieHeader = (0, auth_1.getSessionCookieHeader)();
    if (cookieHeader)
        headers.Cookie = cookieHeader;
    const url = `${apiBase}/api/bookings`; // plural endpoint
    try {
        console.log('[SYNC] POST', url, body);
        await axios_1.default.post(url, body, { headers, timeout: 8000, withCredentials: true });
        (0, outbox_1.deleteItem)(outboxId);
        if (raw.localId)
            markBookingClean(raw.localId);
        return true;
    }
    catch (e) {
        const status = e?.response?.status;
        const body = e?.response?.data;
        console.error('[SYNC] push failed', status, body || e?.message);
        if (status === 400 && body?.error) {
            console.error('[SYNC] server validation error:', body.error);
        }
        (0, outbox_1.incrementAttempt)(outboxId);
        return false;
    }
}
/** Mark a booking row as no longer dirty (post-success hook). */
function markBookingClean(localId) {
    const db = (0, db_1.getDb)();
    db.prepare('UPDATE Booking SET dirty=0 WHERE id = ?').run(localId);
}
