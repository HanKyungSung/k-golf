# Booking Status & Invoice System - Implementation Plan

> **Date:** November 30, 2025
> **Scope:** Simplified booking lifecycle + Full POS Invoice system with per-seat billing
> **Status:** Planning Phase

---

## 📊 Implementation Scope Analysis

### Current State
- ✅ Booking system exists (CONFIRMED/COMPLETED/CANCELLED)
- ✅ Payment status partially implemented (UNPAID/BILLED/PAID)
- ✅ MenuItem table exists
- ✅ Seed script exists
- ⚠️ Invoice model exists but incomplete
- ❌ Order model doesn't exist
- ❌ No invoice/order creation logic

### Target State
- ✅ Booking: BOOKED/COMPLETED/CANCELLED/EXPIRED
- ✅ Payment: UNPAID/PAID (only)
- ✅ Invoices: Per-seat with line items from orders
- ✅ Orders: Menu items ordered, tracked per seat
- ✅ Full POS workflow: Order → Invoice → Payment

---

## 🎯 Work Breakdown

### 1️⃣ DATABASE SCHEMA CHANGES (Estimated: 2-3 hours)

#### 1.1 Update Booking Model
```
CHANGES:
  ✓ Rename field: price → basePrice (for clarity)
  ✓ Add field: orders: Order[] (relation)
  ✓ Keep: invoices: Invoice[]
  ✓ Keep: bookingStatus, paymentStatus, paidAt, completedAt
```
**Files:** `backend/prisma/schema.prisma`
**Impact:** 1 file

#### 1.2 Create Order Model (NEW)
```prisma
model Order {
  id              String    @id @default(uuid())
  booking         Booking   @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  bookingId       String
  menuItem        MenuItem  @relation(fields: [menuItemId], references: [id])
  menuItemId      String
  seatIndex       Int?      // null = shared order, 1-4 = seat number
  quantity        Int
  unitPrice       Decimal   @db.Decimal(10, 2)
  totalPrice      Decimal   @db.Decimal(10, 2)
  createdAt       DateTime  @default(now()) @db.Timestamptz
  
  @@index([bookingId])
  @@index([seatIndex])
}
```
**Files:** `backend/prisma/schema.prisma`
**Impact:** 1 file

#### 1.3 Simplify Invoice Model
```
CHANGES:
  ✗ Remove: customerName (not needed)
  ✗ Remove: refundedAt (skip for now)
  ✗ Remove: refundReason (skip for now)
  ✗ Remove: notes (skip for now)
  ✗ Remove: recordedBy (skip for now)
  ✓ Keep: All payment fields
  ✓ Add: orders: Order[] relation (to calculate totals)
  ✓ Add: subtotal, tax, tip, totalAmount (for display)
```
**Files:** `backend/prisma/schema.prisma`
**Impact:** 1 file

#### 1.4 Update MenuItem Model
```
CHANGES:
  ✓ Add: orders: Order[] (relation)
  ✓ Keep: existing fields
```
**Files:** `backend/prisma/schema.prisma`
**Impact:** 1 file

### 2️⃣ MIGRATION CREATION (Estimated: 1 hour)

**File:** `backend/prisma/migrations/20251130_add_orders_and_simplify_invoices/migration.sql`

```sql
-- 1. Create Order table
CREATE TABLE "Order" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bookingId" UUID NOT NULL REFERENCES "Booking"("id") ON DELETE CASCADE,
  "menuItemId" UUID NOT NULL REFERENCES "MenuItem"("id"),
  "seatIndex" INT,
  "quantity" INT NOT NULL,
  "unitPrice" DECIMAL(10,2) NOT NULL,
  "totalPrice" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "Order_bookingId_idx" ON "Order"("bookingId");
CREATE INDEX "Order_seatIndex_idx" ON "Order"("seatIndex");

-- 2. Rename Booking.price → basePrice
ALTER TABLE "Booking" RENAME COLUMN "price" TO "basePrice";

-- 3. Drop old Invoice fields
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "customerName" CASCADE;
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "refundedAt";
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "refundReason";
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "notes";
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "recordedBy";

-- 4. Add new Invoice fields for totals
ALTER TABLE "Invoice" ADD COLUMN "subtotal" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "tax" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "tip" DECIMAL(10,2);
ALTER TABLE "Invoice" ADD COLUMN "totalAmount" DECIMAL(10,2) DEFAULT 0;

-- 5. Update existing bookingStatus from CONFIRMED → BOOKED
UPDATE "Booking" SET "bookingStatus" = 'BOOKED' WHERE "bookingStatus" = 'CONFIRMED';
```

