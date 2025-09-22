# POS Hub (Offline-First Electron App)

This document is the implementation plan and architecture guide for the K-Golf POS Hub.
It will run on a Windows (primary target) or macOS laptop inside the venue, continue
operating while offline, and synchronize with the central backend when connectivity returns.

---
## 1. Goals
- Offline‑first: create + queue operations (bookings / orders) with no internet.
- Durable local storage: SQLite (WAL) for fast, crash‑safe writes.
- Multi-device aware: permit future secondary tablets; designate one "hub" as primary sync node.
- Secure credential handling (refresh token via OS keychain, access token in memory only).
- Minimal operator UI: status (online/offline, sync queue depth), quick booking/order entry.
- Extensible domain: start with bookings; later orders, products, printers.
- Simple recoverability: deleting local DB + full resync must restore state (idempotent server APIs required).

---
## 2. High-Level Architecture
```
+--------------------+         +------------------------+
|   Renderer (UI)    |  IPC    |   Main Process (IPC)   |
| React + preload API| <-----> | Auth, Sync, DB, Logging|
+---------+----------+         +-----------+------------+
          |                                |
          | (calls)                        | (SQL)
          v                                v
   window.pos.*                     SQLite (better-sqlite3)
                                          |
                                          v
                                  Outbox + Domain Tables
                                          |
                               (HTTP sync via axios)
                                          |
                                          v
                                 Remote Backend (API)
```

---
## 3. Data Model (Phase 1)
Tables:
- `meta(key TEXT PRIMARY KEY, value TEXT)` – cursors, version flags
- `bookings(id TEXT PRIMARY KEY, server_id TEXT, customer_name TEXT, starts_at TEXT, ends_at TEXT, status TEXT, updated_at INTEGER, dirty INTEGER DEFAULT 1)`
- `outbox(id TEXT PRIMARY KEY, type TEXT, payload_json TEXT, created_at INTEGER, attempt_count INTEGER DEFAULT 0)`

Future tables (later phases):
- `products`, `orders`, `order_items`, `operations` (generic mutation ledger), `printers`, `devices`

---
## 4. Sync Strategy
1. PUSH: Drain `outbox` oldest-first. Each row maps to an API call (e.g., booking:create).
2. PULL: Fetch changes since `meta.last_sync_ts` (backend endpoint: `/api/booking/changed?since=ISO`).
3. APPLY: Upsert into local tables; clear `dirty`.
4. CURSOR: Update last_sync_ts on success.
5. RETRY: Increment `attempt_count`; optionally backoff (future: exponential with cap).

Conflict policy (Phase 1): Last write wins (server `updatedAt`). Local rows overwritten if server newer.

Idempotency: For eventual order operations, send a client-generated UUID header (future). For bookings, backend may reject duplicates by time+room window.

---
## 5. Auth Flow
- Login: email/password → receives access & refresh.
- Store refresh in OS keychain (keytar). Access kept in memory; drops on app restart.
- On startup: try refresh token; if ok, load new access token.
- On 401 during sync: attempt refresh (Phase 2 enhancement) then retry once.

---
## 6. IPC Contract (Preload API)
`window.pos`:
- `login(email, password)` → { user }
- `createBooking(payload)` → queues mutation
- `forceSync()` → manual sync cycle
- `onSyncEvent(cb)` → subscribe (future events: queue depth changed, sync success/fail)

All other logic stays in main process (no direct DB access from renderer).

---
## 7. Phased Implementation Plan
### Phase 0 – Scaffolding (DONE / IN PROGRESS)
- Electron main + preload
- Basic React renderer
- SQLite init, outbox + bookings tables
- Simple booking enqueue + manual sync

### Phase 1 – Robust Booking Sync
- Implement push + pull cycle
- Add health probe + online/offline indicator
- Basic error logging (electron-log)
- README + scripts: dev, build, pack (Windows)

### Phase 2 – Auth Hardening & Refresh
- Add automatic refresh on 401
- Retry logic with limited attempts
- Masked UI for unauthenticated state
- Add logout (clear tokens + keytar)

### Phase 3 – Orders & Product Catalog
- New tables: products, orders, order_items
- Outbox `order:create`, `order:update-status`
- Backend endpoints for incremental product/order change feed
- Basic order entry UI (line items, totals)

### Phase 4 – Hardware Integration
- Abstraction: `printerService` in main process
- Test print, receipt formatting
- Future: cash drawer pulse

### Phase 5 – Multi-Device / Hub Election (Optional)
- Device registration (UUID) + role (hub / secondary)
- Secondary devices push to hub or directly to backend (choose model)
- Conflict markers, device-specific operation queue keys

