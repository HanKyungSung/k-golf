/**
 * main.ts (Electron Main Process Entry)
 * -----------------------------------------
 * Responsibilities:
 *  - Initialize local SQLite DB before any renderer loads
 *  - Create BrowserWindow & load compiled renderer assets from dist
 *  - Maintain single-instance style re-creation on macOS activate
 *  - (Future) Register IPC handlers for auth, bookings, queue status, sync
 *
 * Implementation Notes:
 *  - Uses CommonJS require for Electron import to avoid ESM loader complexity.
 *  - Dist HTML is used (copied by watch script) so relative script src works.
 */
// Using require here because ts-node/register with Electron main prefers CJS resolution.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { app, BrowserWindow, ipcMain, session } = require('electron');
const os = require('node:os')
// Import auto-updater
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

// Load environment variables (supports .env in project root of electron app during dev)
try {
  // We attempt multiple relative locations because at runtime __dirname points to dist/
  const pathCandidates = [
    require('path').join(__dirname, '.env'), // dist/.env (packaged app)
    require('path').join(__dirname, '..', '.env'), // projectRoot/.env (dev mode)
    require('path').join(process.resourcesPath || __dirname, '.env'), // app.asar/.env (packaged)
  ];
  const fs = require('fs');
  const dotenv = require('dotenv');
  for (const p of pathCandidates) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      console.log('[MAIN] Loaded .env from:', p);
      break;
    }
  }
} catch {/* ignore dotenv load errors */}
import { initDb } from './core/db';
import { enqueueBooking } from './core/bookings';
import { getQueueSize, listQueue, enqueue, enqueuePullIfNotExists, enqueueFullPullBookings } from './core/sync-queue';
import { processSyncCycle } from './core/sync';
import { setAccessToken, saveRefreshToken, loadRefreshToken, setAuthenticatedUser, getAuthenticatedUser, setSessionCookies, getSessionCookieHeader, clearAuthState, clearRefreshToken } from './core/auth';
import { registerMenuHandlers } from './main/handlers/menu-handlers';
import axios from 'axios';
import path from 'path';
import fs from 'fs';

// Default production API URL (can be overridden with API_BASE_URL env var)
const DEFAULT_API_BASE_URL = 'https://k-golf.inviteyou.ca';

// Optional: dynamic MV3 extension install (React DevTools) for Electron >=35 workaround
let installExtension: any = null;
let updateExtensions: any = null;
let autoTried = false; // prevent repeated auto installs
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ({ installExtension, updateExtensions } = require('electron-chrome-web-store'));
} catch {/* dependency may not be installed; ignore */}

async function launchExtensionBackgroundWorkers(sess = session.defaultSession) {
  try {
    const exts = await sess.getAllExtensions();
    await Promise.all(exts.map(async (ext: any) => {
      const manifest = ext.manifest;
      if (manifest?.manifest_version === 3 && manifest?.background?.service_worker) {
        try {
          await (sess as any).serviceWorkers.startWorkerForScope(ext.url);
          console.log('[DEVTOOLS] Started service worker for', manifest.name);
        } catch (e: any) {
          console.warn('[DEVTOOLS] Failed to start service worker for', manifest.name, e?.message);
        }
      }
    }));
  } catch (e: any) {
    console.warn('[DEVTOOLS] launchExtensionBackgroundWorkers error', e?.message);
  }
}

async function startMV3ServiceWorkers() {
  try {
    const exts = await session.defaultSession.getAllExtensions();
    for (const ext of exts) {
      const manifest = (ext as any).manifest;
      if (manifest?.manifest_version === 3 && manifest?.background?.service_worker) {
        try {
          await (session as any).defaultSession.serviceWorkers.startWorkerForScope((ext as any).url);
          console.log('[DEVTOOLS] Started MV3 service worker for', manifest.name);
        } catch (e:any) {
          console.warn('[DEVTOOLS] MV3 worker start failed for', manifest.name, e?.message);
        }
      }
    }
  } catch (e:any) {
    console.warn('[DEVTOOLS] MV3 worker scan error', e?.message);
  }
}

