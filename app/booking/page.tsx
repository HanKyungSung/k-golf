"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import Link from "next/link"
import { Clock, Users, Star } from "lucide-react"

interface Room {
  id: string
  name: string
  capacity: number
  standardRate: number
  premiumRate: number
  vipRate: number
  features: string[]
  image: string
  premium: boolean
}

interface TimeSlot {
  time: string
  available: boolean
}

const rooms: Room[] = [
  {
    id: "1",
    name: "Room 1",
    capacity: 4,
    standardRate: 50,
    premiumRate: 50,
    vipRate: 50,
    features: ["4K Ultra HD", "200+ Golf Courses", "Advanced Analytics", "Premium Suite"],
    image: "/golf-simulator-room.png",
    premium: false,
  },
  {
    id: "2",
    name: "Room 2",
    capacity: 4,
    standardRate: 50,
    premiumRate: 50,
    vipRate: 50,
    features: ["4K Ultra HD", "200+ Golf Courses", "Advanced Analytics", "Premium Suite"],
    image: "/luxury-golf-simulator-room.png",
    premium: false,
  },
  {
    id: "3",
    name: "Room 3",
    capacity: 4,
    standardRate: 50,
    premiumRate: 50,
    vipRate: 50,
    features: ["4K Ultra HD", "200+ Golf Courses", "Advanced Analytics", "Premium Suite"],
    image: "/large-golf-simulator-suite.png",
    premium: false,
  },
  {
    id: "4",
    name: "Room 4",
    capacity: 4,
    standardRate: 50,
    premiumRate: 50,
    vipRate: 50,
    features: ["4K Ultra HD", "200+ Golf Courses", "Advanced Analytics", "Premium Suite"],
    image: "/golf-simulator-room.png",
    premium: false,
  },
]

const timeSlots: TimeSlot[] = [
  { time: "09:00", available: true },
  { time: "10:00", available: true },
  { time: "11:00", available: false },
  { time: "12:00", available: true },
  { time: "13:00", available: true },
  { time: "14:00", available: true },
  { time: "15:00", available: false },
  { time: "16:00", available: true },
  { time: "17:00", available: true },
  { time: "18:00", available: true },
  { time: "19:00", available: false },
  { time: "20:00", available: true },
  { time: "21:00", available: true },
]

