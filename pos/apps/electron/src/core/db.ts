/**
 * db.ts
 * -----------------------------------------
 * Centralized SQLite (better-sqlite3) initialization & access layer.
 * Responsibilities:
 *  - Create / open the local POS database (pos.sqlite) under ./data
 *  - Ensure Write-Ahead Logging (WAL) for durability + concurrent reads
 *  - Create foundational tables (meta, bookings, sync_queue, menu_items, order_items)
 *  - Expose a singleton `getDb()` for other core modules (sync-queue, sync, menu, etc.)
 *
 * Tables:
 *  Meta(key PRIMARY KEY, value TEXT)         -> generic key/value (last_sync_ts, device_id, etc.)
 *  Booking(..., dirty INTEGER)               -> local snapshot + dirty flag for unsynced entries
 *  SyncQueue(id, type, payload_json, attempt..) -> queued operations (push/pull) waiting to be synced
 *  MenuItem(id, name, price, category, ...)  -> menu items (hours, food, drinks, etc.)
 *  OrderItem(id, booking_id, menu_item_id...) -> order line items with snapshots
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
           
           CREATE TABLE IF NOT EXISTS Metadata (
             key TEXT PRIMARY KEY,
             value TEXT NOT NULL,
             updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
           );
           
           CREATE TABLE IF NOT EXISTS Booking (
             id TEXT PRIMARY KEY,
             serverId TEXT,
             roomId TEXT NOT NULL,
             userId TEXT,
             customerName TEXT NOT NULL,
             customerPhone TEXT NOT NULL,
             customerEmail TEXT,
             startTime TEXT NOT NULL,
             endTime TEXT NOT NULL,
             players INTEGER NOT NULL,
             price REAL NOT NULL,
             status TEXT DEFAULT 'CONFIRMED',
             bookingSource TEXT DEFAULT 'WALK_IN',
             createdBy TEXT,
             internalNotes TEXT,
             createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
             updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
             dirty INTEGER DEFAULT 1
           );
           CREATE TABLE IF NOT EXISTS SyncQueue (
             id TEXT PRIMARY KEY,
             type TEXT NOT NULL,
             payloadJson TEXT NOT NULL,
             createdAt INTEGER NOT NULL,
             attemptCount INTEGER DEFAULT 0
           );
           CREATE INDEX IF NOT EXISTS idx_SyncQueue_createdAt ON SyncQueue(createdAt);
           
           CREATE TABLE IF NOT EXISTS MenuItem (
             id TEXT PRIMARY KEY,
             name TEXT NOT NULL,
             description TEXT,
             price REAL NOT NULL,
             category TEXT NOT NULL CHECK(category IN ('hours', 'food', 'drinks', 'appetizers', 'desserts')),
             hours INTEGER,
             available INTEGER DEFAULT 1,
             sortOrder INTEGER DEFAULT 0,
             createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
             updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
           );
           CREATE INDEX IF NOT EXISTS idx_MenuItem_category ON MenuItem(category, sortOrder);
           CREATE INDEX IF NOT EXISTS idx_MenuItem_available ON MenuItem(available);
           
           CREATE TABLE IF NOT EXISTS Room (
             id TEXT PRIMARY KEY,
             name TEXT NOT NULL,
             capacity INTEGER DEFAULT 4,
             active INTEGER DEFAULT 1,
             openMinutes INTEGER DEFAULT 540,
             closeMinutes INTEGER DEFAULT 1140,
             status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'MAINTENANCE', 'CLOSED')),
             createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
             updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
           );
           CREATE INDEX IF NOT EXISTS idx_Room_status ON Room(status);
           CREATE INDEX IF NOT EXISTS idx_Room_active ON Room(active);
           
           CREATE TABLE IF NOT EXISTS OrderItem (
             id TEXT PRIMARY KEY,
             bookingId TEXT NOT NULL,
             menuItemId TEXT NOT NULL,
             menuItemSnapshot TEXT NOT NULL,
             quantity INTEGER NOT NULL,
             seat INTEGER,
             splitPrice REAL,
             createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
             FOREIGN KEY (menuItemId) REFERENCES MenuItem(id)
           );
           CREATE INDEX IF NOT EXISTS idx_OrderItem_booking ON OrderItem(bookingId);`);

  // Seed menu items if empty
  seedMenuIfEmpty();

  return { path: dbPath, newlyCreated };
}

/**
 * Seed initial menu items if MenuItem table is empty.
 */