### Phase 6 – Observability & Recovery
- Diagnostic panel (queue length, last sync time, last error)
- Export diagnostic bundle (logs + sqlite copy)
- Automatic DB compaction / VACUUM schedule

---
## 8. Build & Run
Development:
```
cd pos/apps/electron
npm install
npm run dev
```
Production build (local):
```
npm run build
npm run pack:win   # creates Windows installer (NSIS)
```
Artifacts output: `release/` directory.

---
## 8a. Running Locally (Monorepo Context)

Two ways to start the POS in this monorepo:

1. From repo root (preferred once a root script is added):
```
npm install         # installs all workspaces (frontend, backend, pos)
cd backend && npm run dev &  # (optional) run API locally for real pushes
cd ../pos/apps/electron
npm run dev
```
2. Direct (only POS workspace) – still run `npm install` at root first if using workspaces:
```
cd pos/apps/electron
npm install
npm run dev
```

### Local API vs Remote API
Set `API_BASE_URL` in `pos/apps/electron/.env`:
```
API_BASE_URL=http://localhost:8080   # when backend dev server is running locally
# or
API_BASE_URL=https://k-golf.inviteyou.ca  # hit prod/staging directly (be cautious)
```

### Initial Offline Test
1. Ensure no network (disable Wi-Fi or block host).
2. Launch app → create a booking (UI should show queued / increased outbox size).
3. Re-enable network → trigger manual sync (or wait interval) → queue count drops.

### Inspecting the Local Database
SQLite file lives at:
```
pos/apps/electron/data/pos.sqlite
```
You can inspect with `sqlite3`:
```
sqlite3 pos/apps/electron/data/pos.sqlite '.tables'
sqlite3 pos/apps/electron/data/pos.sqlite 'select * from outbox;'
```

#### Detailed SQLite Cheat Sheet (Developer Reference)

From repo root:
```
sqlite3 pos/apps/electron/data/pos.sqlite
```
Inside the prompt:
```
.tables                             -- list tables
.schema bookings                    -- show bookings schema
.schema outbox                      -- show outbox schema
SELECT COUNT(*) FROM bookings;      -- count bookings
SELECT COUNT(*) FROM outbox;        -- count queued mutations
SELECT id,type,attempt_count FROM outbox ORDER BY created_at DESC LIMIT 5;  -- recent queue
SELECT id, json_extract(payload_json,'$.customerName') AS customer FROM outbox LIMIT 3; -- JSON extraction
.exit
```

One‑off commands (no interactive shell):
```
sqlite3 pos/apps/electron/data/pos.sqlite "SELECT COUNT(*) AS outbox_count FROM outbox;"
sqlite3 pos/apps/electron/data/pos.sqlite "SELECT id,type FROM outbox ORDER BY created_at DESC LIMIT 1;"
```

If already inside the data folder (`pos/apps/electron/data`):
```
sqlite3 pos.sqlite
```

GUI Option (optional): install "DB Browser for SQLite" and open the file.

Temporary Node script approach:
```
node - <<'NODE'
const Database = require('better-sqlite3');
const db = new Database('pos/apps/electron/data/pos.sqlite');
console.log('Outbox count:', db.prepare('SELECT COUNT(*) c FROM outbox').get().c);
console.log('Sample rows:', db.prepare('SELECT id,type,attempt_count FROM outbox LIMIT 5').all());
NODE
```

Common mistakes:
```
Error: unable to open database ... -> path typo (use apps plural) or file not created yet (run dev script first)
```

### Resetting Local State
To completely reset (development only):
```
rm -rf pos/apps/electron/data/pos.sqlite
rm -rf pos/apps/electron/data/pos.sqlite-wal
```
Next startup recreates schema. Any unsent mutations are lost if you delete the DB.

### Logs
`electron-log` default file locations:
- macOS: `~/Library/Logs/<app name>/log.log`
- Windows: `%USERPROFILE%\AppData\Roaming\<app name>\logs\log.log`

### Common Local Issues
| Symptom | Fix |
|---------|-----|
| better-sqlite3 fails to load | Delete `node_modules` and reinstall; ensure Node/Electron versions match |
| Cannot resolve module after move | Run root `npm install` again (workspace hoisting) |
| Push always 401 | Backend not running / invalid creds / missing login step |
| Queue never drains | Wrong `API_BASE_URL` or backend route path mismatch |
| Refresh token not retained | Keytar not supported (check OS keychain permissions) |

