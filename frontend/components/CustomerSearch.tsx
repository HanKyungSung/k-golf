/**
 * CustomerSearch Component
 * 
 * A comprehensive customer search interface that integrates with the User Lookup API.
 * Supports three customer modes: existing, new, and guest.
 * 
 * Features:
 * - Phone-based customer lookup
 * - User card with booking statistics
 * - Recent customers quick-select
 * - "Use Customer", "Register New", "Book as Guest" actions
 * - Loading states and error handling
 */

import * as React from 'react';
import { PhoneInput } from './PhoneInput';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2, User, Phone, Mail, Calendar, DollarSign, ShoppingBag, X, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Types
export interface CustomerData {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  registrationSource: string;
  memberSince: string;
  bookingCount: number;
  lastBookingDate: string | null;
  totalSpent: string;
}

export interface CustomerSearchProps {
  bookingSource: 'WALK_IN' | 'PHONE';
  onSelectExisting: (customer: CustomerData) => void;
  onRegisterNew: (phone: string) => void;
  onBookAsGuest: (phone: string) => void;
  className?: string;
  apiBaseUrl?: string;
}

interface RecentCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  lastBookingDate: string | null;
  bookingCount: number;
}

export function CustomerSearch({
  bookingSource,
  onSelectExisting,
  onRegisterNew,
  onBookAsGuest,
  className,
  apiBaseUrl = '/api',
}: CustomerSearchProps) {
  const [phone, setPhone] = React.useState('');
  const [searchResult, setSearchResult] = React.useState<{
    found: boolean;
    user?: CustomerData;
  } | null>(null);
  const [recentCustomers, setRecentCustomers] = React.useState<RecentCustomer[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isLoadingRecent, setIsLoadingRecent] = React.useState(false);
  const { toast } = useToast();

  // Fetch recent customers on mount
  React.useEffect(() => {
    fetchRecentCustomers();
  }, []);

  const fetchRecentCustomers = async () => {
    setIsLoadingRecent(true);
    try {
      const response = await fetch(`${apiBaseUrl}/users/recent?limit=10`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recent customers');
      }

      const data = await response.json();
      setRecentCustomers(data.users || []);
    } catch (error) {
      console.error('Error fetching recent customers:', error);
      // Don't show error toast for recent customers - it's optional
    } finally {
      setIsLoadingRecent(false);
    }
  };

  const handleSearch = async () => {
    if (!phone) {
      toast({
        title: 'Phone number required',
        description: 'Please enter a phone number to search',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    setSearchResult(null);

    try {
      const response = await fetch(
        `${apiBaseUrl}/users/lookup?phone=${encodeURIComponent(phone)}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin access required');
        }
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResult(data);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search failed',
        description: error instanceof Error ? error.message : 'Failed to search for customer',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setPhone('');
    setSearchResult(null);
  };

  const handleRecentCustomerSelect = async (customerId: string) => {
    const customer = recentCustomers.find((c) => c.id === customerId);
    if (customer) {
      setPhone(customer.phone);
      // Trigger search automatically
      setTimeout(() => handleSearch(), 100);
    }
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(num);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Recent Customers Quick Select */}
      {recentCustomers.length > 0 && !searchResult && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Recent Customers (Quick Select)</label>
          <Select onValueChange={handleRecentCustomerSelect} disabled={isLoadingRecent}>
            <SelectTrigger>
              <SelectValue placeholder="Select a recent customer..." />
            </SelectTrigger>
            <SelectContent>
              {recentCustomers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{customer.name}</span>
                    <span className="text-muted-foreground text-sm">
                      {customer.phone}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      ({customer.bookingCount} bookings)
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Phone Search */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Search by Phone Number
        </label>
        <div className="flex gap-2">
          <PhoneInput
            value={phone}
            onChange={setPhone}
            onSearch={handleSearch}
            showSearchButton={false}
            placeholder="Enter customer phone"
            disabled={isSearching}
          />
          {phone && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClear}
              disabled={isSearching}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSearch}
            disabled={isSearching || !phone}
          >
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              'Search'
            )}
          </Button>
        </div>
      </div>

      {/* Search Results */}
      {searchResult && (
        <div className="space-y-4">
          {searchResult.found && searchResult.user ? (
            /* User Found Card */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Found
                </CardTitle>
                <CardDescription>
                  Existing customer account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer Details */}
                <div className="grid gap-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{searchResult.user.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{searchResult.user.phone}</span>
                  </div>
                  {searchResult.user.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{searchResult.user.email}</span>
                    </div>
                  )}
                </div>

                {/* Booking Statistics */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <ShoppingBag className="h-4 w-4" />
                      <span>Total Bookings</span>
                    </div>
                    <p className="text-2xl font-bold">{searchResult.user.bookingCount}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>Total Spent</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {formatCurrency(searchResult.user.totalSpent)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Member Since</span>
                    </div>
                    <p className="text-sm font-medium">
                      {formatDate(searchResult.user.memberSince)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Last Booking</span>
                    </div>
                    <p className="text-sm font-medium">
                      {formatDate(searchResult.user.lastBookingDate)}
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  className="w-full"
                  onClick={() => onSelectExisting(searchResult.user!)}
                >
                  Use This Customer
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* User Not Found Card */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  No Account Found
                </CardTitle>
                <CardDescription>
                  No customer account exists for {phone}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert>
                  <AlertDescription>
                    This phone number is not registered. You can create a new account or book as a guest.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => onRegisterNew(phone)}
                  >
                    Register New Customer
                  </Button>

                  {bookingSource === 'WALK_IN' && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => onBookAsGuest(phone)}
                    >
                      Book as Guest (Walk-in Only)
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
