# POS Dashboard API Polling Behavior

**Date:** November 23, 2025  
**Component:** `frontend/src/pages/pos/dashboard.tsx`

---

## Current Behavior

### API Data Loading

**Frequency:** **EVERY 5 SECONDS** (automatic polling)

The dashboard loads data from the API on mount and then polls every 5 seconds:

```typescript
useEffect(() => {
  loadData(true);      // Initial: Fetch bookings + rooms with loading spinner
  loadTaxRate();       // Fetch global tax rate
  
  // Poll for updates every 5 seconds (without loading spinner)
  const pollInterval = setInterval(() => {
    loadData(false);
  }, 5000);
  
  return () => clearInterval(pollInterval);
}, []); // Empty dependency array = runs once on mount
```

### What Gets Loaded

**`loadData()` function fetches:**
- All bookings via `listBookings()` → `GET /api/bookings`
- All rooms via `listRooms()` → `GET /api/bookings/rooms`

**Console Output:**
```
[POS API] Loaded 10 bookings
[POS API] Loaded 4 rooms
[POS Dashboard] Loaded 10 bookings and 4 rooms
```

---

## Refresh Behavior

### Automatic Refresh
**✅ AUTOMATIC POLLING ENABLED**

The data is automatically refreshed every 5 seconds:
1. Initial page load (with loading spinner)
2. Every 5 seconds (background refresh, no loading spinner)
3. After user actions (Complete/Cancel booking, Update room status)

### Manual Refresh Triggers

Data is reloaded **only** when user performs an action:

1. **Complete a booking** → calls `loadData()` after status update
2. **Cancel a booking** → calls `loadData()` after status update
3. **Update room status** → calls `loadData()` after room update

```typescript
async function updateBookingStatus(id: string, status: string) {
  try {
    await apiUpdateBookingStatus(id, status);
    await loadData(); // Manual refresh after action
  } catch (err) {
    // ...
  }
}
```

---

## UI Real-Time Updates

### Clock (Every Second)
```typescript
useEffect(() => {
  const timer = setInterval(() => setCurrentTime(new Date()), 1000);
  return () => clearInterval(timer);
}, []);
```

**Updates:** Current time display (clock in header)  
**Frequency:** Every 1 second  
**Network Activity:** NONE (client-side only)

---

## Log Frequency Summary

| Log Message | Frequency | Trigger |
|-------------|-----------|---------|
| `[POS API] API_BASE: http://localhost:8080` | Once per session | Module load |
| `[POS API] Loaded X bookings` | Every 5 seconds | Automatic polling |
| `[POS API] Loaded X rooms` | Every 5 seconds | Automatic polling |
| `[POS Dashboard] Loaded X bookings and X rooms` | Every 5 seconds | Automatic polling |

**Bottom Line:** The `[POS API] Loaded` logs appear:
- **Once** when you first load the dashboard (initial load)
- **Every 5 seconds** automatically (background polling)
- **Immediately** after user actions (Complete/Cancel booking, Room update)

**Note:** Polling continues as long as the dashboard page is open.

---

## Comparison with Electron POS

### Electron POS
- Uses local SQLite database
- Has sync queue that polls backend periodically
- Shows real-time updates from sync process

### Web POS (Current)
- Direct API calls with 5-second polling
- Background refresh without UI interruption
- Updates on user actions (immediate refresh)
- Real-time display for multi-device scenarios

**Implementation:**
```typescript
useEffect(() => {
  loadData(true); // Initial load with spinner
  
  const pollInterval = setInterval(() => {
    loadData(false); // Poll every 5 seconds without spinner
  }, 5000);
  
  return () => clearInterval(pollInterval);
}, []);
```

**Pros:** 
- Simple implementation
- Near real-time updates (5-second delay)
- Works for multi-device scenarios
- No loading spinner flash during polling

**Cons:** 
- 12 API calls per minute per device
- Not true real-time (5-second lag)

---

## Future Considerations

### Option 1: Adjust Polling Interval
Current: 5 seconds (12 calls/min)
- Increase to 10s for less load (6 calls/min)
- Increase to 30s for minimal load (2 calls/min)
- Decrease to 3s for more real-time (20 calls/min)

### Option 2: WebSocket (Advanced)
```typescript
// Real-time updates via WebSocket
const ws = new WebSocket('ws://localhost:8080/pos');
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  // Update specific booking/room without full reload
};
```

**Pros:** True real-time, efficient  
**Cons:** Backend implementation needed, more complex

### Option 3: Manual Refresh Button
```typescript
<button onClick={loadData}>Refresh Data</button>
```

**Pros:** User control, no automatic load  
**Cons:** User must remember to refresh

---

## Recommendation

**✅ Current implementation (5-second polling) is suitable for:**
- Multi-device POS scenarios (multiple tablets/staff)
- Busy environments where bookings change frequently
- Real-time room status visibility

**Trade-offs:**
- Server load: 12 API calls per minute per device (manageable for <10 devices)
- Network: ~2-5KB per poll (minimal bandwidth usage)
- Battery: Slightly higher consumption on mobile devices

**When to adjust:**
- If server load becomes an issue → increase interval to 10-30 seconds
- If true real-time is critical → implement WebSocket
- If single device only → can increase to 30-60 seconds
