"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import Link from "next/link"
import { Clock, Users, Star } from "lucide-react"

interface Room {
  id: string
  name: string
  capacity: number
  hourlyRate: number
  halfHourRate: number
  features: string[]
  image: string
  premium: boolean
}

interface TimeSlot {
  time: string
  available: boolean
  price: number
}

const rooms: Room[] = [
  {
    id: "1",
    name: "Premium Suite A",
    capacity: 4,
    hourlyRate: 80,
    halfHourRate: 45,
    features: ["4K Display", "Premium Sound", "Climate Control", "Refreshments"],
    image: "/luxury-golf-simulator-room.png",
    premium: true,
  },
  {
    id: "2",
    name: "Standard Room B",
    capacity: 2,
    hourlyRate: 50,
    halfHourRate: 30,
    features: ["HD Display", "Sound System", "Air Conditioning"],
    image: "/golf-simulator-room.png",
    premium: false,
  },
  {
    id: "3",
    name: "Group Suite C",
    capacity: 8,
    hourlyRate: 120,
    halfHourRate: 70,
    features: ["Ultra 4K Display", "Surround Sound", "VIP Lounge", "Catering Service"],
    image: "/large-golf-simulator-suite.png",
    premium: true,
  },
]

const timeSlots: TimeSlot[] = [
  { time: "09:00", available: true, price: 50 },
  { time: "09:30", available: true, price: 30 },
  { time: "10:00", available: true, price: 50 },
  { time: "10:30", available: false, price: 30 },
  { time: "11:00", available: false, price: 50 },
  { time: "11:30", available: true, price: 30 },
  { time: "12:00", available: true, price: 60 },
  { time: "12:30", available: true, price: 35 },
  { time: "13:00", available: true, price: 60 },
  { time: "13:30", available: true, price: 35 },
  { time: "14:00", available: true, price: 60 },
  { time: "14:30", available: false, price: 35 },
  { time: "15:00", available: false, price: 60 },
  { time: "15:30", available: true, price: 35 },
  { time: "16:00", available: true, price: 70 },
  { time: "16:30", available: true, price: 40 },
  { time: "17:00", available: true, price: 70 },
  { time: "17:30", available: true, price: 40 },
  { time: "18:00", available: true, price: 80 },
  { time: "18:30", available: false, price: 45 },
  { time: "19:00", available: false, price: 80 },
  { time: "19:30", available: true, price: 45 },
  { time: "20:00", available: true, price: 80 },
  { time: "20:30", available: true, price: 45 },
]

export default function BookingPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedRoom, setSelectedRoom] = useState<string>("")
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [duration, setDuration] = useState<string>("1")
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
      `Booking confirmed!\nRoom: ${rooms.find((r) => r.id === selectedRoom)?.name}\nDate: ${selectedDate.toDateString()}\nTime: ${selectedTime}\nDuration: ${duration === "0.5" ? "30 minutes" : `${duration} hour(s)`}`,
    )
    router.push("/dashboard")
  }

  const selectedRoomData = rooms.find((r) => r.id === selectedRoom)
  const selectedTimeData = timeSlots.find((t) => t.time === selectedTime)

  const calculatePrice = () => {
    if (!selectedRoomData) return 0
    const durationNum = Number.parseFloat(duration)
    if (durationNum === 0.5) {
      return selectedRoomData.halfHourRate
    }
    return selectedRoomData.hourlyRate * durationNum
  }

  const totalPrice = calculatePrice()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
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
            Select your preferred room, date, and time slot for the ultimate screen golf experience
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Room Selection */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                <Star className="h-6 w-6 text-amber-400" />
                Choose Your Room
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          className="w-full h-40 object-cover rounded-lg mb-4"
                        />
                        {room.premium && (
                          <Badge className="absolute top-2 right-2 bg-amber-500 text-black font-semibold">
                            Premium
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl text-white">{room.name}</CardTitle>
                      <CardDescription className="text-slate-400 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          Up to {room.capacity} players
                        </span>
                        <span className="text-amber-400 font-semibold">
                          ${room.halfHourRate}/30min • ${room.hourlyRate}/hour
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {room.features.map((feature) => (
                          <Badge
                            key={feature}
                            variant="secondary"
                            className="bg-slate-700 text-slate-300 border-slate-600"
                          >
                            {feature}
                          </Badge>
                        ))}
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
                        className={`h-14 ${
                          selectedTime === slot.time
                            ? "bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                            : slot.available
                              ? "border-slate-600 text-slate-300 hover:border-amber-500/50 hover:bg-slate-700/50 bg-slate-800/50"
                              : "opacity-30 cursor-not-allowed bg-slate-900/50 border-slate-800"
                        }`}
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                      >
                        <div className="text-center">
                          <div className="font-medium text-base">{slot.time}</div>
                          <div className="text-xs opacity-75">
                            {slot.time.includes(":30") ? "30min slot" : "1hr slot"}
                          </div>
                        </div>
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
              <CardHeader className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-b border-slate-700">
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
                      {selectedRoomData.premium && (
                        <Badge className="bg-amber-500 text-black font-semibold">Premium Experience</Badge>
                      )}
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
                        <p className="font-semibold text-white">Time</p>
                        <p className="text-slate-300 bg-slate-700/50 px-3 py-2 rounded-md">{selectedTime}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="block font-semibold text-white">Duration</label>
                      <Select value={duration} onValueChange={setDuration}>
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="0.5" className="text-white hover:bg-slate-700">
                            30 minutes
                          </SelectItem>
                          <SelectItem value="1" className="text-white hover:bg-slate-700">
                            1 hour
                          </SelectItem>
                          <SelectItem value="1.5" className="text-white hover:bg-slate-700">
                            1.5 hours
                          </SelectItem>
                          <SelectItem value="2" className="text-white hover:bg-slate-700">
                            2 hours
                          </SelectItem>
                          <SelectItem value="3" className="text-white hover:bg-slate-700">
                            3 hours
                          </SelectItem>
                          <SelectItem value="4" className="text-white hover:bg-slate-700">
                            4 hours
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="border-t border-slate-700 pt-6">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-semibold text-white text-lg">Total</span>
                        <span className="text-3xl font-bold text-amber-400">${totalPrice}</span>
                      </div>
                      <div className="text-xs text-slate-400 mb-4">
                        {duration === "0.5" ? "30-minute session" : `${duration} hour session`}
                      </div>
                    </div>

                    <Button
                      onClick={handleBooking}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold py-3 text-lg shadow-lg"
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
