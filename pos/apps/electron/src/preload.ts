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
import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('kgolf', {
	ping: () => 'pong'
});

console.log('[PRELOAD] injected');
