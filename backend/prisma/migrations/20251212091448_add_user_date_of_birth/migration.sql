/*
  Warnings:

  - You are about to drop the column `paymentMethod` on the `Booking` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_bookingId_fkey";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "paymentMethod",
ALTER COLUMN "bookingStatus" SET DEFAULT 'BOOKED';

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "status" SET DATA TYPE TEXT,
ALTER COLUMN "paymentMethod" SET DATA TYPE TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "subtotal" DROP DEFAULT,
ALTER COLUMN "tax" DROP DEFAULT,
ALTER COLUMN "totalAmount" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dateOfBirth" DATE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "Invoice_bookingId_seatIndex_unique" RENAME TO "Invoice_bookingId_seatIndex_key";

-- RenameIndex
ALTER INDEX "idx_invoice_bookingid" RENAME TO "Invoice_bookingId_idx";

-- RenameIndex
ALTER INDEX "idx_invoice_paidat" RENAME TO "Invoice_paidAt_idx";

-- RenameIndex
ALTER INDEX "idx_invoice_status" RENAME TO "Invoice_status_idx";
