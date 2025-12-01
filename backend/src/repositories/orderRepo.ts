import { PrismaClient, Order } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateOrderInput {
  bookingId: string;
  menuItemId: string;
  seatIndex?: number; // Optional: null means shared order
  quantity: number;
  unitPrice: number | string;
}

export async function createOrder(data: CreateOrderInput): Promise<Order> {
  const unitPrice = Number(data.unitPrice);
  const totalPrice = unitPrice * data.quantity;

  return prisma.order.create({
    data: {
      bookingId: data.bookingId,
      menuItemId: data.menuItemId,
      seatIndex: data.seatIndex,
      quantity: data.quantity,
      unitPrice: unitPrice,
      totalPrice: totalPrice,
    },
  });
}

export async function deleteOrder(id: string): Promise<Order> {
  return prisma.order.delete({
    where: { id },
  });
}

export async function getOrder(id: string): Promise<Order | null> {
  return prisma.order.findUnique({
    where: { id },
    include: {
      menuItem: true,
    },
  });
}

export async function getOrdersByBooking(bookingId: string): Promise<Order[]> {
  return prisma.order.findMany({
    where: { bookingId },
    include: {
      menuItem: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getOrdersBySeat(bookingId: string, seatIndex: number): Promise<Order[]> {
  return prisma.order.findMany({
    where: {
      bookingId,
      seatIndex,
    },
    include: {
      menuItem: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getOrdersForInvoice(bookingId: string, seatIndex: number): Promise<Order[]> {
  // Get all orders for a specific seat
  return prisma.order.findMany({
    where: {
      bookingId,
      seatIndex,
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function deleteOrdersByBooking(bookingId: string): Promise<number> {
  const result = await prisma.order.deleteMany({
    where: { bookingId },
  });
  return result.count;
}
