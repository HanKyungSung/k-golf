# POS Hub Execution Tasks (Incremental Checklist)

This file is the actionable slice of the broader plan in `pos/README.md`.
Mark items as you complete them. Keep commits small (1–2 checklist items each).

Legend: [ ] pending  [~] in progress  [x] done

---
<!-- Consolidated: Former Phases 0.12–0.16 merged into existing Phase 0 & Backlog categories -->
### 0.6b Admin Dashboard & Booking Detail (Base UI) – Completed
[x] Tabs (Bookings / Rooms / Weekly Calendar / Timeline) switch content
[x] Booking list row click → navigate `/booking/:id`
[x] Booking list status buttons (Complete / Cancel / Reset)
[x] Room status select (updates in‑memory state)
[x] Weekly Calendar week navigation (Prev / Next)
[x] Timeline week navigation (Prev / Next)
[x] Timeline booking block click → detail navigation
[x] Booking Detail actions (Back / Complete / Cancel / Restore)

### 0.6c Booking Detail Ordering + Menu Management (Local Mock) – Completed
[x] Booking Detail: Local menu mock (12 items across 4 categories)
[x] Booking Detail: Category toggle & scrollable list
[x] Booking Detail: Add item → increment quantity if existing
[x] Booking Detail: Update quantity (± buttons) & remove item
[x] Booking Detail: Receipt panel with subtotal, tax, grand total (room + items)
[x] Booking Detail: Print-friendly styles (media print) & print action
[x] Booking Detail: Clear order button (local state reset)
[x] Dashboard: Menu tab button navigates to `/menu`
[x] Route: `/menu` protected route registered in `App.tsx`
[x] Menu Management Page: Filters (category/all) & search
[x] Menu Management Page: Create item form (name, description, price, category, availability)
[x] Menu Management Page: Edit existing item (prefill & save)
[x] Menu Management Page: Delete with confirmation overlay
[x] Menu Management Page: Toggle availability inline
[x] Menu Management Page: Basic stats (total, available, unavailable, avg price)
[x] Menu Management Page: Duplicated UI primitives reused (pending unification)
[x] Tasks file updated with new section & follow-ups

### 0.6e Advanced POS Booking Detail with Seat Management – Completed
[x] Seat Management System: Dynamic 1-4 seat configuration with visual indicators
[x] Order Operations: Add items to specific seats via modal dialog
[x] Order Operations: Move items between seats
[x] Order Operations: Split item costs evenly across multiple seats
[x] Order Operations: Quantity controls (+ / -) per item
[x] Order Operations: Delete items from orders
[x] Per-Seat Billing: Individual subtotals, tax (8%), and totals for each seat
[x] Per-Seat Billing: Grand total (all seats + room booking fee)
[x] Print Functionality: Print individual seat receipts
[x] Print Functionality: Print complete order (all seats)
[x] Print Functionality: Professional K-Golf branded receipt layout
[x] Data Persistence: localStorage saves orders per booking ID
[x] Data Persistence: localStorage saves seat configuration per booking ID
[x] Data Persistence: Auto-loads on page refresh
[x] UI Components: Dialog modal system for seat selection and operations
[x] UI Components: Separator component for visual clarity
[x] UI Components: Enhanced Button with size (sm/md/lg) and variant (default/outline/ghost)
[x] UI Components: Full Tabs system for menu categories
[x] UI Components: Custom SVG icons (no external lucide-react dependency)
[x] Menu System: 4 categories (Food, Drinks, Appetizers, Desserts)
[x] Menu System: 12 mock menu items for testing
[x] Menu System: Tabbed interface for easy navigation
[x] Fixed Tabs component prop passing (activeValue/setActiveValue)
[x] Removed broken icon components from action buttons (Move/Split/Delete)
[x] Documentation: Comprehensive implementation guide in docs/pos_booking_detail_enhancement.md

**Acceptance (0.6e Advanced POS Booking Detail)** – VERIFIED
[x] Seat Configuration: Adjust seats 1-4; each seat has distinct color (blue/green/purple/orange)
[x] Add to Seat: Click menu item → modal shows → select seat → item appears in that seat's section
[x] Move Items: Click Move button → select destination seat → item transfers with all properties
[x] Split Cost: Click Split → select 2+ seats → cost divided evenly (e.g., $12 item → $6 each for 2 seats)
[x] Quantity Update: +/- buttons work; removing all quantity deletes item
[x] Delete Item: Delete button removes item immediately
[x] Per-Seat Totals: Each seat shows subtotal, tax, and total accurately
[x] Grand Total: Sum of all seats + room booking fee displays correctly
[x] Print Seat: Print Seat X button → only that seat's items appear in print preview
[x] Print All: Print All button → all seats and grand total appear in print preview
[x] Print Layout: K-Golf branding, business info, booking ID, timestamp visible
[x] Persistence: Refresh page → orders and seat configuration restored from localStorage
[x] Menu Tabs: Clicking Food/Drinks/Appetizers/Desserts switches visible menu items
[x] Menu Display: All 12 menu items display correctly across 4 categories
[x] No Errors: TypeScript compilation clean; no runtime errors in console
[x] Button Icons: Move/Split/Delete buttons show text only (no broken icon rendering)

