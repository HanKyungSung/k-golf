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

### 0.6e Advanced POS Booking Detail with Seat Management – Completed
[x] Seat Management System: Dynamic 1-4 seat configuration with visual indicators
[x] Order Operations: Add items to specific seats via modal dialog
[x] Order Operations: Move items between seats
[x] Order Operations: Split item costs evenly across multiple seats
[x] Order Operations: Quantity controls (+ / -) per item
[x] Order Operations: Delete items from orders
[x] Per-Seat Billing: Individual subtotals, tax (8%), and totals for each seat
[x] Per-Seat Billing: Grand total (all seats + room booking fee)
[x] Print Functionality: Print individual seat receipts
[x] Print Functionality: Print complete order (all seats)
[x] Print Functionality: Professional K-Golf branded receipt layout
[x] Data Persistence: localStorage saves orders per booking ID
[x] Data Persistence: localStorage saves seat configuration per booking ID
[x] Data Persistence: Auto-loads on page refresh
[x] UI Components: Dialog modal system for seat selection and operations
[x] UI Components: Separator component for visual clarity
[x] UI Components: Enhanced Button with size (sm/md/lg) and variant (default/outline/ghost)
[x] UI Components: Full Tabs system for menu categories
[x] UI Components: Custom SVG icons (no external lucide-react dependency)
[x] Menu System: 4 categories (Food, Drinks, Appetizers, Desserts)
[x] Menu System: 12 mock menu items for testing
[x] Menu System: Tabbed interface for easy navigation
[x] Fixed Tabs component prop passing (activeValue/setActiveValue)
[x] Removed broken icon components from action buttons (Move/Split/Delete)
[x] Documentation: Comprehensive implementation guide in docs/pos_booking_detail_enhancement.md

**Acceptance (0.6e Advanced POS Booking Detail)** – VERIFIED
[x] Seat Configuration: Adjust seats 1-4; each seat has distinct color (blue/green/purple/orange)
[x] Add to Seat: Click menu item → modal shows → select seat → item appears in that seat's section
[x] Move Items: Click Move button → select destination seat → item transfers with all properties
[x] Split Cost: Click Split → select 2+ seats → cost divided evenly (e.g., $12 item → $6 each for 2 seats)
[x] Quantity Update: +/- buttons work; removing all quantity deletes item
[x] Delete Item: Delete button removes item immediately
[x] Per-Seat Totals: Each seat shows subtotal, tax, and total accurately
[x] Grand Total: Sum of all seats + room booking fee displays correctly
[x] Print Seat: Print Seat X button → only that seat's items appear in print preview
[x] Print All: Print All button → all seats and grand total appear in print preview
[x] Print Layout: K-Golf branding, business info, booking ID, timestamp visible
[x] Persistence: Refresh page → orders and seat configuration restored from localStorage
[x] Menu Tabs: Clicking Food/Drinks/Appetizers/Desserts switches visible menu items
[x] Menu Display: All 12 menu items display correctly across 4 categories
[x] No Errors: TypeScript compilation clean; no runtime errors in console
[x] Button Icons: Move/Split/Delete buttons show text only (no broken icon rendering)

**Implementation Details:**
- Seat Colors: Seat 1=blue, Seat 2=green, Seat 3=purple, Seat 4=orange (bg-{color}-500)
- OrderItem Type: `{ id: string, menuItem: MenuItem, quantity: number, seat?: number, splitPrice?: number }`
- Split Logic: Creates N new OrderItem instances (one per selected seat) with splitPrice = original / N
- localStorage Keys: `booking-{id}-orders`, `booking-{id}-seats`
- Print Media Queries: `.no-print` hides UI elements; `.print-only` shows headers/footers
- Tax Rate: 8% (configurable in calculateSeatTax functions)
- Max Seats: 4 (matches typical golf simulator bay capacity)
- Icon Solution: Inline SVG components (no lucide-react dependency)

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

### 0.6f Global Tax Rate Management with PostgreSQL Backend – Completed
[x] Database Schema: Create Setting table with key-value store pattern
[x] Database Schema: Fields include key, value, value_type, description, category, is_public, timestamps, updated_by
[x] Database Schema: Foreign key to User table for audit trail (who changed settings)
[x] Database Migration: Create migration file for Setting table
[x] Database Migration: Seed default global_tax_rate setting (8%)
[x] Database Migration: Follow naming convention (Setting vs settings)
[x] Prisma Schema: Add Setting model with proper relations
[x] Prisma Schema: Map field names (value_type, is_public, etc.) to database columns
[x] Prisma Client: Regenerate with Setting model
[x] Backend API: GET /api/settings - List all settings (admin: all, others: public only)
[x] Backend API: GET /api/settings/:key - Get specific setting (public settings accessible without auth)
[x] Backend API: PUT /api/settings/:key - Update setting (admin only)
[x] Backend API: POST /api/settings - Create new setting (admin only)
[x] Backend API: DELETE /api/settings/:key - Delete setting (admin only)
[x] Backend API: Helper functions for type parsing (string/number/boolean/json)
[x] Backend API: Validation for tax rate (0-100% range)
[x] Backend Server: Register /api/settings route
[x] Frontend Context: Add globalTaxRate state to BookingContext
[x] Frontend Context: Initialize from localStorage (offline support)
[x] Frontend Context: Fetch from API on mount (API value wins)
[x] Frontend Context: Update localStorage when API responds
[x] Frontend Context: updateGlobalTaxRate syncs to backend API
[x] Frontend Context: Optimistic updates (instant UI response)
[x] Frontend Context: Detailed console logging for debugging
[x] Dashboard UI: Add "Tax Settings" tab to admin dashboard
[x] Dashboard UI: Display current global tax rate prominently
[x] Dashboard UI: Input field for updating tax rate (0-100%, decimal support)
[x] Dashboard UI: Quick-select buttons for common rates (0%, 5%, 8%, 10%, 13%, 15%, 20%, 25%)
[x] Dashboard UI: Save button with validation and feedback
[x] Dashboard UI: Success/error messages with auto-dismiss
[x] Dashboard UI: Sync input field when globalTaxRate changes (useEffect)
[x] Booking Detail: Add bookingTaxRate state for per-booking overrides
[x] Booking Detail: Load booking-specific tax rate from localStorage
[x] Booking Detail: Calculate effectiveTaxRate (booking override || global default)
[x] Booking Detail: Update calculateSeatTax to use effectiveTaxRate
[x] Booking Detail: Update calculateTax to use effectiveTaxRate
[x] Booking Detail: Display dynamic tax rate in receipts (not hardcoded 8%)
[x] Booking Detail: Add Edit icon next to tax display
[x] Booking Detail: Add tax edit dialog for per-booking customization
[x] Booking Detail: Badge showing "Custom" vs "Global" tax rate status
[x] Booking Detail: Quick-select buttons for common rates in dialog
[x] Booking Detail: Reset to global rate button (clears localStorage override)
[x] Booking Detail: Persist booking-specific tax rate to localStorage (booking-{id}-taxRate)
[x] Booking Detail: Hide edit button in print view (.no-print class)

