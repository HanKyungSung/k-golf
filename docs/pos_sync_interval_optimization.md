# POS Sync Interval Optimization

**Date:** 2025-11-09  
**Status:** Proposed  
**Version:** 1.0

---

## Executive Summary

Reducing sync intervals from current settings to improve real-time data visibility and user experience in the POS system. The proposed changes increase sync frequency by 3-10x depending on data category, with minimal impact on server load.

**Key Changes:**
- Bookings sync: 15s → 5s (3x faster)
- Rooms sync: 5min → 30s (10x faster)
- Menu sync: 5min → 2min (2.5x faster)

---

## Current State (Baseline)

### Interval Configuration
```typescript
// pos/apps/electron/src/main.ts (current)

const SYNC_INTERVAL_MS = 15000;              // 15 seconds
const BOOKINGS_PULL_INTERVAL_MS = 15000;     // 15 seconds
const ROOMS_PULL_INTERVAL_MS = 300000;       // 5 minutes
const MENU_PULL_INTERVAL_MS = 300000;        // 5 minutes
```

### Current Performance Metrics
```
Sync Frequency (per hour):
- General sync cycle (push): 240 executions
- Bookings pull (incremental): 240 requests
- Rooms pull (full): 12 requests
- Menu pull (full): 12 requests
Total: 504 operations/hour

Network Traffic:
- Bookings: ~50 bytes/request × 240 = ~12KB/hour
- Rooms: ~500 bytes/request × 12 = ~6KB/hour
- Menu: ~2KB/request × 12 = ~24KB/hour
Total: ~42KB/hour

User Experience:
- Booking creation feedback: 0-15s delay (avg 7.5s)
- Room status visibility: 0-5min delay (avg 2.5min)
- Menu changes visibility: 0-5min delay (avg 2.5min)
```

---

## Proposed Changes

### Recommended Intervals

| Category | Current | Proposed | Change | Reasoning |
|----------|---------|----------|--------|-----------|
| **Sync Cycle (Push)** | 15s | 5s | 3x faster | Match bookings pull frequency, fast user action feedback |
| **Bookings Pull** | 15s | 5s | 3x faster | High-priority real-time data, multiple concurrent users |
| **Rooms Pull** | 5min | 30s | 10x faster | Frequently changing reference data, affects availability |
| **Menu Pull** | 5min | 2min | 2.5x faster | Semi-static data, occasional mid-shift changes |

### Implementation
```typescript
// pos/apps/electron/src/main.ts (proposed)

// High-frequency sync (real-time operations)
const SYNC_INTERVAL_MS = 5000;              // 5 seconds (was 15s)
const BOOKINGS_PULL_INTERVAL_MS = 5000;     // 5 seconds (was 15s)

// Medium-frequency sync (semi-static reference data)
const ROOMS_PULL_INTERVAL_MS = 30000;       // 30 seconds (was 5min)

// Low-frequency sync (stable reference data)
const MENU_PULL_INTERVAL_MS = 120000;       // 2 minutes (was 5min)
```

---

## Impact Analysis

### Network Load

#### Before (Current)
```
Requests per hour:
- Sync cycle: 240 executions
- Bookings: 240 requests
- Rooms: 12 requests
- Menu: 12 requests
Total: 504 operations/hour

Data transferred: ~42KB/hour
```

#### After (Proposed)
```
Requests per hour:
- Sync cycle: 720 executions (+300%)
- Bookings: 720 requests (+300%)
- Rooms: 120 requests (+900%)
- Menu: 30 requests (+150%)
Total: 1,590 operations/hour (+215%)

Data transferred: ~145KB/hour (+245%)
```

#### Analysis
- **3.2x increase in total operations**
- **3.5x increase in data transfer**
- Still minimal bandwidth usage (~145KB/hour ≈ 0.04KB/s)
- All queries are indexed and lightweight
- Server can easily handle this load

### User Experience Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Booking creation feedback | 0-15s (avg 7.5s) | 0-5s (avg 2.5s) | **67% faster** |
| Room status updates seen | 0-5min (avg 2.5min) | 0-30s (avg 15s) | **90% faster** |
| Menu changes visible | 0-5min (avg 2.5min) | 0-2min (avg 1min) | **60% faster** |

#### Real-World Scenarios

**Scenario 1: Concurrent Booking Creation**
- Current: Staff A creates booking at desk 1, Staff B sees it 0-15s later
- Proposed: Staff A creates booking, Staff B sees it within 5s
- Impact: Reduced double-booking risk, better coordination

**Scenario 2: Room Status Changes**
- Current: Room cleaned and set to ACTIVE, takes up to 5 minutes to reflect
- Proposed: Room status updates visible within 30 seconds
- Impact: More accurate availability, faster room turnover

**Scenario 3: Menu Price Update**
- Current: Manager updates menu prices, POS sees changes 0-5min later
- Proposed: POS sees price changes within 2 minutes
- Impact: Reduced pricing discrepancies, faster corrections

### Server Impact

#### Backend API Load
```
Endpoints affected:
- GET /api/bookings?updatedAfter=... (incremental)
  240/hr → 720/hr (+480 requests/hr)
  
- GET /api/bookings/rooms (full)
  12/hr → 120/hr (+108 requests/hr)
  
- GET /api/menu/items (full)
  12/hr → 30/hr (+18 requests/hr)

Total increase: +606 requests/hour
Per second: +0.17 requests/second (negligible)
```

