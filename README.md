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
The immediate priority is to COMPLETE the customer booking web application (rooms, bookings, authentication, pricing) before investing further in the POS hub. Below is a phased, granular roadmap with clear DONE / NEXT indicators.

### Legend
- ✅ Done
- 🔜 In progress / next action
- ⏭ Scheduled (later phase)

### Phase 0 – Current State (Baseline)
- ✅ Frontend React SPA (routing migrated off Next.js)
- ✅ Dockerized PostgreSQL running locally (`db` service)
- ✅ In‑memory booking endpoints (temporary)
- ✅ Pricing rule defined ($50 * players * hours, hours = players)
- 🔜 Persistence layer not yet implemented (Prisma + migrations)

### Phase 1 – Persistence Foundation (Database + ORM)
1. 🔜 Add dependencies to `backend`:
  - `prisma`, `@prisma/client`, (dev) `ts-node`, `tsx` if needed
2. Create `backend/prisma/schema.prisma` with models:
  - `User`, `AuthProvider`, `VerificationToken`, `Session`
  - `Room` (capacity, active)
  - `Booking` (roomId, userId, startTime, endTime, players, priceCents, status)
3. Add PostgreSQL extensions migration (if using EXCLUDE constraint requires `btree_gist`).
4. Run: `npx prisma migrate dev --name init` (writes migrations folder)
5. Implement a seed script (`backend/prisma/seed.ts`) to insert initial rooms (e.g., 4 demo simulators).
6. Add npm scripts:
  - `db:migrate`, `db:generate`, `db:seed`
7. Verify DB objects exist (inspect via `psql` or Prisma Studio).

### Phase 2 – Booking Domain Implementation (Server)
1. Replace in‑memory storage with Prisma repository modules:
  - `repositories/bookingRepo.ts`
  - `repositories/roomRepo.ts`
2. Add overlap prevention:
  - Option A: EXCLUDE constraint on `(room_id WITH =, tstzrange(start_time, end_time) WITH &&)`
  - Option B: Serializable transaction + manual check (fallback)
3. Unified price calculation util (single source of truth) used in POST /bookings.
4. Endpoints (REST):
  - `GET /api/rooms` (list active rooms)
  - `GET /api/availability?roomId=&date=` (returns 30/60‑min slots with booking status)
  - `POST /api/bookings` (payload: roomId, startTime, players) → validates capacity & pricing
  - `GET /api/bookings/:id`
  - `GET /api/bookings` (current user’s bookings)
  - `PATCH /api/bookings/:id/cancel` (soft cancel if > threshold time)
5. Central error handler + zod schemas for request validation.

### Phase 3 – Authentication & Sessions
Registration is implemented FIRST (before full booking UX dependency on auth). Two parallel methods: email verification (passwordless) and Google OAuth.

#### 3.1 Email Registration & Verification (Passwordless Start)
Flow (magic link OR 6-digit code—choose one initial, link recommended):
1. `POST /auth/register` { email }:
  - Normalize email (lowercase/trim).
  - If existing verified user: respond 200 with generic message (avoid user enumeration).
  - Create user row if not exists (role=CUSTOMER, unverified flag implicit until token consumed).
  - Insert `VerificationToken` (identifier=email, tokenHash=hashedRandom, type='magic_link', expiresAt=+15m).
  - Send email with link: `https://app.example.com/verify?token=plainToken&email=...` (plain token only in email, NOT stored in DB except hashed).
2. `POST /auth/verify` { email, token }:
  - Look up token by email (identifier) & unconsumed & not expired.
  - Hash incoming token & compare.
  - Mark consumedAt, create session (Session row or sign JWT w/ sessionId), set httpOnly cookie.
  - Return user profile.
3. Subsequent requests include session cookie → `GET /auth/me` returns user data.

Optional variant (OTP code): store 6-digit numeric code instead of random token; limit attempts; same expiration.

Security notes:
- Always respond 200 on register/verify with generic messages to prevent enumeration.
- Hash tokens (e.g., SHA256) before storage.
- Rate limit register + verify endpoints per IP + per email.

#### 3.2 Google OAuth (gmail first)
1. Frontend loads Google Identity Services and obtains ID token.
2. `POST /auth/google` { idToken }:
  - Backend verifies signature (Google certs) & audience, extracts sub, email.
  - Upsert user (verified implicitly if Google says email_verified=true).
  - Upsert `AuthProvider` (provider='google', providerUserId=sub).
  - Create session (cookie) and return profile.

#### 3.3 Endpoints Summary (Initial Set)
- `POST /auth/register` (idempotent, begins email flow)
- `POST /auth/verify` (completes email flow, issues session)
- `POST /auth/google` (Google sign-in)
- `GET /auth/me` (current session user)
- (Later) `POST /auth/logout` (invalidate session)

#### 3.4 Session Strategy
- Start with DB-backed Session table (simpler revocation) storing: id, userId, sessionToken (random), expiresAt.
- Set cookie: `session=<token>; HttpOnly; Secure (prod); SameSite=Lax`.
- Rolling refresh: each request optionally extends expiry (guard with max age cap).