**Acceptance (0.6f Tax Rate Management)** – VERIFIED
[x] Database: Setting table exists with correct schema
[x] Database: global_tax_rate seeded with value 8, type number, public true
[x] Database: Can query "SELECT * FROM Setting" successfully
[x] Backend API: curl http://localhost:8080/api/settings/global_tax_rate returns data without auth
[x] Backend API: PUT request with valid auth updates tax rate in database
[x] Backend API: Private settings require authentication
[x] Frontend: POS app fetches tax rate from API on startup
[x] Frontend: Console shows "[BOOKING_CTX] ✅ Loaded tax rate from API: 8"
[x] Frontend: localStorage syncs with API value automatically
[x] Dashboard: Tax Settings tab displays current rate correctly
[x] Dashboard: Changing tax rate updates UI immediately (optimistic)
[x] Dashboard: Tax rate change syncs to backend API in background
[x] Dashboard: Success message appears after successful save
[x] Dashboard: Input field updates when globalTaxRate changes
[x] Dashboard: Quick-select buttons set rate instantly
[x] Booking Detail: Tax rate displays correct percentage (dynamic)
[x] Booking Detail: Edit button opens tax rate dialog
[x] Booking Detail: Can set custom tax rate for individual booking
[x] Booking Detail: Badge shows "Custom" when override active
[x] Booking Detail: Badge shows "Global" when using default rate
[x] Booking Detail: Reset button clears override, returns to global
[x] Booking Detail: Tax calculations use correct rate (custom or global)
[x] Booking Detail: Per-seat tax calculations accurate
[x] Booking Detail: Grand total reflects correct tax rate
[x] Offline Mode: Tax rate persists in localStorage if API unavailable
[x] Multi-Device: Changing rate on Device A reflects on Device B after refresh

**Implementation Details:**
- Database Table: "Setting" (PascalCase, follows User/Room/Booking convention)
- Storage Keys: 'global-tax-rate' (global), 'booking-{id}-taxRate' (per-booking)
- API Endpoints: /api/settings, /api/settings/:key (GET public, PUT/POST/DELETE admin only)
- Type Safety: Prisma schema enforces types; API validates 0-100% range
- Audit Trail: updated_by field tracks which user changed settings
- Offline Support: localStorage provides fallback; API syncs when available
- Optimistic UI: Immediate local updates; background API sync
- Multi-Device Sync: All devices fetch from shared PostgreSQL database
- Value Types: 'number', 'string', 'boolean', 'json' (extensible for future settings)
- Public Access: is_public flag allows unauthenticated access to specific settings
- Tax Calculation: effectiveTaxRate = bookingTaxRate ?? globalTaxRate
- Print Friendly: Edit button hidden via .no-print CSS class

Follow‑Ups (Post 0.6f) – Tax & Settings Enhancements
[ ] Add custom_tax_rate column to Booking table (replace localStorage)
[ ] Sync booking-specific tax rates to database via API
[ ] Settings audit log table (track all changes with old/new values, timestamp, user, IP)
[ ] Setting categories management (group related settings)
[ ] Setting validation rules (min/max, regex, custom validators)
[ ] Setting dependencies (e.g., enable_tax requires tax_rate > 0)
[ ] Setting search and filtering in admin UI
[ ] Setting import/export (backup/restore configuration)
[ ] Setting change notifications (alert admins of critical changes)
[ ] Tax rate history chart (visualize changes over time)
[ ] Per-room tax rates (different rates for different room types)
[ ] Tax exemption flags for bookings (non-profit, promotional)
[ ] Multiple tax types (sales tax, service charge, etc.)
[ ] Tax calculation preview (show before/after in UI)
[ ] Webhook notifications when settings change
[ ] Settings cache layer (Redis) for high-performance reads
[ ] Settings versioning (rollback to previous values)
[ ] Settings A/B testing support (feature flags)

---

## Phase 1 – Phone-Based Admin Booking System

**Feature Documentation:** `/docs/admin_manual_booking_feature.md` (v1.0)  
**Schema Guide:** `/docs/database_schema_explanation.md`  
**Phone Handling:** `/docs/phone_number_country_code_handling.md` (architecture details)

**Overview:**
Implement phone-number-based booking system allowing admins to manually create bookings for:
1. **Existing customers** (search by phone)
2. **New customers** (register with phone + name, email optional)
3. **Guest customers** (walk-in only, no account creation)

**Key Changes:**
- Phone becomes primary identifier (unique, required)
- Email becomes optional (nullable)
- Guest bookings supported (nullable userId)
- Track registration source (ONLINE/WALK_IN/PHONE)
- Track booking source (ONLINE/WALK_IN/PHONE)
- Admin audit trail (createdBy, registeredBy)

