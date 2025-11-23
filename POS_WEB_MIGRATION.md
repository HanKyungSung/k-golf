# POS to Web Migration Plan

**Created:** November 22, 2025  
**Architecture:** Direct API Integration (Simplified)  
**Status:** ✅ Phase 1 Complete - Testing & Backend API Refinement Phase  
**Last Updated:** November 23, 2025

---

## Overview

Migrate POS from Electron desktop app to web-based application with direct backend API integration. Print queue functionality deferred to future phase.

### Goals
- ✅ Move POS to web (accessible from any device)
- ✅ Replace Electron with React web app
- ✅ Direct REST API calls (no local database)
- ✅ Enable multi-device access (tablets, laptops, phones)
- ✅ Reduce deployment complexity

### Benefits
- **No Installation:** Instant access via URL
- **Cross-Platform:** Works on tablets, phones, any OS
- **Auto-Updates:** No deployment/packaging needed
- **Reduced Maintenance:** No native module rebuilds
- **Better Security:** Browser sandbox vs Electron's node access
- **Simpler Architecture:** Direct API calls, no sync complexity

---

## Architecture

```
Web Frontend (React SPA)
    ↓ HTTPS (Direct API Calls)
Backend API (Existing)
    ↓
PostgreSQL Database
```

**Components:**
1. **Web Frontend:** React SPA (no local database, no sync queue)
2. **Backend API:** Existing Express + Prisma (no changes needed initially)
3. **Future:** Print queue + bridge service (deferred to Phase 2)

---

## Migration Phases

### ✅ Phase 1: Web Frontend Migration (COMPLETED)
- ✅ Integrated POS into existing web frontend (no separate app needed)
- ✅ Role-based dashboard: `/dashboard` shows POS for ADMIN, customer view for USER
- ✅ Created POS API service layer (`frontend/services/pos-api.ts`)
- ✅ Migrated DashboardPage UI components (room status, bookings, tax settings)
- ✅ Replaced IPC calls with direct REST API calls (fetch)
- ✅ Session-based authentication (reused existing auth system)
- ✅ Fixed React hooks violations (proper component structure)
- ✅ Removed separate `/pos/*` routes (consolidated under `/dashboard`)

### 🔄 Phase 1.5: Backend API Refinement (IN PROGRESS)
- 🔄 Audit existing backend API endpoints
- 🔄 Add missing POS-specific endpoints
- 🔄 Consolidate and clean up booking routes
- 🔄 Implement consistent error handling
- 🔄 Test all POS flows with real data

### Phase 2: Deployment Pipeline (1-2 days)
- ⬜ No separate Docker build needed (POS is part of main frontend)
- ⬜ Update webpack build to include POS components
- ⬜ Deploy to production server
- ⬜ Test on tablets/phones at venue

---

## Timeline

**Total Estimated Effort:** 4-7 days (1 week)

- Phase 1 (Frontend Migration): 3-5 days
- Phase 2 (Deployment): 1-2 days

---

## Technical Changes

### Data Access
- **Current:** SQLite local database with sync queue
- **Future:** Direct REST API calls to backend
- **Data Flow:** All reads/writes go directly to PostgreSQL via API

### Authentication
- **Current:** keytar (OS keychain) + API key
- **Future:** Session cookies (HttpOnly) - same as customer frontend

### UI Components
- **Reuse:** Most React components from `pos/apps/electron/src/renderer/`
- **Remove:** IPC bridge calls, preload API, Electron-specific imports
- **Update:** Replace `window.kgolf.*` with direct `fetch()` or `axios` calls

### Printing (Deferred)
- **Current:** Electron print dialog
- **Future:** Browser print API (`window.print()`) or backend print queue (Phase 2)
- **Phase 1:** Use browser's built-in print dialog for receipts

---

## Rollout Strategy

### Week 1: Development & Testing
- Build web POS React app
- Test locally with backend API
- Fix any integration issues

### Week 2: Deployment
- Deploy to production server
- Configure Nginx routing
- Test on tablets/phones
- Train staff on web interface

### Week 3+: Monitor & Iterate
- Monitor for issues
- Collect feedback
- Optional: Keep Electron app available as fallback for 2-4 weeks

---

## Success Criteria

