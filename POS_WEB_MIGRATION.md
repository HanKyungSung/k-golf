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
**What Works:**
- ✅ ADMIN users see POS interface at `/dashboard`
- ✅ Regular users see customer dashboard at `/dashboard`
- ✅ Real-time room status display (updates every second)
- ✅ Three management tabs: Bookings, Rooms, Tax Settings
- ✅ Dark theme UI matching Electron app style

**What Needs Backend Support:**
- ❌ Bookings list (API call fails - endpoint mismatch)
- ❌ Room status updates (endpoint exists but needs testing)
- ❌ Booking status updates (Complete/Cancel actions)
- ❌ Tax rate settings (no backend endpoints yet)

**Not Yet Implemented (Frontend):**
- ❌ Menu management tab/page (placeholder exists at `/pos/menu-management`)
- ❌ Menu backend endpoints (no API routes exist yet)

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
- [ ] GET /api/bookings/:id returns full booking details
- [ ] PATCH /api/bookings/:id/status updates status correctly
- [ ] Status transitions: confirmed → completed ✅
- [ ] Status transitions: confirmed → cancelled ✅
- [ ] Cannot cancel past bookings
- [ ] Cannot complete cancelled bookings
- [ ] Proper error handling (404, 400, 403)

#### Settings
- [ ] GET /api/settings/global_tax_rate returns current rate
- [ ] PUT /api/settings/global_tax_rate updates rate
- [ ] Validation: rate between 0-100
- [ ] Admin-only access enforced
- [ ] Settings persist across restarts

#### Menu (Future)
- [ ] CRUD operations work correctly
- [ ] Category filtering works
- [ ] Price validation (> 0)
- [ ] Availability toggle works
- [ ] Admin-only access enforced

---

## Menu Management Status

**Current State:**
- ❌ Menu management is **not yet implemented** in the POS dashboard
- ✅ Placeholder page exists at `frontend/src/pages/pos/menu-management.tsx`
- ✅ API service layer has menu endpoints defined in `pos-api.ts`
- ❌ No menu tab in the dashboard (only Bookings, Rooms, Tax Settings)
- ❌ Backend menu endpoints don't exist yet

**Implementation Plan (Future Phase):**
1. Add "Menu" tab to POS dashboard alongside Bookings, Rooms, Tax
2. Migrate menu management UI from Electron POS (`pos/apps/electron/src/renderer/pages/MenuManagementPage.tsx`)
3. Implement backend menu API endpoints:
   - `GET /api/menu/items` - List all menu items
   - `POST /api/menu/items` - Create menu item
   - `PATCH /api/menu/items/:id` - Update menu item
   - `DELETE /api/menu/items/:id` - Delete menu item
4. Connect frontend to backend via `pos-api.ts` service layer
5. Test CRUD operations (create, read, update, delete menu items)

**Priority:** MEDIUM (Not critical for initial launch - can use admin panel for now)

**Estimated Effort:** 4-6 hours (2 hours frontend tab + 2 hours backend + 1-2 hours testing)

---

## Next Steps

1. ✅ Phase 1 Frontend Migration Complete (except menu management)
2. 🔄 **IN PROGRESS:** Phase 1.5 - Backend API Refinement
3. ⬜ Implement missing backend endpoints (Bookings, Settings)
4. ⬜ Test all POS flows end-to-end with real data
5. ⬜ Phase 1.6: Add menu management tab (optional for initial launch)
6. ⬜ Phase 2: Deploy to production and test with staff
7. ⬜ (Future Phase 3) Plan print queue implementation if needed

---

**Document Owner:** Development Team  
**Last Updated:** November 23, 2025  
**Version:** 2.2 (Phase 1.5 - Backend API Audit)