**Phone Number Architecture:**
- **Storage:** E.164 format (`+14165551234`) in database
- **Default Country:** Canada (`+1`) - hardcoded in backend/frontend code
- **Frontend UI:** Country dropdown + auto-formatted input
  ```
  ┌─────────────┬──────────────────────────┐
  │ 🇨🇦 +1  ▼  │ (416) 555-1234          │
  └─────────────┴──────────────────────────┘
  ```
- **Supported Countries:** Canada (+1), Korea (+82), UK (+44), China (+86)
- **Backend Utils:** `normalizePhone()`, `formatPhoneDisplay()`, `validatePhone()`

---

### 1.1 Database Schema Migration (Backend - Prisma)

**User Model Changes:**
[x] Migration: Make `User.email` nullable (currently required)
[x] Migration: Make `User.phone` required with unique constraint
[x] Migration: Add `User.phoneVerifiedAt` TIMESTAMPTZ (for future SMS verification)
[x] Migration: Add `User.registrationSource` VARCHAR(50) DEFAULT 'ONLINE'
[x] Migration: Add `User.registeredBy` TEXT (FK to User.id, nullable)
[x] Migration: Backfill phone numbers for existing users (placeholder or manual data entry)
[x] Prisma: Update User model with new fields
[x] Prisma: Add self-relation `registeredByUser` / `usersRegistered`
[x] Prisma: Regenerate Prisma Client (`npx prisma generate`)
[x] Seed: Update seed file with phone numbers for test users

**Booking Model Changes:**
[x] Migration: Make `Booking.userId` nullable (for guest bookings)
[x] Migration: Add `Booking.customerEmail` TEXT (optional, for guest email)
[x] Migration: Add `Booking.isGuestBooking` BOOLEAN DEFAULT false
[x] Migration: Add `Booking.bookingSource` VARCHAR(50) DEFAULT 'ONLINE'
[x] Migration: Add `Booking.createdBy` TEXT (FK to User.id, nullable, admin tracking)
[x] Migration: Add `Booking.internalNotes` TEXT (admin-only notes)
[x] Migration: Add index on `customerPhone` for fast guest lookups
[x] Migration: Add index on `bookingSource` for analytics queries
[x] Prisma: Update Booking model with new fields
[x] Prisma: Add `createdByUser` relation to User
[x] Prisma: Make `user` relation optional (`user User?`)
[x] Prisma: Regenerate Prisma Client

**PhoneVerificationToken Model (Phase 2 Schema Prep):**
[x] Migration: Create PhoneVerificationToken table
[x] Fields: id, phone (unique), tokenHash, expiresAt, attempts, createdAt
[x] Prisma: Add PhoneVerificationToken model
[x] Note: Schema only - not used in v1.0, ready for SMS OTP in Phase 2

**Acceptance Criteria (1.1 Database Migration):**
[x] All migrations execute without errors (`npx prisma migrate dev`)
[x] No data loss from existing users/bookings
[x] Can create user with phone-only (email = null)
[x] Can create booking with userId = null (guest booking)
[x] Unique constraint on phone prevents duplicate phone numbers
[x] Foreign keys (registeredBy, createdBy) validate correctly
[x] Indexes created on customerPhone and bookingSource
[x] Seed creates realistic test data for all scenarios (online/walk-in/phone/guest)
[x] Schema matches specification in `/docs/admin_manual_booking_feature.md`

**Migration Details:**
- Migration file: `20251013065406_phone_based_booking_system/migration.sql`
- User table: email nullable, phone unique & required, registrationSource, registeredBy, phoneVerifiedAt
- Booking table: userId nullable, customerEmail, isGuestBooking, bookingSource, createdBy, internalNotes
- PhoneVerificationToken table: Created for Phase 2 SMS OTP
- Seed data: Admin (+821012345678) and Test User (+821098765432) with proper phone numbers
[ ] Can create user with phone-only (email = null)
[ ] Can create booking with userId = null (guest booking)
[ ] Unique constraint on phone prevents duplicate phone numbers
[ ] Foreign keys (registeredBy, createdBy) validate correctly
[ ] Indexes created on customerPhone and bookingSource
[ ] Seed creates realistic test data for all scenarios (online/walk-in/phone/guest)
[ ] Schema matches specification in `/docs/admin_manual_booking_feature.md`

---

### 1.2 Backend Phone Utilities

**Configuration:**
[x] Default country code: `+1` (Canada) - hardcoded constant in code
[x] Simplified to Canada-only (removed Korea, UK, China for Phase 1)
[x] Create `backend/src/config/phone.ts` for country configurations

**Phone Normalization Functions:**
[x] Create `backend/src/utils/phoneUtils.ts`
[x] Implement `normalizePhone(input: string): string`
  - Remove all non-digit/non-plus characters
  - Handle Canadian formats: "416-555-1234" → "+14165551234"
  - Handle formats without country code: "4165551234" → "+14165551234"
  - If input already has +, validate and return
  - Add default country code (+1) if missing
  - Return E.164 format
[x] Implement `formatPhoneDisplay(phone: string): string`
  - Convert "+14165551234" → "+1 416-555-1234" (Canadian format)
  - Handle non-Canadian numbers gracefully (return as-is)
[x] Implement `validatePhone(phone: string): boolean`
  - Regex validation for E.164 format (+ followed by 1-15 digits)
  - General validation (any country)
[x] Implement Canadian validator:
  - `validateCanadianPhone(phone: string)` - +1 + 10 digits
[x] Unit tests for all phone utility functions (59 tests)
  - Test various input formats (with/without dashes, spaces, parentheses)
  - Test edge cases (empty, invalid, too short, too long)
  - Test Canadian formats: "4165551234", "416-555-1234", "(416) 555-1234"
  - Test different area codes: 416, 647, 437, 905, 604, 514
  - Test normalization idempotency (normalizing twice = same result)

