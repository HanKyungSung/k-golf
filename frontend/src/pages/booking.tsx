import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@/components/ui/time-picker";
import { useAuth } from "@/hooks/use-auth";
import { Clock, Users, Star, CalendarIcon } from "lucide-react";

interface Room {
  // Unique UI id per card to control selection/highlight
  id: string;
  name: string;
  capacity: number;
  image: string;
  // Real backend Room.id to use for API calls
  backendId?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface Booking {
  id: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  customerName: string;
}

// Backend room shape (minimal)
type BackendRoom = { id: string; name: string; capacity: number };
type ApiSlot = { startIso: string; endIso: string; available: boolean };

// Static room templates to preserve UI names/images
const DISPLAY_ROOM_TEMPLATES: Array<{ name: string; image: string }> = [
  { name: "Room 1", image: "/golf-simulator-room.png" },
  { name: "Room 2", image: "/luxury-golf-simulator-room.png" },
  { name: "Room 3", image: "/large-golf-simulator-suite.png" },
  { name: "Room 4", image: "/golf-simulator-room.png" },
];

export default function BookingPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [numberOfPlayers, setNumberOfPlayers] = useState<string>("1");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Backend rooms and availability
  const [backendRooms, setBackendRooms] = useState<BackendRoom[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const selectedBackendId = rooms.find((r) => r.id === selectedRoom)?.backendId;

  // Load rooms and build 4 display rooms with backend IDs
  useEffect(() => {
    const loadRooms = async () => {
      setLoadingRooms(true);
      try {
        const apiBase = process.env.REACT_APP_API_BASE !== undefined ? process.env.REACT_APP_API_BASE : 'http://localhost:8080';
        const res = await fetch(`${apiBase}/api/bookings/rooms`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        const br: BackendRoom[] = Array.isArray(data.rooms) ? data.rooms : [];
        setBackendRooms(br);
        const display: Room[] = DISPLAY_ROOM_TEMPLATES.map((tpl, idx) => {
          const backing = br.length ? br[idx % br.length] : undefined;
          return {
            id: `display-${idx + 1}`,
            name: tpl.name,
            capacity: backing?.capacity ?? 4,
            image: tpl.image,
            backendId: backing?.id,
          };
        });
        setRooms(display);
      } finally {
        setLoadingRooms(false);
      }
    };
    loadRooms();
  }, []);

  // Fetch bookings when room or date changes
  useEffect(() => {
    const fetchBookings = async () => {
      if (!selectedRoom || !selectedDate) {
        setBookings([]);
        return;
      }

      const backendId = rooms.find((r) => r.id === selectedRoom)?.backendId;
      if (!backendId) {
        setBookings([]);
        return;
      }

      setLoadingBookings(true);
      try {
        const apiBase = process.env.REACT_APP_API_BASE !== undefined ? process.env.REACT_APP_API_BASE : 'http://localhost:8080';
        const dateStr = toLocalYMD(selectedDate);
        const res = await fetch(
          `${apiBase}/api/bookings/by-room-date?roomId=${backendId}&date=${dateStr}`,
          { credentials: "include" }
        );
        if (!res.ok) {
          setBookings([]);
          return;
        }
        const data = await res.json();
        // Map backend bookings to include the display room ID
        const mappedBookings = (data.bookings || []).map((b: any) => ({
          ...b,
          roomId: selectedRoom, // Use display room ID for filtering
        }));
        setBookings(mappedBookings);
      } catch (error) {
        console.error('Failed to fetch bookings:', error);
        setBookings([]);
      } finally {
        setLoadingBookings(false);
      }
    };

    fetchBookings();
  }, [selectedRoom, selectedDate, rooms]);

  // Helper: local date + HH:mm to UTC ISO
  const toStartIso = (date: Date, timeHHmm: string) => {
    const [hh, mm] = timeHHmm.split(":").map((x) => parseInt(x, 10));
    const d = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hh,
      mm,
      0,
      0
    );
    return d.toISOString();
  };

  // Helper: format date as local YYYY-MM-DD (not UTC)
  const toLocalYMD = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Calculate end time based on start time and number of players (1 hour per player)
  const calculateEndTime = (start: string, players: number) => {
    if (!start) return "";
    const [hours, minutes] = start.split(":").map(Number);
    const endDate = new Date();
    endDate.setHours(hours, minutes, 0, 0);
    endDate.setHours(endDate.getHours() + players);
    return `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
  };

  const endTime = calculateEndTime(startTime, Number.parseInt(numberOfPlayers));

  // Check if a time slot is available
  const isTimeSlotAvailable = (roomId: string, date: Date, start: string, end: string): boolean => {
    const dateStr = date.toISOString().split("T")[0];
    const roomBookings = bookings.filter((b) => b.roomId === roomId && b.date === dateStr);

    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);
    const requestStart = startHour * 60 + startMin;
    const requestEnd = endHour * 60 + endMin;

    for (const booking of roomBookings) {
      const [bookStartHour, bookStartMin] = booking.startTime.split(":").map(Number);
      const [bookEndHour, bookEndMin] = booking.endTime.split(":").map(Number);
      const bookStart = bookStartHour * 60 + bookStartMin;
      const bookEnd = bookEndHour * 60 + bookEndMin;

      // Check for overlap
      if (
        (requestStart >= bookStart && requestStart < bookEnd) ||
        (requestEnd > bookStart && requestEnd <= bookEnd) ||
        (requestStart <= bookStart && requestEnd >= bookEnd)
      ) {
        return false;
      }
    }

    return true;
  };

  const canBook =
    selectedRoom &&
    selectedDate &&
    startTime &&
    endTime &&
    isTimeSlotAvailable(selectedRoom, selectedDate, startTime, endTime);

  const handleBooking = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!canBook) {
      alert("This time slot is not available. Please choose a different time.");
      return;
    }

    try {
      const apiBase = process.env.REACT_APP_API_BASE !== undefined ? process.env.REACT_APP_API_BASE : 'http://localhost:8080';
      const startTimeIso = toStartIso(selectedDate!, startTime);
      const backendId = rooms.find((r) => r.id === selectedRoom)?.backendId;
      if (!backendId) {
        alert("No backend room available for this selection");
        return;
      }
      const res = await fetch(`${apiBase}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          roomId: backendId,
          startTimeIso,
          players: parseInt(numberOfPlayers, 10),
          hours: parseInt(numberOfPlayers, 10), // 1 hour per player
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.message || err?.error || "Failed to create booking");
        return;
      }
      alert(
        `Booking confirmed!\nRoom: ${selectedRoomData?.name}\nDate: ${selectedDate?.toDateString()}\nTime: ${startTime} - ${endTime}\nPlayers: ${numberOfPlayers}`
      );
      navigate("/dashboard");
    } catch (error) {
      console.error('Booking error:', error);
      alert("Network error while creating booking");
    }
  };

  const selectedRoomData = rooms.find((r) => r.id === selectedRoom);

  const calculatePrice = () => {
    if (!selectedRoomData) return 0;
    const players = Number.parseInt(numberOfPlayers);
    const ratePerPersonPerHour = 35; // Fixed rate for all rooms
    return ratePerPersonPerHour * players;
  };

  const totalPrice = calculatePrice();
  const totalHours = Number.parseInt(numberOfPlayers); // 1 hour per player

  const getBookingsForTimeline = () => {
    if (!selectedRoom || !selectedDate) return [];
    const dateStr = selectedDate.toISOString().split("T")[0];
    return bookings.filter((b) => b.roomId === selectedRoom && b.date === dateStr);
  };

  const timelineBookings = getBookingsForTimeline();

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
                K-Golf
              </h1>
              <span className="ml-2 text-sm text-slate-400">
                Premium Screen Golf
              </span>
            </Link>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-sm text-slate-300">
                    Welcome, {user.name}
                  </span>
                  <Link to="/dashboard">
                    <Button
                      variant="outline"
                      className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 bg-transparent"
                    >
                      Dashboard
                    </Button>
                  </Link>
                </>
              ) : (
                <Link to="/login">
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
          <h2 className="text-4xl font-bold text-white mb-2">
            Book Your Premium Experience
          </h2>
          <p className="text-slate-400 text-lg">
            Choose your preferred time flexibly. Each player gets 1 hour of screen golf time at $35 per person (tax not included).
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {rooms.map((room) => {
                  const roomNumber = room.name.match(/\d+/)?.[0] || '1';
                  const handPreference = ['1', '2'].includes(roomNumber) ? 'Right-Handed' : 'Both Hands';
                  
                  return (
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
                        <div className="relative mb-3">
                          <img
                            src={room.image || "/placeholder.svg"}
                            alt={room.name}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                        </div>
                        <CardTitle className="text-base text-white">
                          {room.name}
                        </CardTitle>
                        <CardDescription className="text-slate-400 flex items-center gap-2 text-sm">
                          <Users className="h-3 w-3" />
                          Up to {room.capacity} players
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div className="text-center mb-3">
                            <div className="text-lg font-bold text-amber-400">$35</div>
                            <div className="text-xs text-slate-400">per person/hour (+ tax)</div>
                          </div>

                          {/* Hand Preference Badge */}
                          <div className="flex items-center justify-center">
                            {handPreference === 'Right-Handed' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
                                  />
                                </svg>
                                Right-Handed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
                                  />
                                </svg>
                                Both Hands
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {selectedRoom && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                      <CalendarIcon className="h-6 w-6 text-amber-400" />
                      Select Date
                    </h3>
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                      <Clock className="h-6 w-6 text-amber-400" />
                      Choose Start Time
                    </h3>
                    <div className="space-y-4 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                      <div className="space-y-2">
                        <Label htmlFor="players" className="text-white font-medium">
                          Number of Players
                        </Label>
                        <Select value={numberOfPlayers} onValueChange={setNumberOfPlayers}>
                          <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="1" className="text-white hover:bg-slate-700">
                              1 Player (1 hour)
                            </SelectItem>
                            <SelectItem value="2" className="text-white hover:bg-slate-700">
                              2 Players (2 hours)
                            </SelectItem>
                            <SelectItem value="3" className="text-white hover:bg-slate-700">
                              3 Players (3 hours)
                            </SelectItem>
                            <SelectItem value="4" className="text-white hover:bg-slate-700">
                              4 Players (4 hours)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white font-medium">
                          Start Time (9:00 AM - 10:00 PM)
                        </Label>
                        <TimePicker
                          value={startTime}
                          onChange={setStartTime}
                          minTime="09:00"
                          maxTime="22:00"
                        />
                      </div>

                      {startTime && endTime && (
                        <div className="pt-4 border-t border-slate-700">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Session Duration:</span>
                            <span className="text-white font-semibold">
                              {startTime} - {endTime}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <div
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                canBook
                                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                  : "bg-red-500/20 text-red-400 border border-red-500/30"
                              }`}
                            >
                              {canBook ? "✓ Available" : "✗ Not Available"}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedDate && (
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-6">
                      Current Bookings for {selectedRoomData?.name}
                    </h3>
                    <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                      <div className="relative">
                        {/* Timeline */}
                        <div className="flex items-center mb-4">
                          <div className="text-xs text-slate-500 w-16">9 AM</div>
                          <div className="flex-1 h-12 bg-slate-900/50 rounded-lg relative border border-slate-700">
                            {/* Hour markers */}
                            {Array.from({ length: 13 }).map((_, i) => (
                              <div
                                key={i}
                                className="absolute top-0 bottom-0 border-l border-slate-700/50"
                                style={{ left: `${(i / 13) * 100}%` }}
                              >
                                <span className="absolute -top-5 -left-3 text-[10px] text-slate-600">{9 + i}</span>
                              </div>
                            ))}

                            {/* Existing bookings */}
                            {timelineBookings.map((booking) => {
                              const [startHour, startMin] = booking.startTime.split(":").map(Number);
                              const [endHour, endMin] = booking.endTime.split(":").map(Number);
                              const startMinutes = (startHour - 9) * 60 + startMin;
                              const endMinutes = (endHour - 9) * 60 + endMin;
                              const duration = endMinutes - startMinutes;
                              const totalMinutes = 13 * 60;
                              const left = (startMinutes / totalMinutes) * 100;
                              const width = (duration / totalMinutes) * 100;

                              return (
                                <div
                                  key={booking.id}
                                  className="absolute top-1 bottom-1 bg-red-500/30 border border-red-500/50 rounded px-1 flex items-center justify-center"
                                  style={{
                                    left: `${left}%`,
                                    width: `${width}%`,
                                  }}
                                >
                                  <span className="text-[10px] text-red-300 font-medium truncate">
                                    {booking.startTime}-{booking.endTime}
                                  </span>
                                </div>
                              );
                            })}

                            {/* Proposed booking */}
                            {startTime &&
                              endTime &&
                              (() => {
                                const [startHour, startMin] = startTime.split(":").map(Number);
                                const [endHour, endMin] = endTime.split(":").map(Number);
                                if (startHour < 9 || endHour > 22) return null;
                                const startMinutes = (startHour - 9) * 60 + startMin;
                                const endMinutes = (endHour - 9) * 60 + endMin;
                                const duration = endMinutes - startMinutes;
                                const totalMinutes = 13 * 60;
                                const left = (startMinutes / totalMinutes) * 100;
                                const width = (duration / totalMinutes) * 100;

                                return (
                                  <div
                                    className={`absolute top-1 bottom-1 rounded px-1 flex items-center justify-center ${
                                      canBook
                                        ? "bg-green-500/30 border border-green-500/50"
                                        : "bg-amber-500/30 border border-amber-500/50"
                                    }`}
                                    style={{
                                      left: `${left}%`,
                                      width: `${width}%`,
                                    }}
                                  >
                                    <span
                                      className={`text-[10px] font-medium truncate ${
                                        canBook ? "text-green-300" : "text-amber-300"
                                      }`}
                                    >
                                      {startTime}-{endTime}
                                    </span>
                                  </div>
                                );
                              })()}
                          </div>
                          <div className="text-xs text-slate-500 w-16 text-right">10 PM</div>
                        </div>

                        {/* Legend */}
                        <div className="flex gap-4 text-xs mt-4">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-500/30 border border-red-500/50 rounded"></div>
                            <span className="text-slate-400">Booked</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-500/30 border border-green-500/50 rounded"></div>
                            <span className="text-slate-400">Your Selection (Available)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-amber-500/30 border border-amber-500/50 rounded"></div>
                            <span className="text-slate-400">Your Selection (Conflict)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 bg-slate-800/50 border-slate-700 shadow-xl">
              <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-b border-slate-700 h-16 flex items-center justify-center">
                <h3 className="text-white text-xl font-semibold">
                  Booking Summary
                </h3>
              </div>
              <CardContent className="space-y-6 p-6">
                {selectedRoomData ? (
                  <>
                    <div className="space-y-2">
                      <p className="font-semibold text-white text-lg">
                        {selectedRoomData.name}
                      </p>
                      <p className="text-slate-400 flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {numberOfPlayers} player{numberOfPlayers !== "1" ? "s" : ""}
                      </p>
                      <div className="text-amber-400 font-semibold">
                        $35 per hour
                      </div>
                    </div>

                    {selectedDate && (
                      <div className="space-y-2">
                        <p className="font-semibold text-white">Date</p>
                        <p className="text-slate-300 bg-slate-700/50 px-3 py-2 rounded-md">
                          {selectedDate.toDateString()}
                        </p>
                      </div>
                    )}

                    {startTime && endTime && (
                      <div className="space-y-2">
                        <p className="font-semibold text-white">Time</p>
                        <p className="text-slate-300 bg-slate-700/50 px-3 py-2 rounded-md">
                          {startTime} - {endTime}
                        </p>
                      </div>
                    )}

                    <div className="border-t border-slate-700 pt-6">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-semibold text-white text-lg">
                          Total
                        </span>
                        <span className="text-3xl font-bold text-amber-400">
                          ${totalPrice}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mb-4">
                        {numberOfPlayers} player{numberOfPlayers !== "1" ? "s" : ""} × {totalHours} hour
                        {totalHours !== 1 ? "s" : ""}
                      </div>
                    </div>

                    <Button
                      onClick={handleBooking}
                      className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-semibold py-3 text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!canBook || !user}
                    >
                      {!user ? "Login to Book" : !canBook ? "Time Unavailable" : "Confirm Booking"}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Star className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500">
                      Select a room to see booking details
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