**Implementation Details:**
- Seat Colors: Seat 1=blue, Seat 2=green, Seat 3=purple, Seat 4=orange (bg-{color}-500)
- OrderItem Type: `{ id: string, menuItem: MenuItem, quantity: number, seat?: number, splitPrice?: number }`
- Split Logic: Creates N new OrderItem instances (one per selected seat) with splitPrice = original / N
- localStorage Keys: `booking-{id}-orders`, `booking-{id}-seats`
- Print Media Queries: `.no-print` hides UI elements; `.print-only` shows headers/footers
- Tax Rate: 8% (configurable in calculateSeatTax functions)
- Max Seats: 4 (matches typical golf simulator bay capacity)
- Icon Solution: Inline SVG components (no lucide-react dependency)

Follow‑Ups (Post 0.6c)
[x] Unify UI primitives (Card/Badge/Button/etc.) into shared module
[ ] Introduce `MenuProvider` (context) to share menu + order state across pages
[ ] Persist menu + orders to SQLite via IPC (define schema: Product, Order, OrderItem)
[ ] Integrate order persistence with Booking Detail (associate order with booking id)
[ ] Menu item category CRUD (create new categories, reorder)
[ ] Bulk availability toggle & multi-select actions
[ ] Price history / audit (track previous prices)
[ ] Drag to reorder items within category (affects `displayOrder` column)
[ ] Keyboard + ARIA support for category toggles & item actions
[ ] Advanced print layout (receipt header/footer config, optional logo override)
[ ] Export menu to CSV / PDF
[ ] Cost-of-goods fields (optional) and margin display in stats
[ ] Toast notifications (create/update/delete item, print success)
[ ] Optimistic updates + rollback on failure once persistence exists
[ ] Merge booking receipt + order print into unified template component
[ ] Unit tests: add/edit/delete menu item reducers / helpers
[ ] E2E smoke: create item → appears in Booking Detail category list without reload (once shared provider added)

### 0.6f Global Tax Rate Management with PostgreSQL Backend – Completed
[x] Database Schema: Create Setting table with key-value store pattern
[x] Database Schema: Fields include key, value, value_type, description, category, is_public, timestamps, updated_by
[x] Database Schema: Foreign key to User table for audit trail (who changed settings)
[x] Database Migration: Create migration file for Setting table
[x] Database Migration: Seed default global_tax_rate setting (8%)
[x] Database Migration: Follow naming convention (Setting vs settings)
[x] Prisma Schema: Add Setting model with proper relations
[x] Prisma Schema: Map field names (value_type, is_public, etc.) to database columns
[x] Prisma Client: Regenerate with Setting model
[x] Backend API: GET /api/settings - List all settings (admin: all, others: public only)
[x] Backend API: GET /api/settings/:key - Get specific setting (public settings accessible without auth)
[x] Backend API: PUT /api/settings/:key - Update setting (admin only)
[x] Backend API: POST /api/settings - Create new setting (admin only)
[x] Backend API: DELETE /api/settings/:key - Delete setting (admin only)
[x] Backend API: Helper functions for type parsing (string/number/boolean/json)
[x] Backend API: Validation for tax rate (0-100% range)
[x] Backend Server: Register /api/settings route
[x] Frontend Context: Add globalTaxRate state to BookingContext
[x] Frontend Context: Initialize from localStorage (offline support)
[x] Frontend Context: Fetch from API on mount (API value wins)
[x] Frontend Context: Update localStorage when API responds
[x] Frontend Context: updateGlobalTaxRate syncs to backend API
[x] Frontend Context: Optimistic updates (instant UI response)
[x] Frontend Context: Detailed console logging for debugging
[x] Dashboard UI: Add "Tax Settings" tab to admin dashboard
[x] Dashboard UI: Display current global tax rate prominently
[x] Dashboard UI: Input field for updating tax rate (0-100%, decimal support)
[x] Dashboard UI: Quick-select buttons for common rates (0%, 5%, 8%, 10%, 13%, 15%, 20%, 25%)
[x] Dashboard UI: Save button with validation and feedback
[x] Dashboard UI: Success/error messages with auto-dismiss
[x] Dashboard UI: Sync input field when globalTaxRate changes (useEffect)
[x] Booking Detail: Add bookingTaxRate state for per-booking overrides
[x] Booking Detail: Load booking-specific tax rate from localStorage
[x] Booking Detail: Calculate effectiveTaxRate (booking override || global default)
[x] Booking Detail: Update calculateSeatTax to use effectiveTaxRate
[x] Booking Detail: Update calculateTax to use effectiveTaxRate
[x] Booking Detail: Display dynamic tax rate in receipts (not hardcoded 8%)
[x] Booking Detail: Add Edit icon next to tax display
[x] Booking Detail: Add tax edit dialog for per-booking customization
[x] Booking Detail: Badge showing "Custom" vs "Global" tax rate status
[x] Booking Detail: Quick-select buttons for common rates in dialog
[x] Booking Detail: Reset to global rate button (clears localStorage override)
[x] Booking Detail: Persist booking-specific tax rate to localStorage (booking-{id}-taxRate)
[x] Booking Detail: Hide edit button in print view (.no-print class)

