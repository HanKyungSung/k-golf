"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSyncing = isSyncing;
exports.processSyncOnce = processSyncOnce;
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
    const item = (0, outbox_1.peekOldest)();
    if (!item)
        return;
    syncing = true;
    try {
        const headers = { 'Content-Type': 'application/json' };
        const token = (0, auth_1.getAccessToken)();
        if (token)
            headers.Authorization = `Bearer ${token}`;
        const url = `${apiBase}/api/booking`; // placeholder endpoint for create
        const payload = JSON.parse(item.payload_json);
        await axios_1.default.post(url, payload, { headers, timeout: 8000 });
        // On success remove from outbox (future: update bookings row dirty=0)
        (0, outbox_1.deleteItem)(item.id);
    }
    catch (e) {
        (0, outbox_1.incrementAttempt)(item.id);
    }
    finally {
        syncing = false;
    }
}
/** Mark a booking row as no longer dirty (post-success hook). */
function markBookingClean(localId) {
    const db = (0, db_1.getDb)();
    db.prepare('UPDATE bookings SET dirty=0 WHERE id = ?').run(localId);
}
