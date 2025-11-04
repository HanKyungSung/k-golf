# BookingContext.tsx - Refactored Flow Documentation

## Overview
The refactored `BookingContext.tsx` provides a clean, well-organized state management system for bookings, rooms, and tax rates in the POS application.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      BookingContext.tsx                          │
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │  State Layer    │  │  Fetch Layer     │  │  Action Layer  │ │
│  │  - bookings     │  │  - fetchBookings │  │  - update*     │ │
│  │  - rooms        │  │  - fetchRooms    │  │  - getById     │ │
│  │  - taxRate      │  │  - fetchTaxRate  │  │  - refresh     │ │
│  │  - pagination   │  └──────────────────┘  └────────────────┘ │
│  └─────────────────┘                                             │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Effects Layer (On Mount + Auto-Refresh)                    │ │
│  │  - Initial data fetch                                       │ │
│  │  - Sync event listener                                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagrams

### 1️⃣ Initial Load (On Mount)

```
┌─────────────────────────────────────────────────────────────────┐
│ MOUNT EVENT                                                      │
└─────────────────────────────────────────────────────────────────┘
                              ║
                              ║ useEffect (line 336)
                              ║
              ┌───────────────╨───────────────┐
              │                               │
              ▼                               ▼
    ┌─────────────────┐            ┌──────────────────┐
    │  fetchRooms()   │            │  fetchTaxRate()  │
    │  (line 227)     │            │  (line 257)      │
    └─────────────────┘            └──────────────────┘
              │                               │
              │ Fetch API                     │ Fetch API
              │ /api/bookings/rooms           │ /api/settings/global_tax_rate
              ▼                               ▼
    ┌─────────────────┐            ┌──────────────────┐
    │ setRooms()      │            │ setGlobalTaxRate()│
    │ (line 251)      │            │ (line 271)       │
    └─────────────────┘            └──────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ refreshBookings()│
                    │ (line 340)       │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │fetchBookingsPage()│
                    │ (line 325)       │
                    └──────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │ window.kgolf.listBookings()│ <-- IPC to SQLite
              │ (line 131)                 │
              └───────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │ Map to UI format          │
              │ - Parse dates/times       │
              │ - Calculate duration      │
              │ - Map room names          │
              │ (lines 140-159)           │
              └───────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │ Apply sorting & pagination│
              │ (lines 162-180)           │
              └───────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │ setBookings() + setState  │
              │ (lines 182-187)           │
              └───────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   UI UPDATES    │ <-- React re-renders
                    └─────────────────┘
```

**Timeline Example:**
```
T+0ms    → Component mounts
T+10ms   → useEffect triggers
T+15ms   → fetchRooms() starts
T+20ms   → fetchTaxRate() starts
T+25ms   → refreshBookings() starts
T+150ms  → Rooms API responds (4 rooms)
T+160ms  → setRooms() → UI shows rooms
T+180ms  → Tax API responds (8%)
T+185ms  → setGlobalTaxRate() → localStorage synced
T+200ms  → SQLite IPC responds (10 bookings)
T+210ms  → Bookings mapped and sorted
T+215ms  → setBookings() → UI shows bookings
T+220ms  → Initial render complete ✓
```

---

### 2️⃣ Periodic Sync & Auto-Refresh

```
┌─────────────────────────────────────────────────────────────────┐
│ SYNC EVENT (Every 15 seconds)                                   │
└─────────────────────────────────────────────────────────────────┘
                              ║
                              ║ main.ts (line ~277)
                              ║
              ┌───────────────╨───────────────┐
              │ Sync Queue runs              │
              │ enqueuePullIfNotExists()     │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ sync.ts pullBookings()        │
              │ - Read lastSyncedAt from      │
              │   Metadata table              │
              │ - Fetch with ?updatedAfter    │
              │ (line 121-180)                │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Backend API                   │
              │ GET /api/bookings             │
              │   ?updatedAfter=2025-10-25... │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Save to SQLite                │
              │ + Update lastSyncedAt         │
              │ (sync.ts line 160-175)        │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Emit 'sync' event             │
              │ { sync: { pushed: 2 } }       │
              │ (main.ts line ~285)           │
              └───────────────┬───────────────┘
                              │
                              ║ IPC Event
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ BookingContext.tsx - Sync Listener (line 348)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ handleSyncUpdate()            │
              │ - Check throttle (2s)         │
              │ - Check if sync completed     │
              │ (lines 353-364)               │
              └───────────────┬───────────────┘
                              │
                              ▼ if sync completed
              ┌───────────────────────────────┐
              │ refreshBookings()             │
              │ → fetchBookingsPage()         │
              │ (line 362)                    │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Read from SQLite              │
              │ (includes newly synced data)  │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ UI auto-refreshes             │
              │ (new bookings appear)         │
              └───────────────────────────────┘
```