#### 3.5 Middleware
- `requireAuth` loads session by cookie token → attaches `req.user` (selected user fields) → 401 if missing/expired.

#### 3.6 Email vs SMS Verification Decision
| Aspect | Email | SMS |
|--------|-------|-----|
| Direct cost | ~$0.0001–$0.001 per msg (often free in starter tiers) | ~$0.007–$0.02 US per SMS (Twilio-like pricing) |
| Setup | Simple (transactional email provider + DKIM/SPF) | Requires phone number purchasing, compliance (opt-in, regional rules) |
| Speed | Fast enough (< a few seconds) | Usually very fast (<5s) |
| Reliability | Can land in spam if misconfigured | Delivery sometimes blocked or delayed; carrier filtering |
| UX friction | User needs inbox access | User must reveal phone number |
| Abuse surface | Disposable email risk | SIM swap / cost abuse risk |

Initial recommendation: EMAIL ONLY (passwordless link) for MVP; add SMS later only if conversion or security metrics justify cost.

#### 3.7 Future Enhancements (Deferred)
- Add refresh token rotation & device management.
- Add optional password set (convert to hybrid auth) if needed.
- Integrate rate limiter & IP allow/deny lists.
- Add audit log (user sign-ins, verification attempts).

### Phase 4 – Frontend Integration (Bookings + Auth)
1. Update `useAuth` hook to call backend (`/auth/me`, login flows) instead of localStorage mock.
2. Build authentication screens (login, signup / request code, verify code).
3. Replace booking form submit: POST to `/api/bookings` + show success + redirect to dashboard.
4. Availability view: call `/api/availability` to disable already booked or invalid slots.
5. Dashboard page: fetch real bookings, render status, allow cancellation.
6. Global error + toast handling for API failures (network, validation, auth expiry).

### Phase 5 – Validation, Pricing & Edge Cases
1. Server rejects: overlapping booking, players > room capacity, startTime in past, endTime beyond hours of operation.
2. Add hours-of-operation config (e.g., 08:00–22:00) and enforce.
3. Round start times to slot size (e.g., 60 min) server-side.
4. Price recalculation on every GET of booking (avoid stale storing other than canonical `price_cents`).
5. Cancellation window rule (e.g., cannot cancel within 1 hour of start) enforced in endpoint.

### Phase 6 – Observability & Quality
1. Logging: pino logger with request ID middleware.
2. Metrics stub (expose `/metrics` for future Prometheus) – optional.
3. Health endpoints: `/healthz` (basic), `/readyz` (DB connectivity check).
4. Tests:
  - Unit: price calculator, availability logic.
  - Integration: booking creation + overlap rejection.
5. Add Prisma seed test data for local dev convenience.

### Phase 7 – Security Hardening
1. CORS: restrict allowed origins (env list).
2. Rate limiting: lightweight in-memory or Redis (later) on auth + booking creation.
3. Helmet middleware (selected headers) – adjust for SPA.
4. Secure cookies (SameSite=Lax, Secure in prod, HttpOnly) + CSRF token for non-GET if required.
5. Input sanitization / output escaping where needed.

### Phase 8 – Deployment & Environments
1. Backend Dockerfile (multi-stage: build + runtime slim).
2. Compose override for production (expose only necessary ports, persistent volume for Postgres).
3. Nginx reverse proxy (TLS termination, compress, cache static frontend build).
4. Environment variable matrix (dev, staging, prod) documented.
5. Automated migration step on container start (`prisma migrate deploy`).

### Phase 9 – Documentation & Cleanup
1. Update README with actual API contract examples.
2. Remove unused legacy packages (e.g., `next-themes` if abandoned).
3. Consolidate shared utility functions (pricing, time) into a module.
4. Add architectural decision records (ADR) for: ORM choice, auth strategy, booking overlap enforcement.
5. Prepare POS integration prerequisites (shared types package) – ⏭ after web app stable.

### Phase 10 – (Optional) Enhancements
- WebSocket push for booking updates (optimistic UI improvement).
- Admin reporting endpoints (revenue by day, utilization %).
- Email notifications (booking confirmation, reminders, cancellations).
- Rate / dynamic pricing rules (holiday, peak hours) abstraction.

### Immediate Next Action (Recommended Now)
Implement Phase 1 steps 1–3:
1. Add Prisma dependencies & init (`npx prisma init`).
2. Write `schema.prisma` with core models.
3. Run first migration.

After that, seed rooms and refactor booking endpoints to use Prisma (Phase 2 part 1). Request “add prisma now” when ready and we’ll perform those edits.

## Getting Started (Current)
```
# Start DB
npm run db:up

# Dev (frontend + backend concurrently)
npm run dev
```
POS hub dev scripts will be added as implementation progresses.

## Quick Concepts
**Repository (e.g. bookingRepo)**: A thin module wrapping all database calls for one domain (create/find/list/cancel bookings) so route handlers stay simple (validate → call → respond) and future logic/ORM changes live in one place.

**Zod**: A TypeScript-first schema validator used to define expected request body shapes once, validate incoming JSON at runtime, and infer static types—reducing boilerplate and preventing malformed data from reaching business logic.

---
This README will expand as the POS hub and persistence layers are implemented.
