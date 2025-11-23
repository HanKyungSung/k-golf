import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Users, Plus, Minus, Trash2, Printer, Edit } from 'lucide-react';
import { 
  getBooking, 
  updateBookingStatus, 
  listRooms,
  listMenuItems,
  getGlobalTaxRate,
  type Booking,
  type Room,
  type MenuItem 
} from '@/services/pos-api';

// Simple icon components (inline SVGs)
const MoveRight = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
);
const Split = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 12h12m-12 5h12M3 7h.01M3 12h.01M3 17h.01" /></svg>
);

const statusStyles: Record<string, string> = {
  confirmed: 'bg-green-500/20 text-green-300',
  completed: 'bg-blue-500/20 text-blue-300',
  cancelled: 'bg-red-500/20 text-red-300'
};

const paymentStatusStyles: Record<string, string> = {
  UNPAID: 'bg-red-500/20 text-red-300 border-red-500/30',
  BILLED: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  PAID: 'bg-green-500/20 text-green-300 border-green-500/30'
};

interface OrderItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  seat?: number;
  splitPrice?: number;
}

const seatColors = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500',
  'bg-cyan-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-teal-500'
];

const MAX_SEATS = 10;

export default function POSBookingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [globalTaxRate, setGlobalTaxRate] = useState(8);
  const [bookingTaxRate, setBookingTaxRate] = useState<number | null>(null);
  
  // Order management
  const [numberOfSeats, setNumberOfSeats] = useState<number>(1);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  
  // Dialog state
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<OrderItem | null>(null);
  const [selectedSeatsForSplit, setSelectedSeatsForSplit] = useState<number[]>([]);
  const [showTaxEditDialog, setShowTaxEditDialog] = useState(false);
  const [taxRateInput, setTaxRateInput] = useState<string>('');
  const [printingSeat, setPrintingSeat] = useState<number | null>(null);
  
  const seatsInitialized = React.useRef(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [id]);

  // Load saved orders and seats from localStorage
  useEffect(() => {
    if (!id) return;
    const savedOrders = localStorage.getItem(`booking-${id}-orders`);
    const savedSeats = localStorage.getItem(`booking-${id}-seats`);
    const savedTaxRate = localStorage.getItem(`booking-${id}-taxRate`);

    if (savedOrders) {
      try {
        setOrderItems(JSON.parse(savedOrders));
      } catch (e) {
        console.error('[BookingDetail] Failed to load saved orders:', e);
      }
    }

    if (savedSeats) {
      try {
        setNumberOfSeats(JSON.parse(savedSeats));
      } catch (e) {
        console.error('[BookingDetail] Failed to load saved seats:', e);
      }
    }

    if (savedTaxRate) {
      try {
        setBookingTaxRate(parseFloat(savedTaxRate));
      } catch (e) {
        console.error('[BookingDetail] Failed to load saved tax rate:', e);
      }
    }
  }, [id]);

  // Save to localStorage whenever orders or seats change
  useEffect(() => {
    if (!id) return;
    if (orderItems.length > 0 || numberOfSeats > 1) {
      localStorage.setItem(`booking-${id}-orders`, JSON.stringify(orderItems));
      localStorage.setItem(`booking-${id}-seats`, JSON.stringify(numberOfSeats));
    }
  }, [orderItems, numberOfSeats, id]);

  // Initialize seats based on booking hours
  useEffect(() => {
    if (booking && menu.length > 0 && !seatsInitialized.current) {
      const savedOrders = localStorage.getItem(`booking-${id}-orders`);
      
      // Add booking hours as a menu item to seat 1 if no saved orders
      if (!savedOrders || JSON.parse(savedOrders).length === 0) {
        const hoursMenuItem = menu.find((item: MenuItem) => 
          item.category === 'hours' && parseInt(item.name.replace(/\D/g, '')) === booking.duration
        );
        
        if (hoursMenuItem) {
          const hourOrderItem: OrderItem = {
            id: `hours-${booking.id}-${Date.now()}`,
            menuItem: hoursMenuItem,
            quantity: 1,
            seat: 1,
          };
          setOrderItems([hourOrderItem]);
        }
      }
      
      seatsInitialized.current = true;
    }
  }, [booking, menu, id]);

  async function loadData() {
    try {
      setLoading(true);
      
      console.log('[BookingDetail] Loading data for booking ID:', id);
      
      const [bookingData, roomsData, menuData, taxRate] = await Promise.all([
        getBooking(id!),
        listRooms(),
        listMenuItems(),
        getGlobalTaxRate()
      ]);
      
      console.log('[BookingDetail] Booking data:', bookingData);
      console.log('[BookingDetail] Rooms:', roomsData.length);
      console.log('[BookingDetail] Menu items:', menuData.length);
      console.log('[BookingDetail] Tax rate:', taxRate);
      
      setBooking(bookingData);
      setRooms(roomsData);
      setMenu(menuData);
      setGlobalTaxRate(taxRate);
      
      console.log('[BookingDetail] Successfully loaded all data');
    } catch (err) {
      console.error('[BookingDetail] Failed to load data:', err);
      alert(`Failed to load booking: ${err instanceof Error ? err.message : 'Unknown error'}`);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  const roomColor = useMemo(
    () => rooms.find((r) => r.id === booking?.roomId)?.name || 'Unknown',
    [rooms, booking]
  );

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-black">
        <div className="text-white text-xl">Loading booking...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-black">
        <div className="text-white text-xl">Booking not found</div>
      </div>
    );
  }

  // TODO: Continue with order management functions, UI rendering, and dialogs
  // This is Part 1 of the migration - basic structure and data loading complete

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <main className="flex-1 px-6 py-8 space-y-6 max-w-[1800px] mx-auto w-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
              Booking Details
            </h1>
            <p className="text-slate-400 text-sm mt-1">ID: {booking.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`${statusStyles[booking.status]} capitalize text-lg px-4 py-2`}>
              {booking.status}
            </Badge>
            {booking.paymentStatus && (
              <Badge className={`${paymentStatusStyles[booking.paymentStatus]} text-base px-3 py-1.5`}>
                {booking.paymentStatus === 'UNPAID' && '💳 Unpaid'}
                {booking.paymentStatus === 'BILLED' && '📄 Billed'}
                {booking.paymentStatus === 'PAID' && '✓ Paid'}
              </Badge>
            )}
            <Button size="lg" variant="outline" onClick={() => navigate('/dashboard')} className="text-base px-6">
              Back
            </Button>
          </div>
        </div>

        <div className="text-white">
          <p>Booking detail page migration in progress...</p>
          <p>Customer: {booking.customerName}</p>
          <p>Room: {roomColor}</p>
          <p>Date: {booking.date}</p>
          <p>Time: {booking.time}</p>
        </div>
      </main>
    </div>
  );
}
