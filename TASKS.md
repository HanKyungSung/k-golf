# K-Golf Project Tasks

Consolidated task tracking for the entire K-Golf platform (Backend, Frontend, POS).

**Legend:** `[ ]` pending | `[~]` in progress | `[x]` done

---

## 📝 Table of Contents

1. [Active Issues & Bugs](#active-issues--bugs)
2. [Project Specifications](#project-specifications)
3. [Open Questions & Decisions](#open-questions--decisions)
4. [POS Electron App - Phase 0](#pos-electron-app---phase-0)
5. [Backend & Admin Features - Phase 1](#backend--admin-features---phase-1)
6. [Code Cleanup & Technical Debt](#code-cleanup--technical-debt)
7. [Testing & Quality Assurance](#testing--quality-assurance)
8. [Completed Tasks Archive](#completed-tasks-archive)

---

## Personal note
- Need to see how to handle the paymentStatus. Confirm with customer.

## 🐛 Active Issues & Bugs

### Priority: CRITICAL 🔥

**1. Web POS - Booking Detail Actions Panel Empty** ✅ FIXED
- **Status:** 🟢 RESOLVED - 2025-11-25
- **Reported:** 2025-11-25
- **Component:** Web POS Booking Detail (`frontend/src/pages/pos/booking-detail.tsx`)
- **Issue:**
  - Actions panel shows no buttons for active bookings
  - Checking `booking.status === 'confirmed'` but API returns `'booked'`
  - Field mismatch: code checks `status` which has presentStatus values ('booked'/'completed'/'canceled')
  - Should check `booking.bookingStatus` for raw values ('CONFIRMED'/'COMPLETED'/'CANCELLED')
- **Root Cause:**
  - Backend `presentBooking()` returns both fields:
    - `status`: computed display value ('booked'|'completed'|'canceled')
    - `bookingStatus`: raw database value ('CONFIRMED'|'COMPLETED'|'CANCELLED')
  - Web UI checks wrong field with wrong values
- **Fix Applied:** (2025-11-25)
  - Changed all 3 conditions to use `booking.bookingStatus` instead of `booking.status`
  - Updated to uppercase values: 'CONFIRMED', 'CANCELLED', 'COMPLETED'
  - Fixed lines 843, 857, 862 in booking-detail.tsx
  - Commit: b821720 + follow-up fix commit
- **Impact:** Staff can now complete, cancel, and restore bookings from detail page
- **Testing:** Verify buttons appear and function correctly on production

**2. Web POS - Room Status Cards Showing Incorrect Bookings** ✅ FIXED
- **Status:** � RESOLVED (2025-11-25)
- **Reported:** 2025-11-23
- **Component:** Web POS Dashboard (`frontend/src/pages/pos/dashboard.tsx`)
- **Issues Fixed:**
  1. **Timezone Bug:** Used `toISOString()` which converted dates to UTC
     - Booking at 11:30pm PST Nov 24 showed as Nov 25 in UTC
     - "Today" comparison failed due to UTC/local mismatch
     - **Fix:** Use local timezone methods (`getFullYear()`, `getMonth()`, `getDate()`)
  2. **Pagination Bug:** API only returned first 10 bookings by default
     - Bookings beyond page 1 weren't loaded
     - **Fix:** Implemented separate API calls with date range filters
- **Solution Implemented:**
  - **Room Status:** Loads only today's bookings (0:00-23:59 local time)
  - **Timeline:** Loads current week's bookings (Monday-Sunday)
  - Dual API calls merged and deduplicated by booking ID
  - Backend added `startDate`/`endDate` query parameters
- **Performance Benefits:**
  - Reduced data transfer (today + week vs all bookings)
  - Typical load: 10-50 bookings instead of 100+ or 1000+
  - Independent refresh strategies for room status and timeline
- **Testing Completed:**
  - [x] Room cards show correct bookings for today
  - [x] Status colors accurate (green=empty, yellow=occupied)
  - [x] Empty rooms display "No booking"
  - [x] Bookings update on 5-second poll
  - [x] Works across all 4 rooms
- **Commits:** 
  - Timezone fix & pagination optimization (commit 5cf4243, 2025-11-25)
  - Reference: Timeline timezone fix (commit 43bbac8, 2025-11-20)

**2. POS Dashboard - Timeline and Room Status Refresh Issues** ✅ FIXED
- **Status:** 🟢 RESOLVED (2025-11-20)
- **Issues Fixed:**
  1. **Timezone bugs in date handling:**
     - Fixed `BookingContext`: Extract booking date using local timezone methods instead of `toISOString()`
     - Fixed `DashboardPage`: Compare dates using local timezone strings
     - Fixed `dateKey()`: Return local date string instead of UTC
     - Fixed `isBookingActive()`: Create Date objects using local timezone constructor
  2. **Timeline not showing bookings on initial load:**
     - Root cause: Two competing fetches (Timeline week fetch + Today fetch) overwriting each other
     - Solution: Removed duplicate Today fetch, Timeline week fetch now covers both
     - Today's bookings now filtered from week data instead of separate fetch
  3. **Timeline component not re-rendering:**
     - Added dynamic key prop to TimelineView component: `key={timeline-${length}-${firstId}}`
     - Improved day keys to include booking count: `key={dayKey}-${bookingCount}`
- **Result:** Bookings now display correctly in room status cards and timeline after restart
- **Commits:** Multiple fixes culminating in commit 43bbac8

### Priority: HIGH

**1. Booking Status Implementation (bookingStatus + paymentStatus)**
- **Status:** 🔴 Open
- **Component:** Full Stack (Backend + Frontend + POS)
- **Requirement:** Implement dual-status system for booking lifecycle and payment workflow tracking
- **Description:** Add `bookingStatus` (lifecycle) and `paymentStatus` (payment workflow) fields to properly track room status during operation
- **Documentation:** See README.md "Booking Status Fields" section

#### Backend Tasks
- [x] **Database Migration** ✅ COMPLETED
  - [x] Rename `status` column to `bookingStatus` in Booking model
  - [x] Add `paymentStatus` column (String, default "UNPAID")
  - [x] Add `billedAt` column (DateTime?, nullable)
  - [x] Add `paidAt` column (DateTime?, nullable)
  - [x] Add `paymentMethod` column (String?, nullable)
  - [x] Add `tipAmount` column (Decimal?, nullable)
  - [x] Create Prisma migration file (20251118075727_add_booking_payment_status)
  - [x] Generate Prisma client with new fields
  - [x] Update seed script to use new field names (past bookings = COMPLETED/PAID)

- [x] **API Updates** ✅ COMPLETED
  - [x] Update booking creation endpoints (all 3) to set `bookingStatus=CONFIRMED`, `paymentStatus=UNPAID`
  - [x] Create `PATCH /api/bookings/:id/payment-status` endpoint (admin only)
    - [x] Accept paymentStatus, paymentMethod, tipAmount
    - [x] Set `billedAt` timestamp when changing to BILLED or PAID
    - [x] Set `paidAt` timestamp when changing to PAID
    - [x] Use updatePaymentStatus() repository method
  - [x] Update presentBooking() to include all payment fields in response
  - [x] Update cancellation check to use `bookingStatus` field (CANCELLED spelling)
  - [x] Update room hours validation to use `bookingStatus` field
  - [x] Update presentStatus() helper to use `bookingStatus` parameter

- [x] **Repository Layer** ✅ COMPLETED
  - [x] Update `bookingRepo.ts` to handle new fields
  - [x] Add `updatePaymentStatus()` method
  - [x] Add `updateBookingStatus()` method
  - [x] Update TypeScript interfaces (CreateBookingInput, UpdatePaymentStatusInput)

- [ ] **Testing**
  - [ ] Unit tests for payment status transitions
  - [ ] Integration tests for booking workflow
  - [ ] Test payment status validation rules
  - [ ] Test backward compatibility with existing bookings

#### Frontend Web App Tasks
- [x] **Type Updates** ✅ COMPLETED
  - [x] Update Booking interface (ApiBooking) to include payment fields
  - [x] Add paymentStatus, billedAt, paidAt, paymentMethod, tipAmount fields
  - [x] Backend already sends 'status' (computed from bookingStatus) for UI compatibility

- [ ] **UI Updates**
  - [ ] Update booking display to show payment status
  - [ ] Add payment status badges/indicators
  - [ ] Update admin dashboard to filter by payment status
  - [ ] Add payment status column to booking tables
  - [ ] Add payment status update UI (admin only)

- [ ] **Testing**
  - [ ] Test UI with new status fields
  - [ ] Test status display and filtering

#### POS Electron App Tasks
- [x] **SQLite Schema** ✅ COMPLETED
  - [x] Add schema versioning system (PRAGMA user_version)
  - [x] Create migration 1: Add bookingStatus and payment columns
  - [x] Migrate existing data (status → bookingStatus, CANCELED → CANCELLED)
  - [x] Set paymentStatus=PAID for completed bookings
  - [x] Update sync.ts to upsert new fields from backend
  - [x] Update bookings.ts to create with bookingStatus/paymentStatus
  - [x] Update main.ts IPC handler to use bookingStatus

- [x] **Type Updates** ✅ COMPLETED
  - [x] Update BookingContext.tsx Booking interface with payment fields
  - [x] Add backward compatibility for old 'status' field in mapper
  - [x] Handle both CANCELED and CANCELLED spellings
  - [x] Add paymentStatus, billedAt, paidAt, paymentMethod, tipAmount fields

- [ ] **Sync Engine**
  - [ ] Update `bookings:pull` to sync new fields
  - [ ] Update `bookings:push` (if needed) for payment status
  - [ ] Test bidirectional sync of payment status

- [x] **Dashboard UI - Basic Display** ✅ COMPLETED
  - [x] Add getPaymentStatusColor() helper function
  - [x] Display payment status badges in booking list (Unpaid/Billed/Paid with icons)
  - [x] Show payment status in booking detail page header

- [x] **Booking Detail Page - Display** ✅ COMPLETED
  - [x] Add Payment Information card
  - [x] Display payment status badge
  - [x] Show payment method (CARD/CASH)
  - [x] Show billedAt and paidAt timestamps
  - [x] Display tip amount

- [ ] **Payment Workflow UI (Future Enhancement)**
  - [ ] Add "Issue Bill" button in detail page (UNPAID → BILLED)
  - [ ] Add payment collection modal:
    - [ ] Payment method selector (CARD | CASH)
    - [ ] Tip amount input
    - [ ] "Mark as Paid" button (BILLED → PAID)
  - [ ] Update room status colors based on payment status
  - [ ] Add payment action buttons to room cards in dashboard
    - [ ] "Mark as Paid" button (updates to PAID, sets paidAt)
  - [ ] Show payment history (billedAt, paidAt timestamps)
  - [ ] Disable "Complete Booking" until paymentStatus=PAID

- [ ] **IPC Bridge**
  - [ ] Add `bookings:update-payment-status` IPC handler
  - [ ] Expose payment status update method in preload.ts
  - [ ] Add proper error handling and validation

- [ ] **Testing**
  - [ ] Test payment workflow: UNPAID → BILLED → PAID
  - [ ] Test room card color changes
  - [ ] Test action buttons on dashboard
  - [ ] Test payment method and tip amount capture
  - [ ] Test sync of payment status across terminals
  - [ ] Test offline mode (queue payment updates)

#### Documentation
- [x] Document status fields in README.md
- [ ] Update API documentation with new endpoints
- [ ] Add payment workflow diagram to docs
- [ ] Document payment status transition rules
- [ ] Add examples for common scenarios

#### Rollout Plan
1. **Phase 1: Backend**
   - Create migration and update API
   - Deploy to staging, test with existing data
   - Verify backward compatibility

2. **Phase 2: Frontend Web**
   - Update types and UI
   - Deploy to staging
   - Test booking display and status updates

3. **Phase 3: POS App**
   - Update local schema and sync
   - Update dashboard UI with new workflow
   - Test on development POS terminal

4. **Phase 4: Production**
   - Deploy backend migration during maintenance window
   - Deploy frontend and POS updates
   - Monitor for issues
   - Train staff on new payment workflow

**Impact:** HIGH - Core feature affecting all booking operations and room status tracking
**Priority:** HIGH - Needed for proper POS workflow implementation
**Estimated Effort:** 3-5 days across all components

---

**2. API Security & Authentication**
- **Status:** 🔴 Open
- **Component:** Backend API (`backend/src/`)
- **Requirement:** Protect API endpoints to ensure only authorized clients (POS, Frontend) can access
- **Current State:** APIs are accessible without proper authentication/authorization
- **Security Concerns:**
  - No API key mechanism
  - No rate limiting
  - No request validation for client source
- **Implementation Options:**
  1. API Key authentication for POS client
  2. JWT tokens with proper validation
  3. IP whitelisting for known clients
  4. Request signature validation
- **Next Steps:**
  - [ ] Choose authentication strategy (API keys vs JWT)
  - [ ] Implement middleware for API protection
  - [ ] Add API key management system
  - [ ] Document authentication flow
  - [ ] Update POS client to include credentials

**2. Logging System**
- **Status:** 🔴 Open
- **Component:** Backend + POS (`backend/src/`, `pos/apps/electron/src/`)
- **Requirement:** Comprehensive logging for debugging, monitoring, and audit trails
- **Current State:** Basic console.log statements, no structured logging
- **Needed Features:**
  - Structured log format (timestamp, level, component, message)
  - Log levels: DEBUG, INFO, WARN, ERROR
  - Log rotation and retention policy
  - Searchable log storage
  - Error tracking integration (e.g., Sentry)
  - Request/response logging (with PII masking)
- **Backend Logging:**
  - [ ] Choose logging library (winston, pino, or bunyan)
  - [ ] Add request/response middleware logging
  - [ ] Log authentication events
  - [ ] Log database operations
  - [ ] Add error tracking
- **POS Logging:**
  - [ ] Implement electron-log configuration
  - [ ] Log sync operations with timestamps
  - [ ] Log IPC communication errors
  - [ ] Add crash reporting
- **Next Steps:**
  - [ ] Set up logging infrastructure
  - [ ] Define log retention policy
  - [ ] Create log monitoring dashboard

**3. Fix Print Functionality - Seat-Specific Printing**
- **Status:** � In Progress
- **Component:** POS Admin Dashboard Print Feature (`pos/apps/electron/src/renderer/pages/BookingDetailPage.tsx`)
- **Requirement:** Make print functionality customizable per seat/room
- **Current Implementation:**
  - ✅ Added IPC handler `print:bill` in main.ts
  - ✅ Exposed `window.kgolf.printBill()` in preload.ts
  - ✅ Updated `handlePrintSeat()` to use Electron IPC approach
  - ✅ Creates hidden window with custom HTML for each seat
  - ✅ Filters orders by seat ID before printing
  - ✅ Shows seat items, subtotal, tax, and total
- **Features Implemented:**
  - Seat-specific bill generation with customer info
  - Professional receipt layout with K-GOLF header
  - Automatic calculation of seat subtotal, tax, and total
  - Print dialog for printer selection
- **Testing Needed:**
  - [ ] Test printing with multiple seats and orders
  - [ ] Verify calculations are correct
  - [ ] Test with different printers
  - [ ] Test error handling when no items on seat
- **Future Enhancements:**
  - [ ] Add print template customization (header, footer, logo)
  - [ ] Support batch printing (multiple seats at once)
  - [ ] Add silent printing option (skip dialog)
  - [ ] Add print preview functionality
  - [ ] Store print preferences per user
- **Impact:** High - critical for kitchen order management and workflow

**4. Thermal Printer Integration**
- **Status:** 🔴 Open
- **Component:** POS Printing System
- **Requirement:** Build connection to thermal printer for kitchen orders
- **Current State:** No thermal printer support, using browser print dialog
- **Technical Requirements:**
  - [ ] Research thermal printer protocols (ESC/POS, Star Line Mode)
  - [ ] Choose thermal printer library (node-thermal-printer, escpos)
  - [ ] Implement printer discovery and connection
  - [ ] Add printer status monitoring (paper out, offline, error)
  - [ ] Design receipt format for thermal printers (58mm or 80mm width)
  - [ ] Handle printer-specific ESC/POS commands
  - [ ] Add fallback to PDF/browser print if thermal printer unavailable
- **Printer Models to Support:**
  - [ ] Determine target thermal printer models
  - [ ] Test with common brands (Epson TM-series, Star TSP series)
  - [ ] Add USB and network (Ethernet/WiFi) printer support
- **Features:**
  - [ ] Auto-connect to configured printer on app startup
  - [ ] Queue print jobs if printer busy
  - [ ] Retry logic for failed prints
  - [ ] Print job history and logging
  - [ ] Settings UI for printer configuration
- **Impact:** High - essential for production kitchen workflow
- **Next Steps:**
  - [ ] Research and select thermal printer library
  - [ ] Acquire test thermal printer hardware
  - [ ] Implement proof-of-concept for USB thermal printing
  - [ ] Design kitchen receipt layout

**5. Dynamic Time Slot Suggestion Logic**
- **Status:** 🔴 Open
- **Component:** Frontend Booking System
- **Requirement:** Dynamic time slot suggestions based on actual booking end times
- **Example:** Walk-in books 1:22pm - 2:22pm → Suggest 2:27pm - 3:27pm (with 5min buffer)
- **Current State:** Not implemented (using fixed intervals or manual entry)
- **Impact:** Medium - affects booking efficiency and user experience
- **Implementation Notes:**
  - Backend: Calculate available slots from existing booking end times
  - Add configurable buffer time (5-15 minutes for cleanup)
  - Frontend: Display suggested time slots dynamically
- **Related:** Booking Availability & Time Slots (Project Specifications)
- **Next Steps:**
  - [ ] Create backend endpoint: GET /api/bookings/available-slots?roomId=X&date=Y
  - [ ] Add buffer time configuration to settings
  - [ ] Update frontend booking form with time slot suggestions
  - [ ] Add validation to prevent overlapping bookings

**6. User Lookup Feature (Missing)**
- **Status:** 🔴 Open
- **Component:** Admin Dashboard / Customer Management
- **Requirement:** Ability to search and view customer details
- **Current State:** Basic phone lookup exists in POS, needs enhancement
- **Features Needed:**
  - [ ] Search by phone, email, or name
  - [ ] Display customer booking history
  - [ ] Show total spent and last visit
  - [ ] Quick access to create booking for customer
  - [ ] Edit customer details
- **Impact:** Medium - affects customer service efficiency
- **Related:** Phase 1.3 (User Lookup API exists but limited UI)
- **Next Steps:**
  - [ ] Design user lookup UI (search bar + results list)
  - [ ] Add to admin dashboard as new tab/page
  - [ ] Integrate with existing GET /api/users/lookup endpoint
  - [ ] Add customer detail modal/page

### Priority: MEDIUM

**5. Web POS Input Styling Issue**
- **Status:** 🟡 Known Issue (Non-Critical)
- **Component:** Web POS Booking Modal (`frontend/src/pages/pos/booking-modal.tsx`)
- **Issue:** Input fields (customer name, email, duration, players) missing padding despite explicit className
- **Current State:**
  - Added explicit `h-9 px-3 py-2` classes to all Input components
  - Styling fix not working in browser (functionality unaffected)
  - Users can still enter data and create bookings successfully
- **Technical Details:**
  - Base Input component has `px-3 py-1` in shadcn/ui
  - Custom classes added: `h-9 px-3 py-2 bg-slate-900/50 border-slate-600 text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500`
  - Potential Tailwind CSS specificity or merging issue
- **Next Steps:**
  - [ ] Investigate Tailwind className merging behavior
  - [ ] Try using cn() utility to properly merge classes
  - [ ] Check if custom bg color overrides padding
  - [ ] Consider using inline styles as workaround
  - [ ] Test with different Tailwind JIT compilation settings
- **Impact:** LOW - Cosmetic only, does not affect functionality
- **Priority:** Low - Can be fixed in future maintenance release

**6. Print Functionality Issues**
- **Status:** 🟡 Needs Refinement
- **Component:** POS Booking Detail (`pos/apps/electron/src/renderer/pages/BookingDetailPage.tsx`)
- **Issues:**
  - Print formatting needs improvement
  - Receipt layout inconsistent
  - Print preview not always accurate
- **Next Steps:**
  - [ ] Review CSS print styles
  - [ ] Test across different printers
  - [ ] Add print settings configuration

**6. Split Functionality Bug**
- **Status:** 🟡 Open
- **Component:** POS Booking Detail (Seat Management)
- **Symptom:** When deleting one split item, it doesn't merge back
- **Question:** Is this intended behavior or bug?
- **Next Steps:**
  - [ ] Clarify expected behavior with stakeholders
  - [ ] Document current split/merge logic
  - [ ] Implement merge-back if needed

**7. Booking Status Update Buttons Not Persisting**
- **Status:** 🟡 Open
- **Component:** POS Admin Dashboard (`pos/apps/electron/src/renderer/app/BookingContext.tsx`)
- **Symptom:** Reset/Complete/Cancel buttons only update UI, changes don't persist
- **Current Behavior:**
  - Buttons update React state (optimistic update)
  - Changes revert after page refresh
  - No database update or sync to backend
- **Root Cause:** `updateBookingStatus` only calls `setBookings()`, doesn't call IPC handler
- **Expected Behavior:**
  - Update local SQLite database
  - Mark booking as dirty for sync
  - Enqueue sync operation to backend
  - Persist across app restarts
- **Fix Required:** Make `updateBookingStatus` call `window.kgolf.updateBookingStatus()` like `updateRoomStatus` does
- **Impact:** Medium - booking status changes are lost, confusing for staff
- **Next Steps:**
  - [ ] Update `BookingContext.updateBookingStatus` to call IPC handler
  - [ ] Add optimistic update with rollback on error
  - [ ] Test status changes persist after refresh
  - [ ] Verify sync to backend works

**8. Menu Item Addition Not Updating SQLite**
- **Status:** 🟡 Open
- **Component:** POS Menu Management
- **Symptom:** Adding menu items doesn't persist to SQLite table
- **Impact:** Menu changes lost on app restart
- **Next Steps:**
  - [ ] Verify IPC handler for menu:create is called
  - [ ] Check SQLite write permissions
  - [ ] Add error logging for menu operations

### Priority: LOW

**8. Guest Checkout Data Collection**
- **Status:** 🟢 Enhancement
- **Component:** POS Booking Modal
- **Requirement:** Collect name and phone number for guest checkouts
- **Current State:** Guest bookings supported but minimal data collection
- **Next Steps:**
  - [ ] Add required fields validation for guest mode
  - [ ] Update guest booking flow with data collection form

---

## 📋 Project Specifications

### Business Requirements

**Overall Goal:** Simplify POS to focus only on essential operations (reference: NARU POS has many unused features)

**Core Operations:**
- **Centralized Booking Management:** All booking sources (Online/Phone/Walk-in) in one view
- **Room-Based Workflow:** Complete order-to-payment per room
  - View room status
  - Take orders per room/seat
  - Issue bills (per seat or combined)
  - Mark payment received (card/cash/tip)
  - Close out transactions
- **Monthly Sales Reporting:** Card sales / Cash sales / Tips

**Room Status Workflow (inspired by NARU POS):**
- 🟢 Green: Empty/Available
- 🟡 Yellow: Booked/Orders entered
- 🔴 Red: Bill issued (awaiting payment)
- 🟢 Green: Payment received & closed out

**Room Configuration:**
- Room 4: Supports both left-hand and right-hand players
- Rooms 1-3: Right-hand players only

**Booking Duration & Menu:**
- [x] Hours added as menu category (1-5 hours, $30-$150)
- [x] Auto-add booking hours to seat 1 on new bookings
- [x] Menu data migrated to SQLite for persistence

**Seat Management:**
- [x] Seats decoupled from player count
- [x] Max 10 seats with color coding
- [x] Validation prevents orphaning items when reducing seats

**Late Arrival Promotion:** Customers arriving 20+ minutes late get 1 hour free

**Score System:**
- Admin can manually enter player scores
- Track: Total hits, golf course name, final score
- Standard: 18 holes, 72 hits baseline (par)
- Scoring: Under 72 = negative score (e.g., -2)

**Authentication:** Phone number only (login/register for both online and POS)

**Billing:** 
- [x] Printing bill functionality (seat-specific)
- [ ] Payment tracking (card/cash/tip)
- [ ] Database schema for payment data

**Menu POS:**
- Will need checklist of what was served or not

**Booking Availability & Time Slots:**
- [x] **DECISION:** Unified time slot system (exact times for availability)
  - Walk-in bookings: Allow exact time selection (e.g., 1:12 PM)
  - Online booking availability: Based on actual end times (e.g., if walk-in ends 2:12 PM, next slot is 2:12 PM)
  - No rounding to standard intervals (:00, :30) - show real availability
- [ ] Cleaning/buffer time: Decide if gaps needed between bookings (e.g., 15 min cleaning time)
- [ ] Implementation: Backend availability endpoint should return exact available start times based on existing booking end times

### POS Dashboard Restructuring (Client Requirements)

**Current Layout:** Bookings / Timeline / Room / Menu / Tax
**New Layout:** Timeline / Room / Menu / Tax (remove Bookings section)

**Rationale:** Move booking functionality into Room section for unified workflow

**Timeline Section (Overview Only):**
- [x] Display one week of bookings for all rooms ✅ COMPLETED
- [x] Grid view: Days (columns) × Rooms (rows) ✅ COMPLETED
- [x] Different color per room for easy identification ✅ COMPLETED
- [x] Read-only, no interactions needed ✅ COMPLETED
- [ ] Real-time updates when bookings change

**Room Section (Primary Workspace - move Bookings functionality here):**
- [x] Display all rooms with current status color ✅ COMPLETED (Room Status Overview cards)
- [x] Click room to view/manage booking details ✅ COMPLETED (Manage/Book buttons)
- [x] Room Data Display with today's bookings ✅ COMPLETED
- [ ] Add orders per seat within room
- [ ] Issue bill (per seat or combined)
- [ ] Mark payment received (card/cash/tip)
- [ ] Close out transaction (returns room to available)
- [ ] Real-time status updates across all POS terminals

**Room Data Display:**
- [x] Booking time and duration ✅ COMPLETED
- [x] Customer name ✅ COMPLETED
- [x] Number of players/seats ✅ COMPLETED
- [x] Current status (empty/ordered/billed) ✅ COMPLETED
- [ ] Current orders by seat
- [ ] Bill status
- [ ] Payment status

**Implementation Priorities:**
- **Phase 1:** Dashboard restructure (remove Bookings, expand Room section) ✅ COMPLETED
  - [x] Changed tab structure from 5 to 4 tabs (Timeline/Room/Menu/Tax)
  - [x] Added Room Status Overview section with color-coded cards
  - [x] Implemented status legend (green=empty, yellow=ordered, red=billed)
  - [x] Enhanced Room Management tab with detailed room info
- **Phase 2:** Room workflow with status color coding ✅ PARTIALLY COMPLETED
  - [x] Color-coded room status borders and indicators
  - [x] Room status dropdown in Room Management tab
  - [ ] Backend integration for status persistence
- **Phase 3:** Payment tracking (card/cash/tip) 🟡 MEDIUM
- **Phase 4:** Monthly sales report ✅ COMPLETED
  - [x] Added Monthly Sales Report to Tax tab
  - [x] Month navigation controls
  - [x] Card/Cash/Tips breakdown display
  - [x] Daily breakdown for 31 days (scrollable)
  - [ ] Connect to real transaction data

**Database Changes Needed:**
- Add `roomStatus` enum: 'available' | 'ordered' | 'billed' | 'paid'
- Add `paymentMethod` field: 'card' | 'cash' | null
- Add `tipAmount` field: number
- Add `paidAt` timestamp
- Add `closedBy` user reference

### Open questions
- [x] ~~When the number of seats changes, does number of players also should changes?~~ → Decoupled: seats and players are independent
- [x] ~~How can we handle the "cached" data? for instance, menu added to the running booking etc in case of the restart the app.~~ → Menu now persists in SQLite, orders saved in localStorage

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

### 0.9.5 Sync Interval Optimization – ✅ Completed
[x] Analyzed sync architecture (queue-based with 4 independent timers)
[x] Evaluated timer consolidation (recommended keeping separate)
[x] Created optimization documentation with 3 configuration options
[x] Implemented Option A (Conservative) sync intervals:
  - Sync cycle: 15s → 5s (67% faster, real-time feel)
  - Bookings pull: 15s → 5s (3x faster updates)
  - Rooms pull: 5min → 30s (90% faster availability)
  - Menu pull: 5min → 2min (60% faster menu changes)
[x] Performance impact: 504 → 1,590 ops/hour (~145KB/hour bandwidth)
[x] Committed changes (commit 7a33eac) with detailed metrics
[x] Documentation: docs/pos_sync_interval_optimization.md

**Next Steps:**
- [x] Rebuild POS app to apply new intervals
- [x] Test with production API
- [ ] Monitor server performance impact
- [ ] Collect user feedback on responsiveness

### 0.10 POS Deployment & Distribution Pipeline – ✅ COMPLETE

**Phase 1: Local Build Setup** ✅ COMPLETE
[x] Install electron-builder (`npm install --save-dev electron-builder`)
[x] Configure electron-builder in package.json (appId, productName, targets)
[x] Add build scripts: pack, dist, dist:mac, dist:win, dist:linux
[x] Create app icons (512x512 PNG for macOS/Linux, 256x256 for Windows) - Skipped (using default)
[x] Test local build (`npm run build && npm run dist`)
[x] Verify executable in `release/` directory
[x] Fix database path to use app.getPath('userData') instead of process.cwd()
[x] Include .env file in packaged app for production API URL
[x] Fix .env loading to check process.resourcesPath for packaged apps
[x] Test installation and login with production API

**Phase 2: GitHub Release Automation** ✅ COMPLETE
[x] Created `.github/workflows/pos-release.yml` workflow
[x] Configured matrix build (macos-latest ARM64, windows-latest x64)
[x] Added steps: checkout, setup Node.js, install deps, build TS
[x] Fixed Electron native modules issue (better-sqlite3, keytar)
  [x] Created cross-platform rebuild script (scripts/rebuild-native.js)
  [x] Auto-detects architecture with os.arch()
  [x] Rebuilds with Electron headers (--target=35.7.5)
  [x] Works on macOS, Windows, Linux
[x] Upload artifacts (DMG, EXE installer)
[x] Added GitHub Release creation step (on tag `pos-v*`)
[x] Tested workflow with manual trigger (workflow_dispatch)
[x] **Verified:** macOS ARM64 artifact tested and working ✅
[x] **Verified:** Windows x64 build working in CI ✅

**Phase 3: Public Release Distribution** ✅ COMPLETE
[x] Created UI-triggered workflow with version input
[x] Added pre-release flag option
[x] Configured automatic release to public repository (k-golf-release)
[x] Set up GitHub Personal Access Token (PUBLIC_RELEASE_TOKEN)
[x] Created automated release notes with installation instructions
[x] Fixed platform-specific verification steps (bash vs PowerShell)
[x] Successfully published first release (v0.1.0) ✅
[x] **Public releases available at:** https://github.com/HanKyungSung/k-golf-release/releases
[x] Created comprehensive release documentation
[x] Added customizable release notes template (RELEASE_NOTES_TEMPLATE.md)

**Phase 4: Auto-Update System** ✅ COMPLETE
[x] Installed electron-updater dependency
[x] Implemented auto-update in main.ts:
  - Initial check after 10 seconds on app launch
  - Periodic checks every 12 hours
  - Auto-download updates in background
  - Auto-install on app quit (silent updates)
  - Event listeners for all update states
  - IPC handlers for manual check and install
[x] Updated workflow to generate update metadata:
  - Removed `--publish never` flag
  - Added GH_TOKEN for electron-builder
  - Generates latest-mac.yml and latest.yml
  - Generates .blockmap files for delta updates
[x] Created comprehensive documentation:
  - Auto-update guide with testing procedures
  - Updated release guide with auto-update section
  - Complete explanation of pipeline changes
  - Troubleshooting and best practices
[x] Added version display in POS app header (2025-11-22):
  - Version badge next to clock using VERSION.txt
  - Automatic version copying during build process
  - Text loader configuration for esbuild
  - Proper .gitignore for generated files

**Documentation:**
- Release Process: `/docs/pos_release_guide.md`
- Auto-Update Guide: `/docs/electron_auto_update_guide.md`
- Native Module Fix: `/docs/electron_native_module_fix.md`
- Version Tracking: `/pos/VERSION.txt`
- Release Notes Template: `/pos/RELEASE_NOTES_TEMPLATE.md`

**Native Module Fix (Critical):**
- **Problem:** better-sqlite3 v11 uses prebuild-install which downloads prebuilt binaries for system Node.js (MODULE_VERSION 131) instead of Electron's Node.js (MODULE_VERSION 133)
- **Solution:** Created `pos/apps/electron/scripts/rebuild-native.js` to rebuild native modules with correct Electron version
- **Implementation:** Uses node-gyp with --target=35.7.5 --arch=[auto-detected] --dist-url=https://electronjs.org/headers
- **Result:** Both local and CI builds now work correctly with proper native modules

**Resolved Issues:**
[x] **FIXED: Electron renderer not showing on macOS ARM64 CI builds** (2025-11-12)
  - **Root Cause:** NODE_MODULE_VERSION mismatch (131 vs 133)
  - **Solution:** Cross-platform rebuild script with automatic architecture detection

**Active Issues:** See [Active Issues & Bugs](#active-issues--bugs) section at top of document

**Phase 5: Code Signing** ⏭️ SKIPPED
**Reason:** Single-venue deployment (parents' business) - no public distribution needed
**Cost avoided:** $99/year (macOS) + $200-400/year (Windows)
**Workaround:** Manually add security exception on venue devices
~~[ ] macOS: Get Apple Developer certificate ($99/year)~~
~~[ ] macOS: Configure identity, hardenedRuntime, entitlements~~
~~[ ] macOS: Store certificate in GitHub Secrets (MACOS_CERTIFICATE)~~
~~[ ] Windows: Get code signing certificate (DigiCert/Sectigo)~~
~~[ ] Windows: Add signtool step to workflow~~
~~[ ] Windows: Store certificate in GitHub Secrets (WIN_CERT_PASSWORD)~~

**Phase 6: Distribution & Documentation**
[ ] Create installation guide (README or wiki)
[ ] Document first-time setup (API_BASE_URL, login)
[ ] Create download page or link to GitHub Releases
[ ] Add troubleshooting section (common errors)
[ ] Document update process (manual vs auto-update)

**Current Status:**
- Development builds working locally (`npm run dev`)
- Production packaging not configured (no electron-builder)
- No automated release pipeline
- Code signing: SKIPPED (single-venue deployment)
- Auto-update: SKIPPED (manual updates sufficient)

**Deployment Strategy (Single-Venue):**
- Tag releases: `git tag pos-v0.1.0 && git push --tags`
- GitHub Actions builds unsigned executables
- Download from GitHub Releases (private repo)
- Manual installation on venue devices
- Bypass OS security warnings on first launch:
  - **macOS**: System Settings → Privacy & Security → "Open Anyway"
  - **Windows**: "More info" → "Run anyway"
- Manual updates: Download and reinstall when needed

### 0.11 POS to Web Migration – ✅ PHASE 1 COMPLETE

**Status:** Phase 1 Complete - Backend API Refinement In Progress  
**Timeline:** Phase 1: 2 days | Phase 1.5: TBD | Phase 2: 1-2 days  
**Architecture:** Integrated into existing frontend with role-based dashboard

#### Phase 1: Web Frontend Migration ✅ COMPLETED (Nov 22-23, 2025)

**Architecture Decision:**
[x] Integrated POS into existing frontend (simpler than separate app)
[x] Role-based dashboard: `/dashboard` shows POS for ADMIN, customer view for USER
[x] Reused existing auth system (session cookies)
[x] Single codebase, single deployment

**Frontend Implementation:**
[x] Created `frontend/services/pos-api.ts` with all POS API endpoints
[x] Migrated DashboardPage UI to `frontend/src/pages/pos/dashboard.tsx`
[x] Updated `frontend/src/pages/dashboard.tsx` for role-based rendering
[x] Fixed logout crash (proper React hooks structure)
[x] Removed redundant `/pos/*` routes (consolidated under `/dashboard`)
[x] Updated login flow to always redirect to `/dashboard`

**UI Components Migrated:**
[x] Real-time room status display (live clock, updates every second)
[x] Room status cards (Empty/Occupied with color indicators)
[x] Three management tabs: Bookings, Rooms, Tax Settings
[x] Today's bookings list with Complete/Cancel actions
[x] Room management with status dropdown (Active/Maintenance/Closed)
[x] Tax rate configuration (editable, persisted)
[x] Dark theme UI matching Electron app style

**API Integration (Frontend Ready):**
[x] Booking operations (list, create, update status, cancel)
[x] Room operations (list, update status)
[x] Menu operations (list, create, update, delete)
[x] Tax settings (get, update global tax rate)
[x] Error handling and loading states
[x] Session-based authentication (reused existing system)

**Completed Without Changes:**
[x] Authentication via session cookies (already exists)
[x] Responsive design (Tailwind CSS, works on all devices)
[x] No local database needed (direct API calls only)
[x] No Electron-specific code (pure React web app)

#### Phase 1.5: Backend API Refinement ✅ COMPLETE

**Status:** Core backend endpoints implemented and tested

**Backend Endpoints - Existing:**
[x] `GET /api/bookings` - list bookings (pagination supported)
[x] `GET /api/bookings/rooms` - list rooms
[x] `GET /api/bookings/mine` - user's bookings
[x] `PATCH /api/bookings/:id/cancel` - cancel booking
[x] `POST /api/bookings` - create booking (user)
[x] `POST /api/bookings/admin/create` - admin create booking
[x] `PATCH /api/bookings/rooms/:id` - update room status
[x] `PATCH /api/bookings/:id/payment-status` - update payment status (admin)

**Backend Endpoints - Implemented in Phase 1.5:**
[x] `GET /api/bookings/:id` - get single booking details
[x] `PATCH /api/bookings/:id/status` - update booking status (Complete/Cancel)
[x] `GET /api/settings/global_tax_rate` - get tax rate (convenience endpoint)
[x] `PUT /api/settings/global_tax_rate` - update tax rate (convenience endpoint)

**Menu Endpoints - Deferred to Phase 1.6 (Optional):**
[ ] `GET /api/menu/items` - list menu items
[ ] `POST /api/menu/items` - create menu item
[ ] `PATCH /api/menu/items/:id` - update menu item
[ ] `DELETE /api/menu/items/:id` - delete menu item

**Completed Tasks:**
[x] Audit all booking endpoints for consistency
[x] Add missing CRUD operations for bookings
[x] Implement settings management endpoints (tax rate)
[x] Add proper error handling across all endpoints
[x] Test all endpoints with POS frontend
[x] API integration verified and working

**Frontend Integration Complete:**
[x] Timeline view with visual weekly schedule
[x] Booking status updates (Complete/Cancel working)
[x] Room status updates (dropdown working)
[x] Tax rate editor (read & write working)
[x] Data transformation (ISO timestamps → date/time/duration)

#### Phase 2: Deployment Pipeline (1-2 days)

**Docker Setup:**
[ ] Create Dockerfile for POS web app (similar to frontend)
[ ] Add pos-frontend service to docker-compose.yml
[ ] Configure build process
[ ] Set environment variables (API_BASE_URL)

**Nginx Configuration:**
[ ] Add POS route to Nginx config
  - Option A: Subdomain (pos.k-golf.inviteyou.ca)
  - Option B: Path (/pos/)
[ ] Update SSL certificates if using subdomain
[ ] Test routing configuration

**CI/CD Pipeline:**
[ ] Update GitHub Actions workflow
[ ] Add POS build step
[ ] Add POS deployment step
[ ] Test automated deployment

**Production Deployment:**
[ ] Deploy to production server
[ ] Test on tablets and phones
[ ] Verify API connectivity
[ ] Train staff on web interface

**Documentation:**
[ ] Update README with POS web app info
[ ] Document deployment process
[ ] Create user guide for staff
[ ] Document API endpoints used

#### Rollout Strategy

**Week 1: Development**
[ ] Complete Phase 1 (frontend migration)
[ ] Test locally with backend API
[ ] Fix integration issues

**Week 2: Deployment**
[ ] Complete Phase 2 (deployment pipeline)
[ ] Deploy to production
[ ] Test on actual devices (tablets/phones)
[ ] Monitor for issues

**Week 3+: Adoption**
[ ] Train staff on web POS
[ ] Collect feedback
[ ] Optional: Keep Electron app as backup for 2-4 weeks
[ ] Monitor usage and performance

---

### 0.12 Print Queue & Thermal Printer Integration – 🔮 FUTURE

**Status:** Deferred to Phase 2 (after web POS migration complete)  
**Timeline:** TBD (estimated 10-12 days)  
**Architecture:** Backend print queue + standalone bridge service

This feature will be implemented after the web POS is stable and in use. See `/POS_WEB_MIGRATION.md` for detailed architecture notes.

#### Future Tasks (Not Started)

**Backend Print Queue Infrastructure:**
[ ] Add PrintJob and PrintBridge models to Prisma schema
[ ] Create print queue service with job lifecycle management
[ ] Add REST API endpoints (POST /api/print/receipt, GET /api/print/jobs)
[ ] Implement WebSocket server for real-time job broadcasting
[ ] Test print queue with mock printer

**Print Bridge Service:**
[ ] Create standalone Node.js package
[ ] Implement WebSocket connection to backend
[ ] Add thermal printer support (node-thermal-printer)
[ ] Format receipts with ESC/POS commands
[ ] Package as Windows service / systemd service
[ ] Test with real thermal printer (Epson/Star)

**Web POS Integration:**
[ ] Add print service to web POS
[ ] Replace browser print with queue-based printing
[ ] Add print job status monitoring
[ ] Handle print errors gracefully

**Deployment:**
[ ] Install bridge service on venue computer
[ ] Configure printer connection (USB/Network)
[ ] Test end-to-end print flow
[ ] Monitor print success rate

---

### 0.11 Logging & Monitoring Enhancement

**Sync Logging Requirements:**
[ ] Add structured logging for all sync operations
[ ] Log sync cycle start/end with duration
[ ] Log queue size before/after each cycle
[ ] Log individual operation success/failure (booking:create, rooms:pull, etc.)
[ ] Add error categorization (network, auth, validation, server)
[ ] Log retry attempts with backoff timing
[ ] Add sync performance metrics (operations/sec, avg response time)

**UI Logging Display:**
[ ] Add "Sync Logs" tab or panel in POS admin dashboard
[ ] Display last 100 sync events with timestamps
[ ] Color-code by severity (info/warn/error)
[ ] Filter by operation type (push/pull, booking/room/menu)
[ ] Add export logs button (download as JSON/CSV)
[ ] Show connection status history (online/offline transitions)

**Backend Logging:**
[ ] Log POS API requests with device identifier
[ ] Track sync frequency per device
[ ] Monitor for abnormal sync patterns (spam detection)
[ ] Add metrics endpoint for sync health monitoring

**Development Logging:**
[x] Forward main process logs to renderer DevTools (completed 0.9.1)
[ ] Add log levels (DEBUG, INFO, WARN, ERROR)
[ ] Configure log rotation (max file size, max files)
[ ] Add log filtering in DevTools console

**Production Logging:**
[ ] electron-log file output configuration
[ ] Remote error reporting (Sentry/LogRocket)
[ ] Performance monitoring (response times, queue depths)
[ ] Alert system for critical errors (sync failures > 5 min)

**Monitoring Dashboard (Optional Future):**
[ ] Admin web dashboard showing all POS devices
[ ] Real-time sync status per device
[ ] Historical sync reliability graphs
[ ] Alert configuration (email/SMS on failures)

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
- need to have some api key mechanism to protect the api
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

### 1.0 POS API Key Security Improvement – ⚠️ CRITICAL

**Status:** Must be addressed before production deployment

**Current Issue:**
- POS authentication uses hardcoded static API key: `'pos-dev-key-change-in-production'`
- API key is visible in frontend code (anyone with app access can extract it)
- Same API key for all POS devices (no device-specific authentication)
- API key never expires (no rotation mechanism)

**Required Changes:**

[ ] **Backend:**
  - [ ] Add `POS_ADMIN_KEY` to backend/.env.example with security warning
  - [ ] Change default value in requireAuth.ts from hardcoded string to env-only
  - [ ] Set unique, strong `POS_ADMIN_KEY` in production .env
  - [ ] Document API key security in backend README
  - [ ] Restart backend server after env change

[ ] **Production Deployment:**
  - [ ] Generate cryptographically secure API key (e.g., `openssl rand -hex 32`)
  - [ ] Update production backend .env with new key
  - [ ] Test POS connectivity with new key
  - [ ] Document key rotation procedure

[ ] **Future Enhancements (Phase 2):**
  - [ ] Per-device API keys (track individual POS devices)
  - [ ] Key expiration and rotation mechanism
  - [ ] OAuth2 device flow for proper authentication
  - [ ] Store device keys in secure location (not in frontend code)
  - [ ] Audit log for API key usage

**Security Context:**
- Current method: Header `x-pos-admin-key` bypasses session authentication
- Risk: Anyone with app access can extract key and impersonate admin
- Web app uses HttpOnly session cookies (secure)
- POS uses static API key (insecure for production)

**Documentation:**
- Authentication architecture: `/docs/admin_manual_booking_feature.md`
- CSP configuration: `pos/apps/electron/src/renderer/index.html`
- Middleware: `backend/src/middleware/requireAuth.ts`

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

### Phase 1.8: Web POS End-to-End Testing (Production)

**Status:** 🔄 In Progress  
**Priority:** HIGH - All migration features complete, ready for comprehensive testing  
**Environment:** Production (k-golf.inviteyou.ca)

**Prerequisites:**
- [x] Phase 1 Frontend Migration Complete
- [x] Phase 1.6 Booking Detail Page Complete
- [x] Phase 1.7 Menu Management Complete
- [x] All features deployed to production
- [ ] Admin credentials verified
- [ ] Mobile devices available for testing

**Test Plan:**

1. **POS Dashboard Testing**
   - [ ] Visit k-golf.inviteyou.ca and login as admin
   - [ ] Verify POS dashboard loads with header (K-Golf POS, user email, logout)
   - [ ] Verify real-time clock updates every second
   - [ ] Verify room status cards display correctly (4 rooms)
   - [ ] Verify status legend (green=empty, yellow=occupied)
   - [ ] Test room card "Book" button opens booking modal (not customer page)
   - [ ] Test room card "Manage" button opens booking detail
   - [ ] Verify 5-second auto-refresh updates booking data
   - [ ] Check Timeline tab displays current week bookings
   - [ ] Verify timeline booking blocks are clickable

2. **Menu Management Testing**
   - [ ] Navigate to Menu tab, click "Open Menu Management"
   - [ ] Verify menu page loads with header and all UI sections
   - [ ] Test "Add Item" button opens form
   - [ ] Create new menu item with all fields (name, description, price, category, available)
   - [ ] Verify item appears in filtered list immediately
   - [ ] Test category filters (All, Food, Drinks, Appetizers, Desserts, Hours)
   - [ ] Test search functionality (by name and description)
   - [ ] Edit existing item and verify changes persist
   - [ ] Toggle availability status and verify badge updates
   - [ ] Delete item with confirmation dialog
   - [ ] Verify insights panel updates (total, available, unavailable, avg price)
   - [ ] Test "Back to Dashboard" button returns correctly
   - [ ] Refresh page and verify menu items persist

3. **Booking Detail Page Testing**
   - [ ] Click on existing booking from dashboard
   - [ ] Verify all sections load: customer info, booking info, payment status
   - [ ] Verify seat management section displays
   - [ ] Test add seats (1-10 max)
   - [ ] Test remove seats (cannot orphan items)
   - [ ] Add menu items to seats
   - [ ] Test move item between seats
   - [ ] Test split item across seats
   - [ ] Verify receipt calculations (subtotal, tax, total)
   - [ ] Test print seat bill button
   - [ ] Test print complete order button
   - [ ] Test "Back" button returns to dashboard
   - [ ] **Known Bug:** Actions panel (Complete/Cancel) buttons not showing - see Critical Bug #1

4. **Create Booking Flow Testing**
   - [ ] Click "Create Booking" button from dashboard header
   - [ ] Test Walk-in booking with existing customer (phone lookup)
   - [ ] Test Walk-in booking with new customer (auto-registration)
   - [ ] Test Walk-in booking as guest (no user account)
   - [ ] Test Phone booking with existing customer
   - [ ] Test Phone booking with new customer
   - [ ] Verify guest mode disabled for phone bookings
   - [ ] Test room selection dropdown
   - [ ] Test date/time picker
   - [ ] Test duration input (hours)
   - [ ] Test players count input
   - [ ] Verify booking appears in dashboard immediately
   - [ ] Verify booking appears in timeline view
   - [ ] Test modal close after successful creation

5. **Room Management Testing**
   - [ ] Navigate to "Room Management" tab
   - [ ] Verify all 4 rooms display with details
   - [ ] Test room status dropdown (Active/Maintenance/Closed)
   - [ ] Verify status change reflects in room status cards
   - [ ] Verify today's bookings list for each room
   - [ ] Click booking in list, verify navigation to detail page
   - [ ] Test room capacity and hourly rate display

6. **Tax Settings Testing**
   - [ ] Navigate to "Tax Settings" tab
   - [ ] Verify current global tax rate displays
   - [ ] Click "Edit" button
   - [ ] Change tax rate value (e.g., 8% → 10%)
   - [ ] Click "Save" and verify success
   - [ ] Create new booking and verify new tax rate applied
   - [ ] Check receipt calculations use new tax rate
   - [ ] Click "Cancel" and verify changes rollback

7. **Mobile/Tablet Responsive Testing**
   - [ ] Access k-golf.inviteyou.ca from tablet (iPad/Android tablet)
   - [ ] Test all dashboard features on tablet
   - [ ] Verify touch interactions work (tap, scroll, swipe)
   - [ ] Test menu management on tablet
   - [ ] Test booking creation flow on tablet
   - [ ] Access from phone (iPhone/Android phone)
   - [ ] Verify responsive layout adapts correctly
   - [ ] Test core POS features on phone
   - [ ] Verify header and navigation work on small screens

8. **Performance & Reliability Testing**
   - [ ] Monitor page load times (< 3 seconds)
   - [ ] Test with slow network connection
   - [ ] Verify error handling (network errors, validation errors)
   - [ ] Test concurrent access (multiple browsers/devices)
   - [ ] Monitor auto-refresh behavior (5-second polling)
   - [ ] Check browser console for errors
   - [ ] Verify no memory leaks (check DevTools Performance)

9. **Documentation & Bug Reporting**
   - [ ] Document test results in spreadsheet or markdown table
   - [ ] Take screenshots of any bugs found
   - [ ] Record steps to reproduce each bug
   - [ ] Categorize bugs by severity (Critical/High/Medium/Low)
   - [ ] Update POS_WEB_MIGRATION.md with Phase 1.8 completion status
   - [ ] Create GitHub issues for bugs if needed
   - [ ] Update TASKS.md with any new issues found

**Known Issues to Verify:**
- **Critical Bug #1:** Booking Detail Actions Panel Empty (see Active Issues section)
- Room card "Book" button navigation issue (FIXED in this commit)

**Success Criteria:**
- [ ] All core POS features functional on production
- [ ] No critical bugs blocking staff usage
- [ ] Mobile/tablet experience acceptable
- [ ] Performance meets requirements (< 3s load time)
- [ ] All test scenarios documented

**Estimated Time:** 4-6 hours (comprehensive testing)

**Next Steps After Testing:**
- Fix any critical bugs found
- Document minor issues for future sprints
- Update migration docs with final status
- Plan staff training session
- Consider Phase 3 (Print Queue) if needed

---

## ✅ Completed Tasks Archive

<details>
<summary>Frontend Build & Deployment (Phase 1.8) - 2025-11-08</summary>

**Production API URL Fix (2025-11-06):**
[x] Fixed frontend API calls to use relative URLs instead of localhost
[x] Updated backend Dockerfile to set `REACT_APP_API_BASE=` (empty string)
[x] Fixed webpack DefinePlugin to handle empty string correctly
[x] Changed from `|| 'http://localhost:8080'` to explicit undefined check
[x] Deployed fix (commit d81e5c3: "fix: properly handle empty string for REACT_APP_API_BASE")
[x] Verified login works in production at k-golf.inviteyou.ca

**Build Path Simplification (2025-11-08):**
[x] Refactored frontend build output path for consistency across dev/prod
[x] Frontend now builds to `frontend/dist` then copies to `backend/public`
[x] Backend dev mode (`tsx watch`) serves from `backend/public`
[x] Backend production build copies `backend/public` → `backend/dist/public`
[x] Simplified webpack config: always outputs to `dist` (no conditional paths)
[x] Simplified server.ts: always uses `../public` relative to `__dirname`
[x] Added `backend/public` to .gitignore (build artifact)
[x] Commit eadde42: "refactor: simplify frontend build output path"

**Architecture Consolidation:**
[x] Unified deployment: Single Node.js container serving both frontend and API
[x] TypeScript structure: `rootDir: "."` compiles to `dist/src/server.js`
[x] Path resolution works in all environments:
  - Dev: `src/../public` = `backend/public`
  - Prod: `dist/src/../public` = `backend/dist/public`
  - Docker: `/app/dist/src/../public` = `/app/dist/public`
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

**Last Updated:** 2025-11-08
**Version:** 1.2 (Updated: Frontend build path simplification)

````
