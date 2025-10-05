import React, { useMemo, useState, createContext, useContext } from 'react';
import { useAuth } from '../app/authState';
import { AppHeader } from '../components/layout/AppHeader';
import { useNavigate } from 'react-router-dom';
import { useBookingData } from '../app/bookingContext';

// Types now provided by context (imported through hook). Keeping utility code local.

// ---------------- Utilities ----------------
const timeSlots = Array.from({ length: (22 - 9) * 2 + 1 }, (_, i) => {
  const h = 9 + Math.floor(i / 2); const m = i % 2 === 0 ? '00' : '30'; return `${String(h).padStart(2,'0')}:${m}`;
});
const dayRange = (startISO: Date) => Array.from({ length: 7 }, (_, i) => new Date(startISO.getTime() + i * 86400000));
const dateKey = (d: Date) => d.toISOString().split('T')[0];
function isBookingInSlot(b: import('../app/bookingContext').Booking, slot: string) {
  const [sh, sm] = b.time.split(':').map(Number); const startMinutes = sh*60+sm; const [slh, slm] = slot.split(':').map(Number); const slotMinutes = slh*60+slm; const endMinutes = startMinutes + b.duration*60; return slotMinutes >= startMinutes && slotMinutes < endMinutes;
}

// UI primitives centralized
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '../components/ui/primitives';

interface TabsContextValue { value: string; setValue: (v:string)=>void }
const TabsContext = createContext<TabsContextValue | null>(null);
const useTabs = () => { const ctx = useContext(TabsContext); if(!ctx) throw new Error('Tabs components must be inside <Tabs>'); return ctx; };
const Tabs: React.FC<{ defaultValue: string; children: React.ReactNode; className?: string }> = ({ defaultValue, children, className='' }) => {
  const [value,setValue] = useState(defaultValue); return <TabsContext.Provider value={{value,setValue}}><div className={className}>{children}</div></TabsContext.Provider>;
};
const TabsTriggersRow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className='' }) => <div role="tablist" className={`grid w-full grid-cols-4 bg-slate-800/50 border border-slate-700 rounded-md overflow-hidden ${className}`}>{children}</div>;
const TabsTrigger: React.FC<{ value: string; children: React.ReactNode }> = ({ value, children }) => { const { value:active, setValue } = useTabs(); const isActive = value===active; return <button role="tab" aria-selected={isActive} onClick={()=>setValue(value)} className={`text-sm px-3 py-2 font-medium transition-colors focus:outline-none ${isActive ? 'bg-amber-500 text-black' : 'bg-slate-800/40 text-slate-300 hover:bg-slate-700/60'}`}>{children}</button>; };
const TabsContent: React.FC<{ when: string; children: React.ReactNode }> = ({ when, children }) => { const { value } = useTabs(); if (value!==when) return null; return <div role="tabpanel">{children}</div>; };

