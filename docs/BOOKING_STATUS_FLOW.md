# Booking Status Flow - Simplified Model

> **Last Updated:** November 30, 2025
> **Status:** Phase 1.3.5 Complete - Database Seeding Ready, Frontend Components Next
> **Version:** 2.0 (Simplified from 1.0)

---

## Overview

This document defines the **simplified booking lifecycle** used in K-Golf POS system. The model separates **booking state** (lifecycle) from **payment state** (revenue tracking) and introduces **per-seat payment tracking** for split payments.

### Key Changes from v1.0
- ✅ `CONFIRMED` → `BOOKED` (more intuitive)
- ✅ Removed `BILLED` status (simplified payment to binary: UNPAID/PAID)
- ✅ Added `EXPIRED` status (auto cleanup for abandoned bookings)
- ✅ Split payment model (one line-item per customer/seat)
- ✅ Staff-only completion (no auto-completion)

---

## Table Relationships & ER Diagrams

### 📊 Simplified Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    K-GOLF POS - SIMPLIFIED SCHEMA                           │
│                  (Invoice uses Orders directly, no LineItems)                │
└─────────────────────────────────────────────────────────────────────────────┘


                              ┌──────────────┐
                              │    USER      │
                              │──────────────│
                              │ id (PK)      │
                              │ phone        │
                              │ name         │
                              └──────────────┘
                                    △
                                    │ (0..1)
                                    │ userId (FK)
        ┌───────────────────────────┘
        │
        ▼
   ┌──────────────┐                ┌──────────────┐
   │    ROOM      │                │   BOOKING    │
   │──────────────│                │──────────────│
   │ id (PK)      │◄───────────────│ roomId (FK)  │
   │ name         │ roomId (FK)    │ userId (FK)  │
   │ capacity     │     (1:N)      │              │
   │ status       │                │ startTime    │
   │ openMin      │                │ endTime      │
   │ closeMin     │                │ players      │
   └──────────────┘                │ basePrice    │
                                   │              │
                                   │ bookingStatus│
                                   │ paymentStatus│
                                   │ paidAt       │
                                   │ completedAt  │
                                   └──────┬───────┘
                                          │ (1:N)
                                          │ bookingId (FK)
                                    ┌─────┴──────────┐
                                    │                │
                                    ▼                ▼
                            ┌──────────────┐  ┌─────────────┐
                            │   INVOICE    │  │    ORDER    │
                            │──────────────│  │─────────────│
                            │ id (PK)      │  │ id (PK)     │
                            │ bookingId ◄──┼──│ bookingId   │
                            │ seatIndex    │  │ menuItemId ─┼──────┐
                            │              │  │ seatIndex   │      │
                            │ subtotal     │  │ quantity    │      │
                            │ tax          │  │ paidAmount  │      │
                            │ tip          │  │ paidAt      │      │
                            │ totalAmount  │  └─────────────┘      │
                            │              │                       │
                            │ status       │         ┌─────────────┘
                            │ paymentMethod│         │
                            │ paidAt       │         ▼
                            │              │   ┌──────────────┐
                            │ orders (1:N) │──┼──│ MENU ITEM    │
                            │ ──────────── │  │  │──────────────│
                            │ Use orders as│  │  │ id (PK)      │
                            │ line items   │  │  │ name         │
                            │              │  │  │ price        │
                            │ @unique      │  │  │ category     │
                            │ [booking,    │  │  │ active       │
                            │  seatIndex]  │  │  └──────────────┘
                            └──────────────┘  │
                                    △         │
                                    │─────────┘
                                 Many Orders
                               (one per line)
```

---

### 🎯 Key Insight: Use Orders as Invoice LineItems

**Instead of:**
- Order (for activity tracking)
- InvoiceLineItem (for billing)

**Just use:**
- Order (serves both purposes)
- Order.paidAmount & paidAt (mark which items are paid)

This simplifies the schema AND keeps all data together!

---

### 🔗 Relationship Details

#### **BOOKING ← ROOM (Many-to-One)**
```
One ROOM can have many BOOKINGs
One BOOKING belongs to ONE ROOM