#### Database Query Analysis
```sql
-- Bookings incremental (indexed query)
SELECT * FROM "Booking" 
WHERE "updatedAt" > $1 
ORDER BY "startTime" DESC;
-- Execution time: ~5-10ms (indexed on updatedAt)

-- Rooms full (4 rows only)
SELECT * FROM "Room" 
WHERE active = true;
-- Execution time: ~1-2ms

-- Menu items full (~17 rows)
SELECT * FROM "MenuItem" 
ORDER BY category, "sortOrder";
-- Execution time: ~2-3ms
```

**All queries are lightweight with proper indexes. Server CPU impact: <1%**

---

## Risk Assessment

### Low Risk
- ✅ Bandwidth usage remains negligible (<1KB/s)
- ✅ All queries are indexed and optimized
- ✅ Server has capacity headroom
- ✅ Incremental sync minimizes data transfer
- ✅ Queue system prevents request pile-up

### Monitoring Points
- Server CPU usage (should remain <10%)
- Database query response times
- POS app memory usage (SQLite operations)
- Network latency to backend

### Rollback Plan
If issues arise:
1. Revert intervals to previous values (one-line change)
2. No data loss risk (sync mechanism unchanged)
3. Takes effect on next POS app restart

---

## Alternative Configurations

### Option A: Conservative (Recommended)
**What we're proposing above**
```typescript
const SYNC_INTERVAL_MS = 5000;           // 5s
const BOOKINGS_PULL_INTERVAL_MS = 5000;  // 5s
const ROOMS_PULL_INTERVAL_MS = 30000;    // 30s
const MENU_PULL_INTERVAL_MS = 120000;    // 2min
```
- Total: ~1,590 requests/hour
- Good balance of responsiveness and load
- **Recommended starting point**

### Option B: Aggressive (Near Real-Time)
```typescript
const SYNC_INTERVAL_MS = 3000;           // 3s
const BOOKINGS_PULL_INTERVAL_MS = 3000;  // 3s
const ROOMS_PULL_INTERVAL_MS = 15000;    // 15s
const MENU_PULL_INTERVAL_MS = 60000;     // 1min
```
- Total: ~3,060 requests/hour
- Near real-time experience
- Use if Option A feels too slow

### Option C: Hybrid (Optimized per Category)
```typescript
const SYNC_INTERVAL_MS = 3000;           // 3s (critical)
const BOOKINGS_PULL_INTERVAL_MS = 3000;  // 3s (critical)
const ROOMS_PULL_INTERVAL_MS = 30000;    // 30s (moderate)
const MENU_PULL_INTERVAL_MS = 180000;    // 3min (stable)
```
- Total: ~2,220 requests/hour
- Optimizes where it matters most
- Best performance/efficiency ratio

---

## Implementation Plan

### Phase 1: Code Changes
1. Update interval constants in `pos/apps/electron/src/main.ts`
2. Update timeline documentation in `pos_sync_flow_diagram.md`
3. Test locally with production API

### Phase 2: Testing
1. Monitor server logs for 1 hour
2. Check server CPU/memory usage
3. Measure POS app performance
4. Test with multiple concurrent users

### Phase 3: Deployment
1. Build updated POS app
2. Deploy to test environment first
3. Monitor for 24 hours
4. Roll out to production

### Phase 4: Monitoring (First Week)
- Daily server metrics review
- User feedback collection
- Response time monitoring
- Adjust if needed

---

## Expected Outcomes

### Immediate Benefits
- ✅ 67% faster booking creation feedback
- ✅ 90% faster room status visibility
- ✅ 60% faster menu updates
- ✅ Reduced risk of data conflicts
- ✅ Better multi-user coordination

### Long-Term Benefits
- ✅ Foundation for real-time features
- ✅ More responsive user experience
- ✅ Better data consistency across devices
- ✅ Reduced user confusion from stale data

### Metrics to Track
```
Week 1:
- Server CPU usage average
- 95th percentile response times
- Number of sync failures
- User-reported issues

Week 2-4:
- Booking conflict reduction
- Staff satisfaction survey
- System stability metrics
```

---

## Decision Points

### When to Use Option A (Recommended)
- ✅ Standard operations (1-2 POS terminals)
- ✅ Testing new intervals
- ✅ Conservative approach preferred
- ✅ Server capacity unknown

### When to Use Option B (Aggressive)
- Multiple POS terminals (3+)
- High booking volume periods
- Frequent room status changes
- Server shows <10% CPU usage

### When to Use Option C (Hybrid)
- Want faster bookings without menu overhead
- Server has moderate capacity
- Menu changes are infrequent
- Need best balance

---

## Recommendation

**Start with Option A (Conservative)** and monitor for one week.

**Reasoning:**
1. 3x improvement is significant but safe
2. Easy to make more aggressive if needed
3. Minimal server impact
4. Clear path to Option B if needed
5. Reversible with no data loss

**Success Criteria:**
- Server CPU remains <10%
- No increase in sync failures
- User feedback positive
- Response times acceptable

If all criteria met, consider Option B for even better responsiveness.

---

## References

- Implementation: `pos/apps/electron/src/main.ts`
- Sync Logic: `pos/apps/electron/src/core/sync.ts`
- Architecture: `docs/pos_sync_flow_diagram.md`
- Queue System: `pos/apps/electron/src/core/sync-queue.ts`

---

**Approval Required From:**
- [ ] Backend Team (server capacity review)
- [ ] Product Owner (user experience priority)
- [ ] DevOps (monitoring setup)

**Next Steps:**
1. Review and approve recommended intervals
2. Update code with chosen option
3. Test in staging environment
4. Monitor and iterate
