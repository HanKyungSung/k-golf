import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '../../components/pos/PhoneInput';
import { TimePicker } from '../../components/pos/TimePicker';
import { DatePicker } from '../../components/pos/DatePicker';
import { createBooking, type Room } from '@/services/pos-api';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  onSuccess: () => void;
  preselectedRoomId?: string;
}

type Step = 'customer' | 'details';
type BookingSource = 'WALK_IN' | 'PHONE' | 'ONLINE';

interface CustomerMatch {
  id: string;
  name: string;
  phone: string;
  email?: string;
  bookingCount: number;
}

export function BookingModal({ isOpen, onClose, rooms, onSuccess, preselectedRoomId }: BookingModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('customer');
  const [bookingSource, setBookingSource] = useState<BookingSource>('WALK_IN');
  
  // Customer data
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [searchResults, setSearchResults] = useState<CustomerMatch[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Booking details
  const [roomId, setRoomId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(1);
  const [players, setPlayers] = useState(1);
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-select room when modal opens
  useEffect(() => {
    if (isOpen && preselectedRoomId) {
      setRoomId(preselectedRoomId);
    }
  }, [isOpen, preselectedRoomId]);

  // Initialize date to today
  useEffect(() => {
    if (isOpen && !date) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      setDate(`${year}-${month}-${day}`);
    }
  }, [isOpen, date]);

  const resetForm = () => {
    setCurrentStep('customer');
    setBookingSource('WALK_IN');
    setPhone('');
    setCustomerName('');
    setCustomerEmail('');
    setSearchResults([]);
    setSelectedCustomerId(null);
    setHasSearched(false);
    setRoomId('');
    setDate('');
    setTime('');
    setDuration(1);
    setPlayers(1);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePhoneSearch = async () => {
    if (!phone || phone.length < 10) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    
    setIsSearching(true);
    setError('');
    
    try {
      const API_BASE = process.env.REACT_APP_API_BASE !== undefined ? process.env.REACT_APP_API_BASE : 'http://localhost:8080';
      const response = await fetch(`${API_BASE}/api/users/lookup?phone=${encodeURIComponent(phone)}`, {
        credentials: 'include',
        headers: { 
          'x-pos-admin-key': 'pos-dev-key-change-in-production'
        }
      });
      
      const data = await response.json();
      setHasSearched(true);
      
      if (data.found && data.user) {
        setSearchResults([{
          id: data.user.id,
          name: data.user.name,
          phone: data.user.phone,
          email: data.user.email,
          bookingCount: data.stats?.bookingCount || 0,
        }]);
        setSelectedCustomerId(data.user.id);
        setCustomerName(data.user.name);
        if (data.user.email) {
          setCustomerEmail(data.user.email);
        }
      } else {
        setSearchResults([]);
        setSelectedCustomerId(null);
        setCustomerName('');
      }
    } catch (err) {
      setError('Failed to search for customer');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced phone search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (phone.length === 12 && phone.startsWith('+1')) {
        handlePhoneSearch();
      } else {
        setSearchResults([]);
        setHasSearched(false);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [phone]);



  const handleSelectCustomer = (customer: CustomerMatch) => {
    setSelectedCustomerId(customer.id);
    setCustomerName(customer.name);
    if (customer.email) {
      setCustomerEmail(customer.email);
    }
  };

  const handleClearSelection = () => {
    setSelectedCustomerId(null);
    setCustomerName('');
    setCustomerEmail('');
  };

  const nextStep = () => {
    const steps: Step[] = ['customer', 'details'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
      setError('');
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['customer', 'details'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
      setError('');
    }
  };

  const canProceedFromCustomer = () => {
    return phone.length === 12 && phone.startsWith('+1') && customerName.trim().length > 0;
  };

  const canProceedToSubmit = () => {
    return roomId && date && time && duration > 0 && players > 0;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const normalizedPhone = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;
      
      // Convert local date/time to milliseconds timestamp (timezone-agnostic)
      // The date picker gives YYYY-MM-DD, time picker gives HH:MM in local browser time
      // Browser should be set to Atlantic Time (UTC-4) for Sydney, Nova Scotia location
      const localDateTime = new Date(`${date}T${time}:00`);
      const startTimeMs = localDateTime.getTime(); // milliseconds since epoch
      
      const payload = {
        customerName: customerName.trim(),
        customerPhone: normalizedPhone,
        customerEmail: bookingSource === 'ONLINE' && customerEmail ? customerEmail : undefined,
        roomId,
        startTimeMs, // Send as milliseconds instead of ISO string
        duration,
        players,
        bookingSource,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Send user's timezone
      };

      await createBooking(payload);

      console.log('[BOOKING] Created successfully', { localTime: `${date}T${time}`, timestampMs: startTimeMs });
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('[BOOKING] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div 
        data-testid="booking-modal" 
        className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Create Booking</h2>
            <button onClick={handleClose} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex items-center gap-2 text-xs">
            {['Customer', 'Details'].map((label, idx) => {
              const steps: Step[] = ['customer', 'details'];
              const currentIdx = steps.indexOf(currentStep);
              const isActive = idx === currentIdx;
              const isComplete = idx < currentIdx;
              return (
                <React.Fragment key={label}>
                  <div className={`px-3 py-1 rounded ${isActive ? 'bg-amber-500 text-black font-medium' : isComplete ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                    {label}
                  </div>
                  {idx < 1 && <div className="h-px w-4 bg-slate-600" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          {currentStep === 'customer' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Customer Information</h3>
                <p className="text-sm text-slate-400 mb-4">Search by phone or enter new customer details</p>
              </div>

              {/* Booking Source Buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setBookingSource('WALK_IN')}
                  variant={bookingSource === 'WALK_IN' ? 'default' : 'outline'}
                  className={bookingSource === 'WALK_IN' ? 'bg-amber-500 text-black hover:bg-amber-600' : ''}
                >
                  Walk-in
                </Button>
                <Button
                  type="button"
                  onClick={() => setBookingSource('PHONE')}
                  variant={bookingSource === 'PHONE' ? 'default' : 'outline'}
                  className={bookingSource === 'PHONE' ? 'bg-amber-500 text-black hover:bg-amber-600' : ''}
                >
                  Phone
                </Button>
              </div>

              <div className="space-y-4">
                {/* Phone Input with Live Search */}
                <div className="space-y-2">
                  <PhoneInput
                    value={phone}
                    onChange={setPhone}
                    label="Phone Number"
                    required
                  />
                  {isSearching && (
                    <p className="text-xs text-slate-400">Searching...</p>
                  )}
                </div>

                {hasSearched && searchResults.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Found {searchResults.length} customer(s):</label>
                    {searchResults.map(customer => (
                      <button
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer)}
                        className={`w-full text-left p-4 rounded border transition-all ${
                          selectedCustomerId === customer.id
                            ? 'bg-amber-500/10 border-amber-500'
                            : 'bg-slate-900/50 border-slate-600 hover:border-amber-500/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-white">{customer.name}</div>
                            <div className="text-sm text-slate-400">{customer.phone}</div>
                            {customer.email && <div className="text-xs text-slate-500">{customer.email}</div>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300">
                              Registered
                            </span>
                            <span className="text-xs text-slate-400">{customer.bookingCount} bookings</span>
                          </div>
                        </div>
                      </button>
                    ))}
                    
                    <button
                      onClick={handleClearSelection}
                      className="w-full p-3 rounded border border-slate-600 bg-slate-900/30 hover:bg-slate-900/50 text-slate-300 text-sm font-medium transition-all"
                    >
                      + Create New Customer Profile
                    </button>
                  </div>
                )}

                {hasSearched && searchResults.length === 0 && (
                  <div className="p-4 rounded bg-slate-900/50 border border-slate-600">
                    <p className="text-sm text-slate-400">No existing customer found with this phone number</p>
                  </div>
                )}

                <div>
                  <Label htmlFor="customer-name">Customer Name *</Label>
                  <Input
                    id="customer-name"
                    data-testid="customer-name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={selectedCustomerId ? "Edit name if needed" : "Enter customer name"}
                    className="h-9 px-3 py-2 bg-slate-900/50 border-slate-600 text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                  />
                  {selectedCustomerId && (
                    <p className="text-xs text-slate-400 mt-1">Name can be edited (phone is the primary identifier)</p>
                  )}
                </div>

                {bookingSource === 'ONLINE' && (
                  <div>
                    <Label htmlFor="customer-email">Email (Optional)</Label>
                    <Input
                      id="customer-email"
                      data-testid="customer-email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="customer@example.com"
                      className="h-9 px-3 py-2 bg-slate-900/50 border-slate-600 text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 'details' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Booking Details</h3>
                <p className="text-sm text-slate-400">Customer: <span className="text-white font-medium">{customerName}</span> ({phone})</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="room">Room *</Label>
                  <select
                    id="room"
                    data-testid="booking-room"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-600 bg-slate-900/50 px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                  >
                    <option value="">Select a room</option>
                    {rooms.filter(r => r.status === 'ACTIVE').map(room => (
                      <option key={room.id} value={room.id}>{room.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date *</Label>
                    <DatePicker
                      id="date"
                      data-testid="booking-date"
                      value={date}
                      onChange={(value) => setDate(value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="time">Time *</Label>
                    <TimePicker
                      id="time"
                      data-testid="booking-time"
                      value={time}
                      onChange={(value) => setTime(value)}
                      maxDurationHours={duration}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration">Duration (hours) *</Label>
                    <Input
                      id="duration"
                      data-testid="booking-hours"
                      type="number"
                      min="1"
                      max="4"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                      className="h-9 px-3 py-2 bg-slate-900/50 border-slate-600 text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="players">Players *</Label>
                    <Input
                      id="players"
                      data-testid="booking-players"
                      type="number"
                      min="1"
                      max="4"
                      value={players}
                      onChange={(e) => setPlayers(parseInt(e.target.value) || 1)}
                      className="h-9 px-3 py-2 bg-slate-900/50 border-slate-600 text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-6 flex justify-between gap-3">
          <Button
            onClick={prevStep}
            disabled={currentStep === 'customer'}
            variant="outline"
          >
            Back
          </Button>
          
          <div className="flex gap-3">
            <Button onClick={handleClose} variant="ghost">
              Cancel
            </Button>
            
            {currentStep !== 'details' ? (
              <Button
                data-testid="continue-btn"
                onClick={nextStep}
                disabled={currentStep === 'customer' && !canProceedFromCustomer()}
              >
                Continue
              </Button>
            ) : (
              <Button 
                data-testid="create-booking-btn" 
                onClick={handleSubmit} 
                disabled={isSubmitting || !canProceedToSubmit()}
              >
                {isSubmitting ? 'Creating...' : 'Create Booking'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
