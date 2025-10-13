# Admin Manual Booking Feature - Design Specification

**Current Version:** 1.0  
**Created:** October 11, 2025  
**Last Updated:** October 11, 2025  
**Status:** ✅ Approved for Implementation

---

## 📋 Version Index

- **[v1.0 - Current Specification](#version-10---approved-specification)** ← **START HERE**
- [Detailed User Flow Proposals](#detailed-user-flow-proposals)
- [Phone Verification Analysis (Phase 2)](#phone-verification-analysis-phase-2)

---

## Version 1.0 - Approved Specification

**Feature:** Admin ability to manually create bookings for customers (walk-in, phone, online)  
**Scope:** Phone-number-based booking system with guest support  
**Status:** ✅ Ready for Implementation

---

### 🎯 Executive Summary

This specification defines a phone-number-based booking system that allows admins to create bookings for three types of customers:
1. **Existing customers** (search by phone)
2. **New customers** (register with phone + name, email optional)
3. **Guest customers** (walk-in only, no account creation)

**Key Decision:** Phone number is the primary identifier (not email) for better UX in Korea/Asia markets.

---

### 📊 Business Requirements

#### **Three Booking Channels**

**1. Online Booking** (Self-service)
- Customer books through website/app
- **Registration Required:** Email (primary), Name, Phone
- User creates account → Self-books
- **Admin Role:** View/manage only

**2. Walk-in Booking** (Front desk)
- Admin creates booking at reception
- **Three Options:**
  - **Guest:** Name + Phone only (no account creation)
  - **New Customer:** Create account with Name + Phone + Email (optional)
  - **Existing Customer:** Search by phone number → Link booking

**3. Phone Booking** (Over the phone)
- Admin creates booking during phone call
- **Same as Walk-in BUT no guest option**
- Must create account or use existing
- Rationale: Phone bookings suggest repeat customers

**Key Business Insights:**
- ✅ Phone number easier for front desk staff (vs typing emails)
- ✅ Phone number as identifier works well in Korea/Asia
- ✅ Email optional for walk-in/phone bookings
- ✅ Guest bookings for one-time customers (no account overhead)
- ✅ Track booking source (online/walk-in/phone) for analytics

---

### 🎨 Recommended User Flow: "Smart Hybrid"

```
┌────────────────────────────────────────────────────────┐
│ STEP 1: Booking Source                                │
│ [ Walk-in ]  [ Phone Booking ]                        │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ STEP 2: Customer Search                               │
│ 🔍 Search by Phone: [+82 10-____-____] [Search]      │
│                                                        │
│ Recent Customers:                                      │
│ • Jane Doe - +82 10-1234-5678                        │
│ • John Smith - +82 10-9876-5432                       │
│                                                        │
│ ──────────────── OR ────────────────────              │
│ [ + Create New Customer ]                             │
│ [ 🚶 Book as Guest ] (walk-in only)                   │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ STEP 3: Booking Details                               │
│ Room:     [Room 1 ▼]          (availability shown)    │
│ Date:     [Oct 15, 2025 📅]                           │
│ Time:     [14:00 ▼]           (only available slots)  │
│ Duration: [2 hours ▼]         (1-4 hours)             │
│ Players:  [2 ▼]               (1-4)                    │
│                                                        │
│ Price Preview:                                         │
│ Base:   $40/hr × 2hr = $80.00                        │
│ Tax (8%):              $6.40                          │
│ Total:                 $86.40                         │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ STEP 4: Confirmation                                   │
│ Customer: John Doe (+82 10-1234-5678)                 │
│ Room: Room 1                                           │
│ Date/Time: Oct 15, 2025 at 14:00 (2 hours)           │
│ Total: $86.40                                          │
│                                                        │
│ [Confirm & Create Booking]                             │
└────────────────────────────────────────────────────────┘
```

---

### 🏗️ Database Schema Changes

#### **User Model Updates**
```prisma
model User {
  id                String    @id @default(uuid())
  email             String?   @unique  // ⚠️ NOW NULLABLE
  phone             String    @unique  // ⚠️ NOW REQUIRED & UNIQUE
  name              String
  phoneVerifiedAt   DateTime? @db.Timestamptz  // ✨ NEW (Phase 2)
  passwordHash      String?   // Nullable for phone-only accounts
  role              UserRole  @default(CUSTOMER)
  // ... existing fields
}
```

**Key Changes:**
- `email`: Changed to **nullable** (optional for walk-in/phone)
- `phone`: Added **unique constraint** and made **required**
- `phoneVerifiedAt`: Added for future SMS verification

---

#### **Booking Model Enhancements**
```prisma
model Booking {
  id             String   @id @default(uuid())
  userId         String?  // ⚠️ NULLABLE for guest bookings
  user           User?    @relation(fields: [userId], references: [id])
  
  // Denormalized customer data (always filled)
  customerName   String
  customerPhone  String
  customerEmail  String?  // ✨ NEW: Optional email
  
  // Guest & source tracking
  isGuestBooking Boolean  @default(false)  // ✨ NEW
  bookingSource  String   @default("ONLINE")  // ✨ NEW: "ONLINE"|"WALK_IN"|"PHONE"
  createdBy      String?  // ✨ NEW: Admin user ID
  internalNotes  String?  // ✨ NEW: Admin notes
  
  // ... existing fields
  
  @@index([customerPhone])  // ✨ NEW: For guest lookups
}
```

**Key Changes:**
- `userId`: Made **nullable** (null for guest bookings)
- `customerEmail`: Added optional field
- `isGuestBooking`: Flag to identify guest bookings
- `bookingSource`: Track creation method (analytics)
- `createdBy`: Admin audit trail
- `internalNotes`: Admin-only notes

---

### 🔌 Backend API Design

#### **User Lookup by Phone**
```typescript
GET /api/users/lookup?phone={phoneNumber}
Authorization: ADMIN only

Response (Found):
{
  found: true,
  user: {
    id: "uuid",
    name: "John Doe",
    phone: "+821012345678",
    email: "john@example.com",
    bookingCount: 12,
    lastBookingDate: "2025-09-15T14:00:00Z",
    memberSince: "2024-01-10"
  }
}

Response (Not Found):
{ found: false }
```

---

#### **Admin Manual Booking Creation**
```typescript
POST /api/bookings/admin/create
Authorization: ADMIN only

Request Body:
{
  customerMode: "existing" | "new" | "guest",
  
  // For existing
  customerPhone?: string,
  
  // For new
  newCustomer?: {
    name: string,
    phone: string,
    email?: string
  },
  
  // For guest
  guest?: {
    name: string,
    phone: string,
    email?: string
  },
  
  // Booking details
  roomId: string,
  startTimeIso: string,
  hours: number,
  players: number,
  bookingSource: "WALK_IN" | "PHONE",
  
  // Optional
  customPrice?: number,
  internalNotes?: string
}

Response:
{
  success: true,
  booking: { /* booking details */ },
  userCreated?: boolean
}
```

---

### 📱 Phone Number Utilities

```typescript
// Normalize to E.164: "010-1234-5678" → "+821012345678"
function normalizePhone(input: string, countryCode = '+82'): string

// Format for display: "+821012345678" → "+82 10-1234-5678"
function formatPhoneDisplay(phone: string): string
```

---

### 📊 Customer Information Requirements

| Booking Type | Name | Phone | Email | Account Created |
|--------------|------|-------|-------|-----------------|
| **Online** | Required | Required | Required | ✅ Yes |
| **Walk-in - Guest** | Required | Required | Optional | ❌ No |
| **Walk-in - New** | Required | Required | Optional | ✅ Yes |
| **Walk-in - Existing** | Auto-fill | Search key | Auto-fill | ➖ Existing |
| **Phone - New** | Required | Required | Optional | ✅ Yes |
| **Phone - Existing** | Auto-fill | Search key | Auto-fill | ➖ Existing |

---

### ✅ v1.0 Feature Scope

**Included:**
- ✅ Admin manual booking creation
- ✅ Phone-based customer lookup
- ✅ Guest booking support (walk-in only)
- ✅ New customer registration (phone + name, email optional)
- ✅ Existing customer booking (search by phone)
- ✅ Booking source tracking
- ✅ Phone normalization (E.164 format)
- ✅ Recent customers quick-select

**Deferred to Future Versions:**
- ⏸️ Phone verification (v1.1 - SMS OTP)
- ⏸️ SMS notifications (v1.2)
- ⏸️ Guest-to-registered migration tool (v1.3)
- ⏸️ KakaoTalk integration (v2.0)

---

### 📝 Decision Log

| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| Phone as primary identifier | Easier for front desk, common in Korea | Oct 11, 2025 | ✅ Approved |
| Email optional for walk-in/phone | Faster registration | Oct 11, 2025 | ✅ Approved |
| Guest bookings (walk-in only) | Phone bookings = repeat customers | Oct 11, 2025 | ✅ Approved |
| No verification in v1.0 | Validate flows first | Oct 11, 2025 | ✅ Approved |
| userId nullable for guests | Cleaner than generic account | Oct 11, 2025 | ✅ Approved |
| E.164 phone format | International standard | Oct 11, 2025 | ✅ Approved |

---

### 🎯 Success Metrics

**Technical:**
- Zero duplicate phone numbers
- < 500ms API response time
- 99% uptime

**User Experience:**
- < 60 seconds to create booking
- 90% of walk-ins register (vs guest)
- 100% phone search success

**Business:**
- 50% reduction in booking time
- 80% reduction in duplicate accounts
- Track booking source analytics

---

### 🚨 Risk Mitigation

1. **Existing users without phone:** Migration sets placeholder, admin updates
2. **Duplicate phones:** Unique constraint + validation prevents
3. **International formats:** Normalize to E.164 standard
4. **Guest tracking:** Store in booking, index on customerPhone

---

### 🔄 Migration from Current System

**Current State:**
- Email required & unique
- Phone optional
- All bookings have userId
- No guest support

**Migration Steps:**
1. Add phone field to existing users (placeholder or backfill)
2. Make email nullable
3. Add guest booking support (nullable userId)
4. Add booking source tracking
5. Update API endpoints

**Rollback Plan:** Revert migration, email required again

---

## 📋 Detailed User Flow Proposals

*Note: These are detailed explorations of different UI/UX approaches. See [v1.0 Specification](#version-10---approved-specification) for the approved "Smart Hybrid" flow.*

### **Flow 1: "Quick Booking" - Existing User Only**
**Best for:** Walk-in customers with existing accounts

```
1. Admin opens Dashboard → "Bookings" tab
2. Click "Create Booking" button
3. Search/Select existing user by:
   - Email autocomplete
   - Phone number search
   - Recent customers dropdown
4. Auto-fill customer details (name, email, phone) from selected user
5. Select room, date, time, duration, players
6. Preview price calculation (with tax)
7. Click "Create Booking"
8. ✅ Booking created and linked to existing user account
```

**Pros:** Fast, no duplicate users, maintains clean database  
**Cons:** Requires customer to have existing account

---

### **Flow 2: "Book & Register" - Create User + Booking**
**Best for:** New customers or walk-ins without accounts

```
1. Admin opens Dashboard → "Bookings" tab
2. Click "Create Booking" button
3. Enter customer email
4. System checks: User exists?
   - ✅ YES → Auto-fill name/phone, proceed to step 6
   - ❌ NO → Show "New Customer" badge
5. Fill new customer details:
   - Name (required)
   - Phone (required)
   - Email (pre-filled, verified unique)
   - Auto-generate temporary password OR send verification email
6. Select room, date, time, duration, players
7. Preview booking details + new user indicator
8. Click "Create Booking & Register User"
9. ✅ User account created + Booking created + Optional: Email sent
```

**Pros:** One-step process, complete audit trail, customer can access account later  
**Cons:** Slightly more fields to fill

---

### **Flow 3: "Guest Booking" - No User Account**
**Best for:** One-time customers, events, quick bookings

```
1. Admin opens Dashboard → "Bookings" tab
2. Click "Create Booking" button
3. Toggle "Guest Booking" mode
4. Fill guest details (stored in booking only):
   - Guest Name
   - Guest Phone
   - Guest Email (optional)
5. Select room, date, time, duration, players
6. System creates booking without user account
7. Booking.customerName/customerPhone store the guest details
8. Click "Create Booking"
9. ✅ Booking created without user account
```

**Pros:** Fastest for one-time customers, minimal fields  
**Cons:** No user history, harder to track repeat customers

---

### **Flow 4: "Smart Hybrid" - Adaptive UI** ⭐ **RECOMMENDED**
**Best for:** Handles all scenarios with intelligent UX

```
1. Admin opens Dashboard → "Bookings" tab
2. Click "Create Booking" button

3. Step 1: Customer Selection (Smart Search)
   ┌─────────────────────────────────────────────┐
   │ 📞 Booking Source: [Walk-in] [Phone]        │
   │                                             │
   │ 🔍 Search by Phone Number:                  │
   │ ┌───────────────────────────┐               │
   │ │ +82 10-____-____  [Search]│               │
   │ └───────────────────────────┘               │
   │                                             │
   │ Recent Customers:                           │
   │ • Jane Doe - +82 10-1234-5678              │
   │ • John Smith - +82 10-9876-5432            │
   │                                             │
   │ ──────── OR ────────                        │
   │ [ Create New Customer ]                     │
   │ [ Book as Guest (walk-in only) ]           │
   └─────────────────────────────────────────────┘

4a. If existing customer found:
    → Auto-fill all details (name, email, phone)
    → Show "Customer since: [date]"
    → Show past booking count
    → [Use This Customer] button

4b. If "Create New Customer":
    → Show registration form
    → Name (required)
    → Phone (required, unique validation)
    → Email (optional for walk-in/phone)
    → Optional: Send welcome email

4c. If "Book as Guest" (walk-in only):
    → Show minimal form (name, phone only)
    → No user account created
    → Fastest option

5. Step 2: Booking Details
   - Room selection (with availability indicator)
   - Date picker (show room availability calendar)
   - Time slot picker (only show available slots)
   - Duration dropdown (1-4 hours)
   - Players count (1-4)
   - Price preview (auto-calculated with tax)
   - Optional: Custom price override (admin only)
   - Optional: Internal notes

6. Step 3: Confirmation
   - Review all details
   - Show price breakdown (base + tax)
   - Customer info summary
   - Booking source indicator
   - Optional: Send confirmation email checkbox

7. Click "Confirm & Create"

8. ✅ Success Screen:
   - Print receipt option
   - Send email confirmation
   - Create another booking
   - View booking details
```

**Pros:** Handles all use cases, best UX, prevents duplicates, intelligent defaults  
**Cons:** Most complex to implement

---

## 📊 Flow Comparison Matrix

| Feature | Flow 1 | Flow 2 | Flow 3 | Flow 4 |
|---------|--------|--------|--------|--------|
| **Speed** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Flexibility** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Data Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **User Tracking** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ |
| **Implementation** | ⭐⭐ | ⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐ |
| **New Customers** | ❌ | ✅ | ✅ | ✅ |
| **Existing Customers** | ✅ | ✅ | ❌ | ✅ |
| **Guest Bookings** | ❌ | ❌ | ✅ | ✅ |

---

## 🔧 Consolidated Requirements

### Customer Information Collection

| Booking Type | Name | Phone | Email | Account Created |
|--------------|------|-------|-------|-----------------|
| **Online** | Required | Required | Required (primary) | ✅ Yes |
| **Walk-in - Guest** | Required | Required | Optional | ❌ No |
| **Walk-in - New** | Required | Required (unique) | Optional | ✅ Yes |
| **Walk-in - Existing** | Auto-fill | Search key | Auto-fill | ➖ Use existing |
| **Phone - New** | Required | Required (unique) | Optional | ✅ Yes |
| **Phone - Existing** | Auto-fill | Search key | Auto-fill | ➖ Use existing |

### Key Requirements
1. **Phone number as primary identifier** for walk-in/phone bookings
2. **Phone must be unique** across User accounts
3. **Email optional** for walk-in/phone (required for online)
4. **Guest mode** available for walk-in only (not phone)
5. **Search by phone** is primary lookup method (easier than email)
6. **Track booking source** (online/walk-in/phone) for analytics

---

## 🏗️ Technical Specification

### Database Schema Changes

#### **User Model Updates**
```prisma
model User {
  id                     String                  @id @default(uuid())
  email                  String?                 @unique  // ⚠️ CHANGED: Now nullable
  phone                  String                  @unique  // ⚠️ CHANGED: Now required & unique
  name                   String
  emailVerifiedAt        DateTime?               @db.Timestamptz
  phoneVerifiedAt        DateTime?               @db.Timestamptz  // ✨ NEW: For SMS verification
  passwordHash           String?                 // Nullable for phone-only accounts
  passwordUpdatedAt      DateTime?               @db.Timestamptz
  role                   UserRole                @default(CUSTOMER)
  createdAt              DateTime                @default(now()) @db.Timestamptz
  updatedAt              DateTime                @updatedAt @db.Timestamptz
  bookings               Booking[]
  authProviders          AuthProvider[]
  sessions               Session[]
  emailVerificationToken EmailVerificationToken?
  settingsUpdates        Setting[]
}
```

#### **Booking Model Enhancements**
```prisma
model Booking {
  id            String   @id @default(uuid())
  room          Room     @relation(fields: [roomId], references: [id])
  roomId        String
  user          User?    @relation(fields: [userId], references: [id])  // ⚠️ CHANGED: Nullable for guest
  userId        String?  // ⚠️ CHANGED: Nullable
  
  // Denormalized fields (always filled)
  customerName  String
  customerPhone String
  customerEmail String?  // ✨ NEW: Optional email storage
  
  // Guest booking tracking
  isGuestBooking Boolean @default(false)  // ✨ NEW: Flag for guest bookings
  
  // Booking source tracking
  bookingSource String   @default("ONLINE")  // ✨ NEW: "ONLINE" | "WALK_IN" | "PHONE" | "ADMIN"
  
  // Existing fields
  startTime     DateTime @db.Timestamptz
  endTime       DateTime @db.Timestamptz
  players       Int
  price         Decimal  @db.Decimal(10, 2)
  status        String   @default("CONFIRMED")
  createdAt     DateTime @default(now()) @db.Timestamptz
  updatedAt     DateTime @updatedAt @db.Timestamptz
  createdBy     String?  // ✨ NEW: Admin user ID who created (if manual)
  internalNotes String?  // ✨ NEW: Admin-only notes

  @@index([roomId, startTime])
  @@index([userId, startTime])
  @@index([customerPhone])  // ✨ NEW: For guest booking lookups
}
```

#### **Migration Required**
```sql
-- Migration: Make email nullable, phone unique & required
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_phone_key" UNIQUE ("phone");
ALTER TABLE "User" ADD COLUMN "phone_verified_at" TIMESTAMPTZ;

-- Add guest booking fields
ALTER TABLE "Booking" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "Booking" ADD COLUMN "customer_email" TEXT;
ALTER TABLE "Booking" ADD COLUMN "is_guest_booking" BOOLEAN DEFAULT false;
ALTER TABLE "Booking" ADD COLUMN "booking_source" VARCHAR(50) DEFAULT 'ONLINE';
ALTER TABLE "Booking" ADD COLUMN "created_by" TEXT;
ALTER TABLE "Booking" ADD COLUMN "internal_notes" TEXT;

-- Add indexes
CREATE INDEX "Booking_customer_phone_idx" ON "Booking"("customer_phone");
```

---

### Backend API Design

#### **New Endpoint: Admin Manual Booking**

```typescript
POST /api/bookings/admin/create
Authorization: Required (ADMIN role only)

Request Body Schema:
{
  // Customer identification (one of three modes)
  customerMode: "existing" | "new" | "guest",
  
  // For existing customer (search by phone)
  customerPhone?: string,           // "+821012345678"
  
  // For new customer registration
  newCustomer?: {
    name: string,                   // Required
    phone: string,                  // Required, unique
    email?: string,                 // Optional
    sendWelcomeEmail?: boolean      // Default: false
  },
  
  // For guest booking (walk-in only)
  guest?: {
    name: string,                   // Required
    phone: string,                  // Required (not unique, stored in booking)
    email?: string                  // Optional
  },
  
  // Booking details (required for all modes)
  roomId: string,                   // UUID
  startTimeIso: string,             // "2025-10-11T14:00:00Z"
  hours: number,                    // 1-4
  players: number,                  // 1-4
  
  // Booking source tracking
  bookingSource: "WALK_IN" | "PHONE",
  
  // Optional overrides (admin privileges)
  customPrice?: number,             // Override calculated price
  customTaxRate?: number,           // Override global tax rate
  internalNotes?: string,           // Admin-only notes
  sendConfirmationEmail?: boolean   // Default: false
}

Response (Success):
{
  success: true,
  booking: {
    id: "uuid",
    roomId: "uuid",
    roomName: "Room 1",
    userId: "uuid" | null,
    customerName: "John Doe",
    customerPhone: "+821012345678",
    customerEmail: "john@example.com",
    startTime: "2025-10-11T14:00:00Z",
    endTime: "2025-10-11T16:00:00Z",
    players: 2,
    price: 80.00,
    taxRate: 8,
    totalPrice: 86.40,
    status: "CONFIRMED",
    isGuestBooking: false,
    bookingSource: "WALK_IN",
    createdAt: "2025-10-11T10:30:00Z"
  },
  userCreated?: boolean,            // True if new user was created
  emailSent?: boolean               // True if confirmation email sent
}

Response (Error):
{
  success: false,
  error: "Phone number already in use" | "Room not available" | "Invalid time slot",
  details?: { ... }
}
```

---

### Backend Implementation Logic

#### **Customer Lookup by Phone**
```typescript
async function findUserByPhone(phoneInput: string): Promise<User | null> {
  // Normalize phone: +82-10-1234-5678 → +821012345678
  const normalized = phoneInput.replace(/[^0-9+]/g, '');
  
  return await prisma.user.findUnique({
    where: { phone: normalized },
    include: {
      bookings: {
        orderBy: { createdAt: 'desc' },
        take: 1  // Last booking
      }
    }
  });
}

// Enhanced response with stats
type UserLookupResult = {
  found: boolean;
  user?: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    role: UserRole;
    bookingCount: number;
    lastBookingDate: Date | null;
    memberSince: Date;
    totalSpent: number;
  };
};
```

#### **Create Booking Logic Flow**
```typescript
async function createAdminBooking(req: Request, res: Response) {
  const { customerMode, bookingSource, ...data } = req.body;
  
  let userId: string | null = null;
  let customerName: string;
  let customerPhone: string;
  let customerEmail: string | null = null;
  let isGuestBooking = false;
  let userCreated = false;
  
  // Step 1: Handle customer identification
  switch (customerMode) {
    case 'existing':
      // Search by phone
      const existingUser = await findUserByPhone(data.customerPhone);
      if (!existingUser) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      userId = existingUser.id;
      customerName = existingUser.name;
      customerPhone = existingUser.phone;
      customerEmail = existingUser.email;
      break;
      
    case 'new':
      // Create new user account
      const phoneExists = await prisma.user.findUnique({
        where: { phone: normalizePhone(data.newCustomer.phone) }
      });
      if (phoneExists) {
        return res.status(409).json({ error: 'Phone number already registered' });
      }
      
      const newUser = await prisma.user.create({
        data: {
          name: data.newCustomer.name,
          phone: normalizePhone(data.newCustomer.phone),
          email: data.newCustomer.email || null,
          role: 'CUSTOMER',
          // No password for walk-in/phone registrations
          // User can set password later via "forgot password" flow
        }
      });
      
      userId = newUser.id;
      customerName = newUser.name;
      customerPhone = newUser.phone;
      customerEmail = newUser.email;
      userCreated = true;
      
      // Optional: Send welcome email
      if (data.newCustomer.sendWelcomeEmail && newUser.email) {
        await sendWelcomeEmail(newUser.email, newUser.name);
      }
      break;
      
    case 'guest':
      // Guest booking (no user account)
      if (bookingSource === 'PHONE') {
        return res.status(400).json({ 
          error: 'Guest bookings not allowed for phone bookings' 
        });
      }
      
      userId = null;
      customerName = data.guest.name;
      customerPhone = normalizePhone(data.guest.phone);
      customerEmail = data.guest.email || null;
      isGuestBooking = true;
      break;
  }
  
  // Step 2: Validate room availability
  const conflict = await findConflict(
    data.roomId,
    new Date(data.startTimeIso),
    data.hours
  );
  
  if (conflict) {
    return res.status(409).json({ 
      error: 'Time slot not available',
      conflictingBooking: conflict
    });
  }
  
  // Step 3: Calculate pricing
  const room = await prisma.room.findUnique({ where: { id: data.roomId } });
  const basePrice = data.customPrice || (calculateHourlyRate(room) * data.hours);
  const taxRate = data.customTaxRate || globalTaxRate;
  const totalPrice = basePrice * (1 + taxRate / 100);
  
  // Step 4: Create booking
  const booking = await prisma.booking.create({
    data: {
      roomId: data.roomId,
      userId: userId,
      customerName,
      customerPhone,
      customerEmail,
      startTime: new Date(data.startTimeIso),
      endTime: new Date(new Date(data.startTimeIso).getTime() + data.hours * 3600000),
      players: data.players,
      price: totalPrice,
      status: 'CONFIRMED',
      isGuestBooking,
      bookingSource,
      createdBy: req.user!.id,  // Admin who created
      internalNotes: data.internalNotes,
    }
  });
  
  // Step 5: Optional confirmation email
  let emailSent = false;
  if (data.sendConfirmationEmail && customerEmail) {
    await sendBookingConfirmation(customerEmail, booking);
    emailSent = true;
  }
  
  return res.json({
    success: true,
    booking: presentBooking(booking),
    userCreated,
    emailSent
  });
}
```

---

### Frontend UI Components

#### **Phone Input Component**
```tsx
import React, { useState } from 'react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (phone: string) => void;
  countryCode?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  onSearch,
  countryCode = '+82'
}) => {
  const [formatted, setFormatted] = useState('');
  
  const formatPhone = (input: string) => {
    // Remove non-digits
    const digits = input.replace(/\D/g, '');
    
    // Format: +82 10-1234-5678
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatPhone(raw);
    setFormatted(formatted);
    onChange(countryCode + raw.replace(/\D/g, ''));
  };
  
  return (
    <div className="flex gap-2">
      <input
        type="tel"
        value={formatted}
        onChange={handleChange}
        placeholder="10-1234-5678"
        className="flex-1 bg-slate-700/50 border border-slate-600 rounded px-3 py-2 text-white"
      />
      {onSearch && (
        <button
          type="button"
          onClick={() => onSearch(value)}
          className="px-4 py-2 bg-amber-500 text-black rounded hover:bg-amber-400"
        >
          Search
        </button>
      )}
    </div>
  );
};
```

#### **Customer Search Component**
```tsx
interface CustomerSearchProps {
  onSelect: (user: User) => void;
  onNewCustomer: () => void;
  onGuest?: () => void;
}

export const CustomerSearch: React.FC<CustomerSearchProps> = ({
  onSelect,
  onNewCustomer,
  onGuest
}) => {
  const [phone, setPhone] = useState('');
  const [searchResult, setSearchResult] = useState<UserLookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  const handleSearch = async (phoneNumber: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/lookup?phone=${encodeURIComponent(phoneNumber)}`);
      const result = await res.json();
      setSearchResult(result);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-slate-300 mb-2">Search by Phone Number</label>
        <PhoneInput
          value={phone}
          onChange={setPhone}
          onSearch={handleSearch}
        />
      </div>
      
      {loading && <p className="text-slate-400">Searching...</p>}
      
      {searchResult?.found && (
        <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-white font-semibold">{searchResult.user.name}</h3>
              <p className="text-sm text-slate-300">{searchResult.user.phone}</p>
              {searchResult.user.email && (
                <p className="text-sm text-slate-400">{searchResult.user.email}</p>
              )}
              <div className="mt-2 flex gap-4 text-xs text-slate-400">
                <span>📊 {searchResult.user.bookingCount} bookings</span>
                <span>📅 Member since {new Date(searchResult.user.memberSince).toLocaleDateString()}</span>
              </div>
            </div>
            <button
              onClick={() => onSelect(searchResult.user)}
              className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-400"
            >
              Use Customer
            </button>
          </div>
        </div>
      )}
      
      {searchResult && !searchResult.found && (
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
          <p className="text-slate-300 mb-3">❌ No account found for this number</p>
          <div className="flex gap-2">
            <button
              onClick={onNewCustomer}
              className="px-4 py-2 bg-amber-500 text-black rounded hover:bg-amber-400"
            >
              + Register New Customer
            </button>
            {onGuest && (
              <button
                onClick={onGuest}
                className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500"
              >
                Continue as Guest
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## 🚀 Implementation Plan

### **Phase 1: Database Foundation** (Week 1)
- [ ] Migration: Make `User.email` nullable
- [ ] Migration: Make `User.phone` unique and required
- [ ] Migration: Add `User.phoneVerifiedAt` field
- [ ] Migration: Add guest booking fields to `Booking`
- [ ] Migration: Add `bookingSource`, `createdBy`, `internalNotes` to `Booking`
- [ ] Update Prisma schema
- [ ] Run migrations
- [ ] Update seed file with test data

### **Phase 2: Backend API** (Week 1-2)
- [ ] Create `POST /api/bookings/admin/create` endpoint
- [ ] Implement phone normalization utility
- [ ] Implement `findUserByPhone` lookup function
- [ ] Implement customer creation logic (existing/new/guest)
- [ ] Add booking availability validation
- [ ] Add pricing calculation with tax
- [ ] Add conflict detection
- [ ] Implement email notifications (optional)
- [ ] Add comprehensive error handling
- [ ] Write API tests

### **Phase 3: Frontend Components** (Week 2)
- [ ] Create `PhoneInput` component with auto-formatting
- [ ] Create `CustomerSearch` component
- [ ] Create `NewCustomerForm` component
- [ ] Create `GuestBookingForm` component
- [ ] Update `DashboardPage` booking creation modal
- [ ] Add booking source selector (walk-in/phone)
- [ ] Add customer mode switcher (existing/new/guest)
- [ ] Implement form validation
- [ ] Add loading states and error messages

### **Phase 4: UI Polish** (Week 3)
- [ ] Phone number formatting and validation
- [ ] Recent customers quick list
- [ ] Duplicate detection warnings
- [ ] Success/error toast notifications
- [ ] Booking confirmation preview
- [ ] Print receipt functionality
- [ ] Email confirmation toggle
- [ ] Responsive mobile layout

### **Phase 5: Analytics & Tools** (Week 4)
- [ ] Booking source analytics dashboard
- [ ] Guest booking report
- [ ] Customer acquisition tracking
- [ ] Guest → Registered user migration tool
- [ ] Bulk phone number normalization tool
- [ ] Admin audit log for manual bookings

---

## ❓ Open Questions

### **Decided:**
- ✅ **Primary Flow:** Flow 4 (Smart Hybrid) - handles all scenarios
- ✅ **Phone as identifier:** Yes, easier for front desk staff
- ✅ **Email optional:** Yes, for walk-in/phone (required for online)
- ✅ **Guest bookings:** Yes, for walk-in only (not phone)
- ✅ **Phone format:** +82 10-XXXX-XXXX (Korea), stored as +821012345678

### **To Decide:**

#### 1. **Phone Number Verification**
- Should we verify phone numbers? (SMS verification)
- When to verify: At registration? At first booking? Optional?
- What service to use? (Twilio, AWS SNS, Korean service?)
- Cost implications?

#### 2. **Guest User Handling**
- Make `userId` nullable for guest bookings? ✅ **Yes**
- OR create single "Guest User" account? ❌ No (cleaner to use null)

#### 3. **Duplicate Phone Detection**
- Block duplicate phone numbers completely? ✅ **Yes** (enforce unique)
- Show warning but allow? ❌ No (causes data issues)

#### 4. **Guest to Registered Conversion**
- Allow converting guest bookings to registered users later?
- Automatic linking by phone number when user registers?
- Manual linking tool for admins?

#### 5. **Password Handling for Walk-in/Phone**
- No password initially, use "forgot password" flow? ✅ **Recommended**
- Auto-generate and email? (Requires email)
- Auto-generate and SMS? (Requires SMS service)

#### 6. **International Support**
- Support only Korea (+82)?
- Multi-country phone codes?
- Phone format validation per country?

#### 7. **Email Notifications**
- Send welcome email when creating account?
- Send booking confirmation?
- Require admin to opt-in each time?
- Default to yes/no?

#### 8. **Admin Privileges**
- Allow custom pricing override?
- Allow booking in the past?
- Allow overriding room capacity?
- Allow manual tax rate per booking?

---

## 📈 Success Metrics

### **Phase 1 Goals:**
- Database migration successful
- No data loss during migration
- All existing bookings still valid

### **Phase 2 Goals:**
- API endpoint functional
- All three customer modes working (existing/new/guest)
- Proper error handling
- < 500ms response time

### **Phase 3 Goals:**
- UI intuitive for front desk staff
- < 60 seconds to create walk-in booking
- Zero duplicate accounts created
- Phone search works 100% of the time

### **Business Goals:**
- Reduce booking time by 50%
- Reduce duplicate customer accounts by 80%
- 90% of walk-ins choose to register (vs guest)
- Track conversion from guest to registered users

---

## 📝 Notes

### **Current Implementation Status:**
- ✅ Basic booking creation modal exists in `DashboardPage.tsx`
- ✅ API endpoint stub: `POST /api/bookings/admin/create`
- ❌ No phone-based user lookup yet
- ❌ No guest booking support yet
- ❌ Email required for all users currently

### **Technical Debt to Address:**
- Mock data in frontend (`bookingContext.tsx`) needs real backend sync
- Room availability checking needs improvement
- Price calculation should be server-side (prevent tampering)
- Timezone handling for international users

### **Future Enhancements:**
- QR code check-in for walk-ins
- SMS confirmation messages
- Automated reminders (SMS/Email)
- Loyalty program integration
- Multi-language support (Korean/English)
- Voice booking via phone AI

---

## 📱 Phone Verification Analysis (Phase 2)

### **Why Phone Verification Matters**

**Benefits:**
- ✅ **Prevents fraud:** Confirms user actually owns the number
- ✅ **Reduces spam:** Harder to create fake accounts
- ✅ **Better communication:** Ensures valid contact method
- ✅ **Account recovery:** Can use SMS for password reset
- ✅ **Trust indicator:** "Verified" badge increases legitimacy

**Drawbacks:**
- ❌ **Friction:** Extra step slows registration
- ❌ **Cost:** SMS fees per verification
- ❌ **Complexity:** Additional infrastructure needed
- ❌ **International:** Different regulations per country

---

### **Verification Methods Overview**

#### **1. SMS OTP (One-Time Password)** ⭐ **Most Common**
```
1. User enters phone number
2. System sends 6-digit code via SMS
3. User enters code within 5 minutes
4. System validates and marks phone as verified
```
**Pros:** Industry standard, high security, works globally  
**Cons:** Costs per SMS, carrier delays, spam filters

#### **2. Voice Call Verification**
```
1. User enters phone number
2. System makes automated call
3. Robot voice reads verification code
4. User enters code
```
**Pros:** Works when SMS fails, good for landlines  
**Cons:** Higher cost than SMS, slower, annoying

#### **3. WhatsApp/KakaoTalk Verification** (Korea-specific)
```
1. User enters phone number
2. Send verification code via KakaoTalk
3. User enters code
```
**Pros:** Free in Korea, high delivery rate, users trust KakaoTalk  
**Cons:** Requires API integration, Korea-only

---

### **SMS Provider Comparison**

#### **Option 1: Twilio** (Most Popular)
- **Website:** https://www.twilio.com/
- **Korea SMS Cost:** ~₩60 per message ($0.0448)
- **US SMS Cost:** ~₩10 per message ($0.0079)
- **Monthly Base:** ₩0 (pay-as-you-go)
- **Phone Rental:** ₩1,500/month (optional)
- **Free Trial:** $15 credit

**Features:**
- ✅ Global coverage (180+ countries)
- ✅ 99.95% uptime SLA
- ✅ Excellent documentation
- ✅ Easy API (REST + SDKs)
- ✅ Node.js/Python/PHP SDKs

**Pros:** Easy to implement, reliable, great support  
**Cons:** Most expensive for Korea

---

#### **Option 2: AWS SNS** (Best for AWS ecosystems)
- **Website:** https://aws.amazon.com/sns/
- **Korea SMS Cost:** ~₩88 per message ($0.06604)
- **US SMS Cost:** ~₩8.5 per message ($0.00645)
- **Monthly Base:** ₩0
- **No phone rental needed**

**Features:**
- ✅ Seamless AWS integration
- ✅ High reliability
- ✅ Global reach
- ✅ AWS SDK support

**Pros:** Good if already using AWS, no setup needed  
**Cons:** More expensive than Twilio for Korea, less user-friendly API

---

#### **Option 3: NHN Cloud (Formerly TOAST)** ⭐ **Best for Korea**
- **Website:** https://www.nhncloud.com/
- **Korea SMS Cost:** ₩8-12 per message
- **LMS (Long):** ₩30-40 per message
- **Monthly Base:** ₩0 (pay-as-you-go)

**Features:**
- ✅ **5-8x cheaper** than Twilio for Korea
- ✅ Korean language support
- ✅ Highest delivery rate in Korea
- ✅ Good documentation (Korean/English)
- ✅ REST API + SDKs

**Pros:** Cheapest for Korea, excellent local delivery  
**Cons:** Limited international, may require Korean business registration

---

#### **Option 4: KakaoTalk Alimtalk** 🇰🇷 **Korea-Specific**
- **Website:** https://business.kakao.com/
- **Alimtalk Cost:** ₩5-15 per message
- **Friendtalk Cost:** ₩25-40 per message
- **SMS Fallback:** ₩12-20 (if KakaoTalk unavailable)
- **Monthly Base:** ₩0
- **Setup Fee:** ~₩50,000 (one-time)

**Features:**
- ✅ **Cheapest option** (₩5-15/msg)
- ✅ **99% delivery rate** in Korea
- ✅ Users trust KakaoTalk more than SMS
- ✅ Rich templates (buttons, images)
- ❌ Korea-only
- ❌ Requires business verification
- ❌ Template approval (1-3 days)

**Pros:** Lowest cost, highest trust, rich features  
**Cons:** Setup complexity, Korea-only, template approval needed

---

### **Cost Comparison Table**

| Monthly Volume | Twilio | AWS SNS | NHN Cloud | KakaoTalk |
|----------------|--------|---------|-----------|-----------|
| **100 SMS** | ₩6,000 | ₩8,800 | ₩1,000 | ₩500-1,500 |
| **500 SMS** | ₩30,000 | ₩44,000 | ₩5,000 | ₩2,500-7,500 |
| **1,000 SMS** | ₩60,000 | ₩88,000 | ₩10,000 | ₩5,000-15,000 |
| **5,000 SMS** | ₩300,000 | ₩440,000 | ₩50,000 | ₩25,000-75,000 |
| **Annual (1K/mo)** | ₩720,000 | ₩1,056,000 | ₩120,000 | ₩60,000-180,000 |

**💡 Savings:** Using NHN Cloud saves ₩600K/year vs Twilio at 1,000 verifications/month

---

### **Provider Feature Comparison**

| Feature | Twilio | AWS SNS | NHN Cloud | KakaoTalk |
|---------|--------|---------|-----------|-----------|
| **Setup Difficulty** | ⭐⭐⭐⭐⭐ Easy | ⭐⭐⭐ Moderate | ⭐⭐⭐ Moderate | ⭐⭐ Hard |
| **Korea Delivery** | ⭐⭐⭐⭐ Good | ⭐⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐⭐ Best |
| **Global Support** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐ Limited | ❌ Korea only |
| **Cost (Korea)** | ⭐⭐ High | ⭐ Highest | ⭐⭐⭐⭐⭐ Lowest | ⭐⭐⭐⭐⭐ Lowest |
| **Documentation** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐ Good | ⭐⭐⭐ Good | ⭐⭐⭐ Good |
| **User Trust** | ⭐⭐⭐ Moderate | ⭐⭐⭐ Moderate | ⭐⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Highest |

---

### **Twilio Implementation Example**

#### **1. Installation**
```bash
npm install twilio
npm install @types/twilio --save-dev
```

#### **2. Environment Variables**
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+14155552671
```

#### **3. Phone Verification Service**
```typescript
// backend/src/services/phoneVerificationService.ts
import twilio from 'twilio';
import { PrismaClient } from '@prisma/client';
import { randomInt } from 'crypto';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

/**
 * Send verification code via SMS
 */
export async function sendVerificationCode(phone: string): Promise<void> {
  // Generate 6-digit code
  const code = randomInt(100000, 999999).toString();
  
  // Hash for storage (security best practice)
  const hashedCode = await bcrypt.hash(code, 10);
  
  // Store in DB with expiry (5 minutes)
  await prisma.phoneVerificationToken.upsert({
    where: { phone },
    update: {
      tokenHash: hashedCode,
      expiresAt: new Date(Date.now() + 5 * 60000),
      attempts: 0,
      createdAt: new Date() // Reset timer
    },
    create: {
      phone,
      tokenHash: hashedCode,
      expiresAt: new Date(Date.now() + 5 * 60000),
      attempts: 0
    }
  });
  
  // Send SMS via Twilio
  await twilioClient.messages.create({
    body: `[K-Golf] Your verification code is: ${code}`,
    to: phone,
    from: process.env.TWILIO_PHONE_NUMBER!
  });
  
  console.log(`✅ Sent verification code to ${phone}`);
}

/**
 * Verify code entered by user
 */
export async function verifyCode(phone: string, code: string): Promise<boolean> {
  const verification = await prisma.phoneVerificationToken.findUnique({
    where: { phone }
  });
  
  // Check token exists
  if (!verification) {
    console.log(`❌ No verification token for ${phone}`);
    return false;
  }
  
  // Check expiry
  if (verification.expiresAt < new Date()) {
    console.log(`⏰ Verification token expired for ${phone}`);
    await prisma.phoneVerificationToken.delete({ where: { phone } });
    return false;
  }
  
  // Check attempt limit (prevent brute force)
  if (verification.attempts >= 3) {
    console.log(`🚫 Too many attempts for ${phone}`);
    return false;
  }
  
  // Verify code
  const isValid = await bcrypt.compare(code, verification.tokenHash);
  
  if (!isValid) {
    // Increment failed attempts
    await prisma.phoneVerificationToken.update({
      where: { phone },
      data: { attempts: verification.attempts + 1 }
    });
    console.log(`❌ Invalid code for ${phone} (attempt ${verification.attempts + 1}/3)`);
    return false;
  }
  
  // Success! Mark phone as verified
  await prisma.user.update({
    where: { phone },
    data: { phoneVerifiedAt: new Date() }
  });
  
  // Delete token (single use)
  await prisma.phoneVerificationToken.delete({
    where: { phone }
  });
  
  console.log(`✅ Phone verified: ${phone}`);
  return true;
}

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhone(input: string, defaultCountryCode = '+82'): string {
  // Remove all non-digits and plus signs
  let digits = input.replace(/[^0-9+]/g, '');
  
  // Add default country code if missing
  if (!digits.startsWith('+')) {
    // Handle Korean numbers starting with 010
    if (digits.startsWith('010')) {
      digits = '+82' + digits.slice(1);
    } else if (digits.startsWith('10')) {
      digits = '+82' + digits;
    } else {
      digits = defaultCountryCode + digits;
    }
  }
  
  return digits;
}
```

#### **4. Database Schema**
```prisma
model PhoneVerificationToken {
  id        String   @id @default(uuid())
  phone     String   @unique
  tokenHash String
  expiresAt DateTime @db.Timestamptz
  attempts  Int      @default(0)
  createdAt DateTime @default(now()) @db.Timestamptz
}
```

#### **5. API Endpoints**
```typescript
// backend/src/routes/auth.ts

// Send verification code
router.post('/send-verification', async (req, res) => {
  const { phone } = req.body;
  
  if (!phone) {
    return res.status(400).json({ error: 'Phone number required' });
  }
  
  const normalizedPhone = normalizePhone(phone);
  
  // Rate limiting: max 3 SMS per phone per hour
  const recentTokens = await prisma.phoneVerificationToken.findFirst({
    where: {
      phone: normalizedPhone,
      createdAt: { gte: new Date(Date.now() - 3600000) }
    }
  });
  
  if (recentTokens && recentTokens.attempts >= 3) {
    return res.status(429).json({ 
      error: 'Too many attempts. Please try again in 1 hour.' 
    });
  }
  
  try {
    await sendVerificationCode(normalizedPhone);
    res.json({ 
      success: true, 
      message: 'Verification code sent',
      expiresIn: 300 // 5 minutes in seconds
    });
  } catch (error) {
    console.error('SMS send failed:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// Verify code
router.post('/verify-phone', async (req, res) => {
  const { phone, code } = req.body;
  
  if (!phone || !code) {
    return res.status(400).json({ error: 'Phone and code required' });
  }
  
  const normalizedPhone = normalizePhone(phone);
  const isValid = await verifyCode(normalizedPhone, code);
  
  if (!isValid) {
    return res.status(400).json({ 
      error: 'Invalid or expired verification code' 
    });
  }
  
  res.json({ 
    success: true, 
    message: 'Phone verified successfully' 
  });
});
```

---

### **Cost Projections**

#### **Monthly Cost Scenarios**

**Small Business (100 verifications/month):**
| Provider | Monthly | Annual | Cost per Verification |
|----------|---------|--------|-----------------------|
| Twilio | ₩6,000 | ₩72,000 | ₩60 |
| AWS SNS | ₩8,800 | ₩105,600 | ₩88 |
| NHN Cloud | ₩1,000 | ₩12,000 | ₩10 |
| KakaoTalk | ₩500-1,500 | ₩6,000-18,000 | ₩5-15 |

**Medium Business (1,000 verifications/month):**
| Provider | Monthly | Annual | Cost per Verification |
|----------|---------|--------|-----------------------|
| Twilio | ₩60,000 | ₩720,000 | ₩60 |
| AWS SNS | ₩88,000 | ₩1,056,000 | ₩88 |
| NHN Cloud | ₩10,000 | ₩120,000 | ₩10 |
| KakaoTalk | ₩5,000-15,000 | ₩60,000-180,000 | ₩5-15 |

**Large Business (5,000 verifications/month):**
| Provider | Monthly | Annual | Cost per Verification |
|----------|---------|--------|-----------------------|
| Twilio | ₩300,000 | ₩3,600,000 | ₩60 |
| AWS SNS | ₩440,000 | ₩5,280,000 | ₩88 |
| NHN Cloud | ₩50,000 | ₩600,000 | ₩10 |
| KakaoTalk | ₩25,000-75,000 | ₩300,000-900,000 | ₩5-15 |

**💡 Key Insight:** NHN Cloud saves ₩600K/year vs Twilio at 1,000 verifications/month

---

### **Recommendation: Phased Approach**

#### **Phase 1: No Verification (Launch)** ✅ **START HERE**
```typescript
// Store phone but don't verify yet
- Phone required for registration
- Phone used for customer lookup
- No SMS costs
- Fast implementation
- Validate user flows first
```

**Timeline:** Week 1-2  
**Cost:** ₩0  
**Risk:** Low (can add verification later)

---

#### **Phase 2: Optional Verification (After Launch)** 
```typescript
// Add verification as opt-in feature
- Users get "Verified" badge
- Benefits: SMS reminders, account recovery
- Use NHN Cloud (₩10/SMS)
- Feature flag to enable/disable
```

**Timeline:** Week 3-4  
**Cost:** ₩10,000-50,000/month (estimated 1,000-5,000 SMS)  
**Risk:** Low (optional, can monitor adoption)

**Implementation:**
```typescript
// Add to User model
model User {
  phoneVerifiedAt DateTime? @db.Timestamptz
  // ... existing fields
}

// UI shows verification badge
{user.phoneVerifiedAt && (
  <Badge className="bg-green-500">✓ Verified</Badge>
)}
```

---

#### **Phase 3: Required Verification (If Needed)**
```typescript
// Make verification mandatory
- Required for all new registrations
- Grace period for existing users (30 days)
- Switch to KakaoTalk if volume > 5,000/month
- Add SMS notifications and reminders
```

**Timeline:** Month 2-3 (based on demand)  
**Cost:** ₩50,000-200,000/month  
**Risk:** Medium (user friction, but better security)

---

### **Stack Recommendations by Phase**

#### **Phase 1: No Verification**
```json
{
  "dependencies": {},
  "features": [
    "Phone storage (not verified)",
    "Phone-based customer lookup",
    "Guest bookings"
  ],
  "monthlyCost": "₩0"
}
```

#### **Phase 2: Optional Verification**
```json
{
  "dependencies": {
    "@nhncloud/sms": "^1.0.0"  // Or Twilio if prefer ease
  },
  "features": [
    "SMS OTP verification",
    "Verified badge",
    "Account recovery via SMS"
  ],
  "monthlyCost": "₩10,000-50,000",
  "provider": "NHN Cloud (cheapest for Korea)"
}
```

#### **Phase 3: Required + Advanced**
```json
{
  "dependencies": {
    "@kakao/alimtalk": "^2.0.0",  // Primary
    "twilio": "^5.0.0"             // International fallback
  },
  "features": [
    "Mandatory verification",
    "KakaoTalk notifications",
    "SMS reminders",
    "International support"
  ],
  "monthlyCost": "₩50,000-200,000",
  "provider": "KakaoTalk + Twilio hybrid"
}
```

---

### **Security Best Practices**

1. **Rate Limiting:**
   - Max 3 SMS per phone per hour
   - Max 5 verification attempts per day
   - Block after 10 failed attempts in 24h

2. **Code Requirements:**
   - 6-digit numeric code (100,000-999,999)
   - 5-minute expiry
   - Single-use only
   - Hash before storing (bcrypt)

3. **Phone Storage:**
   - Store in E.164 format (+821012345678)
   - Index for fast lookups
   - Unique constraint (prevent duplicates)

4. **Audit Trail:**
   - Log all SMS sends (cost tracking)
   - Log verification attempts
   - Track failed verifications

5. **Fallback Mechanisms:**
   - Manual verification by admin (if SMS fails)
   - Voice call backup
   - Email verification as alternative

---

**End of Document**  
**Version:** 1.0  
**Last Updated:** October 11, 2025  
**Status:** ✅ Approved for Implementation

**Version:** 1.0  
**Target Release:** November 2025  
**Status:** Planning Complete ✅

---

### **Version 1.0 Scope**

#### **Core Features:**
✅ Admin manual booking creation  
✅ Phone-based customer lookup  
✅ Guest booking support (walk-in only)  
✅ New customer registration (phone + name required, email optional)  
✅ Existing customer booking (search by phone)  
✅ Booking source tracking (online/walk-in/phone)  
⏸️ Phone verification (Phase 2 - post-launch)  
⏸️ SMS notifications (Phase 2 - post-launch)

#### **Out of Scope (Future Versions):**
- ❌ Phone verification (v1.1)
- ❌ SMS reminders (v1.2)
- ❌ Guest-to-registered migration tool (v1.3)
- ❌ KakaoTalk integration (v2.0)
- ❌ Multi-language support (v2.0)

---

## 📋 Detailed User Flow Proposals

### **Flow 1: "Quick Booking" - Existing User Only**

**Tasks:**
1. Create migration for User schema changes
   - Make `email` nullable
   - Make `phone` unique and required
   - Add `phoneVerifiedAt` (for future use)
   - Migrate existing users (set default phone if null)

2. Create migration for Booking schema changes
   - Make `userId` nullable (for guest bookings)
   - Add `customerEmail` field
   - Add `isGuestBooking` boolean
   - Add `bookingSource` enum field
   - Add `createdBy` field (admin user ID)
   - Add `internalNotes` text field
   - Add index on `customerPhone`

3. Update Prisma schema
   - Update User model
   - Update Booking model
   - Add PhoneVerificationToken model (for Phase 2)

4. Update seed file
   - Ensure all users have phone numbers
   - Add test data for guest bookings
   - Add test data for different booking sources

**Acceptance Criteria:**
- [ ] Migrations run successfully
- [ ] No data loss from existing users/bookings
- [ ] Schema matches requirements
- [ ] Seed creates test data for all scenarios

---

#### **Sprint 2: Backend API** (Days 4-7)

**Tasks:**
1. Create phone utility functions
   - `normalizePhone()` - Format to E.164
   - `formatPhoneDisplay()` - Format for UI display
   - `validatePhone()` - Validate phone format

2. Create user lookup endpoint
   - `GET /api/users/lookup?phone=xxx` (ADMIN only)
   - Return user details + booking stats
   - Return 404 if not found (not an error)

3. Create admin booking endpoint
   - `POST /api/bookings/admin/create`
   - Handle three customer modes (existing/new/guest)
   - Validate room availability
   - Calculate pricing with tax
   - Create user if needed (for "new" mode)
   - Create booking with proper fields
   - Return comprehensive response

4. Add validation and error handling
   - Phone uniqueness check
   - Room availability validation
   - Time slot conflict detection
   - Player count limits
   - Duration limits
   - Proper error messages

5. Add helper endpoints
   - `GET /api/users/recent` - Recent customers (for quick select)
   - `GET /api/bookings/availability` - Check slot availability

**Acceptance Criteria:**
- [ ] Phone lookup works correctly
- [ ] All three customer modes functional
- [ ] Proper validation and errors
- [ ] Guest bookings don't create users
- [ ] New customer creation works
- [ ] Existing customer linking works
- [ ] Booking source tracked correctly

---

#### **Sprint 3: Frontend Components** (Days 8-11)

**Tasks:**
1. Create PhoneInput component
   - Auto-formatting (+82 10-1234-5678)
   - Country code selector
   - Validation (real-time)
   - Search button integration

2. Create CustomerSearch component
   - Phone search input
   - Search results display
   - User stats (booking count, member since, etc.)
   - "Use Customer" button
   - "New Customer" / "Guest" fallback buttons

3. Create NewCustomerForm component
   - Name input (required)
   - Phone input (required, unique check)
   - Email input (optional)
   - Welcome email checkbox
   - Validation and error messages

4. Create GuestBookingForm component
   - Name input (required)
   - Phone input (required, not unique)
   - Email input (optional)
   - Guest mode indicator

5. Update DashboardPage booking modal
   - Add booking source selector (walk-in/phone)
   - Add customer mode tabs (existing/new/guest)
   - Integrate phone search
   - Integrate new customer form
   - Integrate guest form
   - Connect to backend API
   - Handle all response states

**Acceptance Criteria:**
- [ ] Phone input formats correctly
- [ ] Search works and shows results
- [ ] New customer form validates
- [ ] Guest form works (walk-in only)
- [ ] Modal handles all modes
- [ ] Success/error states clear
- [ ] Loading states implemented

---

#### **Sprint 4: UI Polish & Testing** (Days 12-14)

**Tasks:**
1. Phone number formatting
   - Display format: +82 10-1234-5678
   - Input format: Auto-format as typing
   - Storage format: +821012345678

2. Recent customers feature
   - Cache last 10 customers in localStorage
   - Quick-select dropdown
   - Sort by recent booking date

3. Duplicate prevention
   - Real-time phone uniqueness check
   - Warning if phone already registered
   - Suggest linking to existing account

4. Success notifications
   - Toast notifications
   - Success screen with actions:
     - Print receipt
     - Create another booking
     - View booking details

5. Error handling polish
   - User-friendly error messages
   - Inline validation errors
   - Network error retry

6. Testing
   - Test all three customer modes
   - Test walk-in vs phone flows
   - Test error scenarios
   - Test duplicate prevention
   - Performance testing

**Acceptance Criteria:**
- [ ] All flows tested and working
- [ ] No console errors
- [ ] Phone formatting works
- [ ] Duplicates prevented
- [ ] User feedback clear
- [ ] < 60 seconds to create booking

---

### **Version 1.0 Deliverables**

#### **Database:**
- ✅ User.phone (unique, required)
- ✅ User.email (nullable for phone-only accounts)
- ✅ Booking.isGuestBooking flag
- ✅ Booking.bookingSource tracking
- ✅ Booking.customerEmail storage
- ✅ PhoneVerificationToken table (for Phase 2)

#### **Backend API:**
- ✅ `POST /api/bookings/admin/create` - Create booking (all modes)
- ✅ `GET /api/users/lookup?phone=xxx` - Search by phone
- ✅ `GET /api/users/recent` - Recent customers list
- ✅ Phone normalization utilities
- ✅ Comprehensive validation

#### **Frontend UI:**
- ✅ Enhanced booking creation modal
- ✅ Phone input component with formatting
- ✅ Customer search by phone
- ✅ New customer registration form
- ✅ Guest booking form
- ✅ Booking source selector
- ✅ Success/error notifications

#### **Documentation:**
- ✅ This specification document
- ✅ API documentation
- ✅ User guide for front desk staff
- ✅ Testing checklist

---

### **Version 1.1 Preview (Future)**

**Phone Verification Features:**
- SMS OTP verification
- Verified badge display
- Account recovery via SMS
- Optional verification flow
- Provider: NHN Cloud (₩10/SMS)
- Estimated cost: ₩10,000-50,000/month

**Timeline:** 2-3 weeks after v1.0 launch  
**Dependencies:** v1.0 stable, user demand validated

---

### **Success Metrics - v1.0**

#### **Technical Metrics:**
- [ ] Zero duplicate phone numbers in database
- [ ] < 500ms API response time for booking creation
- [ ] 99% uptime for booking API
- [ ] Zero data loss during migration

#### **User Experience Metrics:**
- [ ] < 60 seconds average booking creation time
- [ ] 90% of walk-ins choose to register (vs guest)
- [ ] Zero confused staff members (via training)
- [ ] Phone search success rate: 100%

#### **Business Metrics:**
- [ ] 50% reduction in booking creation time
- [ ] 80% reduction in duplicate accounts
- [ ] Track guest → registered conversion rate
- [ ] Booking source analytics dashboard

---

### **Risk Mitigation**

#### **Risk 1: Existing Users Without Phone**
**Mitigation:**
- Migration sets placeholder phone for existing users
- Admin can update phone numbers in user management
- Email-based lookup as fallback

#### **Risk 2: Duplicate Phone Numbers**
**Mitigation:**
- Unique constraint prevents duplicates
- Search shows if phone already registered
- Admin can merge duplicate accounts (future tool)

#### **Risk 3: International Phone Formats**
**Mitigation:**
- Normalize to E.164 format
- Support common formats (+82, 010, etc.)
- Validation with regex

#### **Risk 4: Guest Booking Tracking**
**Mitigation:**
- Store all guest info in booking record
- Index on customerPhone for lookups
- Future: Guest-to-registered migration tool

---

### **Rollout Plan**

#### **Week 1: Development**
- Days 1-3: Database migrations
- Days 4-7: Backend API

#### **Week 2: Frontend + Testing**
- Days 8-11: UI components
- Days 12-14: Testing & polish

#### **Week 3: Soft Launch**
- Internal testing with staff
- Fix bugs and UX issues
- Train front desk staff

#### **Week 4: Production Launch**
- Deploy to production
- Monitor metrics
- Gather feedback

#### **Week 5+: Iterate**
- Analyze usage data
- Plan v1.1 (verification)
- Optimize based on feedback

---

### **Technical Stack Summary**

#### **Database:**
```
- PostgreSQL 14+
- Prisma ORM 5.x
- Migrations for schema changes
```

#### **Backend:**
```
- Node.js + Express
- TypeScript
- Zod validation
- bcrypt for hashing
```

#### **Frontend:**
```
- React + TypeScript
- Electron (POS app)
- Tailwind CSS
- Custom UI components
```

#### **Future (Phase 2):**
```
- NHN Cloud SMS API (or Twilio)
- Redis for rate limiting (optional)
- Bull Queue for SMS jobs (optional)
```

---

### **Decision Log**

| Decision | Rationale | Date |
|----------|-----------|------|
| Phone as primary identifier | Easier for front desk staff, common in Korea | Oct 11, 2025 |
| Email optional for walk-in/phone | Faster registration, phone is sufficient | Oct 11, 2025 |
| Guest bookings for walk-in only | Phone bookings suggest repeat customers | Oct 11, 2025 |
| No verification in v1.0 | Get feature working, validate flows, add later | Oct 11, 2025 |
| NHN Cloud for Phase 2 | 6x cheaper than Twilio for Korea | Oct 11, 2025 |
| userId nullable for guests | Cleaner than single guest account | Oct 11, 2025 |
| Flow 4 (Smart Hybrid) | Handles all scenarios with best UX | Oct 11, 2025 |

---

### **Open Questions for v1.0**

**Must Decide Before Implementation:**
1. ✅ **Phone verification?** → No (Phase 2)
2. ✅ **Email optional?** → Yes (for walk-in/phone)
3. ✅ **Guest bookings?** → Yes (walk-in only)
4. ✅ **Phone as unique?** → Yes (enforce uniqueness)
5. ⏳ **Admin price override?** → TBD
6. ⏳ **Send confirmation emails?** → TBD (opt-in checkbox?)
7. ⏳ **Book in past?** → TBD (useful for retroactive entries?)
8. ⏳ **Internal notes?** → Yes (already in schema)

**Can Decide During Implementation:**
- Exact phone format validation rules
- Recent customers cache size (10? 20?)
- Default booking source (walk-in vs phone)
- Success message copy
- Error message copy

---

**Roadmap Version:** 1.0  
**Last Updated:** October 11, 2025  
**Next Review:** After Sprint 1 completion  
**Approved By:** [Pending]
