import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookingData } from '../app/bookingContext';
import { AppHeader } from '../components/layout/AppHeader';

// Shared UI primitives
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '../components/ui/primitives';

const statusStyles: Record<string,string> = {
  confirmed: 'bg-green-500/20 text-green-300',
  completed: 'bg-blue-500/20 text-blue-300',
  cancelled: 'bg-red-500/20 text-red-300'
};

// Mock menu items (would come from bridge / IPC later)
interface MenuItem { id: string; name: string; description: string; price: number; category: 'food'|'drinks'|'appetizers'|'desserts'; available: boolean }
interface OrderItem { menuItem: MenuItem; quantity: number }
const mockMenu: MenuItem[] = [
  { id:'1', name:'Club Sandwich', description:'Triple-decker with turkey, bacon, lettuce, tomato', price:12.99, category:'food', available:true },
  { id:'2', name:'Korean Fried Chicken', description:'Crispy chicken w/ sweet & spicy sauce', price:15.99, category:'food', available:true },
  { id:'3', name:'Bulgogi Burger', description:'Marinated beef burger w/ kimchi', price:14.99, category:'food', available:true },
  { id:'4', name:'Caesar Salad', description:'Romaine, parmesan, croutons', price:9.99, category:'food', available:true },
  { id:'5', name:'Soju', description:'Original / Peach / Grape', price:8.99, category:'drinks', available:true },
  { id:'6', name:'Beer', description:'Domestic & imported', price:6.99, category:'drinks', available:true },
  { id:'7', name:'Soft Drinks', description:'Coke • Sprite • Etc', price:2.99, category:'drinks', available:true },
  { id:'8', name:'Iced Coffee', description:'Cold brew over ice', price:4.99, category:'drinks', available:true },
  { id:'9', name:'Chicken Wings', description:'6pc choice of sauce', price:10.99, category:'appetizers', available:true },
  { id:'10', name:'French Fries', description:'Crispy golden fries', price:5.99, category:'appetizers', available:true },
  { id:'11', name:'Mozzarella Sticks', description:'6pc + marinara', price:8.99, category:'appetizers', available:true },
  { id:'12', name:'Ice Cream', description:'Vanilla / Choc / Strawberry', price:5.99, category:'desserts', available:true },
];

