# POS Hub – User Flows & UI / Interaction Blueprint

(Companion to `pos/README.md`. Focus here is UX, flows, component hierarchy, design tokens.)

---
## 1. Personas & Assumptions
- Manager (primary initial persona) – performs bookings, oversees operations, and will manage creation of employee (operator) accounts.
- Employee / Operator (future) – accounts created by manager; simplified UI for day-to-day booking & order entry (not in first build).
- Single hub device first; multi‑device support (secondary tablets / stations) comes later.
- Network may drop at any time; app must remain fully usable offline.
- Early UX decisions bias toward management-oriented screens while keeping pathways to later extract a lighter operator-facing view.

---
## 2. Primary User Journeys (MVP)
### 2.1 Launch (Cold, No Credentials) – PLANNED
1. Start app → Login screen.
2. User enters email/password → backend auth.
3. Refresh token stored (keytar), access token in memory.
4. Dashboard loads; sync loop starts if online.

### 2.2 Launch (Warm, Refresh Token Present) – PLANNED
1. Start app → silent refresh.
2. Success → Dashboard; Fail → Login screen (token expired/revoked).

### 2.3 Create Booking (Online)
1. User opens New Booking form.
2. Fills minimal fields: name, start time, duration (or end).
3. Submit → local UUID, insert booking (dirty=1) + outbox row.
4. UI shows booking immediately (Pending badge).
5. Automatic / manual push clears pending → status Confirmed.

### 2.4 Create Booking (Offline)
1. Status shows Offline (amber).
2. Same form works; queue increments.
3. On reconnect → automatic push drains queue → badges clear.

### 2.5 Force Sync
Manual Sync button triggers push (and later pull). Updates last sync timestamp.

### 2.6 Auth Expiry Mid Push
401 → attempt refresh. If success → retry once; else show Login modal, disable protected actions.

### 2.7 Network Drop Mid Session
Health probe fails → Offline state. User continues creating bookings. Reconnect triggers sync.

### 2.8 Conflict (Future)
Server rejects overlapping booking → outbox entry retained, attempt_count++. UI marks row “Needs Attention”.

### 2.9 Reset / Corruption
Developer removes `data/pos.sqlite` → next launch rebuilds schema; (Phase 1+) full pull repopulates snapshot.

### 2.10 Logout
User initiates logout → access cleared, refresh removed, DB untouched → return to Login screen.

---
## 3. Edge / Recovery Flows
| Situation | Behavior |
|-----------|----------|
| Repeated push failures | After N attempts show warning banner / toast |
| Large queue after downtime | Queue counter animates decrement per successful push |
| Partial push success | Stop on first failure; remaining entries stay queued |
| Clock skew | Server `updatedAt` authoritative |
| DB corruption | Delete DB, resync (loss of unsynced ops) |

---
## 4. Information Architecture
Single window layout (Phase 0–1):
```
┌──────────────────────────────────────────┐
│ Status Bar (online/offline • queue • last sync • user/login) │
├──────────────────────────────────────────┤
│  Bookings List (Today)  |  Booking Form / Details          │
│                         |  (New or selected booking)       │
├──────────────────────────────────────────┤
│  (Future) Toast region / Diagnostics link                  │
└──────────────────────────────────────────┘
```
Future navigation tabs: Bookings | Orders | Settings.

---
## 5. Screen Inventory (MVP)
1. Login (modal or full screen when unauthenticated)
2. Dashboard (Bookings primary view)
3. Booking Form (embedded panel)
4. Toast/Notification layer
5. (Future) Orders view
6. (Future) Settings / Diagnostics

---
## 6. Core Components (Initial)
- StatusBar: online / queueSize / lastSync / sync button / user indicator
- BookingList: list of bookings (pending vs confirmed styles)
- BookingRow: displays basic fields + status badge
- BookingForm: create new booking (optimistic insert)
- SyncButton: manual trigger with loading state
- LoginModal: credentials → IPC login
- ToastContainer / ToastItem
- (Later) QueueDiagnostics / DeviceInfo panel

---
## 7. Interaction & State Model
Renderer state slices:
- auth: { loggedIn, userEmail? }
- sync: { online, syncing, queueSize, lastSync }
- bookings: array of snapshot + pending
- ui: { activeBookingId?, showLogin }

Primary events (IPC): `auth:loginResult`, `queue:update`, `booking:created`, `booking:updated`, `sync:status`, `sync:error`.

Optimistic create flow:
Renderer → IPC `booking:create` → main writes DB & outbox → main emits queue:update + booking:created → renderer updates list.

