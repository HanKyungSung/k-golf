import React from 'react';
import { useAuth } from '../app/authState';
import { RoomsTable } from '../components/rooms/RoomsTable';
import { AppHeader } from '../components/layout/AppHeader';

const DashboardPage: React.FC = () => {
  const { state, queueSize, rooms, loadingRooms, createTestBooking, forceSync, logout, reloadRooms } = useAuth();
  const user = state.user || {};
  const isAdmin = user.role === 'ADMIN';
  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <AppHeader onTest={createTestBooking} onSync={forceSync} />
      <main className="flex-1 overflow-auto p-6 space-y-6">
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <p id="status" className="text-xs text-slate-500 mb-2">Bridge={(window as any).kgolf?.ping?.() || 'no-bridge'}</p>
        </section>
        {isAdmin && (
          <section className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Rooms (Admin)</h3>
              <button onClick={reloadRooms} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded">Reload</button>
            </div>
            <div className="text-xs text-slate-500 mb-2">{loadingRooms ? 'Loading...' : `${rooms.length} room(s)`}</div>
            <div className="overflow-x-auto">
              <RoomsTable rooms={rooms} onUpdated={reloadRooms} />
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
