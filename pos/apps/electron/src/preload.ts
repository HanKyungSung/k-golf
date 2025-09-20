import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('kgolf', {
	ping: () => 'pong'
});

console.log('[PRELOAD] injected');
