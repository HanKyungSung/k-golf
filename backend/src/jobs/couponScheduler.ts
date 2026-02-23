import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { createCoupon } from '../services/couponService';
import { sendCouponEmail } from '../services/emailService';

/**
 * Daily coupon scheduler — runs at 8:00 AM Atlantic time
 * Checks for:
 *   1. Birthday coupons (dateOfBirth month/day matches today)
 *   2. Loyalty coupons (users who hit 10 completed bookings milestone)
 */
export function startCouponScheduler() {
  // 8:00 AM Atlantic = 12:00 PM UTC (AST, UTC-4) or 11:00 AM UTC (ADT, UTC-3)
  // Use cron with timezone support
  cron.schedule('0 8 * * *', async () => {
    console.log('[coupon-scheduler] Running daily coupon check...');
    try {
      await checkBirthdays();
      await checkLoyaltyMilestones();
      console.log('[coupon-scheduler] Daily check complete.');
    } catch (err) {
      console.error('[coupon-scheduler] Error:', err);
    }
  }, {
    timezone: 'America/Halifax',
  });

  console.log('[coupon-scheduler] Scheduled daily coupon check at 8:00 AM Atlantic');
}

/**
 * Check for users whose birthday is today and haven't received
 * a BIRTHDAY coupon this year yet.
 */
async function checkBirthdays() {
  const now = new Date();
  // Get current date in Atlantic timezone
  const atlanticNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Halifax' }));
  const todayMonth = atlanticNow.getMonth() + 1; // 1-indexed
  const todayDay = atlanticNow.getDate();
  const thisYear = atlanticNow.getFullYear();

  // Find the BIRTHDAY coupon type
  const birthdayType = await prisma.couponType.findUnique({ where: { name: 'BIRTHDAY' } });
  if (!birthdayType || !birthdayType.active) {
    console.log('[coupon-scheduler] BIRTHDAY type not found or inactive, skipping.');
    return;
  }

  // Find users whose dateOfBirth month/day matches today
  // Using raw query for date part extraction
  const birthdayUsers = await prisma.$queryRaw<Array<{ id: string; name: string; email: string | null }>>`
    SELECT id, name, email FROM "User"
    WHERE "dateOfBirth" IS NOT NULL
      AND EXTRACT(MONTH FROM "dateOfBirth") = ${todayMonth}
      AND EXTRACT(DAY FROM "dateOfBirth") = ${todayDay}
      AND id NOT IN (
        SELECT "userId" FROM "Coupon"
        WHERE "couponTypeId" = ${birthdayType.id}
          AND EXTRACT(YEAR FROM "createdAt" AT TIME ZONE 'America/Halifax') = ${thisYear}
      )
  `;

  console.log(`[coupon-scheduler] Found ${birthdayUsers.length} birthday(s) today.`);

  for (const user of birthdayUsers) {
    try {
      const coupon = await createCoupon({
        userId: user.id,
        couponTypeId: birthdayType.id,
      });

      // Send email if user has email
      if (user.email) {
        await sendCouponEmail({
          to: user.email,
          customerName: user.name,
          couponCode: coupon.code,
          couponType: 'BIRTHDAY',
          description: coupon.description,
          discountAmount: Number(coupon.discountAmount),
        });
      }

      console.log(`[coupon-scheduler] Birthday coupon ${coupon.code} created for ${user.name}`);
    } catch (err) {
      console.error(`[coupon-scheduler] Failed to create birthday coupon for user ${user.id}:`, err);
    }
  }
}

/**
 * Check for users who have hit the 10-booking loyalty milestone
 * and haven't received a LOYALTY coupon for that milestone yet.
 */
async function checkLoyaltyMilestones() {
  const MILESTONE = 10;

  const loyaltyType = await prisma.couponType.findUnique({ where: { name: 'LOYALTY' } });
  if (!loyaltyType || !loyaltyType.active) {
    console.log('[coupon-scheduler] LOYALTY type not found or inactive, skipping.');
    return;
  }

  // Find users with >= MILESTONE completed bookings who don't have a loyalty coupon for this milestone
  const eligibleUsers = await prisma.$queryRaw<Array<{ id: string; name: string; email: string | null; completed: bigint }>>`
    SELECT u.id, u.name, u.email, COUNT(b.id) as completed
    FROM "User" u
    JOIN "Booking" b ON b."userId" = u.id
    WHERE b."bookingStatus" = 'COMPLETED'
    GROUP BY u.id
    HAVING COUNT(b.id) >= ${MILESTONE}
      AND u.id NOT IN (
        SELECT "userId" FROM "Coupon"
        WHERE "couponTypeId" = ${loyaltyType.id}
          AND milestone = ${MILESTONE}
      )
  `;

  console.log(`[coupon-scheduler] Found ${eligibleUsers.length} loyalty milestone(s).`);

  for (const user of eligibleUsers) {
    try {
      const coupon = await createCoupon({
        userId: user.id,
        couponTypeId: loyaltyType.id,
        milestone: MILESTONE,
      });

      if (user.email) {
        await sendCouponEmail({
          to: user.email,
          customerName: user.name,
          couponCode: coupon.code,
          couponType: 'LOYALTY',
          description: coupon.description,
          discountAmount: Number(coupon.discountAmount),
        });
      }

      console.log(`[coupon-scheduler] Loyalty coupon ${coupon.code} created for ${user.name} (${Number(user.completed)} bookings)`);
    } catch (err) {
      console.error(`[coupon-scheduler] Failed to create loyalty coupon for user ${user.id}:`, err);
    }
  }
}
