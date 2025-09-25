# POS Hub Execution Tasks (Incremental Checklist)

This file is the actionable slice of the broader plan in `pos/README.md`.
Mark items as you complete them. Keep commits small (1–2 checklist items each).

Legend: [ ] pending  [~] in progress  [x] done

---
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
[ ] Successful login replaces login page with dashboard; action buttons now present; `auth:state` event seen in console.
[ ] App restart with valid session cookie auto-authenticates (silent `/api/auth/me`) and shows dashboard directly.
[ ] Invalid credentials show inline error; dashboard never flashes before error.
[ ] Logout returns to pure login page; dashboard action buttons removed from DOM.
[ ] No refresh token or access token exposed on `window` (only `window.kgolf`).


### 0.6 Manual Push (Authenticated)
[x] Core `processSyncCycle()` implemented  
[x] Endpoint adjusted to `/api/bookings` with payload adapter  
[~] Acceptance: After successful login, `forceSync` drains queue (drains but booking dirty flag partly handled; needs explicit test)  
[ ] Failure: 401 triggers auth-needed UI (currently logs and stops)  

**Acceptance (0.6 Manual Push)**
[ ] Offline enqueue increments queue; DB Outbox row present.
[ ] After reconnect + Force Sync: Outbox row deleted; associated Booking.dirty=0.
[ ] Multiple items drain sequentially in one Force Sync.
[ ] 401 during push returns user to login (once implemented) without infinite loop.
[ ] Failure increments `attemptCount` for the affected Outbox entry only.


### 0.6a Room Hours Admin UI (Earlier Integration)
[x] Renderer Admin panel (temporary) lists rooms (id, name, openMinutes, closeMinutes, status)
[x] IPC `rooms:list` → GET `/api/bookings/rooms`
[ ] IPC `rooms:update` → PATCH `/api/bookings/rooms/:id` { openMinutes?, closeMinutes?, status? }
[ ] Form with HH:MM inputs → convert to minutes, validate (close > open)
[ ] Status select (ACTIVE, MAINTENANCE, CLOSED)
[ ] After update, refetch availability using new stored hours (no openStart/openEnd params)
[ ] Guard visibility: only show if auth.role === ADMIN
[ ] Acceptance: Change hours → availability updates; set MAINTENANCE → availability empty; restore ACTIVE → slots return

**Acceptance (0.6a Rooms Admin)**
[ ] ADMIN sees rooms table; non-admin does not.
[ ] Updating hours persists and reflects on reload (future update IPC).
[ ] Setting MAINTENANCE hides availability / causes booking create rejection.
[ ] Returning to ACTIVE restores availability.


### 0.7 Queue Size Indicator
[x] IPC `getQueueSize` returns COUNT(*) from Outbox  
[x] Renderer displays `Queue: <n>`; updates on enqueue & after sync  
[ ] Acceptance: enqueue increments immediately; push decrements without restart (needs explicit validation)  

**Acceptance (0.7 Queue Indicator)**
[ ] Queue badge increments within 300ms of enqueue.
[ ] After successful sync, queue returns to 0 without reload.
[ ] Rapid multiple enqueues maintain correct count.


### 0.8 Online / Offline Probe
[ ] Interval (30s) GET `/health` sets `online` flag  
[ ] IPC `getStatus` returns `{ online, queueSize, auth }`  
[ ] Renderer status indicator reflects connectivity  

**Acceptance (0.8 Online Probe)**
[ ] Disconnect network: within 30s indicator switches to Offline, no push attempts fired.
[ ] Reconnect: switches to Online and pending queue (if any) becomes eligible for scheduled push.


### 0.9 Scheduled Push Loop
[ ] Interval (15s) triggers `processSyncCycle()` if `online && auth==authenticated && queue>0 && !isSyncing`  
[ ] Acceptance: create offline, reconnect (and login if needed) -> queue auto drains  

**Acceptance (0.9 Scheduled Push Loop)**
[ ] With online=true, auth valid, queue>0: auto push occurs within 15s.
[ ] While syncing, no concurrent second cycle starts.
[ ] Offline prevents scheduled push attempts (no attemptCount increase) until back Online.


### 0.10 last_sync_ts Meta (Pre-Pull)
[ ] After any successful push cycle sending >=1 mutation set `Meta.last_sync_ts` (ISO)  
[ ] Renderer shows `Last Sync: <time or –>`  

**Acceptance (0.10 last_sync_ts)**
[ ] Successful push of >=1 mutation sets Meta.last_sync_ts.
[ ] Subsequent push updates timestamp only if at least one mutation sent.
[ ] Renderer displays formatted time or a dash when absent.

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
