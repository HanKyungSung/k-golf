/**
 * renderer/index.tsx
 * -----------------------------------------
 * Entry script for the renderer bundle (Phase 0 placeholder).
 * For now it only verifies the preload bridge is present. Future phases
 * will mount React components (StatusBar, BookingList, etc.).
 */
console.log('[RENDERER] POS Hub renderer loaded');
const el = document.getElementById('status');
if (el) {
	const pong = (window as any).kgolf?.ping?.() || 'no-bridge';
	el.textContent = 'Renderer script executed. preload ping => ' + pong;
}

function refreshQueue() {
	(window as any).kgolf?.getQueueSize?.().then((r: any) => {
		const q = document.getElementById('queue');
		if (q && r) q.textContent = 'Queue: ' + r.queueSize;
	}).catch(()=>{});
}

const btn = document.getElementById('btnCreate');
if (btn) {
	btn.addEventListener('click', () => {
		const now = new Date();
		const in30 = new Date(now.getTime() + 30*60000);
		(window as any).kgolf?.createBooking?.({
			customerName: 'Test User ' + now.toLocaleTimeString(),
			startsAt: now.toISOString(),
			endsAt: in30.toISOString()
		}).then((res: any) => {
			if (!res?.ok) console.error('Create failed', res?.error);
			refreshQueue();
		});
	});
}

(window as any).kgolf?.onQueueUpdate?.((_p: any) => {
	refreshQueue();
});

refreshQueue();
