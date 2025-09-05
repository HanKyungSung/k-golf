# K-Golf Platform

This monorepo contains:

- **frontend**: Customer-facing booking web app (React + TypeScript + Tailwind)
- **backend**: Express API (TypeScript) – PostgreSQL + Prisma
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
- Pricing: $50 per player per hour (players 1–4, hours 1–4 independently).
- ~~Planned persistence: PostgreSQL (docker-compose `db` service) with overlap constraints.~~
- Persistence: PostgreSQL + Prisma with overlap constraints.
- Auth: Email verification + password login; sessions via HttpOnly cookie. Google OAuth planned.

## What’s New (Aug 2025)

Auth and UX
- Frontend verification flow: email links now land on the frontend `/verify` page before calling the backend.
- Resend verification with cooldown: UI shows remaining seconds; backend enforces a retry window.
- Structured login errors: backend returns specific codes/messages; frontend surfaces them consistently.
- Auto-logout on expiry: frontend revalidates the session on mount, window focus/visibility, online events, and every 5 minutes; a 401 clears local user and shows a toast “Session expired, please log in again.”

Bookings and Availability
- Availability API: `GET /api/bookings/availability?roomId&date&hours&slotMinutes&openStart&openEnd` computes valid continuous windows (no extra table).
- Overlap prevention: server checks for conflicting bookings; optional DB constraint planned.
- Price stored as decimal: Booking.price is `Decimal(10,2)` (replaced older cents field).
- Rooms API: `GET /api/bookings/rooms` returns active rooms only.
- Frontend booking page now calls the backend for availability and booking creation; errors shown inline.
 - No past bookings: server rejects booking requests with a start time in the past; availability marks past starts unavailable.
 - Cancellation: `PATCH /api/bookings/:id/cancel` lets users cancel their own upcoming bookings.
 - Dashboard metrics: counts and monthly spend now consider only completed bookings.

Database changes
- Booking status column switched from a Postgres ENUM to TEXT for flexibility. The Prisma model is now `status String @default("CONFIRMED")` and the migration `20250828080000_status_to_string` alters the column type safely and drops the old enum if unused.
- "completed" remains a derived UI state (when `endTime < now`); there is no DB enum value for it.
- All DateTimes are stored as UTC (timestamptz). Migration `20250828090000_use_timestamptz` converts all timestamp columns to `timestamptz` using `AT TIME ZONE 'UTC'` so existing values keep the same absolute instant. API responses return ISO-8601 UTC strings.

Rooms and Seeding
- Seed script ensures exactly four active rooms: Room 1–4 (capacity 4). All other rooms are deactivated.
- Frontend keeps the original 4-card design (Room 1–4, static images) and maps each card to a real backend UUID.

Quality
- Centralized error parsing on frontend auth; symmetric cookie handling on logout.
- Diagrams and docs updated (availability and ER), including Mermaid fixes.

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
## Roadmap & Status (Consolidated)
- Done
  - Frontend SPA with routing, auth screens, booking flow, and availability UI wired to backend.
  - Backend API with Prisma/PostgreSQL persistence, overlap checks (excluding canceled bookings), and price stored as Decimal(10,2).
  - Rooms API and seed: ensures exactly four active rooms (Room 1–4) for deterministic mapping in the UI.
  - Session handling with HttpOnly cookie, email verification/password login, resend cooldown, structured errors, and auto-logout on expiry.
  - Availability endpoint: `GET /api/bookings/availability` computes valid slots by date/room/hours.
  - Booking endpoints: `POST /api/bookings`, `GET /api/bookings`, `GET /api/bookings/mine`, `PATCH /api/bookings/:id/cancel`.
  - Database: Booking.status switched to TEXT with default `CONFIRMED`; "completed" is derived by `endTime < now` in API responses/UI.
  - Time rules: reject past bookings; availability hides past starts. Dashboard totals only include completed bookings.

- Next
  - Endpoint: `GET /api/bookings/:id` (single booking detail).
  - Validation & rules: hours-of-operation config; slot rounding server-side; optional cancel cutoff window (e.g., cannot cancel within N minutes).
  - Pricing: extract unified calculator used by server and (optionally) client.
  - Observability: logging with request IDs; health/readiness checks; basic metrics stub.
  - Security: tighten CORS, add rate limiting, refine headers, and ensure secure cookie settings in prod.
  - Deployment: Dockerfile for backend, Nginx proxy, env matrices, and `prisma migrate deploy` in release flow.
  - POS Hub: continue scaffolding Electron app (local SQLite, printer control, sync engine) once web app is stable.
  - Linting: re‑introduce enterprise lint stack (ESLint + TypeScript strict rules + import/order + promise + security + prettier) with phased enforcement.
1. Logging: pino logger with request ID middleware.
2. Metrics stub (expose `/metrics` for future Prometheus) – optional.
3. Health endpoints: `/healthz` (basic), `/readyz` (DB connectivity check).
4. Tests:
  - Unit: price calculator, availability logic.
  - Integration: booking creation + overlap rejection.
5. Add Prisma seed test data for local dev convenience.

### Flat TODO Backlog (No Phases)
Core API / Booking
- `GET /api/bookings/:id` endpoint.
- Optional cancellation cutoff window + confirm dialog.
- Unified price calculation utility shared (server + potential client reuse).
- Hours-of-operation config & slot rounding on server.

Quality / Observability / Security
- Logging: request ID middleware (pino child logger).
- Health endpoints: `/healthz` (basic), `/readyz` (DB check).
- Metrics stub (expose `/metrics`).
- Rate limiting on auth & booking create.
- CORS allowlist via env.
- Helmet (curated headers) & secure cookie flags.

