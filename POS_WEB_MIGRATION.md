# POS to Web Migration Plan

**Created:** November 22, 2025  
**Architecture:** Backend-Managed Print Queue (Option 1)  
**Status:** Planning Phase

---

## Overview

Migrate POS from Electron desktop app to web-based application with thermal printer support via standalone print bridge service.

### Goals
- ✅ Move POS to web (accessible from any device)
- ✅ Maintain offline-first capability (IndexedDB)
- ✅ Implement thermal printer support via print queue
- ✅ Enable multi-device access (tablets, laptops, phones)
- ✅ Reduce deployment complexity

### Benefits
- **No Installation:** Instant access via URL
- **Cross-Platform:** Works on tablets, phones, any OS
- **Auto-Updates:** No deployment/packaging needed
- **Reduced Maintenance:** No native module rebuilds
- **Better Security:** Browser sandbox vs Electron's node access

---

## Architecture

```
Web Frontend (PWA)
    ↓ HTTPS/WSS
Backend API (Print Queue Service)
    ↓ WebSocket
Print Bridge Service (Node.js)
    ↓ USB/Ethernet
Thermal Printer
```

**Components:**
1. **Web Frontend:** React SPA with IndexedDB for offline data
2. **Backend API:** Print queue management with WebSocket broadcasting
3. **Print Bridge:** Standalone Node.js service running on venue computer
4. **Thermal Printer:** Epson/Star/etc via USB or network connection

---

## Migration Phases

### Phase 1: Backend Print Queue (3-4 days)
- Database schema (PrintJob, PrintBridge models)
- Print queue service (enqueue, mark completed/failed)
- REST API endpoints (POST /api/print/receipt, GET /api/print/jobs)
- WebSocket server (broadcast print jobs to bridges)
- Integration into existing server

### Phase 2: Web Frontend Migration (4-5 days)
- Replace SQLite with IndexedDB (bookings, orders, menu, sync queue)
- Replace IPC calls with direct REST API calls
- Implement print service (call backend print queue)
- Service Worker for offline support and background sync
- Update auth to use Web Crypto API + localStorage

### Phase 3: Print Bridge Service (3-4 days)
- Create standalone Node.js package
- Implement WebSocket connection to backend
- Format receipts with ESC/POS commands
- Send to thermal printer via node-thermal-printer
- Package as Windows service / systemd service
- Configuration file (.env for backend URL, printer port)

### Phase 4: Testing & Deployment (3-5 days)
- Local testing with real thermal printer
- Integration testing (end-to-end print flow)
- Multi-device testing
- Failure recovery testing (bridge offline/online)
- Production deployment (backend, frontend, bridge)
- Monitoring setup

---

## Timeline

**Total Estimated Effort:** 13-18 days (2-3 weeks)

- Phase 1 (Backend): 3-4 days
- Phase 2 (Frontend): 4-5 days  
- Phase 3 (Print Bridge): 3-4 days
- Phase 4 (Testing): 3-5 days

---

## Technical Requirements

### Storage Migration
- **Current:** SQLite via better-sqlite3
- **Future:** IndexedDB via idb library
- **Data:** Bookings, Orders, Menu Items, Sync Queue, Metadata

### Authentication
- **Current:** keytar (OS keychain)
- **Future:** Web Crypto API + localStorage encryption

### Printing
- **Current:** Electron print dialog
- **Future:** Backend print queue → Bridge service → Thermal printer

### Supported Printers
- Epson TM-series (TM-T20, TM-T88)
- Star TSP series (TSP100, TSP650)
- Bixolon SRP series
- Generic ESC/POS printers

---

## Rollout Strategy

### Phase A: Parallel Run (1-2 weeks)
- Deploy web POS alongside Electron app
- Test with staff on tablets
- Keep Electron as fallback

### Phase B: Gradual Migration (2-3 weeks)
- Primary: Web POS for tablets
- Secondary: Electron app for backup
- Collect feedback and fix issues

### Phase C: Full Migration (Week 6+)
- Retire Electron app
- Web POS becomes primary interface
- Keep print bridge service running

---

## Success Criteria

- ✅ Web POS accessible from any device on venue network
- ✅ Print jobs queue successfully to backend
- ✅ Bridge service receives and prints receipts
- ✅ Offline functionality maintained (IndexedDB + Service Worker)
- ✅ < 3 second print latency (web → backend → printer)
- ✅ 99% print success rate
- ✅ Bridge auto-reconnects on network issues

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| IndexedDB quota limits | Monitor storage usage, add cleanup logic |
| Browser print quality | Use HTML templates + ESC/POS formatting |
| Network dependency | Service Worker + offline queue |
| Bridge service crashes | Auto-restart (systemd/Windows service) |
| Multiple tabs open | BroadcastChannel API for cross-tab sync |

---

## Dependencies

**NPM Libraries:**
- `idb` or `Dexie.js` (IndexedDB wrapper)
- `socket.io-client` (WebSocket)
- `node-thermal-printer` (ESC/POS printing)
- `escpos` (alternative printer library)

**Backend:**
- WebSocket support (socket.io)
- Print queue persistence (PostgreSQL or Redis)

**Infrastructure:**
- Venue computer with USB or network printer connection
- Node.js runtime on venue computer (for bridge service)

---

## Next Steps

1. Review and approve migration plan
2. Set up development environment
3. Start Phase 1: Backend print queue implementation
4. Weekly progress reviews
5. Testing with real thermal printer

---

**Document Owner:** Development Team  
**Last Updated:** November 22, 2025  
**Version:** 1.0
