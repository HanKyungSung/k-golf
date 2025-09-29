# POS Force Sync Invocation Flow

Date: 2025-09-28
Status: Draft (author: assistant)
Scope: Electron POS app push (Phase 0.6) – manual Force Sync path from UI button down to backend POST and result propagation back to renderer.

---
## 1. Purpose
This document captures the exact call chain and logic involved when a user clicks the **Force Sync** button in the POS Electron application. It is intended as a quick refresher for:
- Debugging stuck outbox items
- Extending sync logic (e.g., batching, pull, backoff)
- Validating that UI and main process wiring is intact after refactors

---
## 2. High-Level Narrative
1. User clicks **Force Sync** in the header.
2. A React context method (`forceSync`) invokes the preload bridge.
3. Preload calls an IPC channel (`sync:force`).
4. Main process IPC handler performs authorization, then runs `processSyncCycle`.
5. `processSyncCycle` loops, calling `pushSingle` for each oldest outbox entry until:
   - Queue empty, OR
   - Auth expired (401), OR
   - A non-auth failure occurs.
6. Result object returned to main → broadcast via `queue:update` → renderer listener updates UI & logs.

---
## 3. Sequence Diagram
```
User
  | clicks "Force Sync"
  v
AppHeader <Button onClick={onSync}>
  | (prop onSync)
  v
AuthContext.forceSync()
  | api()?.forceSync()
  v
preload.ts (window.kgolf.forceSync)
  | ipcRenderer.invoke('sync:force')
  v
main.ts (ipcMain.handle 'sync:force')
  | processSyncCycle(apiBase)
  v
sync.ts::processSyncCycle()
  | loop: peekOldest() -> pushSingle()
  |   pushSingle(): axios POST /api/bookings
  |     success -> deleteItem + markBookingClean
  |     400 permanent validation -> drop & treat as success
  |     401 -> return 'auth-expired'
  |     else -> incrementAttempt + failure
  | stop conditions reached
  v
SyncCycleResult { pushed, failures, remaining, authExpired, lastError? }
  | emit queue:update { queueSize, sync }
  v
Renderer onSync listener (authState.tsx)
  | update queueSize + console.log cycle
  v
forceSync() finalizes #syncResult text
```

---
## 4. File Touchpoints & Responsibilities
| Layer | File | Responsibility |
|-------|------|----------------|
| UI Button | `renderer/components/layout/AppHeader.tsx` | Emits `onSync` on click |
| Page wiring | `renderer/pages/DashboardPage.tsx` | Passes context `forceSync` into header |
| Context API | `renderer/app/authState.tsx` | Implements `forceSync()`, updates span, logs results, subscribes to sync broadcasts |
| Bridge | `preload.ts` | Exposes `forceSync()` → `ipcRenderer.invoke('sync:force')` |
| Main IPC | `src/main.ts` | AuthZ check; runs `processSyncCycle`; emits `queue:update` + handles auth-expired |
| Sync Orchestrator | `core/sync.ts` (`processSyncCycle`) | Drains outbox loop; aggregates metrics & `lastError` |
| Single Push | `core/sync.ts` (`pushSingle`) | Translates payload, posts booking, classifies & drops permanent validation |
| Outbox Ops | `core/outbox.ts` | `peekOldest`, `deleteItem`, `incrementAttempt`, size queries |

---
## 5. Key Data Structures
### SyncCycleResult
```
{
  pushed: number;         // successfully removed (or dropped as permanent problems)
  failures: number;       // first blocking failure or auth expiry counted here
  remaining: number;      // queue size after cycle
  authExpired: boolean;   // 401 encountered
  lastError?: {           // provided for diagnostics / UI surfacing
    code: string;         // e.g. VALIDATION_ERROR, VALIDATION_DROPPED, AUTH_EXPIRED
    status?: number;      // HTTP status if available
    message?: string;     // human-readable text from backend or internal classification
    outboxId?: string;    // id of the outbox record tied to the failure
  };
}
```
### PushOutcome (internal)
`'success' | 'auth-expired' | 'failure'`

---
## 6. Permanent Validation Drop Logic
Currently triggered inside `pushSingle` when:
- HTTP 400 AND backend error string contains one of:
  - `outside room operating hours`
  - `cannot book a past time slot`
  - `cross-day`
On match: item is removed, booking marked clean, `pendingErrorInfo` tagged `VALIDATION_DROPPED`, and returned as `'success'` to allow draining to continue.

Planned Enhancements:
- Broaden phrase set (config or regex)
- Fallback: drop after N identical attempts
- Provide audit log table for dropped validation failures

---
## 7. Control Flow Details
1. Guard Against Re-entrancy: `syncing` boolean prevents overlapping cycles.
2. Loop Behavior: stops immediately after first non-auth failure to enable manual inspection (future: continue strategy / partial backoff).
3. Auth Expiry: 401 -> `authExpired=true`, queue stops, main clears local auth and emits `auth:state`.
4. Metrics Semantics:
   - `pushed` counts true successes AND permanently dropped validations.
   - `failures` increments only once per cycle (first boundary condition) including auth expiry.
   - `remaining` always recomputed from DB after loop (not derived from counters).