// ---------------- Component ----------------
const DashboardPage: React.FC = () => {
  const { state, forceSync, rooms: realRooms } = useAuth();
  const user = state.user || {}; const isAdmin = user.role === 'ADMIN';
  const { bookings, updateBookingStatus, updateRoomStatus } = useBookingData();
  const rooms = realRooms; // Use real rooms from backend instead of mock data
  const navigate = useNavigate();
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => new Date('2024-01-15T00:00:00Z'));
  const weekDays = useMemo(()=>dayRange(currentWeekStart), [currentWeekStart]);

  const totalRevenue = bookings.reduce((s,b)=>s+b.price,0);
  const activeBookings = bookings.filter(b=>b.status==='confirmed');
  const navigateWeek = (dir: 'prev'|'next') => setCurrentWeekStart(prev => new Date(prev.getTime() + (dir==='prev'?-7:7)*86400000));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/20 text-green-300';
      case 'completed': return 'bg-blue-500/20 text-blue-300';
      case 'cancelled': return 'bg-red-500/20 text-red-300';
      case 'ACTIVE': return 'bg-emerald-500/20 text-emerald-300';
      case 'MAINTENANCE': return 'bg-amber-500/20 text-amber-300';
      case 'CLOSED': return 'bg-slate-500/30 text-slate-300';
      default: return 'bg-slate-600 text-slate-100';
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <AppHeader onTest={()=>{}} onSync={forceSync} />
      <main className="flex-1 px-6 py-8 space-y-8 max-w-7xl mx-auto w-full">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm">Manage bookings, rooms, and view schedule</p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Rooms" value={rooms.length} accent="text-amber-400" />
          <StatCard title="Active" value={rooms.filter(r=>r.status==='ACTIVE').length} accent="text-emerald-400" />
            <StatCard title="Active" value={activeBookings.length} accent="text-sky-400" />
            <StatCard title="Revenue" value={`$${totalRevenue}`} accent="text-fuchsia-400" />
        </div>

        {isAdmin ? (
          <Tabs defaultValue="bookings" className="space-y-6">
            <TabsTriggersRow>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="rooms">Rooms</TabsTrigger>
              <TabsTrigger value="calendar">Weekly Calendar</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="menu">Menu</TabsTrigger>
            </TabsTriggersRow>
            <TabsContent when="bookings">
              <Card>
                <CardHeader>
                  <CardTitle>Bookings</CardTitle>
                  <CardDescription>Lifecycle management (mock)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {bookings.map(b => (
                      <div key={b.id} className="flex items-center justify-between p-4 border border-slate-700 rounded-lg hover:bg-slate-700/30 bg-slate-800/30 cursor-pointer" onClick={()=>navigate(`/booking/${b.id}`)}>
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-medium text-white">{b.customerName}</h3>
                            <Badge className={`${getStatusColor(b.status)} capitalize`}>{b.status}</Badge>
                          </div>
                          <div className="text-xs text-slate-400 truncate">{b.customerEmail} • {b.roomName}</div>
                          <div className="text-xs text-slate-500 mt-1">{new Date(b.date).toLocaleDateString()} at {b.time} • {b.players}p • {b.duration}h</div>
                        </div>
                        <div className="flex items-center gap-2 text-right">
                          <div className="w-16 text-white font-semibold text-sm">${b.price}</div>
                          {b.status === 'confirmed' && (
                            <div className="flex gap-2" onClick={e=>e.stopPropagation()}>
                              <button className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30" onClick={()=>updateBookingStatus(b.id,'completed')}>Complete</button>
                              <button className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30" onClick={()=>updateBookingStatus(b.id,'cancelled')}>Cancel</button>
                            </div>
                          )}
                          {b.status !== 'confirmed' && (
                            <button className="text-xs px-2 py-1 rounded bg-slate-600/40 text-slate-200 border border-slate-600 hover:bg-slate-600/60" onClick={(e)=>{e.stopPropagation(); updateBookingStatus(b.id,'confirmed')}}>Reset</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent when="rooms">
              <Card>
                <CardHeader>
                  <CardTitle>Rooms</CardTitle>
                  <CardDescription>Status + capacity overview (mock)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {rooms.map(r => (
                      <Card key={r.id} className="border-2 border-slate-700 bg-slate-800/30">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded ${r.color}`}></div>
                              <CardTitle className="text-sm">{r.name}</CardTitle>
                            </div>
                            <Badge className={getStatusColor(r.status)}>{r.status}</Badge>
                          </div>
                          <CardDescription>Cap {r.capacity} • ${r.hourlyRate}/h</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                          <label className="text-[11px] text-slate-400">Update Status</label>
                            <select value={r.status} onChange={e=>updateRoomStatus(r.id, e.target.value as any)} className="w-full text-xs bg-slate-700/50 border border-slate-600 rounded px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400">
                              <option value="ACTIVE">Active</option>
                              <option value="MAINTENANCE">Maintenance</option>
                              <option value="CLOSED">Closed</option>
                            </select>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent when="calendar">
              <WeeklyCalendar weekDays={weekDays} rooms={rooms} bookings={bookings} navigateWeek={navigateWeek} />
            </TabsContent>
            <TabsContent when="timeline">
              <TimelineView weekDays={weekDays} rooms={rooms} bookings={bookings} navigateWeek={navigateWeek} />
            </TabsContent>
            <TabsContent when="menu">
              <Card>
                <CardHeader>
                  <CardTitle>Menu Management</CardTitle>
                  <CardDescription>Administer food & drink items</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm">
                    <p className="text-slate-300">Open the full menu management workspace to add, edit, archive, and re-order menu items. This operates on local mock data until persistence is wired.</p>
                    <div className="flex gap-3">
                      <button onClick={()=>navigate('/menu')} className="px-4 py-2 rounded bg-amber-500 text-black font-medium text-xs hover:bg-amber-600">Open Menu Management</button>
                      <button onClick={()=>navigate('/menu')} className="px-4 py-2 rounded bg-slate-700 text-slate-200 font-medium text-xs hover:bg-slate-600 border border-slate-600">Quick Edit</button>
                    </div>
                    <p className="text-[11px] text-slate-500">Future enhancements: category CRUD, bulk availability toggles, price history, cost-of-goods, printing labels.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-slate-400 text-sm">You are not an admin.</div>
        )}
      </main>
    </div>
  );
};

// ---------------- Small Components ----------------
function StatCard({ title, value, accent }: { title: string; value: string | number; accent: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-[11px] font-medium tracking-wide uppercase text-slate-400">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-1"><div className={`text-3xl font-bold ${accent}`}>{value}</div></CardContent>
    </Card>
  );
}

interface CalendarProps { weekDays: Date[]; rooms: import('../app/bookingContext').Room[]; bookings: import('../app/bookingContext').Booking[]; navigateWeek: (d:'prev'|'next')=>void }
function WeeklyCalendar({ weekDays, rooms, bookings, navigateWeek }: CalendarProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Weekly Calendar</CardTitle>
            <CardDescription>Grid view by day/time slot (mock)</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={()=>navigateWeek('prev')} className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs hover:bg-slate-600">Prev</button>
            <span className="text-white text-sm font-medium min-w-[200px] text-center">{weekDays[0].toLocaleDateString('en-US',{month:'long',day:'numeric'})} – {weekDays[6].toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</span>
            <button onClick={()=>navigateWeek('next')} className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs hover:bg-slate-600">Next</button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4 flex-wrap">
          {rooms.map(r => <div key={r.id} className="flex items-center gap-2 text-xs text-slate-300"><div className={`w-4 h-4 rounded ${r.color}`}></div><span>{r.name}</span></div>)}
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            <div className="grid grid-cols-8 gap-2 mb-2">
              <div className="text-sm font-medium text-slate-400 p-2">Time</div>
              {weekDays.map((d,i)=>(
                <div key={i} className="text-center p-2 bg-slate-700/50 rounded-lg">
                  <div className="text-xs font-medium text-white">{d.toLocaleDateString('en-US',{weekday:'short'})}</div>
                  <div className="text-[10px] text-slate-400">{d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              {timeSlots.map(ts => (
                <div key={ts} className="grid grid-cols-8 gap-2">
                  <div className="text-[11px] text-slate-500 p-2 flex items-start pt-3">{ts}</div>
                  {weekDays.map((day, dayIdx) => (
                    <div key={dayIdx} className="h-[70px] bg-slate-700/30 rounded-lg p-1 relative overflow-hidden">
                      {rooms.map(room => {
                        const dayBookings = bookings.filter(b => b.date === dateKey(day) && b.roomId === room.id);
                        const relevant = dayBookings.filter(b => isBookingInSlot(b, ts));
                        return relevant.map(b => (
                          <div key={b.id} className={`${room.color} absolute inset-0 rounded-md flex items-center justify-center text-[10px] text-white font-semibold shadow-sm`}>{b.roomName}:{b.customerName}</div>
                        ))
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TimelineView({ weekDays, rooms, bookings, navigateWeek }: CalendarProps) {
  const dayStart = 9 * 60, dayEnd = 22 * 60, totalMinutes = dayEnd - dayStart;
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Timeline View</CardTitle>
            <CardDescription>Horizontal timeline (mock)</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={()=>navigateWeek('prev')} className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs hover:bg-slate-600">Prev</button>
            <span className="text-white text-sm font-medium min-w-[200px] text-center">{weekDays[0].toLocaleDateString('en-US',{month:'long',day:'numeric'})} – {weekDays[6].toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</span>
            <button onClick={()=>navigateWeek('next')} className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs hover:bg-slate-600">Next</button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6 flex-wrap">
          {rooms.map(r => <div key={r.id} className="flex items-center gap-2 text-xs text-slate-300"><div className={`w-4 h-4 rounded ${r.color}`}></div><span>{r.name}</span></div>)}
        </div>
        <div className="space-y-8">
          {weekDays.map((day, idx) => {
            const dayBookings = bookings.filter(b => b.date === dateKey(day));
            return (
              <div key={idx} className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-white min-w-[120px]">{day.toLocaleDateString('en-US',{weekday:'long'})}</h3>
                  <div className="text-[11px] text-slate-400">{day.toLocaleDateString('en-US',{month:'long',day:'numeric'})}</div>
                  <div className="flex-1 h-px bg-slate-700" />
                  <Badge className="bg-slate-700/60 text-slate-300">{dayBookings.length} booking{dayBookings.length!==1?'s':''}</Badge>
                </div>
                <div className="space-y-2">
                  {rooms.map(room => {
                    const roomBookings = dayBookings.filter(b => b.roomId === room.id);
                    return (
                      <div key={room.id} className="flex items-start gap-3">
                        <div className="min-w-[90px] pt-2">
                          <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded ${room.color}`}></div><span className="text-[11px] font-medium text-slate-300">{room.name}</span></div>
                        </div>
                        <div className="flex-1 relative h-14 bg-slate-700/30 rounded-lg border border-slate-700 overflow-hidden">
                          <div className="absolute inset-0 flex">
                            {Array.from({ length: 14 }, (_, i) => (
                              <div key={i} className="flex-1 border-r border-slate-700/40 last:border-r-0 relative">
                                {i === 0 && <span className="text-[9px] text-slate-500 absolute top-1 left-1">9A</span>}
                                {i === 6 && <span className="text-[9px] text-slate-500 absolute top-1 left-1/2 -translate-x-1/2">3P</span>}
                                {i === 13 && <span className="text-[9px] text-slate-500 absolute top-1 right-1">10P</span>}
                              </div>
                            ))}
                          </div>
                          {roomBookings.map(b => {
                            const [h,m] = b.time.split(':').map(Number); const start = h*60+m; const leftPct = ((start - dayStart)/totalMinutes)*100; const widthPct = (b.duration*60/totalMinutes)*100;
                            return (
                              <div key={b.id} className={`${room.color} absolute top-2 bottom-2 rounded-md hover:opacity-80 transition-all cursor-pointer overflow-hidden group shadow-md`} style={{ left: `${leftPct}%`, width: `${widthPct}%` }} onClick={()=>navigate(`/booking/${b.id}`)}>
                                <div className="h-full flex flex-col justify-center px-2">
                                  <div className="text-white text-[10px] font-semibold truncate">{b.customerName}</div>
                                  <div className="text-white/90 text-[9px] truncate">{b.time} • {b.players}p • {b.duration}h</div>
                                </div>
                                <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded shadow-xl z-10 whitespace-nowrap">
                                  <div className="text-white text-[10px] font-semibold">{b.customerName}</div>
                                  <div className="text-slate-300 text-[9px]">{b.customerEmail}</div>
                                  <div className="text-slate-400 text-[9px] mt-1">{b.time} • {b.duration}h • {b.players} players • ${b.price}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default DashboardPage;
