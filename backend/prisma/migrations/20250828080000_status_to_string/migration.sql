-- Switch Booking.status from enum to TEXT and drop the enum type
-- Safe for existing values: PENDING, CONFIRMED, CANCELED will cast to text

BEGIN;

-- 1) Alter column type to TEXT (keep values)
ALTER TABLE "Booking" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Booking" ALTER COLUMN "status" TYPE TEXT USING ("status"::text);
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';

-- 2) Drop enum type if no longer used anywhere
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'BookingStatus'
  ) THEN
    -- Check if any table still uses the enum
    IF NOT EXISTS (
      SELECT 1
      FROM pg_attribute a
      JOIN pg_class c ON a.attrelid = c.oid
      JOIN pg_type ty ON a.atttypid = ty.oid
      WHERE ty.typname = 'BookingStatus'
        AND c.relkind IN ('r','p')
    ) THEN
      DROP TYPE "BookingStatus";
    END IF;
  END IF;
END $$;

COMMIT;
