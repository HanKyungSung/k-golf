-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'EXPIRED');

-- CreateTable
CREATE TABLE "CouponType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "defaultDescription" TEXT NOT NULL,
    "defaultAmount" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "couponTypeId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    "status" "CouponStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMPTZ,
    "redeemedAt" TIMESTAMPTZ,
    "redeemedBookingId" TEXT,
    "redeemedSeatNumber" INTEGER,
    "milestone" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CouponType_name_key" ON "CouponType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_userId_idx" ON "Coupon"("userId");

-- CreateIndex
CREATE INDEX "Coupon_status_idx" ON "Coupon"("status");

-- CreateIndex
CREATE INDEX "Coupon_couponTypeId_idx" ON "Coupon"("couponTypeId");

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_couponTypeId_fkey" FOREIGN KEY ("couponTypeId") REFERENCES "CouponType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_redeemedBookingId_fkey" FOREIGN KEY ("redeemedBookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