Example:
  Room 1 ──┐
           ├─ Booking #1 (09:00-10:00, 2 players)
           ├─ Booking #2 (10:30-11:30, 3 players)
           └─ Booking #3 (14:00-15:00, 4 players)
```

#### **BOOKING ← USER (Many-to-One, Optional)**
```
One USER can have many BOOKINGs
One BOOKING may belong to a USER (null if guest/walk-in)

Example:
  User: john@example.com ──┐
                           ├─ Booking #1
                           ├─ Booking #2
                           └─ Booking #3
```

#### **BOOKING → INVOICE (One-to-Many)**
```
One BOOKING creates N INVOICEs (one per seat)
Each INVOICE belongs to ONE BOOKING

Constraint: @@unique([bookingId, seatIndex])
  → Only ONE invoice per seat per booking

Example:
  Booking #1 (3 players) ──┐
                           ├─ Invoice (Seat 1): $55 UNPAID
                           ├─ Invoice (Seat 2): $55 UNPAID
                           └─ Invoice (Seat 3): $55 UNPAID
```

#### **INVOICE → INVOICE LINE ITEM (One-to-Many)**
```
One INVOICE contains N LINE ITEMs
Each LINE ITEM belongs to ONE INVOICE

Example:
  Invoice (Seat 1) ──┐
                     ├─ Line Item: "9-Hole Round" $50
                     ├─ Line Item: "Burger" $15
                     └─ Line Item: "Beer" $8
  
  Total: $73
```

#### **ORDER → BOOKING (Many-to-One)**
```
Many ORDERs reference a BOOKING
Each ORDER belongs to ONE BOOKING

Note: ORDER is created when customer orders items
      ORDER details are reflected in INVOICE aggregates

Example:
  Booking #1 ──┐
               ├─ Order: Burger for Seat 1
               ├─ Order: Beer for Seat 1
               ├─ Order: Appetizer for Seat 2
               └─ Order: Cocktail for Seat 3
```

#### **ORDER → MENU ITEM (Many-to-One)**
```
One MENU ITEM can be ordered many times
Each ORDER references ONE MENU ITEM

Example:
  MenuItem: "Burger" ($15) ──┐
                             ├─ Order #1 (Booking #1, Seat 1) × 1
                             ├─ Order #2 (Booking #2, Seat 3) × 2
                             └─ Order #3 (Booking #3, Seat 2) × 1
```

---

### 💡 Data Flow Example

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE DATA FLOW                                 │
└────────────────────────────────────────────────────────────────────────────┘

STEP 1: BOOKING CREATED
────────────────────────
POST /api/bookings
{
  roomId: "room-1",
  userId: "user-123",
  startTime: "2025-11-30T09:00Z",
  endTime: "2025-11-30T10:00Z",
  players: 3,
  basePrice: 50
}

Creates:
  ┌─ Booking #123 (BOOKED, UNPAID)
  │
  ├─ Invoice #1 (Seat 1, $50 UNPAID)
  │   └─ LineItem: "9-Hole Round" $50
  │
  ├─ Invoice #2 (Seat 2, $50 UNPAID)
  │   └─ LineItem: "9-Hole Round" $50
  │
  └─ Invoice #3 (Seat 3, $50 UNPAID)
      └─ LineItem: "9-Hole Round" $50


STEP 2: CUSTOMER ORDERS FOOD (09:15)
──────────────────────────────────
POST /api/bookings/booking-123/orders
{
  menuItemId: "burger-xyz",
  seatIndex: 1,
  quantity: 1
}

Creates:
  Order #1 (Booking #123 → MenuItem "Burger" → Seat 1)

Updates:
  Invoice #1 (Seat 1) ← Recalculated
    ├─ LineItem: "9-Hole Round" $50
    ├─ LineItem: "Burger" $15 ← NEW
    └─ Total: $65


STEP 3: MULTIPLE ORDERS (09:30)
────────────────────────────
Multiple orders from different seats:

  Order #2: Beer for Seat 1 ($8)
  Order #3: Appetizer for Seat 2 ($12)
  Order #4: Cocktail for Seat 3 ($14)

Updated Invoices:
  Invoice #1: $73 (Round $50 + Burger $15 + Beer $8)
  Invoice #2: $62 (Round $50 + Appetizer $12)
  Invoice #3: $64 (Round $50 + Cocktail $14)
  Total: $199


STEP 4: PAYMENT PROCESSING (10:05-10:12)
──────────────────────────────────────
Seat 1 pays $73 (CARD):
  Invoice #1: status=PAID, paymentMethod=CARD, paidAt=10:05

Seat 2 pays $62 (CASH):
  Invoice #2: status=PAID, paymentMethod=CASH, paidAt=10:08

Seat 3 pays $69 (CARD) - with $5 tip:
  Invoice #3: status=PAID, tip=$5, totalAmount=$69, paidAt=10:12

All 3 invoices paid → Booking.paymentStatus = PAID


STEP 5: MARK COMPLETE (10:13)
──────────────────────────────
POST /api/bookings/booking-123/complete

Booking #123:
  bookingStatus = COMPLETED
  completedAt = 10:13
```

