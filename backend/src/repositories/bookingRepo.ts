import { PrismaClient, Booking } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateBookingInput {
  roomId: string;
  userId: string; // placeholder until auth implemented
  startTime: Date;
  players: number;
  hours: number;
  price: number | string; // stored as Decimal(10,2) in DB
}

// Compute endTime: independent hours selection
function computeEnd(startTime: Date, hours: number): Date {
  return new Date(startTime.getTime() + hours * 60 * 60 * 1000);
}

export async function findConflict(roomId: string, startTime: Date, endTime: Date) {
  return prisma.booking.findFirst({
    where: {
      roomId,
      status: { not: 'CANCELED' },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    orderBy: { startTime: 'asc' },
  });
}

export async function createBooking(data: CreateBookingInput): Promise<Booking> {
  const endTime = computeEnd(data.startTime, data.hours);
  // Cast prisma to any until Prisma client is regenerated with the new schema
  return (prisma as any).booking.create({
    data: {
      roomId: data.roomId,
      userId: data.userId,
      startTime: data.startTime,
      endTime,
      players: data.players,
      price: data.price,
    },
  });
}

export async function listBookings(): Promise<Booking[]> {
  return prisma.booking.findMany({ orderBy: { startTime: 'asc' } });
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
      status: { not: 'CANCELED' },
    },
    orderBy: { startTime: 'asc' },
  });
}

export async function getBooking(id: string): Promise<Booking | null> {
  return prisma.booking.findUnique({ where: { id } });
}

export async function cancelBooking(id: string): Promise<Booking> {
  return prisma.booking.update({ where: { id }, data: { status: 'CANCELED' } });
}