async function loadReactDevTools() {
  if (!process.env.ELECTRON_DEV) return;
  const wantInstall = process.env.DEV_REACT_EXT_INSTALL === '1' && installExtension;
  const autoInstall = process.env.DEV_REACT_AUTO_INSTALL === '1' && installExtension;
  const reloadFlag = process.env.DEV_RELOAD_REACT_EXT === '1';
  const rawEnvPath = (process.env.REACT_DEVTOOLS_PATH || '').trim();
  const vendorFallback = path.join(__dirname, '..', 'devtools', 'react');
  const candidates: string[] = [];
  if (rawEnvPath) candidates.push(rawEnvPath);
  if (fs.existsSync(vendorFallback)) candidates.push(vendorFallback);
  console.log('[DEVTOOLS] Loading strategy:', wantInstall ? 'store-install' : candidates.length ? 'manual-path(s)' : 'none');
  if (wantInstall) {
    try {
      const id = 'fmkadmapgofadopljbjfkapdkoienihi';
      await installExtension(id);
      await (updateExtensions ? updateExtensions() : Promise.resolve());
      console.log('[DEVTOOLS] Installed React DevTools via store');
    } catch (e:any) {
      console.warn('[DEVTOOLS] Store install failed', e?.message);
    }
  } else {
    for (const c of candidates) {
      try {
        const targetPath = path.isAbsolute(c) ? c : path.join(os.homedir(), c);
        const manifest = path.join(targetPath, 'manifest.json');
        if (!fs.existsSync(manifest)) { continue; }
        const loaded = await session.defaultSession.loadExtension(targetPath, { allowFileAccess: true });
        console.log('[DEVTOOLS] Loaded React DevTools from', targetPath, 'name:', loaded.name, 'version:', loaded.version);
        break;
      } catch (e:any) {
        console.warn('[DEVTOOLS] Manual candidate load failed for', c, e?.message);
      }
    }
  }
  try {
    const list = await session.defaultSession.getAllExtensions();
    list.forEach((e:any) => console.log('[DEVTOOLS] Present extension:', e.name, 'v'+e.version, 'MV'+e.manifest?.manifest_version));
    const reactExt = list.find((e:any) => /React Developer Tools/i.test(e.name));
    if (reactExt && reloadFlag) {
      try {
        console.log('[DEVTOOLS] Reloading React DevTools with allowFileAccess from', (reactExt as any).path);
        await session.defaultSession.removeExtension(reactExt.name);
        await session.defaultSession.loadExtension((reactExt as any).path, { allowFileAccess: true });
        console.log('[DEVTOOLS] Reload complete');
      } catch (e:any) {
        console.warn('[DEVTOOLS] Reload failed', e?.message);
      }
    }
    if (!reactExt) {
      if (reloadFlag) console.log('[DEVTOOLS] Reload flag set but React DevTools not installed yet.');
      if (autoInstall && !autoTried) {
        autoTried = true;
        try {
          const id = 'fmkadmapgofadopljbjfkapdkoienihi';
          console.log('[DEVTOOLS] Auto-installing React DevTools via store...');
          await installExtension(id);
          await (updateExtensions ? updateExtensions() : Promise.resolve());
          console.log('[DEVTOOLS] Auto-install success');
        } catch (e:any) {
          console.warn('[DEVTOOLS] Auto-install failed', e?.message);
        }
      } else if (!wantInstall && !candidates.length) {
        console.log('[DEVTOOLS] React DevTools not present. Set DEV_REACT_EXT_INSTALL=1 or provide REACT_DEVTOOLS_PATH (or vendor devtools/react).');
      }
    }
  } catch (e:any) {
    console.warn('[DEVTOOLS] Enumerate failed', e?.message);
  }
  await startMV3ServiceWorkers();
}

async function createWindow() {
  const isDev = !!process.env.ELECTRON_DEV;
  const disableSandbox = isDev && process.env.DEV_DISABLE_SANDBOX === '1';
  const disableCI = isDev && process.env.DEV_DISABLE_CONTEXT_ISOLATION === '1';
  if (disableSandbox) {
    console.warn('[MAIN] DEV sandbox disabled to allow DevTools extension injection');
  }
  if (disableCI) {
    console.warn('[MAIN] DEV contextIsolation disabled (less secure) to allow extension hook');
  }
  
  // In production, __dirname is app.asar/dist
  // Use path.join to properly resolve preload path whether in asar or not
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('[MAIN] Preload path:', preloadPath);
  
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: preloadPath,
      // React renderer now uses secure preload bridge only
      nodeIntegration: false,
      contextIsolation: !disableCI,
      sandbox: !disableSandbox
    }
  });
  // Maximize by default for POS terminal usage
  try { win.maximize(); } catch {/* ignore */}
  console.log('[MAIN] BrowserWindow created. Dev mode:', isDev);
  
  // Resolve renderer HTML path - works with both dev and asar packaging
  const distHtml = path.join(__dirname, 'renderer', 'index.html');
  console.log('[MAIN] Loading renderer from:', distHtml);
  console.log('[MAIN] File exists check:', fs.existsSync(distHtml));
  
  try {
    await win.loadFile(distHtml);
    console.log('[MAIN] Renderer loaded successfully');
  } catch (e: any) {
    console.error('[MAIN] Failed to load renderer:', e.message);
    await win.loadURL('data:text/html,<h1>Renderer HTML not found</h1><p>Path: ' + distHtml + '</p>');
  }
}

