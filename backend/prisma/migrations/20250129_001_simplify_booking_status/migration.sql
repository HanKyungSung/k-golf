-- Simplify booking status model
-- Migration: Rename CONFIRMED→BOOKED, add EXPIRED, remove BILLED, create Invoice table

-- 1. Update existing CONFIRMED bookings to BOOKED
UPDATE "Booking" 
  SET "bookingStatus" = 'BOOKED'
  WHERE "bookingStatus" = 'CONFIRMED';

-- 2. Handle any BILLED payments (convert to PAID)
UPDATE "Booking" 
  SET "paymentStatus" = 'PAID'
  WHERE "paymentStatus" = 'BILLED';

-- 3. Remove billedAt column (no longer needed)
ALTER TABLE "Booking" DROP COLUMN IF EXISTS "billedAt";

-- 4. Add completedAt column (track when booking was marked complete)
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMPTZ;

-- 5. Create Invoice table for per-seat invoices
CREATE TABLE IF NOT EXISTS "Invoice" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "bookingId" TEXT NOT NULL REFERENCES "Booking"("id") ON DELETE CASCADE,
  "seatIndex" INT NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'UNPAID',
  "paymentMethod" VARCHAR(50),
  "paidAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create indices for Invoice
CREATE INDEX IF NOT EXISTS "idx_invoice_bookingid" ON "Invoice"("bookingId");
CREATE INDEX IF NOT EXISTS "idx_invoice_status" ON "Invoice"("status");
CREATE INDEX IF NOT EXISTS "idx_invoice_paidat" ON "Invoice"("paidAt");
