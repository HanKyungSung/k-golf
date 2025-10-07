/*
  Warnings:

  - Added the required column `customerName` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerPhone` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `User` required. This step will fail if there are existing NULL values in that column.

*/

-- Step 1: Add columns with temporary defaults
ALTER TABLE "User" 
  ADD COLUMN "phone" TEXT DEFAULT 'N/A',
  ALTER COLUMN "name" SET DEFAULT 'Unknown';

-- Step 2: Update existing NULL names
UPDATE "User" SET "name" = 'Unknown' WHERE "name" IS NULL;

-- Step 3: Update existing users with placeholder phone
UPDATE "User" SET "phone" = 'N/A' WHERE "phone" IS NULL OR "phone" = '';

-- Step 4: Make name and phone required (remove defaults)
ALTER TABLE "User" 
  ALTER COLUMN "name" SET NOT NULL,
  ALTER COLUMN "name" DROP DEFAULT,
  ALTER COLUMN "phone" SET NOT NULL,
  ALTER COLUMN "phone" DROP DEFAULT;

-- Step 5: Add Booking columns with temporary defaults
ALTER TABLE "Booking" 
  ADD COLUMN "customerName" TEXT DEFAULT 'Unknown',
  ADD COLUMN "customerPhone" TEXT DEFAULT 'N/A';

-- Step 6: Populate customerName and customerPhone from User table for existing bookings
UPDATE "Booking" b
SET 
  "customerName" = COALESCE(u.name, 'Unknown'),
  "customerPhone" = COALESCE(u.phone, 'N/A')
FROM "User" u
WHERE b."userId" = u.id;

-- Step 7: Make Booking customer fields required (remove defaults)
ALTER TABLE "Booking"
  ALTER COLUMN "customerName" SET NOT NULL,
  ALTER COLUMN "customerName" DROP DEFAULT,
  ALTER COLUMN "customerPhone" SET NOT NULL,
  ALTER COLUMN "customerPhone" DROP DEFAULT;

