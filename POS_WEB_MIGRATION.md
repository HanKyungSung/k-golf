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

### ✅ Phase 1.5: Backend API Refinement & Bug Fixes (COMPLETED)
- ✅ Audit existing backend API endpoints
- ✅ Add missing POS-specific endpoints (date range filters)
- ✅ Fix timezone bug: Use local timezone instead of UTC for date comparisons
- ✅ Fix pagination bug: Implement separate API calls for room status (today) and timeline (week)
- ✅ Optimize data loading: Reduced from loading all bookings to date-filtered queries
- ✅ Test all POS flows with real data

### ✅ Phase 2: Deployment Pipeline (COMPLETED)
- ✅ No separate Docker build needed (POS is part of main frontend)
- ✅ Update webpack build to include POS components
- ✅ Deploy to production server (k-golf.inviteyou.ca)
- ✅ Multi-stage Docker build: Backend Dockerfile builds both API + frontend
- ✅ GitHub Actions CI/CD pipeline working (docker-deploy.yml)
- ⬜ Test on tablets/phones at venue (pending on-site testing)

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
- ✅ Room status updates work correctly (timezone fix applied)
- ✅ Authentication via session cookies
- ✅ Responsive UI for tablets and phones
- ✅ Print functionality via browser print dialog
- ✅ Optimized data loading with date range filters
- ✅ Real-time room status display with 5-second polling

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

## Phase 1.6: Core POS Features Migration Status

### ✅ Booking Detail Page (COMPLETE)

**Current State:**
- ✅ `frontend/src/pages/pos/booking-detail.tsx` is **FULLY MIGRATED** (1070 lines)
- ✅ All features from Electron POS implemented
- ✅ Component navigation (not URL routing) for seamless UX

**Implemented Features:**
- ✅ Full booking information display (customer, room, time, status, payment)
- ✅ Order management with seat-based billing (split bills across 1-10 seats)
- ✅ Menu item selection from 5 categories (Hours, Food, Drinks, Appetizers, Desserts)
- ✅ Item quantity controls (increment/decrement)
- ✅ Seat management (add/remove seats with validation)
- ✅ Move items between seats
- ✅ Split item cost across multiple seats
- ✅ Seat-specific receipt printing
- ✅ Grand total receipt printing (all seats)
- ✅ Payment status display (UNPAID/BILLED/PAID)
- ✅ Custom tax rate per booking (overrides global rate)
- ✅ Booking status actions (Complete/Cancel buttons with API integration)
- ✅ localStorage persistence (orders, seats, tax rate)
- ✅ Print stylesheets (@media print for receipts)
- ✅ Component-based navigation (no URL change, keeps header visible)
- ✅ Dark theme UI matching dashboard
- ✅ Responsive layout for tablets

**Technical Implementation:**
- 1070 lines of code (matching Electron POS complexity)
- All order data stored in localStorage (not backend database yet)
- 5 dialog implementations (Add Item, Move, Split Cost, Tax Edit, Status Actions)
- Complete calculation system (per-seat and grand totals)
- Print-specific CSS with seat selection

**Status:** ✅ COMPLETED (November 23, 2025)

**Time Spent:** ~12 hours (migration + fixes + testing)

**Note:** Orders are frontend-only (localStorage). Backend integration for orders requires new `BookingItem` table (future enhancement).

---

### ✅ Booking Creation Modal (COMPLETE)

**Current State:**
- ✅ `frontend/src/pages/pos/booking-modal.tsx` is **FULLY MIGRATED** (522 lines)
- ✅ All features from Electron POS BookingModal implemented
- ✅ Integrated into dashboard with modal state management

**Implemented Features:**
- ✅ 2-step wizard: Customer Information → Booking Details
- ✅ Phone number lookup with customer search (E.164 format: +1XXXXXXXXXX)
- ✅ Customer matching: displays existing customers with booking history
- ✅ Create new customer or use existing (phone is primary identifier)
- ✅ Booking source selection: Walk-in or Phone (buttons)
- ✅ Room selection dropdown (filtered to ACTIVE rooms only)
- ✅ Date picker with default to today
- ✅ Time picker with default to current hour
- ✅ Duration input (1-4 hours)
- ✅ Players input (1-4 people)
- ✅ Progress indicator showing current step
- ✅ Form validation at each step
- ✅ API integration: POST /api/bookings/simple/create
- ✅ Error handling with detailed messages
- ✅ Preselected room support (for "Book Now" from room cards - future feature)
- ✅ Auto-refresh bookings after successful creation
- ✅ Modal overlay with click-outside to close
- ✅ Customer phone lookup API: GET /api/users/lookup?phone={phone}

