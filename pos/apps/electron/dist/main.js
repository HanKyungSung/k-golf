"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const db_1 = require("./core/db");
const bookings_1 = require("./core/bookings");
const outbox_1 = require("./core/outbox");
const sync_1 = require("./core/sync");
const auth_1 = require("./core/auth");
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
async function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    // Maximize by default for POS terminal usage
    try {
        win.maximize();
    }
    catch { /* ignore */ }
    console.log('[MAIN] BrowserWindow created. Dev mode:', !!process.env.ELECTRON_DEV);
    // Always load the copied HTML in dist so that ./index.js (compiled from index.tsx) resolves.
    const distHtml = path_1.default.join(__dirname, 'renderer', 'index.html');
    if (fs_1.default.existsSync(distHtml)) {
        await win.loadFile(distHtml);
    }
    else {
        console.error('[MAIN] dist renderer HTML missing at', distHtml);
        await win.loadURL('data:text/html,<h1>Renderer HTML not found</h1>');
    }
}
app.whenReady().then(() => {
    const { path: dbPath, newlyCreated } = (0, db_1.initDb)();
    console.log('[MAIN] DB initialized at', dbPath, 'new?', newlyCreated);
    createWindow();
    // IPC handlers (Phase 0.4 temporary minimal wiring)
    function userHasStaffRole() {
        const u = (0, auth_1.getAuthenticatedUser)();
        return !!u && (u.role === 'ADMIN' || u.role === 'STAFF');
    }
    ipcMain.handle('booking:create', (_evt, payload) => {
        const user = (0, auth_1.getAuthenticatedUser)();
        if (!user)
            return { ok: false, error: 'NOT_AUTHENTICATED' };
        if (!userHasStaffRole())
            return { ok: false, error: 'FORBIDDEN_ROLE' };
        try {
            // Basic validation (minimal)
            if (!payload || !payload.customerName || !payload.startsAt || !payload.endsAt) {
                throw new Error('Missing fields');
            }
            const result = (0, bookings_1.enqueueBooking)({
                customerName: String(payload.customerName),
                startsAt: String(payload.startsAt),
                endsAt: String(payload.endsAt)
            });
            emitToAll('queue:update', { queueSize: result.queueSize });
            emitToAll('booking:created', { id: result.bookingId, ...payload });
            return { ok: true, ...result };
        }
        catch (e) {
            return { ok: false, error: e.message };
        }
    });
    ipcMain.handle('queue:getSize', () => ({ queueSize: (0, outbox_1.getQueueSize)() }));
    ipcMain.handle('sync:force', async () => {
        if (!(0, auth_1.getAuthenticatedUser)())
            return { pushed: 0, failures: 1, remaining: 0, error: 'NOT_AUTHENTICATED' };
        if (!((0, auth_1.getAuthenticatedUser)()?.role === 'ADMIN' || (0, auth_1.getAuthenticatedUser)()?.role === 'STAFF')) {
            return { pushed: 0, failures: 1, remaining: 0, error: 'FORBIDDEN_ROLE' };
        }
        const apiBase = process.env.API_BASE_URL || 'http://localhost:8080';
        const res = await (0, sync_1.processSyncCycle)(apiBase);
        emitToAll('queue:update', { queueSize: (0, outbox_1.getQueueSize)(), sync: res });
        return res;
    });
    ipcMain.handle('auth:login', async (_evt, creds) => {
        const apiBase = process.env.API_BASE_URL || 'http://localhost:8080';
        try {
            const res = await axios_1.default.post(`${apiBase}/api/auth/login`, { email: creds.email, password: creds.password }, { withCredentials: true });
            (0, auth_1.setSessionCookies)(res.headers['set-cookie']);
            // For now backend sets httpOnly cookie session; treat session presence as auth.
            const user = res.data.user;
            (0, auth_1.setAuthenticatedUser)(user);
            // Placeholder: no access token yet (session cookie used). If future endpoint returns tokens, setAccessToken(...)
            emitToAll('auth:state', { authenticated: true, user });
            return { ok: true, user };
        }
        catch (e) {
            return { ok: false, error: e?.response?.data?.message || e?.message || 'Login failed' };
        }
    });
    ipcMain.handle('auth:getStatus', async () => {
        return { authenticated: !!(0, auth_1.getAuthenticatedUser)(), user: (0, auth_1.getAuthenticatedUser)() };
    });
    ipcMain.handle('rooms:list', async () => {
        const user = (0, auth_1.getAuthenticatedUser)();
        if (!user)
            return { ok: false, error: 'NOT_AUTHENTICATED' };
        if (user.role !== 'ADMIN')
            return { ok: false, error: 'FORBIDDEN_ROLE' };
        try {
            const apiBase = process.env.API_BASE_URL || 'http://localhost:8080';
            const cookieHeader = (0, auth_1.getSessionCookieHeader)();
            const res = await axios_1.default.get(`${apiBase}/api/bookings/rooms`, { withCredentials: true, headers: cookieHeader ? { Cookie: cookieHeader } : {} });
            return { ok: true, rooms: res.data.rooms || [] };
        }
        catch (e) {
            return { ok: false, error: e?.response?.data?.error || e?.message || 'ROOMS_FETCH_FAILED' };
        }
    });
    // Silent session check (cookie based) after window created
    setTimeout(async () => {
        try {
            const apiBase = process.env.API_BASE_URL || 'http://localhost:8080';
            // Attempt with stored cookies if any
            const cookieHeader = (0, auth_1.getSessionCookieHeader)();
            const res = await axios_1.default.get(`${apiBase}/api/auth/me`, { withCredentials: true, headers: cookieHeader ? { Cookie: cookieHeader } : {} });
            if (res.data?.user) {
                (0, auth_1.setAuthenticatedUser)(res.data.user);
                emitToAll('auth:state', { authenticated: true, user: res.data.user });
            }
            else {
                emitToAll('auth:state', { authenticated: false });
            }
        }
        catch {
            emitToAll('auth:state', { authenticated: false });
        }
    }, 1000);
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
    if (process.env.ELECTRON_DEV) {
        const [win] = BrowserWindow.getAllWindows();
        win?.webContents.openDevTools({ mode: 'detach' });
    }
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        app.quit();
});
function emitToAll(channel, payload) {
    for (const w of BrowserWindow.getAllWindows()) {
        try {
            w.webContents.send(channel, payload);
        }
        catch { /* ignore */ }
    }
}
