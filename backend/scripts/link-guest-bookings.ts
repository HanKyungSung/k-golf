/**
 * One-time script to link existing guest bookings to users based on phone number
 * 
 * Usage: npx tsx scripts/link-guest-bookings.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function linkGuestBookings() {
  console.log('[LINK] Starting guest booking linkage...');
  
  // Find all users with phone numbers
  const users = await prisma.user.findMany({
    select: {
      id: true,
      phone: true,
      name: true,
    },
  });
  
  console.log(`[LINK] Found ${users.length} users with phone numbers`);
  
  let totalLinked = 0;
  
  for (const user of users) {
    // Link guest bookings with matching phone number
    const result = await prisma.$executeRaw`
      UPDATE "Booking"
      SET "userId" = ${user.id}
      WHERE "customerPhone" = ${user.phone}
        AND "userId" IS NULL
    `;
    
    if (result > 0) {
      console.log(`[LINK] Linked ${result} guest bookings for user ${user.name} (${user.phone})`);
      totalLinked += result;
    }
  }
  
  console.log(`[LINK] ✅ Complete! Linked ${totalLinked} guest bookings to registered users`);
  
  // Show stats
  const stats = await prisma.booking.groupBy({
    by: ['userId'],
    _count: true,
  });
  
  const guestCount = stats.find(s => s.userId === null)?._count ?? 0;
  const registeredCount = stats.filter(s => s.userId !== null).reduce((sum, s) => sum + s._count, 0);
  
  console.log(`[LINK] Current state:`);
  console.log(`  - Guest bookings: ${guestCount}`);
  console.log(`  - Registered bookings: ${registeredCount}`);
}

linkGuestBookings()
  .catch((error) => {
    console.error('[LINK] Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