**Acceptance Criteria (1.2 Phone Utilities) - Canada-Focused:**
[x] normalizePhone("416-555-1234") returns "+14165551234" (Canadian default)
[x] normalizePhone("(416) 555-1234") returns "+14165551234"
[x] normalizePhone("4165551234") returns "+14165551234"
[x] normalizePhone("+14165551234") returns "+14165551234" (idempotent)
[x] normalizePhone("+1 416 555 1234") returns "+14165551234" (handles spaces)
[x] formatPhoneDisplay("+14165551234") returns "+1 416-555-1234" (Canadian format)
[x] formatPhoneDisplay("+16475551234") returns "+1 647-555-1234" (different area code)
[x] validatePhone("+14165551234") returns true
[x] validatePhone("invalid") returns false
[x] validatePhone("1234") returns false (too short)
[x] validateCanadianPhone("+14165551234") returns true
[x] validateCanadianPhone("+821012345678") returns false (wrong country)
[x] All unit tests pass (npm run test:unit) - **59/59 tests passing** ✅

---

### 1.3 Backend API - User Lookup & Recent Customers

**User Lookup Endpoint:**
[ ] Create `GET /api/users/lookup?phone={phone}` (ADMIN only)
[ ] Normalize phone before database lookup
[ ] Return user details if found:
  - id, name, phone, email, role
  - bookingCount (aggregate COUNT of bookings)
  - lastBookingDate (MAX of startTime)
  - memberSince (createdAt)
  - totalSpent (SUM of booking prices)
  - registrationSource
[ ] Return `{ found: false }` if not found (200 status, not 404)
[ ] Add Zod validation for query params
[ ] Add error handling (400 for invalid phone, 403 for non-admin)
[ ] Add logging with user context

**Recent Customers Endpoint:**
[ ] Create `GET /api/users/recent?limit={10}` (ADMIN only)
[ ] Query params: limit (default 10, max 50)
[ ] Optional filters: registrationSource, role
[ ] Return last N customers ordered by lastBookingDate DESC
[ ] Include: id, name, phone, email, lastBookingDate, bookingCount
[ ] Add pagination support (page, limit)

**Route Registration:**
[ ] Add to `backend/src/routes/users.ts` (or create new file)
[ ] Register routes in `server.ts`
[ ] Add requireAuth middleware with ADMIN role check

**Acceptance Criteria (1.3 User Lookup API):**
[ ] curl with valid phone returns complete user data with stats
[ ] curl with invalid phone returns { found: false } (200)
[ ] curl with non-existent phone returns { found: false } (200)
[ ] Response includes accurate booking statistics
[ ] Non-admin users get 403 Forbidden
[ ] Phone normalization works (can search "010-1234-5678" or "+821012345678")
[ ] Recent customers endpoint returns sorted list (most recent first)
[ ] All required fields present in response

---

### 1.4 Backend API - Admin Manual Booking Creation

**Admin Booking Creation Endpoint:**
[ ] Create `POST /api/bookings/admin/create` (ADMIN only)
[ ] Zod request body validation:
  - customerMode: "existing" | "new" | "guest"
  - customerPhone (for existing mode)
  - newCustomer: { name, phone, email? } (for new mode)
  - guest: { name, phone, email? } (for guest mode)
  - roomId, startTimeIso, hours, players (required)
  - bookingSource: "WALK_IN" | "PHONE"
  - customPrice?, customTaxRate?, internalNotes? (optional)

**Implement customerMode = "existing":**
[ ] Lookup user by normalized phone
[ ] Return 404 if user not found
[ ] Use existing userId for booking
[ ] Auto-fill customerName, customerPhone, customerEmail from user record

**Implement customerMode = "new":**
[ ] Validate phone uniqueness (check existing users)
[ ] Return 409 if phone already exists
[ ] Create new User with:
  - name, phone, email (optional)
  - registrationSource = bookingSource
  - registeredBy = req.user.id (admin who created account)
  - role = 'CUSTOMER'
  - passwordHash = null (no password initially)
[ ] Use new userId for booking

**Implement customerMode = "guest":**
[ ] Validate bookingSource !== 'PHONE' (guests only for walk-in)
[ ] Return 400 if attempting guest phone booking
[ ] Don't create User record
[ ] Set userId = null
[ ] Set isGuestBooking = true
[ ] Store guest data in booking record (customerName, customerPhone, customerEmail)

**Room Availability & Price Calculation:**
[ ] Validate room exists and status = 'ACTIVE'
[ ] Check for time slot conflicts (existing bookings overlap)
[ ] Return 409 if conflict found
[ ] Calculate price:
  - Use customPrice if provided
  - Otherwise: room.hourlyRate × hours
  - Apply customTaxRate or globalTaxRate from settings
  - Calculate totalPrice = basePrice × (1 + taxRate)

**Booking Creation:**
[ ] Create Booking with all fields:
  - roomId, userId (or null), startTime, endTime
  - customerName, customerPhone, customerEmail
  - players, price, totalPrice, status = 'CONFIRMED'
  - bookingSource, createdBy = req.user.id
  - isGuestBooking, internalNotes
[ ] Use transaction for new user + booking (rollback on error)
[ ] Return comprehensive response:
  - booking object (with all fields)
  - userCreated: boolean (if new user created)
  - emailSent: false (future feature placeholder)

**Error Handling & Logging:**
[ ] Handle all validation errors (400)
[ ] Handle conflicts (409: duplicate phone, time slot)
[ ] Handle not found (404: room or user)
[ ] Transaction rollback on booking failure
[ ] Detailed logging with admin, customer, booking context

**Acceptance Criteria (1.4 Admin Booking API):**
[ ] Can create booking for existing customer (by phone lookup)
[ ] Can create booking + new customer account in one call
[ ] Can create guest booking (walk-in only)
[ ] Phone booking rejects guest mode (returns 400)
[ ] Duplicate phone returns 409 with clear message
[ ] Room time slot conflict returns 409
[ ] Invalid roomId returns 404
[ ] Price calculation correct (base + tax)
[ ] Custom price override works
[ ] Custom tax rate override works
[ ] userId is null for guest bookings
[ ] userId populated for existing/new customers
[ ] createdBy tracks admin who created booking
[ ] registrationSource matches bookingSource for new users
[ ] Transaction rolls back if booking fails after user creation
[ ] All required fields validated
[ ] Response includes userCreated flag

