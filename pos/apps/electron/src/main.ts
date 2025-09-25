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
const { app, BrowserWindow, ipcMain } = require('electron');
import { initDb } from './core/db';
import { enqueueBooking } from './core/bookings';
import { getQueueSize } from './core/outbox';
import { processSyncCycle } from './core/sync';
import { setAccessToken, saveRefreshToken, loadRefreshToken, setAuthenticatedUser, getAuthenticatedUser, setSessionCookies, getSessionCookieHeader } from './core/auth';
import axios from 'axios';
import path from 'path';
import fs from 'fs';

async function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Using CommonJS build for renderer; enable nodeIntegration temporarily until bundler/ESM split.
      nodeIntegration: true,
      contextIsolation: true,
      sandbox: false
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

app.whenReady().then(() => {
  const { path: dbPath, newlyCreated } = initDb();
  console.log('[MAIN] DB initialized at', dbPath, 'new?', newlyCreated);
  createWindow();
  // IPC handlers (Phase 0.4 temporary minimal wiring)
  function userHasStaffRole() {
    const u = getAuthenticatedUser();
    return !!u && (u.role === 'ADMIN' || u.role === 'STAFF');
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
  ipcMain.handle('sync:force', async () => {
    if (!getAuthenticatedUser()) return { pushed: 0, failures: 1, remaining: 0, error: 'NOT_AUTHENTICATED' };
    if (!(getAuthenticatedUser()?.role === 'ADMIN' || getAuthenticatedUser()?.role === 'STAFF')) {
      return { pushed: 0, failures: 1, remaining: 0, error: 'FORBIDDEN_ROLE' };
    }
    const apiBase = process.env.API_BASE_URL || 'http://localhost:8080';
    const res = await processSyncCycle(apiBase);
    emitToAll('queue:update', { queueSize: getQueueSize(), sync: res });
    return res;
  });
  ipcMain.handle('auth:login', async (_evt: any, creds: { email: string; password: string }) => {
    const apiBase = process.env.API_BASE_URL || 'http://localhost:8080';
    try {
  const res = await axios.post(`${apiBase}/api/auth/login`, { email: creds.email, password: creds.password }, { withCredentials: true });
  setSessionCookies(res.headers['set-cookie']);
      // For now backend sets httpOnly cookie session; treat session presence as auth.
      const user = res.data.user;
      setAuthenticatedUser(user);
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
  ipcMain.handle('rooms:list', async () => {
    const user = getAuthenticatedUser();
    if (!user) return { ok: false, error: 'NOT_AUTHENTICATED' };
    if (user.role !== 'ADMIN') return { ok: false, error: 'FORBIDDEN_ROLE' };
    try {
      const apiBase = process.env.API_BASE_URL || 'http://localhost:8080';
      const cookieHeader = getSessionCookieHeader();
      const res = await axios.get(`${apiBase}/api/bookings/rooms`, { withCredentials: true, headers: cookieHeader ? { Cookie: cookieHeader } : {} });
      return { ok: true, rooms: res.data.rooms || [] };
    } catch (e: any) {
      return { ok: false, error: e?.response?.data?.error || e?.message || 'ROOMS_FETCH_FAILED' };
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
    win?.webContents.openDevTools({ mode: 'detach' });
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
