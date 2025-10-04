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


### 0.9 Scheduled Push Loop
[ ] Interval (15s) triggers `processSyncCycle()` if `online && auth==authenticated && queue>0 && !isSyncing`  
[ ] Acceptance: create offline, reconnect (and login if needed) -> queue auto drains  

**Acceptance (0.9 Scheduled Push Loop)**
[ ] When Online + Authenticated + queue>0: a push occurs automatically within one interval (≤15s) without manual button.
[ ] During ongoing push (simulate longer cycle), no second overlapping push starts (no duplicate in-flight entries / logs).
[ ] Offline state (disable network) halts scheduled pushes (attemptCount remains unchanged) until connectivity restored.


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
