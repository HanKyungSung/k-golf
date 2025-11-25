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
import { useAuth } from "@/hooks/use-auth";
import { Clock, Users, Star } from "lucide-react";
import { getApiBase } from "@/lib/api";

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
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [numberOfPlayers, setNumberOfPlayers] = useState<string>("1");
  const [hours, setHours] = useState<string>("1");
  const { user } = useAuth();
  const navigate = useNavigate();

  // Backend rooms and availability
  const [backendRooms, setBackendRooms] = useState<BackendRoom[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [apiSlots, setApiSlots] = useState<ApiSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const selectedBackendId = rooms.find((r) => r.id === selectedRoom)?.backendId;

  // Load rooms and build 4 display rooms with backend IDs
  useEffect(() => {
    const loadRooms = async () => {
      setLoadingRooms(true);
      try {
        const apiBase = getApiBase();
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

  // Fetch availability when room/date/hours change
  useEffect(() => {
    const fetchAvailability = async () => {
      const backendId = rooms.find((r) => r.id === selectedRoom)?.backendId;
      if (!backendId || !selectedDate) {
        setApiSlots([]);
        return;
      }
      setLoadingSlots(true);
      try {
        const apiBase = getApiBase();
        const dateStr = toLocalYMD(selectedDate);
        const params = new URLSearchParams({
          roomId: backendId,
          date: dateStr,
          hours,
          slotMinutes: "60",
          openStart: "09:00",
          openEnd: "23:00",
        });
        const res = await fetch(
          `${apiBase}/api/bookings/availability?${params.toString()}`,
          { credentials: "include" }
        );
        if (!res.ok) {
          setApiSlots([]);
          return;
        }
        const data = await res.json();
        setApiSlots(Array.isArray(data.slots) ? data.slots : []);
      } catch {
        setApiSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchAvailability();
  }, [selectedRoom, selectedDate, hours]);

  const handleBooking = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!selectedRoom || !selectedTime || !selectedDate) {
      alert("Please select all booking details");
      return;
    }

    try {
      const apiBase = getApiBase();
      const startTimeIso = toStartIso(selectedDate, selectedTime);
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
          hours: parseInt(hours, 10),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.message || err?.error || "Failed to create booking");
        return;
      }
      navigate("/dashboard");
    } catch {
      alert("Network error while creating booking");
    }
  };

  const selectedRoomData = rooms.find((r) => r.id === selectedRoom);

  const calculatePrice = () => {
    if (!selectedRoomData) return 0;
    const players = Number.parseInt(numberOfPlayers);
    const hrs = Number.parseInt(hours);
    const ratePerPersonPerHour = 50; // Fixed rate for all rooms
    return ratePerPersonPerHour * players * hrs;
  };

  const totalPrice = calculatePrice();
  const totalHours = Number.parseInt(hours);

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
            Choose from our 4 identical premium rooms. Pricing is $50 per person
            per hour.
          </p>
          <p className="text-slate-400 text-sm mt-1">
            Recommendation: plan roughly 1 hour per player for the best
            experience.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Room Selection */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h3 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
                <Star className="h-6 w-6 text-amber-400" />
                Choose Your Room (All Identical)
              </h3>
              {backendRooms.length === 0 && (
                <p className="text-sm text-amber-400 mb-4">
                  No rooms found on server. Showing placeholders — please seed
                  the database.
                </p>
              )}
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
                      <CardTitle className="text-base text-white">
                        {room.name}
                      </CardTitle>
                      <CardDescription className="text-slate-400 flex items-center gap-2 text-sm">
                        <Users className="h-3 w-3" />
                        Up to {room.capacity} players
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-center">
                        <div className="text-lg font-bold text-amber-400">
                          $50
                        </div>
                        <div className="text-xs text-slate-400">
                          per person/hour
                        </div>
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
                  <h3 className="text-2xl font-semibold text-white mb-6">
                    Select Date
                  </h3>
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => {
                        const now = new Date();
                        const startOfToday = new Date(
                          now.getFullYear(),
                          now.getMonth(),
                          now.getDate()
                        );
                        return date < startOfToday;
                      }}
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
                    {loadingSlots && (
                      <div className="col-span-2 text-slate-400">
                        Loading slots…
                      </div>
                    )}
                    {!loadingSlots && apiSlots.length === 0 && (
                      <div className="col-span-2 text-slate-500">
                        {selectedBackendId
                          ? "No slots found for this day."
                          : "This room is not linked to a server room yet. Please seed the database to enable booking."}
                      </div>
                    )}
                    {!loadingSlots &&
                      apiSlots.map((s) => {
                        const local = new Date(s.startIso);
                        const hh = String(local.getHours()).padStart(2, "0");
                        const mm = String(local.getMinutes()).padStart(2, "0");
                        const time = `${hh}:${mm}`;
                        const available = !!s.available;
                        return (
                          <Button
                            key={s.startIso}
                            variant={
                              selectedTime === time ? "default" : "outline"
                            }
                            className={`h-12 ${
                              selectedTime === time
                                ? "bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
                                : available
                                ? "border-slate-600 text-slate-300 hover:border-amber-500/50 hover:bg-slate-700/50 bg-slate-800/50"
                                : "opacity-30 cursor-not-allowed bg-slate-900/50 border-slate-800"
                            }`}
                            disabled={!available}
                            onClick={() => setSelectedTime(time)}
                          >
                            {time}
                          </Button>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 bg-slate-800/50 border-slate-700 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-b border-slate-700">
                <CardTitle className="text-white text-xl">
                  Booking Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {selectedRoomData ? (
                  <>
                    <div className="space-y-2">
                      <p className="font-semibold text-white text-lg">
                        {selectedRoomData.name}
                      </p>
                      <p className="text-slate-400 flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Up to {selectedRoomData.capacity} players
                      </p>
                      <div className="text-amber-400 font-semibold">
                        $50 per person/hour
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-semibold text-white">
                        Number of Players
                      </label>
                      <Select
                        value={numberOfPlayers}
                        onValueChange={setNumberOfPlayers}
                      >
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem
                            value="1"
                            className="text-white hover:bg-slate-700"
                          >
                            1 Player
                          </SelectItem>
                          <SelectItem
                            value="2"
                            className="text-white hover:bg-slate-700"
                          >
                            2 Players
                          </SelectItem>
                          <SelectItem
                            value="3"
                            className="text-white hover:bg-slate-700"
                          >
                            3 Players
                          </SelectItem>
                          <SelectItem
                            value="4"
                            className="text-white hover:bg-slate-700"
                          >
                            4 Players
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-semibold text-white">
                        Hours
                      </label>
                      <Select value={hours} onValueChange={setHours}>
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem
                            value="1"
                            className="text-white hover:bg-slate-700"
                          >
                            1 Hour{" "}
                            {Number(numberOfPlayers) > 1
                              ? "(short for group)"
                              : ""}
                          </SelectItem>
                          <SelectItem
                            value="2"
                            className="text-white hover:bg-slate-700"
                          >
                            2 Hours{" "}
                            {Number(numberOfPlayers) === 2
                              ? "(recommended)"
                              : ""}
                          </SelectItem>
                          <SelectItem
                            value="3"
                            className="text-white hover:bg-slate-700"
                          >
                            3 Hours{" "}
                            {Number(numberOfPlayers) === 3
                              ? "(recommended)"
                              : ""}
                          </SelectItem>
                          <SelectItem
                            value="4"
                            className="text-white hover:bg-slate-700"
                          >
                            4 Hours{" "}
                            {Number(numberOfPlayers) === 4
                              ? "(recommended)"
                              : ""}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-400">
                        Tip: 1 hour per player is usually the sweet spot.
                      </p>
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
                        <p className="text-slate-300 bg-slate-700/50 px-3 py-2 rounded-md">
                          {selectedTime}
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
                        {numberOfPlayers} player
                        {numberOfPlayers !== "1" ? "s" : ""} × {totalHours} hour
                        {totalHours !== 1 ? "s" : ""} total
                      </div>
                    </div>

                    <Button
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold"
                      onClick={handleBooking}
                      disabled={
                        !(
                          selectedRoomData.backendId &&
                          selectedDate &&
                          selectedTime &&
                          numberOfPlayers &&
                          hours
                        )
                      }
                    >
                      Book Now (${totalPrice})
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
