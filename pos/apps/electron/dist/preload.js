"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * preload.ts
 * -----------------------------------------
 * Secure bridge layer between renderer and main processes.
 * Exposes a minimal, whitelisted API surface on window.kgolf.
 *
 * Phase 0: Only a ping() test method.
 * Phase 0.4+: Will expose booking enqueue, queue status, auth refresh, sync trigger, etc.
 *
 * NOTE: Keep this file small; add new methods via contextBridge with explicit types.
 */
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('kgolf', {
    ping: () => 'pong',
    createBooking: (data) => electron_1.ipcRenderer.invoke('booking:create', data),
    getQueueSize: () => electron_1.ipcRenderer.invoke('queue:getSize'),
    onQueueUpdate: (cb) => {
        electron_1.ipcRenderer.removeAllListeners('queue:update');
        electron_1.ipcRenderer.on('queue:update', (_e, payload) => cb(payload));
    }
});
console.log('[PRELOAD] injected');
