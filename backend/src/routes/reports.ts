import { Router, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireAdmin } from '../middleware/requireRole';
import { getMonthlyReport } from '../repositories/monthlyReportRepo';
import { generateMonthlyReportPdf } from '../services/reportPdfService';

const router = Router();

/**
 * GET /api/reports/monthly-sales?month=MM&year=YYYY
 * Generates and streams a monthly sales report PDF.
 * Admin only.
 */
router.get('/monthly-sales', requireAuth, requireAdmin, async (req: any, res: Response) => {
  try {
    const month = parseInt(req.query.month as string, 10);
    const year = parseInt(req.query.year as string, 10);

    if (!month || !year || month < 1 || month > 12 || year < 2000 || year > 2100) {
      return res.status(400).json({ error: 'Valid month (1-12) and year (2000-2100) are required' });
    }

    const data = await getMonthlyReport(month, year);
    const doc = generateMonthlyReportPdf(data);

    const filename = `K-Golf_Monthly_Report_${year}-${String(month).padStart(2, '0')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);
  } catch (error) {
    req.log.error({ err: error, month: req.query.month, year: req.query.year }, 'Monthly report generation failed');
    return res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;