---

### 1.5 Frontend - Phone Input Component (Shared UI)

**PhoneInput Component:**
[ ] Create `frontend/components/PhoneInput.tsx`
[ ] Props interface:
  - value: string
  - onChange: (normalized: string) => void
  - onSearch?: () => void
  - defaultCountryCode?: string (default '+1')
  - placeholder?: string
  - disabled?: boolean
  - error?: string
[ ] **UI Layout:** Country dropdown + formatted input
  ```
  ┌─────────────┬──────────────────────────┐
  │ 🇨🇦 +1  ▼  │ (416) 555-1234          │
  └─────────────┴──────────────────────────┘
  ```
[ ] Country code dropdown:
  - Options: 🇨🇦 +1, 🇰🇷 +82, 🇬🇧 +44, 🇨🇳 +86
  - Default: +1 (Canada)
  - Width: ~100px
[ ] Auto-formatting as user types:
  - Canadian: "4165551234" → "(416) 555-1234" (display)
  - Korean: "01012345678" → "010-1234-5678" (display)
  - Calls onChange with normalized E.164: "+14165551234"
[ ] Validation indicator:
  - Green checkmark for valid phone
  - Red X for invalid
[ ] Optional "Search" button integration
[ ] Styled with Tailwind to match existing UI
[ ] Support disabled/readonly states
[ ] Error message display below input
[ ] aria-label and keyboard accessibility

**Acceptance Criteria (1.5 Phone Input):**
[ ] Component renders without errors
[ ] Country dropdown defaults to 🇨🇦 +1
[ ] Can change country to 🇰🇷 +82, 🇬🇧 +44, 🇨🇳 +86
[ ] Typing "4165551234" auto-formats to "(416) 555-1234" (Canadian)
[ ] Typing "01012345678" auto-formats to "010-1234-5678" when country = +82 (Korean)
[ ] onChange receives normalized E.164 value ("+14165551234")
[ ] Display shows user-friendly formatted value
[ ] Changing country re-formats number appropriately
[ ] Search button triggers onSearch callback (if provided)
[ ] Validation indicator shows green for valid, red for invalid
[ ] Disabled state works (grayed out, no input)
[ ] Error prop displays message below input
[ ] Keyboard navigation works (Tab, Enter)
[ ] Paste handling works correctly (e.g., paste "+14165551234" works)

---

### 1.6 Frontend - Customer Search Component

**CustomerSearch Component:**
[ ] Create `frontend/components/CustomerSearch.tsx`
[ ] Phone input with "Search" button
[ ] Search triggers API call to `/api/users/lookup?phone={normalized}`
[ ] Display search results:
  - **User found:** Show card with:
    - Name, phone, email
    - Stats: booking count, last booking date, member since
    - Total spent (formatted currency)
    - "Use This Customer" button
  - **User not found:** Show:
    - "No account found for this phone number"
    - "Register New Customer" button
    - "Book as Guest" button (only if bookingSource = "WALK_IN")
[ ] Recent customers dropdown (optional quick-select)
  - Fetch from `/api/users/recent`
  - Click to auto-populate search
[ ] Loading state during API call (spinner)
[ ] Error handling for failed API calls (toast or inline message)
[ ] Keyboard shortcuts (Enter to search)
[ ] Clear search functionality (X button)

**Acceptance Criteria (1.6 Customer Search):**
[ ] Search with existing phone shows user card with stats
[ ] User card displays all fields correctly formatted
[ ] Search with non-existent phone shows "not found" message
[ ] "Use This Customer" button triggers onSelect callback with user data
[ ] "Register New Customer" button triggers onNewCustomer callback
[ ] "Book as Guest" only visible when bookingSource = "WALK_IN"
[ ] Recent customers list populates from API on mount
[ ] Clicking recent customer auto-fills search and triggers lookup
[ ] Loading spinner shows during search
[ ] Error toast/message displays on API failure
[ ] Clear button resets search input and results
[ ] Enter key triggers search

---

### 1.7 Frontend - Enhanced Booking Modal (Dashboard Integration)

**Multi-Step Booking Modal:**
[ ] Update `frontend/src/pages/DashboardPage.tsx` booking modal
[ ] Add modal state management (step tracking)

**Step 1: Booking Source Selector**
[ ] Radio buttons: "Walk-in" / "Phone Booking"
[ ] Store in state: bookingSource ("WALK_IN" | "PHONE")
[ ] Conditional rendering based on selection

**Step 2: Customer Selection**
[ ] Integrate CustomerSearch component
[ ] Pass bookingSource prop (controls guest option visibility)
[ ] Handle three customer paths:
  - **Existing:** onSelect → store userId, pre-fill details, go to Step 4
  - **New:** onNewCustomer → go to Step 3a (registration form)
  - **Guest:** onGuest → go to Step 3b (guest form, walk-in only)

**Step 3a: New Customer Registration Form**
[ ] Form fields:
  - Name (required)
  - Phone (required, pre-filled from search)
  - Email (optional)
[ ] "Create Account & Continue" button
[ ] Client-side validation:
  - Phone format validation
  - Name required
[ ] Phone uniqueness check (call lookup API again)
[ ] Show "User already exists" error if duplicate found
[ ] On success: go to Step 4 with new user data

**Step 3b: Guest Booking Form**
[ ] Form fields:
  - Name (required)
  - Phone (required, NOT unique check)
  - Email (optional)
[ ] "Continue as Guest" button
[ ] Only rendered if bookingSource = "WALK_IN"
[ ] On submit: go to Step 4 with guest data

**Step 4: Booking Details**
[ ] Room selector dropdown
  - Fetch available rooms
  - Filter by ACTIVE status
