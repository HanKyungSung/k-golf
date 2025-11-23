# POS to Web Migration Plan

**Created:** November 22, 2025  
**Architecture:** Direct API Integration (Simplified)  
**Status:** Planning Phase

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

### Phase 1: Web Frontend Migration (3-5 days)
- Create new web-based POS React app
- Reuse existing UI components from Electron renderer
- Replace IPC calls with direct REST API calls (axios/fetch)
- Replace SQLite queries with API endpoints
- Update authentication (session cookies instead of keytar)
- Remove all Electron-specific code (preload, IPC, main process)
- Update routing for web environment

### Phase 2: Deployment Pipeline (1-2 days)
- Add POS web app to existing Docker build
- Update docker-compose files (frontend + pos-frontend)
- Configure Nginx routing for POS subdomain or path
- Update CI/CD pipeline to build and deploy POS web app
- Environment configuration (API base URL)
- Deploy to production server

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

## Next Steps

1. ✅ Review and approve simplified migration plan
2. ⬜ Create new web POS React app structure
3. ⬜ Start Phase 1: Frontend migration (Day 1-5)
4. ⬜ Complete Phase 2: Deployment pipeline (Day 6-7)
5. ⬜ Deploy to production and test with staff
6. ⬜ Monitor for issues and collect feedback
7. ⬜ (Future) Plan Phase 2: Print queue implementation

---

**Document Owner:** Development Team  
**Last Updated:** November 22, 2025  
**Version:** 2.0 (Simplified - Direct API Integration)
