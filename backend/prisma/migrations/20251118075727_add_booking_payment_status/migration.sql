/*
  Warnings:

  - You are about to drop the column `status` on the `Booking` table. All the data in the column will be lost.

*/
-- AlterTable (made idempotent - safe to run even if already applied)
ALTER TABLE "Booking" DROP COLUMN IF EXISTS "status";
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "billedAt" TIMESTAMPTZ;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "bookingStatus" TEXT NOT NULL DEFAULT 'CONFIRMED';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMPTZ;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "tipAmount" DECIMAL(10,2);