**Acceptance (0.6f Tax Rate Management)** – VERIFIED
[x] Database: Setting table exists with correct schema
[x] Database: global_tax_rate seeded with value 8, type number, public true
[x] Database: Can query "SELECT * FROM Setting" successfully
[x] Backend API: curl http://localhost:8080/api/settings/global_tax_rate returns data without auth
[x] Backend API: PUT request with valid auth updates tax rate in database
[x] Backend API: Private settings require authentication
[x] Frontend: POS app fetches tax rate from API on startup
[x] Frontend: Console shows "[BOOKING_CTX] ✅ Loaded tax rate from API: 8"
[x] Frontend: localStorage syncs with API value automatically
[x] Dashboard: Tax Settings tab displays current rate correctly
[x] Dashboard: Changing tax rate updates UI immediately (optimistic)
[x] Dashboard: Tax rate change syncs to backend API in background
[x] Dashboard: Success message appears after successful save
[x] Dashboard: Input field updates when globalTaxRate changes
[x] Dashboard: Quick-select buttons set rate instantly
[x] Booking Detail: Tax rate displays correct percentage (dynamic)
[x] Booking Detail: Edit button opens tax rate dialog
[x] Booking Detail: Can set custom tax rate for individual booking
[x] Booking Detail: Badge shows "Custom" when override active
[x] Booking Detail: Badge shows "Global" when using default rate
[x] Booking Detail: Reset button clears override, returns to global
[x] Booking Detail: Tax calculations use correct rate (custom or global)
[x] Booking Detail: Per-seat tax calculations accurate
[x] Booking Detail: Grand total reflects correct tax rate
[x] Offline Mode: Tax rate persists in localStorage if API unavailable
[x] Multi-Device: Changing rate on Device A reflects on Device B after refresh

**Implementation Details:**
- Database Table: "Setting" (PascalCase, follows User/Room/Booking convention)
- Storage Keys: 'global-tax-rate' (global), 'booking-{id}-taxRate' (per-booking)
- API Endpoints: /api/settings, /api/settings/:key (GET public, PUT/POST/DELETE admin only)
- Type Safety: Prisma schema enforces types; API validates 0-100% range
- Audit Trail: updated_by field tracks which user changed settings
- Offline Support: localStorage provides fallback; API syncs when available
- Optimistic UI: Immediate local updates; background API sync
- Multi-Device Sync: All devices fetch from shared PostgreSQL database
- Value Types: 'number', 'string', 'boolean', 'json' (extensible for future settings)
- Public Access: is_public flag allows unauthenticated access to specific settings
- Tax Calculation: effectiveTaxRate = bookingTaxRate ?? globalTaxRate
- Print Friendly: Edit button hidden via .no-print CSS class

Follow‑Ups (Post 0.6f) – Tax & Settings Enhancements
[ ] Add custom_tax_rate column to Booking table (replace localStorage)
[ ] Sync booking-specific tax rates to database via API
[ ] Settings audit log table (track all changes with old/new values, timestamp, user, IP)
[ ] Setting categories management (group related settings)
[ ] Setting validation rules (min/max, regex, custom validators)
[ ] Setting dependencies (e.g., enable_tax requires tax_rate > 0)
[ ] Setting search and filtering in admin UI
[ ] Setting import/export (backup/restore configuration)
[ ] Setting change notifications (alert admins of critical changes)
[ ] Tax rate history chart (visualize changes over time)
[ ] Per-room tax rates (different rates for different room types)
[ ] Tax exemption flags for bookings (non-profit, promotional)
[ ] Multiple tax types (sales tax, service charge, etc.)
[ ] Tax calculation preview (show before/after in UI)
[ ] Webhook notifications when settings change
[ ] Settings cache layer (Redis) for high-performance reads
[ ] Settings versioning (rollback to previous values)
[ ] Settings A/B testing support (feature flags)

Follow‑Ups (Post 0.6e) – Advanced POS Features
[ ] Backend Integration: Replace mock menu with database-backed menu items
[ ] Backend Integration: Persist orders to database (Order, OrderItem tables)
[ ] Backend Integration: Link orders to bookings via foreign key
[ ] Payment Processing: Add payment gateway integration for order checkout
[ ] Order History: Display historical orders for completed bookings
[ ] Kitchen Display: Send order to kitchen management system (KDS)
[ ] Analytics: Track popular items, revenue per seat, average order value
[ ] Discounts/Promotions: Add coupon codes and promotional pricing
[ ] Multi-Currency: Support international payments (USD, KRW, etc.)
[ ] SMS/Email Receipts: Send digital receipts to customers
[ ] Inventory Management: Track stock levels and low-stock alerts
[ ] Combo/Bundle Pricing: Special pricing for item combinations
[ ] Modifiers/Add-ons: Customization options (extra toppings, size upgrades)
[ ] Tax Configuration: Support different tax rates per jurisdiction
[ ] Tip/Gratuity: Add optional tip calculation to receipts
[ ] Void/Refund: Admin ability to cancel orders and issue refunds
[ ] Order Notes: Allow special instructions per item (allergies, preferences)
[ ] Table Service: Integrate with table/bay management system
[ ] Happy Hour Pricing: Time-based dynamic pricing rules

## Phase 0 – Scaffolding (Target: Minimal Push-Only Working Prototype)

### 0.1 Workspace & Dependencies
[x] Confirm `pos` is part of root workspaces (root package.json)  
[x] Run: `npm install` at repo root (installs electron deps)  
[x] Add / verify deps in `pos/apps/electron/package.json`: electron, better-sqlite3, uuid, axios, electron-log, keytar, typescript, ts-node  

### 0.2 Core Structure
[x] Create `src/core/` folder (db.ts, outbox.ts, sync.ts, auth.ts stubs)  
[x] Add `tsconfig.build.json` (output to `dist/`)  
[x] Verify `npm run dev:pos:electron` (or local script) launches Electron window  

### 0.3 Database Init
[x] Implement `initDb()` in db.ts: open `data/pos.sqlite`, enable WAL, create tables (meta, bookings, outbox)  
[x] Call `initDb()` early in `main.ts` before window creation  
[x] Acceptance: file `data/pos.sqlite` exists after startup (verified via dev run + verify:db script)