**Impact:** Database restructuring + data migration

---

### 3️⃣ BACKEND REPOSITORY CHANGES (Estimated: 4-6 hours)

#### 3.1 Update BookingRepo
**File:** `backend/src/repositories/bookingRepo.ts`

```typescript
// NEW functions needed:
export async function createInvoicesForBooking(bookingId: string)
  // Creates N invoices (1 per seat) with base booking fee as line items

export async function updateBookingStatusToBOOKED()
  // Handle transition from CONFIRMED → BOOKED

export async function markBookingExpired(id: string)
  // Set bookingStatus = EXPIRED

export async function completeBooking(id: string)
  // Mark as COMPLETED, update completedAt

// EXISTING functions to UPDATE:
export async function createBooking()
  // Now creates invoices automatically
  // Uses basePrice instead of price

export async function cancelBooking()
  // Can cancel BOOKED bookings only
```

#### 3.2 Create OrderRepo (NEW)
**File:** `backend/src/repositories/orderRepo.ts`

```typescript
// NEW functions:
export async function createOrder(data: CreateOrderInput)
  // Create menu order, update corresponding invoice

export async function deleteOrder(id: string)
  // Remove order, recalculate invoice totals

export async function getOrdersByBooking(bookingId: string)
  // Get all orders for a booking

export async function getOrdersBySeat(bookingId: string, seatIndex: number)
  // Get orders for specific seat

export async function recalculateInvoiceTotals(invoiceId: string)
  // Sum orders for seat, apply tax, update invoice
```

#### 3.3 Create InvoiceRepo (NEW)
**File:** `backend/src/repositories/invoiceRepo.ts`

```typescript
// NEW functions:
export async function getInvoicesBySeat(bookingId: string, seatIndex: number)
  // Get invoice for specific seat

export async function getAllInvoices(bookingId: string)
  // Get all invoices for booking

export async function markInvoicePaid(invoiceId: string, paymentMethod: string, tip?: Decimal)
  // Mark invoice as PAID, check if all paid → update booking

export async function checkAllInvoicesPaid(bookingId: string)
  // Returns boolean if all invoices PAID
  // If yes, update Booking.paymentStatus = PAID
```

**Files:** 3 new/updated files

---

### 4️⃣ BACKEND ROUTES CHANGES (Estimated: 3-4 hours)

**File:** `backend/src/routes/booking.ts` (major refactor)

```typescript
// EXISTING endpoints to UPDATE:
POST /api/bookings
  // Now creates invoices automatically for each seat
  // Uses basePrice instead of price

PATCH /api/bookings/:id/cancel
  // Only cancels BOOKED status
  // Cannot cancel COMPLETED

PATCH /api/bookings/:id/complete
  // NEW: Staff marks booking complete
  // Requires: all invoices PAID

// NEW endpoints to ADD:
POST /api/bookings/:bookingId/orders
  {
    menuItemId: string,
    seatIndex: number,
    quantity: number
  }
  // Create order, update invoice

DELETE /api/bookings/orders/:orderId
  // Remove order, recalculate invoice

GET /api/bookings/:bookingId/invoices
  // Get all invoices for booking with line items

PATCH /api/invoices/:invoiceId/pay
  {
    paymentMethod: 'CARD' | 'CASH',
    tip?: number
  }
  // Mark invoice paid, check if all paid

GET /api/bookings/:bookingId/payment-status
  // Summary: total paid, remaining, per-seat breakdown
```

**Impact:** 1 file, multiple endpoint changes

---

### 5️⃣ FRONTEND CHANGES (Estimated: 6-8 hours)

#### 5.1 Update Booking Creation
**File:** `frontend/src/pages/...`
- Update basePrice vs price naming
- Auto-generate invoices on creation

#### 5.2 Create Orders Component (NEW)
**File:** `frontend/src/components/OrderForm.tsx`
- UI to select menu items per seat
- Add to cart per seat
- Show running total

#### 5.3 Create Invoice Display Component (NEW)
**File:** `frontend/src/components/InvoiceDisplay.tsx`
- Show per-seat invoice breakdown
- Display line items (booking fee + orders)
- Show subtotal, tax, total

#### 5.4 Create Payment Component (NEW)
**File:** `frontend/src/components/PaymentForm.tsx`
- Accept payment per invoice
- Allow tip entry
- Mark as paid
- Show payment status

