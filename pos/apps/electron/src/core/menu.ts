/**
 * core/menu.ts
 * -----------------------------------------
 * Menu CRUD operations for SQLite database.
 */
import { getDb } from './db';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'hours' | 'food' | 'drinks' | 'appetizers' | 'desserts';
  hours?: number;
  available: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Internal DB row type (SQLite uses INTEGER for boolean)
interface MenuItemRow {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  hours: number | null;
  available: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Convert DB row to MenuItem interface.
 */
function rowToMenuItem(row: MenuItemRow): MenuItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    category: row.category as MenuItem['category'],
    hours: row.hours || undefined,
    available: row.available === 1,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Get all menu items.
 */
export function getAllMenuItems(): MenuItem[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM MenuItem ORDER BY category, sortOrder').all() as MenuItemRow[];
  return rows.map(rowToMenuItem);
}

/**
 * Get menu items by category.
 */
export function getMenuItemsByCategory(category: MenuItem['category']): MenuItem[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM MenuItem WHERE category = ? ORDER BY sortOrder').all(category) as MenuItemRow[];
  return rows.map(rowToMenuItem);
}

/**
 * Get a single menu item by ID.
 */
export function getMenuItemById(id: string): MenuItem | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM MenuItem WHERE id = ?').get(id) as MenuItemRow | undefined;
  return row ? rowToMenuItem(row) : null;
}

/**
 * Create a new menu item.
 */
export function createMenuItem(item: Omit<MenuItem, 'createdAt' | 'updatedAt'>): MenuItem {
  const db = getDb();
  const now = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO MenuItem (id, name, description, price, category, hours, available, sortOrder, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    item.id,
    item.name,
    item.description,
    item.price,
    item.category,
    item.hours || null,
    item.available ? 1 : 0,
    item.sortOrder,
    now,
    now
  );
  
  return getMenuItemById(item.id)!;
}

/**
 * Update an existing menu item.
 */
export function updateMenuItem(id: string, updates: Partial<Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>>): MenuItem | null {
  const db = getDb();
  const existing = getMenuItemById(id);
  
  if (!existing) return null;
  
  const now = new Date().toISOString();
  
  db.prepare(`
    UPDATE MenuItem
    SET name = ?,
        description = ?,
        price = ?,
        category = ?,
        hours = ?,
        available = ?,
        sortOrder = ?,
        updatedAt = ?
    WHERE id = ?
  `).run(
    updates.name !== undefined ? updates.name : existing.name,
    updates.description !== undefined ? updates.description : existing.description,
    updates.price !== undefined ? updates.price : existing.price,
    updates.category !== undefined ? updates.category : existing.category,
    updates.hours !== undefined ? updates.hours : (existing.hours || null),
    updates.available !== undefined ? (updates.available ? 1 : 0) : (existing.available ? 1 : 0),
    updates.sortOrder !== undefined ? updates.sortOrder : existing.sortOrder,
    now,
    id
  );
  
  return getMenuItemById(id);
}

/**
 * Delete a menu item.
 */
export function deleteMenuItem(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM MenuItem WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * Toggle menu item availability.
 */
export function toggleMenuItemAvailability(id: string): MenuItem | null {
  const db = getDb();
  const existing = getMenuItemById(id);
  
  if (!existing) return null;
  
  return updateMenuItem(id, { available: !existing.available });
}
