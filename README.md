# K-Golf Platform

This monorepo contains:

- **frontend**: Customer-facing booking web app (React + TypeScript + Tailwind)
- **backend**: Express API (TypeScript) – currently in-memory booking logic, planned PostgreSQL + Prisma
- **pos**: Point-of-Sale (POS) hub (Electron + Express + SQLite offline + PostgreSQL sync) – newly scaffolded

## High-Level Architecture

```
[Customer Browsers] --(HTTPS)--> [Backend API (Express + Postgres)]
                                     ^
                                     | periodic sync
[Electron POS Hub Laptop] <----> [PostgreSQL Server]
        |  
        |-- Local SQLite (offline buffer)
        |-- Printer Control (USB / Network)
        |-- Embedded Express server (LAN access)
```

### Booking (Existing)
- Pricing: $50 per player per hour (hours = number of players, 1–4).
- Planned persistence: PostgreSQL (docker-compose `db` service) with overlap constraints.
- Auth (planned): Google OAuth + Email magic link / OTP; sessions via httpOnly cookie.

### POS Hub (New)
A local Electron application that:
- Hosts an Express server bound to `0.0.0.0` so other devices on the same Wi‑Fi can submit orders.
- Uses **SQLite** for offline-first storage and queueing operations.
- Syncs bi-directionally with the central **PostgreSQL** database when online.
- Controls local printers (thermal receipt / kitchen) via Node printing APIs.
- Provides a small renderer UI panel (status: online/offline, pending ops, printer tests).

#### Core POS Data Model (initial draft)
- `orders(id, status, total_cents, version, updated_at, created_at, device_id, deleted_at)`
- `order_items(id, order_id, product_id, qty, price_cents, version, updated_at, deleted_at)`
- `products(id, name, sku, price_cents, active, version, updated_at, deleted_at)`
- `operations(id, entity, entity_id, op_type, payload, version, device_id, status, created_at, last_error)`
- `printers(id, name, system_name, capabilities, is_default, updated_at)`
- `sync_state(id, last_pull_cursor, last_push_time)`

`version` supports conflict detection; soft deletes via `deleted_at`.

#### Sync Strategy
1. Mutations write to SQLite + enqueue an operation (status `pending`).
2. Background job checks remote reachability.
3. Push phase: send pending operations → remote validates & applies → acknowledges or returns conflicts.
4. Pull phase: fetch changed rows since cursor (`updated_at` watermark or sequence) → upsert locally (no new operations generated).
5. Conflicts: server authoritative; local outdated ops are resolved by overwriting with server state (optionally logging conflict).

#### Printer Abstraction
A `printerService` lists printers, sends formatted jobs (e.g., ESC/POS) and test prints. Implementation detail pluggable per OS.

## Repository Layout
```
frontend/        # Booking web app
backend/         # API server (to be wired to Postgres via Prisma)
pos/
  apps/
    electron/
      main.ts    # Electron main process (to be implemented)
      preload.ts # Secure context bridge (to be implemented)
      renderer/
        index.html
        index.tsx
  packages/
    server/
      src/
        api/     # Express route handlers (orders, printers, sync...)
        services/# DB, sync engine, printer, auth services
        domain/  # Schema & types (shared between local/remote DBs)
```

## docker-compose
PostgreSQL service defined (see `docker-compose.yml`). Useful scripts in root `package.json`:
- `npm run db:up` / `db:down` / `db:logs` / `db:ps` / `db:exec`.

## Planned Next Steps
1. Add Prisma & migrations for booking backend.
2. Implement POS domain schema with Drizzle (dual: SQLite + Postgres) or reuse Prisma (less ideal for dual engines).
3. Build POS sync engine (operations queue + push/pull endpoints) and server endpoints.
4. Add printing service (start with mock; integrate real ESC/POS or system print).
5. Implement auth & secure LAN access tokens.
6. Integrate frontend booking app with real backend persistence & auth.

## Getting Started (Current)
```
# Start DB
npm run db:up

# Dev (frontend + backend concurrently)
npm run dev
```
POS hub dev scripts will be added as implementation progresses.

---
This README will expand as the POS hub and persistence layers are implemented.