Deployment / Infra
- Backend Dockerfile (multi-stage) & production docker-compose override.
- Nginx reverse proxy (TLS, gzip, static caching for frontend build).
- Automated `prisma migrate deploy` in release.
- Document environment matrices (dev/staging/prod).

Codebase & Docs
- API contract examples in README.
- Remove unused legacy packages.
- Shared utilities module (pricing, time helpers).
- Architectural Decision Records (ORM, auth, overlap strategy).
- Shared types package groundwork for POS.

Enhancements (Later / Nice-to-have)
- WebSocket push for booking updates.
- Admin reporting (revenue, utilization).
- Email notifications (confirmation, reminder, cancel).
- Dynamic / peak pricing rules abstraction.

POS Hub
- Continue Electron app scaffolding (SQLite sync, printer integration, sync engine).

## Getting Started (Current)
```
# 1) Start the database (from repo root)
npm run db:up

# 2) Apply Prisma migrations and generate client (from backend/)
cd backend
npm install
npm run prisma:migrate
npm run prisma:generate

# 3) Seed rooms (creates Room 1–4 active, deactivates others)
npm run db:seed

# 4) Run backend API
npm run dev

# 5) In a new terminal, run the frontend
cd ../frontend
npm install
npm run dev
```

Notes on migrations
- In development, always add new migrations; do not delete or rewrite migrations that were already applied to your local DB. If your database has migrations applied that are no longer present in the repository, Prisma will detect a divergence and may prompt to reset (drop and recreate) the schema during `prisma migrate dev`.
- If you see: "The migrations recorded in the database diverge from the local migrations directory… We need to reset the schema", this is due to history divergence, not because every change resets data. In dev, you can accept the reset and then run `npm run db:seed` to restore sample data.
- In production, never reset and never use `prisma migrate dev`. Use `prisma migrate deploy`, keep a linear, append‑only migration history, and avoid deleting past migrations.

### Timestamps & Timezones (UTC)

- Storage: All Prisma `DateTime` fields are mapped to Postgres `timestamptz` and persisted as UTC instants.
- Migration: `20250828090000_use_timestamptz` casts existing columns to `timestamptz` with `AT TIME ZONE 'UTC'` to preserve the exact moment in time.
- Input: Booking creation expects an ISO string (`startTimeIso`) that should be UTC. Server parses via `new Date(startTimeIso)`.
- Output: API returns ISO-8601 strings in UTC for all timestamps.
- Availability: The `/api/bookings/availability` endpoint builds the requested day window using the server's local timezone, but it doesn't persist those intermediary times; emitted slot times are ISO UTC strings.
- Future: If the venue timezone should be fixed regardless of server location, introduce a `VENUE_TIMEZONE` env and compute availability in that IANA zone.

Why status is TEXT now
- The booking status needs to evolve (e.g., adding new states) without brittle enum churn. Using TEXT avoids destructive enum alterations and complex migrations. Validation is enforced in application code, and the current allowed values are `CONFIRMED` and `CANCELED` (with `CONFIRMED` as default). Canceled bookings are ignored in availability/overlap checks.

Env
- Backend: set `CORS_ORIGIN` (frontend origin) and optionally `FRONTEND_ORIGIN` for email links; `DATABASE_URL` for Postgres.
- Frontend: set `REACT_APP_API_BASE` to the backend base URL (e.g., `http://localhost:8080`).

## API quick reference

- GET `/api/bookings/rooms` → list active rooms
- GET `/api/bookings/availability?roomId&date=YYYY-MM-DD&hours=1..4&slotMinutes=30&openStart=09:00&openEnd=23:00` → available slots (ISO UTC)
- GET `/api/bookings` → list all bookings (admin/dev)
- GET `/api/bookings/mine` → current user's bookings (status normalized: `booked` | `completed` | `canceled`)
- POST `/api/bookings` { roomId, startTimeIso, players, hours } → create booking (rejects past-start)
- PATCH `/api/bookings/:id/cancel` → cancel own upcoming booking

## Notes: Room IDs vs UI Labels

- Database Room IDs are UUIDs (Prisma `@default(uuid())`). The UI continues to display four cards labeled “Room 1–4”.
- The frontend fetches active rooms (`GET /api/bookings/rooms`), then maps those UUIDs onto the four display cards. API calls (availability, create booking) always send the real UUID, not the UI label.
- The seed ensures exactly four active rooms (names: Room 1–4) so mapping is deterministic in development.
POS hub dev scripts will be added as implementation progresses.

## Quick Concepts
**Repository (e.g. bookingRepo)**: A thin module wrapping all database calls for one domain (create/find/list/cancel bookings) so route handlers stay simple (validate → call → respond) and future logic/ORM changes live in one place.

**Zod**: A TypeScript-first schema validator used to define expected request body shapes once, validate incoming JSON at runtime, and infer static types—reducing boilerplate and preventing malformed data from reaching business logic.

---
This README will expand as the POS hub and persistence layers are implemented.

### TODO – Lint & Code Quality (Deferred)
When re‑enabling linting:
- Add deps: eslint, @typescript-eslint/parser + plugin, eslint-plugin-import, eslint-plugin-promise, eslint-config-prettier (plus prettier), eslint-plugin-security (optional).
- Create root `.eslintrc.cjs` with per-workspace `parserOptions.project`.
- Start with: recommended, import/order (warn), promise rules (warn), prettier (warn), eqeqeq, curly, no-console (warn).
- Then add: no-floating-promises, no-misused-promises.
- Gradually enable type-safety rules (`no-unsafe-*`, `no-explicit-any`) from warn → error.
- Add CI gate once noise is low.