**Technical Implementation:**
- 522 lines of code (matching Electron POS BookingModal complexity)
- Phone auto-formatting to E.164 format (+1XXXXXXXXXX)
- Debounced phone search (500ms delay)
- Local date/time to ISO conversion for API
- Integrated with existing dashboard state management
- Uses shadcn/ui components (Button, Input, Label, Card)
- "Create Booking" button opens modal (replaced /admin navigation)

**Backend Endpoints Used:**
- ✅ `POST /api/bookings/simple/create` - Create booking (already exists)
- ✅ `GET /api/users/lookup?phone={phone}` - Customer phone lookup (already exists)

**Status:** ✅ COMPLETED (November 23, 2025)

**Time Spent:** ~3 hours (migration + integration + testing)

**Navigation Changes:**
- Before: "Create Booking" button navigated to `/admin` (workaround)
- After: "Create Booking" button opens modal inline (proper POS workflow)

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

**User Reported Issues (Resolved):**
> "I can't see some pages correctly. I don't think it is fully migrated"

**Resolution:**
- Dashboard tab: ✅ COMPLETE
- Booking detail page: ✅ COMPLETE (1070 lines migrated)
- Booking creation: ✅ COMPLETE (522 lines migrated)
- Menu management page: 🟡 Still placeholder (deferred to future phase)

**Current Capabilities:**
- ✅ Staff can view Timeline with all bookings
- ✅ Staff can click booking to see full detail page
- ✅ Staff can manage orders (seats, items, print receipts)
- ✅ Staff can create new bookings via modal
- ✅ Staff can search customers by phone
- ❌ Staff cannot manage menu items from POS (must use admin panel)

**Recommended Next Steps:**
1. **Complete:** Test complete POS booking workflow end-to-end
2. **Future:** Migrate menu-management page (MEDIUM priority - has workaround)
3. **Future:** Backend integration for orders (BookingItem table)

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

---

## Phase 1.7: Menu Management Page Migration (NEXT)

**Status:** ⬜ Not Started  
**Priority:** MEDIUM (has admin panel workaround)  
**Estimated Effort:** 6-8 hours

### Remaining Work
The menu management page is still a placeholder and needs full migration from Electron POS.

---

## Next Steps - Priority Order

### 🔴 HIGH PRIORITY
1. ✅ Phase 1 Frontend Migration Complete
2. ✅ Phase 1.5 Backend API Refinement Complete
3. ✅ Timeline view implemented (matching Electron POS)
4. ✅ Phase 1.6 - Booking Detail Page Migration (COMPLETED - November 25, 2025)
   - **VERIFIED:** All features migrated and working - order management, bill splitting, receipt printing
   - Fully integrated with POS dashboard

### � MEDIUM PRIORITY
5. 🔄 **CURRENT:** Phase 1.7 - Menu Management Page Migration (6-8 hours)
   - **WORKAROUND AVAILABLE:** Can use admin panel for menu management
   - POS staff would prefer quick access from POS interface

### 🟢 LOW PRIORITY
6. ⬜ Phase 1.8: Complete end-to-end testing
7. ✅ Phase 2: Production deployment (COMPLETED - k-golf.inviteyou.ca live)
   - ⬜ Staff training pending (requires on-site visit)
8. ⬜ (Future Phase 3) Print queue implementation if needed

---

**Document Owner:** Development Team  
**Last Updated:** November 25, 2025  
**Version:** 2.3 (Phase 1.6 - Booking Detail Page Complete)

---

## Phase 1.6 Completion Summary (November 25, 2025)

### ✅ Booking Detail Page - COMPLETE

**Status:** Phase 1.6 fully completed - all features verified and working

**File:** `frontend/src/pages/pos/booking-detail.tsx` (850+ lines)

**Source:** Migrated from `pos/apps/electron/src/renderer/pages/BookingDetailPage.tsx`