**Timeline Example:**
```
T+0ms     → Sync interval triggers (15s timer)
T+5ms     → pullBookings() reads lastSyncedAt: "2025-10-25T12:00:00Z"
T+10ms    → Backend query: GET /api/bookings?updatedAfter=2025-10-25T12:00:00Z
T+150ms   → Backend responds: 2 updated bookings
T+155ms   → Save to SQLite
T+160ms   → Update lastSyncedAt: "2025-10-25T12:15:00Z"
T+165ms   → Emit sync event: { sync: { pushed: 2 }, queueSize: 0 }
T+170ms   → BookingContext receives event
T+175ms   → Check throttle (OK, >2s since last refresh)
T+180ms   → refreshBookings() triggered
T+185ms   → SQLite IPC: listBookings()
T+200ms   → Bookings mapped (now includes 2 new bookings)
T+205ms   → setBookings() triggers React re-render
T+210ms   → Dashboard updates ✓ (new bookings visible)
```

---

## 🔄 Function Call Stack Reference

### Initial Bookings Fetch
```
BookingProvider (mount)
  └─ useEffect (line 336)
       ├─ fetchRooms() (line 227)
       │    └─ fetch('http://localhost:8080/api/bookings/rooms')
       │         └─ setRooms() (line 251)
       │
       ├─ fetchTaxRate() (line 257)
       │    └─ fetch('http://localhost:8080/api/settings/global_tax_rate')
       │         └─ setGlobalTaxRate() (line 271)
       │
       └─ refreshBookings() (line 325)
            └─ fetchBookingsPage(1, 10, 'startTime', 'desc')
                 └─ window.kgolf.listBookings() (line 131)
                      └─ [IPC] → main.ts → db.ts → SQLite query
                           └─ Map bookings (lines 140-159)
                                └─ Sort & paginate (lines 162-180)
                                     └─ setBookings() + setPagination (lines 182-187)
```

### Sync Event Auto-Refresh
```
Sync Interval (every 15s)
  └─ main.ts enqueuePullIfNotExists() (line ~277)
       └─ sync-queue.ts enqueue() (line ~40)
            └─ sync.ts pullBookings() (line 121)
                 ├─ Read lastSyncedAt from Metadata table (line 125)
                 ├─ Build URL: /api/bookings?updatedAfter={timestamp}
                 ├─ Fetch from backend (line 140)
                 ├─ Save to SQLite (line 160)
                 ├─ Update lastSyncedAt (line 175)
                 └─ Emit 'sync' event (main.ts line ~285)
                      └─ [IPC Event] → BookingContext useEffect (line 348)
                           └─ handleSyncUpdate() (line 353)
                                ├─ Check throttle (line 356)
                                ├─ Check if completed (line 364)
                                └─ refreshBookings() (line 362)
                                     └─ [Same as Initial Fetch above]
```

### Manual Refresh (User action)
```
DashboardPage
  └─ Button onClick
       └─ refreshBookings() (from context)
            └─ fetchBookingsPage(1, 10, 'startTime', 'desc')
                 └─ [Same IPC flow as Initial Fetch]
```

---

## 📦 Key Improvements from Refactor

### ✅ Removed
- **Legacy mock data** (initialRooms, initialBookings arrays - 200+ lines)
- **Duplicate useEffects** (consolidated 3 separate useEffects into 2)
- **Redundant fetchBookings wrapper** (still exists but simplified)
- **Verbose comments** (replaced with clear function documentation)
- **Inline type definitions** (moved to organized Types section)

### ✅ Added
- **File header documentation** explaining purpose and data flow
- **Organized sections** with clear separators (Types, Constants, Functions, Effects)
- **Consistent code formatting** (proper spacing, alignment)
- **Better function organization** (grouped by purpose: Fetch, Actions)
- **Constants extraction** (ROOM_COLORS, DEFAULT_TAX_RATE, SYNC_REFRESH_THROTTLE_MS)
- **Improved variable names** (`prev` instead of `bs`, `rs`)
- **Type safety improvements** (explicit Booking type cast)
- **Better error handling** (early returns, clear console messages)

