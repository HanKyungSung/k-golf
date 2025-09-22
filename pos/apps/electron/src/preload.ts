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
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('kgolf', {
	ping: () => 'pong',
	createBooking: (data: { customerName: string; startsAt: string; endsAt: string }) => ipcRenderer.invoke('booking:create', data),
	getQueueSize: () => ipcRenderer.invoke('queue:getSize'),
	onQueueUpdate: (cb: (p: { queueSize: number }) => void) => {
		ipcRenderer.removeAllListeners('queue:update');
		ipcRenderer.on('queue:update', (_e, payload) => cb(payload));
	}
});

console.log('[PRELOAD] injected');
