/**
 * menu.ts
 * -----------------------------------------
 * Menu item API routes for POS sync operations.
 * Allows POS to pull menu items from backend database.
 */
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/menu/items
 * Fetch all menu items for POS sync
 * Returns menu items sorted by category and sortOrder
 */
router.get('/items', async (req: Request, res: Response) => {
	try {
		const menuItems = await prisma.menuItem.findMany({
			orderBy: [
				{ category: 'asc' },
				{ sortOrder: 'asc' },
			],
		});

		// Convert Prisma types to POS-compatible format
		const items = menuItems.map(item => ({
			id: item.id,
			name: item.name,
			description: item.description,
			price: Number(item.price), // Convert Decimal to number
			category: item.category.toLowerCase(), // HOURS -> hours
			hours: item.hours,
			available: item.available ? 1 : 0, // Convert boolean to integer for SQLite compatibility
			sortOrder: item.sortOrder,
			createdAt: item.createdAt.toISOString(),
			updatedAt: item.updatedAt.toISOString(),
		}));

		res.json({ success: true, items });
	} catch (error: any) {
		console.error('[MENU API] Error fetching menu items:', error);
		res.status(500).json({ 
			success: false, 
			error: 'Failed to fetch menu items',
			message: error.message 
		});
	}
});

/**
 * GET /api/menu/items/:id
 * Fetch single menu item by ID
 */
router.get('/items/:id', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const menuItem = await prisma.menuItem.findUnique({
			where: { id },
		});

		if (!menuItem) {
			return res.status(404).json({ 
				success: false, 
				error: 'Menu item not found' 
			});
		}

		// Convert to POS-compatible format
		const item = {
			id: menuItem.id,
			name: menuItem.name,
			description: menuItem.description,
			price: Number(menuItem.price),
			category: menuItem.category.toLowerCase(),
			hours: menuItem.hours,
			available: menuItem.available ? 1 : 0,
			sortOrder: menuItem.sortOrder,
			createdAt: menuItem.createdAt.toISOString(),
			updatedAt: menuItem.updatedAt.toISOString(),
		};

		res.json({ success: true, item });
	} catch (error: any) {
		console.error('[MENU API] Error fetching menu item:', error);
		res.status(500).json({ 
			success: false, 
			error: 'Failed to fetch menu item',
			message: error.message 
		});
	}
});

export default router;
