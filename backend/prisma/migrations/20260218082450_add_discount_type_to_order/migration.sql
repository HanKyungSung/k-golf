/*
  Warnings:

  - You are about to drop the column `closeMinutes` on the `Room` table. All the data in the column will be lost.
  - You are about to drop the column `openMinutes` on the `Room` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "discountType" TEXT;

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "closeMinutes",
DROP COLUMN "openMinutes";