### Optional Root Script (Future)
Add to root `package.json` (planned):
```
"scripts": {
  "dev:pos:electron": "npm --workspace pos/apps/electron run dev"
}
```
Then just run:
```
npm run dev:pos:electron
```

---

---
## 9. Environment Variables
`.env` (not committed if sensitive):
```
API_BASE_URL=https://k-golf.inviteyou.ca
LOG_LEVEL=info
SYNC_INTERVAL_MS=15000
```
Future:
- `DEVICE_ID` override (else auto-gen UUID stored in meta)
- `PRINTER_PROFILE=thermal58|thermal80`

---
## 10. Error Handling & Edge Cases
| Scenario | Behavior |
|----------|----------|
| Offline at startup | Queue operations; sync waits until online |
| Server 500 on push | Increment attempt_count; leave in outbox |
| Repeated failure > N | (Future) escalate via UI banner |
| Local clock skew | Server `updatedAt` authoritative |
| DB corruption | User can delete `data/pos.sqlite`; full resync reconstructs |
| Token expired | Refresh (Phase 2); if fails → logout |

---
## 11. Security Considerations
- No direct SQL from renderer (contextIsolation true).
- Refresh token in OS secure storage (keytar) not plain disk.
- Access token never persisted.
- Future: code signing for Windows installer.
- Potential encryption-at-rest (low priority; SQLite WAL + OS security adequate for PII-lite data).

---
## 12. Future Enhancements
- WebSocket live updates (switch from poll / incremental feed)
- Delta compression for large product catalogs
- Operation provenance (device_id, operator_id)
- Bulk conflict resolution UI
- Role-based UI (manager vs staff)

---
## 13. Minimal Backend Requirements (Delta)
Add endpoints (or adjust naming to existing):
- `GET /api/booking/changed?since=ISO` → [{ id, customerName, startsAt, endsAt, status, updatedAt }]
- (Optional) `POST /api/booking` idempotent (client-sent UUID or natural uniqueness)
- Future: `/api/orders/changed`, `/api/products/changed`

Return format should include `updatedAt` ISO string used for ordering.

---
## 14. Acceptance Criteria (Phase 1)
- App boots, logs in, persists refresh token.
- Create booking offline → appears in outbox.
- After reconnect, sync drains outbox (booking visible via backend API) without user action.
- Manual `forceSync()` updates last sync timestamp.
- No renderer crashes when backend unreachable.

---
## 15. Task Breakdown (Next Sprint)
1. Add `pos/apps/electron/src/core/` modules (db, auth, sync) – scaffolding.
2. Implement enqueue + push portion with mock endpoint (temporary).
3. Add pull cycle stub that safely no-ops until backend endpoint exists.
4. Renderer: basic status bar (online/offline, queue length, last sync). 
5. Refresh token load on startup.
6. Windows packaging dry run (NSIS artifact builds).

---
## 16. Definitions
- Dirty row: local mutation not yet reconciled with server (dirty=1 means "needs push").
- Outbox: append-only queue table of pending mutations; deletion after successful push = success.
- Cursor (last_sync_ts): ISO timestamp of last successful pull (used to request only changes since then).
- Push: Phase that sends pending outbox mutations to the backend.
- Pull: Phase that requests changed/updated records from backend since cursor.
- Snapshot: Locally cached subset of server data (e.g., upcoming bookings) last refreshed at cursor.
- Idempotency: Ability to safely retry a request without creating duplicates (client UUID or natural uniqueness).
- Last-write-wins: Conflict rule—server record with newest updatedAt overwrites local copy.
- attempt_count: Number of push retries for an outbox entry (used for future backoff / surfacing errors).
- server_id: Canonical backend ID for a record (may match local id if we send UUID to server).
- WAL: SQLite write-ahead logging mode improving durability/performance.

---
## 16a. Local Snapshot & Offline Behavior
When online, after each successful sync the app holds a local snapshot of recent (e.g., today + next N days) bookings in the `bookings` table. While offline:
- The UI reads only from this snapshot (stale-but-usable view).
- New bookings are inserted immediately (dirty=1) and added to the outbox.
- Previously synced bookings remain visible for reference (avoids accidental duplicates).
- A "Last synced: <time>" indicator (future UI) communicates freshness.

Trade‑offs:
- Longer offline periods = more divergence; conflicts (e.g., overlap) are resolved by server on push.
- Local validation can optionally warn on obvious overlaps using the snapshot, but ultimate check is server-side on sync.

