import { PrismaClient, Booking } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateBookingInput {
  roomId: string;
  userId?: string;
  customerName: string;
  customerPhone: string;
  startTime: Date;
  endTime?: Date; // Optional, will compute from hours if not provided
  players: number;
  hours?: number; // Optional if endTime provided
  price: number | string; // stored as Decimal(10,2) in DB
  bookingSource?: string; // Optional: "ONLINE" | "WALK_IN" | "PHONE"
}

// Compute endTime: independent hours selection
function computeEnd(startTime: Date, hours: number): Date {
  return new Date(startTime.getTime() + hours * 60 * 60 * 1000);
}

const HOURLY_RATE = 50; // $50 per hour per player
const TAX_RATE = 0.1; // 10% tax

export async function findConflict(roomId: string, startTime: Date, endTime: Date) {
  return prisma.booking.findFirst({
    where: {
      roomId,
      bookingStatus: { not: 'CANCELLED' },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    orderBy: { startTime: 'asc' },
  });
}

export async function createBooking(data: CreateBookingInput): Promise<Booking> {
  const endTime = data.endTime || (data.hours ? computeEnd(data.startTime, data.hours) : new Date(data.startTime.getTime() + 3600000));
  
  // Calculate price if not provided: players × hours × $50/hour
  let price = data.price;
  if (!price && data.hours) {
    price = data.players * data.hours * HOURLY_RATE;
  }
  
  // Calculate per-seat subtotal and tax
  const seatSubtotal = Number(price) / data.players;
  const seatTax = seatSubtotal * TAX_RATE;
  const seatTotal = seatSubtotal + seatTax;
  
  // Create booking with auto-generated invoices (one per seat)
  return prisma.booking.create({
    data: {
      roomId: data.roomId,
      userId: data.userId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      startTime: data.startTime,
      endTime,
      players: data.players,
      price: price,
      bookingStatus: 'BOOKED',
      paymentStatus: 'UNPAID',
      bookingSource: data.bookingSource || 'ONLINE',
      // Auto-create invoices for each seat
      invoices: {
        create: Array.from({ length: data.players }, (_, i) => ({
          seatIndex: i + 1,
          subtotal: seatSubtotal,
          tax: seatTax,
          totalAmount: seatTotal,
          status: 'UNPAID',
        })),
      },
    },
    include: { invoices: true },
  });
}

export interface PaginatedBookings {
  bookings: Booking[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListBookingsOptions {
  page?: number;
  limit?: number;
  sortBy?: 'startTime' | 'createdAt';
  order?: 'asc' | 'desc';
  updatedAfter?: string; // ISO timestamp for incremental sync
  startDate?: string; // ISO timestamp for date range filter
  endDate?: string; // ISO timestamp for date range filter
}

export async function listBookings(options?: ListBookingsOptions): Promise<PaginatedBookings> {
  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const sortBy = options?.sortBy || 'startTime';
  const order = options?.order || 'desc';
  const updatedAfter = options?.updatedAfter;
  const startDate = options?.startDate;
  const endDate = options?.endDate;

  const skip = (page - 1) * limit;
  
  // Build where clause
  const where: any = {};
  
  // Incremental sync filter
  if (updatedAfter) {
    where.updatedAt = { gt: new Date(updatedAfter) };
  }
  
  // Date range filter (for POS dashboard)
  if (startDate || endDate) {
    where.startTime = {};
    if (startDate) {
      where.startTime.gte = new Date(startDate);
    }
    if (endDate) {
      where.startTime.lte = new Date(endDate);
    }
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: order },
    }),
    prisma.booking.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    bookings,
    total,
    page,
    limit,
    totalPages,
  };
}

export async function listUserBookings(userId: string): Promise<Booking[]> {
  return prisma.booking.findMany({ where: { userId }, orderBy: { startTime: 'asc' } });
}

// List bookings for a specific room that intersect a given time range
export async function listRoomBookingsBetween(
  roomId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<Booking[]> {
  return prisma.booking.findMany({
    where: {
      roomId,
      // overlap condition: booking.start < rangeEnd AND booking.end > rangeStart
      startTime: { lt: rangeEnd },
      endTime: { gt: rangeStart },
      bookingStatus: { not: 'CANCELLED' },
    },
    orderBy: { startTime: 'asc' },
  });
}

export async function getBooking(id: string): Promise<Booking | null> {
  return prisma.booking.findUnique({ where: { id } });
}

export async function cancelBooking(id: string): Promise<Booking> {
  // Only allow cancellation from BOOKED state
  return prisma.booking.update({
    where: { id },
    data: { bookingStatus: 'CANCELLED' },
  });
}

export async function completeBooking(id: string): Promise<Booking> {
  return prisma.booking.update({
    where: { id },
    data: {
      bookingStatus: 'COMPLETED',
      completedAt: new Date(),
    },
  });
}

export async function markBookingExpired(id: string): Promise<Booking> {
  return prisma.booking.update({
    where: { id },
    data: {
      bookingStatus: 'EXPIRED',
    },
  });
}

export async function updateBookingStatus(
  id: string,
  bookingStatus: 'BOOKED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED'
): Promise<Booking> {
  return prisma.booking.update({
    where: { id },
    data: { bookingStatus },
  });
}

// Update payment status (marks booking as PAID when all invoices paid)
export interface UpdatePaymentStatusInput {
  paymentStatus: 'UNPAID' | 'PAID';
  paidAt?: Date;
}

export async function updatePaymentStatus(
  id: string,
  data: UpdatePaymentStatusInput
): Promise<Booking> {
  return prisma.booking.update({
    where: { id },
    data: {
      paymentStatus: data.paymentStatus,
      paidAt: data.paidAt,
    },
  });
}