---

### 📐 Query Examples

```sql
-- Get all unpaid invoices for a booking
SELECT * FROM invoice
WHERE bookingId = 'booking-123'
  AND status = 'UNPAID';

-- Get total revenue for a date range
SELECT 
  DATE(booking.startTime) as date,
  SUM(invoice.totalAmount) as revenue
FROM invoice
JOIN booking ON invoice.bookingId = booking.id
WHERE booking.bookingStatus = 'COMPLETED'
  AND invoice.status = 'PAID'
  AND booking.completedAt BETWEEN '2025-11-01' AND '2025-11-30'
GROUP BY DATE(booking.startTime);

-- Get items sold by category
SELECT 
  invoiceLineItem.category,
  COUNT(*) as qty_sold,
  SUM(invoiceLineItem.totalPrice) as revenue
FROM invoiceLineItem
JOIN invoice ON invoiceLineItem.invoiceId = invoice.id
JOIN booking ON invoice.bookingId = booking.id
WHERE booking.bookingStatus = 'COMPLETED'
GROUP BY invoiceLineItem.category;

-- Get payment methods used
SELECT 
  invoice.paymentMethod,
  COUNT(*) as count,
  SUM(invoice.totalAmount) as amount
FROM invoice
WHERE invoice.status = 'PAID'
  AND invoice.paidAt >= NOW() - INTERVAL '30 days'
GROUP BY invoice.paymentMethod;
```

---

## 2. Prisma Schema (Simplified)

### 🎯 Why This Design?

Instead of having separate **Order** and **InvoiceLineItem** tables, we use **Order** directly:
- **Order** records each menu item ordered (activity log + audit trail)
- **Invoice** aggregates all orders for a seat (what to charge)
- **Simple & Single Source of Truth** - no duplication

```
BOOKING
  ├─ INVOICE (Seat 1)
  │   └─ Aggregates: basePrice + all Orders for Seat 1
  ├─ INVOICE (Seat 2)  
  │   └─ Aggregates: basePrice + all Orders for Seat 2
  ├─ INVOICE (Seat 3)
  │   └─ Aggregates: basePrice + all Orders for Seat 3
  │
  └─ ORDER (Booking 1 → Burger → Seat 1)
     ORDER (Booking 1 → Beer → Seat 1)
     ORDER (Booking 1 → Appetizer → Seat 2)
     etc.
```

### Complete Schema

