import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { buttonStyles } from '@/styles/buttonStyles';
import { MonthlyRevenueChart } from '@/components/MonthlyRevenueChart';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { BookingDetailModal } from '@/components/BookingDetailModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { 
  Search, 
  Plus, 
  Edit2, 
  ChevronLeft, 
  ChevronRight,
  Users,
  UserPlus,
  Cake,
  ArrowUpDown,
  Calendar,
  Eye,
  X,
  CalendarDays,
  DollarSign,
  Clock
} from 'lucide-react';

// Types
interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  registrationSource: string;
  createdAt: string;
  bookingCount: number;
  totalSpent: number;
  lastBooking: string | null;
}

interface CustomerDetail extends Customer {
  updatedAt: string;
  bookings: CustomerBooking[];
  totalsBySource: {
    ONLINE: { count: number; spent: number };
    WALK_IN: { count: number; spent: number };
    PHONE: { count: number; spent: number };
  };
}

interface CustomerBooking {
  id: string;
  startTime: string;
  endTime: string;
  price: string;
  bookingStatus: string;
  paymentStatus: string;
  roomId: string;
  roomName: string;
  customerName: string;
  customerPhone: string;
  bookingSource: string;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
}

interface Booking {
  id: string;
  startTime: string;
  endTime: string;
  price: number;
  bookingStatus: string;
  paymentStatus: string;
  bookingSource: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  roomId: string;
  roomName: string;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  } | null;
}

interface Metrics {
  totalCustomers: number;
  newThisMonth: number;
  newLastMonth: number;
  monthOverMonthChange: number;
  upcomingBirthdays: number;
  activeCustomers: number;
  topSpender: { name: string; amount: number } | null;
  todaysBookings: number;
  monthlyRevenue: number;
}

interface BirthdayCustomer {
  id: string;
  name: string;
  phone: string;
  daysUntilBirthday: number;
  birthdayDate: string;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// API helper
const getApiBase = () => process.env.REACT_APP_API_BASE || 'http://localhost:8080';

export default function CustomerManagement() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'customers' | 'bookings'>('customers');
  
