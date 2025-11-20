import React, { useMemo, useState, createContext, useContext } from 'react';
import { useAuth } from '../app/authState';
import { AppHeader } from '../components/layout/AppHeader';
import { useNavigate } from 'react-router-dom';
import { useBookingData } from '../app/BookingContext';

// Types now provided by context (imported through hook). Keeping utility code local.

// Simple icon component
const Plus = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
);

// ---------------- Utilities ----------------
const timeSlots = Array.from({ length: (22 - 9) * 2 + 1 }, (_, i) => {
  const h = 9 + Math.floor(i / 2); const m = i % 2 === 0 ? '00' : '30'; return `${String(h).padStart(2,'0')}:${m}`;
});
const dayRange = (startISO: Date) => Array.from({ length: 7 }, (_, i) => new Date(startISO.getTime() + i * 86400000));
// Convert Date to YYYY-MM-DD in LOCAL timezone (not UTC) to match booking.date format
const dateKey = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
function isBookingInSlot(b: import('../app/BookingContext').Booking, slot: string) {
  const [sh, sm] = b.time.split(':').map(Number); const startMinutes = sh*60+sm; const [slh, slm] = slot.split(':').map(Number); const slotMinutes = slh*60+slm; const endMinutes = startMinutes + b.duration*60; return slotMinutes >= startMinutes && slotMinutes < endMinutes;
}