```prisma
model Booking {
  id              String    @id @default(uuid())
  room            Room      @relation(fields: [roomId], references: [id])
  roomId          String
  user            User?     @relation(fields: [userId], references: [id])
  userId          String?   // null for walk-ins
  
  customerName    String
  customerPhone   String
  startTime       DateTime  @db.Timestamptz
  endTime         DateTime  @db.Timestamptz
  players         Int       // Total seats
  basePrice       Decimal   @db.Decimal(10, 2)  // Price per seat (e.g., $50)
  
  // Status
  bookingStatus   String    @default("BOOKED")  // BOOKED | COMPLETED | CANCELLED | EXPIRED
  paymentStatus   String    @default("UNPAID")  // UNPAID | PAID (all seats must be paid)
  
  // Timestamps
  paidAt          DateTime? @db.Timestamptz    // When ALL seats paid
  completedAt     DateTime? @db.Timestamptz    // When marked COMPLETED
  createdAt       DateTime  @default(now()) @db.Timestamptz
  updatedAt       DateTime  @updatedAt @db.Timestamptz
  
  // Relations
  invoices        Invoice[]  // One per seat
  
  @@index([roomId, startTime])
  @@index([customerPhone])
}

// ORDER - What was ordered (activity log)
model Order {
  id              String    @id @default(uuid())
  booking         Booking   @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  bookingId       String
  
  menuItem        MenuItem  @relation(fields: [menuItemId], references: [id])
  menuItemId      String
  
  seatIndex       Int       // 1-4 (which seat)
  quantity        Int
  
  createdAt       DateTime  @default(now()) @db.Timestamptz
  
  @@index([bookingId])
  @@index([seatIndex])
}

// INVOICE - Bill for one seat (aggregates all orders for that seat)
model Invoice {
  id              String    @id @default(uuid())
  booking         Booking   @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  bookingId       String
  
  seatIndex       Int       // 1-4
  
  // Totals (calculated from related Orders + basePrice)
  subtotal        Decimal   @db.Decimal(10, 2)  // basePrice + food/drinks
  tax             Decimal   @db.Decimal(10, 2)  // Taxes applied
  tip             Decimal?  @db.Decimal(10, 2)  // Optional tip
  totalAmount     Decimal   @db.Decimal(10, 2)  // subtotal + tax + tip
  
  // Payment
  status          String    @default("UNPAID")  // UNPAID | PAID
  paymentMethod   String?   // CARD | CASH
  paidAt          DateTime? @db.Timestamptz
  
  createdAt       DateTime  @default(now()) @db.Timestamptz
  updatedAt       DateTime  @updatedAt @db.Timestamptz
  
  @@unique([bookingId, seatIndex])
  @@index([bookingId])
  @@index([status])
}

model MenuItem {
  id              String    @id @default(uuid())
  name            String    // "Burger", "Beer", "9-Hole Round"
  price           Decimal   @db.Decimal(10, 2)
  category        MenuCategory
  active          Boolean   @default(true)
  orders          Order[]
}

enum MenuCategory {
  BOOKING    // Base room rental
  FOOD
  DRINKS
  EQUIPMENT
  SERVICES
}

model Room {
  id           String     @id @default(uuid())
  name         String     @unique
  capacity     Int        @default(4)
  status       RoomStatus @default(ACTIVE)
  openMinutes  Int        @default(540)   // 09:00
  closeMinutes Int        @default(1140)  // 19:00
  bookings     Booking[]
}

enum RoomStatus {
  ACTIVE
  MAINTENANCE
  CLOSED
}

model User {
  id       String   @id @default(uuid())
  phone    String   @unique
  name     String
  bookings Booking[]
}
```

---

## 3. Complete Example Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FULL BOOKING → PAYMENT FLOW                         │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: Create Booking (09:00 AM)
─────────────────────────────────
POST /api/bookings {
  roomId: "room-1",
  players: 3,
  basePrice: 50,
  startTime: "09:00",
  endTime: "10:00"
}

CREATED:
  Booking:
    ├─ bookingStatus: BOOKED
    ├─ paymentStatus: UNPAID
    └─ basePrice: $50 per seat

  3 Invoices (auto-created):
    Invoice 1: { seatIndex: 1, subtotal: $50, status: UNPAID }
    Invoice 2: { seatIndex: 2, subtotal: $50, status: UNPAID }
    Invoice 3: { seatIndex: 3, subtotal: $50, status: UNPAID }


STEP 2: Customer Orders Burger (09:15 AM)
──────────────────────────────────────────
POST /api/bookings/booking-1/orders {
  menuItemId: "burger",  // MenuItem: price $15
  seatIndex: 1,
  quantity: 1
}