### 0.4 Enqueue (Local Create Only)
[x] Implement `enqueueBooking()` (inserts into bookings + outbox)  
[x] IPC handler `booking:create` → calls enqueue  
[x] Renderer temporary button triggers IPC  
[x] Acceptance: clicking button increases count in `outbox` table (verified via sqlite3)

### 0.5 Auth (Moved Earlier – Minimal Required for Protected Endpoints)
[x] Implement `login(email,password)` → POST `/api/auth/login`; capture access (session cookie)  
[x] Store refresh token (keytar) & access token (memory) (refresh persistence scaffolded; currently session-cookie based)  
[x] IPC: `auth:login`, `auth:getStatus`, `auth:logout`  
[x] Preload: expose `login()`, `logout()`, auth status events  
[x] Startup silent session check (`/api/auth/me`) sets authenticated state if valid  
[x] Booking & sync actions not rendered until authenticated (dashboard withheld pre-auth)  
[x] Emit auth state changes to renderer  

**Acceptance (0.5 Auth)**
[x] Fresh start: only login page visible; no dashboard action buttons (`Test Booking`, `Force Sync`, `Logout`) exist in DOM.
[x] Successful login: login page replaced by dashboard; action buttons become visible; AuthProvider state (React DevTools → AuthProvider first state hook) becomes `{ authenticated: true, user }`. Optional: `[AUTH][EMIT]` log appears if DEBUG auth logging enabled.
[x] App restart with still-valid session cookie: within ~1s AuthProvider state auto-populates authenticated user (silent `/api/auth/me`), dashboard renders without manual login.
[x] Invalid credentials: inline error message appears (no dashboard mount / no transient authenticated flash in DevTools state timeline).
[x] Logout: AuthProvider state resets to `{ authenticated:false }`; dashboard unmounts; only login page visible.
[x] Security: No refresh/access tokens or user object properties leak on `window` (inspect window keys in DevTools console; only `window.kgolf`).


### 0.6 Manual Push (Authenticated)
[x] Core `processSyncCycle()` implemented  
[x] Endpoint adjusted to `/api/bookings` with payload adapter  
[x] Acceptance: After successful login, `forceSync` drains queue (booking row dirty flag cleared)  
[x] Failure: 401 triggers auth-needed UI (auth cleared + login screen)  

**Acceptance (0.6 Manual Push)**
Checklist
[x] Offline enqueue (disconnect network first) increments queue badge AND Outbox table row exists (`sqlite3 pos.sqlite 'select count(*) from Outbox;'`).
[x] After reconnect + Force Sync: Outbox row removed; corresponding Booking record has `dirty=0` (DB query) OR row deleted if design chooses removal.
[x] Multiple pending bookings: one Force Sync drains all (observe sequential network requests via optional DEBUG_HTTP panel or DB diff before/after).
[x] 401 during push (simulate by expiring session) resets AuthProvider to unauthenticated and shows login without rapid retry loop; Outbox row still present; its `attemptCount` UNCHANGED.
[x] Non-auth / transient failure (e.g., 500 injected) increments only that Outbox row's `attemptCount` (inspect changed row) and leaves others untouched; `queue:update` event payload `sync.remaining` equals COUNT(*) from DB.

How to Verify (DevTools + DB)
1. Prepare Environment: Start backend & POS with `ELECTRON_DEV=1 DEBUG_HTTP=1` so Network panel & React DevTools available. Open React DevTools → locate AuthProvider & any queue state component.
2. Offline Enqueue:
	- Disable network (OS toggle or unplug) BEFORE clicking test booking create.
	- Observe: queue badge increments; `Outbox` table count increases (`sqlite3 pos/apps/electron/data/pos.sqlite "select count(*) from Outbox;"`). No network POST appears in DEBUG_HTTP.
3. Successful Drain:
	- Re-enable network; press Force Sync.
	- Observe: sequential POST /api/bookings entries in Network debug; `queue:update` event with `sync.pushed = numberOfPending`; DB Outbox count returns to 0; related Booking row now `dirty=0` (`select dirty from Booking where id=...;`).
4. Multiple Items:
	- Enqueue 3+ while offline; reconnect; single Force Sync drains all (Network panel shows N POSTs). Final `sync.remaining=0`.
5. Auth Expired Path (401):
	- Login, enqueue 1 booking (remain online so room discovery works), then invalidate session (e.g., delete server-side session or restart backend without cookie recognition) BEFORE Force Sync.
	- Force Sync → Expect: one failed POST 401; `queue:update` sync object shows `authExpired:true`; AuthProvider becomes `{ authenticated:false }`; login UI visible; Outbox row still present; its attemptCount unchanged (`select attemptCount from Outbox;`).
6. Generic Failure (500 / network):
	- Cause server to return 500 (temporary handler or kill backend after accepting TCP but before logic) OR point API_BASE_URL to wrong port.
	- Force Sync → `attemptCount` for first item increments by 1; `authExpired:false`; remaining count matches DB COUNT; processing stops after first failure (others remain untouched).
7. Remaining Count Accuracy:
	- With 5 queued items and forced first failure (e.g., invalid payload tweak), verify `sync.remaining` in last `queue:update` equals `select count(*) from Outbox;`.
8. No Attempt Increment on Auth Expired:
	- Repeat auth-expired test; compare attemptCount before/after (unchanged) to confirm selective increment logic.
