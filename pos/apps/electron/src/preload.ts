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
	triggerMenuPull: () => ipcRenderer.invoke('sync:triggerMenuPull'),
	login: (email: string, password: string) => ipcRenderer.invoke('auth:login', { email, password }),
	logout: () => ipcRenderer.invoke('auth:logout'),
	getAuthStatus: () => ipcRenderer.invoke('auth:getStatus'),
	debugListSyncQueue: () => ipcRenderer.invoke('debug:syncQueue:list'),
	updateRoom: (id: number, patch: { openMinutes?: number; closeMinutes?: number; status?: string }) => ipcRenderer.invoke('rooms:update', { id, patch }),
	// Menu operations
	menuGetAll: () => ipcRenderer.invoke('menu:getAll'),
	menuGetByCategory: (category: string) => ipcRenderer.invoke('menu:getByCategory', category),
	menuGetById: (id: string) => ipcRenderer.invoke('menu:getById', id),
	menuCreate: (item: any) => ipcRenderer.invoke('menu:create', item),
	menuUpdate: (id: string, updates: any) => ipcRenderer.invoke('menu:update', id, updates),
	menuDelete: (id: string) => ipcRenderer.invoke('menu:delete', id),
	menuToggleAvailability: (id: string) => ipcRenderer.invoke('menu:toggleAvailability', id),
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
	listRooms: () => ipcRenderer.invoke('rooms:list'),
	onMainLog: (cb: (log: { level: string; message: any[] }) => void) => {
		ipcRenderer.removeAllListeners('main-log');
		ipcRenderer.on('main-log', (_e, payload) => cb(payload));
	}
});

console.log('[PRELOAD] injected');