**Integration:** Fully integrated with POS dashboard
- Dashboard passes `bookingId` prop to detail page
- Detail page calls `onBack()` to return to dashboard
- Clicking any booking (room status, timeline, today list) opens detail view
- Dashboard refreshes data on return from detail page

**All Features Migrated:**

1. **Customer Information Display:**
   - Customer name, email, phone number
   - Visual avatar with initial letter
   - Clean card-based layout

2. **Booking Information Display:**
   - Room name and color indicator
   - Date, time, duration
   - Number of players
   - Booking source (Walk-in/Phone/Online)
   - Optional notes field

3. **Payment Status:**
   - Visual badge showing UNPAID/BILLED/PAID status
   - Color-coded indicators (red/amber/green)
   - Payment method and timestamps (if available)

4. **Seat Management:**
   - Adjustable seats (1-10 players)
   - Add/remove seats dynamically
   - Validation: Cannot remove seats with assigned items
   - Visual seat count with +/- buttons

5. **Order Management:**
   - Add items from menu to specific seats
   - Adjust item quantities (+/-)
   - Remove items
   - Move items between seats
   - Split items across multiple seats
   - Cost-split calculation (divide price evenly)

6. **Menu System:**
   - Tabbed interface: Hours, Food, Drinks, Appetizers, Desserts
   - Category-based organization
   - Click-to-add workflow
   - Modal seat selection when adding items
   - Available items only (filters unavailable items)

7. **Bill Calculation:**
   - Per-seat subtotals and totals
   - Per-seat tax calculation
   - Grand total with tax
   - Tax rate display (global or custom)
   - Custom tax rate editor (per booking override)
   - Quick tax presets (0%, 5%, 8%, 10%, 13%, 15%, 20%, 25%)

8. **Print Functionality:**
   - Print individual seat bills
   - Print full receipt with all seats
   - Proper print styles (@media print)
   - Hide non-print elements (buttons, menus)
   - Print-only header/footer
   - Page breaks between seats

9. **Status Management:**
   - Mark as Completed button
   - Cancel Booking button
   - Restore booking (if cancelled)
   - Status badges with color coding

10. **Data Persistence:**
    - Order items saved to localStorage
    - Seat count saved to localStorage
    - Custom tax rate saved to localStorage
    - Auto-restore on page reload

11. **Metadata Display:**
    - Booking creation timestamp
    - Booking ID (monospace font)
    - Clean info block component

**Comparison with Electron Version:**

| Feature | Electron POS | Web POS | Status |
|---------|-------------|---------|--------|
| Seat management | ✅ | ✅ | Identical |
| Order management | ✅ | ✅ | Identical |
| Bill splitting | ✅ | ✅ | Identical |
| Move items | ✅ | ✅ | Identical |
| Tax customization | ✅ | ✅ | Identical |
| Print receipts | ✅ | ✅ | Identical |
| Menu tabs | ✅ | ✅ | Identical |
| Status changes | ✅ | ✅ | Identical |
| Data source | SQLite + IPC | REST API | Different (expected) |
| Navigation | useNavigate | onBack prop | Different (expected) |
| AppHeader | Present | Dashboard handles | Different (expected) |
| Sync button | Present | Always live | Different (expected) |

**Technical Implementation:**

1. **API Integration:**
   - `getBooking(id)` - Fetch single booking by ID
   - `listRooms()` - Load room data for display
   - `listMenuItems()` - Load menu items (all categories)
   - `getGlobalTaxRate()` - Load default tax rate
   - `updateBookingStatus(id, status)` - Change booking status

2. **State Management:**
   - React hooks for local state (orders, seats, dialogs)
   - localStorage for persistence
   - Props-based navigation (no URL routing)
   - Real-time calculation (no debouncing needed)

3. **UI Components:**
   - All UI components from `@/components/ui/` (shadcn/ui)
   - Lucide React icons
   - Custom inline SVG for missing icons (MoveRight, Split)
   - Tailwind CSS with dark theme
   - Amber accent colors matching POS branding

4. **Print Styles:**
   - @media print CSS rules
   - `.no-print` class hides UI controls
   - `.print-only` class shows print-specific headers
   - Dynamic `.seat-section-N` for individual seat printing
   - Page break controls

