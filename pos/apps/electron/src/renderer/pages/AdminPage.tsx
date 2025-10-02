import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../app/authState';
import { Button } from '../components/common/Button';
import { api } from '../utils/bridge';
import { Room } from '../types/models';
import { Link, Navigate } from 'react-router-dom';

interface EditableRoomState {
  id: number;
  name: string;
  openMinutes: number;
  closeMinutes: number;
  originalOpen: number;
  originalClose: number;
  status?: string;
  dirty: boolean;
  saving?: boolean;
  error?: string;
  conflict?: boolean; // simulated shrink guard conflict
}

function minutesToHHMM(m: number | undefined): string {
  if (typeof m !== 'number' || isNaN(m)) return '09:00';
  const h = Math.floor(m / 60); const mm = m % 60; return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
}
function parseHHMM(v: string): number | null {
  if (!/^\d{1,2}:\d{2}$/.test(v)) return null;
  const [h, m] = v.split(':').map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h*60 + m;
}

export default function AdminPage() {
  const { state, rooms, reloadRooms } = useAuth();
  const user = state.user || {};
  const isAdmin = user.role === 'ADMIN';

  // Redirect non-admins back to dashboard
  if (state.authenticated && !isAdmin) return <Navigate to="/" replace />;

  const [editable, setEditable] = useState<EditableRoomState[]>([]);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);

  // Initialize editable state when rooms change
  useEffect(() => {
    const next: EditableRoomState[] = rooms.map((r: Room) => {
      const open = typeof r.openMinutes === 'number' ? r.openMinutes : 540; // 09:00 fallback
      const close = typeof r.closeMinutes === 'number' ? r.closeMinutes : 1320; // 22:00 fallback
      return {
        id: r.id,
        name: r.name,
        openMinutes: open,
        closeMinutes: close,
        originalOpen: open,
        originalClose: close,
        status: r.status,
        dirty: false,
      };
    });
    setEditable(next);
  }, [rooms]);

  const dirtyCount = useMemo(() => editable.filter(r => r.dirty).length, [editable]);

  function updateRoomField(id: number, field: 'open' | 'close', value: string) {
    setEditable(list => list.map(r => {
      if (r.id !== id) return r;
      const parsed = parseHHMM(value);
      if (parsed === null) return r; // ignore invalid input (could enhance with inline validation)
      const next: EditableRoomState = { ...r, [field === 'open' ? 'openMinutes' : 'closeMinutes']: parsed } as any;
      next.dirty = (next.openMinutes !== next.originalOpen) || (next.closeMinutes !== next.originalClose);
      return next;
    }));
  }

  async function saveChanges() {
    setGlobalMessage(null);
    const targets = editable.filter(r => r.dirty);
    if (!targets.length) { setGlobalMessage('No changes to save.'); return; }
    // Simulate shrink guard conflict: if narrowing by > 60 minutes total window reduction, mark conflict 30% chance.
    setEditable(list => list.map(r => r.dirty ? { ...r, saving: true, error: undefined, conflict: false } : r));
    let hadConflict = false; let hadError = false;
    for (const room of targets) {
      const oldSpan = room.originalClose - room.originalOpen;
      const newSpan = room.closeMinutes - room.openMinutes;
      const narrowed = newSpan < oldSpan && (oldSpan - newSpan) > 60;
      const simulateConflict = narrowed && Math.random() < 0.3; // mock
      if (simulateConflict) { hadConflict = true; setEditable(list => list.map(r => r.id === room.id ? { ...r, saving: false, conflict: true, error: 'Shrink guard: potential future booking conflict (mock). Force override flow TBD.' } : r)); continue; }
      try {
        const res: any = await api()?.updateRoom(room.id, { openMinutes: room.openMinutes, closeMinutes: room.closeMinutes });
        if (!res?.ok) {
          hadError = true;
          setEditable(list => list.map(r => r.id === room.id ? { ...r, saving: false, error: res?.error || 'Update failed' } : r));
        } else {
          setEditable(list => list.map(r => r.id === room.id ? { ...r, saving: false, originalOpen: room.openMinutes, originalClose: room.closeMinutes, dirty: false } : r));
        }
      } catch (e: any) {
        hadError = true;
        setEditable(list => list.map(r => r.id === room.id ? { ...r, saving: false, error: e?.message || 'Error' } : r));
      }
    }
    if (hadConflict) setGlobalMessage('Some changes blocked by shrink guard (simulated).');
    else if (hadError) setGlobalMessage('Some changes failed.');
    else setGlobalMessage('All changes saved.');
    reloadRooms();
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Admin • Room Hours</h1>
          <Link to="/" className="text-xs text-blue-600 hover:underline">Back to Dashboard</Link>
        </div>
        <div className="flex items-center gap-3">
          <Button disabled={!dirtyCount} onClick={saveChanges}>{dirtyCount ? `Save ${dirtyCount} Change(s)` : 'No Changes'}</Button>
        </div>
      </div>
      <main className="flex-1 overflow-auto p-6 space-y-6">
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 text-sm leading-relaxed">
          <strong>Shrink Guard (Prototype):</strong> Narrowing a room's hours that would invalidate existing future bookings is blocked. This view currently simulates conflicts (no booking data exposed yet). A future iteration will show a preview of impacted bookings and allow a forced override with audit trail.
        </div>
        {globalMessage && (
          <div className="rounded-md p-3 text-sm font-medium bg-slate-900 text-white inline-block">{globalMessage}</div>
        )}
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold mb-4 text-slate-800">Room Operating Windows</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 border-b border-slate-200">
                  <th className="py-2 pr-4">Room</th>
                  <th className="py-2 pr-4">Open</th>
                  <th className="py-2 pr-4">Close</th>
                  <th className="py-2 pr-4">Span (h)</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Dirty</th>
                  <th className="py-2 pr-4">Result</th>
                </tr>
              </thead>
              <tbody>
                {editable.map(r => {
                  const spanHours = ((r.closeMinutes - r.openMinutes)/60).toFixed(2);
                  return (
                    <tr key={r.id} className="border-b last:border-b-0 border-slate-100">
                      <td className="py-2 pr-4 font-medium text-slate-800">{r.name}</td>
                      <td className="py-2 pr-4">
                        <input
                          defaultValue={minutesToHHMM(r.openMinutes)}
                          onBlur={e => updateRoomField(r.id,'open', e.target.value)}
                          className="w-24 px-2 py-1 rounded border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label={`Open time for ${r.name}`}
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          defaultValue={minutesToHHMM(r.closeMinutes)}
                          onBlur={e => updateRoomField(r.id,'close', e.target.value)}
                          className="w-24 px-2 py-1 rounded border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label={`Close time for ${r.name}`}
                        />
                      </td>
                      <td className="py-2 pr-4 tabular-nums text-slate-700">{spanHours}</td>
                      <td className="py-2 pr-4 text-slate-600 capitalize">{r.status || '—'}</td>
                      <td className="py-2 pr-4">
                        {r.dirty && !r.saving && <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded">Modified</span>}
                        {r.saving && <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded animate-pulse">Saving…</span>}
                      </td>
                      <td className="py-2 pr-4 text-xs w-64">
                        {r.error && <span className="text-red-600">{r.error}</span>}
                        {!r.error && r.conflict && <span className="text-amber-600">Shrink blocked</span>}
                        {!r.error && !r.conflict && !r.dirty && !r.saving && <span className="text-slate-400">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button disabled={!dirtyCount} onClick={saveChanges}>
              {dirtyCount ? `Save ${dirtyCount} Change${dirtyCount>1?'s':''}` : 'No Changes'}
            </Button>
            <Button variant="ghost" onClick={() => reloadRooms()}>Reload Rooms</Button>
          </div>
        </section>
      </main>
    </div>
  );
}
