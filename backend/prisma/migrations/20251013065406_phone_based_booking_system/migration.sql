/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/

-- Step 1: Handle existing users with empty or duplicate phone numbers
-- Add temporary suffix to duplicate/empty phone numbers to make them unique
UPDATE "User" 
SET phone = COALESCE(NULLIF(phone, ''), 'temp_') || id 
WHERE phone = '' OR phone IS NULL OR phone IN (
  SELECT phone 
  FROM "User" 
  GROUP BY phone 
  HAVING COUNT(*) > 1
);

-- Step 2: Drop foreign key constraint (will be recreated as nullable)
-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_userId_fkey";

-- Step 3: Alter Booking table - add new columns and make userId nullable
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "bookingSource" VARCHAR(50) NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "isGuestBooking" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "userId" DROP NOT NULL;

-- Step 4: Alter User table - add new columns and make email nullable
-- Step 4: Alter User table - add new columns and make email nullable
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneVerifiedAt" TIMESTAMPTZ,
ADD COLUMN     "registeredBy" TEXT,
ADD COLUMN     "registrationSource" VARCHAR(50) NOT NULL DEFAULT 'ONLINE',
ALTER COLUMN "email" DROP NOT NULL;

-- Step 5: Create PhoneVerificationToken table (Phase 2 preparation)
-- CreateTable
CREATE TABLE "PhoneVerificationToken" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneVerificationToken_pkey" PRIMARY KEY ("id")
);

-- Step 6: Create indexes for PhoneVerificationToken
-- CreateIndex
CREATE UNIQUE INDEX "PhoneVerificationToken_phone_key" ON "PhoneVerificationToken"("phone");

-- CreateIndex
CREATE INDEX "PhoneVerificationToken_expiresAt_idx" ON "PhoneVerificationToken"("expiresAt");

-- CreateIndex
CREATE INDEX "PhoneVerificationToken_phone_expiresAt_idx" ON "PhoneVerificationToken"("phone", "expiresAt");

-- Step 7: Create indexes for Booking table
-- CreateIndex
CREATE INDEX "Booking_customerPhone_idx" ON "Booking"("customerPhone");

-- CreateIndex
CREATE INDEX "Booking_bookingSource_idx" ON "Booking"("bookingSource");

-- Step 8: Create unique constraint on User.phone
-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- Step 9: Re-add foreign key constraints
-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
