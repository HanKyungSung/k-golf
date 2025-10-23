-- CreateEnum
CREATE TYPE "MenuCategory" AS ENUM ('HOURS', 'FOOD', 'DRINKS', 'APPETIZERS', 'DESSERTS');

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "category" "MenuCategory" NOT NULL,
    "hours" INTEGER,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuItem_category_sortOrder_idx" ON "MenuItem"("category", "sortOrder");

-- CreateIndex
CREATE INDEX "MenuItem_available_idx" ON "MenuItem"("available");
