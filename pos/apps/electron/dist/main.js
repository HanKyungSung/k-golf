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
const { app, BrowserWindow } = require('electron');
const db_1 = require("./core/db");
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