CREATED:
  Order: { bookingId, menuItemId, seatIndex: 1, quantity: 1 }

INVOICE RECALCULATES:
  Invoice 1: { subtotal: $65 ($50 base + $15 burger), status: UNPAID }


STEP 3: More Orders (09:30 AM)
──────────────────────────────
Order: Beer for Seat 1 ($8)    → Invoice 1: $73
Order: Appetizer for Seat 2 ($12) → Invoice 2: $62
Order: Cocktail for Seat 3 ($14)  → Invoice 3: $64


STEP 4: Payment Processing (10:05-10:12 AM)
─────────────────────────────────────────────
Seat 1 Pays $73 + $5 tip (CARD):
  POST /api/invoices/invoice-1/pay {
    paymentMethod: "CARD",
    tip: 5
  }
  → Invoice 1: { totalAmount: $78, status: PAID, paidAt: now }

Seat 2 Pays $62 (CASH):
  → Invoice 2: { totalAmount: $62, status: PAID, paidAt: now }

Seat 3 Pays $64 (CASH):
  → Invoice 3: { totalAmount: $64, status: PAID, paidAt: now }


STEP 5: All Invoices Paid (10:12 AM)
────────────────────────────────────
System detects all 3 invoices marked PAID
→ Booking: { paymentStatus: PAID, paidAt: now }


STEP 6: Mark Booking Complete (10:15 AM)
─────────────────────────────────────────
POST /api/bookings/booking-1/complete

Booking: {
  bookingStatus: COMPLETED,
  completedAt: now,
  paymentStatus: PAID
}

✓ FINAL STATE - Revenue recognized
```

---

## 4. Query Examples

```sql
-- Get all unpaid invoices for a booking
SELECT * FROM invoice
WHERE bookingId = 'booking-1'
  AND status = 'UNPAID';

-- What did Seat 1 order?
SELECT o.* FROM order o
WHERE o.bookingId = 'booking-1'
  AND o.seatIndex = 1;

-- Revenue for the day (only completed bookings)
SELECT
  DATE(b.startTime) as date,
  SUM(i.totalAmount) as total_revenue,
  COUNT(DISTINCT b.id) as bookings_completed,
  COUNT(DISTINCT i.paymentMethod) as payment_methods
FROM invoice i
JOIN booking b ON i.bookingId = b.id
WHERE b.bookingStatus = 'COMPLETED'
  AND i.status = 'PAID'
  AND DATE(b.startTime) = '2025-11-30'
GROUP BY DATE(b.startTime);

-- Popular menu items
SELECT
  m.name,
  COUNT(o.id) as times_ordered,
  SUM(o.quantity) as total_quantity,
  SUM(o.quantity * m.price) as revenue
FROM order o
JOIN menuItem m ON o.menuItemId = m.id
WHERE DATE(o.createdAt) = '2025-11-30'
GROUP BY m.name
ORDER BY times_ordered DESC;

-- Payment methods used today
SELECT
  i.paymentMethod,
  COUNT(*) as num_payments,
  SUM(i.totalAmount) as amount
FROM invoice i
WHERE DATE(i.paidAt) = '2025-11-30'
  AND i.status = 'PAID'
GROUP BY i.paymentMethod;
```

---

## 1. Booking Lifecycle States

| Status | Description | Who Controls |
|--------|-------------|--------------|
| **BOOKED** | Active reservation, customer at/will be at venue | Customer or Staff |
| **COMPLETED** | Booking ended, all paid, staff marked as finished | Staff only |
| **CANCELLED** | Booking cancelled before/after start | Customer or Staff |
| **EXPIRED** | Booking abandoned, 30+ days no action taken | System or Staff override |
  amount: $50
  status: PAID
  paymentMethod: CASH
  paidAt: 2025-01-29 10:16:00 UTC
  recordedBy: staff123

Booking.paymentStatus = PAID (all 3 invoices paid = $150)
Booking.bookingStatus = COMPLETED (staff marked done)
```

