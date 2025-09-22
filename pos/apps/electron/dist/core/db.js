"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.initDb = initDb;
/**
 * db.ts
 * -----------------------------------------
 * Centralized SQLite (better-sqlite3) initialization & access layer.
 * Responsibilities:
 *  - Create / open the local POS database (pos.sqlite) under ./data
 *  - Ensure Write-Ahead Logging (WAL) for durability + concurrent reads
 *  - Create foundational tables (meta, bookings, outbox)
 *  - Expose a singleton `getDb()` for other core modules (outbox, sync, etc.)
 *
 * Tables (Phase 0):
 *  meta(key PRIMARY KEY, value TEXT)         -> generic key/value (last_sync_ts, device_id, etc.)
 *  bookings(..., dirty INTEGER)              -> local snapshot + dirty flag for unsynced entries
 *  outbox(id, type, payload_json, attempt..) -> queued mutations waiting to be pushed to backend
 *
 * IMPORTANT: Any schema evolution should be done via additive migrations; for early phases
 * we rely on simple CREATE IF NOT EXISTS. Later we can implement a migration table.
 */
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let db = null;
function getDb() {
    if (!db)
        throw new Error('DB not initialized');
    return db;
}
function initDb(baseDir = path_1.default.join(process.cwd(), 'data')) {
    if (!fs_1.default.existsSync(baseDir))
        fs_1.default.mkdirSync(baseDir, { recursive: true });
    const dbPath = path_1.default.join(baseDir, 'pos.sqlite');
    const newlyCreated = !fs_1.default.existsSync(dbPath);
    db = new better_sqlite3_1.default(dbPath);
    db.pragma('journal_mode = WAL');
    db.exec(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
           CREATE TABLE IF NOT EXISTS bookings (
             id TEXT PRIMARY KEY,
             server_id TEXT,
             customer_name TEXT,
             starts_at TEXT,
             ends_at TEXT,
             status TEXT DEFAULT 'PENDING',
             updated_at INTEGER,
             dirty INTEGER DEFAULT 1
           );
           CREATE TABLE IF NOT EXISTS outbox (
             id TEXT PRIMARY KEY,
             type TEXT NOT NULL,
             payload_json TEXT NOT NULL,
             created_at INTEGER NOT NULL,
             attempt_count INTEGER DEFAULT 0
           );
           CREATE INDEX IF NOT EXISTS idx_outbox_created_at ON outbox(created_at);
  `);
    return { path: dbPath, newlyCreated };
}
