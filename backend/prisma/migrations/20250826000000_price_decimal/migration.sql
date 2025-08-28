-- Migration: convert Booking.priceCents (INT) to price DECIMAL(10,2)
-- 1) Add new decimal column with default to allow backfill
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "price" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- 2) Backfill from priceCents when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Booking' AND column_name = 'priceCents'
  ) THEN
    UPDATE "Booking" SET "price" = ("priceCents"::numeric / 100.0)
    WHERE "price" = 0;
  END IF;
END$$;

-- 3) Drop default on price
ALTER TABLE "Booking" ALTER COLUMN "price" DROP DEFAULT;

-- 4) Drop legacy column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Booking' AND column_name = 'priceCents'
  ) THEN
    ALTER TABLE "Booking" DROP COLUMN "priceCents";
  END IF;
END$$;
