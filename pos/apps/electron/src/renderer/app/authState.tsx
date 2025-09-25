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
  api()?.onQueueUpdate(() => loadQueue());
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
    const start = new Date(now.getTime() + 30*60000);
    const end = new Date(start.getTime() + 60*60000);
  await api()?.createBooking({ customerName: 'Test User ' + start.toLocaleTimeString(), startsAt: start.toISOString(), endsAt: end.toISOString() });
    loadQueue();
  }
  async function forceSync() {
    const el = document.getElementById('syncResult'); if (el) el.textContent = 'Syncing...';
  try { const res = await api()?.forceSync(); if (res && el) el.textContent = `Pushed ${res.pushed}, failures ${res.failures}`; loadQueue(); } catch { if (el) el.textContent = 'Sync error'; }
  }

  const value: AuthContextValue = { state, queueSize, rooms, loadingRooms, login, logout, createTestBooking, forceSync, reloadRooms };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth must be inside AuthProvider'); return ctx; }
