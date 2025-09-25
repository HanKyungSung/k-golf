import React from 'react';
import { useAuth } from '../../app/authState';
import { Button } from '../common/Button';

interface Props { onTest(): void; onSync(): void; }
export const AppHeader: React.FC<Props> = ({ onTest, onSync }) => {
  const { state, queueSize, logout } = useAuth();
  const user = state.user || {};
  return (
    <header className="w-full px-6 py-3 bg-white/80 backdrop-blur border-b border-slate-200 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">POS Hub</h2>
        <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600" id="authUserEmail">{user.email}{user.role ? ` (${user.role})` : ''}</span>
        <span id="queue" className="text-[11px] px-2 py-1 bg-slate-100 rounded">Queue: {queueSize}</span>
      </div>
      <div className="flex items-center gap-2 text-xs" id="topStats">
        <Button variant="secondary" onClick={onTest}>Test Booking</Button>
        <Button onClick={onSync}>Force Sync</Button>
        <Button variant="ghost" onClick={logout}>Logout</Button>
        <span id="syncResult" className="text-slate-500 ml-2"></span>
      </div>
    </header>
  );
};
