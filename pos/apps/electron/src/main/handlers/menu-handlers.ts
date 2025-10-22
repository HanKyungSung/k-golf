/**
 * handlers/menu-handlers.ts
 * -----------------------------------------
 * IPC handlers for menu operations.
 */
import { ipcMain } from 'electron';
import {
  getAllMenuItems,
  getMenuItemsByCategory,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  type MenuItem,
} from '../../core/menu';

/**
 * Register all menu IPC handlers.
 */
export function registerMenuHandlers() {
  // Get all menu items
  ipcMain.handle('menu:getAll', async () => {
    try {
      return { success: true, data: getAllMenuItems() };
    } catch (error) {
      console.error('Error getting all menu items:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Get menu items by category
  ipcMain.handle('menu:getByCategory', async (_event, category: MenuItem['category']) => {
    try {
      return { success: true, data: getMenuItemsByCategory(category) };
    } catch (error) {
      console.error('Error getting menu items by category:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Get single menu item by ID
  ipcMain.handle('menu:getById', async (_event, id: string) => {
    try {
      const item = getMenuItemById(id);
      return { success: true, data: item };
    } catch (error) {
      console.error('Error getting menu item by ID:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Create new menu item
  ipcMain.handle('menu:create', async (_event, item: Omit<MenuItem, 'createdAt' | 'updatedAt'>) => {
    try {
      const created = createMenuItem(item);
      return { success: true, data: created };
    } catch (error) {
      console.error('Error creating menu item:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Update menu item
  ipcMain.handle('menu:update', async (_event, id: string, updates: Partial<Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>>) => {
    try {
      const updated = updateMenuItem(id, updates);
      if (!updated) {
        return { success: false, error: 'Menu item not found' };
      }
      return { success: true, data: updated };
    } catch (error) {
      console.error('Error updating menu item:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Delete menu item
  ipcMain.handle('menu:delete', async (_event, id: string) => {
    try {
      const deleted = deleteMenuItem(id);
      return { success: true, data: deleted };
    } catch (error) {
      console.error('Error deleting menu item:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Toggle menu item availability
  ipcMain.handle('menu:toggleAvailability', async (_event, id: string) => {
    try {
      const updated = toggleMenuItemAvailability(id);
      if (!updated) {
        return { success: false, error: 'Menu item not found' };
      }
      return { success: true, data: updated };
    } catch (error) {
      console.error('Error toggling menu item availability:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  console.log('Menu IPC handlers registered');
}