export default function BookingPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedRoom, setSelectedRoom] = useState<string>("")
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [numberOfPlayers, setNumberOfPlayers] = useState<string>("1")
  const { user } = useAuth()
  const router = useRouter()

  const handleBooking = () => {
    if (!user) {
      router.push("/login")
      return
    }

    if (!selectedRoom || !selectedTime || !selectedDate) {
      alert("Please select all booking details")
      return
    }

    // Mock booking process
    alert(
      `Booking confirmed!\nRoom: ${rooms.find((r) => r.id === selectedRoom)?.name}\nDate: ${selectedDate.toDateString()}\nTime: ${selectedTime}\nPlayers: ${numberOfPlayers}\nTotal Hours: ${numberOfPlayers}`,
    )
    router.push("/dashboard")
  }

  const selectedRoomData = rooms.find((r) => r.id === selectedRoom)

  const calculatePrice = () => {
    if (!selectedRoomData) return 0
    const players = Number.parseInt(numberOfPlayers)
    const ratePerPerson = 50 // Fixed rate for all rooms
    return ratePerPerson * players
  }

  const totalPrice = calculatePrice()
  const totalHours = Number.parseInt(numberOfPlayers)

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
                K-Golf
              </h1>
              <span className="ml-2 text-sm text-slate-400">Premium Screen Golf</span>
            </Link>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-sm text-slate-300">Welcome, {user.name}</span>
                  <Link href="/dashboard">
                    <Button
                      variant="outline"
                      className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 bg-transparent"
                    >
                      Dashboard
                    </Button>
                  </Link>
                </>
              ) : (
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 bg-transparent"
                  >
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-white mb-2">Book Your Premium Experience</h2>
          <p className="text-slate-400 text-lg">
            Choose from our 4 identical premium rooms. Each player gets 1 hour of screen golf time at $50 per person.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Room Selection */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                <Star className="h-6 w-6 text-amber-400" />
                Choose Your Room (All Identical)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {rooms.map((room) => (
                  <Card
                    key={room.id}
                    className={`cursor-pointer transition-all duration-300 bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 ${
                      selectedRoom === room.id
                        ? "ring-2 ring-amber-500 bg-slate-800/80 shadow-lg shadow-amber-500/20"
                        : "hover:shadow-xl hover:shadow-slate-900/50"
                    }`}
                    onClick={() => setSelectedRoom(room.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="relative">
                        <img
                          src={room.image || "/placeholder.svg"}
                          alt={room.name}
                          className="w-full h-24 object-cover rounded-lg mb-3"
                        />
                      </div>
                      <CardTitle className="text-base text-white">{room.name}</CardTitle>
                      <CardDescription className="text-slate-400 flex items-center gap-2 text-sm">
                        <Users className="h-3 w-3" />
                        Up to {room.capacity} players
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-center">
                        <div className="text-lg font-bold text-amber-400">$50</div>
                        <div className="text-xs text-slate-400">per person/hour</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Date and Time Selection */}
            {selectedRoom && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-6">Select Date</h3>
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                      className="rounded-md bg-transparent text-white"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                    <Clock className="h-6 w-6 text-amber-400" />
                    Available Time Slots
                  </h3>
                  <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto bg-slate-800/30 p-4 rounded-lg border border-slate-700">
                    {timeSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={selectedTime === slot.time ? "default" : "outline"}
                        className={`h-12 ${
                          selectedTime === slot.time
                            ? "bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
                            : slot.available
                              ? "border-slate-600 text-slate-300 hover:border-amber-500/50 hover:bg-slate-700/50 bg-slate-800/50"
                              : "opacity-30 cursor-not-allowed bg-slate-900/50 border-slate-800"
                        }`}
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 bg-slate-800/50 border-slate-700 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-b border-slate-700">
                <CardTitle className="text-white text-xl">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {selectedRoomData ? (
                  <>
                    <div className="space-y-2">
                      <p className="font-semibold text-white text-lg">{selectedRoomData.name}</p>
                      <p className="text-slate-400 flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Up to {selectedRoomData.capacity} players
                      </p>
                      <div className="text-amber-400 font-semibold">$50 per person/hour</div>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-semibold text-white">Number of Players</label>
                      <Select value={numberOfPlayers} onValueChange={setNumberOfPlayers}>
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="1" className="text-white hover:bg-slate-700">
                            1 Player (1 hour total)
                          </SelectItem>
                          <SelectItem value="2" className="text-white hover:bg-slate-700">
                            2 Players (2 hours total)
                          </SelectItem>
                          <SelectItem value="3" className="text-white hover:bg-slate-700">
                            3 Players (3 hours total)
                          </SelectItem>
                          <SelectItem value="4" className="text-white hover:bg-slate-700">
                            4 Players (4 hours total)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedDate && (
                      <div className="space-y-2">
                        <p className="font-semibold text-white">Date</p>
                        <p className="text-slate-300 bg-slate-700/50 px-3 py-2 rounded-md">
                          {selectedDate.toDateString()}
                        </p>
                      </div>
                    )}

                    {selectedTime && (
                      <div className="space-y-2">
                        <p className="font-semibold text-white">Start Time</p>
                        <p className="text-slate-300 bg-slate-700/50 px-3 py-2 rounded-md">{selectedTime}</p>
                      </div>
                    )}

                    <div className="border-t border-slate-700 pt-6">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-semibold text-white text-lg">Total</span>
                        <span className="text-3xl font-bold text-amber-400">${totalPrice}</span>
                      </div>
                      <div className="text-xs text-slate-400 mb-4">
                        {numberOfPlayers} player{numberOfPlayers !== "1" ? "s" : ""} × {totalHours} hour
                        {totalHours !== 1 ? "s" : ""} total
                      </div>
                    </div>

                    <Button
                      onClick={handleBooking}
                      className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-semibold py-3 text-lg shadow-lg"
                      disabled={!selectedTime || !selectedDate}
                    >
                      {user ? "Confirm Booking" : "Login to Book"}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Star className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500">Select a room to see booking details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
