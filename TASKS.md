# K-Golf Project Tasks

Consolidated task tracking for the entire K-Golf platform (Backend, Frontend, POS).

**Legend:** `[ ]` pending | `[~]` in progress | `[x]` done

---

## 📝 Table of Contents

1. [Project Specifications](#project-specifications)
2. [Open Questions & Decisions](#open-questions--decisions)
3. [POS Electron App - Phase 0](#pos-electron-app---phase-0)
4. [Backend & Admin Features - Phase 1](#backend--admin-features---phase-1)
5. [Code Cleanup & Technical Debt](#code-cleanup--technical-debt)
6. [Testing & Quality Assurance](#testing--quality-assurance)
7. [Completed Tasks Archive](#completed-tasks-archive)

---

## 📋 Project Specifications

### Business Requirements
- **Room Configuration:**
  - Room 4: Supports both left-hand and right-hand players
  - Rooms 1-3: Right-hand players only
- **Booking Duration & Menu:**
  - [x] Hours added as menu category (1-5 hours, $30-$150)
  - [x] Auto-add booking hours to seat 1 on new bookings
  - [x] Menu data migrated to SQLite for persistence
- **Late Arrival Promotion:** Customers arriving 20+ minutes late get 1 hour free
- **Score System:**
  - Admin can manually enter player scores
  - Track: Total hits, golf course name, final score
  - Standard: 18 holes, 72 hits baseline (par)
  - Scoring: Under 72 = negative score (e.g., -2)
- **Authentication:** Phone number only (login/register for both online and POS)
- **Billing:** Printing bill functionality required
- **Admin Dashboard:** Must be able to edit all bookings
- Need to fix the print
- **Need pulling (Sync up)**
- Way to handle transactions (billing)
  - saves into the db. Need schema and others.
- Maybe UI changes for current order page instead of vertical scroll we need tab but this can be handle later.
- Seat management:
  - [x] Seats decoupled from player count
  - [x] Max 10 seats with color coding
  - [x] Validation prevents orphaning items when reducing seats
- **menu pos** 
  - will need to have check list of what it was served or not.
- **Booking Availability & Time Slots:**
  - [x] **DECISION:** Unified time slot system (exact times for availability)
    - Walk-in bookings: Allow exact time selection (e.g., 1:12 PM)
    - Online booking availability: Based on actual end times (e.g., if walk-in ends 2:12 PM, next slot is 2:12 PM)
    - No rounding to standard intervals (:00, :30) - show real availability
  - [ ] Cleaning/buffer time: Decide if gaps needed between bookings (e.g., 15 min cleaning time)
  - [ ] Implementation: Backend availability endpoint should return exact available start times based on existing booking end times

### Open questions
- [x] ~~When the number of seats changes, does number of players also should changes?~~ → Decoupled: seats and players are independent
- [x] ~~How can we handle the "cached" data? for instance, menu added to the running booking etc in case of the restart the app.~~ → Menu now persists in SQLite, orders saved in localStorage

### Known Issues
- [ ] Print functionality needs refinement
- [ ] Split functionality needs fixing, when delete one of the splited item, it doesn't merge back (not sure if we want this) 
- [ ] Guest checkout: Should collect name and phone number
- [ ] when add menu, it doesn't update sqlite table.

---

## 🤔 Open Questions & Decisions

### 1. Guest Mode vs Auto-Registration

**Question:** Should we auto-register all walk-in customers or keep "Guest" mode?

**Current Behavior:**
- **3 customer modes:** Existing Customer, New Customer, Guest
- **Guest mode:** Creates booking without user account (`userId: null`)
- **New Customer mode:** Creates user account + booking

**Considerations:**
| Pro Auto-Register | Pro Keep Guest |
|-------------------|----------------|
| ✅ Builds customer database | ✅ Privacy protection |
| ✅ Enables loyalty programs | ✅ Data quality (avoid fake info) |
| ✅ Returning customer lookup | ✅ Clear distinction |
| ✅ Simpler UX (2 modes vs 3) | ✅ Customer choice |

**Options:**
1. Remove Guest → Auto-register all walk-ins
2. Keep Guest as-is (anonymous bookings)
3. Middle ground: Add "Convert to customer" post-booking

**Status:** ⏸️ Awaiting team decision

---

### 2. Denormalized Customer Data in Bookings

**Question:** Should we keep customer info (name/phone/email) denormalized in Booking table or normalize via userId reference?

**Current Implementation:**
```prisma
model Booking {
  userId        String?  // FK to User (nullable for guest bookings)
  customerName  String   // Denormalized for display
  customerPhone String   // Denormalized for contact
  customerEmail String?  // Denormalized (optional)
}
```

**Considerations:**

| Pro Denormalization (Current) | Pro Normalization (Join to User) |
|-------------------------------|-----------------------------------|
| ✅ Guest bookings supported (`userId: null`) | ❌ Complex handling for guest bookings |
| ✅ Fast queries (no JOIN needed) | ❌ Slower queries (JOIN required) |
| ✅ Historical accuracy (snapshot at booking time) | ❌ Data changes affect past bookings |
| ✅ Customer data immutable after booking | ❌ User.name change → all bookings show new name |
| ✅ Simple API responses | ❌ Additional query complexity |
| ✅ Point-in-time records (audit trail) | ❌ Lost historical context |
| ✅ Works offline (POS use case) | ❌ Requires user data sync |
| ❌ Data duplication | ✅ Single source of truth |
| ❌ Update complexity if customer changes info | ✅ Updates propagate automatically |

**Business Context:**
- **Bookings are historical records** (like invoices/receipts)
- Customer info should reflect what was known **at booking time**
- Guest bookings (`userId: null`) need customer data without User account
- POS app needs offline-first design (denormalized = no JOIN, faster)

**Recommendation:** **Keep denormalized** for this domain because:
1. Bookings are immutable historical records (like financial transactions)
2. Guest bookings are a core feature (can't reference User if no account)
3. Performance-critical (admin dashboard lists 100+ bookings)
4. Offline-first POS requirements (minimize JOINs)

**Alternative:** If normalization needed, consider:
- Keep denormalized fields for guest bookings only (`userId IS NULL`)
- Add computed fields: `displayName` = `User.name ?? customerName`
- Hybrid approach with versioning/snapshots

**Status:** ⏸️ Open for discussion

---

## 🖥️ POS Electron App - Phase 0

> **Goal:** Offline-first POS system for front desk operations

### 0.6b Admin Dashboard & Booking Detail (Base UI) – ✅ Completed
<details>
<summary>View tasks (19 completed)</summary>

[x] Tabs (Bookings / Rooms / Weekly Calendar / Timeline) switch content
[x] Booking list row click → navigate `/booking/:id`
[x] Booking list status buttons (Complete / Cancel / Reset)
[x] Room status select (updates in‑memory state)
[x] Weekly Calendar week navigation (Prev / Next)
[x] Timeline week navigation (Prev / Next)
[x] Timeline booking block click → detail navigation
[x] Booking Detail actions (Back / Complete / Cancel / Restore)

</details>

### 0.6c Booking Detail Ordering + Menu Management – ✅ Completed
<details>
<summary>View tasks (39 completed)</summary>

[x] Local menu mock (12 items across 4 categories)
[x] Category toggle & scrollable list
[x] Add item → increment quantity if existing
[x] Update quantity (± buttons) & remove item
[x] Receipt panel with subtotal, tax, grand total
[x] Print-friendly styles & print action
[x] Menu Management Page with CRUD operations
[x] Filter, search, and stats functionality

</details>

### 0.6e Advanced POS Booking Detail with Seat Management – ✅ Completed
<details>
<summary>View tasks (72 completed)</summary>

**Features:**
[x] Seat Management: Dynamic 1-4 seat configuration
[x] Order Operations: Add to seat, move items, split costs
[x] Per-Seat Billing: Individual totals and grand total
[x] Print Functionality: Individual seat and complete order receipts
[x] Data Persistence: localStorage for orders and seat config
[x] UI Components: Dialog, Separator, Enhanced Button, Tabs

**Implementation:**
- Seat Colors: Blue/Green/Purple/Orange
- Tax Rate: 8% (configurable)
- localStorage Keys: `booking-{id}-orders`, `booking-{id}-seats`

</details>

### 0.6f Global Tax Rate Management – ✅ Completed
<details>
<summary>View tasks (46 completed)</summary>

**Database:**
[x] Setting table with key-value store pattern
[x] Seed default global_tax_rate (8%)
[x] Prisma schema and migration

**Backend API:**
[x] GET /api/settings (list all settings)
[x] GET /api/settings/:key (get specific setting)
[x] PUT /api/settings/:key (update setting, admin only)
[x] Validation for tax rate (0-100%)

**Frontend:**
[x] BookingContext with globalTaxRate state
[x] localStorage + API sync (offline support)
[x] Tax Settings tab in admin dashboard
[x] Per-booking tax rate overrides
[x] Optimistic UI updates

</details>

### 0.6g Server-Side Pagination & Database Seeding – ✅ Completed
<details>
<summary>View tasks (42 completed)</summary>

**Backend Pagination:**
[x] Add pagination to listBookings() (page, limit, sortBy, order)
[x] Return PaginatedBookings interface with metadata
[x] GET /api/bookings with query parameters
[x] Default: sortBy=startTime DESC (newest first)

**Frontend Integration:**
[x] Remove client-side sorting/pagination (useMemo)
[x] Add bookingsPagination state to BookingContext
[x] Update DashboardPage to fetch on page change
[x] Pagination UI with server-side metadata
[x] Remove Weekly Calendar tab from admin dashboard (redundant with Timeline)
[x] Update grid layout from 6 to 5 tabs

**Database Seeding:**
[x] Generate 133 mock bookings (44 days range)
[x] Create 25 unique mock customers
[x] Random data: times, durations, players, sources
[x] Dual-database setup (kgolf_app dev + k_golf_test)
[x] NPM scripts: db:seed:dev, db:seed:test

**Data Consistency & API Response:**
[x] Update default customer fallback values ('Guest' vs 'Unknown')
[x] Update default phone fallback values ('111-111-1111' vs 'N/A')
[x] Fix presentBooking() to include customer info in API response
[x] Add customerName, customerPhone, customerEmail to response
[x] Add isGuestBooking, bookingSource, internalNotes to response
[x] Update frontend bookingContext fallback values to match backend
[x] Reset dev database with new seed data

**Implementation:**
- Page Size: 10 bookings per page
- API: GET /api/bookings?page=1&limit=10&sortBy=startTime&order=desc
- Response: { bookings: [...], pagination: { total, page, limit, totalPages } }
- Databases: kgolf_app (142 bookings), k_golf_test (133 bookings)
- Default Values: 'Guest' / '111-111-1111' for missing customer data

</details>

### 0.6d Room Status Queue-Based Sync – ✅ Completed
<details>
<summary>View tasks (17 completed)</summary>

[x] Implemented processRoomUpdates() with collapse logic
[x] Collapse strategy: Group by roomId, keep latest only
[x] Generic queue:enqueue IPC handler
[x] Optimistic UI updates
[x] 15-second periodic auto-sync
[x] Auto-reload rooms after successful sync

**Known Issue:** Mock room IDs ('1', '2', '3', '4') vs real UUIDs from database

</details>

### 0.7 Queue Size Indicator
[x] IPC getQueueSize returns COUNT(*) from SyncQueue
[x] Renderer displays Queue badge
[ ] Verify: Badge updates without restart after sync

### 0.8 Online / Offline Probe
[ ] Interval (30s) GET /health sets online flag
[ ] IPC getStatus returns { online, queueSize, auth }
[ ] Renderer status indicator reflects connectivity

### 0.9 Scheduled Push Loop – ✅ Completed
[x] Interval (15s) triggers processSyncCycle()
[x] Conditions: online && authenticated && queue>0 && !isSyncing
[x] Auto-drain queue without manual Force Sync
[x] Auth expiry handling

### 0.9.1 Development Logging Consolidation – ✅ Completed
[x] Forward main process logs to renderer DevTools
[x] IPC channel: main-log with log levels
[x] Guard with ELECTRON_DEV check (dev only)
[x] [MAIN] prefix for main process logs

### 0.9.2 SyncQueue Refactoring – ✅ Completed
[x] Renamed Outbox → SyncQueue (table, files, interfaces)
[x] Updated all 6 files (db, sync-queue, sync, bookings, main, preload)
[x] Added enqueuePullIfNotExists() for duplicate prevention
[x] Renamed IPC handler: debug:outbox:list → debug:syncQueue:list
[x] Updated comments to reflect bidirectional sync (push + pull)
[x] Verified build and fresh database creation

**Rationale:** "SyncQueue" better represents bidirectional operations (push/pull) vs "Outbox" (unidirectional)

### 0.9.3 Menu Backend Integration & Sync – ✅ Completed
[x] Added MenuItem model to backend Prisma schema (PostgreSQL)
[x] Created migration: 20251023060719_add_menu_item_table
[x] Added 17 menu items to backend seed script (matching POS)
[x] Created backend API: GET /api/menu/items (with POS-compatible format)
[x] Implemented menu:pull handler in POS sync.ts
[x] Added pullMenuItems() with atomic SQLite transaction
[x] Periodic menu pull: every 5 minutes + on auth ready
[x] Duplicate prevention: enqueuePullIfNotExists('menu:pull')
[x] Build verification successful

**Implementation:**
- Backend syncs menu to POS automatically
- Menu changes in backend propagate to POS within 5 minutes
- Full replace strategy (DELETE + INSERT for atomic consistency)
- Category enum: HOURS, FOOD, DRINKS, APPETIZERS, DESSERTS
- Price stored as DECIMAL(10,2) in PostgreSQL, converted to REAL for SQLite

### 0.9.4 Incremental Booking Sync with Timestamps – ✅ Completed
[x] Added Metadata table to SQLite for timestamp tracking
[x] Created getMetadata/setMetadata helper functions in db.ts
[x] Added ?updatedAfter query parameter to GET /api/bookings (backend)
[x] Added ?limit parameter to bypass default pagination (limit=9999)
[x] Updated pullBookings() to detect full vs incremental sync
[x] Full sync on login: Fetches all bookings with ?limit=9999
[x] Incremental sync (15s): Uses ?updatedAfter={lastSyncedAt}&limit=9999
[x] Store/update bookings_lastSyncedAt in Metadata after sync
[x] Removed 30-day booking cleanup logic (retain all historical data)
[x] Removed default date filter from bookings:list IPC handler
[x] Added sync event listener to BookingContext for auto-refresh
[x] UI auto-updates within 2 seconds when sync completes

**Implementation:**
- Full sync: Fetches all bookings on fresh install/login
- Incremental sync: Only fetches changed bookings since last sync
- Auto-refresh: Dashboard updates automatically when new bookings arrive
- Data retention: All historical bookings preserved (no automatic cleanup)
- Pagination: Client-side pagination shows 10 bookings per page with navigation

### Follow-Ups (Post 0.6g) – Pagination Enhancements
[ ] Add filtering (status, date range, room, customer name)
[ ] Add search functionality
[ ] Cursor-based pagination for better performance
[ ] Add sorting by other fields
[ ] Cache pagination results (Redis)
[ ] "Jump to page" input
[ ] Infinite scroll alternative
[ ] Export to CSV/Excel
[ ] Optimize with database indexes
[ ] User-configurable page size
[ ] Loading skeleton during transitions
[ ] Persist page in URL query params
[ ] WebSocket real-time updates
[ ] Batch operations across pages

### Follow-Ups (Post 0.6d) – Room Data Synchronization
[ ] Replace mock room data with real backend data
[ ] Fetch rooms on app startup (use authState.rooms)
[ ] Update bookingContext to use real rooms
[ ] Add color mapping logic for room cards
[ ] Reconcile Room type differences (backend vs mock)
[ ] Test status update with real UUID IDs
[ ] Verify persistence across app restart

### Follow-Ups (Post 0.6f) – Tax & Settings Enhancements
[ ] Add custom_tax_rate column to Booking table
[ ] Sync booking-specific tax rates to database
[ ] Settings audit log table
[ ] Setting categories management
[ ] Setting validation rules
[ ] Setting dependencies
[ ] Setting search and filtering
[ ] Setting import/export
[ ] Tax rate history chart
[ ] Per-room tax rates
[ ] Tax exemption flags
[ ] Multiple tax types (sales tax, service charge)
[ ] Settings cache layer (Redis)
[ ] Settings versioning

### Follow-Ups (Post 0.6c) – Menu & Order Features
[ ] Introduce MenuProvider (context)
[ ] Persist menu + orders to SQLite via IPC
[ ] Menu item category CRUD
[ ] Bulk availability toggle
[ ] Price history / audit
[ ] Drag to reorder items
[ ] Keyboard + ARIA support
[ ] Advanced print layout customization
[ ] Export menu to CSV/PDF
[ ] Cost-of-goods fields and margin display
[ ] Toast notifications
[ ] Optimistic updates + rollback
[ ] Unit tests for reducers/helpers
[ ] E2E smoke tests

### Follow-Ups (Post 0.6e) – Advanced POS Features
[ ] Backend integration: Database-backed menu items
[ ] Backend integration: Persist orders (Order, OrderItem tables)
[ ] Payment gateway integration
[ ] Order history for completed bookings
[ ] Kitchen Display System (KDS) integration
[ ] Analytics: Popular items, revenue per seat
[ ] Discounts/Promotions and coupon codes
[ ] Multi-currency support
[ ] SMS/Email receipts
[ ] Inventory management
[ ] Combo/Bundle pricing
[ ] Modifiers/Add-ons (customization)
[ ] Tip/Gratuity calculation
[ ] Void/Refund functionality
[ ] Order notes (allergies, preferences)
[ ] Table/Bay management system integration
[ ] Happy Hour dynamic pricing

---

## 👤 Backend & Admin Features - Phase 1

> **Goal:** Phone-based admin booking system

### Phase 1 Overview

**Feature Documentation:** `/docs/admin_manual_booking_feature.md`
**Schema Guide:** `/docs/database_schema_explanation.md`
**Phone Handling:** `/docs/phone_number_country_code_handling.md`

**Key Changes:**
- Phone becomes primary identifier (unique, required)
- Email becomes optional (nullable)
- Guest bookings supported (nullable userId)
- Track registration source (ONLINE/WALK_IN/PHONE)
- Admin audit trail (createdBy, registeredBy)

### 1.1 Database Schema Migration – ✅ Completed

**User Model Changes:**
[x] Make User.email nullable
[x] Make User.phone required with unique constraint
[x] Add User.phoneVerifiedAt TIMESTAMPTZ
[x] Add User.registrationSource VARCHAR(50)
[x] Add User.registeredBy (FK to User.id)
[x] Backfill phone numbers for existing users
[x] Update Prisma model and regenerate client

**Booking Model Changes:**
[x] Make Booking.userId nullable (for guests)
[x] Add Booking.customerEmail TEXT
[x] Add Booking.isGuestBooking BOOLEAN
[x] Add Booking.bookingSource VARCHAR(50)
[x] Add Booking.createdBy (FK to User.id)
[x] Add Booking.internalNotes TEXT
[x] Add indexes on customerPhone and bookingSource

**PhoneVerificationToken Model:**
[x] Create table for Phase 2 SMS OTP (schema only)
[x] Fields: id, phone, tokenHash, expiresAt, attempts

**Status:** Migration `20251013065406_phone_based_booking_system` applied

### 1.2 Backend Phone Utilities – ✅ Completed

[x] Create backend/src/utils/phoneUtils.ts
[x] Implement normalizePhone() - Convert to E.164 format
[x] Implement formatPhoneDisplay() - User-friendly format
[x] Implement validatePhone() - E.164 regex validation
[x] Implement validateCanadianPhone() - +1 + 10 digits
[x] Default country: +1 (Canada) hardcoded
[x] Unit tests: 59/59 passing ✅

**Formats Supported:**
- "4165551234" → "+14165551234"
- "(416) 555-1234" → "+14165551234"
- "+1 416-555-1234" → "+14165551234"
- Idempotent normalization

### 1.3 Backend API - User Lookup – ✅ Completed

[x] GET /api/users/lookup?phone={phone} (ADMIN only)
[x] Normalize phone before lookup
[x] Return user details + stats (bookingCount, lastBookingDate, totalSpent)
[x] Return { found: false } if not found (200, not 404)
[x] GET /api/users/recent?limit={10} (ADMIN only)
[x] Optional filters: registrationSource, role
[x] Pagination support
[x] E2E tests: 21 tests created (skipped, pending test server auth)

**Status:** API functional, manual testing passed

### 1.4 Backend API - Admin Booking Creation – ✅ Completed

[x] POST /api/bookings/admin/create (ADMIN only)
[x] Three customer modes: existing, new, guest
[x] Zod validation for all input fields
[x] Room availability & conflict checking
[x] Price calculation (base + tax)
[x] Custom price/tax overrides
[x] Transaction for new user + booking
[x] Admin audit trail (createdBy)
[x] Error handling (409, 404, 400, 500)
[x] Unit tests: 20/20 passing ✅

**Guest Mode Restrictions:**
- Only allowed for WALK_IN bookings
- Phone bookings must have user account

### 1.5 POS - Phone Input Component – ✅ Completed

[x] Create PhoneInput.tsx component
[x] Canada-only (+1 fixed country code)
[x] Auto-formatting: "4165551234" → "(416) 555-1234"
[x] Normalize to E.164 on onChange
[x] Validation indicator (green/red)
[x] Optional search button
[x] Keyboard accessibility
[x] Error message display
[x] Disabled/readonly states
[x] Usage examples created

### 1.6 POS - Customer Search Component – ✅ Completed

[x] Create CustomerSearch.tsx
[x] Phone input with search button
[x] API call to /api/users/lookup
[x] Display user card with stats (if found)
[x] Show "not found" options (Register / Guest)
[x] Recent customers dropdown
[x] Loading state & error handling
[x] TypeScript interfaces
[x] Currency formatting
[x] Usage examples created

### 1.6.1 Bug Fix - Phone Uniqueness & Email Setup – ✅ Completed

**Issue:** Duplicate phone constraint violation, email config missing

[x] Add findUserByPhone() helper
[x] Add phone normalization in register endpoint
[x] Add phone uniqueness check before user creation
[x] Return 409 for duplicate phone
[x] Update .env.example with Gmail App Password instructions
[x] Document 2-Step Verification requirement

### 1.7 Simplified Booking Flow with Guest Support – ✅ Completed

**Backend Changes:**
[x] Make Booking.userId nullable for guest bookings
[x] Create POST /api/bookings/simple/create endpoint
[x] Simplified payload: customerName, customerPhone, customerEmail (optional)
[x] Auto-link bookings to users by matching phone number
[x] Add auto-linking logic in user registration (/api/auth/register)
[x] Create migration script for existing guest bookings
[x] Test all backend endpoints (5 scenarios: guest, existing user, conflicts, validation, auto-link)

**Frontend Changes:**
[x] Refactor BookingModal to 2-step flow (Customer → Details)
[x] Add Walk-in/Phone source selection buttons (customer step)
[x] Implement live phone search (500ms debounce, auto-triggers at 10 digits)
[x] Remove source step (integrated into customer step)
[x] Remove internal notes field
[x] Remove estimated price display
[x] Fix phone input deletion bug (partial E.164 format)
[x] Fix continue button validation (E.164 length check)

**Implementation:**
- Phone-first approach: Enter phone → Search automatically → Select/create customer
- Guest bookings: userId=null, stored with customer info
- Auto-linking: When guest registers online, existing bookings link automatically
- E.164 format: +1XXXXXXXXXX (12 chars) for complete validation
- Partial E.164: Returns +1XXX for incomplete numbers (prevents deletion bug)

### 1.8 Frontend Build & Environment Configuration – ✅ Completed

**Production API URL Fix:**
[x] Fixed frontend API calls to use relative URLs instead of localhost
[x] Updated Dockerfile to set `REACT_APP_API_BASE=` (empty string)
[x] Fixed webpack DefinePlugin to handle empty string correctly
[x] Changed from `|| 'http://localhost:8080'` to explicit undefined check
[x] Deployed fix (commit d81e5c3: "fix: properly handle empty string for REACT_APP_API_BASE")
[x] Verified login works in production at k-golf.inviteyou.ca

**Implementation:**
- Environment Strategy: Empty string for production → relative URLs (`/api/auth/login`)
- Fallback for Development: `http://localhost:8080` when env var not set
- Webpack Logic: `process.env.REACT_APP_API_BASE !== undefined ? process.env.REACT_APP_API_BASE : 'http://localhost:8080'`
- Result: No CORS issues, same-origin requests in production

**Architecture:**
- Unified deployment: Single Node.js container serving both frontend static files and API
- Path structure: `backend/dist/src/server.js` serves `backend/dist/public/` (frontend build output)
- Nginx: Reverse proxy on port 8082 to k-golf.inviteyou.ca
- Docker: Multi-stage build (frontend → backend → runner)

### 1.9 Guest/Registered Badge Display

[ ] Add userId to Booking interface (BookingContext.tsx)
[ ] Update DashboardPage booking list UI
[ ] Display badge next to customer name based on userId
[ ] Badge variants: "Registered" (userId exists) vs "Guest" (userId null)
[ ] Verify badges display correctly after sync

### 1.10 End-to-End Testing

[ ] Test new guest booking creation (no existing user)
[ ] Test existing customer booking (auto-link)
[ ] Test phone search with multiple matches
[ ] Test customer name editing
[ ] Verify sync pulls userId correctly from backend
[ ] Verify badge display based on userId
[ ] Test phone input validation and formatting
[ ] Test complete booking flow (phone → details → submit)

### 1.10 Analytics Dashboard (Optional - Future)

[ ] Registration source analytics
[ ] Charts: Users by source, bookings over time
[ ] Cross-channel analysis table
[ ] Admin performance metrics
[ ] Filters and CSV export

### 1.11 Testing & Documentation

**Backend Integration Tests:**
[ ] Create booking for existing customer
[ ] Create booking + new customer account
[ ] Create guest booking (walk-in only)
[ ] Reject guest booking via phone (400)
[ ] Duplicate phone validation (409)
[ ] Room conflict (409)
[ ] Invalid roomId (404)
[ ] Phone normalization in lookups
[ ] Price calculation with tax rates
[ ] Admin audit trail tracking
[ ] Transaction rollback on failure

**Frontend E2E Tests:**
[ ] Walk-in guest booking flow
[ ] Phone booking for new customer
[ ] Search existing customer and create booking
[ ] Error handling (duplicate phone, conflicts)
[ ] Walk-in guest option visible
[ ] Phone booking hides guest option
[ ] Price preview updates
[ ] Custom price override

**Documentation:**
[ ] API documentation for new endpoints
[ ] User guide for front desk staff (PDF/wiki)
[ ] Admin training guide
[ ] Database schema ER diagram update
[ ] README update with new features
[ ] Migration guide (email-based → phone-based)

### Phase 1 Summary & Success Metrics

**Success Metrics:**
- [ ] < 60 seconds to create walk-in booking
- [ ] Zero duplicate phone numbers in database
- [ ] 90% walk-ins register vs guest
- [ ] 100% phone search success rate
- [ ] < 500ms API response time
- [ ] Zero data loss during migration

**Phase 2 Roadmap (SMS Verification):**
- Phone verification via SMS OTP (Twilio/NHN Cloud)
- PhoneVerificationToken usage
- SMS booking confirmations
- Account recovery via OTP
- Phone-based login (OTP instead of password)
- Guest-to-registered migration tool
- Batch phone cleanup
- Blacklist (spam prevention)
- International phone support

---

## 🧹 Code Cleanup & Technical Debt

### UI Component Unification

**Button Components:**
- ✅ DashboardPage: All buttons unified (2025-10-20)
- ✅ BookingDetailPage: Using unified Button
- ✅ MenuManagementPage: Back button unified
- [ ] MenuManagementPage: Convert remaining raw `<button>` elements
- [ ] AdminPage: Audit and convert raw buttons
- [ ] BookingModal: Check button consistency
- [ ] Other components: Global audit for raw `<button>` usage

**Tabs Components:**
- [ ] DashboardPage has local Tabs implementation (TabsContext, etc.)
- [ ] primitives.tsx has different Tabs implementation
- [ ] Consolidate into single reusable Tabs component

**Design Tokens:**
- [ ] Extract common colors (amber-500, slate-700, etc.) into constants
- [ ] Define standard spacing and sizing scales
- [ ] Create typography variants
- [ ] Consider CSS variables or Tailwind theme extension

**Component Documentation:**
- [ ] Document Button component props and variants
- [ ] Add usage examples for all UI primitives
- [ ] Create Storybook or component gallery (optional)

---

## 🧪 Testing & Quality Assurance

### E2E Testing Setup – ✅ Partially Complete

**Completed:**
[x] Playwright E2E testing framework installed
[x] Test structure at `pos/tests/`
[x] Database helper with reset/seed functions
[x] Comprehensive booking creation test
[x] Test fixtures (customers.json, bookings.json)
[x] Automated test database setup script
[x] Documentation in `pos/tests/E2E_TESTING_GUIDE.md`
[x] Fixed Button component to forward data-testid prop

**Test Status: 3/5 Passing ✅**

**Passing Tests:**
- ✅ Should create walk-in booking with existing customer
- ✅ Should create walk-in booking as guest
- ✅ Should handle validation errors

**Failing Tests (Functional Issues):**

1. **"should create walk-in booking with new customer"**
   - Issue: Modal doesn't close after successful booking
   - Error: Modal still visible after "Create Booking" click
   - Root Cause: Backend API/onSuccess callback not triggering modal close
   - Location: `pos/tests/e2e/booking/create-booking.spec.ts:85`
   - Next Steps: Investigate BookingModal handleSubmit success flow

2. **"should disable guest mode for phone bookings"**
   - Issue: Continue button remains enabled for guest + phone booking
   - Error: Button enabled when should be disabled
   - Root Cause: React state update timing or validation logic
   - Location: `pos/tests/e2e/booking/create-booking.spec.ts:150`
   - Implementation: canProceedFromCustomerMode() validation exists but not working
   - Next Steps: Debug button disabled logic on customerMode step

### Pending Test Tasks

**Setup:**
- [ ] Set up test database: `cd backend && npm run db:setup-test`
- [ ] Install Playwright: `cd pos && npm install && npx playwright install`
- [ ] Configure test environment: Copy .env.example to .env.test
- [ ] Update TEST_DATABASE_URL in .env.test
- [ ] Add remaining data-testid attributes to components
- [ ] Restart backend server with updated middleware

**Test Execution:**
- [ ] Fix modal close issue in booking creation
- [ ] Fix guest mode validation for phone bookings
- [ ] Test all three customer modes (existing/new/guest)
- [ ] Verify authentication with API key
- [ ] Verify no foreign key constraint errors
- [ ] Run full E2E suite: `npm run test:e2e:ui`

---

## ✅ Completed Tasks Archive

<details>
<summary>Frontend Build & Deployment (Phase 1.8) - 2025-11-06</summary>

**Production API URL Fix:**
[x] Fixed frontend API calls to use relative URLs instead of localhost
[x] Updated backend Dockerfile to set `REACT_APP_API_BASE=` (empty string)
[x] Fixed webpack DefinePlugin to handle empty string correctly
[x] Changed from `|| 'http://localhost:8080'` to explicit undefined check
[x] Deployed fix (commit d81e5c3: "fix: properly handle empty string for REACT_APP_API_BASE")
[x] Verified login works in production at k-golf.inviteyou.ca

**Architecture Consolidation:**
[x] Unified deployment: Single Node.js container serving both frontend and API
[x] TypeScript structure: `rootDir: "."` compiles to `dist/src/server.js`
[x] Path resolution: `backend/dist/src/` → `backend/dist/public/` (static files)
[x] Docker multi-stage build: frontend → backend → runner
[x] Environment strategy: Empty string for production (relative URLs), localhost fallback for dev

**Deployment Pipeline:**
[x] GitHub Actions: Build image → Push to GHCR → SSH to server → Pull & restart
[x] Server: DigitalOcean droplet 147.182.215.135, Nginx reverse proxy on port 8082
[x] Docker Compose: Automated migrations and seeding
[x] Database: PostgreSQL 16, all tables healthy, admin user seeded

</details>

<details>
<summary>Authentication & Database (2025-10-19)</summary>

[x] Simplified authentication to single admin
[x] Updated middleware to use admin@kgolf.com
[x] Removed POS-specific admin from seed script
[x] Applied database changes
[x] Seed script ran successfully (admin + 4 rooms)

</details>

<details>
<summary>POS Core Features (Phase 0.6)</summary>

[x] Admin Dashboard & Booking Detail UI (0.6b)
[x] Booking Detail Ordering + Menu Management (0.6c)
[x] Advanced Seat Management System (0.6e)
[x] Global Tax Rate Management (0.6f)
[x] Server-Side Pagination & Database Seeding (0.6g)
[x] Room Status Queue-Based Sync (0.6d)
[x] Scheduled Push Loop (0.9)
[x] Development Logging Consolidation (0.9.1)

</details>

<details>
<summary>Backend Phone System (Phase 1.1-1.6)</summary>

[x] Database schema migration (phone-based system)
[x] Phone utility functions (normalize, format, validate)
[x] User lookup & recent customers API
[x] Admin booking creation API (3 customer modes)
[x] Phone input component (Canada +1 only)
[x] Customer search component
[x] Bug fix: Phone uniqueness & email setup

</details>

<details>
<summary>POS Menu System & Seat Management (2025-10-22)</summary>

**Seat Management Fixes:**
[x] Fixed seat reduction bug (React useEffect loop)
[x] Decoupled seat count from player count (max 10 seats)
[x] Added seat validation (prevents orphaning items)
[x] Extended color palette to 10 seats

**Menu Migration (Phase 1 - SQLite):**
[x] Added MenuItem and OrderItem tables to pos.sqlite
[x] Implemented menu CRUD operations (core/menu.ts)
[x] Created IPC handlers for 7 menu operations
[x] Integrated menu loading in BookingDetailPage
[x] Added hours as menu category (1-5h, $30-$150)
[x] Auto-add booking hours to seat 1 on new bookings
[x] Consolidated menu tables with existing sync database
[x] Seed function for 17 initial menu items

**Documentation:**
[x] Created MENU_MIGRATION_PLAN.md (Phase 1 & 2 strategy)
[x] Created phase_1_menu_migration_complete.md

**Backend:**
[x] Added guest mode support for bookings (backend/src/routes/booking.ts)

</details>

---

## 📌 Quick Reference

### Database Scripts
```bash
# Development database
npm run db:seed:dev

# Test database
npm run db:seed:test

# Generic seed (uses .env DATABASE_URL)
npm run db:seed
```

### POS Development
```bash
# Run POS in development mode
cd pos/apps/electron && npm run dev

# Build POS
cd pos/apps/electron && npm run build

# Run E2E tests
cd pos && npm run test:e2e:ui
```

### Backend Development
```bash
# Development mode (kgolf_app database)
npm run dev

# Test mode (k_golf_test database)
npm run dev:test

# Run tests
npm test
npm run test:unit
npm run test:e2e
```

---

**Last Updated:** 2025-11-06
**Version:** 1.1 (Updated: Frontend build & deployment fixes)

````
