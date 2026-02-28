import { prisma } from '../lib/prisma';
import { dayRange, getAtlanticComponents } from '../utils/timezone';

export interface DailySummaryData {
  date: string; // YYYY-MM-DD
  paymentBreakdown: { method: string; count: number; amount: number }[];
  totalRevenue: number;
  totalTips: number;
  totalTax: number;
  totalSubtotal: number;
  bookings: {
    completed: number;
    cancelled: number;
    booked: number;
    total: number;
  };
  invoices: {
    paid: number;
    unpaid: number;
  };
}

/**
 * Get a daily summary for a given date (Atlantic timezone).
 * If no date provided, defaults to today.
 */
export async function getDailySummary(dateInput?: Date): Promise<DailySummaryData> {
  const target = dateInput || new Date();
  const { start, end } = dayRange(target);
  const { year, month, day } = getAtlanticComponents(target);
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // Paid invoices for this day (based on paidAt in Atlantic day range)
  const paidInvoices = await prisma.invoice.findMany({
    where: {
      status: 'PAID',
      paidAt: { gte: start, lte: end },
    },
    select: {
      paymentMethod: true,
      totalAmount: true,
      subtotal: true,
      tax: true,
      tip: true,
    },
  });

  // Payment breakdown
  const paymentMap = new Map<string, { count: number; amount: number }>();
  for (const inv of paidInvoices) {
    const method = inv.paymentMethod || 'OTHER';
    const entry = paymentMap.get(method) || { count: 0, amount: 0 };
    entry.count++;
    entry.amount += Number(inv.totalAmount);
    paymentMap.set(method, entry);
  }
  const paymentBreakdown = Array.from(paymentMap.entries()).map(([method, data]) => ({
    method,
    ...data,
  }));

  // Totals
  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
  const totalTips = paidInvoices.reduce((sum, inv) => sum + Number(inv.tip || 0), 0);
  const totalTax = paidInvoices.reduce((sum, inv) => sum + Number(inv.tax || 0), 0);
  const totalSubtotal = paidInvoices.reduce((sum, inv) => sum + Number(inv.subtotal || 0), 0);

  // Bookings for this day (based on startTime)
  const bookingStats = await prisma.booking.groupBy({
    by: ['bookingStatus'],
    where: {
      startTime: { gte: start, lte: end },
    },
    _count: true,
  });

  const completed = bookingStats.find((s) => s.bookingStatus === 'COMPLETED')?._count || 0;
  const cancelled = bookingStats.find((s) => s.bookingStatus === 'CANCELLED')?._count || 0;
  const booked = bookingStats.find((s) => s.bookingStatus === 'BOOKED')?._count || 0;

  // Unpaid invoices for today's bookings
  const unpaidCount = await prisma.invoice.count({
    where: {
      status: 'UNPAID',
      booking: { startTime: { gte: start, lte: end } },
    },
  });

  return {
    date: dateStr,
    paymentBreakdown,
    totalRevenue,
    totalTips,
    totalTax,
    totalSubtotal,
    bookings: {
      completed,
      cancelled,
      booked,
      total: completed + cancelled + booked,
    },
    invoices: {
      paid: paidInvoices.length,
      unpaid: unpaidCount,
    },
  };
}
