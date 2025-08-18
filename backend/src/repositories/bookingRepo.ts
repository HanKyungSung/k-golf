import { PrismaClient, Booking } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateBookingInput {
  roomId: string;
  userId: string; // placeholder until auth implemented
  startTime: Date;
  players: number;
  priceCents: number;
}

// Compute endTime: 1 hour per player
function computeEnd(startTime: Date, players: number): Date {
  return new Date(startTime.getTime() + players * 60 * 60 * 1000);
}

export async function findConflict(roomId: string, startTime: Date) {
  return prisma.booking.findFirst({ where: { roomId, startTime } });
}

export async function createBooking(data: CreateBookingInput): Promise<Booking> {
  const endTime = computeEnd(data.startTime, data.players);
  return prisma.booking.create({
    data: {
      roomId: data.roomId,
      userId: data.userId,
      startTime: data.startTime,
      endTime,
      players: data.players,
      priceCents: data.priceCents,
    },
  });
}

export async function listBookings(): Promise<Booking[]> {
  return prisma.booking.findMany({ orderBy: { startTime: 'asc' } });
}

export async function listUserBookings(userId: string): Promise<Booking[]> {
  return prisma.booking.findMany({ where: { userId }, orderBy: { startTime: 'asc' } });
}

export async function getBooking(id: string): Promise<Booking | null> {
  return prisma.booking.findUnique({ where: { id } });
}

export async function cancelBooking(id: string): Promise<Booking> {
  return prisma.booking.update({ where: { id }, data: { status: 'CANCELED' } });
}
