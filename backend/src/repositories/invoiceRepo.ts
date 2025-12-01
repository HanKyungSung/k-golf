import { PrismaClient, Invoice } from '@prisma/client';
import * as orderRepo from './orderRepo';

const prisma = new PrismaClient();

const TAX_RATE = 0.1; // 10% tax

export interface InvoiceWithItems extends Invoice {
  orders?: any[];
}

export async function getInvoiceBySeat(bookingId: string, seatIndex: number): Promise<InvoiceWithItems | null> {
  const invoice = await prisma.invoice.findUnique({
    where: {
      bookingId_seatIndex: {
        bookingId,
        seatIndex,
      },
    },
  });

  if (!invoice) return null;

  // Get all orders for this seat
  const orders = await orderRepo.getOrdersForInvoice(bookingId, seatIndex);

  return {
    ...invoice,
    orders,
  };
}

export async function getAllInvoices(bookingId: string): Promise<InvoiceWithItems[]> {
  const invoices = await prisma.invoice.findMany({
    where: { bookingId },
    orderBy: { seatIndex: 'asc' },
  });

  // Fetch orders for each invoice
  const invoicesWithOrders = await Promise.all(
    invoices.map(async (invoice) => {
      const orders = await orderRepo.getOrdersForInvoice(bookingId, invoice.seatIndex);
      return {
        ...invoice,
        orders,
      };
    })
  );

  return invoicesWithOrders;
}

export async function recalculateInvoice(bookingId: string, seatIndex: number): Promise<Invoice> {
  // Get all orders for this seat
  const orders = await orderRepo.getOrdersForInvoice(bookingId, seatIndex);

  // Calculate totals from orders
  const subtotal = orders.reduce((sum, order) => sum + Number(order.totalPrice), 0);
  const tax = subtotal * TAX_RATE;

  // Get current invoice to preserve tip if any
  const currentInvoice = await prisma.invoice.findUnique({
    where: {
      bookingId_seatIndex: {
        bookingId,
        seatIndex,
      },
    },
  });

  const tip = currentInvoice?.tip || 0;
  const totalAmount = subtotal + tax + Number(tip || 0);

  // Update invoice with recalculated totals
  return prisma.invoice.update({
    where: {
      bookingId_seatIndex: {
        bookingId,
        seatIndex,
      },
    },
    data: {
      subtotal: subtotal,
      tax: tax,
      totalAmount: totalAmount,
    },
  });
}

export async function updateInvoicePayment(
  bookingId: string,
  seatIndex: number,
  paymentMethod: string,
  tip?: number
): Promise<Invoice> {
  // Get current invoice to calculate total
  const invoice = await prisma.invoice.findUnique({
    where: {
      bookingId_seatIndex: {
        bookingId,
        seatIndex,
      },
    },
  });

  if (!invoice) {
    throw new Error(`Invoice not found for booking ${bookingId}, seat ${seatIndex}`);
  }

  const totalAmount = Number(invoice.subtotal) + Number(invoice.tax) + (tip || 0);

  return prisma.invoice.update({
    where: {
      bookingId_seatIndex: {
        bookingId,
        seatIndex,
      },
    },
    data: {
      status: 'PAID',
      paymentMethod: paymentMethod,
      paidAt: new Date(),
      tip: tip,
      totalAmount: totalAmount,
    },
  });
}

export async function checkAllInvoicesPaid(bookingId: string): Promise<boolean> {
  const unpaidCount = await prisma.invoice.count({
    where: {
      bookingId,
      status: 'UNPAID',
    },
  });

  return unpaidCount === 0;
}

export async function getUnpaidInvoices(bookingId: string): Promise<Invoice[]> {
  return prisma.invoice.findMany({
    where: {
      bookingId,
      status: 'UNPAID',
    },
    orderBy: { seatIndex: 'asc' },
  });
}

export async function getPaidInvoices(bookingId: string): Promise<Invoice[]> {
  return prisma.invoice.findMany({
    where: {
      bookingId,
      status: 'PAID',
    },
    orderBy: { seatIndex: 'asc' },
  });
}

export async function getTotalRevenueForBooking(bookingId: string): Promise<number> {
  const result = await prisma.invoice.aggregate({
    where: {
      bookingId,
      status: 'PAID',
    },
    _sum: {
      totalAmount: true,
    },
  });

  return Number(result._sum.totalAmount || 0);
}
