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
import { useAuth } from "@/hooks/use-auth";
import { Clock, Users, Star, CalendarIcon } from "lucide-react";
import { TimePicker } from "../components/pos/TimePicker";

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
  { name: "Room 1", image: "/room1.jpeg" },
  { name: "Room 2", image: "/room2.jpeg" },
  { name: "Room 3", image: "/room3.jpeg" },
  { name: "Room 4", image: "/room4.jpeg" },
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

  // Restore saved booking selections from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('pendingBooking');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.selectedDate) setSelectedDate(new Date(data.selectedDate));
        if (data.selectedRoom) setSelectedRoom(data.selectedRoom);
        if (data.startTime) setStartTime(data.startTime);
        if (data.numberOfPlayers) setNumberOfPlayers(data.numberOfPlayers);
        // Clear after restoring
        sessionStorage.removeItem('pendingBooking');
      } catch (e) {
        console.error('Failed to restore booking selections:', e);
      }
    }
  }, []);

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
        // Map backend bookings (ISO strings) to HH:MM in user's browser timezone
        const mappedBookings = (data.bookings || []).map((b: any) => ({
          ...b,
          roomId: selectedRoom, // Use display room ID for filtering
          startTime: new Date(b.startTime).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }),
          endTime: new Date(b.endTime).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }),
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
      // Save current selections to sessionStorage before redirecting to login
      sessionStorage.setItem('pendingBooking', JSON.stringify({
        selectedDate: selectedDate?.toISOString(),
        selectedRoom,
        startTime,
        numberOfPlayers
      }));
      navigate("/login");
      return;
    }

    if (!canBook) {
      alert("This time slot is not available. Please choose a different time.");
      return;
    }

    try {
      const apiBase = process.env.REACT_APP_API_BASE !== undefined ? process.env.REACT_APP_API_BASE : 'http://localhost:8080';
      // Convert to milliseconds timestamp in Atlantic Time (UTC-4)
      // User selects time in Atlantic Time, we need to convert to UTC timestamp
      const [hh, mm] = startTime.split(":").map(Number);
      
      // Create date string in Atlantic Time format: YYYY-MM-DDTHH:MM:SS-04:00
      const year = selectedDate!.getFullYear();
      const month = String(selectedDate!.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate!.getDate()).padStart(2, '0');
      const hour = String(hh).padStart(2, '0');
      const minute = String(mm).padStart(2, '0');
      const atlanticTimeString = `${year}-${month}-${day}T${hour}:${minute}:00-04:00`;
      
      // Parse as UTC timestamp
      const startTimeMs = new Date(atlanticTimeString).getTime();
      
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
          startTimeMs,
          players: parseInt(numberOfPlayers, 10),
          hours: parseInt(numberOfPlayers, 10), // 1 hour per player
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.message || err?.error || "Failed to create booking");
        return;
      }
      const result = await res.json();
      // Redirect to confirmation page instead of showing alert
      navigate(`/booking/confirmation/${result.booking.id}`);
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
                K one Golf
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

        <div className="space-y-8">
          {/* Room Selection */}
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

          {/* Date and Time Selection */}
          {selectedRoom && (
            <div>
              <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                <CalendarIcon className="h-6 w-6 text-amber-400" />
                Select Date & Time
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-amber-400" />
                    Select Date
                  </h4>
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      className="rounded-md border border-slate-700 bg-slate-800 p-3"
                      classNames={{
                        months: "flex flex-col",
                        month: "space-y-4 w-full",
                        caption: "flex justify-center pt-1 relative items-center",
                        caption_label: "text-sm font-medium text-white",
                        nav: "space-x-1 flex items-center",
                        nav_button:
                          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 text-white hover:bg-slate-700 rounded-md",
                        nav_button_previous: "absolute left-1",
                        nav_button_next: "absolute right-1",
                        table: "w-full border-collapse",
                        head_row: "flex w-full",
                        head_cell: "text-slate-400 rounded-md w-full font-normal text-xs flex-1",
                        row: "flex w-full mt-2",
                        cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1",
                        day: "h-9 w-full p-0 font-normal text-white hover:bg-slate-700 rounded-md inline-flex items-center justify-center",
                        day_selected:
                          "bg-amber-500 text-slate-900 hover:bg-amber-600 hover:text-slate-900 focus:bg-amber-500 focus:text-slate-900 font-semibold",
                        day_today: "bg-slate-700 text-white font-medium",
                        day_outside: "text-slate-600 opacity-50",
                        day_disabled: "text-slate-600 opacity-30 cursor-not-allowed",
                        day_range_middle: "aria-selected:bg-slate-700 aria-selected:text-white",
                        day_hidden: "invisible",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-400" />
                    Choose Start Time
                  </h4>
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
                      <Label htmlFor="start-time" className="text-white font-medium">
                        Start Time (10:00 AM - 12:00 AM)
                      </Label>
                      <TimePicker
                        id="start-time"
                        value={startTime}
                        onChange={(value) => setStartTime(value)}
                        className="bg-slate-700/50 border-slate-600 text-white"
                        maxDurationHours={parseInt(numberOfPlayers, 10)}
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
            </div>
          )}

          {/* Booking Summary and Timeline */}
          {selectedDate && selectedRoom && (
            <div className="space-y-6">
              {/* Current Bookings Timeline */}
              <div>
                <h3 className="text-2xl font-semibold text-white mb-6">
                  Current Bookings for {selectedRoomData?.name}
                </h3>
                <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                  <div className="relative">
                    {/* Timeline with hour labels */}
                    <div className="space-y-2">
                      {/* Hour labels row */}
                      <div className="flex items-center">
                        <div className="w-20 text-xs font-medium text-slate-400">Time</div>
                        <div className="flex-1 flex justify-between px-1">
                          {Array.from({ length: 15 }).map((_, i) => {
                            const hour = 10 + i;
                            const displayHour = hour > 12 ? hour - 12 : hour;
                            const ampm = hour >= 12 ? 'PM' : 'AM';
                            return (
                              <div key={i} className="text-xs text-slate-400 font-medium" style={{ width: '7.14%', textAlign: 'center' }}>
                                {i % 2 === 0 && `${displayHour}${ampm}`}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Timeline bar */}
                      <div className="flex items-center">
                        <div className="w-20 text-xs text-slate-500">Bookings</div>
                        <div className="flex-1 h-14 bg-slate-900/50 rounded-lg relative border border-slate-700 overflow-hidden">
                          {/* Hour markers */}
                          {Array.from({ length: 15 }).map((_, i) => (
                            <div
                              key={i}
                              className="absolute top-0 bottom-0 border-l border-slate-700/50"
                              style={{ left: `${(i / 14) * 100}%` }}
                            />
                          ))}

                        {/* Existing bookings */}
                        {timelineBookings.map((booking) => {
                          const [startHour, startMin] = booking.startTime.split(":").map(Number);
                          const [endHour, endMin] = booking.endTime.split(":").map(Number);
                          const startMinutes = (startHour - 10) * 60 + startMin;
                          const endMinutes = endHour === 0 ? (24 - 10) * 60 + endMin : (endHour - 10) * 60 + endMin;
                          const duration = endMinutes - startMinutes;
                          const totalMinutes = 14 * 60;
                          const left = (startMinutes / totalMinutes) * 100;
                          const width = (duration / totalMinutes) * 100;

                          return (
                            <div
                              key={booking.id}
                              className="absolute top-1 bottom-1 bg-slate-600/50 border border-slate-500/50 rounded px-1 flex items-center justify-center"
                              style={{
                                left: `${Math.max(0, Math.min(100, left))}%`,
                                width: `${Math.max(0, Math.min(100 - left, width))}%`,
                              }}
                            >
                              <span className="text-[10px] text-slate-300 font-medium truncate">Booked</span>
                            </div>
                          );
                        })}

                        {/* Proposed booking */}
                        {startTime &&
                          endTime &&
                          (() => {
                            const [startHour, startMin] = startTime.split(":").map(Number);
                            const [endHour, endMin] = endTime.split(":").map(Number);
                            if (startHour < 10 || (endHour > 0 && endHour < 10)) return null;
                            const startMinutes = (startHour - 10) * 60 + startMin;
                            const endMinutes = endHour === 0 ? (24 - 10) * 60 + endMin : (endHour - 10) * 60 + endMin;
                            const duration = endMinutes - startMinutes;
                            const totalMinutes = 14 * 60;
                            const left = (startMinutes / totalMinutes) * 100;
                            const width = (duration / totalMinutes) * 100;
                            const available = canBook;

                            return (
                              <div
                                className={`absolute top-1 bottom-1 border-2 rounded px-1 flex items-center justify-center ${
                                  available
                                    ? "bg-green-500/30 border-green-500/70"
                                    : "bg-amber-500/30 border-amber-500/70"
                                }`}
                                style={{
                                  left: `${Math.max(0, Math.min(100, left))}%`,
                                  width: `${Math.max(0, Math.min(100 - left, width))}%`,
                                }}
                              >
                                <span
                                  className={`text-[10px] font-medium truncate ${
                                    available ? "text-green-300" : "text-amber-300"
                                  }`}
                                >
                                  Your Booking
                                </span>
                              </div>
                            );
                          })()}
                      </div>
                    </div>
                  </div>

                    {/* Legend */}
                    <div className="flex gap-6 justify-center pt-4 border-t border-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-slate-600/50 border border-slate-500/50 rounded" />
                        <span className="text-xs text-slate-400">Booked</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500/30 border-2 border-green-500/70 rounded" />
                        <span className="text-xs text-slate-400">Your Booking (Available)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-amber-500/30 border-2 border-amber-500/70 rounded" />
                        <span className="text-xs text-slate-400">Your Booking (Conflict)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Summary */}
              <div>
                <h3 className="text-2xl font-semibold text-white mb-6">Booking Summary</h3>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Confirm Your Booking</CardTitle>
                    <CardDescription className="text-slate-400">Review your selection before booking</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400">Room</p>
                        <p className="text-white font-semibold">{selectedRoomData?.name}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Date</p>
                        <p className="text-white font-semibold">{selectedDate?.toDateString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Time</p>
                        <p className="text-white font-semibold">
                          {startTime || "--:--"} - {endTime || "--:--"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Players</p>
                        <p className="text-white font-semibold">{numberOfPlayers}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Duration</p>
                        <p className="text-white font-semibold">{totalHours} hour(s)</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Rate</p>
                        <p className="text-white font-semibold">$35/hour</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-slate-700">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span className="text-white">Total (before tax)</span>
                        <span className="text-amber-400">${totalPrice}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        $35 × {numberOfPlayers} player(s) × {totalHours} hour(s)
                      </p>
                    </div>
                    <Button
                      onClick={handleBooking}
                      disabled={!canBook}
                      className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-semibold py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {!user ? "Login to Book" : !canBook && startTime ? "Time Slot Not Available" : "Confirm Booking"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
