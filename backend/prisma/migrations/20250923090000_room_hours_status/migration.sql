-- Migration: add room operating hours and status enum
-- Run via: npx prisma migrate deploy (in deploy) or prisma migrate dev locally

DO $$ BEGIN
    CREATE TYPE "RoomStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Room"
    ADD COLUMN IF NOT EXISTS "openMinutes" INTEGER NOT NULL DEFAULT 540,
    ADD COLUMN IF NOT EXISTS "closeMinutes" INTEGER NOT NULL DEFAULT 1140,
    ADD COLUMN IF NOT EXISTS "status" "RoomStatus" NOT NULL DEFAULT 'ACTIVE';
