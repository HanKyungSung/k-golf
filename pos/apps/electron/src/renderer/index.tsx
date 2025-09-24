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
		if (!(window as any).kgolf) return;
		// Prevent booking if not authenticated
		(window as any).kgolf.getAuthStatus?.().then((s: any) => {
			if (!s?.authenticated) {
				alert('Login first');
				return;
			}
			const now = new Date();
			// Start 5 minutes ahead so backend startTime > now validation passes
			// Use a larger future offset to avoid server 'past time slot' rejections if sync is delayed
			const start = new Date(now.getTime() + 30*60000); // +30 min
			const in30 = new Date(start.getTime() + 60*60000); // 1 hour duration
			(window as any).kgolf?.createBooking?.({
				customerName: 'Test User ' + start.toLocaleTimeString(),
				startsAt: start.toISOString(),
				endsAt: in30.toISOString()
			}).then((res: any) => {
				if (!res?.ok) console.error('Create failed', res?.error);
				refreshQueue();
			});
		});
	});
}
// --- Auth wiring ---
const btnLogin = document.getElementById('btnLogin');
if (btnLogin) {
	btnLogin.addEventListener('click', () => {
		const email = (document.getElementById('loginEmail') as HTMLInputElement).value.trim();
		const password = (document.getElementById('loginPassword') as HTMLInputElement).value;
		const msg = document.getElementById('loginMsg');
		if (msg) msg.textContent = '...';
		(window as any).kgolf?.login?.(email, password).then((res: any) => {
			if (!res?.ok) {
				if (msg) msg.textContent = res.error || 'Login failed';
				return;
			}
			if (msg) msg.textContent = '';
			refreshAuthStatus();
		}).catch((e: any) => { if (msg) msg.textContent = e?.message || 'Err'; });
	});
}

function refreshAuthStatus() {
	(window as any).kgolf?.getAuthStatus?.().then((s: any) => {
		const authStatus = document.getElementById('authStatus');
		const loginForm = document.getElementById('loginForm');
		const authUser = document.getElementById('authUser');
		const authUserEmail = document.getElementById('authUserEmail');
		if (!authStatus) return;
		if (s?.authenticated) {
			authStatus.textContent = 'Auth: authenticated';
			if (loginForm) loginForm.style.display = 'none';
			if (authUser) authUser.style.display = 'block';
			if (authUserEmail) authUserEmail.textContent = (s.user?.email || '') + (s.user?.role ? ` (${s.user.role})` : '');
		} else {
			authStatus.textContent = 'Auth: not authenticated';
			if (loginForm) loginForm.style.display = 'block';
			if (authUser) authUser.style.display = 'none';
		}
	}).catch(()=>{});
}

(window as any).kgolf?.onAuthState?.(() => refreshAuthStatus());
refreshAuthStatus();

(window as any).kgolf?.onQueueUpdate?.((_p: any) => {
	refreshQueue();
});

const btnForce = document.getElementById('btnForceSync');
if (btnForce) {
	btnForce.addEventListener('click', () => {
		const elStatus = document.getElementById('syncResult');
		if (elStatus) elStatus.textContent = 'Syncing...';
		(window as any).kgolf?.forceSync?.().then((res: any) => {
			if (elStatus) elStatus.textContent = `Pushed ${res.pushed}, failures ${res.failures}`;
			refreshQueue();
		}).catch((e: any) => {
			if (elStatus) elStatus.textContent = 'Sync error';
			console.error(e);
		});
	});
}

refreshQueue();

// --- Admin Rooms Panel ---
function minutesToRange(open: number, close: number) {
	const fmt = (n: number) => String(Math.floor(n/60)).padStart(2,'0') + ':' + String(n%60).padStart(2,'0');
	return `${fmt(open)}–${fmt(close)}`;
}

async function loadRooms() {
	const statusEl = document.getElementById('roomsStatus');
	const bodyEl = document.getElementById('roomsTbody');
	if (!statusEl || !bodyEl) return;
	statusEl.textContent = 'Loading...';
	bodyEl.innerHTML = '';
	try {
		const res = await (window as any).kgolf?.listRooms?.();
		if (!res?.ok) {
			statusEl.textContent = res?.error || 'Failed to load rooms';
			return;
		}
		statusEl.textContent = `${res.rooms.length} room(s)`;
		for (const r of res.rooms) {
			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td style="padding:4px;border-bottom:1px solid #eee;">${r.name}</td>
				<td style="padding:4px;border-bottom:1px solid #eee;">${(r.openMinutes!=null&&r.closeMinutes!=null)?minutesToRange(r.openMinutes, r.closeMinutes):'—'}</td>
				<td style="padding:4px;border-bottom:1px solid #eee;">
					<span style="padding:2px 6px;border-radius:4px;background:${r.status==='ACTIVE'?'#d2f8d2':(r.status==='MAINTENANCE'?'#ffe9b3':'#ddd')};color:#222;">${r.status||'ACTIVE'}</span>
				</td>`;
			bodyEl.appendChild(tr);
		}
	} catch (e:any) {
		statusEl.textContent = e?.message || 'Error';
	}
}

function updateAdminVisibility() {
	(window as any).kgolf?.getAuthStatus?.().then((s: any) => {
		const panel = document.getElementById('adminRooms');
		if (!panel) return;
		if (s?.authenticated && s?.user?.role === 'ADMIN') {
			panel.style.display = 'block';
			loadRooms();
		} else {
			panel.style.display = 'none';
		}
	});
}

const btnReloadRooms = document.getElementById('btnReloadRooms');
if (btnReloadRooms) {
	btnReloadRooms.addEventListener('click', () => loadRooms());
}

(window as any).kgolf?.onAuthState?.(() => updateAdminVisibility());
updateAdminVisibility();