### ✅ Preserved
- **All functionality** (no breaking changes)
- **API compatibility** (same exports and function signatures)
- **Auto-refresh logic** (sync event listener still works)
- **Offline-first architecture** (SQLite cache priority)
- **Optimistic updates** (local state updates before API calls)

---

## 🎯 How Each Booking Fetch Works

### Method 1: **Initial Load** (On Mount)
```tsx
// 1. Component mounts
<BookingProvider>
  <App />
</BookingProvider>

// 2. useEffect triggers (line 336)
useEffect(() => {
  fetchRooms();     // Get rooms from API
  fetchTaxRate();   // Get tax rate from API  
  refreshBookings(); // Get bookings from SQLite
}, []);

// 3. refreshBookings calls fetchBookingsPage
const refreshBookings = useCallback(async () => {
  await fetchBookingsPage(1, 10, 'startTime', 'desc');
}, [fetchBookingsPage]);

// 4. fetchBookingsPage reads from SQLite via IPC
const result = await window.kgolf?.listBookings();

// 5. Maps SQLite format → UI format
const mappedBookings = result.bookings.map((b: any) => ({
  id: b.id,
  customerName: b.customerName || 'Guest',
  roomName: room?.name || `Room ${b.roomId}`,
  // ... etc
}));

// 6. Sorts and paginates
const sorted = [...mappedBookings].sort(...);
const paginated = sorted.slice(startIdx, endIdx);

// 7. Updates React state → UI re-renders
setBookings(paginated);
```

**Data Source:** SQLite cache (populated by background sync)  
**Frequency:** Once per mount  
**Purpose:** Initial page load with latest cached data

---

### Method 2: **Auto-Refresh** (On Sync Complete)
```tsx
// 1. Sync interval triggers in main.ts (every 15s)
setInterval(() => {
  enqueuePullIfNotExists(); // Queues incremental sync
}, 15000);

// 2. Sync fetches new/updated bookings from backend
const lastSyncedAt = await getMetadata('bookings_lastSyncedAt');
const url = `${baseUrl}/api/bookings?updatedAfter=${lastSyncedAt}`;
const response = await fetch(url);

// 3. Saves to SQLite + updates timestamp
await db.run(`INSERT OR REPLACE INTO Booking ...`);
await setMetadata('bookings_lastSyncedAt', new Date().toISOString());

// 4. Emits 'sync' event via IPC
mainWindow.webContents.send('kgolf:sync-update', {
  sync: { pushed: 2 },
  queueSize: 0
});

// 5. BookingContext receives event (line 348)
useEffect(() => {
  const handleSyncUpdate = (payload: any) => {
    // Check throttle to avoid spam
    if (timeSinceLastRefresh < 2000) return;
    
    // Refresh if sync completed
    if (payload?.sync?.pushed > 0 || payload?.queueSize === 0) {
      refreshBookings(); // ← Triggers same flow as Method 1
    }
  };
  
  kgolf.onSync(handleSyncUpdate);
}, [refreshBookings]);
```

**Data Source:** SQLite cache (just updated by sync)  
**Frequency:** Every 15 seconds (when sync completes)  
**Purpose:** Keep UI in sync with backend changes  
**Throttle:** Max 1 refresh per 2 seconds

---

### Method 3: **Manual Refresh** (User Action)
```tsx
// User clicks refresh button in DashboardPage
<Button onClick={() => refreshBookings()}>
  Refresh
</Button>

// Uses same refreshBookings() from context
const { refreshBookings } = useBookingData();

// ↓ Same flow as Method 1
await fetchBookingsPage(1, 10, 'startTime', 'desc');
```

**Data Source:** SQLite cache  
**Frequency:** On-demand  
**Purpose:** User-initiated data refresh

---

### Method 4: **Pagination** (Page Change)
```tsx
// User clicks "Next Page" button
<Button onClick={() => fetchBookingsPage(page + 1)}>
  Next
</Button>

// Fetches from SQLite with new page/limit
await fetchBookingsPage(2, 10, 'startTime', 'desc');
//                      ↑ page 2

// Client-side pagination (lines 173-175)
const startIdx = (page - 1) * limit; // (2-1) * 10 = 10
const endIdx = startIdx + limit;     // 10 + 10 = 20
const paginated = sorted.slice(10, 20); // Items 10-19
```

