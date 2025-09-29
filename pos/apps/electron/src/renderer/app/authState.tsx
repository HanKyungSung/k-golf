import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthState, Room } from '../types/models';
import { api } from '../utils/bridge';
type User = AuthState['user'];

interface AuthContextValue {
  state: AuthState;
  queueSize: number;
  rooms: Room[];
  loadingRooms: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  createTestBooking(): Promise<void>;
  forceSync(): Promise<void>;
  reloadRooms(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({ authenticated: false });
  const [queueSize, setQueueSize] = useState(0);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const prevAuthRef = React.useRef<boolean>(false);

  const refreshAuth = useCallback(async () => {
    try {
      const s = await api()?.getAuthStatus();
      const next = s || { authenticated:false };
      // Detect transition from authenticated -> unauthenticated
      if (prevAuthRef.current && !next.authenticated) {
        window.dispatchEvent(new CustomEvent('auth-expired'));
      }
      prevAuthRef.current = !!next.authenticated;
      setState(next);
    } catch {
      if (prevAuthRef.current) window.dispatchEvent(new CustomEvent('auth-expired'));
      prevAuthRef.current = false;
      setState({ authenticated:false });
    }
  }, []);

  const loadQueue = useCallback(async () => {
    try { const r = await api()?.getQueueSize(); if (r) setQueueSize(r.queueSize); } catch {}
  }, []);

  const reloadRooms = useCallback(async () => {
    if (!state.authenticated || state.user?.role !== 'ADMIN') { setRooms([]); return; }
    setLoadingRooms(true);
    try { const res = await api()?.listRooms(); if (res?.ok) setRooms(res.rooms); } finally { setLoadingRooms(false); }
  }, [state]);

  useEffect(() => {
    api()?.onAuthState(() => refreshAuth());
    // Use broader onSync listener so we can see sync cycle payloads (includes queue:update events)
    api()?.onSync((payload: any) => {
      try {
        if (typeof payload?.queueSize === 'number') setQueueSize(payload.queueSize);
        if (payload?.sync) {
          // eslint-disable-next-line no-console
          console.log('[SYNC][RENDERER] cycle result', payload.sync);
        }
      } catch {/* ignore */}
    });
    refreshAuth();
    loadQueue();
  }, [refreshAuth, loadQueue]);

  useEffect(() => { if (state.authenticated && state.user?.role === 'ADMIN') reloadRooms(); }, [state, reloadRooms]);

  async function login(email: string, password: string) {
  const res = await api()?.login(email, password);
  if (!res || !res.ok) throw new Error(res?.error || 'Login failed');
  await refreshAuth();
  }
  async function logout() { try { await api()?.logout(); } catch {}; await refreshAuth(); }
  async function createTestBooking() {
    if (!state.authenticated) return;
    const now = new Date();
    // Derive operating window heuristics (fallback to 09:00-19:00 local) using first admin room if available
    let openMinutes = 540; // 09:00
    let closeMinutes = 1140; // 19:00
    if (rooms && rooms.length) {
      // Use first active room as heuristic
      const r: any = rooms[0];
      if (typeof r.openMinutes === 'number') openMinutes = r.openMinutes;
      if (typeof r.closeMinutes === 'number') closeMinutes = r.closeMinutes;
    }
    const minutesFromMidnight = (d: Date) => d.getHours()*60 + d.getMinutes();
    const todayMinutes = minutesFromMidnight(now);
    const durationMinutes = 60; // 1 hour test booking
    // Choose a start inside window with at least 30m lead; if late, schedule tomorrow inside window
    let targetDate = new Date(now);
    let startMinutesCandidate = Math.max(openMinutes + 30, todayMinutes + 30); // ensure 30m lead and after open
    if (startMinutesCandidate + durationMinutes > closeMinutes) {
      // push to tomorrow
      targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      startMinutesCandidate = openMinutes + 30; // open + 30 tomorrow
    }
    const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), Math.floor(startMinutesCandidate/60), startMinutesCandidate%60, 0, 0);
    const end = new Date(start.getTime() + durationMinutes*60000);
    await api()?.createBooking({ customerName: 'Test User ' + start.toLocaleTimeString(), startsAt: start.toISOString(), endsAt: end.toISOString() });
    loadQueue();
  }
  async function forceSync() {
    const el = document.getElementById('syncResult');
    if (el) el.textContent = 'Syncing...';
    try {
      const res: any = await api()?.forceSync();
      if (res) {
        if (el) el.textContent = `Pushed ${res.pushed}, failures ${res.failures}${res.lastError ? ' ('+res.lastError.code+')' : ''}`;
        // eslint-disable-next-line no-console
        console.log('[SYNC][RENDERER] forceSync result', res);
      }
      loadQueue();
    } catch {
      if (el) el.textContent = 'Sync error';
    }
  }

  const value: AuthContextValue = { state, queueSize, rooms, loadingRooms, login, logout, createTestBooking, forceSync, reloadRooms };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth must be inside AuthProvider'); return ctx; }
