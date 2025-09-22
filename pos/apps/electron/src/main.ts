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
import { initDb } from './core/db';
import path from 'path';
import fs from 'fs';

async function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
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
