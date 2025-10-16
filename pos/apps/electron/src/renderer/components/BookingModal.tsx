import * as React from 'react';
import { Button, Card, Input, Label } from './ui/primitives';
import { PhoneInput } from './PhoneInput';
import { CustomerSearch } from './CustomerSearch';
import type { Customer, CustomerMode, BookingSource, NewCustomerData, GuestCustomerData } from '../types/booking';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Array<{ id: string; name: string; status: string }>;
  onSuccess: () => void;
}

type Step = 'source' | 'customerMode' | 'customerData' | 'bookingDetails' | 'review';

export function BookingModal({ isOpen, onClose, rooms, onSuccess }: BookingModalProps) {
  const [currentStep, setCurrentStep] = React.useState<Step>('source');
  const [bookingSource, setBookingSource] = React.useState<BookingSource>('WALK_IN');
  const [customerMode, setCustomerMode] = React.useState<CustomerMode>('existing');
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [newCustomerData, setNewCustomerData] = React.useState<NewCustomerData>({
    name: '',
    phone: '',
    email: '',
    password: '',
  });
  const [guestData, setGuestData] = React.useState<GuestCustomerData>({
    name: '',
    phone: '',
    email: '',
  });
  
  const [roomId, setRoomId] = React.useState('');
  const [date, setDate] = React.useState('');
  const [time, setTime] = React.useState('');
  const [hours, setHours] = React.useState(1);
  const [players, setPlayers] = React.useState(1);
  
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const resetForm = () => {
    setCurrentStep('source');
    setBookingSource('WALK_IN');
    setCustomerMode('existing');
    setSelectedCustomer(null);
    setNewCustomerData({ name: '', phone: '', email: '', password: '' });
    setGuestData({ name: '', phone: '', email: '' });
    setRoomId('');
    setDate('');
    setTime('');
    setHours(1);
    setPlayers(1);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const nextStep = () => {
    const steps: Step[] = ['source', 'customerMode', 'customerData', 'bookingDetails', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
      setError('');
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['source', 'customerMode', 'customerData', 'bookingDetails', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
      setError('');
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');
    
    try {
      const payload: any = {
        customerMode,
        bookingSource,
        roomId,
        startTimeIso: `${date}T${time}:00.000Z`,
        hours,
        players,
      };

      if (customerMode === 'existing') {
        payload.customerPhone = selectedCustomer?.phone;
      } else if (customerMode === 'new') {
        payload.newCustomer = newCustomerData;
      } else if (customerMode === 'guest') {
        payload.guest = guestData;
      }

      const response = await fetch('http://localhost:8080/api/bookings/admin/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-pos-admin-key': 'pos-dev-key-change-in-production'
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create booking');
      }

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedFromCustomerData = () => {
    if (customerMode === 'existing') {
      return !!selectedCustomer;
    } else if (customerMode === 'new') {
      return newCustomerData.name && newCustomerData.phone && newCustomerData.password;
    } else if (customerMode === 'guest') {
      return guestData.name && guestData.phone;
    }
    return false;
  };

  const canProceedToReview = () => {
    return roomId && date && time && hours > 0 && players > 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Create Booking</h2>
            <button onClick={handleClose} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex items-center gap-2 text-xs">
            {['Source', 'Mode', 'Customer', 'Details', 'Review'].map((label, idx) => {
              const steps: Step[] = ['source', 'customerMode', 'customerData', 'bookingDetails', 'review'];
              const currentIdx = steps.indexOf(currentStep);
              const isActive = idx === currentIdx;
              const isComplete = idx < currentIdx;
              return (
                <React.Fragment key={label}>
                  <div className={`px-3 py-1 rounded ${isActive ? 'bg-amber-500 text-black font-medium' : isComplete ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                    {label}
                  </div>
                  {idx < 4 && <div className="h-px w-4 bg-slate-600" />}
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

          {/* Step 1: Booking Source */}
          {currentStep === 'source' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Select Booking Source</h3>
                <p className="text-sm text-slate-400 mb-4">How is this booking being made?</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div onClick={() => setBookingSource('WALK_IN')} className="cursor-pointer">
                  <Card className={`p-6 transition-all ${bookingSource === 'WALK_IN' ? 'bg-amber-500/10 border-amber-500' : 'hover:bg-slate-700/50'}`}>
                    <div className="text-center">
                      <h4 className="font-semibold text-white mb-1">Walk-in</h4>
                      <p className="text-xs text-slate-400">Customer is present</p>
                    </div>
                  </Card>
                </div>
                
                <div onClick={() => setBookingSource('PHONE')} className="cursor-pointer">
                  <Card className={`p-6 transition-all ${bookingSource === 'PHONE' ? 'bg-amber-500/10 border-amber-500' : 'hover:bg-slate-700/50'}`}>
                    <div className="text-center">
                      <h4 className="font-semibold text-white mb-1">Phone</h4>
                      <p className="text-xs text-slate-400">Remote booking</p>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Customer Mode */}
          {currentStep === 'customerMode' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Customer Type</h3>
                <p className="text-sm text-slate-400 mb-4">Select how to identify the customer</p>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div onClick={() => setCustomerMode('existing')} className="cursor-pointer">
                  <Card className={`p-6 transition-all ${customerMode === 'existing' ? 'bg-amber-500/10 border-amber-500' : 'hover:bg-slate-700/50'}`}>
                    <div className="text-center">
                      <h4 className="font-semibold text-white text-sm mb-1">Existing</h4>
                      <p className="text-xs text-slate-400">Lookup customer</p>
                    </div>
                  </Card>
                </div>
                
                <div onClick={() => setCustomerMode('new')} className="cursor-pointer">
                  <Card className={`p-6 transition-all ${customerMode === 'new' ? 'bg-amber-500/10 border-amber-500' : 'hover:bg-slate-700/50'}`}>
                    <div className="text-center">
                      <h4 className="font-semibold text-white text-sm mb-1">New</h4>
                      <p className="text-xs text-slate-400">Register account</p>
                    </div>
                  </Card>
                </div>
                
                <div 
                  onClick={() => bookingSource === 'WALK_IN' && setCustomerMode('guest')} 
                  className={bookingSource === 'PHONE' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                >
                  <Card className={`p-6 transition-all ${customerMode === 'guest' ? 'bg-amber-500/10 border-amber-500' : bookingSource === 'PHONE' ? '' : 'hover:bg-slate-700/50'}`}>
                    <div className="text-center">
                      <h4 className="font-semibold text-white text-sm mb-1">Guest</h4>
                      <p className="text-xs text-slate-400">
                        {bookingSource === 'PHONE' ? 'Walk-in only' : 'No account'}
                      </p>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Customer Data */}
          {currentStep === 'customerData' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {customerMode === 'existing' && 'Find Customer'}
                  {customerMode === 'new' && 'New Customer Details'}
                  {customerMode === 'guest' && 'Guest Information'}
                </h3>
              </div>

              {customerMode === 'existing' && (
                <CustomerSearch 
                  onSelectCustomer={setSelectedCustomer}
                  selectedCustomer={selectedCustomer}
                />
              )}

              {customerMode === 'new' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new-name">Full Name *</Label>
                    <Input
                      id="new-name"
                      value={newCustomerData.name}
                      onChange={(e) => setNewCustomerData({...newCustomerData, name: e.target.value})}
                      placeholder="John Smith"
                    />
                  </div>
                  
                  <PhoneInput
                    value={newCustomerData.phone}
                    onChange={(phone) => setNewCustomerData({...newCustomerData, phone})}
                    label="Phone Number"
                    required
                  />
                  
                  <div>
                    <Label htmlFor="new-email">Email (optional)</Label>
                    <Input
                      id="new-email"
                      type="email"
                      value={newCustomerData.email}
                      onChange={(e) => setNewCustomerData({...newCustomerData, email: e.target.value})}
                      placeholder="john@example.com"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="new-password">Password *</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newCustomerData.password}
                      onChange={(e) => setNewCustomerData({...newCustomerData, password: e.target.value})}
                      placeholder="Min 6 characters"
                    />
                  </div>
                </div>
              )}

              {customerMode === 'guest' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="guest-name">Full Name *</Label>
                    <Input
                      id="guest-name"
                      value={guestData.name}
                      onChange={(e) => setGuestData({...guestData, name: e.target.value})}
                      placeholder="John Smith"
                    />
                  </div>
                  
                  <PhoneInput
                    value={guestData.phone}
                    onChange={(phone) => setGuestData({...guestData, phone})}
                    label="Phone Number"
                    required
                  />
                  
                  <div>
                    <Label htmlFor="guest-email">Email (optional)</Label>
                    <Input
                      id="guest-email"
                      type="email"
                      value={guestData.email}
                      onChange={(e) => setGuestData({...guestData, email: e.target.value})}
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Booking Details */}
          {currentStep === 'bookingDetails' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Booking Details</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="room">Room *</Label>
                  <select
                    id="room"
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
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="time">Time *</Label>
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hours">Duration (hours) *</Label>
                    <Input
                      id="hours"
                      type="number"
                      min="1"
                      max="8"
                      value={hours}
                      onChange={(e) => setHours(parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="players">Players *</Label>
                    <Input
                      id="players"
                      type="number"
                      min="1"
                      max="4"
                      value={players}
                      onChange={(e) => setPlayers(parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Review & Confirm</h3>
                <p className="text-sm text-slate-400">Please review the booking details</p>
              </div>

              <div className="space-y-4">
                <Card className="p-4">
                  <h4 className="font-semibold text-white mb-3">Customer</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Type:</span>
                      <span className="text-white capitalize">{customerMode}</span>
                    </div>
                    {customerMode === 'existing' && selectedCustomer && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Name:</span>
                          <span className="text-white">{selectedCustomer.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Phone:</span>
                          <span className="text-white">{selectedCustomer.phone}</span>
                        </div>
                      </>
                    )}
                    {customerMode === 'new' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Name:</span>
                          <span className="text-white">{newCustomerData.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Phone:</span>
                          <span className="text-white">{newCustomerData.phone}</span>
                        </div>
                      </>
                    )}
                    {customerMode === 'guest' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Name:</span>
                          <span className="text-white">{guestData.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Phone:</span>
                          <span className="text-white">{guestData.phone}</span>
                        </div>
                      </>
                    )}
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="font-semibold text-white mb-3">Booking</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Source:</span>
                      <span className="text-white">{bookingSource}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Room:</span>
                      <span className="text-white">{rooms.find(r => r.id === roomId)?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Date & Time:</span>
                      <span className="text-white">{date} at {time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Duration:</span>
                      <span className="text-white">{hours} hour{hours > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Players:</span>
                      <span className="text-white">{players}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Footer with navigation buttons */}
        <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-6 flex justify-between gap-3">
          <Button
            onClick={prevStep}
            disabled={currentStep === 'source'}
            variant="outline"
          >
            Back
          </Button>
          
          <div className="flex gap-3">
            <Button onClick={handleClose} variant="ghost">
              Cancel
            </Button>
            
            {currentStep !== 'review' ? (
              <Button
                onClick={nextStep}
                disabled={
                  (currentStep === 'customerData' && !canProceedFromCustomerData()) ||
                  (currentStep === 'bookingDetails' && !canProceedToReview())
                }
              >
                Continue
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Booking'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
