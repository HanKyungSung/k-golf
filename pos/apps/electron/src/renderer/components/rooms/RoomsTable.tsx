import React from 'react';
import { Room } from '../../types/models';
import { minutesToRange } from '../../utils/time';

interface Props { rooms: Room[] }
export const RoomsTable: React.FC<Props> = ({ rooms }) => (
  <table className="w-full text-xs border-collapse">
    <thead>
      <tr className="text-left text-slate-600">
        <th className="border-b border-slate-200 py-2 pr-4">Name</th>
        <th className="border-b border-slate-200 py-2 pr-4">Hours</th>
        <th className="border-b border-slate-200 py-2 pr-4">Status</th>
      </tr>
    </thead>
    <tbody>
      {rooms.map(r => (
        <tr key={r.id}>
          <td className="border-b border-slate-200 p-1.5">{r.name}</td>
          <td className="border-b border-slate-200 p-1.5">{(r.openMinutes!=null&&r.closeMinutes!=null)?minutesToRange(r.openMinutes, r.closeMinutes):'—'}</td>
          <td className="border-b border-slate-200 p-1.5">
            <span style={{ padding:'2px 6px', borderRadius:4, background: r.status==='ACTIVE'? '#d2f8d2': (r.status==='MAINTENANCE'?'#ffe9b3':'#ddd'), color:'#222' }}>{r.status||'ACTIVE'}</span>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);
