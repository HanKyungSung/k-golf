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
// Load environment variables (supports .env in project root of electron app during dev)
try {
  // We attempt multiple relative locations because at runtime __dirname points to dist/
  const pathCandidates = [
    require('path').join(__dirname, '.env'), // if someone copied it into dist (unlikely)
    require('path').join(__dirname, '..', '.env'), // typical: projectRoot/dist -> projectRoot/.env
  ];
  const fs = require('fs');
  const dotenv = require('dotenv');
  for (const p of pathCandidates) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      break;
    }
  }
} catch {/* ignore dotenv load errors */}
import { initDb } from './core/db';
import { enqueueBooking } from './core/bookings';
import { getQueueSize, listOutbox, enqueue } from './core/outbox';
import { processSyncCycle } from './core/sync';
import { setAccessToken, saveRefreshToken, loadRefreshToken, setAuthenticatedUser, getAuthenticatedUser, setSessionCookies, getSessionCookieHeader, clearAuthState, clearRefreshToken } from './core/auth';
import { registerMenuHandlers } from './main/handlers/menu-handlers';
import axios from 'axios';
import path from 'path';
import fs from 'fs';

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
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // React renderer now uses secure preload bridge only
      nodeIntegration: false,
      contextIsolation: !disableCI,
      sandbox: !disableSandbox
    }
  });
  // Maximize by default for POS terminal usage
  try { win.maximize(); } catch {/* ignore */}
  console.log('[MAIN] BrowserWindow created. Dev mode:', !!process.env.ELECTRON_DEV);
  // Always load the copied HTML in dist so that ./index.js (compiled from index.tsx) resolves.
  const distHtml = path.join(__dirname, 'renderer', 'index.html');
  if (fs.existsSync(distHtml)) {
    await win.loadFile(distHtml);
  } else {
    console.error('[MAIN] dist renderer HTML missing at', distHtml);
    await win.loadURL('data:text/html,<h1>Renderer HTML not found</h1>');
  }
}

app.whenReady().then(async () => {
  const { path: dbPath, newlyCreated } = initDb();
  console.log('[MAIN] DB initialized at', dbPath, 'new?', newlyCreated);
  
  // Register menu IPC handlers
  registerMenuHandlers();
  
  // React DevTools approach priority:
  // 1. If ELECTRON_DEV and electron-chrome-web-store available and DEV_REACT_EXT_INSTALL=1, attempt install by store ID (MV3 safe path for v35+)
  // 2. Else fallback to manual path env variable REACT_DEVTOOLS_PATH (legacy unpacked loading)
  if (process.env.ELECTRON_DEV) {
    await loadReactDevTools();
  }
  createWindow();
  
  // Start periodic sync cycle (15 seconds)
  const SYNC_INTERVAL_MS = 15000;
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
      // Basic validation (minimal)
      if (!payload || !payload.customerName || !payload.startsAt || !payload.endsAt) {
        throw new Error('Missing fields');
      }
      const result = enqueueBooking({
        customerName: String(payload.customerName),
        startsAt: String(payload.startsAt),
        endsAt: String(payload.endsAt)
      });
      emitToAll('queue:update', { queueSize: result.queueSize });
      emitToAll('booking:created', { id: result.bookingId, ...payload });
      return { ok: true, ...result };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });
  ipcMain.handle('queue:getSize', () => ({ queueSize: getQueueSize() }));
  ipcMain.handle('queue:enqueue', (_evt: any, params: { type: string; payload: any }) => {
    try {
      console.log('[MAIN] queue:enqueue called with type:', params.type, 'payload:', params.payload);
      const outboxId = enqueue(params.type, params.payload);
      console.log('[MAIN] Enqueued successfully, outboxId:', outboxId, 'new queue size:', getQueueSize());
      emitToAll('queue:update', { queueSize: getQueueSize() });
      return { ok: true, outboxId };
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
  ipcMain.handle('debug:outbox:list', () => {
    try {
      const items = listOutbox();
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
  ipcMain.handle('rooms:list', async () => {
    const user = getAuthenticatedUser();
    try { console.log('[ROOMS][TRACE] rooms:list role=', user?.role, 'user=', user); } catch {/* ignore */}
    if (!user) return { ok: false, error: 'NOT_AUTHENTICATED' };
    if (!userIsAdmin()) {
      console.warn('[ROOMS][GUARD] Forbidden list attempt role=', user?.role);
      return { ok: false, error: 'FORBIDDEN_ROLE' };
    }
    try {
      const apiBase = process.env.API_BASE_URL || 'http://localhost:8080';
      const cookieHeader = getSessionCookieHeader();
      const res = await axios.get(`${apiBase}/api/bookings/rooms`, { withCredentials: true, headers: cookieHeader ? { Cookie: cookieHeader } : {} });
      return { ok: true, rooms: res.data.rooms || [] };
    } catch (e: any) {
      return { ok: false, error: e?.response?.data?.error || e?.message || 'ROOMS_FETCH_FAILED' };
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
