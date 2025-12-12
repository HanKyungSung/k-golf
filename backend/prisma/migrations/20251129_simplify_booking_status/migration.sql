-- Simplify booking status model
-- Migration: Add new columns and create Invoice table

-- 1. Add new columns if they don't exist
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "bookingStatus" VARCHAR(50) NOT NULL DEFAULT 'BOOKED';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paymentStatus" VARCHAR(50) NOT NULL DEFAULT 'UNPAID';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMPTZ;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMPTZ;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "tipAmount" DECIMAL(10,2);

-- 2. Migrate data from old 'status' column to 'bookingStatus' (if old column exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Booking' AND column_name='status') THEN
    UPDATE "Booking" SET "bookingStatus" = 
      CASE 
        WHEN "status" = 'CONFIRMED' THEN 'BOOKED'
        WHEN "status" = 'COMPLETED' THEN 'COMPLETED'
        WHEN "status" = 'CANCELLED' THEN 'CANCELLED'
        ELSE "status"
      END
    WHERE "bookingStatus" = 'BOOKED'; -- Only update rows that still have default value
    
    -- Drop old status column after migration
    ALTER TABLE "Booking" DROP COLUMN IF EXISTS "status";
  END IF;
END $$;

-- 3. Remove billedAt column if it exists
ALTER TABLE "Booking" DROP COLUMN IF EXISTS "billedAt";

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
