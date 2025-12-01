-- Simplify booking status model
-- Migration: Rename CONFIRMED→BOOKED, add EXPIRED, remove BILLED, add BookingPayment for split payments

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

-- 5. Create BookingPayment table for split payments
CREATE TABLE IF NOT EXISTS "BookingPayment" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bookingId" UUID NOT NULL REFERENCES "Booking"("id") ON DELETE CASCADE,
  "customerName" VARCHAR(255) NOT NULL,
  "seatIndex" INT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "paymentMethod" VARCHAR(50),
  "paidAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create indices for BookingPayment
CREATE INDEX IF NOT EXISTS "idx_booking_payment_bookingid" ON "BookingPayment"("bookingId");
CREATE INDEX IF NOT EXISTS "idx_booking_payment_paidat" ON "BookingPayment"("paidAt");