### Payment Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PAYMENT COLLECTION FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

Booking for 3 players, total = $150

INITIAL STATE:
  bookingStatus = BOOKED
  paymentStatus = UNPAID
  payments = []

[During Session]
STAFF: Click "Collect Payment" → Opens payment dialog

SCENARIO A: One person pays for all
  ├─ Enter $150 (or read from card/cash)
  ├─ Enter payer name: "John"
  ├─ System marks Invoice 1 as PAID:
  │  { seatIndex: 1, status: PAID, paymentMethod: CARD, paidAt: now() }
  │
  └─ Admin manually marks invoices 2,3 as PAID (paid by John)
     └─ All invoices now PAID
     └─ Booking.paymentStatus = PAID

SCENARIO B: Split payment (individual customers)
  ├─ Customer 1 (John) pays $50
  │  └─ Staff records: Invoice 1 → PAID (CASH)
  │
  ├─ Customer 2 (Jane) pays $50
  │  └─ Staff records: Invoice 2 → PAID (CARD)
  │
  ├─ Customer 3 (Bob) hasn't paid ($50 remaining)
  │  └─ Invoice 3 still UNPAID
  │  └─ Booking.paymentStatus still UNPAID
  │
  └─ [Staff collects $50 from Bob]
     └─ Staff records: Invoice 3 → PAID (CASH)
        └─ All invoices now PAID
        └─ Booking.paymentStatus = PAID (auto-updated)

STAFF: Verify all invoices PAID
STAFF: Click "Complete Booking"
  └─ bookingStatus = COMPLETED
     completedAt = now()
     ✓ Revenue recognized
     ✓ Booking finished
```

### Payment Status Rules

```
paymentStatus Logic:

UNPAID
  When: Any invoice.status = UNPAID
  What: Some or all customers haven't paid yet
  Alert: ⚠️ WARNING (red) on dashboard if booking time passed

PAID
  When: ALL invoices.status = PAID
  What: All customers have paid
  Status: ✓ Ready to mark COMPLETED

OVERPAYMENT HANDLING:
  If sum(invoices.amount) > booking.price:
    Record as TIP or credit toward next booking
```

---

## 3. Room Status (Dashboard Visual Only)

### Room Availability Status (Database)

Database field: `room.status`

```
ACTIVE        → Room available for booking
MAINTENANCE   → Room blocked for maintenance
CLOSED        → Room permanently/temporarily closed
```

### Room Visual Status (Dashboard Calculated)

**NOT stored in database** – computed on-the-fly from bookings:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              ROOM VISUAL STATUS (Dashboard Timeline)                         │
└─────────────────────────────────────────────────────────────────────────────┘

EMPTY (🟢 Green)
  When: No BOOKED bookings in this timeslot
  Display: Room card shows "Empty"
  Next Available: [Show next available time]

OCCUPIED (🟡 Yellow)
  When: BOOKED booking in progress, >10 min until end
  Display: Room card shows "[Customer Name] - 45 min remaining"
  Booking Status: BOOKED + UNPAID (payment due)
          or
          BOOKED + PAID (payment done)

WARNING (🔴 Red)
  When: BOOKED booking in progress, ≤10 min until end
  Display: Room card shows "[Customer Name] - ENDING SOON! (2 min)"
  Alert: ⚠️ Staff should prep for next booking
  Action: Collect payment, mark COMPLETED

UNAVAILABLE (⚫ Gray)
  When: Room status = MAINTENANCE or CLOSED
  Display: Room card grayed out
  Note: No bookings accepted


┌────────────────────────────────────────────────────────────────┐
│ ROOM STATUS CALCULATION (pseudocode)                          │
└────────────────────────────────────────────────────────────────┘

function getRoomVisualStatus(room, bookings, now) {
  
  // Find active booking in this timeslot
  const activeBooking = bookings.find(b =>
    b.bookingStatus === 'BOOKED' &&
    b.startTime <= now &&
    now < b.endTime
  );
  
  if (!activeBooking) {
    return room.status === 'ACTIVE' ? 'EMPTY' : 'UNAVAILABLE';
  }
  
  // Calculate time remaining
  const minutesRemaining = (activeBooking.endTime - now) / 60000;
  
  if (minutesRemaining <= 10) {
    return 'WARNING';  // Red - prep time
  }
  
  return 'OCCUPIED';   // Yellow - normal booking
}
```

