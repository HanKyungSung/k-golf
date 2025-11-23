import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { 
  listBookings, 
  listRooms, 
  updateBookingStatus as apiUpdateBookingStatus,
  updateRoomStatus as apiUpdateRoomStatus,
  getGlobalTaxRate,
  updateGlobalTaxRate,
  type Booking,
  type Room
} from '@/services/pos-api';

export default function POSDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [taxRate, setTaxRate] = useState(8);
  const [editingTax, setEditingTax] = useState(false);
  const [tempTaxRate, setTempTaxRate] = useState('8');

  // Auto-refresh current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load data on mount
  useEffect(() => {
    loadData();
    loadTaxRate();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [bookingsData, roomsData] = await Promise.all([
        listBookings(),
        listRooms()
      ]);
      
      // Transform bookings to add derived fields (date, time, roomName)
      const transformedBookings = bookingsData.map(b => {
        const start = new Date(b.startTime);
        const end = new Date(b.endTime);
        const room = roomsData.find(r => r.id === b.roomId);
        
        return {
          ...b,
          date: start.toISOString().split('T')[0], // YYYY-MM-DD
          time: start.toTimeString().slice(0, 5), // HH:MM
          duration: (end.getTime() - start.getTime()) / (1000 * 60 * 60), // hours
          roomName: room?.name || 'Unknown Room',
        };
      });
      
      setBookings(transformedBookings);
      setRooms(roomsData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTaxRate() {
    try {
      const rate = await getGlobalTaxRate();
      setTaxRate(rate);
      setTempTaxRate(rate.toString());
    } catch (err) {
      console.error('Failed to load tax rate:', err);
    }
  }

  async function updateBookingStatus(id: string, status: string) {
    try {
      // Convert lowercase status to uppercase for backend API
      const upperStatus = status.toUpperCase();
      await apiUpdateBookingStatus(id, upperStatus);
      await loadData();
    } catch (err) {
      console.error('Failed to update booking:', err);
      alert(`Failed to update booking: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async function updateRoomStatus(id: string, status: string) {
    try {
      await apiUpdateRoomStatus(id, status);
      await loadData();
    } catch (err) {
      console.error('Failed to update room:', err);
    }
  }

  async function saveTaxRate() {
    const rate = parseFloat(tempTaxRate);
    if (isNaN(rate) || rate < 0 || rate > 100) return;
    
    try {
      await updateGlobalTaxRate(rate);
      setTaxRate(rate);
      setEditingTax(false);
    } catch (err) {
      console.error('Failed to update tax rate:', err);
    }
  }

  // Current bookings (happening right now)
  const currentBookings = useMemo(() => {
    const now = new Date();
    return bookings.filter(b => {
      const start = new Date(b.startTime);
      const end = new Date(b.endTime);
      return now >= start && now <= end && b.status !== 'cancelled';
    });
  }, [bookings]);

  // Today's bookings
  const todayBookings = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return bookings.filter(b => b.date === today);
  }, [bookings]);

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'confirmed') return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (s === 'completed') return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (s === 'cancelled') return 'bg-red-500/20 text-red-300 border-red-500/30';
    if (s === 'active') return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (s === 'maintenance') return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    if (s === 'closed') return 'bg-red-500/20 text-red-300 border-red-500/30';
    return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  };

  const getPaymentStatusColor = (status: string) => {
    if (status === 'UNPAID') return 'bg-red-500/20 text-red-300 border-red-500/30';
    if (status === 'BILLED') return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    if (status === 'PAID') return 'bg-green-500/20 text-green-300 border-green-500/30';
    return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-300">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-amber-400">K-Golf POS</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300">{user?.email}</span>
            <Button onClick={handleLogout} variant="outline" size="sm">Logout</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-6">
        {/* Real-Time Room Status */}
        <Card className="bg-slate-800/50 border-slate-700">
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
              onClick={() => navigate('/booking')}
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
                <span className="text-sm text-slate-300">Occupied</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {rooms.map((room) => {
                const roomCurrentBookings = currentBookings.filter(b => b.roomId === room.id);
                const currentBooking = roomCurrentBookings[0];
                const roomStatus = currentBooking ? "occupied" : "empty";

                return (
                  <div
                    key={room.id}
                    className={`border-4 rounded-lg p-4 transition-all hover:scale-[1.02] ${
                      roomStatus === 'empty' 
                        ? 'border-green-500 bg-green-50/10' 
                        : 'border-yellow-500 bg-yellow-50/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-4 h-4 rounded-full ${roomStatus === 'empty' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <span className={`text-xs px-2 py-1 rounded ${roomStatus === 'empty' ? 'bg-green-500' : 'bg-yellow-500'} text-white`}>
                        {roomStatus === 'empty' ? 'Empty' : 'Occupied'}
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
                            <div className="text-slate-400">Start</div>
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

                        <Button 
                          size="sm" 
                          className="w-full text-xs" 
                          onClick={() => navigate(`/pos/booking-detail/${currentBooking.id}`)}
                        >
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
                          onClick={() => navigate('/booking')}
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

        {/* Tabs for different management views */}
        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="rooms">Room Management</TabsTrigger>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="tax">Tax Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Timeline View</CardTitle>
                <CardDescription>Today's bookings with timeline schedule (simplified)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {todayBookings.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <p>No bookings today</p>
                    </div>
                  )}
                  {todayBookings.map((b) => (
                    <div 
                      key={b.id} 
                      className="flex items-center justify-between p-4 border border-slate-700 rounded-lg hover:bg-slate-700/30 bg-slate-800/30 cursor-pointer" 
                      onClick={() => navigate(`/pos/booking-detail/${b.id}`)}
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-white">{b.customerName}</h3>
                          <Badge className={`${getStatusColor(b.status)} capitalize border`}>{b.status}</Badge>
                          {b.paymentStatus && (
                            <Badge className={`${getPaymentStatusColor(b.paymentStatus)} text-xs border`}>
                              {b.paymentStatus === 'UNPAID' && '💳 Unpaid'}
                              {b.paymentStatus === 'BILLED' && '📄 Billed'}
                              {b.paymentStatus === 'PAID' && '✓ Paid'}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 truncate">{b.customerEmail} • {b.roomName}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {new Date(b.date).toLocaleDateString()} at {b.time} • {b.players}p • {b.duration}h
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        <div className="w-16 text-white font-semibold text-sm">${b.price}</div>
                        {b.status === 'confirmed' && (
                          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                            <Button 
                              size="sm" 
                              className="bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30" 
                              onClick={() => updateBookingStatus(b.id, 'completed')}
                            >
                              Complete
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30" 
                              onClick={() => updateBookingStatus(b.id, 'cancelled')}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                        {b.status !== 'confirmed' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              updateBookingStatus(b.id, 'confirmed');
                            }}
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="menu">
            <Card>
              <CardHeader>
                <CardTitle>Menu Management</CardTitle>
                <CardDescription>Administer food & drink items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <p className="text-slate-300">Menu management allows you to add, edit, and manage food and drink items.</p>
                  <div className="flex gap-3">
                    <Button size="sm" onClick={() => navigate('/pos/menu-management')}>Open Menu Management</Button>
                    <Button size="sm" variant="outline" onClick={() => navigate('/pos/menu-management')}>Quick Edit</Button>
                  </div>
                  <p className="text-[11px] text-slate-500">Future enhancements: category CRUD, bulk availability toggles, price history, printing labels.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rooms">
            <Card>
              <CardHeader>
                <CardTitle>Room Management</CardTitle>
                <CardDescription>Control room status and availability</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rooms.map((room) => {
                    const roomTodayBookings = todayBookings.filter(b => b.roomId === room.id);

                    return (
                      <Card key={room.id} className="bg-slate-700/30 border-slate-600">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-xl text-white">{room.name}</CardTitle>
                            <div className="flex items-center gap-3">
                              <label className="text-slate-400 text-sm">Room Status:</label>
                              <select 
                                value={room.status} 
                                onChange={e => updateRoomStatus(room.id, e.target.value)} 
                                className="w-[160px] bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                              >
                                <option value="ACTIVE">Active</option>
                                <option value="MAINTENANCE">Maintenance</option>
                                <option value="CLOSED">Closed</option>
                              </select>
                              <Badge className={`${getStatusColor(room.status)} border`}>{room.status}</Badge>
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
                                      onClick={() => navigate(`/pos/booking-detail/${booking.id}`)}
                                      className="block p-2 bg-slate-600/30 rounded hover:bg-slate-600/50 transition-colors cursor-pointer"
                                    >
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <div className="text-sm font-medium text-white">{booking.customerName}</div>
                                          <div className="text-xs text-slate-400">
                                            {booking.time} • {booking.players} players
                                          </div>
                                        </div>
                                        <Badge className={`${getStatusColor(booking.status)} border text-xs`}>
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

          <TabsContent value="tax">
            <Card>
              <CardHeader>
                <CardTitle>Tax Settings</CardTitle>
                <CardDescription>Configure global tax rate for all transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <label className="text-slate-300 font-medium">Global Tax Rate:</label>
                    {editingTax ? (
                      <>
                        <input
                          type="number"
                          value={tempTaxRate}
                          onChange={e => setTempTaxRate(e.target.value)}
                          className="w-24 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                          step="0.1"
                          min="0"
                          max="100"
                        />
                        <span className="text-slate-300">%</span>
                        <Button onClick={saveTaxRate} size="sm" className="bg-green-500 hover:bg-green-600">
                          Save
                        </Button>
                        <Button onClick={() => {
                          setEditingTax(false);
                          setTempTaxRate(taxRate.toString());
                        }} size="sm" variant="outline">
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-white">{taxRate}%</span>
                        <Button onClick={() => setEditingTax(true)} size="sm">
                          Edit
                        </Button>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">
                    This tax rate is applied to all bookings and menu item orders.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