9. Logging Signals:
	- Console shows `[SYNC] Auth expired (401)...` when 401 occurs; absence of increment logged for that case. Success path shows `[SYNC] POST` per item.
10. Regression Guard:
	- Enqueue -> Force Sync cycle multiple times; no residual dirty=1 rows for successfully pushed bookings.


### 0.6a Room Hours Admin UI (Earlier Integration)
[x] Renderer Admin panel (temporary) lists rooms (id, name, openMinutes, closeMinutes, status)
[x] IPC `rooms:list` → GET `/api/bookings/rooms`
[x] IPC `rooms:update` → PATCH `/api/bookings/rooms/:id` { openMinutes?, closeMinutes?, status? }
[x] Form with HH:MM inputs → convert to minutes, validate (close > open)
[x] Status select (ACTIVE, MAINTENANCE, CLOSED)
[x] After update, refetch availability using new stored hours (currently reloading rooms list; availability fetch integration deferred)
[x] Guard visibility: only show if auth.role === ADMIN
[x] Acceptance: Change hours → availability updates; set MAINTENANCE → availability empty; restore ACTIVE → slots return

**Acceptance (0.6a Rooms Admin)**
[x] ADMIN role: rooms table visible; switching to non-admin test user (if available) hides table.
[x] Updating open/close minutes: reloading app (or re-fetch) shows new values persisted (DB `Room` row reflects minutes; UI matches).
[x] Set MAINTENANCE: availability list empties and booking creation attempt returns error (IPC result or backend validation error).
[x] Revert to ACTIVE: availability repopulates with prior slot structure.

Follow-up (Post 0.6a) – Room Hours Shrink Handling
[x] Impact preview endpoint: list blocking future booking IDs for proposed shrink.
[ ] UI: show blocking bookings + confirmation modal with Cancel / Force / Adjust options.
[ ] Server: optional `force=true` param to cancel blocking bookings (audit log) – decision needed.
[ ] UI feedback: differentiate No Change vs Updated vs Blocked (toast or inline tag).
[ ] Parser robustness: accept `H:MM` (single-digit hour) (PARTIAL – parser updated; add tests).
[ ] Tests: shrinking window with blocking booking returns 409; after cancel, succeeds.


### 0.6d Room Status Queue-Based Sync with Collapse Logic – Completed
[x] Implemented `processRoomUpdates()` in sync.ts with collapse logic
[x] Collapse strategy: Group room:update mutations by roomId, keep only latest per room
[x] Delete superseded mutations to reduce queue size
[x] PATCH each final update to `/api/bookings/rooms/:id` with `{ status }`
[x] Handle auth-expired (401), validation errors (400/404/409), transient failures
[x] Generic `queue:enqueue` IPC handler in main.ts accepts type + payload
[x] Exposed `enqueue(type, payload)` in preload.ts contextBridge
[x] Updated TypeScript definitions in global.d.ts with enqueue method
[x] Modified `updateRoomStatus` in bookingContext.tsx to enqueue mutations
[x] Optimistic UI update for immediate feedback before sync
[x] Background sync every 15 seconds processes queued room status changes
[x] Fixed Force Sync button wiring in Dashboard, BookingDetail, MenuManagement pages
[x] Added comprehensive logging throughout enqueue → sync → PATCH flow
[x] Verified collapse logic: 3 mutations → 2 dropped (superseded) → 1 PATCH sent
[x] Implemented 15-second periodic auto-sync in main.ts
[x] Auto-reload rooms after successful sync (manual + automatic)
[x] Fixed infinite loop in room reload (using stateRef + prevAdminRef pattern)

**Acceptance (0.6d Room Status Sync)** – VERIFIED
[x] Rapid Status Changes (Collapse Test):
    - Changed room status 3+ times rapidly
    - Clicked Force Sync
    - Console logs confirmed: `[SYNC][ROOM] Found 3 room:update mutations in queue`
    - Collapse logic verified: `[SYNC][ROOM] Dropping superseded mutation` (2 times)
    - Final result: `[SYNC][ROOM] After collapse: 1 unique room(s) to update`
    - Single PATCH sent: `[SYNC][ROOM] PATCH http://localhost:8080/api/bookings/rooms/1 { status: 'MAINTENANCE' }`
    - ✅ Collapse logic working perfectly!
[x] Logging Verification:
    - Enqueue logs: `[BOOKING_CTX] updateRoomStatus called`, `[MAIN] queue:enqueue called`
    - Sync logs: `[SYNC][ROOM] Found X mutations`, `[SYNC][ROOM] After collapse: Y unique rooms`
    - Network logs: `[SYNC][ROOM] PATCH` with correct endpoint and payload
    - Error handling: `[SYNC][ROOM] push failed 500` properly caught and logged
[x] Periodic Sync (15s Interval):
    - Implemented automatic sync every 15 seconds
    - Logs: `[MAIN] Starting periodic sync cycle, interval: 15000 ms`
    - Auto-sync only runs when: authenticated + queue not empty
    - Console shows: `[MAIN][AUTO_SYNC] Triggering sync cycle, queue size: X`
    - Queue drains automatically without manual Force Sync
[x] Auto-Reload After Sync:
    - Rooms automatically reload from backend after successful sync
    - Logs: `[SYNC][RENDERER] Reloading rooms after successful sync`
    - UI updates with latest status from database
    - No manual page reload needed