---

## 4. State Combination Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│         VALID BOOKING × PAYMENT STATE COMBINATIONS                          │
└─────────────────────────────────────────────────────────────────────────────┘

                           UNPAID                      PAID
          ┌─────────────────────────────────────────────────────────┐
BOOKED    │ ✓ Normal State                │ ✓ Ready to Complete      │
          │ • Customer at table           │ • All payments collected │
          │ • Orders being taken          │ • Staff will mark done   │
          │ • No payment yet              │   soon                   │
          │                               │                          │
          │ Action: Collect payment       │ Action: Mark COMPLETED   │
          ├─────────────────────────────────────────────────────────┤
COMPLETED │ ✗ Invalid                     │ ✓ Final State (SUCCESS)  │
          │ (Cannot complete without all  │ • Revenue recognized     │
          │  seats paying)                │ • Booking closed         │
          │                               │ • Cannot change          │
          │ Prevent in code               │                          │
          ├─────────────────────────────────────────────────────────┤
CANCELLED │ ✓ Clean Cancellation          │ ⚠️ Needs Review          │
          │ • No payment collected        │ • Already paid           │
          │ • Simple to handle            │ • Customer cancelled     │
          │ • No refund needed            │ • Refund may be needed   │
          │                               │ (Phase 2 - skip for now) │
          ├─────────────────────────────────────────────────────────┤
EXPIRED   │ ✓ Auto-cleanup                │ ⚠️ Needs Review          │
          │ • 30+ days old                │ • Paid but not completed │
          │ • No action taken             │ • Manual intervention    │
          │ • Archive/cleanup             │                          │
          └─────────────────────────────────────────────────────────┘

RULES:
  ✓ Safe/Normal - Standard workflow
  ⚠️ Edge case - Needs admin review (Phase 2)
  ✗ Invalid - Prevent via code validation
```

---

## 5. API Endpoints

### Booking Status Management

```
PATCH /api/bookings/:id/payment
Body: {
  amount: Decimal,
  paymentMethod: "CARD" | "CASH",
  customerName: String,
  seatIndex: Int  // 1-4
}
Response: {
  booking: { id, bookingStatus, paymentStatus, ... },
  payments: [{ customerName, amount, paidAt, ... }],
  remaining: Decimal  // Amount still owed
}
Returns: 200 OK | 400 (amount exceeds total) | 409 (booking not BOOKED)


PATCH /api/bookings/:id/complete
Body: {}
Response: {
  booking: { 
    id, 
    bookingStatus: "COMPLETED", 
    paymentStatus: "PAID",
    completedAt: DateTime
  }
}
Returns: 200 OK | 409 (paymentStatus not PAID) | 409 (bookingStatus not BOOKED)


PATCH /api/bookings/:id/cancel
Body: {}
Response: { booking: { id, bookingStatus: "CANCELLED", ... } }
Returns: 200 OK | 409 (already COMPLETED)


PATCH /api/bookings/:id (ADMIN ONLY)
Body: {
  bookingStatus?: "BOOKED" | "COMPLETED" | "CANCELLED" | "EXPIRED",
  paymentStatus?: "UNPAID" | "PAID"
}
Response: { booking: { ... } }
Returns: 200 OK (admin override always succeeds)
```

---

## 6. Migration Plan

### Database Changes

```sql
-- Migration: 20250129_001_simplify_booking_status.sql

-- 1. Rename CONFIRMED → BOOKED, add EXPIRED
ALTER TABLE "Booking"
  ALTER COLUMN "bookingStatus" DROP DEFAULT,
  ALTER COLUMN "bookingStatus" TYPE VARCHAR(50),
  ALTER COLUMN "bookingStatus" SET DEFAULT 'BOOKED';

