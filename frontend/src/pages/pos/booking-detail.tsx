import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Users, Plus, Minus, Trash2, Printer, Edit, CheckCircle2, AlertCircle, CreditCard, Banknote, User, Clock, Calendar } from 'lucide-react';
import OrderForm from '@/components/OrderForm';
import { 
  getBooking, 
  updateBookingStatus as apiUpdateBookingStatus, 
  listRooms,
  listMenuItems,
  getGlobalTaxRate,
  getInvoices,
  createOrder as apiCreateOrder,
  deleteOrder as apiDeleteOrder,
  payInvoice as apiPayInvoice,
  type Booking,
  type Room,
  type MenuItem,
  type Invoice,
  type Order 
} from '@/services/pos-api';

interface POSBookingDetailProps {
  bookingId: string;
  onBack: () => void;
}

// Simple icon components (inline SVGs for icons not in lucide-react)
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

const roomColors: Record<string, string> = {
  '1': 'bg-blue-500',
  '2': 'bg-green-500',
  '3': 'bg-purple-500',
  '4': 'bg-orange-500',
};

const MAX_SEATS = 10;

export default function POSBookingDetail({ bookingId, onBack }: POSBookingDetailProps) {
  // State
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [globalTaxRate, setGlobalTaxRate] = useState(8);
  const [bookingTaxRate, setBookingTaxRate] = useState<number | null>(null);
  
  // Invoice and order data from backend
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [backendOrders, setBackendOrders] = useState<Order[]>([]);
  
  // Order management
  const [numberOfSeats, setNumberOfSeats] = useState<number>(1);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  
  // Seat payment tracking
  const [seatPayments, setSeatPayments] = useState<Record<number, { status: 'UNPAID' | 'PAID'; method?: string; tip?: number; total?: number }>>({});
  
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
  const [expandedSeats, setExpandedSeats] = useState<string[]>([]);
  
  // Payment form state (for accordion-based payments)
  const [paymentMethodBySeat, setPaymentMethodBySeat] = useState<Record<number, 'CARD' | 'CASH'>>({});
  const [tipAmountBySeat, setTipAmountBySeat] = useState<Record<number, string>>({});
  const [processingPayment, setProcessingPayment] = useState<number | null>(null);
  
  const seatsInitialized = React.useRef(false);
  const seatRefs = React.useRef<Record<number, HTMLDivElement | null>>({});

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [bookingId]);

  // Load saved orders and seats from localStorage
  useEffect(() => {
    if (!bookingId) return;
    const savedOrders = localStorage.getItem(`booking-${bookingId}-orders`);
    const savedSeats = localStorage.getItem(`booking-${bookingId}-seats`);
    const savedTaxRate = localStorage.getItem(`booking-${bookingId}-taxRate`);

    if (savedOrders) {
      try {
        setOrderItems(JSON.parse(savedOrders));
      } catch (e) {
        console.error('[BookingDetail] Failed to load saved orders:', e);
      }
    }

    if (savedSeats) {
      try {
        const seats = JSON.parse(savedSeats);
        setNumberOfSeats(seats);
        // Expand all seats by default
        setExpandedSeats(Array.from({ length: seats }, (_, i) => `seat-${i + 1}`));
      } catch (e) {
        console.error('[BookingDetail] Failed to load saved seats:', e);
      }
    } else {
      // Default: expand seat 1
      setExpandedSeats(['seat-1']);
    }

    if (savedTaxRate) {
      try {
        setBookingTaxRate(parseFloat(savedTaxRate));
      } catch (e) {
        console.error('[BookingDetail] Failed to load saved tax rate:', e);
      }
    }
  }, [bookingId]);

  // Save to localStorage whenever orders or seats change
  useEffect(() => {
    if (!bookingId) return;
    if (orderItems.length > 0 || numberOfSeats > 1) {
      localStorage.setItem(`booking-${bookingId}-orders`, JSON.stringify(orderItems));
      localStorage.setItem(`booking-${bookingId}-seats`, JSON.stringify(numberOfSeats));
    }
  }, [orderItems, numberOfSeats, bookingId]);

  // Initialize seats based on booking hours
  useEffect(() => {
    if (booking && menu.length > 0 && !seatsInitialized.current) {
      const savedOrders = localStorage.getItem(`booking-${bookingId}-orders`);
      
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
  }, [booking, menu, bookingId]);

  async function loadData() {
    try {
      setLoading(true);
      
      console.log('[BookingDetail] Loading data for booking ID:', bookingId);
      
      const [bookingData, roomsData, menuData, taxRate] = await Promise.all([
        getBooking(bookingId),
        listRooms(),
        listMenuItems().catch(() => [] as MenuItem[]), // Menu might not exist yet
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
      onBack();
    } finally {
      setLoading(false);
    }
  }

  const roomColor = useMemo(
    () => {
      const room = rooms.find((r) => r.id === booking?.roomId);
      return room?.name || 'Unknown Room';
    },
    [rooms, booking]
  );

  // Order management functions
  const addItemToSeat = (menuItem: MenuItem, seat: number) => {
    const newItem: OrderItem = {
      id: `${menuItem.id}-${Date.now()}-${Math.random()}`,
      menuItem,
      quantity: 1,
      seat,
    };
    setOrderItems([...orderItems, newItem]);
  };

  const updateItemQuantity = (orderItemId: string, change: number) => {
    setOrderItems(
      orderItems
        .map((item) =>
          item.id === orderItemId ? { ...item, quantity: Math.max(0, item.quantity + change) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeOrderItem = (orderItemId: string) => {
    setOrderItems(orderItems.filter((item) => item.id !== orderItemId));
  };

  const moveItemToSeat = (orderItemId: string, newSeat: number | undefined) => {
    setOrderItems(orderItems.map((item) => (item.id === orderItemId ? { ...item, seat: newSeat } : item)));
    setShowMoveDialog(false);
    setSelectedOrderItem(null);
  };

  const splitItemAcrossSeats = () => {
    if (!selectedOrderItem || selectedSeatsForSplit.length === 0) return;

    const splitPrice = selectedOrderItem.menuItem.price / selectedSeatsForSplit.length;

    const newItems: OrderItem[] = selectedSeatsForSplit.map((seat) => ({
      id: `${selectedOrderItem.menuItem.id}-${Date.now()}-${Math.random()}`,
      menuItem: selectedOrderItem.menuItem,
      quantity: selectedOrderItem.quantity,
      seat,
      splitPrice,
    }));

    setOrderItems([...orderItems.filter((item) => item.id !== selectedOrderItem.id), ...newItems]);
    setShowSplitDialog(false);
    setSelectedOrderItem(null);
    setSelectedSeatsForSplit([]);
  };

  const openSplitDialog = (item: OrderItem) => {
    setSelectedOrderItem(item);
    setSelectedSeatsForSplit([]);
    setShowSplitDialog(true);
  };

  const handleMoveItem = (item: OrderItem) => {
    setSelectedOrderItem(item);
    setShowMoveDialog(true);
  };

  const handleSplitItem = (item: OrderItem) => {
    openSplitDialog(item);
  };

  const toggleSeatForSplit = (seat: number) => {
    if (selectedSeatsForSplit.includes(seat)) {
      setSelectedSeatsForSplit(selectedSeatsForSplit.filter((s) => s !== seat));
    } else {
      setSelectedSeatsForSplit([...selectedSeatsForSplit, seat]);
    }
  };

  const handleMenuItemClick = (menuItem: MenuItem) => {
    setSelectedMenuItem(menuItem);
    setShowAddItemDialog(true);
  };

  const addItemFromDialog = (seat: number) => {
    if (selectedMenuItem) {
      addItemToSeat(selectedMenuItem, seat);
      setShowAddItemDialog(false);
      setSelectedMenuItem(null);
    }
  };

  const handlePrintSeat = (seat: number) => {
    const seatItems = getItemsForSeat(seat);
    if (seatItems.length === 0) {
      alert(`No items for Seat ${seat}`);
      return;
    }
    
    setPrintingSeat(seat);
    setTimeout(() => {
      window.print();
      setPrintingSeat(null);
    }, 100);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  // Payment processing for accordion-based interface
  const processPayment = async (seat: number) => {
    setProcessingPayment(seat);

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const tipAmount = parseFloat(tipAmountBySeat[seat] || '0') || 0;
    const subtotal = calculateSeatSubtotal(seat);
    const tax = calculateSeatTax(seat);
    const total = subtotal + tax + tipAmount;

    // Update seat payment status
    setSeatPayments(prev => ({
      ...prev,
      [seat]: { 
        status: 'PAID', 
        method: paymentMethodBySeat[seat] || 'CARD', 
        tip: tipAmount,
        total: total
      },
    }));

    setProcessingPayment(null);

    // Auto-scroll to next unpaid seat
    const nextUnpaidSeat = Array.from({ length: numberOfSeats }, (_, i) => i + 1).find(
      (s) => s > seat && (seatPayments[s]?.status || 'UNPAID') === 'UNPAID'
    );

    if (nextUnpaidSeat && seatRefs.current[nextUnpaidSeat]) {
      setTimeout(() => {
        seatRefs.current[nextUnpaidSeat]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  };

  const isSeatPaid = (seat: number) => {
    return seatPayments[seat]?.status === 'PAID';
  };

  const getSeatPayment = (seat: number) => {
    return seatPayments[seat];
  };

  const setQuickTip = (seat: number, percentage: number) => {
    const subtotal = calculateSeatSubtotal(seat);
    const tipAmount = ((subtotal * percentage) / 100).toFixed(2);
    setTipAmountBySeat({ ...tipAmountBySeat, [seat]: tipAmount });
  };

  // Payment Summary helper functions
  const getPaidSeatsCount = (): number => {
    return Array.from({ length: numberOfSeats }, (_, i) => i + 1).filter(seat => isSeatPaid(seat)).length;
  };

  const getPaymentProgress = (): number => {
    if (numberOfSeats === 0) return 0;
    return (getPaidSeatsCount() / numberOfSeats) * 100;
  };

  const getTotalPaid = (): number => {
    return Array.from({ length: numberOfSeats }, (_, i) => i + 1)
      .filter(seat => isSeatPaid(seat))
      .reduce((sum, seat) => {
        const payment = getSeatPayment(seat);
        if (!payment) return sum;
        return sum + (payment.total || 0);
      }, 0);
  };

  const getTotalDue = (): number => {
    return Array.from({ length: numberOfSeats }, (_, i) => i + 1)
      .filter(seat => !isSeatPaid(seat))
      .reduce((sum, seat) => {
        const subtotal = calculateSeatSubtotal(seat);
        const tax = calculateSeatTax(seat);
        const tipAmount = parseFloat(tipAmountBySeat[seat] || '0') || 0;
        return sum + subtotal + tax + tipAmount;
      }, 0);
  };

  // Check if we can safely reduce the number of seats
  const canReduceSeats = () => {
    if (numberOfSeats <= 1) return false;
    
    const newSeatCount = numberOfSeats - 1;
    const itemsInRemovedSeat = orderItems.some(item => item.seat && item.seat > newSeatCount);
    
    return !itemsInRemovedSeat;
  };

  const handleReduceSeats = () => {
    const newSeatCount = numberOfSeats - 1;
    const itemsInRemovedSeats = orderItems.filter(item => item.seat && item.seat > newSeatCount);
    
    if (itemsInRemovedSeats.length > 0) {
      const seatNumbers = [...new Set(itemsInRemovedSeats.map(item => item.seat))].sort().join(', ');
      alert(`Cannot reduce seats: ${itemsInRemovedSeats.length} item(s) are assigned to Seat ${seatNumbers}. Please move or remove these items first.`);
      return;
    }
    
    setNumberOfSeats(Math.max(1, newSeatCount));
  };

  // Calculation functions
  const effectiveTaxRate = bookingTaxRate !== null ? bookingTaxRate : globalTaxRate;

  const getItemsByCategory = (category: string) => {
    return menu.filter((item: MenuItem) => item.category === category && item.available);
  };

  const getItemsForSeat = (seat: number) => {
    return orderItems.filter((item) => item.seat === seat);
  };

  const calculateSeatSubtotal = (seat: number) => {
    return getItemsForSeat(seat).reduce((sum, item) => {
      const price = item.splitPrice || item.menuItem.price;
      return sum + price * item.quantity;
    }, 0);
  };

  const calculateSeatTax = (seat: number) => {
    return calculateSeatSubtotal(seat) * (effectiveTaxRate / 100);
  };

  const calculateSeatTotal = (seat: number) => {
    return calculateSeatSubtotal(seat) + calculateSeatTax(seat);
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.splitPrice || item.menuItem.price) * item.quantity, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * (effectiveTaxRate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleCompleteBooking = async () => {
    try {
      await apiUpdateBookingStatus(bookingId, 'COMPLETED');
      await loadData();
    } catch (err) {
      console.error('Failed to complete booking:', err);
      alert(`Failed to complete booking: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const updateStatus = async (status: string) => {
    try {
      await apiUpdateBookingStatus(bookingId, status.toUpperCase());
      await loadData();
    } catch (err) {
      console.error('Failed to update booking status:', err);
      alert(`Failed to update status: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const changeStatus = async (status: string) => {
    try {
      await apiUpdateBookingStatus(bookingId, status);
      await loadData();
    } catch (err) {
      console.error('Failed to update booking status:', err);
      alert(`Failed to update status: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

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

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body {
            background: white !important;
            margin: 0;
            padding: 20px;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-only {
            display: block !important;
          }

          /* Hide all seats by default */
          .seat-section {
            display: none !important;
          }

          /* Show only the selected seat when printing */
          ${printingSeat ? `.seat-section-${printingSeat} { display: block !important; page-break-inside: avoid; }` : '.seat-section { display: block !important; page-break-after: always; }'}
          
          /* Hide grand total when printing specific seat */
          ${printingSeat ? '.grand-total-section { display: none !important; }' : ''}
          
          /* Clean up the receipt area */
          .print-receipt {
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
            max-width: 100%;
            margin: 0;
            padding: 0;
          }
          
          .print-receipt * {
            background: transparent !important;
            color: black !important;
            border-color: #ddd !important;
          }
          
          .print-receipt h1,
          .print-receipt h2,
          .print-receipt h3,
          .print-receipt h4 {
            color: black !important;
          }
          
          .print-receipt .text-amber-400,
          .print-receipt .text-amber-500,
          .print-receipt .text-amber-600 {
            color: #d97706 !important;
          }
          
          .print-separator {
            border-top: 2px solid #000 !important;
            margin: 20px 0;
          }

          .seat-section .space-y-3 > * {
            margin-bottom: 1rem !important;
          }

          .seat-section > div {
            page-break-inside: avoid;
          }
        }
        
        .print-only {
          display: none;
        }
      `}</style>

      {/* Print-only header */}
      <div className="print-only mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">K-Golf</h1>
        <p className="text-lg">Premium Screen Golf Experience</p>
        <p className="text-sm mt-2">123 Golf Street, City, State 12345 | (555) 123-4567</p>
        <div className="print-separator" />
      </div>

      <main className="flex-1 px-6 py-8 space-y-6 max-w-[1800px] mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between no-print">
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
            <Button size="lg" variant="outline" onClick={onBack} className="text-base px-6">
              Back
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Management */}
          <div className="lg:col-span-2 space-y-4">
            {/* Room Card */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-2xl flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${roomColors[booking.roomId]}`} />
                  {roomColor}
                </CardTitle>
                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-300">
                    <User className="h-4 w-4 text-amber-400" />
                    <span>{booking.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar className="h-4 w-4 text-amber-400" />
                    <span>{booking.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <span>
                      {booking.time} ({booking.duration}h)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Users className="h-4 w-4 text-amber-400" />
                    <span>{booking.players} players</span>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Seat Management Card */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-400" />
                  Seat Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
                  <span className="text-white font-medium">Number of Seats</span>
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      onClick={handleReduceSeats}
                      disabled={!canReduceSeats()}
                      className="h-10 w-10 p-0 bg-slate-700 hover:bg-slate-600 text-white"
                    >
                      <Minus className="h-5 w-5" />
                    </Button>
                    <span className="text-2xl font-bold text-amber-400 w-12 text-center">{numberOfSeats}</span>
                    <Button
                      size="sm"
                      onClick={() => setNumberOfSeats(Math.min(MAX_SEATS, numberOfSeats + 1))}
                      disabled={numberOfSeats >= MAX_SEATS}
                      className="h-10 w-10 p-0 bg-slate-700 hover:bg-slate-600 text-white"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seat Panels with Order Items and Invoices */}
            <Accordion type="multiple" value={expandedSeats} onValueChange={setExpandedSeats} className="space-y-4">
              {Array.from({ length: numberOfSeats }, (_, i) => i + 1).map((seat) => {
                const seatItems = getItemsForSeat(seat);
                const isPaid = isSeatPaid(seat);
                const payment = getSeatPayment(seat);
                const subtotal = calculateSeatSubtotal(seat);
                const tax = calculateSeatTax(seat);
                const tipAmount = isPaid
                  ? payment?.tip || 0
                  : parseFloat(tipAmountBySeat[seat] || '0') || 0;
                const total = subtotal + tax + tipAmount;

                return (
                  <AccordionItem
                    key={seat}
                    value={`seat-${seat}`}
                    className="border border-slate-700 rounded-lg bg-slate-800/50 overflow-hidden"
                    ref={(el) => {
                      seatRefs.current[seat] = el;
                    }}
                  >
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-800/80">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${seatColors[seat - 1]}`} />
                          <span className="font-bold text-white text-lg">Seat {seat}</span>
                          <Badge variant="outline" className="text-slate-300 border-slate-600">
                            {seatItems.length} items
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {isPaid ? (
                            <Badge className="bg-green-500 text-white flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              PAID
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500 text-black flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              UNPAID
                            </Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <div className="space-y-4 pt-2">
                        {/* Order Items */}
                        {seatItems.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 bg-slate-900/30 rounded-lg">
                            <p>No items ordered yet</p>
                            <p className="text-sm mt-1">Add items from the menu</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-slate-300 mb-2">Order Items</h4>
                            {seatItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700"
                              >
                                <div className="flex-1">
                                  <p className="text-white font-medium">{item.menuItem.name}</p>
                                  <p className="text-sm text-slate-400">
                                    {item.splitPrice ? (
                                      <>
                                        ${item.splitPrice.toFixed(2)} each{' '}
                                        <span className="text-amber-400">(split)</span>
                                      </>
                                    ) : (
                                      `$${item.menuItem.price.toFixed(2)} × ${item.quantity}`
                                    )}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-amber-400 font-bold min-w-[80px] text-right">
                                    ${((item.splitPrice || item.menuItem.price) * item.quantity).toFixed(2)}
                                  </span>
                                  {!isPaid && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleMoveItem(item)}
                                        className="h-8 px-2 bg-blue-500/20 border-blue-500/50 hover:bg-blue-500/30 text-blue-400"
                                        title="Move to another seat"
                                      >
                                        Move
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleSplitItem(item)}
                                        className="h-8 px-2 bg-purple-500/20 border-purple-500/50 hover:bg-purple-500/30 text-purple-400"
                                        title="Split to multiple seats"
                                      >
                                        Split
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateItemQuantity(item.id, -1)}
                                        className="h-8 w-8 p-0 bg-slate-700 border-slate-600 hover:bg-slate-600"
                                      >
                                        <Minus className="h-3 w-3 text-white" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateItemQuantity(item.id, 1)}
                                        className="h-8 w-8 p-0 bg-slate-700 border-slate-600 hover:bg-slate-600"
                                      >
                                        <Plus className="h-3 w-3 text-white" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => removeOrderItem(item.id)}
                                        className="h-8 w-8 p-0 bg-red-500/20 border-red-500/50 hover:bg-red-500/30"
                                      >
                                        <Trash2 className="h-3 w-3 text-red-400" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <Separator className="bg-slate-700" />

                        {/* Invoice */}
                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
                          <h4 className="text-sm font-semibold text-white mb-3">Invoice</h4>
                          <div className="space-y-2 font-mono text-sm">
                            <div className="flex justify-between text-slate-300">
                              <span>Subtotal</span>
                              <span>${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-300">
                              <span>Tax ({effectiveTaxRate}%)</span>
                              <span>${tax.toFixed(2)}</span>
                            </div>
                            {tipAmount > 0 && (
                              <div className="flex justify-between text-slate-300">
                                <span>Tip</span>
                                <span>${tipAmount.toFixed(2)}</span>
                              </div>
                            )}
                            <Separator className="bg-slate-600" />
                            <div className="flex justify-between text-white font-bold text-base">
                              <span>Total</span>
                              <span className="text-amber-400">${total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Payment Section */}
                        {isPaid ? (
                          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-green-400 mb-2">
                              <CheckCircle2 className="h-5 w-5" />
                              <span className="font-semibold">PAID</span>
                            </div>
                            <div className="text-sm text-slate-300 space-y-1">
                              <p>
                                Method:{' '}
                                {payment?.method === 'CARD' ? (
                                  <span className="inline-flex items-center gap-1">
                                    <CreditCard className="h-3 w-3" />
                                    Card
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1">
                                    <Banknote className="h-3 w-3" />
                                    Cash
                                  </span>
                                )}
                              </p>
                              <p>Amount: ${total.toFixed(2)}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                            <h4 className="text-sm font-semibold text-white">Payment</h4>

                            {/* Payment Method Selection */}
                            <div className="space-y-2">
                              <Label className="text-slate-300">Payment Method</Label>
                              <RadioGroup
                                value={paymentMethodBySeat[seat] || 'CARD'}
                                onValueChange={(value) =>
                                  setPaymentMethodBySeat({ ...paymentMethodBySeat, [seat]: value as 'CARD' | 'CASH' })
                                }
                                className="grid grid-cols-2 gap-3"
                              >
                                <label
                                  htmlFor={`card-${seat}`}
                                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                    paymentMethodBySeat[seat] === 'CARD' || !paymentMethodBySeat[seat]
                                      ? 'border-amber-500 bg-amber-500/10'
                                      : 'border-slate-600 bg-slate-800/50'
                                  }`}
                                >
                                  <RadioGroupItem value="CARD" id={`card-${seat}`} className="sr-only" />
                                  <CreditCard className="h-5 w-5 text-white" />
                                  <span className="text-white font-medium">Card</span>
                                </label>
                                <label
                                  htmlFor={`cash-${seat}`}
                                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                    paymentMethodBySeat[seat] === 'CASH'
                                      ? 'border-amber-500 bg-amber-500/10'
                                      : 'border-slate-600 bg-slate-800/50'
                                  }`}
                                >
                                  <RadioGroupItem value="CASH" id={`cash-${seat}`} className="sr-only" />
                                  <Banknote className="h-5 w-5 text-white" />
                                  <span className="text-white font-medium">Cash</span>
                                </label>
                              </RadioGroup>
                            </div>

                            {/* Tip Input */}
                            <div className="space-y-2">
                              <Label className="text-slate-300">Add Tip (optional)</Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={tipAmountBySeat[seat] || ''}
                                  onChange={(e) => setTipAmountBySeat({ ...tipAmountBySeat, [seat]: e.target.value })}
                                  className="pl-7 bg-slate-800 border-slate-600 text-white"
                                />
                              </div>
                              <div className="grid grid-cols-4 gap-2">
                                {[10, 15, 18, 20].map((percentage) => (
                                  <Button
                                    key={percentage}
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setQuickTip(seat, percentage)}
                                    className="bg-slate-700 border-slate-600 hover:bg-amber-500 hover:text-black text-white"
                                  >
                                    {percentage}%
                                  </Button>
                                ))}
                              </div>
                            </div>

                            {/* Submit Payment Button */}
                            <Button
                              onClick={() => processPayment(seat)}
                              disabled={processingPayment === seat || subtotal === 0}
                              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold h-12"
                            >
                              {processingPayment === seat ? 'Processing...' : 'Collect Payment'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>

          {/* Right Column - Info & Menu */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            {/* Quick Actions */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={handleCompleteBooking}
                  disabled={booking.status === 'completed'}
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Booking
                </Button>
                <Button
                  onClick={() => updateStatus('cancelled')}
                  disabled={booking.status === 'cancelled'}
                  variant="outline"
                  className="w-full border-red-500 text-red-400 hover:bg-red-500/10"
                >
                  Cancel Booking
                </Button>
                <Button
                  onClick={handlePrintReceipt}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-300">
                    <span>Seats Paid</span>
                    <span className="font-semibold">
                      {getPaidSeatsCount()} / {numberOfSeats}
                    </span>
                  </div>
                  <Progress value={getPaymentProgress()} className="h-2 bg-slate-700">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${getPaymentProgress()}%` }}
                    />
                  </Progress>
                </div>

                <Separator className="bg-slate-700" />

                {/* Per-Seat Status */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">Seat Status</h4>
                  {Array.from({ length: numberOfSeats }, (_, i) => i + 1).map((seat) => {
                    const isPaid = isSeatPaid(seat);
                    const payment = getSeatPayment(seat);
                    return (
                      <div key={seat} className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${seatColors[seat - 1]}`} />
                          <span className="text-sm text-white">Seat {seat}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-400" />
                              <span className="text-xs text-green-400 font-semibold">PAID</span>
                              <span className="text-xs text-slate-400 font-mono">${(payment?.total || 0).toFixed(2)}</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 text-amber-400" />
                              <span className="text-xs text-amber-400 font-semibold">UNPAID</span>
                              <span className="text-xs text-slate-400 font-mono">
                                ${(calculateSeatTotal(seat) + (parseFloat(tipAmountBySeat[seat] || '0') || 0)).toFixed(2)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Separator className="bg-slate-700" />

                {/* Totals */}
                <div className="space-y-2 font-mono text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span>Room Booking</span>
                    <span>${(parseFloat(String(booking.price || 0))).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Food & Drinks</span>
                    <span>${getTotalPaid().toFixed(2)}</span>
                  </div>
                  <Separator className="bg-slate-700" />
                  <div className="flex justify-between text-white font-bold text-base">
                    <span>Total Collected</span>
                    <span className="text-green-400">${(parseFloat(String(booking.price || 0)) + getTotalPaid()).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 text-xs">
                    <span>Total Due</span>
                    <span>${getTotalDue().toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Menu */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Menu</CardTitle>
                <CardDescription className="text-slate-400">Click items to add to order</CardDescription>
              </CardHeader>
              <CardContent>
                {menu.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-sm">Menu not available</p>
                  </div>
                ) : (
                  <Tabs defaultValue="hours" className="space-y-4">
                    <TabsList className="grid-cols-3 w-full bg-slate-900/50">
                      <TabsTrigger value="hours">Hours</TabsTrigger>
                      <TabsTrigger value="food">Food</TabsTrigger>
                      <TabsTrigger value="drinks">Drinks</TabsTrigger>
                    </TabsList>
                    <TabsList className="grid-cols-2 w-full bg-slate-900/50">
                      <TabsTrigger value="appetizers">Appetizers</TabsTrigger>
                      <TabsTrigger value="desserts">Desserts</TabsTrigger>
                    </TabsList>

                    {(['hours', 'food', 'drinks', 'appetizers', 'desserts'] as const).map((category) => (
                      <TabsContent key={category} value={category}>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                          {getItemsByCategory(category).map((item) => (
                            <button
                              key={item.id}
                              onClick={() => handleMenuItemClick(item)}
                              className="w-full flex flex-col items-start p-4 border-2 border-slate-700 rounded-lg hover:bg-amber-500/10 hover:border-amber-500 bg-slate-800/80 transition-all text-left group"
                            >
                              <h4 className="font-bold text-white text-base mb-1 group-hover:text-amber-400 transition-colors">
                                {item.name}
                              </h4>
                              <p className="text-xs text-slate-400 mb-2 line-clamp-2">{item.description}</p>
                              <p className="text-amber-400 font-bold text-lg">${item.price.toFixed(2)}</p>
                            </button>
                          ))}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                )}
              </CardContent>
            </Card>


          </div>
        </div>
      </main>

      {/* Print-only footer */}
      <div className="print-only mt-8 pt-6 border-t-2 border-black text-center text-sm">
        <p className="font-medium mb-2">Thank you for choosing K-Golf!</p>
        <p>Booking ID: {booking.id}</p>
        <p>Printed: {new Date().toLocaleString()}</p>
        {printingSeat && <p className="font-bold mt-2">Seat {printingSeat} Receipt</p>}
      </div>

      {/* Dialogs */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Add to Seat</DialogTitle>
            <DialogDescription className="text-slate-400">
              Select which seat to add "{selectedMenuItem?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {Array.from({ length: numberOfSeats }, (_, i) => i + 1).map((seat) => (
              <Button
                key={seat}
                onClick={() => addItemFromDialog(seat)}
                className={`h-16 ${seatColors[seat - 1]} hover:opacity-90 text-white text-lg font-semibold`}
              >
                Seat {seat}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddItemDialog(false);
                setSelectedMenuItem(null);
              }}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Move Item</DialogTitle>
            <DialogDescription className="text-slate-400">
              Move "{selectedOrderItem?.menuItem.name}" to a different seat
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {Array.from({ length: numberOfSeats }, (_, i) => i + 1).map((seat) => (
              <Button
                key={seat}
                onClick={() => moveItemToSeat(selectedOrderItem!.id, seat)}
                className={`h-16 ${seatColors[seat - 1]} hover:opacity-90 text-white text-lg font-semibold`}
              >
                Seat {seat}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowMoveDialog(false);
                setSelectedOrderItem(null);
              }}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSplitDialog} onOpenChange={setShowSplitDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Split Item Cost</DialogTitle>
            <DialogDescription className="text-slate-400">
              Select seats to split "{selectedOrderItem?.menuItem.name}" ($
              {selectedOrderItem?.menuItem.price.toFixed(2)})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-300">
              The cost will be divided evenly across selected seats. Each seat will receive the full quantity.
            </p>

            {/* Seat selection */}
            <div className="space-y-3">
              {Array.from({ length: numberOfSeats }, (_, i) => i + 1).map((seat) => (
                <div
                  key={seat}
                  onClick={() => toggleSeatForSplit(seat)}
                  className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all ${
                    selectedSeatsForSplit.includes(seat)
                      ? 'bg-amber-500/20 border-2 border-amber-500'
                      : 'bg-slate-900/50 border-2 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedSeatsForSplit.includes(seat)
                          ? 'bg-amber-500 border-amber-500'
                          : 'border-slate-500'
                      }`}
                    >
                      {selectedSeatsForSplit.includes(seat) && (
                        <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <div className={`w-4 h-4 rounded-full ${seatColors[seat - 1]}`} />
                    <span className="text-white font-medium">Seat {seat}</span>
                  </div>
                  {selectedSeatsForSplit.includes(seat) && selectedSeatsForSplit.length > 0 && selectedOrderItem && (
                    <span className="text-amber-400 font-bold">
                      ${(selectedOrderItem.menuItem.price / selectedSeatsForSplit.length).toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Split preview */}
            {selectedSeatsForSplit.length > 0 && selectedOrderItem && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Original Price:</span>
                  <span className="text-white font-medium">${selectedOrderItem.menuItem.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Split Between:</span>
                  <span className="text-white font-medium">{selectedSeatsForSplit.length} seat(s)</span>
                </div>
                <Separator className="bg-amber-500/30" />
                <div className="flex justify-between">
                  <span className="text-amber-400 font-medium">Price Per Seat:</span>
                  <span className="text-amber-400 font-bold text-lg">
                    ${(selectedOrderItem.menuItem.price / selectedSeatsForSplit.length).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSplitDialog(false);
                setSelectedOrderItem(null);
                setSelectedSeatsForSplit([]);
              }}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button onClick={splitItemAcrossSeats} disabled={selectedSeatsForSplit.length === 0}>
              Split to {selectedSeatsForSplit.length} Seat(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tax Rate Edit Dialog */}
      <Dialog open={showTaxEditDialog} onOpenChange={setShowTaxEditDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Edit Tax Rate for This Booking</DialogTitle>
            <DialogDescription className="text-slate-400">
              Set a custom tax rate for this booking, or reset to use the global default ({globalTaxRate}%).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Current: {bookingTaxRate !== null ? `${bookingTaxRate}% (Custom)` : `${globalTaxRate}% (Global Default)`}
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRateInput}
                  onChange={(e) => setTaxRateInput(e.target.value)}
                  className="flex-1 bg-slate-700/50 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Enter tax rate (0-100)"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">Enter a value between 0 and 100. Decimals are supported (e.g., 8.5 for 8.5%)</p>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <h4 className="text-sm font-medium text-slate-300 mb-2">Quick Select</h4>
              <div className="grid grid-cols-4 gap-2">
                {[0, 5, 8, 10, 13, 15, 20, 25].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setTaxRateInput(rate.toString())}
                    className="px-3 py-2 rounded-md bg-slate-700/50 border border-slate-600 text-slate-200 text-sm hover:bg-slate-600/60 hover:border-amber-500/30 transition-colors"
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            {bookingTaxRate !== null && (
              <Button
                variant="outline"
                onClick={() => {
                  setBookingTaxRate(null);
                  localStorage.removeItem(`booking-${bookingId}-taxRate`);
                  setShowTaxEditDialog(false);
                }}
                className="border-red-500/30 text-red-300 hover:bg-red-500/10"
              >
                Reset to Global ({globalTaxRate}%)
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowTaxEditDialog(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const rate = parseFloat(taxRateInput);
                if (isNaN(rate) || rate < 0 || rate > 100) {
                  alert('Please enter a valid tax rate between 0 and 100');
                  return;
                }
                setBookingTaxRate(rate);
                localStorage.setItem(`booking-${bookingId}-taxRate`, rate.toString());
                setShowTaxEditDialog(false);
              }}
            >
              Save Tax Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
