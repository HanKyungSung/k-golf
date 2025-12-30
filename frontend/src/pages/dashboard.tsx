import { Link, useNavigate } from "react-router-dom"
import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"
import POSDashboard from "./pos/dashboard"

const getStatusBadge = (status: 'booked'|'completed'|'canceled') => {
  switch (status) {
    case 'canceled':
      return { label: 'canceled', classes: 'bg-red-500 text-white' }
    case 'completed':
      return { label: 'completed', classes: 'bg-slate-600 text-white' }
    default:
      return { label: 'booked', classes: 'bg-green-500 text-white' }
  }
}

type ApiBooking = {
  id: string;
  roomId: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  players: number;
  price: string | number;
  status: 'booked' | 'completed' | 'canceled';
  paymentStatus?: 'UNPAID' | 'BILLED' | 'PAID';
  billedAt?: string;
  paidAt?: string;
  paymentMethod?: 'CARD' | 'CASH';
  tipAmount?: number;
};

type ApiRoom = { id: string; name: string; capacity: number };

const CustomerDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = React.useState<ApiBooking[]>([])
  const [roomsById, setRoomsById] = React.useState<Record<string, ApiRoom>>({})
  const [loading, setLoading] = React.useState(true)
  const [busyIds, setBusyIds] = React.useState<Record<string, boolean>>({})

  React.useEffect(() => {
    const load = async () => {
      try {
        const apiBase = process.env.REACT_APP_API_BASE !== undefined ? process.env.REACT_APP_API_BASE : 'http://localhost:8080';
        const [mineRes, roomsRes] = await Promise.all([
          fetch(`${apiBase}/api/bookings/mine`, { credentials: 'include' }),
          fetch(`${apiBase}/api/bookings/rooms`, { credentials: 'include' }),
        ])
        if (mineRes.ok) {
          const data = await mineRes.json()
          setBookings(Array.isArray(data.bookings) ? data.bookings : [])
        } else {
          setBookings([])
        }
        if (roomsRes.ok) {
          const data = await roomsRes.json()
          const rooms: ApiRoom[] = Array.isArray(data.rooms) ? data.rooms : []
          setRoomsById(Object.fromEntries(rooms.map(r => [r.id, r])))
        } else {
          setRoomsById({})
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const cancelBookingById = async (id: string) => {
    try {
      setBusyIds((m) => ({ ...m, [id]: true }))
      const apiBase = process.env.REACT_APP_API_BASE !== undefined ? process.env.REACT_APP_API_BASE : 'http://localhost:8080';
      const res = await fetch(`${apiBase}/api/bookings/${id}/cancel`, { method: 'PATCH', credentials: 'include' })
      if (!res.ok) {
        const msg = (await res.json().catch(() => ({}))).error || 'Failed to cancel booking'
        toast({ title: 'Cancel failed', description: msg })
        return
      }
      const data = await res.json()
      const updated = data.booking as ApiBooking
      setBookings((prev) => prev.map(b => b.id === id ? { ...b, status: updated.status } : b))
      toast({ title: 'Booking canceled', description: 'Your booking has been canceled.' })
    } finally {
      setBusyIds((m) => ({ ...m, [id]: false }))
    }
  }

  // Count only completed bookings (all-time)
  const totalBookings = bookings.filter(b => b.status === 'completed').length
  // Sum only completed bookings in the current month
  const now = new Date()
  const currentMonthSpent = bookings
    .filter(b => b.status === 'completed')
    .filter(b => {
      const dt = new Date(b.startTime)
      return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth()
    })
    .reduce((sum, b) => sum + Number(b.price || 0), 0)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                K one Golf
              </h1>
              <span className="ml-2 text-sm text-slate-400">Premium Screen Golf</span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-300">Welcome, {user?.name || user?.email}</span>
              <Button
                variant="outline"
                onClick={async () => { await logout(); navigate('/'); }}
                className="border-red-400/50 text-red-400 hover:bg-red-500/10 bg-transparent"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white">Dashboard</h2>
          <p className="text-slate-400 mt-2">Manage your premium screen golf bookings</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white">Quick Book</CardTitle>
              <CardDescription className="text-slate-400">Book your next premium screen golf session</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/booking">
                <Button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold">
                  Book Now
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white">Total Bookings</CardTitle>
              <CardDescription className="text-slate-400">Your booking history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-400">{totalBookings}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white">Total Spent</CardTitle>
              <CardDescription className="text-slate-400">This month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-400">
                ${currentMonthSpent.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Bookings */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Bookings</CardTitle>
            <CardDescription className="text-slate-400">Your latest premium screen golf reservations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 border border-slate-700 rounded-lg hover:bg-slate-700/30 bg-slate-800/30"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-white">{roomsById[booking.roomId]?.name || 'Room'}</h3>
                      {(() => { const b = getStatusBadge(booking.status); return <Badge className={b.classes}>{b.label}</Badge> })()}
                    </div>
                    <div className="text-sm text-slate-400">
                      {new Date(booking.startTime).toLocaleDateString()} at {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / (60*60*1000))} hour(s)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-white">${Number(booking.price).toFixed(2)}</div>
          {booking.status === 'booked' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 border-red-400/50 text-red-400 hover:bg-red-500/10 bg-transparent"
            disabled={busyIds[booking.id]}
            onClick={() => cancelBookingById(booking.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

const DashboardPage = () => {
  const { user } = useAuth()
  
  // Show POS dashboard for ADMIN, customer dashboard for regular users
  if (user?.role === 'ADMIN') {
    return <POSDashboard />
  }
  
  return <CustomerDashboard />
}

export default DashboardPage