[x] Infinite Loop Fix:
    - Fixed infinite room reload loop using stateRef pattern
    - `reloadRooms` now stable (no state dependency)
    - Only reloads on admin login transition (not every state change)
    - No more endless `[ROOMS][TRACE] rooms:list` spam
[ ] Full Integration Test (Blocked - see Follow-up):
    - Currently fails with 500 error: Room ID mismatch (mock '1' vs real UUID)
    - Need to fetch real rooms from backend before testing status updates
    - See "Follow-up (Post 0.6d)" below

**Known Issue (0.6d):**
- POS uses mock room data with IDs `'1'`, `'2'`, `'3'`, `'4'` in `bookingContext.tsx`
- Backend has real rooms with UUID IDs (e.g., `79b72351-feb2-44be-9c90-f55c63d57d59`)
- Status update requests fail with 500 because room ID doesn't exist in database
- Solution: Replace mock rooms in bookingContext with real rooms fetched from backend

**Implementation Details:**
- Mutation Type: `room:update` with payload `{ roomId: string, status: 'ACTIVE'|'MAINTENANCE'|'CLOSED' }`
- Collapse Logic: For same roomId, only the mutation with latest `createdAt` timestamp is sent
- Endpoint: `PATCH /api/bookings/rooms/:id` with body `{ status }`
- Error Handling: 401 stops processing + clears auth; 400/404/409 drop mutation; 500 increments attemptCount
- Sync Interval: 15 seconds automatic background sync
- UI Feedback: Optimistic update (immediate) + queue badge increment + eventual sync confirmation
- Room Reload: Automatic after successful sync (both manual Force Sync and auto-sync)


### 0.9 Scheduled Push Loop – Completed
[x] Interval (15s) triggers `processSyncCycle()` if `online && auth==authenticated && queue>0 && !isSyncing`
[x] Acceptance: create offline, reconnect (and login if needed) -> queue auto drains
[x] Logs show `[MAIN][AUTO_SYNC]` prefix for automatic sync cycles
[x] Auth expiry handled (clears state, notifies renderer)
[x] Queue update events emitted to renderer after each cycle

**Acceptance (0.9 Scheduled Push Loop)** – VERIFIED
[x] Automatic sync occurs every 15 seconds when queue has items
[x] No overlapping sync cycles (existing `syncing` flag prevents concurrent runs)
[x] Offline state halts automatic sync (checks authentication + queue size)
[x] Console shows: `[MAIN][AUTO_SYNC] Triggering sync cycle, queue size: X`
[x] Queue badge updates automatically as items are synced


