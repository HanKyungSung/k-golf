/*
  Warnings:

  - You are about to drop the column `status` on the `Booking` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "status",
ADD COLUMN     "billedAt" TIMESTAMPTZ,
ADD COLUMN     "bookingStatus" TEXT NOT NULL DEFAULT 'CONFIRMED',
ADD COLUMN     "paidAt" TIMESTAMPTZ,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "tipAmount" DECIMAL(10,2);