// UI primitives centralized
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '../components/ui/primitives';
import { BookingModal } from '../components/BookingModal';

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
  const { 
    bookings, 
    updateBookingStatus, 
    updateRoomStatus, 
    rooms, 
    globalTaxRate, 
    updateGlobalTaxRate, 
    fetchBookings
  } = useBookingData();
  const navigate = useNavigate();
  
  // Local state for timeline and today's bookings
  const [timelineBookings, setTimelineBookings] = useState<import('../app/BookingContext').Booking[]>([]);
  const [todayBookings, setTodayBookings] = useState<import('../app/BookingContext').Booking[]>([]);
  const [currentBookings, setCurrentBookings] = useState<import('../app/BookingContext').Booking[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Initialize to the start of the current week (Monday)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days; otherwise go to Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysToMonday);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  
  const weekDays = useMemo(()=>dayRange(currentWeekStart), [currentWeekStart]);
  
  // Create booking modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [preselectedRoomId, setPreselectedRoomId] = useState<string | undefined>(undefined);

  // Tax settings state
  const [taxRateInput, setTaxRateInput] = useState<string>(globalTaxRate.toString());
  const [taxSaveMessage, setTaxSaveMessage] = useState<string>('');

  // Sync tax rate input when globalTaxRate changes (e.g., from API)
  React.useEffect(() => {
    setTaxRateInput(globalTaxRate.toString());
  }, [globalTaxRate]);

  const totalRevenue = bookings.reduce((s,b)=>s+b.price,0);
  const activeBookings = bookings.filter(b=>b.status==='confirmed');
  
  const navigateWeek = (dir: 'prev'|'next') => {
    setCurrentWeekStart(prev => {
      const newWeekStart = new Date(prev.getTime() + (dir==='prev'?-7:7)*86400000);
      return newWeekStart;
    });
  };
  
  // Fetch bookings for current week (this covers both timeline and today)
  React.useEffect(() => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(currentWeekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    fetchBookings({
      startDate: currentWeekStart.toISOString(),
      endDate: weekEnd.toISOString()
    });
  }, [currentWeekStart, fetchBookings]);
  
  // Update timeline bookings from context bookings
  React.useEffect(() => {
    setTimelineBookings(bookings);
  }, [bookings]);
  
  // Update today's bookings from context bookings
  React.useEffect(() => {
    const today = new Date();
    // Get today's date in YYYY-MM-DD format in LOCAL timezone (not UTC)
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayDateStr = `${year}-${month}-${day}`;
    
    const filtered = bookings.filter(b => b.date === todayDateStr);
    setTodayBookings(filtered);
  }, [bookings]);
  
  // Helper function to check if a booking is currently active
  const isBookingActive = React.useCallback((booking: import('../app/BookingContext').Booking, now: Date) => {
    // Parse booking date and time to create start and end times
    // booking.date is "YYYY-MM-DD" in local timezone
    const [year, month, day] = booking.date.split('-').map(Number);
    const [hours, minutes] = booking.time.split(':').map(Number);
    
    // Create start time in LOCAL timezone (not UTC)
    const startTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + Math.floor(booking.duration));
    endTime.setMinutes(startTime.getMinutes() + (booking.duration % 1) * 60);
    
    // Check if current time is between start and end, and booking is not cancelled
    return now >= startTime && now < endTime && booking.status !== 'cancelled';
  }, []);
  
  // Update current time every second and filter currently active bookings
  React.useEffect(() => {
    const updateCurrentBookings = () => {
      const now = new Date();
      setCurrentTime(now);
      
      const active = todayBookings.filter(booking => isBookingActive(booking, now));
      setCurrentBookings(active);
    };
    
    // Initial update
    updateCurrentBookings();
    
    // Update every 10 seconds for real-time accuracy
    const timer = setInterval(updateCurrentBookings, 10000);
    
    return () => clearInterval(timer);
  }, [todayBookings, isBookingActive]);

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

  const getPaymentStatusColor = (status?: string) => {
    switch (status) {
      case 'UNPAID': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'BILLED': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'PAID': return 'bg-green-500/20 text-green-300 border-green-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div data-testid="dashboard" className="w-full h-full flex flex-col overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <AppHeader onTest={()=>{}} onSync={forceSync} />
      <main className="flex-1 px-6 py-8 space-y-8 max-w-7xl mx-auto w-full">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm">Manage bookings, rooms, and view schedule</p>
        </header>

        {/* Room Status Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-3">
                Room Status (Real-Time)
                <span className="text-xs font-normal text-slate-400 font-mono">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                </span>
              </CardTitle>
              <CardDescription>Live view of currently occupied rooms</CardDescription>
            </div>
            <Button 
              onClick={() => {
                setPreselectedRoomId(undefined);
                setShowCreateModal(true);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Booking</span>
            </Button>
          </CardHeader>
          <CardContent>
            {/* Status Legend */}
            <div className="flex gap-6 p-4 bg-slate-700/30 rounded-lg mb-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500" />
                <span className="text-sm text-slate-300">Empty Table</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-500" />
                <span className="text-sm text-slate-300">Order Entered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500" />
                <span className="text-sm text-slate-300">Bill Issued</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {rooms.map((room) => {
                // Filter for currently active bookings in this room
                const roomCurrentBookings = currentBookings.filter(
                  (booking) => booking.roomId === String(room.id)
                );
                const currentBooking = roomCurrentBookings[0];
                const roomStatus = currentBooking ? "ordered" : "empty";

                return (
                  <div
                    key={room.id}
                    className={`border-4 rounded-lg p-4 transition-all hover:scale-[1.02] ${
                      roomStatus === 'empty' 
                        ? 'border-green-500 bg-green-50/10' 
                        : roomStatus === 'ordered' 
                        ? 'border-yellow-500 bg-yellow-50/10' 
                        : 'border-red-500 bg-red-50/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-4 h-4 rounded-full ${roomStatus === 'empty' ? 'bg-green-500' : roomStatus === 'ordered' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                      <span className={`text-xs px-2 py-1 rounded ${roomStatus === 'empty' ? 'bg-green-500' : roomStatus === 'ordered' ? 'bg-yellow-500' : 'bg-red-500'} text-white`}>
                        {roomStatus === 'empty' ? 'Empty' : roomStatus === 'ordered' ? 'Order Entered' : 'Bill Issued'}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold mb-3 text-white">{room.name}</h3>
                    
                    {currentBooking ? (
                      <div className="space-y-2">
                        <div className="p-2 bg-slate-700/50 rounded">
                          <div className="text-xs text-slate-400">Customer</div>
                          <div className="text-sm font-semibold text-white truncate">{currentBooking.customerName}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 bg-slate-700/30 rounded">
                            <div className="text-slate-400">Start Time</div>
                            <div className="font-medium text-white">{currentBooking.time}</div>
                          </div>
                          <div className="p-2 bg-slate-700/30 rounded">
                            <div className="text-slate-400">Duration</div>
                            <div className="font-medium text-white">{currentBooking.duration}h</div>
                          </div>
                        </div>

                        <div className="p-2 bg-slate-700/30 rounded text-xs">
                          <div className="text-slate-400">Players</div>
                          <div className="font-medium text-white">{currentBooking.players}</div>
                        </div>

                        <Button size="sm" className="w-full text-xs" onClick={() => navigate(`/booking/${currentBooking.id}`)}>
                          Manage
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-xs text-slate-400 mb-2">No booking</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs"
                          onClick={() => {
                            setPreselectedRoomId(room.id);
                            setShowCreateModal(true);
                          }}
                        >
                          <span className="text-lg mr-1">+</span>
                          Book
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {isAdmin ? (
          <Tabs defaultValue="timeline" className="space-y-6">
            <TabsTriggersRow className="grid-cols-4">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="rooms">Room Management</TabsTrigger>
              <TabsTrigger value="menu">Menu</TabsTrigger>
              <TabsTrigger value="tax">Tax</TabsTrigger>
            </TabsTriggersRow>
            <TabsContent when="bookings">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Bookings</CardTitle>
                      <CardDescription>Lifecycle management (mock)</CardDescription>
                    </div>
                    <Button 
                      data-testid="dashboard-create-booking-btn"
                      onClick={() => {
                        setPreselectedRoomId(undefined);
                        setShowCreateModal(true);
                      }}
                      size="lg"
                      className="text-base px-6"
                    >
                      + Create Booking
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {bookings.length === 0 && (
                      <div className="text-center py-12 text-slate-400">
                        <p>No bookings found</p>
                      </div>
                    )}
                    {bookings.map((b: import('../app/BookingContext').Booking) => (
                      <div key={b.id} className="flex items-center justify-between p-4 border border-slate-700 rounded-lg hover:bg-slate-700/30 bg-slate-800/30 cursor-pointer" onClick={()=>navigate(`/booking/${b.id}`)}>
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-white">{b.customerName}</h3>
                            <Badge className={`${getStatusColor(b.status)} capitalize`}>{b.status}</Badge>
                            {b.paymentStatus && (
                              <Badge className={`${getPaymentStatusColor(b.paymentStatus)} text-xs`}>
                                {b.paymentStatus === 'UNPAID' && '💳 Unpaid'}
                                {b.paymentStatus === 'BILLED' && '📄 Billed'}
                                {b.paymentStatus === 'PAID' && '✓ Paid'}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 truncate">{b.customerEmail} • {b.roomName}</div>
                          <div className="text-xs text-slate-500 mt-1">{new Date(b.date).toLocaleDateString()} at {b.time} • {b.players}p • {b.duration}h</div>
                        </div>
                        <div className="flex items-center gap-2 text-right">
                          <div className="w-16 text-white font-semibold text-sm">${b.price}</div>
                          {b.status === 'confirmed' && (
                            <div className="flex gap-2" onClick={e=>e.stopPropagation()}>
                              <Button size="sm" className="bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30" onClick={()=>updateBookingStatus(b.id,'completed')}>Complete</Button>
                              <Button size="sm" className="bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30" onClick={()=>updateBookingStatus(b.id,'cancelled')}>Cancel</Button>
                            </div>
                          )}
                          {b.status !== 'confirmed' && (
                            <Button size="sm" variant="outline" onClick={(e: React.MouseEvent)=>{e.stopPropagation(); updateBookingStatus(b.id,'confirmed')}}>Reset</Button>
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
                  <CardTitle>Room Management</CardTitle>
                  <CardDescription>Control room status and availability</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {rooms.map((room) => {
                      // Filter bookings for this room using the same local date logic
                      const today = new Date();
                      const year = today.getFullYear();
                      const month = String(today.getMonth() + 1).padStart(2, '0');
                      const day = String(today.getDate()).padStart(2, '0');
                      const todayDateStr = `${year}-${month}-${day}`;
                      
                      const roomTodayBookings = bookings.filter(
                        (booking) => booking.roomId === String(room.id) && booking.date === todayDateStr
                      );

                      return (
                        <Card key={room.id} className="bg-slate-700/30 border-slate-600">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded ${room.color}`} />
                                <CardTitle className="text-xl text-white">{room.name}</CardTitle>
                              </div>
                              <div className="flex items-center gap-3">
                                <label className="text-slate-400 text-sm">Room Status:</label>
                                <select 
                                  value={room.status} 
                                  onChange={e=>updateRoomStatus(room.id, e.target.value as any)} 
                                  className="w-[160px] bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                                >
                                  <option value="ACTIVE">Active</option>
                                  <option value="MAINTENANCE">Maintenance</option>
                                  <option value="CLOSED">Closed</option>
                                </select>
                                <Badge className={`${getStatusColor(room.status)} border-0`}>{room.status}</Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <h4 className="text-sm font-semibold text-slate-400 mb-3">Room Details</h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Capacity:</span>
                                    <span className="text-white font-medium">{room.capacity} players</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Hourly Rate:</span>
                                    <span className="text-white font-medium">${room.hourlyRate}/person/hour</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Today's Bookings:</span>
                                    <span className="text-white font-medium">{roomTodayBookings.length}</span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 className="text-sm font-semibold text-slate-400 mb-3">Today's Bookings</h4>
                                {roomTodayBookings.length > 0 ? (
                                  <div className="space-y-2 max-h-[120px] overflow-y-auto">
                                    {roomTodayBookings.map((booking) => (
                                      <div
                                        key={booking.id}
                                        onClick={() => navigate(`/booking/${booking.id}`)}
                                        className="block p-2 bg-slate-600/30 rounded hover:bg-slate-600/50 transition-colors cursor-pointer"
                                      >
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <div className="text-sm font-medium text-white">{booking.customerName}</div>
                                            <div className="text-xs text-slate-400">
                                              {booking.time} • {booking.players} players
                                            </div>
                                          </div>
                                          <Badge className={`${getStatusColor(booking.status)} border-0 text-xs`}>
                                            {booking.status}
                                          </Badge>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-500 italic">No bookings today</p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent when="timeline">
              <TimelineView 
                key={`timeline-${timelineBookings.length}-${timelineBookings[0]?.id || 'empty'}`}
                weekDays={weekDays} 
                rooms={rooms} 
                bookings={timelineBookings} 
                navigateWeek={navigateWeek} 
              />
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
                      <Button size="sm" onClick={()=>navigate('/menu')}>Open Menu Management</Button>
                      <Button size="sm" variant="outline" onClick={()=>navigate('/menu')}>Quick Edit</Button>
                    </div>
                    <p className="text-[11px] text-slate-500">Future enhancements: category CRUD, bulk availability toggles, price history, cost-of-goods, printing labels.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent when="tax">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Sales Report</CardTitle>
                  <CardDescription>View sales summary broken down by payment method</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Month Selector */}
                    <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                      <Button size="sm" variant="ghost">←</Button>
                      <span className="text-base font-semibold text-white">January 2024</span>
                      <Button size="sm" variant="ghost">→</Button>
                    </div>

                    {/* Sales Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card className="bg-slate-700/30 border-slate-600">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base text-white flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            Card Sales
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-white mb-2">$12,450</div>
                          <div className="text-sm text-slate-400">158 transactions</div>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-700/30 border-slate-600">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base text-white flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            Cash Sales
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-white mb-2">$3,280</div>
                          <div className="text-sm text-slate-400">42 transactions</div>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-700/30 border-slate-600">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base text-white flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-amber-500" />
                            Tips
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-white mb-2">$890</div>
                          <div className="text-sm text-slate-400">67 transactions</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Total */}
                    <div className="bg-gradient-to-r from-amber-900/30 to-amber-800/30 border border-amber-700/50 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-slate-400 mb-1">Total Monthly Revenue</div>
                          <div className="text-4xl font-bold text-white">$16,620</div>
                        </div>
                        <Button size="md">Export Report</Button>
                      </div>
                    </div>

                    {/* Daily Breakdown */}
                    <div>
                      <h3 className="text-base font-semibold text-white mb-4">Daily Breakdown</h3>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {Array.from({ length: 31 }, (_, i) => {
                          const day = i + 1;
                          const cardAmount = Math.floor(Math.random() * 800) + 200;
                          const cashAmount = Math.floor(Math.random() * 200) + 50;
                          const tips = Math.floor(Math.random() * 50) + 10;
                          const total = cardAmount + cashAmount + tips;

                          return (
                            <div
                              key={day}
                              className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div className="text-slate-400 font-medium w-20 text-sm">Jan {day}</div>
                                <div className="flex gap-6 text-xs">
                                  <span className="text-blue-400">Card: ${cardAmount}</span>
                                  <span className="text-green-400">Cash: ${cashAmount}</span>
                                  <span className="text-amber-400">Tips: ${tips}</span>
                                </div>
                              </div>
                              <div className="font-semibold text-white text-sm">${total}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tax Settings */}
                    <div className="border-t border-slate-700 pt-6 mt-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Global Tax Rate Settings</h3>
                      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-300">Current Global Tax Rate</span>
                          <span className="text-2xl font-bold text-amber-400">{globalTaxRate}%</span>
                        </div>
                        <p className="text-xs text-slate-500">This rate is applied to all new bookings by default. Individual bookings can override this rate.</p>
                      </div>
                    
                      <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Update Tax Rate (%)</label>
                        <div className="flex gap-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={taxRateInput}
                            onChange={(e) => setTaxRateInput(e.target.value)}
                            className="flex-1 bg-slate-700/50 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                            placeholder="Enter tax rate (0-100)"
                          />
                          <Button
                            size="md"
                            onClick={() => {
                              const rate = parseFloat(taxRateInput);
                              if (isNaN(rate) || rate < 0 || rate > 100) {
                                setTaxSaveMessage('❌ Please enter a valid tax rate between 0 and 100');
                                setTimeout(() => setTaxSaveMessage(''), 3000);
                                return;
                              }
                              updateGlobalTaxRate(rate);
                              setTaxSaveMessage('✅ Tax rate updated successfully!');
                              setTimeout(() => setTaxSaveMessage(''), 3000);
                            }}
                            className="px-6"
                          >
                            Save
                          </Button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Enter a value between 0 and 100. Decimals are supported (e.g., 8.5 for 8.5%)</p>
                      </div>

                      {taxSaveMessage && (
                        <div className={`p-3 rounded-md border text-sm ${
                          taxSaveMessage.includes('✅') 
                            ? 'bg-green-500/10 border-green-500/30 text-green-300' 
                            : 'bg-red-500/10 border-red-500/30 text-red-300'
                        }`}>
                          {taxSaveMessage}
                        </div>
                      )}

                      <div className="border-t border-slate-700 pt-4">
                        <h4 className="text-sm font-medium text-slate-300 mb-2">Common Tax Rates</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {[0, 5, 8, 10, 13, 15, 20, 25].map((rate) => (
                            <Button
                              key={rate}
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setTaxRateInput(rate.toString());
                                updateGlobalTaxRate(rate);
                                setTaxSaveMessage(`✅ Tax rate set to ${rate}%`);
                                setTimeout(() => setTaxSaveMessage(''), 3000);
                              }}
                              className="hover:border-amber-500/30"
                            >
                              {rate}%
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-slate-400 text-sm">You are not an admin.</div>
        )}
      </main>

      {/* Booking Modal */}
      <BookingModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setPreselectedRoomId(undefined);
        }}
        rooms={rooms}
        preselectedRoomId={preselectedRoomId}
        onSuccess={async () => {
          // Refresh both today's and timeline bookings
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const endOfDay = new Date(today);
          endOfDay.setHours(23, 59, 59, 999);
          
          await fetchBookings({
            startDate: today.toISOString(),
            endDate: endOfDay.toISOString()
          });
          
          const weekEnd = new Date(currentWeekStart);
          weekEnd.setDate(currentWeekStart.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);
          
          await fetchBookings({
            startDate: currentWeekStart.toISOString(),
            endDate: weekEnd.toISOString()
          });
        }}
      />
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

interface TimelineViewProps {
  weekDays: Date[];
  rooms: import('../app/BookingContext').Room[];
  bookings: import('../app/BookingContext').Booking[];
  navigateWeek: (dir: 'prev' | 'next') => void;
}

function TimelineView({ weekDays, rooms, bookings, navigateWeek }: TimelineViewProps) {
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
            <Button size="sm" variant="outline" onClick={()=>navigateWeek('prev')}>Prev</Button>
            <span className="text-white text-sm font-medium min-w-[200px] text-center">{weekDays[0].toLocaleDateString('en-US',{month:'long',day:'numeric'})} – {weekDays[6].toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</span>
            <Button size="sm" variant="outline" onClick={()=>navigateWeek('next')}>Next</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6 flex-wrap">
          {rooms.map((r: import('../app/BookingContext').Room) => <div key={r.id} className="flex items-center gap-2 text-xs text-slate-300"><div className={`w-4 h-4 rounded ${r.color}`}></div><span>{r.name}</span></div>)}
        </div>
        <div className="space-y-8">
          {weekDays.map((day: Date, idx: number) => {
            const dayKey = dateKey(day);
            const dayBookings = bookings.filter((b: import('../app/BookingContext').Booking) => b.date === dayKey);
            return (
              <div key={`${dayKey}-${dayBookings.length}`} className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-white min-w-[120px]">{day.toLocaleDateString('en-US',{weekday:'long'})}</h3>
                  <div className="text-[11px] text-slate-400">{day.toLocaleDateString('en-US',{month:'long',day:'numeric'})}</div>
                  <div className="flex-1 h-px bg-slate-700" />
                  <Badge className="bg-slate-700/60 text-slate-300">{dayBookings.length} booking{dayBookings.length!==1?'s':''}</Badge>
                </div>
                <div className="space-y-2">
                  {/* Hour labels row - shown once per day */}
                  <div className="flex items-start gap-3">
                    <div className="min-w-[90px]"></div>
                    <div className="flex-1 flex">
                      {Array.from({ length: 13 }, (_, i) => {
                        const hour = 9 + i;
                        const displayHour = hour > 12 ? hour - 12 : hour;
                        const period = hour < 12 ? 'A' : 'P';
                        const label = `${displayHour}${period}`;
                        return (
                          <div key={i} className="flex-1 text-left">
                            <span className="text-[9px] text-slate-500 pl-1">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {rooms.map((room: import('../app/BookingContext').Room) => {
                    const roomBookings = dayBookings.filter((b: import('../app/BookingContext').Booking) => b.roomId === room.id);
                    return (
                      <div key={room.id} className="flex items-start gap-3">
                        <div className="min-w-[90px] pt-2">
                          <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded ${room.color}`}></div><span className="text-[11px] font-medium text-slate-300">{room.name}</span></div>
                        </div>
                        <div className="flex-1 relative h-14 bg-slate-700/30 rounded-lg border border-slate-700 overflow-hidden">
                          <div className="absolute inset-0 flex">
                            {Array.from({ length: 13 }, (_, i) => (
                              <div key={i} className="flex-1 border-r border-slate-700/40 last:border-r-0"></div>
                            ))}
                          </div>
                          {roomBookings.map((b: import('../app/BookingContext').Booking) => {
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