- ✅ Web POS accessible from any device via browser
- ✅ All booking/order operations work via API
- ✅ Menu management functional
- ✅ Room status updates work
- ✅ Authentication via session cookies
- ✅ Responsive UI for tablets and phones
- ✅ Print functionality via browser print dialog

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Network dependency | Venue must have stable WiFi/wired connection |
| No offline mode | Accept this trade-off for simpler architecture |
| Browser print quality | Use print stylesheets, test with tablets |
| Multiple tabs/devices | Backend handles state, refresh to sync |
| Session expiry | Auto-refresh session, clear error messages |

---

## Dependencies

**NPM Libraries (Frontend):**
- `axios` or `fetch` (HTTP client)
- `react-router-dom` (routing)
- Reuse existing UI components from Electron renderer

**Backend:**
- No changes needed (use existing API endpoints)
- May need to add POS-specific endpoints later

**Infrastructure:**
- Existing Docker + Nginx setup
- Add POS web app to deployment pipeline

---

## Implementation Details

### Phase 1: Web Frontend Migration (Day 1-5)

#### Day 1-2: Project Setup & Component Migration
**Goal:** Set up new web POS app structure

```bash
# Option A: Create new directory in frontend/
mkdir -p frontend/pos
cd frontend/pos

# Option B: Separate package (if using monorepo structure)
mkdir -p pos-web
cd pos-web
```

**Tasks:**
1. Initialize React app (Vite recommended for speed)
2. Copy UI components from `pos/apps/electron/src/renderer/`
3. Set up routing structure:
   - `/` - Login
   - `/dashboard` - Main POS dashboard
   - `/booking/:id` - Booking detail
   - `/menu` - Menu management
   - `/rooms` - Room management
4. Remove all Electron imports and IPC calls
5. Create API service layer

**Key Files to Migrate:**
```
pos/apps/electron/src/renderer/
├── app/
│   ├── BookingContext.tsx ← Adapt (remove IPC, add API calls)
│   ├── AdminPage.tsx ← Reuse
│   └── primitives.tsx ← Reuse
├── pages/
│   ├── DashboardPage.tsx ← Adapt (remove window.kgolf.*)
│   ├── BookingDetailPage.tsx ← Adapt (remove IPC)
│   ├── MenuManagementPage.tsx ← Adapt
│   └── LoginPage.tsx ← May need to create new
└── components/
    └── *.tsx ← Reuse most components
```

#### Day 3-4: API Integration
**Goal:** Replace all IPC calls with REST API calls

**Create API Service (`src/services/api.ts`):**
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true, // Important for session cookies
});

export const bookingAPI = {
  list: (params) => api.get('/bookings', { params }),
  get: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post('/bookings/simple/create', data),
  update: (id, data) => api.patch(`/bookings/${id}`, data),
  cancel: (id) => api.patch(`/bookings/${id}/cancel`),
};

export const roomAPI = {
  list: () => api.get('/bookings/rooms'),
  update: (id, data) => api.patch(`/bookings/rooms/${id}`, data),
};

export const menuAPI = {
  list: () => api.get('/menu/items'),
  create: (data) => api.post('/menu/items', data),
  update: (id, data) => api.patch(`/menu/items/${id}`, data),
  delete: (id) => api.delete(`/menu/items/${id}`),
};

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};
```

**Update BookingContext.tsx:**
```typescript
// OLD (Electron):
const bookings = await window.kgolf.listBookings();

// NEW (Web):
const response = await bookingAPI.list({ page: 1, limit: 50 });
const bookings = response.data.bookings;
```

#### Day 4-5: Authentication & Testing
**Goal:** Implement session-based auth and test all flows

**Tasks:**
1. Create login page with email/password form
2. Use existing backend auth endpoints
3. Store session via HttpOnly cookies (backend handles this)
4. Add protected route wrapper
5. Test all CRUD operations
6. Test on different screen sizes (desktop, tablet, phone)

### Phase 2: Deployment Pipeline (Day 6-7)

#### Day 6: Docker Configuration

**Create `pos-web/Dockerfile`:**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Create `pos-web/nginx.conf`:**
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /health {
        return 200 '{"ok":true}';
        add_header Content-Type application/json;
    }
}
```