export default function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getBookingById, updateBookingStatus, rooms } = useBookingData();
  const booking = getBookingById(id!);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [activeMenuTab, setActiveMenuTab] = useState<'food'|'drinks'|'appetizers'|'desserts'>('food');

  useEffect(()=>{ if(!booking) navigate('/', { replace:true }); }, [booking, navigate]);
  const roomColor = useMemo(()=> rooms.find(r=>r.id===booking?.roomId)?.color || 'bg-slate-600', [rooms, booking]);
  if (!booking) return null;

  const changeStatus = (s: typeof booking.status) => updateBookingStatus(booking.id, s);

  // --- Order helpers ---
  const addItem = (item: MenuItem) => {
    setOrderItems(curr => {
      const existing = curr.find(ci => ci.menuItem.id === item.id);
      if (existing) return curr.map(ci => ci.menuItem.id===item.id?{...ci, quantity: ci.quantity+1}:ci);
      return [...curr, { menuItem: item, quantity: 1 }];
    });
  };
  const updateQty = (id: string, delta: number) => setOrderItems(curr => curr.map(ci => ci.menuItem.id===id?{...ci, quantity: Math.max(0, ci.quantity+delta)}:ci).filter(ci=>ci.quantity>0));
  const removeItem = (id: string) => setOrderItems(c => c.filter(ci=>ci.menuItem.id!==id));
  const subtotal = orderItems.reduce((s,oi)=> s + oi.menuItem.price * oi.quantity, 0);
  const tax = subtotal * 0.08;
  const totalFoods = subtotal + tax;
  const grandTotal = booking.price + totalFoods;
  const itemsByCategory = (cat: MenuItem['category']) => mockMenu.filter(m => m.category===cat && m.available);
  const printReceipt = () => window.print();

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <AppHeader onTest={()=>{}} onSync={()=>{}} />
      <main className="flex-1 px-6 py-8 space-y-8 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">Booking Details</h1>
            <p className="text-slate-400 text-sm mt-1">ID: {booking.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`${statusStyles[booking.status]} capitalize`}>{booking.status}</Badge>
            <button onClick={()=>navigate(-1)} className="text-xs px-3 py-2 rounded bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-600">Back</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-lg">
                    {booking.customerName.charAt(0)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-lg font-medium text-white">{booking.customerName}</h3>
                    <div className="text-xs text-slate-400">{booking.customerEmail}</div>
                    {booking.customerPhone && <div className="text-xs text-slate-400">{booking.customerPhone}</div>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Booking Information</CardTitle>
                <CardDescription>Temporal + Room details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <InfoBlock label="Room" value={<span className="flex items-center gap-2"><span className={`w-3 h-3 rounded ${roomColor}`}></span>{booking.roomName}</span>} />
                  <InfoBlock label="Date" value={new Date(booking.date).toLocaleDateString()} />
                  <InfoBlock label="Start Time" value={booking.time} />
                  <InfoBlock label="Duration" value={`${booking.duration} hour(s)`} />
                  <InfoBlock label="Players" value={`${booking.players}`} />
                  <InfoBlock label="Price" value={`$${booking.price}`} />
                </div>
                {booking.notes && (
                  <div className="pt-4 border-t border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">Notes</p>
                    <p className="text-sm text-slate-200">{booking.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Management */}
            <Card>
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
                <CardDescription>Add food & drinks to this booking (local mock)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2 text-xs">
                  {(['food','drinks','appetizers','desserts'] as const).map(cat => (
                    <button key={cat} onClick={()=>setActiveMenuTab(cat)} className={`px-3 py-1 rounded border border-slate-600 capitalize ${activeMenuTab===cat? 'bg-amber-500 text-black border-amber-500':'bg-slate-700/40 text-slate-300 hover:bg-slate-600/50'}`}>{cat}</button>
                  ))}
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {itemsByCategory(activeMenuTab).map(item => (
                    <div key={item.id} className="flex items-start gap-4 justify-between p-3 rounded-md border border-slate-700 bg-slate-800/40 hover:bg-slate-700/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                        <p className="text-[11px] text-slate-400 line-clamp-2">{item.description}</p>
                        <p className="text-xs text-amber-400 font-medium mt-1">${item.price.toFixed(2)}</p>
                      </div>
                      <button onClick={()=>addItem(item)} className="text-xs px-2 py-1 rounded bg-amber-500 text-black font-medium hover:bg-amber-600">Add</button>
                    </div>
                  ))}
                  {itemsByCategory(activeMenuTab).length===0 && <div className="text-xs text-slate-500 py-6 text-center">No items</div>}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Update booking status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {booking.status === 'confirmed' && (
                  <>
                    <button onClick={()=>changeStatus('completed')} className="w-full text-sm px-3 py-2 rounded bg-green-500 text-white hover:bg-green-600">Mark as Completed</button>
                    <button onClick={()=>changeStatus('cancelled')} className="w-full text-sm px-3 py-2 rounded bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30">Cancel Booking</button>
                  </>
                )}
                {booking.status === 'cancelled' && (
                  <button onClick={()=>changeStatus('confirmed')} className="w-full text-sm px-3 py-2 rounded bg-amber-500 text-black hover:bg-amber-600">Restore Booking</button>
                )}
                {booking.status === 'completed' && <div className="text-center text-slate-400 text-xs py-4">Booking completed</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-3">
                <div>
                  <p className="text-slate-400">Created</p>
                  <p className="text-slate-200">{booking.createdAt ? new Date(booking.createdAt).toLocaleString() : '—'}</p>
                </div>
                <div>
                  <p className="text-slate-400">Booking ID</p>
                  <p className="text-slate-200 font-mono">{booking.id}</p>
                </div>
              </CardContent>
            </Card>

            {/* Order Receipt / Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Receipt</CardTitle>
                <CardDescription>Current order summary (local only)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {orderItems.length===0 && <div className="text-xs text-slate-500 text-center py-4">No items added</div>}
                {orderItems.length>0 && (
                  <div className="space-y-3">
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {orderItems.map(oi => (
                        <div key={oi.menuItem.id} className="flex items-center justify-between gap-3 text-xs p-2 bg-slate-700/30 rounded border border-slate-600/40">
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-200 font-medium truncate">{oi.menuItem.name}</p>
                            <p className="text-[10px] text-slate-400">${oi.menuItem.price.toFixed(2)} each</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={()=>updateQty(oi.menuItem.id,-1)} className="w-6 h-6 rounded bg-slate-600 text-slate-200 text-xs hover:bg-slate-500">-</button>
                            <span className="w-6 text-center text-slate-100 font-semibold">{oi.quantity}</span>
                            <button onClick={()=>updateQty(oi.menuItem.id,1)} className="w-6 h-6 rounded bg-slate-600 text-slate-200 text-xs hover:bg-slate-500">+</button>
                          </div>
                          <div className="text-slate-100 font-semibold w-14 text-right">${(oi.menuItem.price*oi.quantity).toFixed(2)}</div>
                          <button onClick={()=>removeItem(oi.menuItem.id)} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30">x</button>
                        </div>
                      ))}
                    </div>
                    <div className="text-[11px] space-y-1 pt-1 border-t border-slate-700">
                      <div className="flex justify-between"><span className="text-slate-400">Items Subtotal</span><span className="text-slate-200">${subtotal.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Tax (8%)</span><span className="text-slate-200">${tax.toFixed(2)}</span></div>
                      <div className="flex justify-between font-semibold text-slate-100 pt-1"><span>Food & Drinks Total</span><span>${totalFoods.toFixed(2)}</span></div>
                      <div className="flex justify-between font-semibold text-amber-400 border-t border-slate-700 pt-2 mt-1"><span>Grand Total</span><span>${grandTotal.toFixed(2)}</span></div>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={printReceipt} className="flex-1 text-xs py-2 rounded bg-amber-500 text-black font-semibold hover:bg-amber-600 disabled:opacity-40" disabled={orderItems.length===0}>Print</button>
                  <button onClick={()=>setOrderItems([])} className="flex-1 text-xs py-2 rounded bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-40" disabled={orderItems.length===0}>Clear</button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      {/* Basic print styles (no styled-jsx) */}
      <style>{`
        @media print {
          .bg-gradient-to-br { background: #fff !important; }
          header, .space-y-6 > :first-child button, button { display:none !important; }
          .border, .border-slate-700, .border-slate-600 { border-color:#000 !important; }
          body, .text-slate-200, .text-slate-300, .text-slate-400 { color:#000 !important; }
        }
      `}</style>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">{label}</p>
      <div className="text-sm text-slate-200 font-semibold">{value}</div>
    </div>
  );
}