Follow-up (Post 0.6d) – Room Data Synchronization
[ ] Replace mock room data in bookingContext with real backend data
[ ] Fetch rooms on app startup (already exists via authState.rooms)
[ ] Update bookingContext to use real rooms from authState instead of initialRooms mock
[ ] Add color mapping logic for dashboard room cards (backend Room doesn't have color field)
[ ] Reconcile Room type differences (backend has openMinutes/closeMinutes, mock has capacity/hourlyRate)
[ ] Update DashboardPage to handle real Room type (id: UUID string, no color/capacity/hourlyRate)
[ ] Test room status update with real UUID room IDs
[ ] Verify status change persists across app restart (fetch latest from backend)


### 0.7 Queue Size Indicator
[x] IPC `getQueueSize` returns COUNT(*) from Outbox  
[x] Renderer displays `Queue: <n>`; updates on enqueue & after sync  
[ ] Acceptance: enqueue increments immediately; push decrements without restart (needs explicit validation)  

**Acceptance (0.7 Queue Indicator)**
[ ] Enqueue: badge increments within 300ms; AuthProvider (or queue state hook) reflects same numeric value.
[ ] Post Force Sync (or successful manual push): badge returns to 0 without app reload; DB Outbox empty.
[ ] Rapid multiple enqueues (>=3) produce strictly increasing counts then drain correctly upon sync.


### 0.8 Online / Offline Probe
[ ] Interval (30s) GET `/health` sets `online` flag  
[ ] IPC `getStatus` returns `{ online, queueSize, auth }`  
[ ] Renderer status indicator reflects connectivity  

**Acceptance (0.8 Online Probe)**
[ ] Disable network: within probe interval (≤30s) UI status indicator changes to Offline; no new push attempts appear in DEBUG_HTTP log.
[ ] Re-enable network: status flips to Online; if queue >0 and authenticated, next scheduled or manual sync proceeds.


### 0.9 Scheduled Push Loop – Completed
[x] Interval (15s) triggers `processSyncCycle()` if `online && auth==authenticated && queue>0 && !isSyncing`  
[x] Acceptance: create offline, reconnect (and login if needed) -> queue auto drains  

**Acceptance (0.9 Scheduled Push Loop)** – VERIFIED
[x] When Online + Authenticated + queue>0: a push occurs automatically within one interval (≤15s) without manual button.
[x] During ongoing push (simulate longer cycle), no second overlapping push starts (existing `syncing` flag prevents concurrent runs).
[x] Offline state (disable network) halts scheduled pushes (checks authentication + queue size) until connectivity restored.
[x] Console logs show: `[MAIN] Starting periodic sync cycle, interval: 15000 ms` on app start
[x] Each auto-sync logs: `[MAIN][AUTO_SYNC] Triggering sync cycle, queue size: X`
[x] Queue badge updates automatically as items are synced without manual Force Sync


### 0.9.1 Development Logging Consolidation – Completed
[x] Forward main process logs to renderer DevTools console (dev only)
[x] Intercept console methods in main.ts and emit via IPC `main-log` channel
[x] Added `onMainLog` listener in preload.ts bridge
[x] Updated TypeScript definitions in global.d.ts
[x] Renderer index.tsx listens for main logs and outputs to DevTools with `[MAIN]` prefix
[x] Guarded with `ELECTRON_DEV` check - only active in development mode
[x] Documented behavior in .env.example

**Acceptance (0.9.1 Log Consolidation)** – VERIFIED
[x] Dev Mode (`npm run dev`): All main process logs appear in DevTools console with `[MAIN]` prefix
[x] Dev Mode: Both main process and renderer logs visible in one place (DevTools console)
[x] Production Build: Log forwarding disabled; main process logs stay in terminal only
[x] No performance overhead in production (console interception skipped)

**Implementation Details:**
- Interception: Main process console.log/warn/error/info/debug wrapped to emit IPC events
- IPC Channel: `main-log` with payload `{ level: 'log'|'warn'|'error'|'info'|'debug', message: any[] }`
- Prefix: `[MAIN]` added to all forwarded logs in DevTools for easy identification
- Environment Guard: Only active when `ELECTRON_DEV=1` (automatically set by npm run dev)
- Documentation: Added note to .env.example explaining automatic ELECTRON_DEV behavior


### 0.10 last_sync_ts Meta (Pre-Pull)
[ ] After any successful push cycle sending >=1 mutation set `Meta.last_sync_ts` (ISO)  
[ ] Renderer shows `Last Sync: <time or –>`  

**Acceptance (0.10 last_sync_ts)**
[ ] First successful push sending ≥1 mutation writes `Meta.last_sync_ts` (verify via `select value from Meta where key='last_sync_ts';`).
[ ] Subsequent push with no mutations leaves timestamp unchanged; with new mutations updates to later ISO value.
[ ] UI displays human-friendly time; displays dash / placeholder when absent (before any push). 

### 0.11 Backend Cleanup & Tests (Room Hours)
[ ] Run prisma generate; remove temporary `any` casts in booking route & seed script
[ ] Add tests: (a) booking outside hours rejected (b) MAINTENANCE availability empty (c) shrinking hours conflict returns 409

---
## Phase 1 – Introduce Pull (Requires Backend Endpoint)

### 1.1 Backend Endpoint
[ ] Implement `GET /api/booking/changed?since=ISO` returning array with `updatedAt` ISO

### 1.2 Pull Cycle
[ ] Extend `processSyncCycle()` to run pull after push  
[ ] Upsert returned rows; clear `dirty` if matched  
[ ] Update `last_sync_ts` **after** successful pull  

### 1.3 Snapshot Scope
[ ] (Optional) Limit stored bookings to future N days; delete older rows  

### 1.4 Status Aggregation
[ ] IPC `getStatus` adds `lastSync`, `failures` (push failures count)  
[ ] Renderer panel renders full status

---
## Phase 2 – Auth Hardening
[ ] On 401 during push/pull attempt refresh once then retry  
[ ] If refresh fails: emit `auth:expired` event → renderer shows login form  
[ ] Add logout (clear memory + delete keytar token)  

---
## Phase 3 – Orders / Products (Deferred)
[ ] New tables: products, orders, order_items  
[ ] Outbox types: `order:create`, `order:update-status`  
[ ] Backend incremental endpoints for products/orders changes  

---
## Future Follow-Ups (Backlog Parking Lot)

### Room Hours / Admin
- [ ] Impact preview endpoint (blocking booking IDs before shrink)
- [ ] Confirmation modal listing blocking bookings (Cancel / Force / Adjust)
- [ ] Decide & implement `force=true` semantics (auto-cancel vs adjust) + audit log
- [ ] UI feedback differentiation (Updated / No Change / Blocked)
- [ ] Tests: shrink conflict 409, then success after booking cancel
- [ ] Parser tests for single-digit hour acceptance

### Sync Engine
- [ ] Permanent validation patterns config + attempt threshold drop
- [ ] Scheduled background push loop (Phase 0.9) – ensure idempotent guard
- [ ] Last successful sync timestamp surfaced in UI
- [ ] Batch push + backoff/jitter strategy
- [ ] Pull phase (delta fetch) after push completion
- [ ] Structured logging with cycle / item correlation IDs

### Auth & Security
- [ ] Silent refresh attempt on first 401 before clearing auth
- [ ] Role revalidation fallback via `/auth/me` when local role missing
- [ ] Forced logout broadcast handling (server-driven session invalidation)

### Logging & Diagnostics
- [ ] Main→renderer log forwarder (level-filtered)
- [ ] Env-driven log level (INFO/WARN/DEBUG) for main + renderer
- [ ] Debug IPC to list blocking bookings for proposed hours shrink

### UI / UX
- [ ] Global toast system for success/error events
- [ ] Skeleton loaders for rooms table & availability
- [ ] Auto availability refresh after hours change
- [ ] Disabled Save until diff detected + visual diff inline
- [ ] Tabs: Keyboard navigation (ArrowLeft/Right/Home/End) + ARIA linkage
- [ ] Tabs: Persist last active tab (localStorage)
- [ ] Booking list: Focus-visible & hover affordance
- [ ] Booking list: Optional context menu for quick status change
- [ ] Booking buttons: Disable while status transition pending (future async)
- [ ] Booking list: Tooltip (derived end time & price breakdown)
- [ ] Booking actions: Confirmation dialog before Cancel
- [ ] Booking actions: Toast feedback after status change
- [ ] Booking actions: Optimistic rollback pathway
- [ ] Weekly Calendar: Empty slot click → new booking modal (stub)
- [ ] Weekly Calendar: Overlap warning styling
- [ ] Weekly Calendar: Vertical scroll / virtualization prep
- [ ] Timeline: Current time indicator (today)
- [ ] Timeline: Zoom controls (30m vs 15m)
- [ ] Timeline: Drag & resize bookings (spike)
- [ ] Timeline booking block: Keyboard tooltip / accessible description
- [ ] Booking Detail: Computed end time display
- [ ] Booking Detail: Editable notes + Save
- [ ] Booking Detail: Prev / Next booking navigation
- [ ] Booking Detail: Mini room occupancy timeline snippet
- [ ] Global: Centralize Card/Badge primitives
- [ ] Global: Standard Button variants (primary/subtle/destructive)
- [ ] Global: Loading overlay pattern for async mutations
- [ ] Multi-select bookings (bulk status update)
- [ ] Export bookings (week CSV)
- [ ] Inline duration edit via timeline resize
- [ ] Keyboard shortcuts: `g t` (Timeline), `g b` (Bookings)
- [ ] Search / filter field (customer / room / date)
- [ ] Filter toggle: show only active bookings
- [ ] Theme toggle (dark/light)
 - [ ] Menu Management: Category CRUD & reorder (moved from 0.6c follow-ups once persistence ready)
 - [ ] Menu Management: Bulk availability toggle
 - [ ] Menu Management: Price history drill-in modal
 - [ ] Menu Management: Cost-of-goods & margin display
 - [ ] Menu Management: CSV / PDF export
 - [ ] Menu / Ordering: Shared MenuProvider bridging Booking Detail & Management page
 - [ ] Ordering: Persist order items per booking & show historical receipt
 - [ ] Ordering: Toast feedback on add/remove/print
 - [ ] Ordering: Optimistic quantity mutation rollback on error

### Data & Validation
- [ ] Minute rounding (5/15 increments) optional toggle
- [ ] Booking horizon limit (reject beyond N days) to simplify shrink conflicts
- [ ] Effective-date hour changes (apply starting next day)

### Observability / Ops
- [ ] `/healthz` + `/readyz` integration for POS online indicator
- [ ] Metrics: push successes, validation drops, auth expiries counters
- [ ] Error reporting hook (Sentry or stub) wired in renderer & main

### Developer Experience
- [ ] Debug script: list future bookings vs proposed window
- [ ] Seed scenario with intentional shrink conflict for testing
- [ ] README guide: reproducing 409 hour shrink conflict

### Technical Debt
- [ ] Unified time parsing utility shared across backend & POS
- [ ] Shared types package (Room, Booking) consumed by POS & backend
- [ ] Logger abstraction replacing raw console.* (timestamps, levels)
- [ ] Extract time slot & week utilities (`timeUtils.ts`)
- [ ] Replace repeated Tailwind utility chains with component classes / `@apply`
- [ ] Shared enum for booking status (context + UI)
- [ ] Externalize operating hours (9–22) into config constants
- [ ] Error boundary around Dashboard main content

---
## Phase 4 – Packaging
[ ] Add electron-builder devDependency & config  
[ ] Script `pack:win` (NSIS)  
[ ] Build artifact under `release/`  

---
## Minimal Implementation Order (Updated Fast Path)
1. 0.2 Core Structure  
2. 0.3 DB Init  
3. 0.4 Enqueue  
4. 0.5 Auth (minimal)  
5. 0.6 Manual Push Acceptance  
6. 0.7 Queue Indicator  
7. 0.8 Online Probe  
8. 0.9 Scheduled Push Loop  
9. 0.10 last_sync_ts  
10. Phase 1 Pull  


---
## Acceptance Smoke Script
```
# Start offline
Create booking -> queue=1, dirty=1
Reconnect network
forceSync (or wait interval) -> queue=0, booking dirty=0
Login, restart app -> stays authenticated (refresh token)
```

---
## Troubleshooting Quick Reference
| Symptom | Check |
|---------|-------|
| DB file missing | Did initDb() run before window creation? Permissions? |
| better-sqlite3 load error | Node/Electron version mismatch; reinstall deps |
| Queue never drains | API endpoint URL / auth header / network status |
| Outbox duplicates | Ensure delete happens only after 2xx responses |
| Refresh token lost | Keytar store cleared (OS keychain) – login again |

---
## Deferred / Nice-To-Have Flags
- Backoff: exponential delay when attempt_count grows.
- Batch push: send multiple mutations in one request.
- WebSocket subscribe for live booking updates.
- Local overlap validation before enqueue.

### Auth / Security (Future Enhancements)
- Admin long-lived session TTL (ENV: ADMIN_SESSION_TTL_HOURS) — implement role-based cookie/session expiry (reverted for now).
- Rolling session refresh (extend on active use vs fixed expiry).
- Session revocation list / admin dashboard to force logout.

---

 - verify:db: (manual) check existence of `pos/apps/electron/data/pos.sqlite` after `npm run dev:pos:electron` start.
 - schema-migration: Replaced by clean slate PascalCase tables (Meta, Booking, Outbox). Use `POS_DB_RESET=1` env to forcibly recreate during dev.
 - auth-order: Auth moved earlier to test protected booking endpoint realistically.
(Keep this file pruned: remove completed sections or archive to CHANGELOG when stable.)
 - verify:db: (manual) check existence of `pos/apps/electron/data/pos.sqlite` after `npm run dev:pos:electron` start.