#### 5.5 Update Dashboard
**File:** `frontend/src/pages/pos/dashboard.tsx`
- Show invoices per seat
- Show which seats paid/unpaid
- Add order buttons
- Add payment buttons
- Show completion status

**Impact:** 5+ new/updated files

---

### 6️⃣ DATABASE SEED UPDATES (Estimated: 1-2 hours)

**File:** `backend/prisma/seed.ts`

```typescript
// NEW seed data:
1. Create sample orders for test bookings
2. Create sample invoices with line items
3. Show mix of paid/unpaid invoices
4. Populate different payment methods

// EXISTING seed updates:
1. Update all bookings to use basePrice naming
2. Create invoices for all seeded bookings
3. Update test data to use BOOKED instead of CONFIRMED
```

**Impact:** 1 file, significant additions

---

### 7️⃣ TESTS & VALIDATION (Estimated: 3-4 hours)

**Files to create/update:**
1. `backend/tests/unit/invoiceRepo.test.ts` - NEW
2. `backend/tests/unit/orderRepo.test.ts` - NEW
3. `backend/tests/e2e/booking-workflow.test.ts` - UPDATE
4. `backend/tests/e2e/payment-workflow.test.ts` - NEW

**Test scenarios:**
- Create booking → auto-generate invoices
- Add order → invoice updates
- Mark invoice paid → check booking status
- Mark all paid → booking marked PAID
- Complete booking → requires all paid
- Cancel booking → only BOOKED status
- Expire booking → after 30 days

---

## 📈 Summary Breakdown

| Component | Files | Complexity | Hours | Notes |
|-----------|-------|-----------|-------|-------|
| **Database Schema** | 1 | High | 2-3 | New Order model, rename fields |
| **Migration** | 1 | Medium | 1 | Schema restructuring |
| **Backend Repos** | 3 | High | 4-6 | Complex logic for totals |
| **Backend Routes** | 1 | High | 3-4 | Multiple new endpoints |
| **Frontend** | 5+ | High | 6-8 | New UI components |
| **Seed & Tests** | 6 | Medium | 4-6 | Data + validation |
| **Documentation** | 1 | Low | 1 | Update README |
| **TOTAL** | **18-20** | **High** | **22-32 hours** | Full implementation |

---

## 🚀 Recommended Implementation Order

### Phase 1: Foundation (4-5 hours)
1. ✅ Update schema (Booking, Order, Invoice)
2. ✅ Create migration
3. ✅ Run Prisma generate

### Phase 2: Backend (8-10 hours)
1. ✅ Create repos (Order, Invoice, update Booking)
2. ✅ Implement business logic
3. ✅ Create/update routes

### Phase 3: Database (1-2 hours)
1. ✅ Re-seed database with new schema

### Phase 4: Frontend (6-8 hours)
1. ✅ Build components
2. ✅ Integrate with APIs

### Phase 5: Testing (3-4 hours)
1. ✅ Unit tests
2. ✅ E2E tests
3. ✅ Manual testing

---

## ⚠️ Risk Areas

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Migration breaks existing bookings | High | Backup DB, test migration locally first |
| Invoice total calculation errors | High | Comprehensive unit tests |
| Incomplete payment handling | Medium | Clear state machine validation |
| Performance with order queries | Medium | Add proper indexes |
| Frontend state sync issues | Medium | Redux/Context for invoice state |

---

## ✅ Success Criteria

- [ ] All bookings auto-generate invoices on creation
- [ ] Orders properly track per-seat charges
- [ ] Invoices correctly sum orders + tax
- [ ] Payment marking updates booking status
- [ ] Cannot complete without all invoices paid
- [ ] Dashboard shows payment breakdown
- [ ] Seed script creates realistic test data
- [ ] All tests pass
- [ ] No breaking changes to existing APIs

---

## 📝 Questions Before Starting

1. **Tax calculation:** Fixed percentage or per-item? (Currently: global setting)
2. **Shared orders:** Can one order apply to multiple seats?
3. **Partial payments:** Allow incomplete seat payment and continue?
4. **Refunds:** Handle in Phase 2 or later?
5. **Menu items:** Should certain items be excluded from invoices?
6. **Expiration job:** How often run? (Daily? On-demand?)

---

## 🔗 Related Files

- Schema: `backend/prisma/schema.prisma`
- Migrations: `backend/prisma/migrations/`
- Repos: `backend/src/repositories/`
- Routes: `backend/src/routes/booking.ts`
- Seed: `backend/prisma/seed.ts`
- Frontend: `frontend/src/pages/pos/`
- Tests: `backend/tests/`
