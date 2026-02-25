import { prisma } from '../lib/prisma';

export interface MonthlyReportData {
  period: { month: number; year: number; startDate: Date; endDate: Date };
  paymentTypes: { method: string; count: number; amount: number }[];
  salesBreakdown: {
    roomRevenue: number;
    menuSales: { category: string; count: number; amount: number }[];
    grossSales: number;
    totalDiscounts: number;
    netSales: number;
  };
  taxSummary: { taxRate: number; totalTax: number };
  tipsSummary: { totalTips: number; averageTip: number; tippedCount: number };
  operationalStats: {
    totalBookings: number;
    totalCustomers: number;
    totalInvoices: number;
    averageBookingValue: number;
    averageCustomerSpend: number;
    settledCount: number;
    settledAmount: number;
    openCount: number;
    openAmount: number;
  };
  discountDetail: { type: string; count: number; amount: number }[];
}

async function getGlobalTaxRate(): Promise<number> {
  const setting = await prisma.setting.findUnique({
    where: { key: 'global_tax_rate' },
  });
  return setting ? parseFloat(setting.value) / 100 : 0.13;
}

export async function getMonthlyReport(month: number, year: number): Promise<MonthlyReportData> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const dateFilter = { gte: startDate, lt: endDate };

  // 1. Payment type breakdown from paid invoices
  const invoices = await prisma.invoice.findMany({
    where: { status: 'PAID', paidAt: dateFilter },
    select: {
      paymentMethod: true,
      totalAmount: true,
      subtotal: true,
      tax: true,
      tip: true,
      status: true,
    },
  });

  const paymentMap = new Map<string, { count: number; amount: number }>();
  for (const inv of invoices) {
    const method = inv.paymentMethod || 'OTHER';
    const entry = paymentMap.get(method) || { count: 0, amount: 0 };
    entry.count++;
    entry.amount += Number(inv.totalAmount);
    paymentMap.set(method, entry);
  }
  const paymentTypes = Array.from(paymentMap.entries()).map(([method, data]) => ({
    method,
    ...data,
  }));

  // 2. Sales breakdown
  const completedBookings = await prisma.booking.findMany({
    where: {
      bookingStatus: 'COMPLETED',
      completedAt: dateFilter,
    },
    select: { id: true, price: true, customerPhone: true },
  });

  const roomRevenue = completedBookings.reduce((sum, b) => sum + Number(b.price), 0);

  // Menu item sales by category
  const bookingIds = completedBookings.map((b) => b.id);
  const orders = await prisma.order.findMany({
    where: {
      bookingId: { in: bookingIds },
      discountType: null, // Exclude discount orders
    },
    include: { menuItem: { select: { category: true } } },
  });

  const categoryMap = new Map<string, { count: number; amount: number }>();
  for (const order of orders) {
    const category = order.menuItem?.category || 'CUSTOM';
    const entry = categoryMap.get(category) || { count: 0, amount: 0 };
    entry.count += order.quantity;
    entry.amount += Number(order.totalPrice);
    categoryMap.set(category, entry);
  }
  const menuSales = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    ...data,
  }));

  // Discount orders
  const discountOrders = await prisma.order.findMany({
    where: {
      bookingId: { in: bookingIds },
      discountType: { not: null },
    },
  });

  const totalDiscounts = Math.abs(
    discountOrders.reduce((sum, o) => sum + Number(o.totalPrice), 0)
  );

  const menuTotal = orders.reduce((sum, o) => sum + Number(o.totalPrice), 0);
  const grossSales = roomRevenue + menuTotal;
  const netSales = grossSales - totalDiscounts;

  // 3. Tax summary
  const taxRate = await getGlobalTaxRate();
  const totalTax = invoices.reduce((sum, inv) => sum + Number(inv.tax), 0);

  // 4. Tips summary
  const tippedInvoices = invoices.filter((inv) => inv.tip && Number(inv.tip) > 0);
  const totalTips = invoices.reduce((sum, inv) => sum + Number(inv.tip || 0), 0);
  const averageTip = tippedInvoices.length > 0 ? totalTips / tippedInvoices.length : 0;

  // 5. Operational stats
  const uniqueCustomers = new Set(completedBookings.map((b) => b.customerPhone)).size;
  const settledInvoices = invoices; // already filtered to PAID
  const openInvoices = await prisma.invoice.findMany({
    where: {
      status: 'UNPAID',
      booking: { completedAt: dateFilter, bookingStatus: 'COMPLETED' },
    },
    select: { totalAmount: true },
  });

  const settledAmount = settledInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
  const openAmount = openInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  // 6. Discount detail by type
  const discountMap = new Map<string, { count: number; amount: number }>();
  for (const d of discountOrders) {
    const type = d.discountType || 'UNKNOWN';
    const entry = discountMap.get(type) || { count: 0, amount: 0 };
    entry.count++;
    entry.amount += Math.abs(Number(d.totalPrice));
    discountMap.set(type, entry);
  }
  const discountDetail = Array.from(discountMap.entries()).map(([type, data]) => ({
    type,
    ...data,
  }));

  return {
    period: { month, year, startDate, endDate },
    paymentTypes,
    salesBreakdown: { roomRevenue, menuSales, grossSales, totalDiscounts, netSales },
    taxSummary: { taxRate, totalTax },
    tipsSummary: { totalTips, averageTip, tippedCount: tippedInvoices.length },
    operationalStats: {
      totalBookings: completedBookings.length,
      totalCustomers: uniqueCustomers,
      totalInvoices: invoices.length,
      averageBookingValue: completedBookings.length > 0 ? netSales / completedBookings.length : 0,
      averageCustomerSpend: uniqueCustomers > 0 ? netSales / uniqueCustomers : 0,
      settledCount: settledInvoices.length,
      settledAmount,
      openCount: openInvoices.length,
      openAmount,
    },
    discountDetail,
  };
}
