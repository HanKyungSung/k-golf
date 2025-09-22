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
    ping: () => 'pong'
});
console.log('[PRELOAD] injected');
