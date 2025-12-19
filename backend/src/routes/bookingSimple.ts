import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { normalizePhone } from '../utils/phoneUtils';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

// Admin check middleware
function requireAdmin(req: any, res: any, next: any) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * Simplified booking creation endpoint
 * - Admin only
 * - Phone-based customer lookup
 * - Auto-links to existing user or creates guest booking
 */

const createBookingSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().min(10, 'Phone number is required'),
  customerEmail: z.string().email().optional().or(z.literal('')),
  roomId: z.string().uuid('Invalid room ID'),
  startTime: z.string().datetime('Invalid start time'),
  duration: z.number().int().min(1).max(4, 'Duration must be 1-4 hours'),
  players: z.number().int().min(1).max(4, 'Players must be 1-4'),
  bookingSource: z.enum(['ONLINE', 'WALK_IN', 'PHONE']),
  price: z.number().optional(),
  internalNotes: z.string().optional(),
});

router.post('/create', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Validate input
    const data = createBookingSchema.parse(req.body);
    
    // Normalize phone number
    const normalizedPhone = normalizePhone(data.customerPhone);
    
    // Look up existing user by phone
    const existingUser = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });
    
    // Check if room exists and is active
    const room = await prisma.room.findUnique({
      where: { id: data.roomId },
    });
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (room.status !== 'ACTIVE') {
      return res.status(400).json({ 
        error: 'Room is not available',
        details: `Room status: ${room.status}`,
      });
    }
    
    // Calculate end time
    const startTime = new Date(data.startTime);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + data.duration);
    
    // Check for booking conflicts
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        roomId: data.roomId,
        bookingStatus: { not: 'CANCELLED' },
        OR: [
          {
            // New booking starts during existing booking
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            // New booking ends during existing booking
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            // New booking encompasses existing booking
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    });
    
    if (conflictingBooking) {
      return res.status(409).json({
        error: 'Time slot conflict',
        details: 'This room is already booked for the selected time',
        conflictingBooking: {
          id: conflictingBooking.id,
          startTime: conflictingBooking.startTime,
          endTime: conflictingBooking.endTime,
        },
      });
    }
    
    // Calculate price (if not provided)
    const price = data.price ?? (50 * data.duration); // $50/hour default
    
    // Get admin user ID from request
    const adminId = (req as any).user?.id;
    
    // Create booking
    const booking = await prisma.booking.create({
      data: {
        userId: existingUser?.id ?? undefined, // Link to user if found, undefined for guest
        customerName: data.customerName,
        customerPhone: normalizedPhone,
        customerEmail: data.customerEmail || null,
        roomId: data.roomId,
        startTime,
        endTime,
        players: data.players,
        price,
        bookingStatus: 'BOOKED',
        paymentStatus: 'UNPAID',
        bookingSource: data.bookingSource,
        createdBy: adminId,
        internalNotes: data.internalNotes || null,
      },
      include: {
        room: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
    
    // Auto-create empty invoices for each seat (1 per player)
    // Start at 0, orders will be added later
    const invoicePromises = [];
    for (let seatIndex = 1; seatIndex <= data.players; seatIndex++) {
      invoicePromises.push(
        prisma.invoice.create({
          data: {
            bookingId: booking.id,
            seatIndex,
            subtotal: 0,
            tax: 0,
            tip: null,
            totalAmount: 0,
            status: 'UNPAID',
            paymentMethod: null,
            paidAt: null,
          },
        })
      );
    }
    
    await Promise.all(invoicePromises);
    
    return res.status(201).json({
      success: true,
      booking,
      isNewCustomer: !existingUser,
      linkedToUser: !!existingUser,
      invoicesCreated: data.players,
    });
    
  } catch (error: any) {
    console.error('[BOOKING_CREATE] Error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }
    
    return res.status(500).json({
      error: 'Failed to create booking',
      details: error.message,
    });
  }
});

export default router;