app.whenReady().then(async () => {
  const { path: dbPath, newlyCreated } = initDb();
  console.log('[MAIN] DB initialized at', dbPath, 'new?', newlyCreated);
  
  // Initialize auto-updater
  initAutoUpdater();
  
  // Register menu IPC handlers
  registerMenuHandlers();
  
  // React DevTools approach priority:
  // 1. If ELECTRON_DEV and electron-chrome-web-store available and DEV_REACT_EXT_INSTALL=1, attempt install by store ID (MV3 safe path for v35+)
  // 2. Else fallback to manual path env variable REACT_DEVTOOLS_PATH (legacy unpacked loading)
  if (process.env.ELECTRON_DEV) {
    await loadReactDevTools();
  }
  createWindow();
  
  // Start periodic sync cycle (5 seconds - optimized for faster feedback)
  const SYNC_INTERVAL_MS = 5000;
  console.log('[MAIN] Starting periodic sync cycle, interval:', SYNC_INTERVAL_MS, 'ms');
  setInterval(async () => {
    const user = getAuthenticatedUser();
    const queueSize = getQueueSize();
    
    // Only sync if: authenticated + queue not empty
    if (!user || queueSize === 0) {
      return;
    }
    
    console.log('[MAIN][AUTO_SYNC] Triggering sync cycle, queue size:', queueSize);
    const apiBase = process.env.API_BASE_URL || 'http://localhost:8080';
    
    try {
      const res = await processSyncCycle(apiBase);
      console.log('[MAIN][AUTO_SYNC] Completed:', res);
      
      // Handle auth expiry
      if ((res as any).authExpired) {
        clearAuthState();
        emitToAll('auth:state', { authenticated: false });
      }
      
      // Notify renderer of sync results
      emitToAll('queue:update', { queueSize: getQueueSize(), sync: res });
    } catch (e: any) {
      console.error('[MAIN][AUTO_SYNC] Error:', e.message);
    }
  }, SYNC_INTERVAL_MS);
  
  // Start periodic menu pull sync (2 minutes - faster menu updates)
  const MENU_PULL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
  console.log('[MAIN] Starting periodic menu pull, interval:', MENU_PULL_INTERVAL_MS, 'ms');
  setInterval(() => {
    const user = getAuthenticatedUser();
    if (!user) return; // Only pull when authenticated
    
    const syncQueueId = enqueuePullIfNotExists('menu:pull');
    if (syncQueueId) {
      console.log('[MAIN][MENU_PULL] Enqueued menu:pull, syncQueueId:', syncQueueId);
      emitToAll('queue:update', { queueSize: getQueueSize() });
    } else {
      console.log('[MAIN][MENU_PULL] menu:pull already queued, skipping');
    }
  }, MENU_PULL_INTERVAL_MS);
  
  // Start periodic rooms pull sync (30 seconds - frequent room status changes)
  const ROOMS_PULL_INTERVAL_MS = 30 * 1000; // 30 seconds
  console.log('[MAIN] Starting periodic rooms pull, interval:', ROOMS_PULL_INTERVAL_MS, 'ms');
  setInterval(() => {
    const user = getAuthenticatedUser();
    if (!user) return; // Only pull when authenticated
    
    const syncQueueId = enqueuePullIfNotExists('rooms:pull');
    if (syncQueueId) {
      console.log('[MAIN][ROOMS_PULL] Enqueued rooms:pull, syncQueueId:', syncQueueId);
      emitToAll('queue:update', { queueSize: getQueueSize() });
    } else {
      console.log('[MAIN][ROOMS_PULL] rooms:pull already queued, skipping');
    }
  }, ROOMS_PULL_INTERVAL_MS);
  
  // Start periodic bookings pull sync (5 seconds for real-time updates)
  // This pulls incrementally using updatedAfter timestamp
  const BOOKINGS_PULL_INTERVAL_MS = 5 * 1000; // 5 seconds
  console.log('[MAIN] Starting periodic bookings pull (incremental), interval:', BOOKINGS_PULL_INTERVAL_MS, 'ms');
  setInterval(() => {
    const user = getAuthenticatedUser();
    if (!user) return; // Only pull when authenticated
    
    // Incremental pull (no fullSync flag, default behavior)
    const syncQueueId = enqueuePullIfNotExists('bookings:pull');
    if (syncQueueId) {
      console.log('[MAIN][BOOKINGS_PULL] Enqueued incremental bookings:pull, syncQueueId:', syncQueueId);
      emitToAll('queue:update', { queueSize: getQueueSize() });
    } else {
      console.log('[MAIN][BOOKINGS_PULL] bookings:pull already queued, skipping');
    }
  }, BOOKINGS_PULL_INTERVAL_MS);
  
  // Also trigger menu pull on app startup (after auth)
  ipcMain.on('auth:ready', () => {
    console.log('[MAIN] Auth ready, triggering initial menu pull');
    const syncQueueId = enqueuePullIfNotExists('menu:pull');
    if (syncQueueId) {
      console.log('[MAIN] Initial menu:pull enqueued, syncQueueId:', syncQueueId);
      emitToAll('queue:update', { queueSize: getQueueSize() });
    }
  });
  
  // Manual trigger for menu sync (for testing/debugging)
  ipcMain.handle('sync:triggerMenuPull', () => {
    console.log('[MAIN] Manual menu:pull trigger requested');
    const syncQueueId = enqueuePullIfNotExists('menu:pull');
    if (syncQueueId) {
      console.log('[MAIN] menu:pull enqueued, syncQueueId:', syncQueueId);
      emitToAll('queue:update', { queueSize: getQueueSize() });
      return { ok: true, syncQueueId, queueSize: getQueueSize() };
    } else {
      console.log('[MAIN] menu:pull already queued');
      return { ok: true, alreadyQueued: true, queueSize: getQueueSize() };
    }
  });
  
  // IPC handlers (Phase 0.4 temporary minimal wiring)
  function userHasStaffRole() {
    const u = getAuthenticatedUser();
    const role = (u?.role || '').toUpperCase();
    return !!u && (role === 'ADMIN' || role === 'STAFF');
  }
  function userIsAdmin() {
    const u = getAuthenticatedUser();
    return !!u && (u.role || '').toUpperCase() === 'ADMIN';
  }

  ipcMain.handle('booking:create', (_evt: any, payload: any) => {
    const user = getAuthenticatedUser();
    if (!user) return { ok: false, error: 'NOT_AUTHENTICATED' };
    if (!userHasStaffRole()) return { ok: false, error: 'FORBIDDEN_ROLE' };
    try {
      // Validation
      if (!payload || !payload.roomId || !payload.userId || !payload.customerName || 
          !payload.customerPhone || !payload.startsAt || !payload.endsAt || 
          !payload.players || !payload.price) {
        throw new Error('Missing required fields');
      }
      
      const result = enqueueBooking({
        roomId: String(payload.roomId),
        userId: String(payload.userId),
        customerName: String(payload.customerName),
        customerPhone: String(payload.customerPhone),
        customerEmail: payload.customerEmail ? String(payload.customerEmail) : undefined,
        startsAt: String(payload.startsAt),
        endsAt: String(payload.endsAt),
        players: Number(payload.players),
        price: Number(payload.price),
        bookingSource: payload.bookingSource || 'WALK_IN',
        createdBy: user.id, // Current admin user
        internalNotes: payload.internalNotes ? String(payload.internalNotes) : undefined
      });
      
      emitToAll('queue:update', { queueSize: result.queueSize });
      emitToAll('booking:created', { id: result.bookingId, ...payload });
      return { ok: true, ...result };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });
  
  // Booking list/read handlers (SQLite-based)
  ipcMain.handle('bookings:list', async (_evt: any, options?: { date?: string; roomId?: string }) => {
    const user = getAuthenticatedUser();
    if (!user) return { ok: false, error: 'NOT_AUTHENTICATED' };
    
    try {
      const db = require('./core/db').getDb();
      let query = 'SELECT * FROM Booking WHERE 1=1';
      const params: any[] = [];
      
      // Filter by date if provided (no default filter - show all bookings)
      if (options?.date) {
        const targetDate = new Date(options.date);
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
        query += ' AND startTime >= ? AND startTime < ?';
        params.push(startOfDay.toISOString(), endOfDay.toISOString());
      }
      
      // Filter by room if provided
      if (options?.roomId) {
        query += ' AND roomId = ?';
        params.push(options.roomId);
      }
      
      query += ' ORDER BY startTime ASC';
      
      const bookings = db.prepare(query).all(...params);
      return { ok: true, bookings };
    } catch (e: any) {
      console.error('[BOOKINGS][LIST] Error:', e);
      return { ok: false, error: e.message };
    }
  });
  
  ipcMain.handle('bookings:getById', async (_evt: any, id: string) => {
    const user = getAuthenticatedUser();
    if (!user) return { ok: false, error: 'NOT_AUTHENTICATED' };
    
    try {
      const db = require('./core/db').getDb();
      const booking = db.prepare('SELECT * FROM Booking WHERE id = ?').get(id);
      return booking ? { ok: true, booking } : { ok: false, error: 'NOT_FOUND' };
    } catch (e: any) {
      console.error('[BOOKINGS][GET] Error:', e);
      return { ok: false, error: e.message };
    }
  });
  
  ipcMain.handle('bookings:updateStatus', async (_evt: any, { id, status }: { id: string; status: string }) => {
    const user = getAuthenticatedUser();
    if (!user) return { ok: false, error: 'NOT_AUTHENTICATED' };
    if (!userHasStaffRole()) return { ok: false, error: 'FORBIDDEN_ROLE' };
    
    try {
      const db = require('./core/db').getDb();
      const now = new Date().toISOString();
      
      // Update local record and mark as dirty for sync
      db.prepare('UPDATE Booking SET status = ?, updatedAt = ?, dirty = 1 WHERE id = ?')
        .run(status, now, id);
      
      // Enqueue sync operation
      const syncQueueId = enqueue('booking:updateStatus', { id, status });
      emitToAll('queue:update', { queueSize: getQueueSize() });
      
      return { ok: true, syncQueueId };
    } catch (e: any) {
      console.error('[BOOKINGS][UPDATE_STATUS] Error:', e);
      return { ok: false, error: e.message };
    }
  });
  
  ipcMain.handle('queue:getSize', () => ({ queueSize: getQueueSize() }));
  ipcMain.handle('queue:enqueue', (_evt: any, params: { type: string; payload: any }) => {
    try {
      console.log('[MAIN] queue:enqueue called with type:', params.type, 'payload:', params.payload);
      const syncQueueId = enqueue(params.type, params.payload);
      console.log('[MAIN] Enqueued successfully, syncQueueId:', syncQueueId, 'new queue size:', getQueueSize());
      emitToAll('queue:update', { queueSize: getQueueSize() });
      return { ok: true, syncQueueId };
    } catch (e: any) {
      console.error('[MAIN] queue:enqueue failed:', e.message);
      return { ok: false, error: e.message };
    }
  });
  ipcMain.handle('sync:force', async () => {
    console.log('[MAIN] sync:force called');
    const user = getAuthenticatedUser();
    console.log('[MAIN] Current user:', user);
    
    if (!user) {
      console.log('[MAIN] sync:force blocked: NOT_AUTHENTICATED');
      return { pushed: 0, failures: 1, remaining: 0, error: 'NOT_AUTHENTICATED' };
    }
    if (!(user.role === 'ADMIN' || user.role === 'STAFF')) {
      console.log('[MAIN] sync:force blocked: FORBIDDEN_ROLE, user role:', user.role);
      return { pushed: 0, failures: 1, remaining: 0, error: 'FORBIDDEN_ROLE' };
    }
    const apiBase = process.env.API_BASE_URL || 'http://localhost:8080';
    console.log('[MAIN] sync:force starting, apiBase:', apiBase, 'queue size:', getQueueSize());
    const res = await processSyncCycle(apiBase);
    console.log('[MAIN] sync:force completed, result:', res);
    if ((res as any).authExpired) {
      // Clear local auth state and notify renderer so UI can prompt re-login
      clearAuthState();
      emitToAll('auth:state', { authenticated: false });
      emitToAll('queue:update', { queueSize: getQueueSize(), sync: res });
      return { ...res, error: 'AUTH_EXPIRED' };
    }
    emitToAll('queue:update', { queueSize: getQueueSize(), sync: res });
    return res;
  });
  ipcMain.handle('debug:syncQueue:list', () => {
    try {
      const items = listQueue();
      return { ok: true, items };
    } catch (e: any) {
      return { ok: false, error: e?.message };
    }
  });
  ipcMain.handle('auth:login', async (_evt: any, creds: { email: string; password: string }) => {
    const apiBase = process.env.API_BASE_URL || 'http://localhost:8080';
    try {
  const res = await axios.post(`${apiBase}/api/auth/login`, { email: creds.email, password: creds.password }, { withCredentials: true });
  setSessionCookies(res.headers['set-cookie']);
      // For now backend sets httpOnly cookie session; treat session presence as auth.
      const user = res.data.user;
      setAuthenticatedUser(user);
      try { console.log('[AUTH][LOGIN] user object', user); } catch {/* ignore */}
      // Placeholder: no access token yet (session cookie used). If future endpoint returns tokens, setAccessToken(...)
      emitToAll('auth:state', { authenticated: true, user });
      
      // Trigger initial menu pull after successful login
      console.log('[AUTH][LOGIN] Triggering initial menu pull');
      const menuSyncId = enqueuePullIfNotExists('menu:pull');
      if (menuSyncId) {
        console.log('[AUTH][LOGIN] menu:pull enqueued, syncQueueId:', menuSyncId);
      }
      
      // Trigger initial rooms pull after successful login
      console.log('[AUTH][LOGIN] Triggering initial rooms pull');
      const roomsSyncId = enqueuePullIfNotExists('rooms:pull');
      if (roomsSyncId) {
        console.log('[AUTH][LOGIN] rooms:pull enqueued, syncQueueId:', roomsSyncId);
      }
      
      // Trigger FULL bookings pull after successful login (populates complete history)
      console.log('[AUTH][LOGIN] Triggering FULL bookings pull (all history)');
      const bookingsSyncId = enqueueFullPullBookings();
      console.log('[AUTH][LOGIN] bookings:pull (FULL) enqueued, syncQueueId:', bookingsSyncId);
      
      emitToAll('queue:update', { queueSize: getQueueSize() });
      
      return { ok: true, user };
    } catch (e: any) {
      return { ok: false, error: e?.response?.data?.message || e?.message || 'Login failed' };
    }
  });
  ipcMain.handle('auth:getStatus', async () => {
    return { authenticated: !!getAuthenticatedUser(), user: getAuthenticatedUser() };
  });
  ipcMain.handle('auth:logout', async () => {
    try { await clearRefreshToken(); } catch {}
    clearAuthState();
    emitToAll('auth:state', { authenticated: false });
    return { ok: true };
  });
  ipcMain.handle('config:getApiBaseUrl', async () => {
    return process.env.API_BASE_URL || 'http://localhost:8080';
  });
  ipcMain.handle('rooms:list', async () => {
    const user = getAuthenticatedUser();
    try { console.log('[ROOMS][TRACE] rooms:list role=', user?.role, 'user=', user); } catch {/* ignore */}
    if (!user) return { ok: false, error: 'NOT_AUTHENTICATED' };
    if (!userIsAdmin()) {
      console.warn('[ROOMS][GUARD] Forbidden list attempt role=', user?.role);
      return { ok: false, error: 'FORBIDDEN_ROLE' };
    }
    try {
      // Read from local SQLite (synced by rooms:pull)
      const db = require('./core/db').getDb();
      const rooms = db.prepare('SELECT * FROM Room WHERE active = 1 ORDER BY name').all();
      return { ok: true, rooms };
    } catch (e: any) {
      console.error('[ROOMS][ERROR] Failed to read from SQLite:', e);
      return { ok: false, error: e?.message || 'ROOMS_FETCH_FAILED' };
    }
  });
  ipcMain.handle('rooms:update', async (_evt: any, payload: { id: number; patch: { openMinutes?: number; closeMinutes?: number; status?: string } }) => {
    const user = getAuthenticatedUser();
    try { console.log('[ROOMS][TRACE] rooms:update role=', user?.role, 'payload.id=', payload?.id); } catch {/* ignore */}
    if (!user) return { ok: false, error: 'NOT_AUTHENTICATED' };
    if (!userIsAdmin()) {
      console.warn('[ROOMS][GUARD] Forbidden update attempt role=', user?.role);
      return { ok: false, error: 'FORBIDDEN_ROLE' };
    }
    try {
      const { id, patch } = payload || {} as any;
      if (!id) return { ok: false, error: 'MISSING_ID' };
      // Basic validation if both provided
      if (typeof patch.openMinutes === 'number' && typeof patch.closeMinutes === 'number' && patch.openMinutes >= patch.closeMinutes) {
        return { ok: false, error: 'INVALID_RANGE' };
      }
      const apiBase = process.env.API_BASE_URL || 'http://localhost:8080';
      const cookieHeader = getSessionCookieHeader();
      const res = await axios.patch(`${apiBase}/api/bookings/rooms/${id}`, patch, { withCredentials: true, headers: cookieHeader ? { Cookie: cookieHeader } : {} });
      return { ok: true, room: (res.data && (res.data.room || res.data)) };
    } catch (e: any) {
      return { ok: false, error: e?.response?.data?.error || e?.message || 'ROOM_UPDATE_FAILED' };
    }
  });
  // Silent session check (cookie based) after window created
  setTimeout(async () => {
    try {
      const apiBase = process.env.API_BASE_URL || 'http://localhost:8080';
  // Attempt with stored cookies if any
  const cookieHeader = getSessionCookieHeader();
  const res = await axios.get(`${apiBase}/api/auth/me`, { withCredentials: true, headers: cookieHeader ? { Cookie: cookieHeader } : {} });
      if (res.data?.user) {
        setAuthenticatedUser(res.data.user);
        emitToAll('auth:state', { authenticated: true, user: res.data.user });
      } else {
        emitToAll('auth:state', { authenticated: false });
      }
    } catch {
      emitToAll('auth:state', { authenticated: false });
    }
  }, 1000);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  if (process.env.ELECTRON_DEV) {
    const [win] = BrowserWindow.getAllWindows();
    // Open DevTools after a short delay to increase chance extension panel registers first time
    setTimeout(() => {
      try { win?.webContents.openDevTools({ mode: 'detach' }); } catch {/* ignore */}
    }, 400);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function emitToAll(channel: string, payload: unknown) {
  for (const w of BrowserWindow.getAllWindows()) {
    try { w.webContents.send(channel, payload); } catch {/* ignore */}
  }
}

// Intercept console methods to forward main process logs to renderer (dev only)
if (process.env.ELECTRON_DEV) {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
  };

  console.log = (...args: any[]) => {
    originalConsole.log(...args);
    emitToAll('main-log', { level: 'log', message: args });
  };

  console.warn = (...args: any[]) => {
    originalConsole.warn(...args);
    emitToAll('main-log', { level: 'warn', message: args });
  };

  console.error = (...args: any[]) => {
    originalConsole.error(...args);
    emitToAll('main-log', { level: 'error', message: args });
  };

  console.info = (...args: any[]) => {
    originalConsole.info(...args);
    emitToAll('main-log', { level: 'info', message: args });
  };

  console.debug = (...args: any[]) => {
    originalConsole.debug(...args);
    emitToAll('main-log', { level: 'debug', message: args });
  };
}

/**
 * Auto-Updater Configuration
 * Checks for updates on startup and every 4 hours
 */
function initAutoUpdater() {
  // Skip auto-update in development mode
  if (process.env.ELECTRON_DEV) {
    log.info('[AUTO_UPDATE] Skipping in development mode');
    return;
  }

  // Configure logger
  autoUpdater.logger = log;
  (autoUpdater.logger as any).transports.file.level = 'info';
  log.info('[AUTO_UPDATE] Initializing auto-updater');

  // Configure update behavior
  autoUpdater.autoDownload = true; // Automatically download updates
  autoUpdater.autoInstallOnAppQuit = true; // Install on quit (silent)

  // Event: Checking for update
  autoUpdater.on('checking-for-update', () => {
    log.info('[AUTO_UPDATE] Checking for updates...');
    emitToAll('update:checking', {});
  });

  // Event: Update available
  autoUpdater.on('update-available', (info) => {
    log.info('[AUTO_UPDATE] Update available:', info.version);
    emitToAll('update:available', { version: info.version, releaseNotes: info.releaseNotes });
  });

  // Event: Update not available
  autoUpdater.on('update-not-available', (info) => {
    log.info('[AUTO_UPDATE] Update not available. Current version:', info.version);
    emitToAll('update:not-available', { version: info.version });
  });

  // Event: Download progress
  autoUpdater.on('download-progress', (progress) => {
    log.info(`[AUTO_UPDATE] Download progress: ${progress.percent.toFixed(2)}% (${progress.transferred}/${progress.total} bytes)`);
    emitToAll('update:download-progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond
    });
  });

  // Event: Update downloaded
  autoUpdater.on('update-downloaded', (info) => {
    log.info('[AUTO_UPDATE] Update downloaded:', info.version);
    emitToAll('update:downloaded', { version: info.version });
    
    // Notify user that update is ready
    // The update will be installed on next app restart (autoInstallOnAppQuit: true)
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      windows[0].webContents.send('update:ready', {
        version: info.version,
        message: 'Update downloaded. Will install on next restart.'
      });
    }
  });

  // Event: Error
  autoUpdater.on('error', (error) => {
    log.error('[AUTO_UPDATE] Error:', error);
    emitToAll('update:error', { message: error.message });
  });

  // Check for updates on startup (after 10 seconds delay)
  setTimeout(() => {
    log.info('[AUTO_UPDATE] Performing initial update check');
    autoUpdater.checkForUpdates().catch(err => {
      log.error('[AUTO_UPDATE] Initial check failed:', err);
    });
  }, 10000);

  // Check for updates every 12 hours
  const CHECK_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
  setInterval(() => {
    log.info('[AUTO_UPDATE] Performing periodic update check');
    autoUpdater.checkForUpdates().catch(err => {
      log.error('[AUTO_UPDATE] Periodic check failed:', err);
    });
  }, CHECK_INTERVAL);

  // IPC handler for manual update check
  ipcMain.handle('update:check', async () => {
    try {
      log.info('[AUTO_UPDATE] Manual update check requested');
      const result = await autoUpdater.checkForUpdates();
      return { ok: true, updateInfo: result?.updateInfo };
    } catch (error: any) {
      log.error('[AUTO_UPDATE] Manual check failed:', error);
      return { ok: false, error: error.message };
    }
  });

  // IPC handler to install update now (quit and install)
  ipcMain.handle('update:installNow', () => {
    log.info('[AUTO_UPDATE] Install now requested');
    autoUpdater.quitAndInstall(false, true); // (isSilent, isForceRunAfter)
  });

  // IPC handler for printing seat bills
  ipcMain.handle('print:bill', async (_evt: any, printData: any) => {
    log.info('[PRINT] Print bill requested:', { 
      seatName: printData.seatName, 
      itemCount: printData.items?.length 
    });

    try {
      // Create hidden window for printing
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      // Generate HTML content for the bill
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body {
                font-family: 'Courier New', monospace;
                margin: 20px;
                font-size: 12pt;
              }
              .header {
                text-align: center;
                font-size: 18pt;
                font-weight: bold;
                margin-bottom: 20px;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
              }
              .info {
                margin-bottom: 15px;
              }
              .info-line {
                margin: 5px 0;
              }
              .items {
                border-top: 2px solid #000;
                border-bottom: 2px solid #000;
                padding: 10px 0;
                margin: 15px 0;
              }
              .item {
                display: flex;
                justify-content: space-between;
                margin: 8px 0;
              }
              .item-name {
                flex: 1;
              }
              .item-price {
                text-align: right;
                min-width: 80px;
              }
              .totals {
                text-align: right;
                margin-top: 15px;
              }
              .total-line {
                margin: 5px 0;
              }
              .grand-total {
                font-size: 14pt;
                font-weight: bold;
                border-top: 2px solid #000;
                padding-top: 5px;
                margin-top: 5px;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                font-size: 10pt;
                color: #666;
              }
            </style>
          </head>
          <body>
            <div class="header">K-GOLF</div>
            
            <div class="info">
              <div class="info-line"><strong>Seat:</strong> ${printData.seatName}</div>
              ${printData.customerName ? `<div class="info-line"><strong>Customer:</strong> ${printData.customerName}</div>` : ''}
              ${printData.roomName ? `<div class="info-line"><strong>Room:</strong> ${printData.roomName}</div>` : ''}
              <div class="info-line"><strong>Date:</strong> ${printData.date}</div>
            </div>
            
            <div class="items">
              ${printData.items.map((item: any) => `
                <div class="item">
                  <span class="item-name">${item.quantity}x ${item.name}</span>
                  <span class="item-price">$${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              `).join('')}
            </div>
            
            <div class="totals">
              <div class="total-line">Subtotal: $${printData.subtotal.toFixed(2)}</div>
              <div class="total-line">Tax: $${printData.tax.toFixed(2)}</div>
              <div class="grand-total">Total: $${printData.total.toFixed(2)}</div>
            </div>
            
            <div class="footer">Thank you for your business!</div>
          </body>
        </html>
      `;

      // Load the HTML
      await printWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));

      // Wait for content to load
      await new Promise<void>(resolve => {
        printWindow.webContents.once('did-finish-load', () => resolve());
      });

      // Print with dialog (silent: false shows dialog, silent: true auto-prints)
      // Note: print() method doesn't return a promise in newer Electron versions
      // Use callback-based approach instead
      return new Promise((resolve) => {
        printWindow.webContents.print(
          {
            silent: false,        // Show print dialog
            printBackground: true,
            margins: {
              marginType: 'printableArea'
            }
          },
          (success: boolean, failureReason?: string) => {
            // Clean up
            printWindow.close();

            if (success) {
              log.info('[PRINT] Print completed successfully');
              resolve({ success: true });
            } else {
              log.error('[PRINT] Print failed:', failureReason);
              resolve({ success: false, error: failureReason || 'Print cancelled or failed' });
            }
          }
        );
      });
    } catch (error) {
      log.error('[PRINT] Print failed with exception:', error);
      return { success: false, error: String(error) };
    }
  });
}