-- Update existing CONFIRMED bookings
UPDATE "Booking" 
  SET "bookingStatus" = 'BOOKED'
  WHERE "bookingStatus" = 'CONFIRMED';

-- 2. Create BookingPayment table
CREATE TABLE "BookingPayment" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bookingId" UUID NOT NULL REFERENCES "Booking"("id") ON DELETE CASCADE,
  "customerName" VARCHAR(255) NOT NULL,
  "seatIndex" INT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "paymentMethod" VARCHAR(50),
  "paidAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_payment_bookingid ON "BookingPayment"("bookingId");

-- 3. Add completedAt column
ALTER TABLE "Booking" ADD COLUMN "completedAt" TIMESTAMPTZ;

-- 4. Drop BILLED references (if exists)
-- UPDATE "Booking" SET "paymentStatus" = 'UNPAID' WHERE "paymentStatus" = 'BILLED';
```

---

## 7. Implementation Checklist

### Backend

- [ ] Update Prisma schema (new BookingPayment model, update Booking)
- [ ] Create migration scripts
- [ ] Update bookingRepo.ts:
  - [ ] `createPayment(bookingId, customerName, seatIndex, amount, paymentMethod)`
  - [ ] `getPaymentTotal(bookingId)` → sum of BookingPayment amounts
  - [ ] `completeBooking(id)` → validate PAID, set COMPLETED
  - [ ] `updateBookingStatus(id, newStatus)` → admin override
- [ ] Update booking.ts routes:
  - [ ] `PATCH /api/bookings/:id/payment`
  - [ ] `PATCH /api/bookings/:id/complete`
  - [ ] `PATCH /api/bookings/:id` (admin)
- [ ] Add validators for new endpoints
- [ ] Update tests

### Frontend

- [ ] Update API service (pos-api.ts)
- [ ] Update dashboard.tsx:
  - [ ] Show payment collection UI
  - [ ] "Mark as Paid" button
  - [ ] "Complete Booking" button
  - [ ] Show per-seat payment status
  - [ ] Display remaining balance
- [ ] Update status labels/colors
- [ ] Add admin override UI

### Quality

- [ ] Test all state transitions
- [ ] Test split payment scenarios
- [ ] Test 30-day expiration
- [ ] Test admin overrides
- [ ] Update README with new model

---

## 8. Future Enhancements (Phase 2)

- [ ] **Alerts for Incomplete Bookings**: Flag bookings past endTime with paymentStatus=UNPAID
- [ ] **Refund Processing**: Handle CANCELLED + PAID scenario
- [ ] **Configurable Expiration**: Admin can set expiration threshold (env var)
- [ ] **Payment History**: Display per-seat payment breakdown
- [ ] **Multi-currency Support**: Store currency code
- [ ] **Receipt Printing**: Print receipt after payment
- [ ] **Reconciliation Reports**: Daily revenue reconciliation

---

## 9. Admin Capabilities

Admin users have full power over booking status:

```
Admin Actions (override rules):
  ✓ Change BOOKED → COMPLETED without payment
  ✓ Change COMPLETED → BOOKED (reopen)
  ✓ Change CANCELLED → BOOKED (reopen)
  ✓ Manually adjust payment records
  ✓ Mark BOOKED → EXPIRED (cleanup)
  ✓ Adjust tips/fees
  ✓ View full payment history
```

---

## Questions & Clarifications

> **Q: When should COMPLETED be auto-set after PAID?**
> A: No auto-completion. Staff must manually click "Complete Booking" button.
> Alert system (Phase 2) will flag unpaid bookings past endTime.

> **Q: How long until EXPIRED?**
> A: 30 days from `startTime`. Configurable later via env var.

> **Q: Can customers see payment status?**
> A: Phase 2. For now, staff-only POS dashboard.

> **Q: What about refunds for CANCELLED + PAID?**
> A: Deferred to Phase 2. For now, requires admin manual adjustment.

---

**Document Version:** 2.0  
**Last Updated:** November 29, 2025  
**Next Review:** After Phase 1.2 implementation complete
