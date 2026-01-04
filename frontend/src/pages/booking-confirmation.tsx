import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Calendar, Clock, Users, MapPin, Download, Loader2 } from 'lucide-react';

interface Booking {
  id: string;
  roomName: string;
  date: string;
  time: string;
  endTime: string;
  players: number;
  hours: number;
  price: string;
  status: string;
}

export default function BookingConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!id) {
        setError('No booking ID provided');
        setLoading(false);
        return;
      }

      try {
        const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:8080';
        const res = await fetch(`${apiBase}/api/bookings/${id}`, {
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error('Failed to fetch booking');
        }

        const data = await res.json();
        setBooking({
          id: data.booking.id,
          roomName: data.booking.roomName || 'Screen Golf Room',
          date: new Date(data.booking.startTime).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          time: new Date(data.booking.startTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
          endTime: new Date(data.booking.endTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
          players: data.booking.players,
          hours: data.booking.hours || 1,
          price: parseFloat(data.booking.price).toFixed(2),
          status: data.booking.status,
        });
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [id]);

  const downloadCalendar = () => {
    // The ICS file was sent via email, but we can also offer direct download
    alert('Calendar invitation has been sent to your email. Please check your inbox for the .ics file.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6 text-center">
            <p className="text-red-400 mb-4">{error || 'Booking not found'}</p>
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      {/* Header */}
      <div className="bg-slate-900/50 border-b border-slate-800">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="inline-block">
            <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
              K one Golf
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Premium Screen Golf</p>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Success Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 border-4 border-green-500 mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Booking Confirmed!</h1>
            <p className="text-slate-400 text-lg">
              We've sent a confirmation email with calendar attachment
            </p>
          </div>

          {/* Booking Details Card */}
          <Card className="bg-slate-800/50 border-slate-700 mb-6">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-white">Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Room & Players */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 p-4 rounded-lg">
                    <p className="text-slate-400 text-sm mb-1">Room</p>
                    <p className="text-white font-semibold text-lg">{booking.roomName}</p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <Users className="w-4 h-4" />
                      <span>Players</span>
                    </div>
                    <p className="text-white font-semibold text-lg">{booking.players}</p>
                  </div>
                </div>

                {/* Date */}
                <div className="bg-slate-900/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>Date</span>
                  </div>
                  <p className="text-white font-semibold text-lg">{booking.date}</p>
                </div>

                {/* Time & Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <Clock className="w-4 h-4" />
                      <span>Time</span>
                    </div>
                    <p className="text-white font-semibold text-lg">
                      {booking.time} - {booking.endTime}
                    </p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-lg">
                    <p className="text-slate-400 text-sm mb-1">Duration</p>
                    <p className="text-white font-semibold text-lg">
                      {booking.hours} hour{booking.hours > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Price */}
                <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/30 p-6 rounded-lg text-center">
                  <p className="text-amber-400 text-sm font-medium mb-2">Total Amount</p>
                  <p className="text-white text-4xl font-bold">${booking.price}</p>
                  <p className="text-slate-400 text-sm mt-2">Payment due at the venue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Card */}
          <Card className="bg-slate-800/50 border-slate-700 mb-6">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <MapPin className="w-6 h-6 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-2">K one Golf</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    45 Keltic Dr, Unit 6<br />
                    Sydney, NS B1S 1P4<br />
                    Phone: (902) 270-2259
                  </p>
                  <a
                    href="https://maps.google.com/?q=45+Keltic+Dr+Unit+6+Sydney+NS"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 text-amber-500 hover:text-amber-400 text-sm font-medium"
                  >
                    Get Directions →
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={downloadCalendar}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white"
              size="lg"
            >
              <Download className="w-5 h-5 mr-2" />
              Add to Calendar
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => navigate('/dashboard')}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold"
                size="lg"
              >
                View My Bookings
              </Button>
              <Button
                onClick={() => navigate('/booking')}
                variant="outline"
                className="border-slate-600 text-white hover:bg-slate-800"
                size="lg"
              >
                Book Another Room
              </Button>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <p className="text-slate-400 text-sm">
              Questions? Contact us at{' '}
              <a href="tel:+19022702259" className="text-amber-500 hover:text-amber-400">
                (902) 270-2259
              </a>
            </p>
            <p className="text-slate-500 text-xs mt-2">
              Hours: 10:00 AM - 12:00 AM Daily
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
