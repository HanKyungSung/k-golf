# Migration: Remove Guest Bookings, Require User ID

**Date:** October 21, 2025  
**Migration:** `20251021071028_remove_guest_booking_require_user_id`

## Overview

This migration implements a hybrid customer tracking approach where all bookings require a User (customer profile), eliminating true "guest" bookings while maintaining flexibility for walk-in customers.

## Changes

### Database Schema

1. **Removed `isGuestBooking` column** from `Booking` table
2. **Made `userId` required** (NOT NULL) in `Booking` table
3. **Kept denormalized fields** (`customerName`, `customerPhone`, `customerEmail`) for historical accuracy

### Customer Model

All customers now have two types:
- **Customer Profile** (walk-in): `passwordHash: null` (cannot login)
- **Full Account** (online): `passwordHash: 'hashed_password'` (can login)

Both types are tracked in the `User` table, enabling:
- ✅ Customer booking history via `userId`
- ✅ Historical snapshot data in each booking
- ✅ Admin can view all bookings for a customer

## Rationale

### Why Remove Guest Bookings?

**Previous Approach:**
```prisma
userId        String?  // Nullable
isGuestBooking Boolean
```

**New Approach:**
```prisma
userId        String   // Required
// isGuestBooking removed
```

**Benefits:**
1. **Customer History**: All bookings linked to a user profile
2. **Simplified Logic**: No need to handle `userId: null` edge cases
3. **Better Analytics**: Track returning customers, spending patterns
4. **Loyalty Programs**: Can reward repeat customers in future

### Why Keep Denormalized Data?

**Denormalized Fields** (kept):
```prisma
customerName  String   // Snapshot at booking time
customerPhone String   // Snapshot at booking time
customerEmail String?  // Snapshot at booking time
```

**Why?**
- **Historical Accuracy**: Booking shows customer info as it was at booking time
- **Audit Trail**: Immutable records for financial/legal compliance
- **Performance**: No JOIN needed for booking lists
- **Offline-First**: POS app works without complex queries

**Example Scenario:**
```
Sept 1:  Customer books as "John Smith" / +1-416-555-1000
Sept 15: Customer updates profile to "John Williams" / +1-416-555-2000

Result:
- Sept 1 booking still shows original info (historical accuracy)
- New bookings use updated info
- Admin can view ALL bookings via userId (customer history)
```

## API Changes

### Before (3 modes):
```typescript
customerMode: 'existing' | 'new' | 'guest'
```

### After (2 modes):
```typescript
customerMode: 'existing' | 'new'
```

### Workflow:

**1. Existing Customer:**
```typescript
// Lookup by phone
const user = await prisma.user.findUnique({ where: { phone } });
const booking = await prisma.booking.create({
  userId: user.id,
  customerName: user.name,  // Snapshot from User
  // ...
});
```

**2. New Customer:**
```typescript
// Create profile + booking in transaction
const user = await prisma.user.create({
  name, phone, email,
  passwordHash: null,  // Customer profile (no login)
});
const booking = await prisma.booking.create({
  userId: user.id,
  customerName: user.name,  // Snapshot at creation
  // ...
});
```

## Migration Path

### For Existing Data

If you have existing bookings with `userId: null`, run this before migrating:

```sql
-- Create a default "Guest" user profile for orphaned bookings
INSERT INTO "User" (id, name, phone, email, role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Guest',
  '+1-111-111-1111',
  NULL,
  'CUSTOMER',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Link all guest bookings to this profile
UPDATE "Booking"
SET "userId" = (SELECT id FROM "User" WHERE phone = '+1-111-111-1111')
WHERE "userId" IS NULL;
```

### Testing

Run tests to verify:
```bash
npm run test:db
```

Tests verify:
- ✅ Customer profiles created without passwordHash
- ✅ All bookings require userId
- ✅ Denormalized data preserved
- ✅ Customer history tracking works

## Frontend Changes Needed

- [ ] Update booking form to remove "Guest" mode
- [ ] Update UI to show 2 customer modes instead of 3
- [ ] Add "Customer History" view (shows all bookings for a user)
- [ ] Update booking list to display customer info from denormalized fields

## Rollback

To rollback this migration:

```bash
npx prisma migrate resolve --rolled-back 20251021071028_remove_guest_booking_require_user_id
```

Then manually add back the columns if needed.
