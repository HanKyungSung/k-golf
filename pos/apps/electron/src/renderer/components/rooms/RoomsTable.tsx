import React, { useState } from 'react';
import { Room } from '../../types/models';
import { minutesToRange } from '../../utils/time';
import { api } from '../../utils/bridge';

interface Props { rooms: Room[]; onUpdated?: () => void }
export const RoomsTable: React.FC<Props> = ({ rooms, onUpdated }) => {
  const [editing, setEditing] = useState<number|undefined>();
  const [form, setForm] = useState<{ open?: string; close?: string; status?: string; saving?: boolean; error?: string }>({});

  function toHHMM(n?: number) { if (n==null) return ''; const h = Math.floor(n/60); const m = n%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; }
  // Accept both zero-padded and single-digit hour forms (e.g., 9:00, 09:00, 18:30)
  function parseHHMM(v: string) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
    if (!m) return undefined;
    const h = +m[1]; const mm = +m[2];
    if (h > 23 || mm > 59) return undefined;
    return h * 60 + mm;
  }

  async function save(id: number) {
    const openM = form.open ? parseHHMM(form.open) : undefined;
    const closeM = form.close ? parseHHMM(form.close) : undefined;
    if (openM!=null && closeM!=null && openM >= closeM) { setForm(f => ({ ...f, error: 'Close must be after open' })); return; }
    setForm(f => ({ ...f, saving: true, error: undefined }));
    try {
      const patch: any = {};
      if (openM!=null) patch.openMinutes = openM;
      if (closeM!=null) patch.closeMinutes = closeM;
      if (form.status) patch.status = form.status;
      const res = await api()?.updateRoom(id, patch);
      if (!res || !res.ok) {
        setForm(f => ({ ...f, saving:false, error: res?.error || 'Update failed' }));
        return;
      }
      setEditing(undefined); setForm({});
      onUpdated && onUpdated();
    } catch (e:any) {
      setForm(f => ({ ...f, saving:false, error: e?.message || 'Error' }));
    }
  }

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="text-left text-slate-600">
          <th className="border-b border-slate-200 py-2 pr-4">Name</th>
          <th className="border-b border-slate-200 py-2 pr-4">Hours</th>
          <th className="border-b border-slate-200 py-2 pr-4">Status</th>
          <th className="border-b border-slate-200 py-2 pr-4 w-32">Actions</th>
        </tr>
      </thead>
      <tbody>
        {rooms.map(r => {
          const isEditing = editing === r.id;
          return (
            <tr key={r.id} className={isEditing? 'bg-amber-50' : ''}>
              <td className="border-b border-slate-200 p-1.5 align-top">{r.name}</td>
              <td className="border-b border-slate-200 p-1.5 align-top">
                {isEditing ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <input
                        className="border px-1 py-0.5 w-20"
                        placeholder="HH:MM"
                        value={form.open ?? toHHMM(r.openMinutes)}
                        onChange={e => setForm(f => ({ ...f, open: e.target.value }))}
                      />
                      <span className="text-slate-500">to</span>
                      <input
                        className="border px-1 py-0.5 w-20"
                        placeholder="HH:MM"
                        value={form.close ?? toHHMM(r.closeMinutes)}
                        onChange={e => setForm(f => ({ ...f, close: e.target.value }))}
                      />
                    </div>
                  </div>
                ) : (
                  (r.openMinutes!=null&&r.closeMinutes!=null)?minutesToRange(r.openMinutes, r.closeMinutes):'—'
                )}
              </td>
              <td className="border-b border-slate-200 p-1.5 align-top">
                {isEditing ? (
                  <select
                    className="border px-1 py-0.5"
                    value={form.status ?? (r.status || 'ACTIVE')}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                ) : (
                  <span style={{ padding:'2px 6px', borderRadius:4, background: r.status==='ACTIVE'? '#d2f8d2': (r.status==='MAINTENANCE'?'#ffe9b3':'#ddd'), color:'#222' }}>{r.status||'ACTIVE'}</span>
                )}
                {isEditing && form.error && (
                  <div className="text-[10px] text-red-600 mt-1">{form.error}</div>
                )}
              </td>
              <td className="border-b border-slate-200 p-1.5 align-top">
                {isEditing ? (
                  <div className="flex flex-col gap-1">
                    <button disabled={form.saving} onClick={() => save(r.id)} className="bg-emerald-600 text-white px-2 py-0.5 rounded disabled:opacity-50 text-[11px]">{form.saving?'Saving...':'Save'}</button>
                    <button disabled={form.saving} onClick={() => { setEditing(undefined); setForm({}); }} className="text-[11px] px-2 py-0.5 rounded border">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => { setEditing(r.id); setForm({}); }} className="text-[11px] px-2 py-0.5 rounded border">Edit</button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