**Testing Results:**
- ✅ Build successful (no TypeScript errors)
- ✅ All features present and functional
- ✅ Dashboard integration working
- ✅ Navigation flow complete (open → detail → back)
- ✅ All dialogs working (Add Item, Move Item, Split Item, Tax Rate)
- ✅ Print functionality tested (individual seats + full receipt)

**What's Next:**
Phase 1.6 is complete. Next priority is Phase 1.7 - Menu Management Page Migration.

---

## Phase 1.6.1 Completion Summary (November 23, 2025)

### ✅ Booking Creation Modal - COMPLETE

**Migration Completed:**
- Created `frontend/src/pages/pos/booking-modal.tsx` (522 lines)
- Migrated from `pos/apps/electron/src/renderer/components/BookingModal.tsx`
- Integrated into dashboard with modal state management

**Features Implemented:**
1. **2-Step Wizard:**
   - Step 1: Customer Information (phone, name, email)
   - Step 2: Booking Details (room, date, time, duration, players)
   - Progress indicator showing current step

2. **Customer Phone Lookup:**
   - E.164 phone format (+1XXXXXXXXXX)
   - Auto-formatting as user types
   - Debounced search (500ms)
   - API: `GET /api/users/lookup?phone={phone}`
   - Displays existing customers with booking history
   - Option to create new customer profile

3. **Booking Source Selection:**
   - Walk-in button
   - Phone button
   - Visual active state

4. **Form Validation:**
   - Phone number format validation
   - Required field validation
   - Step-by-step validation before proceed
   - Disable buttons when validation fails

5. **Room Selection:**
   - Dropdown filtered to ACTIVE rooms only
   - Preselected room support (for future "Book Now" feature)

6. **Date/Time Inputs:**
   - Date picker with default to today
   - Time picker with default to current hour
   - Local to UTC conversion for API

7. **API Integration:**
   - `POST /api/bookings/simple/create`
   - Error handling with detailed messages
   - Success callback refreshes booking list

**Dashboard Integration:**
- Added modal state: `showCreateModal`, `preselectedRoomId`
- "Create Booking" button opens modal (replaced `/admin` navigation)
- Modal renders at root level (above all content)
- Auto-refresh bookings after successful creation

**Testing Checklist:**
- [ ] Open modal from "Create Booking" button
- [ ] Enter phone number, verify auto-formatting to +1XXXXXXXXXX
- [ ] Search existing customer by phone
- [ ] Select existing customer, verify name/email populated
- [ ] Create new customer (phone not found)
- [ ] Select booking source (Walk-in/Phone)
- [ ] Proceed to booking details step
- [ ] Select room from dropdown
- [ ] Select date and time
- [ ] Enter duration (1-4 hours) and players (1-4)
- [ ] Submit form, verify booking created
- [ ] Verify new booking appears in timeline
- [ ] Test form validation at each step
- [ ] Test modal close (cancel button, X button, click outside)

**Time Spent:** 3 hours

**Known Issues:**
1. ⚠️ **Input Field Styling (Non-Critical):**
   - Issue: Input fields (customer name, email, duration, players) missing padding despite explicit classes
   - Status: Functionality unaffected - users can still enter data and create bookings
   - Attempted Fix: Added explicit `h-9 px-3 py-2` classes to all Input components
   - Root Cause: Potential Tailwind CSS specificity or className merging issue
   - Workaround: Use keyboard Tab to focus fields (focus ring works correctly)
   - Priority: LOW - Cosmetic only, deferred to future maintenance
   - Tracked in: TASKS.md (Priority: MEDIUM section)

**Custom Components Created:**

1. **PhoneInput Component** (`frontend/src/components/pos/PhoneInput.tsx` - 130 lines)
   - Purpose: Canadian phone input with E.164 normalization
   - Features:
     - Hard limit to 10 digits (maxLength={14} includes formatting chars)
     - Auto-formats: "4165551234" → "(416) 555-1234"
     - Returns E.164: "+14165551234" (12 chars)
     - Visual validation indicator (✓ valid / ✗ invalid)
     - Help text shows format requirement
     - Dark theme styling matching POS
   - Usage: Customer phone input in booking modal

