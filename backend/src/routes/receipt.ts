import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as receiptRepo from '../repositories/receiptRepo';
import { sendReceiptEmail } from '../services/emailService';

const router = Router();

/**
 * GET /api/receipts/:bookingId
 * Get full receipt data for a booking
 */
router.get('/:bookingId', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    
    const receiptData = await receiptRepo.getReceiptData(bookingId);
    
    res.json({ receipt: receiptData });
  } catch (error: any) {
    console.error('[Receipt] Error generating receipt:', error);
    res.status(500).json({ 
      error: 'Failed to generate receipt',
      message: error.message 
    });
  }
});

/**
 * GET /api/receipts/:bookingId/seat/:seatIndex
 * Get receipt data for a specific seat
 */
router.get('/:bookingId/seat/:seatIndex', async (req: Request, res: Response) => {
  try {
    const { bookingId, seatIndex } = req.params;
    const seatNum = parseInt(seatIndex, 10);
    
    if (isNaN(seatNum) || seatNum < 1) {
      return res.status(400).json({ error: 'Invalid seat index' });
    }
    
    const receiptData = await receiptRepo.getSeatReceiptData(bookingId, seatNum);
    
    res.json({ receipt: receiptData });
  } catch (error: any) {
    console.error('[Receipt] Error generating seat receipt:', error);
    res.status(500).json({ 
      error: 'Failed to generate seat receipt',
      message: error.message 
    });
  }
});

/**
 * POST /api/receipts/:bookingId/email
 * Send receipt to customer via email
 */
const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
  seatIndex: z.number().int().min(1).optional(),
});

router.post('/:bookingId/email', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const parsed = emailSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: parsed.error.errors 
      });
    }
    
    const { email, seatIndex } = parsed.data;
    
    // Get receipt data
    const receiptData = seatIndex
      ? await receiptRepo.getSeatReceiptData(bookingId, seatIndex)
      : await receiptRepo.getReceiptData(bookingId);
    
    // Send email
    await sendReceiptEmail({
      to: email,
      receipt: receiptData,
    });
    
    res.json({ 
      success: true,
      message: `Receipt sent to ${email}`,
      receiptNumber: receiptData.receiptNumber,
    });
  } catch (error: any) {
    console.error('[Receipt] Error sending receipt email:', error);
    res.status(500).json({ 
      error: 'Failed to send receipt email',
      message: error.message 
    });
  }
});

export default router;