Reset / Recovery:
- Deleting `data/pos.sqlite` forces a fresh full pull (once backend incremental endpoint exists) – no irretrievable state because unsent mutations lived in outbox (which would also be gone, so only do this after confirming a clean state).

---
## 16b. Lifecycle Story (Narrative)
1. Operator creates booking offline → local UUID generated.
2. Row inserted into `bookings` (dirty=1) + mutation inserted into `outbox`.
3. UI updates instantly (no network wait).
4. Connectivity restored → sync timer fires.
5. PUSH: Send oldest outbox row → on 2xx delete row; update booking (dirty=0, server_id).
6. After outbox drained, PULL: request changed bookings since cursor → upsert & clear dirty.
7. Update cursor (last_sync_ts) & UI "Last synced" time.

---
## 16c. Minimal Mode Options
If initial scope should be even simpler:
**Option A (Push-Only Initial):**
- Implement outbox + push.
- Skip pull until multi-device concerns arise.
- Dirty flag optional (presence in outbox implies dirty).

**Option B (No Separate server_id):**
- Send local UUID to server; server adopts it as canonical id.
- Drop `server_id` column (simplifies upserts). Keep if you anticipate server-assigned numeric IDs later.

**Option C (Dirty-less):**
- Remove dirty column; treat any local row lacking confirmation (e.g. not yet removed from outbox) as unsynced.
- Re-add later if edit-before-sync is needed.

Recommended Initial Choice: Option A + keep dirty (low cost, future flexibility).

---
## 16d. ASCII Flow (Detailed)
```
User Action
  |
  v
Generate local UUID
  |
  v
Insert booking (dirty=1) ----> Render from local snapshot
  |
  +--> Insert outbox row (type, payload)
        |
     (Timer / forceSync fires)
        |
        v
     Sync Cycle
    +-------------------+
    |       PUSH        |
    | outbox oldest row |
    +-------------------+
        |
   success?-----no--> increment attempt_count (leave row)
        |
       yes
        v
      delete outbox row
      mark booking dirty=0 / set server_id
        |
      (repeat until outbox empty or failures only)
        |
        v
    +-------------------+
    |       PULL        | (skip if Option A minimal mode)
    | changed? since ts |
    +-------------------+
        |
   upsert rows (clear dirty)
        |
      update last_sync_ts
        |
        v
   UI updates
```

---
## 17. Open Questions
- Should booking creation offline allocate a temporary local ID separate from server ID? (Current plan: local primary key = UUID; server_id filled after server accepts.)
- Need for optimistic conflict detection (e.g., overlapping bookings) before push? (Not in Phase 1; server authoritative.)
- Do we batch pushes? (Start single; batch later if needed.)

---
## 18. Diagram – Sync Sequence (Condensed)
```
[Renderer] createBooking -> IPC -> enqueueMutation -> [SQLite outbox]
Timer/ForceSync -> processSyncCycle:
  PUSH loop: outbox row -> POST /api/booking -> success -> delete row
  PULL: GET /api/booking/changed?since=cursor -> upsert bookings -> update cursor
UI updates status via IPC events (future)
```

---
## 19. Non-Goals (Phase 1)
- Printer integration
- Multi-window UI
- Real-time push updates
- Complex conflict resolution

---
## 20. Dev Console Prefixes & Common Warning

### Concurrently Prefixes (e.g., `[0]`, `[1]`, `[2]`)
When you run the dev script we use `concurrently` to start multiple processes. Each one gets an index label:
- `[0]` TypeScript watcher (`tsc -w`)
- `[1]` HTML copy watcher (`watch:renderer` via chokidar)
- `[2]` Electron main process (launches the app window)

These numbers are just labels so you can tell which process produced each line. They are not error codes.

### DevTools Warning: `Autofill.enable failed`
You may see a line like:
```
Request Autofill.enable failed. {"code":-32601,"message":"'Autofill.enable' wasn't found"}
```
This originates from Chrome DevTools attempting to enable an Autofill protocol domain that Electron's embedded Chromium build doesn’t provide (or has disabled). It is harmless and can be ignored. It does not impact the POS logic, database, or sync functionality.

If desired you can suppress most noise by closing the DevTools window or by filtering the Console, but we recommend leaving it open during development for renderer/preload logs.

- Encrypted local DB

---
## 20. Quick Start Recap
```
cd pos/apps/electron
npm install
npm run dev
# login, queue booking offline, reconnect, auto-sync
```

---
## 21. Next Review Trigger
After backend exposes `GET /api/booking/changed` and first successful offline → online sync demo, revisit for Phase 2 scope (refresh, retries, status UI).

---
*End of POS Hub Plan*
