-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_menuItemId_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customItemName" TEXT,
ADD COLUMN     "customItemPrice" DECIMAL(10,2),
ALTER COLUMN "menuItemId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
