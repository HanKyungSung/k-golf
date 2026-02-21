import React, { useState, useEffect } from 'react';
import { useAuth } from '../../app/authState';
import { Button } from '../common/Button';
import { VENUE_TIMEZONE } from '../../utils/timezone';

// @ts-ignore - Import VERSION.txt to get version
import version from '../../VERSION.txt';

interface Props { onTest(): void; onSync(): void; }
export const AppHeader: React.FC<Props> = ({ onTest, onSync }) => {
  const { state, queueSize, logout } = useAuth();
  const user = state.user || {};
  const queueBadgeClasses = queueSize > 0
    ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
    : 'bg-slate-700/50 text-slate-300 border-slate-600';

  // Current datetime for visualization
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second
    
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="w-full bg-slate-900/80 backdrop-blur-sm border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left Cluster: Brand + User + Queue */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent tracking-tight select-none">K one Golf</h1>
            <span className="text-[11px] uppercase tracking-wide text-slate-400 hidden sm:inline">Admin</span>
          </div>
          <div className="hidden sm:block w-px self-stretch bg-slate-700/80" />
          <span
            id="authUserEmail"
            className="text-[11px] px-2 py-1 rounded border border-slate-600 bg-slate-800/60 text-slate-300 max-w-[180px] truncate"
            title={user.email || ''}
          >
            {user.email}{user.role ? ` (${user.role})` : ''}
          </span>
          <span
            id="queue"
            className={`text-[11px] px-2 py-1 rounded border font-medium transition-colors ${queueBadgeClasses}`}
          >
            Queue: {queueSize}
          </span>
          <span
            id="current-datetime"
            className="text-[11px] px-2 py-1 rounded border border-slate-600 bg-slate-800/60 text-slate-300 font-mono"
            title="Current local time"
          >
            {currentTime.toLocaleDateString('en-US', { timeZone: VENUE_TIMEZONE, month: 'short', day: 'numeric' })} {currentTime.toLocaleTimeString('en-US', { timeZone: VENUE_TIMEZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </span>
          <span
            id="app-version"
            className="text-[11px] px-2 py-1 rounded border border-slate-600 bg-slate-800/60 text-slate-400 font-mono"
            title="Application version"
          >
            v{version.trim()}
          </span>
        </div>

        {/* Right Cluster: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0" id="topStats">
            <Button variant="secondary" onClick={onTest} className="text-xs h-8">Test Booking</Button>
            <Button onClick={onSync} className="text-xs h-8">Force Sync</Button>
            <Button variant="ghost" onClick={logout} className="text-xs h-8">Logout</Button>
        </div>
      </div>
    </header>
  );
};
