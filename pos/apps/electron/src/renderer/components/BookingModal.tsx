import * as React from 'react';
import { Button, Card, Input, Label } from './ui/primitives';
import { PhoneInput } from './PhoneInput';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Array<{ id: string; name: string; status: string }>;
  onSuccess: () => void;
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

export function BookingModal({ isOpen, onClose, rooms, onSuccess }: BookingModalProps) {
  const [currentStep, setCurrentStep] = React.useState<Step>('customer');
  const [bookingSource, setBookingSource] = React.useState<BookingSource>('WALK_IN');
  
  // Customer data
  const [phone, setPhone] = React.useState('');
  const [customerName, setCustomerName] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<CustomerMatch[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(null);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);
  
  // Booking details
  const [roomId, setRoomId] = React.useState('');
  const [date, setDate] = React.useState('');
  const [time, setTime] = React.useState('');
  const [duration, setDuration] = React.useState(1);
  const [players, setPlayers] = React.useState(1);
  
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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
      const response = await fetch(`http://localhost:8080/api/users/lookup?phone=${encodeURIComponent(phone)}`, {
        headers: { 'x-pos-admin-key': 'pos-dev-key-change-in-production' },
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

  // Debounced phone search (E.164 format is +1XXXXXXXXXX = 12 chars)
  React.useEffect(() => {
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
    // E.164 format is +1XXXXXXXXXX (12 chars) for complete phone number
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
      
      const payload = {
        customerName: customerName.trim(),
        customerPhone: normalizedPhone,
        customerEmail: bookingSource === 'ONLINE' && customerEmail ? customerEmail : undefined,
        roomId,
        startTime: `${date}T${time}:00.000Z`,
        duration,
        players,
        bookingSource,
      };

      const response = await fetch('http://localhost:8080/api/bookings/simple/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-pos-admin-key': 'pos-dev-key-change-in-production'
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Failed to create booking');
      }

      const result = await response.json();
      console.log('[BOOKING] Created:', result);
      
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div data-testid="booking-modal" className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                    <Input
                      id="date"
                      data-testid="booking-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="time">Time *</Label>
                    <Input
                      id="time"
                      data-testid="booking-time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
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
