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
	enqueue: (type: string, payload: any) => ipcRenderer.invoke('queue:enqueue', { type, payload }),
	forceSync: () => ipcRenderer.invoke('sync:force'),
	login: (email: string, password: string) => ipcRenderer.invoke('auth:login', { email, password }),
	logout: () => ipcRenderer.invoke('auth:logout'),
	getAuthStatus: () => ipcRenderer.invoke('auth:getStatus'),
	debugListOutbox: () => ipcRenderer.invoke('debug:outbox:list'),
	updateRoom: (id: number, patch: { openMinutes?: number; closeMinutes?: number; status?: string }) => ipcRenderer.invoke('rooms:update', { id, patch }),
	onAuthState: (cb: (s: any) => void) => {
		ipcRenderer.removeAllListeners('auth:state');
		ipcRenderer.on('auth:state', (_e, payload) => cb(payload));
	},
	onSync: (cb: (p: any) => void) => {
		ipcRenderer.removeAllListeners('queue:update'); // queue:update covers sync results too
		ipcRenderer.on('queue:update', (_e, payload) => cb(payload));
	},
	onQueueUpdate: (cb: (p: { queueSize: number }) => void) => {
		ipcRenderer.removeAllListeners('queue:update');
		ipcRenderer.on('queue:update', (_e, payload) => cb(payload));
	},
	listRooms: () => ipcRenderer.invoke('rooms:list')
});

console.log('[PRELOAD] injected');
