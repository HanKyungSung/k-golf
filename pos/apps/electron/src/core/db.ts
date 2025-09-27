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
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Use a lightweight exported type wrapper to avoid leaking the full better-sqlite3 type name in .d.ts, fixing TS4058.
// We intentionally alias to any to keep consumer typing simple without re-exporting the module's types.
export type SqliteDb = any; // runtime is better-sqlite3 Database instance
let db: SqliteDb | null = null;

export interface InitResult {
  path: string;
  newlyCreated: boolean;
}

export function getDb(): SqliteDb {
  if (!db) throw new Error('DB not initialized');
  return db;
}

export function initDb(baseDir = path.join(process.cwd(), 'data')): InitResult {
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
  const dbPath = path.join(baseDir, 'pos.sqlite');
  const newlyCreated = !fs.existsSync(dbPath);
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // NOTE: Automatic destructive resets removed. To reset locally now:
  //  - Quit the app
  //  - Delete the SQLite file (pos/apps/electron/data/pos.sqlite*) OR
  //    run manual DROP TABLE statements via sqlite3
  //  - Relaunch (tables will be recreated idempotently)

  // Capitalized tables to mirror Prisma model naming style
  db.exec(`CREATE TABLE IF NOT EXISTS Meta (key TEXT PRIMARY KEY, value TEXT);
           CREATE TABLE IF NOT EXISTS Booking (
             id TEXT PRIMARY KEY,
             serverId TEXT,
             customerName TEXT,
             startTime TEXT,
             endTime TEXT,
             status TEXT DEFAULT 'PENDING',
             updatedAt INTEGER,
             dirty INTEGER DEFAULT 1
           );
           CREATE TABLE IF NOT EXISTS Outbox (
             id TEXT PRIMARY KEY,
             type TEXT NOT NULL,
             payloadJson TEXT NOT NULL,
             createdAt INTEGER NOT NULL,
             attemptCount INTEGER DEFAULT 0
           );
           CREATE INDEX IF NOT EXISTS idx_Outbox_createdAt ON Outbox(createdAt);`);

  return { path: dbPath, newlyCreated };
}