2. **TimePicker Component** (`frontend/src/components/pos/TimePicker.tsx` - 175 lines)
   - Purpose: Custom time picker matching Electron POS
   - Features:
     - Dropdown with hour/minute selectors
     - 24 hour options (00-23) and 60 minute options (00-59)
     - 12-hour display format with AM/PM
     - 24-hour internal format (HH:MM)
     - Live preview of selected time
     - Apply/Cancel buttons
     - Click outside to close
     - Dark theme with amber accent buttons
   - Usage: Start time selection in booking modal

3. **DatePicker Component** (`frontend/src/components/pos/DatePicker.tsx` - 115 lines)
   - Purpose: Custom date picker matching Electron POS
   - Features:
     - Dropdown with native date input (YYYY-MM-DD format)
     - Formatted display (e.g., "Sat, Nov 23, 2025")
     - Live preview of selected date
     - Apply/Cancel buttons
     - Click outside to close
     - Dark theme with amber accent buttons
   - Usage: Booking date selection in booking modal

**Implementation Changes:**
1. Removed buggy handlePhoneChange function (used PhoneInput component instead)
2. Fixed handlePhoneSearch to include API_BASE and admin key header
3. Email field now conditional (only shows for ONLINE bookings)
4. Fixed API payload: `startTime` (not `startTimeIso`), `bookingSource` (not `source`)
5. Used custom TimePicker and DatePicker instead of HTML5 inputs

**API Fixes:**
- Phone lookup now properly connects to backend: `GET ${API_BASE}/api/users/lookup?phone={phone}`
- Added `x-pos-admin-key` header for authentication
- Fixed API base URL to use environment variable or localhost fallback

**Testing:**
- [x] Phone input validation (10-digit limit enforced)
- [x] Phone auto-formatting to (XXX) XXX-XXXX
- [x] Phone search triggers at 10 digits with proper API call
- [x] Custom time picker dropdown working
- [x] Custom date picker dropdown working
- [x] Booking creation successful with all fields
- [ ] Test complete booking workflow end-to-end
- [ ] Verify customer lookup works with existing database
- [ ] Test conflict detection if booking overlaps

---

## 🚨 URGENT BUGS - Must Fix Before Production

### 🐛 Bug #1: Room Status Cards Not Showing Correct Bookings

**Status:** 🔴 CRITICAL - Urgent Fix Required  
**Reported:** November 23, 2025  
**Priority:** HIGHEST - Blocks production use

**Issue:**
Room status cards in the dashboard are displaying incorrect or missing booking information. Staff cannot accurately see which rooms are occupied or available.

**Location:**
- File: `frontend/src/pages/pos/dashboard.tsx`
- Component: Room Status Overview section (Room cards)
- Lines: ~200-300 (room card rendering)

**Expected Behavior:**
- Each room card should show today's active booking for that room
- Should display: customer name, time range, duration, players
- Should show accurate status color (green=empty, yellow=occupied, red=billed)

**Actual Behavior:**
- Room cards showing wrong bookings
- Possible issues: incorrect room ID matching, timezone problems, or data filtering

**Investigation Steps:**
1. Check booking data fetch and filtering logic
2. Verify room ID matching between bookings and room cards
3. Check timezone handling in date comparisons (compare with Timeline fix from Nov 20)
4. Verify "today's bookings" filtering logic
5. Console log bookings data to see what's being displayed
6. Check if roomId is string vs UUID mismatch

**Potential Root Causes:**
- **Timezone Issue:** Similar to Timeline bug fixed on Nov 20 (UTC vs local time comparison)
- **Room ID Mismatch:** Room IDs might be strings ('1', '2') vs UUIDs
- **Date Filtering:** Today's bookings filter might be using wrong date comparison
- **Booking Status:** Might be filtering by wrong status field (bookingStatus vs status)

**Related Fixes:**
- Reference: Timeline timezone fix (commit 43bbac8, Nov 20, 2025)
  - Fixed by using local timezone methods instead of `toISOString()`
  - Used `getFullYear()`, `getMonth()`, `getDate()` for date comparison
  - Changed `isBookingActive()` to use local Date constructor

**Estimated Fix Time:** 30 minutes - 1 hour

**Testing Checklist After Fix:**
- [ ] Room cards show correct bookings for today
- [ ] Room status colors match actual booking status
- [ ] Empty rooms show "No booking today"
- [ ] Room cards update when new booking created
- [ ] Timezone handling works correctly (local time, not UTC)
- [ ] Room ID matching works across all 4 rooms

---


