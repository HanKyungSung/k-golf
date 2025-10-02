import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookingData } from '../app/bookingContext';
import { AppHeader } from '../components/layout/AppHeader';

// Simple UI primitives (duplicated for now; could be shared later)
const Card: React.FC<{ className?: string; children: React.ReactNode }>=({ className='', children }) => <div className={`rounded-lg border border-slate-700 bg-slate-800/50 ${className}`}>{children}</div>;
const CardHeader: React.FC<{ children: React.ReactNode; className?: string }>=({children,className=''})=> <div className={`p-4 border-b border-slate-700/60 ${className}`}>{children}</div>;
const CardTitle: React.FC<{ children: React.ReactNode; className?: string }>=({children,className=''})=> <h3 className={`font-semibold text-white ${className}`}>{children}</h3>;
const CardDescription: React.FC<{ children: React.ReactNode; className?: string }>=({children,className=''})=> <p className={`text-sm text-slate-400 ${className}`}>{children}</p>;
const CardContent: React.FC<{ children: React.ReactNode; className?: string }>=({children,className=''})=> <div className={`p-4 space-y-4 ${className}`}>{children}</div>;
const Badge: React.FC<{ children: React.ReactNode; className?: string }>=({children,className=''})=> <span className={`px-2 py-0.5 rounded text-[11px] font-medium tracking-wide bg-slate-700 text-slate-200 ${className}`}>{children}</span>;

const statusStyles: Record<string,string> = {
  confirmed: 'bg-green-500/20 text-green-300',
  completed: 'bg-blue-500/20 text-blue-300',
  cancelled: 'bg-red-500/20 text-red-300'
};

export default function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getBookingById, updateBookingStatus, rooms } = useBookingData();
  const booking = getBookingById(id!);

  useEffect(()=>{ if(!booking) navigate('/', { replace:true }); }, [booking, navigate]);
  const roomColor = useMemo(()=> rooms.find(r=>r.id===booking?.roomId)?.color || 'bg-slate-600', [rooms, booking]);
  if (!booking) return null;

  const changeStatus = (s: typeof booking.status) => updateBookingStatus(booking.id, s);

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
          </div>
        </div>
      </main>
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
