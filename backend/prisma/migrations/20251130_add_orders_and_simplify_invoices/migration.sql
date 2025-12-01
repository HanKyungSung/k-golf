-- CreateTable Order
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "seatIndex" INTEGER,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- Add missing columns to Invoice
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "tax" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "tip" DECIMAL(10,2);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Drop unused Invoice columns if they exist
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "customerName" CASCADE;
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "refundedAt" CASCADE;
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "refundReason" CASCADE;
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "notes" CASCADE;
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "recordedBy" CASCADE;

-- Update booking status CONFIRMED → BOOKED
UPDATE "Booking" SET "bookingStatus" = 'BOOKED' WHERE "bookingStatus" = 'CONFIRMED';

-- CreateIndex
CREATE INDEX "Order_bookingId_idx" ON "Order"("bookingId");
CREATE INDEX "Order_seatIndex_idx" ON "Order"("seatIndex");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add unique constraint for Invoice (one per seat per booking)
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_bookingId_seatIndex_unique" UNIQUE("bookingId", "seatIndex");
