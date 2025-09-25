/** DashboardPage.tsx */
/** @jsx h */
/** @jsxFrag Fragment */
import { h, Fragment } from '../lib/jsx-runtime';

export interface DashboardPageProps {
  authEmail: string;
  role: string;
  queueSize: number;
  onCreateTest(): void;
  onForceSync(): void;
  onLogout(): void;
  onReloadRooms(): void;
  rooms: Array<{ id: number; name: string; openMinutes?: number; closeMinutes?: number; status?: string }>;
  loadingRooms: boolean;
  showRooms: boolean;
}

function minutesToRange(open: number, close: number) {
  const fmt = (n: number) => String(Math.floor(n/60)).padStart(2,'0') + ':' + String(n%60).padStart(2,'0');
  return `${fmt(open)}–${fmt(close)}`;
}

export function DashboardPage(p: DashboardPageProps) {
  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <header className="w-full px-6 py-3 bg-white/80 backdrop-blur border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">POS Hub</h2>
          <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600" id="authUserEmail">{p.authEmail}{p.role ? ` (${p.role})` : ''}</span>
        </div>
        <div className="flex items-center gap-4 text-xs" id="topStats">
          <span id="queue" className="px-2 py-1 bg-slate-100 rounded">Queue: {p.queueSize}</span>
          <button id="btnCreate" className="text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded" onclick={p.onCreateTest}>Test Booking</button>
          <button id="btnForceSync" className="text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-3 py-1.5 rounded" onclick={p.onForceSync}>Force Sync</button>
          <button id="btnLogout" className="text-slate-600 hover:text-slate-900" onclick={p.onLogout}>Logout</button>
          <span id="syncResult" className="text-slate-500"></span>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-6 space-y-6">
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <p id="status" className="text-xs text-slate-500 mb-2">Bridge init...</p>
        </section>
        {p.showRooms && (
          <section id="adminRooms" className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Rooms (Admin)</h3>
              <button id="btnReloadRooms" className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded" onclick={p.onReloadRooms}>Reload</button>
            </div>
            <div id="roomsStatus" className="text-xs text-slate-500 mb-2">{p.loadingRooms ? 'Loading...' : `${p.rooms.length} room(s)`}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="border-b border-slate-200 py-2 pr-4">Name</th>
                    <th className="border-b border-slate-200 py-2 pr-4">Hours</th>
                    <th className="border-b border-slate-200 py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody id="roomsTbody" className="align-top">
                  {p.rooms.map(r => (
                    <tr>
                      <td style="padding:4px;border-bottom:1px solid #eee;">{r.name}</td>
                      <td style="padding:4px;border-bottom:1px solid #eee;">{(r.openMinutes!=null&&r.closeMinutes!=null)?minutesToRange(r.openMinutes, r.closeMinutes):'—'}</td>
                      <td style="padding:4px;border-bottom:1px solid #eee;">
                        <span style={`padding:2px 6px;border-radius:4px;background:${r.status==='ACTIVE'?'#d2f8d2':(r.status==='MAINTENANCE'?'#ffe9b3':'#ddd')};color:#222;`}>{r.status||'ACTIVE'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