5. Error Surfacing: `lastError` reflects the boundary failure/dropped classification for UI diagnostics.

---
## 8. Quick Troubleshooting Checklist
| Symptom | Likely Cause | Action |
|---------|--------------|--------|
| Force Sync does nothing | `syncing` flag stuck | Restart app; ensure prior cycle finished (look for missing finally) |
| Queue not decreasing & same `VALIDATION_ERROR` | Phrase not matched to drop | Expand permanent phrases or inspect backend message casing |
| `AUTH_EXPIRED` repeatedly | Session cookie invalid / expired | Re-login; confirm cookie set in main logs |
| `NO_ROOM_ID` error | Room discovery failure / no active room | Set `POS_ROOM_ID` env or ensure rooms endpoint returns at least one active |
| Network timeouts | Backend unreachable | Check API base URL / connectivity |

---
## 9. Observability Hooks
- Renderer Console:
  - `[SYNC][RENDERER] forceSync result` (immediate action)
  - `[SYNC][RENDERER] cycle result` (from broadcast listener)
- Main Process Logs:
  - `[SYNC] POST ...` each attempt
  - `[SYNC] push failed <status>` failures
  - `[SYNC] Dropping permanent validation failure ...` drops
  - `[SYNC] Auth expired (401)` auth boundary
- DOM Span: `#syncResult` shows compact summary

---
## 10. Future Improvements (Backlog Seeds)
- Batch pushes (reduce HTTP overhead)
- Exponential backoff with jitter for 5xx / network errors
- Attempt-based permanent failure auto-drop (configurable threshold)
- Add IPC to delete individual outbox entries manually (`debug:outbox:delete`)
- Structured logging (log levels + correlation id per cycle)
- Telemetry events for success/failure rates
- Pull sync phase (server → local) with last-seen cursor

---
## 11. Minimal Code Landmarks (for Grep)
| Landmark | Grep Pattern |
|----------|--------------|
| IPC trigger | `ipcMain.handle('sync:force'` |
| Renderer call | `api()?.forceSync()` |
| Bridge expose | `forceSync: () => ipcRenderer.invoke('sync:force')` |
| Loop start | `processSyncCycle(` |
| Single push | `async function pushSingle(` |
| Permanent drop log | `Dropping permanent validation failure` |

---
## 12. Change Log (Doc)
- 2025-09-28: Initial draft created.

---
## 13. TL;DR
Force Sync = UI button → context → preload IPC invoke → main IPC handler → sync cycle loop (drain or stop on boundary) → broadcast results back to renderer. Permanent 400 validation errors (matched phrases) are dropped so they do not block the rest of the queue.

---
## 14. Logging Visibility Reference
This table summarizes where `console.*` output appears based on where the code executes inside the Electron POS architecture.

| Layer / Area | Typical Files | Execution Context | Appears In | Common Prefix Examples |
|--------------|---------------|-------------------|-----------|------------------------|
| Main Process (Electron) | `src/main.ts`, anything only imported by main like `core/sync.ts` | Node (Electron main) | Terminal / launching shell | `[MAIN]`, `[SYNC]`, `[DEVTOOLS]` |
| Sync Core Functions | `core/sync.ts`, `core/outbox.ts` | Main process (same as above) | Terminal | `[SYNC] POST`, `[SYNC] push failed` |
| Renderer (React App) | `renderer/app/authState.tsx`, components, pages | Browser (Chromium renderer) | DevTools Console | `[SYNC][RENDERER] ...` |
| Preload Script | `preload.ts` | Isolated world in renderer process | DevTools Console | `[PRELOAD] injected` |
| Shared Module Imported by Renderer | (any TS file bundled into renderer) | Renderer | DevTools Console | (whatever you log) |
| Shared Module Imported Only by Main | (helpers not bundled into renderer) | Main | Terminal | (whatever you log) |
| Backend (for comparison) | (N/A – server) | Separate Node process | Server terminal / logs | (API logs) |

Guidelines:
- To make cross-origin (process) logs distinguishable, adopt a prefix schema, e.g.: `[M]` main, `[R]` renderer, `[P]` preload.
- Permanent sync classification logs (validation drops) happen in main; you will only see them in the terminal unless you forward them.
- To surface main logs in DevTools, forward them via IPC: wrap `console.log` in main and emit to a `log:forward` channel consumed in preload.

Minimal forwarding sketch:
```
// main.ts
const origLog = console.log;
console.log = (...a) => { origLog(...a); emitToAll('log:forward', { level: 'log', args: a }); };

// preload.ts
ipcRenderer.on('log:forward', (_e, p) => { (console as any)[p.level]?.('[MAIN→RENDERER]', ...p.args); });
```

After enabling, main process `[SYNC]` messages mirror into DevTools with a `[MAIN→RENDERER]` prefix while still appearing in the terminal.

---
*End of document.*
