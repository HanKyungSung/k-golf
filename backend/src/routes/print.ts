import { Router } from 'express';
import { z } from 'zod';
import { getWebSocketManager } from '../server';
import { getBooking } from '../repositories/bookingRepo';
import * as receiptRepo from '../repositories/receiptRepo';
import { requireAuth } from '../middleware/requireAuth';
import { ReceiptFormatter } from '../services/receipt-formatter';

const router = Router();

const printReceiptSchema = z.object({
  bookingId: z.string().uuid(),
  seatIndex: z.number().int().min(1).optional() // Optional seat index for seat-specific receipts
});

/**
 * POST /api/print/receipt
 * Trigger printing of a receipt for a booking
 */
router.post('/receipt', requireAuth, async (req, res) => {
  try {
    const { bookingId, seatIndex } = printReceiptSchema.parse(req.body);

    // Get booking details
    const booking = await getBooking(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Get receipt data (seat-specific or full)
    const receiptData = seatIndex !== undefined
      ? await receiptRepo.getSeatReceiptData(bookingId, seatIndex)
      : await receiptRepo.getReceiptData(bookingId);

    // Format receipt for thermal printer
    const formatter = new ReceiptFormatter(48);
    
    // Collect all items from seats
    const allItems: Array<{ name: string; quantity: number; price: number }> = [];
    receiptData.items.seats.forEach((seat) => {
      seat.orders.forEach((order) => {
        allItems.push({
          name: order.name,
          quantity: order.quantity,
          price: order.total
        });
      });
    });
    
    const commands = formatter.formatReceipt({
      receiptNumber: receiptData.receiptNumber,
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail || undefined,
      roomName: receiptData.booking.room.name,
      items: allItems,
      subtotal: parseFloat(receiptData.totals.subtotal),
      tax: parseFloat(receiptData.totals.tax),
      total: parseFloat(receiptData.totals.grandTotal)
    });

    // Create print job with formatted commands
    const printJob = {
      id: `print-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'receipt' as const,
      commands
    };

    // Broadcast to print servers
    const wsManager = getWebSocketManager();
    wsManager.broadcastPrintJob(printJob);

    res.json({
      success: true,
      jobId: printJob.id,
      connectedPrinters: wsManager.getConnectedCount()
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    console.error('Print receipt error:', error);
    res.status(500).json({ error: 'Failed to send print job' });
  }
});

/**
 * GET /api/print/status
 * Check print server connection status
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const wsManager = getWebSocketManager();
    res.json({
      connected: wsManager.getConnectedCount() > 0,
      printerCount: wsManager.getConnectedCount()
    });
  } catch (error) {
    console.error('Print status error:', error);
    res.status(500).json({ error: 'Failed to get print status' });
  }
});

/**
 * POST /api/print/test
 * Send a test print job (for debugging)
 * NOTE: No auth required for testing
 */
router.post('/test', async (req, res) => {
  try {
    // Format test receipt
    const formatter = new ReceiptFormatter(48);
    const commands = formatter.formatReceipt({
      receiptNumber: 'TEST-001',
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      customerName: 'John Doe',
      customerPhone: '+1-555-123-4567',
      customerEmail: 'john@example.com',
      roomName: 'Bay 1',
      items: [
        { name: '1 Hour Golf Simulation', quantity: 1, price: 50.00 },
        { name: 'Beer - Heineken', quantity: 2, price: 12.00 },
        { name: 'Nachos', quantity: 1, price: 8.50 }
      ],
      subtotal: 70.50,
      tax: 7.05,
      total: 77.55
    });

    const testJob = {
      id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'receipt' as const,
      commands
    };

    const wsManager = getWebSocketManager();
    wsManager.broadcastPrintJob(testJob);

    res.json({
      success: true,
      message: 'Test print job sent',
      jobId: testJob.id,
      connectedPrinters: wsManager.getConnectedCount()
    });

  } catch (error) {
    console.error('Print test error:', error);
    res.status(500).json({ error: 'Failed to send test print job' });
  }
});

export { router as printRouter };