---
## 8. Design Tokens (Foundational)
Colors:
- Primary: #0D5F9A
- Accent: #1277C4
- Success: #198754
- Warning: #D39E00
- Danger: #C82333
- Grays: #111, #333, #555, #888, #CCC, #EEE

Spacing: 4 8 12 16 24 32
Radius: 4px (cards, inputs, buttons)
Typography: System stack (`-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif`)
Borders: 1px solid #CCC; focus outline 2px #1277C4 (offset 2px)
Motion: ≤150ms ease for hover/active; subtle pulse for syncing indicator

State Cues:
- Offline: amber pill + muted Sync button
- Pending booking: amber badge + dotted left border
- Syncing: animated blue dot / rotating icon
- Error: red toast (auto dismiss after 6s)

---
## 9. Validation (Initial)
- customerName: required, ≥2 chars
- startsAt < endsAt
- duration <= 6h (soft rule; show warning)
- Overlap: optional warning only (server authoritative in Phase 1)

---
## 10. Instrumentation (Later)
- Queue length trend
- Failed push count
- Last auth refresh timestamp
- Average push latency

---
## 11. Accessibility Notes
- All interactive elements keyboard reachable (Tab order logical)
- Visible focus outlines (do not suppress)
- ARIA live region for toast notifications
- Color contrast AA for text and critical indicators

---
## 12. Proposed UI Tasks (Add to TASKS.md after approval)
0.UI.1 Add base CSS or Tailwind config + tokens
0.UI.2 StatusBar component (online/queue/lastSync + Sync + Login/Logout)
0.UI.3 BookingForm (optimistic insert) + minimal validation
0.UI.4 BookingList + BookingRow (pending vs confirmed styling)
0.UI.5 LoginModal (IPC auth)
0.UI.6 Toast system (errors/success)
0.UI.7 Sync event wiring & store updates
0.UI.8 Basic accessibility pass (focus, aria-live)

---
## 13. Recommended Implementation Order (Blended)
1. Core DB & enqueue (0.3 / 0.4) – foundation
2. StatusBar (queue + online) – visibility
3. Manual push (0.5) – core loop test
4. Auth + LoginModal (0.8 + 0.UI.5)
5. Scheduled push loop (0.9)
6. BookingForm + BookingList (0.UI.3/0.UI.4)
7. Last Sync timestamp (0.10)
8. Toast + error surfacing (0.UI.6)
9. Polish & accessibility (0.UI.8)

---
## 14. ASCII Flow (Create → Sync)
```
User → BookingForm Submit
  → IPC booking:create
    → main: insert bookings(dirty=1), outbox row
      → emit queue:update
Renderer updates list (Pending)
Timer/ForceSync → main push cycle
  success → delete outbox row, mark booking dirty=0
  → emit booking:updated + queue:update
Renderer updates row (Confirmed)
```

---
## 15. Future Enhancements (UI)
- Keyboard shortcuts (N new booking, R force sync)
- Dark mode toggle
- Compact list density option
- Conflict resolution panel (merge / override)
- Orders board (kanban style for in‑progress orders)
- Diagnostics overlay (DB path, device ID, last errors)

---
## 16. Open UX Questions
- Do we need a dedicated splash screen (or just fast boot)?
- Should pending bookings be grouped at top or inline sorted by start time?
- Show relative times ("in 12m") or absolute times only?
- Inline editing vs separate detail view for existing bookings?

---
## 17. Acceptance Criteria (UI Slice MVP)
- StatusBar always reflects online/offline & queue count within 1s of change.
- Creating a booking offline increments queue & shows Pending badge instantly.
- Force Sync clears all sendable outbox items and updates badges.
- Login modal appears only when auth absent/invalid.
- No blocking spinner covers the whole app (non‑modal operations).

---
## 18. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Renderer over-fetch IPC | Introduce simple cache & event-driven updates |
| UI stutters with large list | Virtualize later (not needed early) |
| Sync errors hidden | Central toast + StatusBar error icon |
| Confusion offline vs pending | Distinct offline pill + pending row styling |

---
## 19. Summary
This blueprint defines how operators move through the POS app, how offline-first booking creation feels immediate, and how sync/auth states surface without obstructing rapid entry. After approval we fold UI tasks into the execution plan and scaffold the first components alongside the core modules.

---
**Action:** Confirm approval or request adjustments; then we will (a) append UI tasks to `TASKS.md`, (b) scaffold `src/core/` modules, and (c) start with StatusBar + DB init.