[ ] Date picker with availability calendar
[ ] Time picker (only show available time slots)
[ ] Duration selector (1-4 hours, dropdown or buttons)
[ ] Players count (1-4, number input)
[ ] Price preview section:
  - Base price (auto-calculated)
  - Tax rate % (show current global or custom)
  - Total price (base × (1 + tax))
  - Updates live as inputs change
[ ] Admin-only fields (conditional rendering):
  - Custom price override (checkbox + input)
  - Custom tax rate override (checkbox + input)
  - Internal notes (textarea)

**Step 5: Confirmation Screen**
[ ] Summary sections:
  - **Customer details:**
    - Name, phone, email
    - Customer type (Existing / New / Guest)
    - Registration source (if new)
  - **Booking details:**
    - Room name
    - Date & time
    - Duration, players
    - Booking source (Walk-in / Phone)
  - **Price breakdown:**
    - Base price
    - Tax (rate % and amount)
    - Grand total
    - Custom overrides (if any)
    - Internal notes (if any)
[ ] "Confirm & Create Booking" button
[ ] "Back to Edit" button

**Submit & Success/Error Handling:**
[ ] Submit to `POST /api/bookings/admin/create`
[ ] Request payload based on customer mode
[ ] Loading state during submission (disable button, show spinner)
[ ] **Success:**
  - Show success toast ("Booking created successfully")
  - Close modal
  - Refresh bookings list
  - Optional: Open print receipt dialog
