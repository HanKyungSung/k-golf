"use client"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed":
      return "bg-green-500 text-white"
    case "pending":
      return "bg-yellow-500 text-white"
    case "cancelled":
      return "bg-red-500 text-white"
    default:
      return "bg-slate-500 text-white"
  }
}

const mockBookings = [
  { id: 1, roomName: "Room A", date: "2023-10-01", time: "10:00 AM", duration: 2, price: 50, status: "confirmed" },
  { id: 2, roomName: "Room B", date: "2023-10-02", time: "11:00 AM", duration: 1, price: 30, status: "pending" },
  { id: 3, roomName: "Room C", date: "2023-10-03", time: "12:00 PM", duration: 3, price: 75, status: "cancelled" },
]

const user = { name: "John Doe" }

const logout = () => {
  // Logout logic here
}

const DashboardPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                K-Golf
              </h1>
              <span className="ml-2 text-sm text-slate-400">Premium Screen Golf</span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-300">Welcome, {user.name}</span>
              <Button
                variant="outline"
                onClick={logout}
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
              <div className="text-3xl font-bold text-amber-400">{mockBookings.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white">Total Spent</CardTitle>
              <CardDescription className="text-slate-400">This month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-400">
                ${mockBookings.reduce((sum, booking) => sum + booking.price, 0)}
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
              {mockBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 border border-slate-700 rounded-lg hover:bg-slate-700/30 bg-slate-800/30"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-white">{booking.roomName}</h3>
                      <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                    </div>
                    <div className="text-sm text-slate-400">
                      {new Date(booking.date).toLocaleDateString()} at {booking.time} • {booking.duration} hour(s)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-white">${booking.price}</div>
                    {booking.status === "confirmed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 border-red-400/50 text-red-400 hover:bg-red-500/10 bg-transparent"
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

export default DashboardPage
