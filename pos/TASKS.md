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
[ ] Implement `initDb()` in db.ts: open `data/pos.sqlite`, enable WAL, create tables (meta, bookings, outbox)  
[ ] Call `initDb()` early in `main.ts` before window creation  
[ ] Acceptance: file `data/pos.sqlite` exists after startup

### 0.4 Enqueue (Local Create Only)
[ ] Implement `enqueueBooking()` (inserts into bookings + outbox)  
[ ] IPC handler `booking:create` → calls enqueue  
[ ] Renderer temporary button triggers IPC  
[ ] Acceptance: clicking button increases count in `outbox` table

### 0.5 Manual Push (No Pull Yet)
[ ] Implement `processSyncCycle()` (take first outbox row, POST `/api/booking`)  
[ ] On success: delete row, mark matching booking `dirty=0`  
[ ] IPC `forceSync` triggers cycle  
[ ] Acceptance: forceSync drains queue when backend reachable; logs warn on failure

### 0.6 Queue Size Indicator
[ ] IPC `getQueueSize` returns count(*) from outbox  
[ ] Renderer displays `Queue: <n>`; updates after create + after sync  

### 0.7 Online / Offline Probe
[ ] Interval (30s) HEAD/GET `/api/health` sets `online` flag  
[ ] IPC `getStatus` returns `{ online, queueSize }`  
[ ] Renderer updates status indicator  

### 0.8 Auth (Login + Persist Refresh)
[ ] Implement `login(email,password)` → POST `/api/auth/login` capture access/refresh tokens  
[ ] Save refresh token via keytar; store access in memory  
[ ] Silent startup session check (`/auth/me`) before showing UI  
[ ] If session valid → skip login modal and start sync timer  
[ ] If unauthenticated → show Login modal (booking actions disabled)  
[ ] After successful login start sync timer; emit auth state event  
[ ] Include Authorization header in push if access token present  
[ ] (Optional) Log lifecycle events: `launch:start`, `launch:session_valid`, `launch:show_login`, `launch:login_success`  

### 0.9 Scheduled Push Loop
[ ] Interval (15s) triggers `processSyncCycle()` if `online && outbox not empty && not already syncing`  
[ ] Acceptance: create offline, reconnect, queue clears automatically

### 0.10 last_sync_ts Meta (Pre-Pull)
[ ] After *successful* push cycle (any row sent) set `meta.last_sync_ts` to current ISO  
[ ] Renderer displays `Last Sync: <time or –>`  

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
## Minimal Implementation Order (Fast Path)
1. 0.2 Core Structure  
2. 0.3 DB Init  
3. 0.4 Enqueue  
4. 0.6 Queue Size Indicator (simple)  
5. 0.5 Manual Push  
6. 0.9 Scheduled Push Loop  
7. 0.8 Auth  
8. 0.10 last_sync_ts  
9. Phase 1 Pull  


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
(Keep this file pruned: remove completed sections or archive to CHANGELOG when stable.)
