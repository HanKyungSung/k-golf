/** @jsx h */
/** @jsxFrag Fragment */
import { h, Fragment } from './lib/jsx-runtime';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

type AuthState = { authenticated: boolean; user?: { email?: string; role?: string } };
interface Room { id: number; name: string; openMinutes?: number; closeMinutes?: number; status?: string; }

let auth: AuthState = { authenticated: false };
let rooms: Room[] = [];
let loadingRooms = false;

const root = document.getElementById('app')!;

function setContent(node: HTMLElement | DocumentFragment) {
  root.innerHTML = '';
  root.appendChild(node);
}

function fetchRoomsIfNeeded() {
  if (!auth.authenticated || auth.user?.role !== 'ADMIN') { rooms = []; return; }
  loadingRooms = true;
  render();
  (window as any).kgolf?.listRooms?.().then((res: any) => {
    if (res?.ok) rooms = res.rooms;
  }).finally(() => { loadingRooms = false; render(); });
}

function createBooking() {
  (window as any).kgolf?.getAuthStatus?.().then((s: any) => {
    if (!s?.authenticated) return alert('Login first');
    const now = new Date();
    const start = new Date(now.getTime() + 30 * 60000);
    const end = new Date(start.getTime() + 60 * 60000);
    (window as any).kgolf?.createBooking?.({
      customerName: 'Test User ' + start.toLocaleTimeString(),
      startsAt: start.toISOString(),
      endsAt: end.toISOString()
    }).then(() => updateQueue());
  });
}

function forceSync() {
  const syncEl = document.getElementById('syncResult');
  if (syncEl) syncEl.textContent = 'Syncing...';
  (window as any).kgolf?.forceSync?.().then((res: any) => {
    if (syncEl) syncEl.textContent = `Pushed ${res.pushed}, failures ${res.failures}`;
    updateQueue();
  }).catch(() => { if (syncEl) syncEl.textContent = 'Sync error'; });
}

function updateQueue() {
  (window as any).kgolf?.getQueueSize?.().then((r: any) => {
    const q = document.getElementById('queue');
    if (q && r) q.textContent = 'Queue: ' + r.queueSize;
  });
}

function doLogin(email: string, password: string) {
  (window as any).kgolf?.login?.(email, password).then((res: any) => {
    const msg = document.getElementById('loginMsg');
    if (!res?.ok) {
      if (msg) msg.textContent = res.error || 'Login failed';
      return;
    }
    if (msg) msg.textContent = '';
    refreshAuth();
  }).catch((e: any) => {
    const msg = document.getElementById('loginMsg');
    if (msg) msg.textContent = e?.message || 'Err';
  });
}

function logout() {
  try { (window as any).kgolf?.logout?.(); } catch {}
  auth = { authenticated: false };
  render();
}

function render() {
  if (!auth.authenticated) {
    setContent(LoginPage({ onSubmit: doLogin }));
    return;
  }
  const email = auth.user?.email || '';
  const role = auth.user?.role || '';
  setContent(DashboardPage({
    authEmail: email,
    role,
    queueSize: 0,
    onCreateTest: createBooking,
    onForceSync: forceSync,
    onLogout: logout,
    onReloadRooms: fetchRoomsIfNeeded,
    rooms,
    loadingRooms,
    showRooms: role === 'ADMIN'
  }));
  updateQueue();
  if (role === 'ADMIN' && !loadingRooms && rooms.length === 0) fetchRoomsIfNeeded();
  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.textContent = 'Bridge=' + ((window as any).kgolf?.ping?.() || 'no-bridge');
}

function refreshAuth() {
  (window as any).kgolf?.getAuthStatus?.().then((s: AuthState) => {
    auth = s || { authenticated: false };
    render();
  });
}

(window as any).kgolf?.onAuthState?.(() => refreshAuth());
(window as any).kgolf?.onQueueUpdate?.(() => updateQueue());

render();
refreshAuth();