  // Common state
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [birthdayList, setBirthdayList] = useState<BirthdayCustomer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Customer state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerPagination, setCustomerPagination] = useState<Pagination | null>(null);
  const [customerLoading, setCustomerLoading] = useState(true);
  const [customerSortBy, setCustomerSortBy] = useState<string>('createdAt');
  const [customerSortOrder, setCustomerSortOrder] = useState<'asc' | 'desc'>('desc');
  const [customerPage, setCustomerPage] = useState(1);
  
  // Booking state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingPagination, setBookingPagination] = useState<Pagination | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSortBy, setBookingSortBy] = useState<string>('startTime');
  const [bookingSortOrder, setBookingSortOrder] = useState<'asc' | 'desc'>('desc');
  const [bookingPage, setBookingPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  
  // Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [bookingDetailModalOpen, setBookingDetailModalOpen] = useState(false);
  const [fullBookingModalOpen, setFullBookingModalOpen] = useState(false);
  const [fullBookingId, setFullBookingId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [bookingSourceFilter, setBookingSourceFilter] = useState<'ALL' | 'ONLINE' | 'WALK_IN' | 'PHONE'>('ALL');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    dateOfBirth: ''
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.role !== 'ADMIN') {
      navigate('/dashboard');
      toast({ title: 'Access denied', description: 'Admin access required', variant: 'destructive' });
    }
  }, [user, navigate]);

  // Load metrics
  const loadMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/customers/metrics`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setBirthdayList(data.birthdayList || []);
      }
    } catch (err) {
      console.error('Failed to load metrics:', err);
    }
  }, []);

  // Load customers
  const loadCustomers = useCallback(async () => {
    try {
      setCustomerLoading(true);
      const params = new URLSearchParams({
        page: customerPage.toString(),
        limit: '20',
        sortBy: customerSortBy,
        sortOrder: customerSortOrder,
        ...(searchQuery && { search: searchQuery })
      });
      
      const res = await fetch(`${getApiBase()}/api/customers?${params}`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers);
        setCustomerPagination(data.pagination);
      } else {
        toast({ title: 'Error', description: 'Failed to load customers', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setCustomerLoading(false);
    }
  }, [customerPage, customerSortBy, customerSortOrder, searchQuery]);

  // Load bookings
  const loadBookings = useCallback(async () => {
    try {
      setBookingLoading(true);
      const params = new URLSearchParams({
        page: bookingPage.toString(),
        limit: '20',
        sortBy: bookingSortBy,
        sortOrder: bookingSortOrder,
        ...(searchQuery && { search: searchQuery }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
        ...(sourceFilter !== 'ALL' && { source: sourceFilter })
      });
      
      const res = await fetch(`${getApiBase()}/api/customers/bookings/search?${params}`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings);
        setBookingPagination(data.pagination);
      } else {
        toast({ title: 'Error', description: 'Failed to load bookings', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setBookingLoading(false);
    }
  }, [bookingPage, bookingSortBy, bookingSortOrder, searchQuery, dateFrom, dateTo, statusFilter, sourceFilter]);

  // Initial load
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadMetrics();
    }
  }, [user, loadMetrics]);

  // Load data based on active tab with debounced search
  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    
    const timer = setTimeout(() => {
      if (activeTab === 'customers') {
        setCustomerPage(1);
        loadCustomers();
      } else {
        setBookingPage(1);
        loadBookings();
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  // Load when filters/pagination change (non-search)
  useEffect(() => {
    if (user?.role === 'ADMIN' && activeTab === 'customers') {
      loadCustomers();
    }
  }, [customerPage, customerSortBy, customerSortOrder]);

  useEffect(() => {
    if (user?.role === 'ADMIN' && activeTab === 'bookings') {
      loadBookings();
    }
  }, [bookingPage, bookingSortBy, bookingSortOrder, dateFrom, dateTo, statusFilter, sourceFilter]);

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'customers' | 'bookings');
  };

  // Handle customer sort change
  const handleCustomerSort = (column: string) => {
    if (customerSortBy === column) {
      setCustomerSortOrder(customerSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setCustomerSortBy(column);
      setCustomerSortOrder('desc');
    }
    setCustomerPage(1);
  };

  // Handle booking sort change
  const handleBookingSort = (column: string) => {
    if (bookingSortBy === column) {
      setBookingSortOrder(bookingSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setBookingSortBy(column);
      setBookingSortOrder('desc');
    }
    setBookingPage(1);
  };

  // Load customer detail with all bookings
  const loadCustomerDetail = async (customerId: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${getApiBase()}/api/customers/${customerId}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setCustomerDetail(data.customer);
      } else {
        toast({ title: 'Error', description: 'Failed to load customer details', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Failed to load customer detail:', err);
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setLoadingDetail(false);
    }
  };

  // Open detail modal
  const openDetailModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerDetail(null);
    setDetailModalOpen(true);
    loadCustomerDetail(customer.id);
  };

  // Open booking detail modal
  const openBookingDetailModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setBookingDetailModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      dateOfBirth: customer.dateOfBirth ? customer.dateOfBirth.split('T')[0] : ''
    });
    setFormError('');
    setEditModalOpen(true);
  };

  // Open create modal
  const openCreateModal = () => {
    setFormData({ name: '', phone: '', email: '', dateOfBirth: '' });
    setFormError('');
    setCreateModalOpen(true);
  };

  // Handle form submit (create)
  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      setFormError('Name and phone are required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${getApiBase()}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          dateOfBirth: formData.dateOfBirth || null
        })
      });

      if (res.ok) {
        toast({ title: 'Success', description: 'Customer created successfully' });
        setCreateModalOpen(false);
        loadCustomers();
        loadMetrics();
      } else {
        const err = await res.json();
        setFormError(err.error || 'Failed to create customer');
      }
    } catch (err) {
      setFormError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle form submit (update)
  const handleUpdate = async () => {
    if (!selectedCustomer) return;
    if (!formData.name.trim() || !formData.phone.trim()) {
      setFormError('Name and phone are required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${getApiBase()}/api/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          dateOfBirth: formData.dateOfBirth || null
        })
      });

      if (res.ok) {
        toast({ title: 'Success', description: 'Customer updated successfully' });
        setEditModalOpen(false);
        loadCustomers();
      } else {
        const err = await res.json();
        setFormError(err.error || 'Failed to update customer');
      }
    } catch (err) {
      setFormError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  // Format phone for display
  const formatPhone = (phone: string) => {
    if (!phone) return '—';
    const cleaned = phone.replace(/^\+1/, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Format time
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // View customer from booking
  const viewCustomerFromBooking = (booking: Booking) => {
    if (booking.user) {
      const customer = customers.find(c => c.id === booking.user!.id);
      if (customer) {
        openDetailModal(customer);
      } else {
        setBookingDetailModalOpen(false);
        setSelectedCustomer({
          id: booking.user.id,
          name: booking.user.name,
          phone: booking.user.phone,
          email: booking.user.email,
          dateOfBirth: null,
          registrationSource: 'UNKNOWN',
          createdAt: '',
          bookingCount: 0,
          totalSpent: 0,
          lastBooking: null
        });
        setCustomerDetail(null);
        setDetailModalOpen(true);
        loadCustomerDetail(booking.user.id);
      }
    }
  };

  // Open customer detail from birthday list
  const openBirthdayCustomerDetail = (birthdayCustomer: BirthdayCustomer) => {
    // Create minimal customer object and load full details
    setSelectedCustomer({
      id: birthdayCustomer.id,
      name: birthdayCustomer.name,
      phone: birthdayCustomer.phone,
      email: null,
      dateOfBirth: birthdayCustomer.birthdayDate,
      registrationSource: 'UNKNOWN',
      createdAt: '',
      bookingCount: 0,
      totalSpent: 0,
      lastBooking: null
    });
    setCustomerDetail(null);
    setDetailModalOpen(true);
    loadCustomerDetail(birthdayCustomer.id);
  };

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                K one Golf
              </h1>
              <span className="ml-2 text-sm text-slate-400">Customer & Booking Management</span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-300">Admin: {user.name}</span>
              <Link to="/pos/dashboard">
                <Button
                  variant="outline"
                  className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 bg-transparent"
                >
                  Dashboard
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={async () => { await logout(); navigate('/'); }}
                className="border-slate-500/50 text-slate-400 hover:bg-slate-500/10 bg-transparent"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Revenue Chart */}
        <div className="mb-8">
          <MonthlyRevenueChart />
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {metrics?.totalCustomers ?? '—'}
              </div>
              <p className="text-xs text-slate-400">
                {metrics?.activeCustomers ?? 0} active (30d)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">New Customers</CardTitle>
              <UserPlus className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {metrics?.newThisMonth ?? '—'}
              </div>
              <p className="text-xs text-slate-400">
                {metrics?.monthOverMonthChange !== undefined && (
                  <span className={metrics.monthOverMonthChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {metrics.monthOverMonthChange >= 0 ? '+' : ''}{metrics.monthOverMonthChange}%
                  </span>
                )} vs last month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Today's Bookings</CardTitle>
              <CalendarDays className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {metrics?.todaysBookings ?? '—'}
              </div>
              <p className="text-xs text-slate-400">
                Active reservations
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {metrics?.monthlyRevenue !== undefined ? formatCurrency(metrics.monthlyRevenue) : '—'}
              </div>
              <p className="text-xs text-slate-400">
                {(() => {
                  const now = new Date();
                  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                  return `${firstDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                })()}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Birthdays</CardTitle>
              <Cake className="h-4 w-4 text-pink-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {metrics?.upcomingBirthdays ?? '—'}
              </div>
              <p className="text-xs text-slate-400">
                Next 30 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Birthday List */}
        {birthdayList.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700 mb-8">
            <CardHeader className="py-3">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <Cake className="h-4 w-4 text-pink-500" />
                Upcoming Birthdays
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {birthdayList.map((customer) => (
                  <Badge
                    key={customer.id}
                    variant="outline"
                    className="border-pink-500/50 text-pink-300 bg-pink-500/10 py-1 px-3 cursor-pointer hover:bg-pink-500/20 hover:border-pink-400 transition-colors"
                    onClick={() => openBirthdayCustomerDetail(customer)}
                  >
                    {customer.name} — {customer.daysUntilBirthday === 0 
                      ? '🎂 Today!' 
                      : customer.daysUntilBirthday === 1 
                        ? 'Tomorrow' 
                        : `in ${customer.daysUntilBirthday} days`}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Unified Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={activeTab === 'customers' 
                ? "Search by name, email, or phone..." 
                : "Search by phone, name, or booking ref..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
            />
          </div>
          {activeTab === 'customers' && (
            <Button
              onClick={openCreateModal}
              className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-4">
            <TabsTrigger 
              value="customers" 
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-black"
            >
              <Users className="h-4 w-4 mr-2" />
              Customers
            </TabsTrigger>
            <TabsTrigger 
              value="bookings"
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-black"
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Bookings
            </TabsTrigger>
          </TabsList>

          {/* Customers Tab */}
          <TabsContent value="customers" className="mt-0">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700 hover:bg-transparent">
                        <TableHead 
                          className="text-slate-300 cursor-pointer hover:text-white"
                          onClick={() => handleCustomerSort('name')}
                        >
                          <div className="flex items-center gap-1">
                            Name
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead className="text-slate-300">Phone</TableHead>
                        <TableHead className="text-slate-300">Email</TableHead>
                        <TableHead 
                          className="text-slate-300 cursor-pointer hover:text-white"
                          onClick={() => handleCustomerSort('bookingCount')}
                        >
                          <div className="flex items-center gap-1">
                            Bookings
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-slate-300 cursor-pointer hover:text-white"
                          onClick={() => handleCustomerSort('totalSpent')}
                        >
                          <div className="flex items-center gap-1">
                            Total Spent
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-slate-300 cursor-pointer hover:text-white"
                          onClick={() => handleCustomerSort('lastBooking')}
                        >
                          <div className="flex items-center gap-1">
                            Last Booking
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead className="text-slate-300">Source</TableHead>
                        <TableHead className="text-slate-300 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-slate-400 py-8">
                            Loading customers...
                          </TableCell>
                        </TableRow>
                      ) : customers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-slate-400 py-8">
                            No customers found
                          </TableCell>
                        </TableRow>
                      ) : (
                        customers.map((customer) => (
                          <TableRow 
                            key={customer.id} 
                            className="border-slate-700 hover:bg-slate-700/30 cursor-pointer"
                            onClick={() => openDetailModal(customer)}
                          >
                            <TableCell className="font-medium text-white">
                              {customer.name}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {formatPhone(customer.phone)}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {customer.email || '—'}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {customer.bookingCount}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {formatCurrency(customer.totalSpent)}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {formatDate(customer.lastBooking)}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={
                                  customer.registrationSource === 'ONLINE' 
                                    ? 'border-green-500/50 text-green-400 bg-green-500/10'
                                    : customer.registrationSource === 'WALK_IN'
                                      ? 'border-blue-500/50 text-blue-400 bg-blue-500/10'
                                      : 'border-slate-500/50 text-slate-400 bg-slate-500/10'
                                }
                              >
                                {customer.registrationSource}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); openDetailModal(customer); }}
                                  className="text-slate-400 hover:text-white hover:bg-slate-700"
                                  title="View details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); openEditModal(customer); }}
                                  className="text-slate-400 hover:text-white hover:bg-slate-700"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {customerPagination && customerPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
                    <div className="text-sm text-slate-400">
                      Showing {((customerPagination.page - 1) * customerPagination.limit) + 1} to{' '}
                      {Math.min(customerPagination.page * customerPagination.limit, customerPagination.totalCount)} of{' '}
                      {customerPagination.totalCount} customers
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!customerPagination.hasPrevPage}
                        onClick={() => setCustomerPage(customerPage - 1)}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-slate-300">
                        Page {customerPagination.page} of {customerPagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!customerPagination.hasNextPage}
                        onClick={() => setCustomerPage(customerPage + 1)}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="mt-0">
            {/* Booking Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Label className="text-slate-400 text-sm">From:</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40 bg-slate-800/50 border-slate-600 text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-slate-400 text-sm">To:</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40 bg-slate-800/50 border-slate-600 text-white"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 bg-slate-800/50 border-slate-600 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="BOOKED">Booked</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-36 bg-slate-800/50 border-slate-600 text-white">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="ALL">All Sources</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                  <SelectItem value="WALK_IN">Walk-in</SelectItem>
                  <SelectItem value="PHONE">Phone</SelectItem>
                </SelectContent>
              </Select>
              {(dateFrom || dateTo || statusFilter !== 'ALL' || sourceFilter !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setStatusFilter('ALL');
                    setSourceFilter('ALL');
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700 hover:bg-transparent">
                        <TableHead className="text-slate-300">Ref#</TableHead>
                        <TableHead className="text-slate-300">Customer</TableHead>
                        <TableHead className="text-slate-300">Phone</TableHead>
                        <TableHead 
                          className="text-slate-300 cursor-pointer hover:text-white"
                          onClick={() => handleBookingSort('startTime')}
                        >
                          <div className="flex items-center gap-1">
                            Date
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead className="text-slate-300">Time</TableHead>
                        <TableHead className="text-slate-300">Room</TableHead>
                        <TableHead className="text-slate-300">Source</TableHead>
                        <TableHead className="text-slate-300">Status</TableHead>
                        <TableHead 
                          className="text-slate-300 cursor-pointer hover:text-white text-right"
                          onClick={() => handleBookingSort('price')}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Total
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookingLoading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-slate-400 py-8">
                            Loading bookings...
                          </TableCell>
                        </TableRow>
                      ) : bookings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-slate-400 py-8">
                            No bookings found
                          </TableCell>
                        </TableRow>
                      ) : (
                        bookings.map((booking) => (
                          <TableRow 
                            key={booking.id} 
                            className="border-slate-700 hover:bg-slate-700/30 cursor-pointer"
                            onClick={() => openBookingDetailModal(booking)}
                          >
                            <TableCell className="font-mono text-xs text-slate-400">
                              {booking.id.slice(0, 8)}...
                            </TableCell>
                            <TableCell className="font-medium text-white">
                              {booking.customerName}
                              {booking.user && (
                                <Badge variant="outline" className="ml-2 text-xs border-green-500/30 text-green-400 bg-green-500/5">
                                  Linked
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {formatPhone(booking.customerPhone)}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {formatDate(booking.startTime)}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {formatTime(booking.startTime)}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {booking.roomName}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline"
                                className={
                                  booking.bookingSource === 'ONLINE'
                                    ? 'border-green-500/50 text-green-400 bg-green-500/10'
                                    : booking.bookingSource === 'WALK_IN'
                                      ? 'border-blue-500/50 text-blue-400 bg-blue-500/10'
                                      : 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                                }
                              >
                                {booking.bookingSource}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline"
                                className={
                                  booking.bookingStatus === 'BOOKED'
                                    ? 'border-green-500/50 text-green-400 bg-green-500/10'
                                    : booking.bookingStatus === 'COMPLETED'
                                      ? 'border-blue-500/50 text-blue-400 bg-blue-500/10'
                                      : 'border-red-500/50 text-red-400 bg-red-500/10'
                                }
                              >
                                {booking.bookingStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-300 text-right font-medium">
                              {formatCurrency(booking.price)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {bookingPagination && bookingPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
                    <div className="text-sm text-slate-400">
                      Showing {((bookingPagination.page - 1) * bookingPagination.limit) + 1} to{' '}
                      {Math.min(bookingPagination.page * bookingPagination.limit, bookingPagination.totalCount)} of{' '}
                      {bookingPagination.totalCount} bookings
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!bookingPagination.hasPrevPage}
                        onClick={() => setBookingPage(bookingPage - 1)}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-slate-300">
                        Page {bookingPagination.page} of {bookingPagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!bookingPagination.hasNextPage}
                        onClick={() => setBookingPage(bookingPage + 1)}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Customer Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a new customer record (walk-in registration)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {formError && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded p-2">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-slate-700/50 border-slate-600 text-white"
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-300">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-slate-700/50 border-slate-600 text-white"
                placeholder="(902) 555-1234"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-slate-700/50 border-slate-600 text-white"
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob" className="text-slate-300">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={submitting}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {submitting ? 'Creating...' : 'Create Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update customer information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {formError && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded p-2">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-slate-300">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone" className="text-slate-300">Phone *</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email" className="text-slate-300">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-dob" className="text-slate-300">Date of Birth</Label>
              <Input
                id="edit-dob"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>
            {selectedCustomer && (
              <div className="pt-4 border-t border-slate-700 space-y-2 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Customer since:</span>
                  <span className="text-slate-300">{formatDate(selectedCustomer.createdAt)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total bookings:</span>
                  <span className="text-slate-300">{selectedCustomer.bookingCount}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total spent:</span>
                  <span className="text-slate-300">{formatCurrency(selectedCustomer.totalSpent)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={submitting}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={(open) => {
        setDetailModalOpen(open);
        if (!open) setBookingSourceFilter('ALL');
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white !w-[90vw] !max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCustomer?.name}
              <Badge 
                variant="outline" 
                className={
                  selectedCustomer?.registrationSource === 'ONLINE' 
                    ? 'border-green-500/50 text-green-400 bg-green-500/10'
                    : selectedCustomer?.registrationSource === 'WALK_IN'
                      ? 'border-blue-500/50 text-blue-400 bg-blue-500/10'
                      : 'border-slate-500/50 text-slate-400 bg-slate-500/10'
                }
              >
                {selectedCustomer?.registrationSource}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {formatPhone(selectedCustomer?.phone || '')}
              {selectedCustomer?.email && ` • ${selectedCustomer.email}`}
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-400">Loading customer details...</div>
            </div>
          ) : customerDetail ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 p-1">
                <div className="bg-slate-700/50 rounded-lg p-4 border-l-4 border-emerald-500">
                  <div className="text-xs text-slate-400 uppercase">Total</div>
                  <div className="text-xl font-bold text-emerald-400">
                    {customerDetail.totalsBySource.ONLINE.count + customerDetail.totalsBySource.WALK_IN.count + customerDetail.totalsBySource.PHONE.count}
                  </div>
                  <div className="text-xs text-emerald-400 font-medium">
                    {formatCurrency(customerDetail.totalsBySource.ONLINE.spent + customerDetail.totalsBySource.WALK_IN.spent + customerDetail.totalsBySource.PHONE.spent)}
                  </div>
                </div>
                <div 
                  className={`bg-slate-700/50 rounded-lg p-4 cursor-pointer transition-all ${bookingSourceFilter === 'ONLINE' ? 'ring-2 ring-green-500' : 'hover:bg-slate-700'}`}
                  onClick={() => setBookingSourceFilter(bookingSourceFilter === 'ONLINE' ? 'ALL' : 'ONLINE')}
                >
                  <div className="text-xs text-slate-400 uppercase">Online</div>
                  <div className="text-xl font-bold text-green-400">
                    {customerDetail.totalsBySource.ONLINE.count}
                  </div>
                  <div className="text-xs text-slate-400">{formatCurrency(customerDetail.totalsBySource.ONLINE.spent)}</div>
                </div>
                <div 
                  className={`bg-slate-700/50 rounded-lg p-4 cursor-pointer transition-all ${bookingSourceFilter === 'WALK_IN' ? 'ring-2 ring-blue-500' : 'hover:bg-slate-700'}`}
                  onClick={() => setBookingSourceFilter(bookingSourceFilter === 'WALK_IN' ? 'ALL' : 'WALK_IN')}
                >
                  <div className="text-xs text-slate-400 uppercase">Walk-in</div>
                  <div className="text-xl font-bold text-blue-400">
                    {customerDetail.totalsBySource.WALK_IN.count}
                  </div>
                  <div className="text-xs text-slate-400">{formatCurrency(customerDetail.totalsBySource.WALK_IN.spent)}</div>
                </div>
                <div 
                  className={`bg-slate-700/50 rounded-lg p-4 cursor-pointer transition-all ${bookingSourceFilter === 'PHONE' ? 'ring-2 ring-amber-500' : 'hover:bg-slate-700'}`}
                  onClick={() => setBookingSourceFilter(bookingSourceFilter === 'PHONE' ? 'ALL' : 'PHONE')}
                >
                  <div className="text-xs text-slate-400 uppercase">Phone</div>
                  <div className="text-xl font-bold text-amber-400">
                    {customerDetail.totalsBySource.PHONE.count}
                  </div>
                  <div className="text-xs text-slate-400">{formatCurrency(customerDetail.totalsBySource.PHONE.spent)}</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-xs text-slate-400 uppercase">Member Since</div>
                  <div className="text-lg font-bold text-white">
                    {formatDate(customerDetail.createdAt)}
                  </div>
                  {customerDetail.dateOfBirth && (
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <Cake className="h-3 w-3" />
                      {formatDate(customerDetail.dateOfBirth)}
                    </div>
                  )}
                </div>
              </div>

              {bookingSourceFilter !== 'ALL' && (
                <div className="flex items-center gap-2 mb-3 text-sm">
                  <span className="text-slate-400">Filtered by:</span>
                  <Badge 
                    variant="outline"
                    className={
                      bookingSourceFilter === 'ONLINE'
                        ? 'border-green-500/50 text-green-400 bg-green-500/10'
                        : bookingSourceFilter === 'WALK_IN'
                          ? 'border-blue-500/50 text-blue-400 bg-blue-500/10'
                          : 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                    }
                  >
                    {bookingSourceFilter}
                  </Badge>
                  <button 
                    onClick={() => setBookingSourceFilter('ALL')}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-auto border border-slate-700 rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-800">
                    <TableRow className="border-slate-700 hover:bg-transparent">
                      <TableHead className="text-slate-300">Date</TableHead>
                      <TableHead className="text-slate-300">Time</TableHead>
                      <TableHead className="text-slate-300">Room</TableHead>
                      <TableHead className="text-slate-300">Source</TableHead>
                      <TableHead className="text-slate-300">Created By</TableHead>
                      <TableHead className="text-slate-300">Status</TableHead>
                      <TableHead className="text-slate-300 text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const filteredBookings = bookingSourceFilter === 'ALL' 
                        ? customerDetail.bookings 
                        : customerDetail.bookings.filter(b => b.bookingSource === bookingSourceFilter);
                      
                      if (filteredBookings.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                              No bookings found
                            </TableCell>
                          </TableRow>
                        );
                      }
                      
                      return filteredBookings.map((booking) => (
                        <TableRow 
                          key={booking.id} 
                          className="border-slate-700 hover:bg-slate-700/30"
                        >
                          <TableCell className="text-slate-300">
                            {formatDate(booking.startTime)}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {formatTime(booking.startTime)}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {booking.roomName}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              className={
                                booking.bookingSource === 'ONLINE'
                                  ? 'border-green-500/50 text-green-400 bg-green-500/10'
                                  : booking.bookingSource === 'WALK_IN'
                                    ? 'border-blue-500/50 text-blue-400 bg-blue-500/10'
                                    : 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                              }
                            >
                              {booking.bookingSource}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {booking.createdByName || (
                              <span className="text-slate-500 italic">Self</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              className={
                                booking.bookingStatus === 'BOOKED'
                                  ? 'border-green-500/50 text-green-400 bg-green-500/10'
                                  : booking.bookingStatus === 'COMPLETED'
                                    ? 'border-blue-500/50 text-blue-400 bg-blue-500/10'
                                    : 'border-red-500/50 text-red-400 bg-red-500/10'
                              }
                            >
                              {booking.bookingStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300 text-right font-medium">
                            {formatCurrency(Number(booking.price))}
                          </TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDetailModalOpen(false);
                if (selectedCustomer) openEditModal(selectedCustomer);
              }}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Customer
            </Button>
            <Button
              onClick={() => setDetailModalOpen(false)}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking Detail Modal */}
      <Dialog open={bookingDetailModalOpen} onOpenChange={setBookingDetailModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Booking Details
              {selectedBooking && (
                <Badge 
                  variant="outline"
                  className={
                    selectedBooking.bookingStatus === 'BOOKED'
                      ? 'border-green-500/50 text-green-400 bg-green-500/10'
                      : selectedBooking.bookingStatus === 'COMPLETED'
                        ? 'border-blue-500/50 text-blue-400 bg-blue-500/10'
                        : 'border-red-500/50 text-red-400 bg-red-500/10'
                  }
                >
                  {selectedBooking.bookingStatus}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-mono text-xs">
              {selectedBooking?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 py-4">
              {/* Time & Room Info */}
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">{formatDate(selectedBooking.startTime)}</span>
                  <span className="text-slate-400">at</span>
                  <span className="font-medium">{formatTime(selectedBooking.startTime)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span>{selectedBooking.roomName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge 
                    variant="outline"
                    className={
                      selectedBooking.bookingSource === 'ONLINE'
                        ? 'border-green-500/50 text-green-400 bg-green-500/10'
                        : selectedBooking.bookingSource === 'WALK_IN'
                          ? 'border-blue-500/50 text-blue-400 bg-blue-500/10'
                          : 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                    }
                  >
                    {selectedBooking.bookingSource}
                  </Badge>
                  <span className="text-xl font-bold text-white">
                    {formatCurrency(selectedBooking.price)}
                  </span>
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                <div className="text-xs text-slate-400 uppercase mb-2">Customer</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{selectedBooking.customerName}</div>
                    <div className="text-sm text-slate-400">{formatPhone(selectedBooking.customerPhone)}</div>
                    {selectedBooking.customerEmail && (
                      <div className="text-sm text-slate-400">{selectedBooking.customerEmail}</div>
                    )}
                  </div>
                  {selectedBooking.user && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewCustomerFromBooking(selectedBooking)}
                      className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                    >
                      <Users className="h-4 w-4 mr-1" />
                      View Profile
                    </Button>
                  )}
                </div>
                {selectedBooking.user && (
                  <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/5 text-xs">
                    Linked Customer Account
                  </Badge>
                )}
              </div>

              {/* Info Section */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Created by:</span>
                <span className="text-slate-300">
                  {selectedBooking.createdByName || <span className="italic">Self-booked</span>}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Payment:</span>
                <Badge 
                  variant="outline"
                  className={
                    selectedBooking.paymentStatus === 'PAID'
                      ? 'border-green-500/50 text-green-400 bg-green-500/10'
                      : selectedBooking.paymentStatus === 'UNPAID'
                        ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                        : 'border-slate-500/50 text-slate-400 bg-slate-500/10'
                  }
                >
                  {selectedBooking.paymentStatus}
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedBooking) {
                  setFullBookingId(selectedBooking.id);
                  setBookingDetailModalOpen(false);
                  setFullBookingModalOpen(true);
                }
              }}
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
            >
              <Eye className="h-4 w-4 mr-1" />
              Full Details
            </Button>
            <Button
              onClick={() => setBookingDetailModalOpen(false)}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Booking Detail Modal (POS View) */}
      <BookingDetailModal
        bookingId={fullBookingId}
        open={fullBookingModalOpen}
        onOpenChange={setFullBookingModalOpen}
        onClose={loadBookings}
      />
    </div>
  );
}