**Data Source:** Same SQLite cache (re-sliced)  
**Frequency:** On page change  
**Purpose:** Navigate through large booking lists

---

## 📂 File Structure

```
BookingContext.tsx
├── Header Comment (Purpose, Data Flow)
├── Imports
├── Types & Interfaces
│   ├── Booking (lines 12-26)
│   ├── Room (lines 28-35)
│   ├── BookingsPagination (lines 37-42)
│   └── BookingContextValue (lines 44-67)
├── Context Creation (line 77)
├── Constants (lines 85-87)
├── Provider Component (line 93)
│   ├── State (lines 95-102)
│   ├── Fetch Functions
│   │   ├── fetchBookingsPage() (lines 113-194)
│   │   ├── fetchRooms() (lines 200-226)
│   │   └── fetchTaxRate() (lines 232-256)
│   ├── Action Functions
│   │   ├── updateBookingStatus() (lines 267-269)
│   │   ├── updateRoomStatus() (lines 271-287)
│   │   ├── updateGlobalTaxRate() (lines 289-313)
│   │   ├── getBookingById() (lines 315-318)
│   │   └── refreshBookings() (lines 320-323)
│   ├── Effects
│   │   ├── Initial fetch (lines 333-341)
│   │   └── Sync listener (lines 347-374)
│   └── Provider Return (lines 381-398)
└── Hook Export (lines 405-411)
```

---

## 🎨 Benefits of Refactored Structure

### 1. **Better Readability**
- Clear section separators (`===` lines)
- Logical grouping (Types → State → Functions → Effects)
- Consistent naming conventions

### 2. **Easier Maintenance**
- All constants in one place
- Functions grouped by purpose
- Clear documentation at top of file

### 3. **Better Performance**
- Removed unused mock data (faster parsing)
- Consolidated useEffects (fewer effect runs)
- Proper dependency arrays

### 4. **Type Safety**
- Explicit type imports
- Proper TypeScript interfaces
- No implicit any types

### 5. **Developer Experience**
- Comments explain "why" not "what"
- Function JSDoc describes purpose
- Clear data flow documentation

---

## 🔍 Debugging Guide

### Check Booking Fetch Status
```tsx
// Add console.time in BookingContext.tsx
console.time('fetchBookingsPage');
const result = await window.kgolf?.listBookings();
console.timeEnd('fetchBookingsPage');
// Output: fetchBookingsPage: 15.234ms
```

### Verify Sync is Working
```bash
# Check SQLite has data
cd pos/apps/electron
sqlite3 data/pos.sqlite "SELECT COUNT(*) FROM Booking;"

# Check last sync time
sqlite3 data/pos.sqlite "SELECT value FROM Metadata WHERE key='bookings_lastSyncedAt';"
```

### Monitor Sync Events
```tsx
// In BookingContext.tsx handleSyncUpdate:
console.log('[BOOKING_CTX] Sync event:', {
  pushed: payload?.sync?.pushed,
  queueSize: payload?.queueSize,
  timeSinceLastRefresh
});
```

### Test Auto-Refresh
```bash
# Update a booking in backend
curl -X PUT http://localhost:8080/api/bookings/123 \
  -H "Content-Type: application/json" \
  -d '{"status":"COMPLETED"}'

# Wait 15 seconds → Should see auto-refresh in console
# [BOOKING_CTX] 🔄 Sync completed, refreshing bookings...
```

---

## 🚀 Future Improvements

1. **Virtualized Lists**: For 1000+ bookings, use react-window for better performance
2. **Search/Filter**: Add search bar and filter options (by room, status, date range)
3. **Optimistic UI**: Show pending changes immediately with loading states
4. **Error Boundaries**: Add error handling for failed fetches
5. **Retry Logic**: Auto-retry failed syncs with exponential backoff
6. **Conflict Resolution**: Handle concurrent edits from multiple POS terminals

---

## 📝 Summary

The refactored `BookingContext.tsx` provides a clean, maintainable, and performant state management solution for the POS booking system. It combines:

- **Offline-first architecture** (SQLite cache)
- **Auto-sync** (every 15s with incremental updates)
- **Real-time updates** (sync event listener)
- **Efficient data flow** (IPC for local reads, REST for backend sync)
- **Type safety** (TypeScript interfaces)
- **Developer-friendly** (clear structure, good comments)

All booking fetches ultimately read from the **same SQLite cache**, ensuring consistency and offline capability. The background sync keeps the cache up-to-date with the backend.