[ ] **Error:**
  - Display error message inline (don't close modal)
  - Allow user to retry
  - Specific error messages for:
    - 409 (duplicate phone, time conflict)
    - 404 (room not found)
    - 400 (validation errors)
    - 500 (server error - generic message)

**Acceptance Criteria (1.7 Booking Modal):**
[ ] Booking source selector works (walk-in/phone radio buttons)
[ ] Customer search finds and displays existing users with stats
[ ] Can register new customer inline (Step 3a)
[ ] New customer form validates phone format
[ ] Duplicate phone check prevents conflicts
[ ] Guest mode only available for walk-in bookings
[ ] Phone bookings hide "Book as Guest" option
[ ] Booking details form shows only available rooms
[ ] Date/time pickers respect room availability
[ ] Price preview calculates correctly with live updates
[ ] Custom price override works (admin only)
[ ] Custom tax rate override works (admin only)
[ ] Internal notes field saves correctly
[ ] Confirmation screen shows all details accurately
[ ] Submit creates booking successfully
[ ] Success toast appears and modal closes
[ ] Bookings list auto-refreshes after creation
[ ] Error messages display clearly without closing modal
[ ] Can retry after error
[ ] Modal navigation (back/next) works smoothly
[ ] Form validation prevents invalid submissions

---

### 1.8 Analytics Dashboard (Optional - Future)

**Registration Source Analytics:**
[ ] Create analytics page or dashboard tab
[ ] Chart: Users by registration source (pie or bar)
  - Online, Walk-in, Phone counts
[ ] Chart: Bookings by source over time (line chart)
[ ] Cross-channel analysis table:
  - Online users who book via walk-in
  - Walk-in users who book online later
[ ] Admin performance metrics:
  - Top admins by registrations created
  - Top admins by bookings created
  - Average bookings per admin per day/week
[ ] Filters: date range, registration source, booking source
[ ] Export to CSV functionality
[ ] Time-series charts (daily/weekly/monthly trends)

**Acceptance Criteria (1.8 Analytics):**
[ ] Charts render without errors
[ ] Data accurately reflects database (spot-check counts)
[ ] Filters update charts in real-time
[ ] Export CSV downloads with correct data
[ ] Cross-channel insights accurate (verified with SQL queries)
[ ] Admin performance rankings correct

---

### 1.9 Testing & Documentation

**Backend Integration Tests:**
[ ] Test: Create booking for existing customer (by phone)
[ ] Test: Create booking + new customer account
[ ] Test: Create guest booking (walk-in only)
[ ] Test: Reject guest booking via phone (400 error)
[ ] Test: Duplicate phone validation (409 error)
[ ] Test: Room time slot conflict (409 error)
[ ] Test: Invalid roomId (404 error)
[ ] Test: Phone normalization in lookups (multiple formats)
[ ] Test: Price calculation with global tax rate
[ ] Test: Price calculation with custom tax rate
[ ] Test: Admin audit trail (createdBy, registeredBy)
[ ] Test: Registration source tracking
[ ] Test: Transaction rollback on booking creation failure

**Frontend E2E Tests (Playwright/Cypress):**
[ ] E2E: Complete walk-in guest booking flow (no account creation)
[ ] E2E: Complete phone booking for new customer (creates user + booking)
[ ] E2E: Search existing customer by phone and create booking
[ ] E2E: Error handling (duplicate phone shows message, doesn't submit)
[ ] E2E: Room conflict error (book same time slot twice)
[ ] E2E: Walk-in booking can choose guest option
[ ] E2E: Phone booking hides guest option
[ ] E2E: Price preview updates when duration/room changes
[ ] E2E: Custom price override works

**Documentation:**
[ ] API documentation for new endpoints:
  - GET /api/users/lookup
  - GET /api/users/recent
  - POST /api/bookings/admin/create
[ ] User guide for front desk staff (PDF or wiki page)
[ ] Admin training guide (screenshots + step-by-step)
[ ] Database schema documentation update (ER diagram)
[ ] README update with new features
[ ] Migration guide (existing email-based to phone-based)

**Acceptance Criteria (1.9 Testing & Docs):**
[ ] All backend integration tests pass (npm test)
[ ] All E2E tests pass (npm run test:e2e)
[ ] API docs complete with request/response examples
[ ] User guides written and reviewed by team
[ ] No TypeScript compilation errors
[ ] No console errors in development or production builds
[ ] All tests run in CI/CD pipeline

---

### Phase 1 Summary & Success Metrics

**Deliverables:**
✅ Database schema migrated (phone-based, guest bookings, tracking fields)  
✅ Phone utility functions (normalize, format, validate)  
✅ User lookup & recent customers API  
✅ Admin booking creation API (3 customer modes)  
✅ Phone input component (auto-formatting)  
✅ Customer search component  
✅ Enhanced booking modal (multi-step, all customer types)  
✅ Comprehensive testing (integration + E2E)  
✅ Documentation (API, user guides, training)

**Success Metrics (Phase 1):**
- [ ] < 60 seconds to create walk-in booking (timed user test)
- [ ] Zero duplicate phone numbers in database (SQL constraint)
- [ ] 90% of walk-ins choose to register vs guest (analytics query)
- [ ] Phone search success rate: 100% (no false negatives)
- [ ] < 500ms API response time for booking creation (performance test)
- [ ] Zero data loss during migration (pre/post record counts match)

**Follow-Ups (Phase 2 - SMS Verification & Enhancements):**
[ ] Phone verification via SMS OTP (Twilio or NHN Cloud)
[ ] PhoneVerificationToken usage (table already created)
[ ] "Verified" badge for users in UI
[ ] SMS booking confirmations to customers
[ ] Account recovery via SMS OTP
[ ] Phone-based login (OTP instead of password)
[ ] Guest-to-registered migration tool (convert guest bookings to user accounts)
[ ] Batch phone number cleanup (normalize existing data)
[ ] Phone number blacklist (spam prevention)
[ ] International phone support (multiple country codes)
[ ] See `/docs/admin_manual_booking_feature.md` for Phase 2 details

**Related Documentation:**
- `/docs/admin_manual_booking_feature.md` - Full v1.0 specification
- `/docs/database_schema_explanation.md` - Database relations guide
- `/docs/api/bookings.md` - API documentation (to be created in 1.9)
- `/docs/user-guide/admin-booking.md` - User guide (to be created in 1.9)

Follow‑Ups (Post 0.6e) – Advanced POS Features
[ ] Backend Integration: Replace mock menu with database-backed menu items
[ ] Backend Integration: Persist orders to database (Order, OrderItem tables)
[ ] Backend Integration: Link orders to bookings via foreign key
[ ] Payment Processing: Add payment gateway integration for order checkout
[ ] Order History: Display historical orders for completed bookings
[ ] Kitchen Display: Send order to kitchen management system (KDS)
[ ] Analytics: Track popular items, revenue per seat, average order value
[ ] Discounts/Promotions: Add coupon codes and promotional pricing
[ ] Multi-Currency: Support international payments (USD, KRW, etc.)
[ ] SMS/Email Receipts: Send digital receipts to customers
[ ] Inventory Management: Track stock levels and low-stock alerts
[ ] Combo/Bundle Pricing: Special pricing for item combinations
[ ] Modifiers/Add-ons: Customization options (extra toppings, size upgrades)
[ ] Tax Configuration: Support different tax rates per jurisdiction
[ ] Tip/Gratuity: Add optional tip calculation to receipts
[ ] Void/Refund: Admin ability to cancel orders and issue refunds
[ ] Order Notes: Allow special instructions per item (allergies, preferences)
[ ] Table Service: Integrate with table/bay management system
[ ] Happy Hour Pricing: Time-based dynamic pricing rules

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


### 0.6d Room Status Queue-Based Sync with Collapse Logic – Completed
[x] Implemented `processRoomUpdates()` in sync.ts with collapse logic
[x] Collapse strategy: Group room:update mutations by roomId, keep only latest per room
[x] Delete superseded mutations to reduce queue size
[x] PATCH each final update to `/api/bookings/rooms/:id` with `{ status }`
[x] Handle auth-expired (401), validation errors (400/404/409), transient failures
[x] Generic `queue:enqueue` IPC handler in main.ts accepts type + payload
[x] Exposed `enqueue(type, payload)` in preload.ts contextBridge
[x] Updated TypeScript definitions in global.d.ts with enqueue method
[x] Modified `updateRoomStatus` in bookingContext.tsx to enqueue mutations
[x] Optimistic UI update for immediate feedback before sync
[x] Background sync every 15 seconds processes queued room status changes
[x] Fixed Force Sync button wiring in Dashboard, BookingDetail, MenuManagement pages
[x] Added comprehensive logging throughout enqueue → sync → PATCH flow
[x] Verified collapse logic: 3 mutations → 2 dropped (superseded) → 1 PATCH sent
[x] Implemented 15-second periodic auto-sync in main.ts
[x] Auto-reload rooms after successful sync (manual + automatic)
[x] Fixed infinite loop in room reload (using stateRef + prevAdminRef pattern)

**Acceptance (0.6d Room Status Sync)** – VERIFIED
[x] Rapid Status Changes (Collapse Test):
    - Changed room status 3+ times rapidly
    - Clicked Force Sync
    - Console logs confirmed: `[SYNC][ROOM] Found 3 room:update mutations in queue`
    - Collapse logic verified: `[SYNC][ROOM] Dropping superseded mutation` (2 times)
    - Final result: `[SYNC][ROOM] After collapse: 1 unique room(s) to update`
    - Single PATCH sent: `[SYNC][ROOM] PATCH http://localhost:8080/api/bookings/rooms/1 { status: 'MAINTENANCE' }`
    - ✅ Collapse logic working perfectly!
[x] Logging Verification:
    - Enqueue logs: `[BOOKING_CTX] updateRoomStatus called`, `[MAIN] queue:enqueue called`
    - Sync logs: `[SYNC][ROOM] Found X mutations`, `[SYNC][ROOM] After collapse: Y unique rooms`
    - Network logs: `[SYNC][ROOM] PATCH` with correct endpoint and payload
    - Error handling: `[SYNC][ROOM] push failed 500` properly caught and logged
[x] Periodic Sync (15s Interval):
    - Implemented automatic sync every 15 seconds
    - Logs: `[MAIN] Starting periodic sync cycle, interval: 15000 ms`
    - Auto-sync only runs when: authenticated + queue not empty
    - Console shows: `[MAIN][AUTO_SYNC] Triggering sync cycle, queue size: X`
    - Queue drains automatically without manual Force Sync
[x] Auto-Reload After Sync:
    - Rooms automatically reload from backend after successful sync
    - Logs: `[SYNC][RENDERER] Reloading rooms after successful sync`
    - UI updates with latest status from database
    - No manual page reload needed
[x] Infinite Loop Fix:
    - Fixed infinite room reload loop using stateRef pattern
    - `reloadRooms` now stable (no state dependency)
    - Only reloads on admin login transition (not every state change)
    - No more endless `[ROOMS][TRACE] rooms:list` spam
[ ] Full Integration Test (Blocked - see Follow-up):
    - Currently fails with 500 error: Room ID mismatch (mock '1' vs real UUID)
    - Need to fetch real rooms from backend before testing status updates
    - See "Follow-up (Post 0.6d)" below

**Known Issue (0.6d):**
- POS uses mock room data with IDs `'1'`, `'2'`, `'3'`, `'4'` in `bookingContext.tsx`
- Backend has real rooms with UUID IDs (e.g., `79b72351-feb2-44be-9c90-f55c63d57d59`)
- Status update requests fail with 500 because room ID doesn't exist in database
- Solution: Replace mock rooms in bookingContext with real rooms fetched from backend

**Implementation Details:**
- Mutation Type: `room:update` with payload `{ roomId: string, status: 'ACTIVE'|'MAINTENANCE'|'CLOSED' }`
- Collapse Logic: For same roomId, only the mutation with latest `createdAt` timestamp is sent
- Endpoint: `PATCH /api/bookings/rooms/:id` with body `{ status }`
- Error Handling: 401 stops processing + clears auth; 400/404/409 drop mutation; 500 increments attemptCount
- Sync Interval: 15 seconds automatic background sync
- UI Feedback: Optimistic update (immediate) + queue badge increment + eventual sync confirmation
- Room Reload: Automatic after successful sync (both manual Force Sync and auto-sync)


### 0.9 Scheduled Push Loop – Completed
[x] Interval (15s) triggers `processSyncCycle()` if `online && auth==authenticated && queue>0 && !isSyncing`
[x] Acceptance: create offline, reconnect (and login if needed) -> queue auto drains
[x] Logs show `[MAIN][AUTO_SYNC]` prefix for automatic sync cycles
[x] Auth expiry handled (clears state, notifies renderer)
[x] Queue update events emitted to renderer after each cycle

**Acceptance (0.9 Scheduled Push Loop)** – VERIFIED
[x] Automatic sync occurs every 15 seconds when queue has items
[x] No overlapping sync cycles (existing `syncing` flag prevents concurrent runs)
[x] Offline state halts automatic sync (checks authentication + queue size)
[x] Console shows: `[MAIN][AUTO_SYNC] Triggering sync cycle, queue size: X`
[x] Queue badge updates automatically as items are synced


Follow-up (Post 0.6d) – Room Data Synchronization
[ ] Replace mock room data in bookingContext with real backend data
[ ] Fetch rooms on app startup (already exists via authState.rooms)
[ ] Update bookingContext to use real rooms from authState instead of initialRooms mock
[ ] Add color mapping logic for dashboard room cards (backend Room doesn't have color field)
[ ] Reconcile Room type differences (backend has openMinutes/closeMinutes, mock has capacity/hourlyRate)
[ ] Update DashboardPage to handle real Room type (id: UUID string, no color/capacity/hourlyRate)
[ ] Test room status update with real UUID room IDs
[ ] Verify status change persists across app restart (fetch latest from backend)


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


### 0.9 Scheduled Push Loop – Completed
[x] Interval (15s) triggers `processSyncCycle()` if `online && auth==authenticated && queue>0 && !isSyncing`  
[x] Acceptance: create offline, reconnect (and login if needed) -> queue auto drains  

**Acceptance (0.9 Scheduled Push Loop)** – VERIFIED
[x] When Online + Authenticated + queue>0: a push occurs automatically within one interval (≤15s) without manual button.
[x] During ongoing push (simulate longer cycle), no second overlapping push starts (existing `syncing` flag prevents concurrent runs).
[x] Offline state (disable network) halts scheduled pushes (checks authentication + queue size) until connectivity restored.
[x] Console logs show: `[MAIN] Starting periodic sync cycle, interval: 15000 ms` on app start
[x] Each auto-sync logs: `[MAIN][AUTO_SYNC] Triggering sync cycle, queue size: X`
[x] Queue badge updates automatically as items are synced without manual Force Sync


### 0.9.1 Development Logging Consolidation – Completed
[x] Forward main process logs to renderer DevTools console (dev only)
[x] Intercept console methods in main.ts and emit via IPC `main-log` channel
[x] Added `onMainLog` listener in preload.ts bridge
[x] Updated TypeScript definitions in global.d.ts
[x] Renderer index.tsx listens for main logs and outputs to DevTools with `[MAIN]` prefix
[x] Guarded with `ELECTRON_DEV` check - only active in development mode
[x] Documented behavior in .env.example

**Acceptance (0.9.1 Log Consolidation)** – VERIFIED
[x] Dev Mode (`npm run dev`): All main process logs appear in DevTools console with `[MAIN]` prefix
[x] Dev Mode: Both main process and renderer logs visible in one place (DevTools console)
[x] Production Build: Log forwarding disabled; main process logs stay in terminal only
[x] No performance overhead in production (console interception skipped)

**Implementation Details:**
- Interception: Main process console.log/warn/error/info/debug wrapped to emit IPC events
- IPC Channel: `main-log` with payload `{ level: 'log'|'warn'|'error'|'info'|'debug', message: any[] }`
- Prefix: `[MAIN]` added to all forwarded logs in DevTools for easy identification
- Environment Guard: Only active when `ELECTRON_DEV=1` (automatically set by npm run dev)
- Documentation: Added note to .env.example explaining automatic ELECTRON_DEV behavior


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
