# Incremental Sync Implementation

## Overview

Implemented timestamp-based incremental sync for bookings to ensure SQLite has complete mirror of PostgreSQL data while minimizing bandwidth usage.

## Strategy

### Full Sync (on login)
- Fetches **ALL** bookings from backend
- Populates complete history in SQLite
- Stores `lastSyncedAt` timestamp

### Incremental Sync (every 15 seconds)
- Fetches only bookings with `updatedAt > lastSyncedAt`
- Efficient bandwidth usage (only changed records)
- Updates `lastSyncedAt` after successful sync

## Implementation

### 1. SQLite Schema (POS)

**Added Metadata table:**
```sql
CREATE TABLE IF NOT EXISTS Metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Helper functions in `db.ts`:**
```typescript
export function getMetadata(key: string): string | null
export function setMetadata(key: string, value: string): void
```

### 2. Sync Logic (POS)

**Modified `pullBookings()` in `sync.ts`:**

```typescript
// On incremental sync (default):
const lastSyncedAt = getMetadata('bookings_lastSyncedAt');
if (lastSyncedAt) {
  url += `?updatedAfter=${encodeURIComponent(lastSyncedAt)}`;
}

// After successful sync:
const now = new Date().toISOString();
setMetadata('bookings_lastSyncedAt', now);
```

### 3. Backend API

**Modified `listBookings()` in `bookingRepo.ts`:**

```typescript
export interface ListBookingsOptions {
  page?: number;
  limit?: number;
  sortBy?: 'startTime' | 'createdAt';
  order?: 'asc' | 'desc';
  updatedAfter?: string; // ISO timestamp for incremental sync
}

// Query with filter:
const where: any = {};
if (updatedAfter) {
  where.updatedAt = { gt: new Date(updatedAfter) };
}
```

**Updated route in `booking.ts`:**
```typescript
router.get('/', async (req, res) => {
  const updatedAfter = req.query.updatedAfter as string | undefined;
  const result = await listBookings({ page, limit, sortBy, order, updatedAfter });
  // ...
});
```

## How It Works

### Initial Login Flow

```
Time: 10:00:00 AM
────────────────────────────────────────────────────────
1. User logs into POS
2. main.ts triggers: enqueueFullPullBookings()
   - payload: { fullSync: true }
3. pullBookings() executes:
   - No lastSyncedAt found
   - Fetches ALL bookings from backend
   - Populates SQLite with complete history
4. Sets lastSyncedAt = '2025-10-25T10:00:00Z'

Result: SQLite now has all bookings
```

### Incremental Sync Flow

```
Time: 10:00:15 AM (15 seconds later)
────────────────────────────────────────────────────────
1. Periodic sync triggers: enqueuePullIfNotExists('bookings:pull')
   - payload: {} (no fullSync flag)
2. pullBookings() executes:
   - Reads lastSyncedAt = '2025-10-25T10:00:00Z'
   - Fetches: GET /api/bookings?updatedAfter=2025-10-25T10:00:00Z
3. Backend returns only bookings with updatedAt > '2025-10-25T10:00:00Z'
4. SQLite UPSERTS changed bookings
5. Updates lastSyncedAt = '2025-10-25T10:00:15Z'

Result: Only changed records transferred (efficient!)
```

### Example Scenario

```
Backend has 1000 bookings:
- 990 bookings: Last updated > 30 days ago
- 10 bookings: Updated in last hour

Full Sync (login):
  Transfer: 1000 bookings
  Time: ~2 seconds

Incremental Sync (15 sec later):
  User creates 1 new booking on website
  Transfer: 1 booking (only the new one!)
  Time: ~50ms

Incremental Sync (15 sec later):
  No changes on backend
  Transfer: 0 bookings
  Time: ~20ms
```

## Benefits

✅ **Complete Data Mirror**: SQLite has full booking history  
✅ **Efficient Bandwidth**: Only sync changed records after initial pull  
✅ **Fast Queries**: All bookings available locally, no HTTP latency  
✅ **Offline Support**: Full data cached for offline operation  
✅ **Scalability**: Works with millions of bookings (only pulls changes)  

## Testing

### Test 1: Full Sync on Fresh Install
```bash
# Delete SQLite database
rm -f pos/apps/electron/data/pos.sqlite*

# Start POS, login
# Expected: All historical bookings appear in UI after 1-2 seconds
```

### Test 2: Incremental Sync Efficiency
```bash
# After initial sync, check logs:
[SYNC][BOOKINGS] Received 1000 bookings from backend (full)
[SYNC][BOOKINGS] Updated lastSyncedAt to: 2025-10-25T10:00:00.000Z

# Create booking via admin panel or website

# Wait 15 seconds, check logs:
[SYNC][BOOKINGS] Incremental sync since: 2025-10-25T10:00:00.000Z
[SYNC][BOOKINGS] GET http://localhost:8080/api/bookings?updatedAfter=2025-10-25T10:00:00.000Z
[SYNC][BOOKINGS] Received 1 bookings from backend (incremental)
```

### Test 3: No Changes Scenario
```bash
# Wait 15 seconds with no backend changes
# Expected logs:
[SYNC][BOOKINGS] Incremental sync since: 2025-10-25T10:00:15.000Z
[SYNC][BOOKINGS] Received 0 bookings from backend (incremental)
```

## Database Cleanup

To prevent unbounded growth, old bookings (30+ days) are automatically deleted:
- Only deletes clean records (`dirty=0`)
- Preserves pending changes (`dirty=1`)
- Runs during every sync

## Future Enhancements

### Phase 2: Optimistic Locking (Optional)
Add conflict detection when pushing local changes:

```typescript
// POS sends lastKnownUpdatedAt when updating
PATCH /api/bookings/123
{
  status: 'CANCELED',
  lastKnownUpdatedAt: '2025-10-25T10:00:00Z'
}

// Backend validates:
if (current.updatedAt > request.lastKnownUpdatedAt) {
  return 409 Conflict; // Another user modified it
}
```

This prevents silent data loss when multiple terminals modify the same booking.

## Files Changed

### POS (Electron)
- ✅ `pos/apps/electron/src/core/db.ts` - Added Metadata table and helpers
- ✅ `pos/apps/electron/src/core/sync.ts` - Updated pullBookings() to use lastSyncedAt
- ✅ `pos/apps/electron/src/core/sync-queue.ts` - Added enqueueFullPullBookings()
- ✅ `pos/apps/electron/src/main.ts` - Trigger full pull on login

### Backend (Express + Prisma)
- ✅ `backend/src/repositories/bookingRepo.ts` - Added updatedAfter filter
- ✅ `backend/src/routes/booking.ts` - Accept updatedAfter query param

## Status

✅ **Implementation Complete**  
⏳ **Testing Pending** - Ready for manual verification
