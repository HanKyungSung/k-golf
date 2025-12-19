/**
 * User Management API Routes
 * 
 * Admin-only endpoints for user lookup and customer management.
 * Phase 1.3: User Lookup & Recent Customers
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { requireAuth } from '../middleware/requireAuth';
import { prisma } from '../lib/prisma';
import { normalizePhone, validatePhone } from '../utils/phoneUtils';

const router = Router();

/**
 * Middleware to require ADMIN role
 */
function requireAdmin(req: any, res: Response, next: Function) {
  if (req.user?.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * GET /api/users/lookup?phone={phone}
 * 
 * Lookup user by phone number with aggregated booking statistics.
 * 
 * Query params:
 * - phone: Phone number (any format, will be normalized)
 * 
 * Response:
 * - 200: User found with stats
 * - 200: { found: false } if not found
 * - 400: Invalid phone number
 * - 403: Non-admin user
 */
const lookupQuerySchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
});

router.get('/lookup', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Validate query params
    const parsed = lookupQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid query parameters',
        details: parsed.error.flatten().fieldErrors 
      });
    }

    const { phone } = parsed.data;

    // Normalize phone number
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhone(phone);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid phone number format',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Validate E.164 format
    if (!validatePhone(normalizedPhone)) {
      return res.status(400).json({ 
        error: 'Invalid phone number format',
        message: 'Phone must be in valid E.164 format'
      });
    }

    // Lookup user with aggregated booking stats
    const user = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
      include: {
        _count: {
          select: { bookings: true }
        },
        bookings: {
          select: {
            startTime: true,
            price: true,
          },
          orderBy: {
            startTime: 'desc'
          },
          take: 1 // Get most recent booking for lastBookingDate
        }
      }
    });

    // User not found
    if (!user) {
      return res.status(200).json({ found: false });
    }

    // Calculate aggregate stats
    const allBookings = await prisma.booking.findMany({
      where: { userId: user.id },
      select: { price: true }
    });

    const totalSpent = allBookings.reduce((sum, booking) => sum + Number(booking.price), 0);
    const bookingCount = user._count.bookings;
    const lastBookingDate = user.bookings[0]?.startTime || null;

    // Return user data with stats
    return res.status(200).json({
      found: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        registrationSource: user.registrationSource,
        memberSince: user.createdAt,
        bookingCount,
        lastBookingDate,
        totalSpent: totalSpent.toFixed(2),
      }
    });

  } catch (error) {
    console.error('[USER LOOKUP] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/recent?limit={10}&page={1}
 * 
 * Get recent customers ordered by last booking date.
 * 
 * Query params:
 * - limit: Number of results (default 10, max 50)
 * - page: Page number for pagination (default 1)
 * - registrationSource: Filter by source (optional)
 * - role: Filter by role (optional)
 * 
 * Response:
 * - 200: List of recent customers with pagination info
 * - 403: Non-admin user
 */
const recentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  page: z.coerce.number().int().min(1).default(1),
  registrationSource: z.enum(['ONLINE', 'WALK_IN', 'PHONE']).optional(),
  role: z.nativeEnum(UserRole).optional(),
});

router.get('/recent', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Validate query params
    const parsed = recentQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid query parameters',
        details: parsed.error.flatten().fieldErrors 
      });
    }

    const { limit, page, registrationSource, role } = parsed.data;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (registrationSource) {
      where.registrationSource = registrationSource;
    }
    if (role) {
      where.role = role;
    }

    // Get users with their most recent booking
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        registrationSource: true,
        createdAt: true,
        _count: {
          select: { bookings: true }
        },
        bookings: {
          select: { startTime: true },
          orderBy: { startTime: 'desc' },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc' // Default ordering by creation date
      }
    });

    // Add lastBookingDate and sort by it
    const usersWithStats = users.map(user => ({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      registrationSource: user.registrationSource,
      memberSince: user.createdAt,
      bookingCount: user._count.bookings,
      lastBookingDate: user.bookings[0]?.startTime || null,
    }));

    // Sort by lastBookingDate DESC (most recent first), null values last
    usersWithStats.sort((a, b) => {
      if (!a.lastBookingDate && !b.lastBookingDate) return 0;
      if (!a.lastBookingDate) return 1;
      if (!b.lastBookingDate) return -1;
      return b.lastBookingDate.getTime() - a.lastBookingDate.getTime();
    });

    // Apply pagination
    const paginatedUsers = usersWithStats.slice(skip, skip + limit);
    const totalCount = usersWithStats.length;
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    });

  } catch (error) {
    console.error('[RECENT USERS] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