**Update `docker-compose.prod.yml`:**
```yaml
services:
  # ... existing services ...
  
  pos-frontend:
    build:
      context: ./pos-web
      dockerfile: Dockerfile
    ports:
      - "8082:80"  # Or different port
    networks:
      - kgolf_net
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

#### Day 7: CI/CD & Production Deployment

**Update `.github/workflows/docker-deploy.yml`:**
```yaml
# Add POS frontend build step
- name: Build POS Frontend Image
  run: |
    docker build \
      --tag ghcr.io/${{ github.repository_owner }}/kgolf-pos-frontend:${{ env.IMAGE_TAG }} \
      --tag ghcr.io/${{ github.repository_owner }}/kgolf-pos-frontend:latest \
      ./pos-web

- name: Push POS Frontend Image
  run: |
    docker push ghcr.io/${{ github.repository_owner }}/kgolf-pos-frontend:${{ env.IMAGE_TAG }}
    docker push ghcr.io/${{ github.repository_owner }}/kgolf-pos-frontend:latest
```

**Update Nginx on Server:**
```nginx
# Add POS subdomain or path
server {
    listen 443 ssl http2;
    server_name pos.k-golf.inviteyou.ca;  # Or use path /pos/
    
    # SSL config...
    
    location / {
        proxy_pass http://127.0.0.1:8082/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Deployment Steps:**
1. Push code to GitHub
2. Wait for CI to build images
3. SSH to server
4. Pull latest images: `docker compose -f docker-compose.prod.yml pull`
5. Restart services: `docker compose -f docker-compose.prod.yml up -d`
6. Test: Visit `https://pos.k-golf.inviteyou.ca` (or configured URL)

---

## Completed Work

### Architecture Decision
- **Decided:** Integrated POS into existing frontend instead of separate app
- **Rationale:** Simpler deployment, shared auth, single codebase
- **Result:** Role-based `/dashboard` route (ADMIN sees POS, USER sees bookings)

### Frontend Implementation (Phase 1) ✅
- ✅ Created `frontend/services/pos-api.ts` with all POS endpoints
- ✅ Migrated POS Dashboard to `frontend/src/pages/pos/dashboard.tsx`
- ✅ Updated `frontend/src/pages/dashboard.tsx` for role-based rendering
- ✅ Fixed logout crash (proper React hooks structure)
- ✅ Removed redundant `/pos/*` routes
- ✅ Updated login flow to always redirect to `/dashboard`

### Current Status
**✅ Phase 1 Complete - Frontend & Backend API:**
- ✅ ADMIN users see POS interface at `/dashboard`
- ✅ Regular users see customer dashboard at `/dashboard`
- ✅ Real-time room status display (updates every second)
- ✅ Four management tabs: **Timeline**, Rooms, Menu, Tax Settings (matching Electron POS)
- ✅ Timeline view with horizontal weekly schedule (rooms × time slots visualization)
- ✅ Dark theme UI matching Electron app style
- ✅ API integration working (bookings, rooms, tax rate)
- ✅ Backend endpoints implemented: GET /bookings/:id, PATCH /bookings/:id/status, GET/PUT /settings/global_tax_rate
- ✅ Data transformation (ISO timestamps → date/time/duration)
- ✅ Booking status updates (Complete/Cancel buttons work)
- ✅ Room status updates (dropdown working)
- ✅ Tax rate editor (read & write working)

**Not Yet Implemented:**
- ❌ Booking detail page (placeholder only - needs full migration from Electron)
- ❌ Menu management page (placeholder only - needs full migration from Electron)
- ❌ Print queue (deferred to future phase)

---

## Phase 1.5: Backend API Audit & Refinement

### Current State Analysis

#### Existing Booking Endpoints

✅ **Working:**
- `GET /api/bookings` - List all bookings with pagination
- `GET /api/bookings/rooms` - List all rooms
- `GET /api/bookings/mine` - User's own bookings
- `PATCH /api/bookings/:id/cancel` - Cancel a booking
- `POST /api/bookings` - Create booking (user-facing)
- `POST /api/bookings/admin/create` - Admin create booking (complex)
- `PATCH /api/bookings/rooms/:id` - Update room status
- `PATCH /api/bookings/:id/payment-status` - Update payment status (admin)
- `GET /api/bookings/availability` - Check availability

#### Missing Endpoints (POS Expects)

❌ **Not Implemented:**
- `GET /api/bookings/:id` - Get single booking details
- `PATCH /api/bookings/:id/status` - Update booking status (Complete/Cancel)
- `POST /api/bookings/simple/create` - Simplified booking creation
- `GET /api/settings/global_tax_rate` - Get tax rate
- `PUT /api/settings/global_tax_rate` - Update tax rate
- `GET /api/menu/items` - List menu items
- `POST /api/menu/items` - Create menu item
- `PATCH /api/menu/items/:id` - Update menu item
- `DELETE /api/menu/items/:id` - Delete menu item

### Proposed API Structure

#### 1. Bookings API (Consolidate)

**Current Issues:**
- Three booking creation endpoints: `POST /api/bookings`, `POST /api/bookings/admin/create`, `POST /api/bookings/simple/create` (doesn't exist)
- Missing single booking GET
- Missing status update endpoint

**Proposed Structure:**
```
GET    /api/bookings           # List (with filters: status, date, room)
GET    /api/bookings/:id       # Get single booking
POST   /api/bookings           # Create (keep existing, user-facing)
POST   /api/bookings/admin     # Admin create (rename from /admin/create)
PATCH  /api/bookings/:id       # Update booking details
PATCH  /api/bookings/:id/status          # Update status (Complete/Cancel)
PATCH  /api/bookings/:id/payment-status  # Update payment (existing)
DELETE /api/bookings/:id/cancel          # Keep for backward compatibility
```

**Implementation:**
- Add `GET /api/bookings/:id` - Return full booking details
- Add `PATCH /api/bookings/:id/status` - Accept `{ status: 'confirmed' | 'completed' | 'cancelled' }`
- Rename `POST /api/bookings/admin/create` → `POST /api/bookings/admin` (cleaner)
- Consider deprecating `/simple/create` (just use `/admin` with simpler payload)

#### 2. Rooms API (Existing, No Changes Needed)

```
GET    /api/bookings/rooms       # List all rooms
PATCH  /api/bookings/rooms/:id   # Update room status
```

**Status:** ✅ Working as-is

#### 3. Settings API (New)

**Purpose:** Manage global settings like tax rate

**Proposed Structure:**
```
GET    /api/settings                    # List all settings (future-proof)
GET    /api/settings/:key               # Get specific setting
PUT    /api/settings/:key               # Update setting
GET    /api/settings/global_tax_rate    # Convenience endpoint
PUT    /api/settings/global_tax_rate    # Convenience endpoint
```

**Implementation:**
- Reuse existing `Setting` table (already exists from Phase 0.6f)
- Add admin-only middleware
- Return `{ key: string, value: string }` format
- Tax rate stored as string, parse to number on client

#### 4. Menu API (New)

**Purpose:** Manage menu items (food, drinks, hours)

**Proposed Structure:**
```
GET    /api/menu/items           # List all menu items
GET    /api/menu/items/:id       # Get single item
POST   /api/menu/items           # Create item (admin)
PATCH  /api/menu/items/:id       # Update item (admin)
DELETE /api/menu/items/:id       # Delete item (admin)
```

**Database Schema:**
```prisma
model MenuItem {
  id          String   @id @default(cuid())
  name        String
  category    String   // HOURS, FOOD, DRINKS, APPETIZERS, DESSERTS
  price       Decimal  @db.Decimal(10, 2)
  available   Boolean  @default(true)
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Implementation:**
- Already exists in backend schema (from Phase 0.9.3)
- Add REST endpoints (currently only sync endpoint exists)
- Add validation (price > 0, category enum)
- Add filtering by category and availability

### Implementation Plan

#### Step 1: Bookings API Enhancement (Priority: HIGH)
1. Add `GET /api/bookings/:id` endpoint
2. Add `PATCH /api/bookings/:id/status` endpoint
3. Update `/api/bookings` to accept filters (status, date range, roomId)
4. Test with POS frontend

#### Step 2: Settings API Implementation (Priority: HIGH)
1. Create `/api/settings` routes file
2. Implement GET/PUT for generic settings
3. Add convenience endpoints for `global_tax_rate`
4. Add admin middleware
5. Test with POS tax settings tab

#### Step 3: Menu API Implementation (Priority: MEDIUM)
1. Create `/api/menu` routes file
2. Implement full CRUD operations
3. Add category filtering
4. Add validation and error handling
5. Test with POS menu management (future feature)

#### Step 4: Testing & Documentation (Priority: MEDIUM)
1. Write integration tests for new endpoints
2. Update API documentation
3. Test all POS flows end-to-end
4. Verify data consistency

### API Response Format

#### Success Response
```json
{
  "booking": { /* booking object */ },
  "message": "Booking updated successfully"
}
```

#### Error Response
```json
{
  "error": "Booking not found",
  "statusCode": 404
}
```

#### Validation Error
```json
{
  "error": {
    "formErrors": [],
    "fieldErrors": {
      "status": ["Invalid status value"]
    }
  },
  "statusCode": 400
}
```

### Testing Checklist

#### Bookings
- [x] GET /api/bookings/:id returns full booking details
- [x] PATCH /api/bookings/:id/status updates status correctly
- [x] Status transitions: confirmed → completed ✅
- [x] Status transitions: confirmed → cancelled ✅
- [x] Cannot cancel completed bookings
- [x] Cannot complete cancelled bookings
- [x] Proper error handling (404, 400, 403)
- [x] API integration works with frontend
- [x] Data transformation works (ISO to date/time)
- [x] Timeline view displays bookings correctly

#### Settings
- [x] GET /api/settings/global_tax_rate returns current rate
- [x] PUT /api/settings/global_tax_rate updates rate
- [x] Validation: rate between 0-100
- [x] Admin-only access enforced
- [x] Settings persist across restarts
- [x] Frontend tax editor working

#### Menu (Future)
- [ ] CRUD operations work correctly
- [ ] Category filtering works
- [ ] Price validation (> 0)
- [ ] Availability toggle works
- [ ] Admin-only access enforced

---

## Phase 1.6: Remaining Page Migration Status

### 🔴 Booking Detail Page (INCOMPLETE)

**Current State:**
- ❌ `frontend/src/pages/pos/booking-detail.tsx` is a **placeholder** (40 lines)
- ✅ Electron reference exists: `pos/apps/electron/src/renderer/pages/BookingDetailPage.tsx` (1000+ lines)

**Missing Features:**
- ❌ Full booking information display (customer, room, time, status)
- ❌ Order management with seat-based billing (split bills across seats)
- ❌ Menu item selection and ordering per seat
- ❌ Item quantity controls (add/remove quantities)
- ❌ Seat management (add/remove seats, up to 10 seats)
- ❌ Move items between seats
- ❌ Cost splitting (split single item cost across multiple seats)
- ❌ Seat-specific receipt printing
- ❌ Grand total receipt printing
- ❌ Payment status tracking (UNPAID/BILLED/PAID)
- ❌ Tax rate per-booking override (custom tax rate for specific booking)
- ❌ Booking status actions (Complete/Cancel buttons)
- ❌ localStorage persistence (orders and seats persist across refreshes)
- ❌ Real-time clock display
- ❌ Print stylesheets for receipts

**Implementation Plan:**
1. Migrate full BookingDetailPage from Electron (1000+ lines)
2. Adapt UI components (remove Electron-specific parts)
3. Replace `window.kgolf.*` IPC calls with REST API calls
4. Implement localStorage persistence for orders/seats
5. Add print stylesheets for browser printing
6. Test order management flows (add items, move, split, print)

**Priority:** HIGH (Critical POS feature - staff need booking detail management)

**Estimated Effort:** 8-12 hours (6 hours migration + 3 hours testing + 2-3 hours bug fixes)

---

### 🟡 Menu Management Page (INCOMPLETE)

**Current State:**
- ❌ `frontend/src/pages/pos/menu-management.tsx` is a **placeholder** (40 lines)
- ✅ Electron reference exists: `pos/apps/electron/src/renderer/pages/MenuManagementPage.tsx` (500+ lines)

**Missing Features:**
- ❌ Menu items list with search/filter
- ❌ Category filtering (hours, food, drinks, appetizers, desserts)
- ❌ Create new menu item form
- ❌ Edit existing menu item
- ❌ Delete menu item (with confirmation)
- ❌ Toggle availability (enable/disable items)
- ❌ Price validation
- ❌ Stats dashboard (total items, available count, average price)
- ❌ Backend API endpoints (GET/POST/PATCH/DELETE `/api/menu/items`)

**Implementation Plan:**
1. Migrate MenuManagementPage from Electron (500+ lines)
2. Adapt UI components (filters, search, CRUD forms)
3. Implement backend menu API endpoints:
   - `GET /api/menu/items` - List with category filter
   - `POST /api/menu/items` - Create menu item
   - `PATCH /api/menu/items/:id` - Update menu item
   - `DELETE /api/menu/items/:id` - Delete menu item
4. Connect frontend to backend via `pos-api.ts`
5. Test all CRUD operations
6. Test filtering and search

**Priority:** MEDIUM (Can use admin panel temporarily, but POS staff need quick access)

**Estimated Effort:** 6-8 hours (3 hours frontend + 2 hours backend + 2-3 hours testing)

---

### Impact Assessment

**User Reported Issue:**
> "I can't see some pages correctly. I don't think it is fully migrated"

**Root Cause:**
- Dashboard tab is complete ✅
- Booking detail page is placeholder ❌
- Menu management page is placeholder ❌

**Impact:**
- Staff cannot manage individual booking details from POS
- Staff cannot add/edit menu items from POS (must use admin panel)
- Clicking on bookings in timeline leads to empty placeholder page

**Recommended Action:**
1. **Immediate:** Migrate booking-detail page (HIGH priority - core POS feature)
2. **Next:** Migrate menu-management page (MEDIUM priority - has workaround via admin panel)
3. **Then:** Test complete POS workflow end-to-end

---

## Phase 1.6: Booking Detail Page Migration - Detailed Tasks

### Overview
Migrate full booking detail page from Electron POS (~1000 lines) with complete order management system.

### Task Breakdown (Estimated 8-12 hours total)

#### ✅ Task 1.6.1: Fix Navigation & Routing (30 mins) - COMPLETED
**Status:** ✅ Done  
**Changes Made:**
- Added `/pos/*` route to main App.tsx
- Fixed navigation paths in dashboard (changed `/pos/booking-detail/${id}` → `/pos/booking/${id}`)
- Updated menu navigation paths
- Imported POSRoutes into App.tsx

**Files Modified:**
- `frontend/src/App.tsx` - Added POS routes
- `frontend/src/pages/pos/dashboard.tsx` - Fixed navigation paths

---

#### 🔄 Task 1.6.2: Basic Component Structure (1-2 hours) - IN PROGRESS
**Status:** 🔄 In Progress (50% complete)  
**What's Done:**
- ✅ Created basic imports (UI components, API functions, icons)
- ✅ Set up state management (booking, rooms, menu, orders, seats)
- ✅ Added dialog state management (add item, move, split, tax edit, print)
- ✅ Implemented data loading (booking, rooms, menu, tax rate)
- ✅ Added localStorage persistence hooks
- ✅ Basic loading/error states
- ✅ Header with status badges and back button

**What's Remaining:**
- ❌ Order management functions (add, remove, update quantity)
- ❌ Seat management functions (add/remove seats, move items, split costs)
- ❌ Full UI rendering (customer info, booking info, order list, menu)
- ❌ All dialog implementations

**Files:**
- `frontend/src/pages/pos/booking-detail.tsx` (currently 230 lines, need ~1000 lines)

---

#### ⬜ Task 1.6.3: Order Management Functions (2-3 hours)
**Status:** ⬜ Not Started  
**Scope:**
1. **Add Item to Seat**
   - Select menu item from menu tabs
   - Choose which seat to add to
   - Create OrderItem with unique ID

2. **Update Quantity**
   - Increment/decrement quantity
   - Remove item if quantity reaches 0
   - Update totals automatically

3. **Remove Order Item**
   - Delete confirmation (optional)
   - Remove from orderItems array
   - Update localStorage

4. **Move Item Between Seats**
   - Select item to move
   - Choose target seat
   - Update seat assignment
   - Recalculate seat totals

5. **Split Cost Across Seats**
   - Select item to split
   - Choose multiple seats (checkboxes)
   - Calculate split price per seat
   - Create duplicate items with splitPrice

**Functions to Implement:**
```typescript
- addItemToSeat(menuItem: MenuItem, seat: number)
- updateItemQuantity(orderItemId: string, change: number)
- removeOrderItem(orderItemId: string)
- moveItemToSeat(orderItemId: string, newSeat: number)
- splitItemAcrossSeats(orderItem: OrderItem, seats: number[])
```

---

#### ⬜ Task 1.6.4: Seat Management (1-2 hours)
**Status:** ⬜ Not Started  
**Scope:**
1. **Add/Remove Seats**
   - Button controls to adjust number of seats (1-10)
   - Validation: can't remove seat if items assigned to it
   - Show seat count indicator

2. **Seat Validation**
   - Check if seat has items before removal
   - Show warning message if trying to remove occupied seat

3. **Auto-initialize Seats**
   - Load saved seat count from localStorage
   - Add booking hours to seat 1 automatically on first load
   - Prevent re-initialization on subsequent loads

**Functions to Implement:**
```typescript
- canReduceSeats(): boolean
- handleReduceSeats()
- handleAddSeat()
```

---

#### ⬜ Task 1.6.5: Calculation Functions (30 mins)
**Status:** ⬜ Not Started  
**Scope:**
- Calculate subtotal per seat
- Calculate tax per seat
- Calculate total per seat
- Calculate grand totals (all seats)
- Support custom tax rate per booking

**Functions to Implement:**
```typescript
- calculateSeatSubtotal(seat: number): number
- calculateSeatTax(seat: number): number
- calculateSeatTotal(seat: number): number
- calculateSubtotal(): number
- calculateTax(): number
- calculateTotal(): number
```

---

#### ⬜ Task 1.6.6: UI Rendering - Customer & Booking Info (1 hour)
**Status:** ⬜ Not Started  
**Scope:**
1. **Customer Information Card**
   - Avatar with customer initial
   - Name, email, phone
   - Located in right sidebar

2. **Booking Information Card**
   - Room (with color indicator)
   - Date, start time, duration
   - Number of players
   - Booking source
   - Notes (if any)
   - Located in right sidebar

3. **Payment Information Card** (if applicable)
   - Payment status badge
   - Payment method
   - Billed/Paid timestamps
   - Tip amount
   - Located in right sidebar

**Components:**
- InfoBlock helper component for consistent formatting

---

#### ⬜ Task 1.6.7: UI Rendering - Order List (2 hours)
**Status:** ⬜ Not Started  
**Scope:**
1. **Seat Management Card**
   - Show current number of seats
   - Plus/minus buttons to adjust
   - Seat count display

2. **Current Order Card**
   - Print All button in header
   - Organized by seats with color indicators
   - Each seat section shows:
     - Seat header with color dot and print button
     - List of order items with:
       - Item name, description, price
       - Quantity controls (+/-)
       - Action buttons (Move, Split, Delete)
     - Seat subtotal, tax, and total

3. **Grand Total Section**
   - Overall subtotal
   - Tax (with global/custom indicator and edit button)
   - Grand total
   - Displayed at bottom of order list

**Styling:**
- Dark theme matching dashboard
- Amber accents for prices and highlights
- Color-coded seats (10 different colors)
- Clear visual hierarchy

---

#### ⬜ Task 1.6.8: UI Rendering - Menu Tabs (1 hour)
**Status:** ⬜ Not Started  
**Scope:**
1. **Menu Card in Sidebar**
   - Tab navigation (Hours, Food, Drinks, Appetizers, Desserts)
   - Click to view category items

2. **Menu Item Display**
   - Item name (bold)
   - Description (small text)
   - Price (amber color)
   - Click item to open "Add to Seat" dialog

3. **Category Filtering**
   - Filter menu items by category
   - Only show available items

**Functions:**
```typescript
- getItemsByCategory(category: string): MenuItem[]
- handleMenuItemClick(menuItem: MenuItem)
```

---

#### ⬜ Task 1.6.9: Dialog Implementations (2-3 hours)
**Status:** ⬜ Not Started  
**Scope:**

**1. Add Item Dialog**
- Show selected menu item name
- Grid of seat buttons (color-coded)
- Click seat to add item
- Cancel button

**2. Move Item Dialog**
- Show item name being moved
- Grid of seat buttons (excluding current seat)
- Click seat to move item
- Cancel button

**3. Split Cost Dialog**
- Show item name and original price
- Checkbox list of all seats
- Show calculated price per seat (live update)
- Split preview section
- Confirm/Cancel buttons

**4. Tax Rate Edit Dialog**
- Show current rate (global or custom)
- Input field for new rate (0-100)
- Quick select buttons (0%, 5%, 8%, 10%, 13%, 15%, 20%, 25%)
- Reset to Global button (if custom rate set)
- Save/Cancel buttons

**5. Booking Status Actions**
- Complete/Cancel buttons (conditional based on status)
- Confirmation dialogs
- Update booking status via API
- Refresh data after status change

---

#### ⬜ Task 1.6.10: Print Functionality (1-2 hours)
**Status:** ⬜ Not Started  
**Scope:**
1. **Print Stylesheets**
   - Hide UI elements (buttons, navigation, dialogs)
   - Show print-only header/footer
   - Optimize layout for receipt printing

2. **Print Individual Seat Receipt**
   - Show only selected seat items
   - Include customer info and booking details
   - Seat totals (subtotal, tax, total)
   - Print timestamp

3. **Print All Seats (Grand Receipt)**
   - Show all seats and items
   - Each seat section with page break
   - Grand total at end
   - Print timestamp

4. **Print Handlers**
   - `handlePrintSeat(seat: number)` - Set printing seat, trigger print
   - `handlePrintReceipt()` - Print all seats
   - Clean up printing state after print dialog

**CSS Features:**
- `@media print` styles
- Hide `.no-print` classes
- Show `.print-only` classes
- Page break control
- Color preservation (`print-color-adjust: exact`)

---

#### ⬜ Task 1.6.11: Testing & Bug Fixes (1-2 hours)
**Status:** ⬜ Not Started  
**Testing Checklist:**
- [ ] Navigation to booking detail page works
- [ ] Booking data loads correctly
- [ ] Menu items load correctly
- [ ] Add item to seat works
- [ ] Quantity increment/decrement works
- [ ] Remove item works
- [ ] Add/remove seats works
- [ ] Seat validation prevents removing occupied seats
- [ ] Move item between seats works
- [ ] Split cost across seats works
- [ ] Split price calculation correct
- [ ] Seat totals calculate correctly
- [ ] Grand total calculates correctly
- [ ] Tax rate edit works (custom and reset to global)
- [ ] Print individual seat works
- [ ] Print all seats works
- [ ] Print stylesheets display correctly
- [ ] Complete/Cancel booking status works
- [ ] localStorage persistence works (orders and seats)
- [ ] Page refresh preserves orders and seats
- [ ] Responsive layout works on tablets
- [ ] Error handling for API failures
- [ ] Loading states display properly

**Known Issues to Address:**
- Menu items need backend API endpoint (if not exists)
- Booking hours auto-add needs menu item with matching duration
- Print layout may need adjustment for thermal printers

---

### Summary - Task 1.6 Completion Checklist

**Infrastructure (1 hour):**
- [x] ✅ 1.6.1: Navigation & Routing
- [x] 🔄 1.6.2: Basic Component Structure (50% done)

**Core Functionality (5-7 hours):**
- [ ] ⬜ 1.6.3: Order Management Functions
- [ ] ⬜ 1.6.4: Seat Management
- [ ] ⬜ 1.6.5: Calculation Functions

**UI Implementation (4-5 hours):**
- [ ] ⬜ 1.6.6: Customer & Booking Info UI
- [ ] ⬜ 1.6.7: Order List UI
- [ ] ⬜ 1.6.8: Menu Tabs UI
- [ ] ⬜ 1.6.9: Dialog Implementations
- [ ] ⬜ 1.6.10: Print Functionality

**Quality Assurance (1-2 hours):**
- [ ] ⬜ 1.6.11: Testing & Bug Fixes

**Total Estimated Time:** 11-16 hours  
**Adjusted for Complexity:** 8-12 hours (with experienced developer)

---

### Next Phase After 1.6

**Phase 1.7: Menu Management Page Migration** (6-8 hours)
- Lower priority - has admin panel workaround
- Can be deferred if time constrained

---

## Next Steps - Priority Order

### 🔴 HIGH PRIORITY
1. ✅ Phase 1 Frontend Migration Complete
2. ✅ Phase 1.5 Backend API Refinement Complete
3. ✅ Timeline view implemented (matching Electron POS)
4. 🔄 **CURRENT:** Phase 1.6 - Booking Detail Page Migration (8-12 hours)
   - **CRITICAL:** Required for POS operations - order management, bill splitting, receipt printing
   - Staff cannot manage bookings without this page

### � MEDIUM PRIORITY
5. ⬜ Phase 1.7 - Menu Management Page Migration (6-8 hours)
   - **WORKAROUND AVAILABLE:** Can use admin panel for menu management
   - POS staff would prefer quick access from POS interface

### 🟢 LOW PRIORITY
6. ⬜ Phase 1.8: Complete end-to-end testing
7. ⬜ Phase 2: Production deployment and staff training
8. ⬜ (Future Phase 3) Print queue implementation if needed

---

**Document Owner:** Development Team  
**Last Updated:** November 23, 2025  
**Version:** 2.2 (Phase 1.5 - Backend API Audit)