function seedMenuIfEmpty() {
  if (!db) return;
  
  const count = db.prepare('SELECT COUNT(*) as count FROM MenuItem').get();
  if (count.count > 0) {
    console.log('[DB] MenuItem table already has data, skipping seed');
    return;
  }
  
  console.log('[DB] Seeding initial menu items...');
  
  const initialMenu = [
    // Hours (Room booking time)
    { id: 'hour-1', name: '1 Hour', description: 'Screen golf room for 1 hour', price: 30.00, category: 'hours', hours: 1, available: 1, sortOrder: 1 },
    { id: 'hour-2', name: '2 Hours', description: 'Screen golf room for 2 hours', price: 60.00, category: 'hours', hours: 2, available: 1, sortOrder: 2 },
    { id: 'hour-3', name: '3 Hours', description: 'Screen golf room for 3 hours', price: 90.00, category: 'hours', hours: 3, available: 1, sortOrder: 3 },
    { id: 'hour-4', name: '4 Hours', description: 'Screen golf room for 4 hours', price: 120.00, category: 'hours', hours: 4, available: 1, sortOrder: 4 },
    { id: 'hour-5', name: '5 Hours', description: 'Screen golf room for 5 hours', price: 150.00, category: 'hours', hours: 5, available: 1, sortOrder: 5 },
    // Food
    { id: '1', name: 'Club Sandwich', description: 'Triple-decker with turkey, bacon, lettuce, and tomato', price: 12.99, category: 'food', hours: null, available: 1, sortOrder: 1 },
    { id: '2', name: 'Korean Fried Chicken', description: 'Crispy chicken with sweet and spicy sauce', price: 15.99, category: 'food', hours: null, available: 1, sortOrder: 2 },
    { id: '3', name: 'Bulgogi Burger', description: 'Korean-style marinated beef burger with kimchi', price: 14.99, category: 'food', hours: null, available: 1, sortOrder: 3 },
    { id: '4', name: 'Caesar Salad', description: 'Fresh romaine with parmesan and croutons', price: 9.99, category: 'food', hours: null, available: 1, sortOrder: 4 },
    // Drinks
    { id: '5', name: 'Soju', description: 'Korean distilled spirit (Original/Peach/Grape)', price: 8.99, category: 'drinks', hours: null, available: 1, sortOrder: 1 },
    { id: '6', name: 'Beer', description: 'Domestic and imported selection', price: 6.99, category: 'drinks', hours: null, available: 1, sortOrder: 2 },
    { id: '7', name: 'Soft Drinks', description: 'Coke, Sprite, Fanta, etc.', price: 2.99, category: 'drinks', hours: null, available: 1, sortOrder: 3 },
    { id: '8', name: 'Iced Coffee', description: 'Cold brew coffee with ice', price: 4.99, category: 'drinks', hours: null, available: 1, sortOrder: 4 },
    // Appetizers
    { id: '9', name: 'Chicken Wings', description: '6 pieces with choice of sauce', price: 10.99, category: 'appetizers', hours: null, available: 1, sortOrder: 1 },
    { id: '10', name: 'French Fries', description: 'Crispy golden fries with ketchup', price: 5.99, category: 'appetizers', hours: null, available: 1, sortOrder: 2 },
    { id: '11', name: 'Mozzarella Sticks', description: '6 pieces with marinara sauce', price: 8.99, category: 'appetizers', hours: null, available: 1, sortOrder: 3 },
    // Desserts
    { id: '12', name: 'Ice Cream', description: 'Vanilla, chocolate, or strawberry', price: 5.99, category: 'desserts', hours: null, available: 1, sortOrder: 1 },
  ];
  
  const insertStmt = db.prepare(`
    INSERT INTO MenuItem (id, name, description, price, category, hours, available, sortOrder)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((items: typeof initialMenu) => {
    for (const item of items) {
      insertStmt.run(item.id, item.name, item.description, item.price, item.category, item.hours, item.available, item.sortOrder);
    }
  });
  
  insertMany(initialMenu);
  console.log(`[DB] Seeded ${initialMenu.length} menu items`);
}

/**
 * Get a value from the Metadata table (used for sync timestamps).
 * Returns null if key doesn't exist.
 */
export function getMetadata(key: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM Metadata WHERE key = ?').get(key);
  return row?.value || null;
}

/**
 * Set or update a value in the Metadata table.
 * Used to track lastSyncedAt timestamps for incremental sync.
 */
export function setMetadata(key: string, value: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO Metadata (key, value, updatedAt) 
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET 
      value = excluded.value,
      updatedAt = CURRENT_TIMESTAMP
  `).run(key, value);
}
