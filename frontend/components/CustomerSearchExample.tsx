/**
 * CustomerSearch Component Usage Example
 * 
 * This file demonstrates how to use the CustomerSearch component
 * in different booking scenarios (walk-in vs phone).
 */

import React, { useState } from 'react';
import { CustomerSearch, CustomerData } from '@/components/CustomerSearch';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function CustomerSearchExamples() {
  const [bookingSource, setBookingSource] = useState<'WALK_IN' | 'PHONE'>('WALK_IN');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [newCustomerPhone, setNewCustomerPhone] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');

  const handleSelectExisting = (customer: CustomerData) => {
    console.log('Selected existing customer:', customer);
    setSelectedCustomer(customer);
  };

  const handleRegisterNew = (phone: string) => {
    console.log('Register new customer with phone:', phone);
    setNewCustomerPhone(phone);
    // Navigate to registration form or open modal
  };

  const handleBookAsGuest = (phone: string) => {
    console.log('Book as guest with phone:', phone);
    setGuestPhone(phone);
    // Navigate to guest form or open modal
  };

  const resetDemo = () => {
    setSelectedCustomer(null);
    setNewCustomerPhone('');
    setGuestPhone('');
  };

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">CustomerSearch Component Examples</h1>
        <p className="text-muted-foreground mt-2">
          A comprehensive customer search interface with phone lookup and booking stats
        </p>
      </div>

      {/* Interactive Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Interactive Demo</CardTitle>
          <CardDescription>
            Try searching for customers with different booking sources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Booking Source Selector */}
          <Tabs value={bookingSource} onValueChange={(v) => setBookingSource(v as 'WALK_IN' | 'PHONE')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="WALK_IN">Walk-in Booking</TabsTrigger>
              <TabsTrigger value="PHONE">Phone Booking</TabsTrigger>
            </TabsList>
            <TabsContent value="WALK_IN" className="space-y-4 mt-4">
              <Alert>
                <AlertDescription>
                  <strong>Walk-in mode:</strong> Allows guest bookings (no account required)
                </AlertDescription>
              </Alert>
            </TabsContent>
            <TabsContent value="PHONE" className="space-y-4 mt-4">
              <Alert>
                <AlertDescription>
                  <strong>Phone mode:</strong> Guest bookings not allowed (account required)
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>

          {/* Customer Search Component */}
          <div className="border rounded-lg p-4 bg-muted/20">
            <CustomerSearch
              bookingSource={bookingSource}
              onSelectExisting={handleSelectExisting}
              onRegisterNew={handleRegisterNew}
              onBookAsGuest={handleBookAsGuest}
            />
          </div>

          {/* Demo Results Display */}
          {(selectedCustomer || newCustomerPhone || guestPhone) && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Action Result</h3>
                <Button variant="outline" size="sm" onClick={resetDemo}>
                  Reset Demo
                </Button>
              </div>

              {selectedCustomer && (
                <Alert>
                  <AlertDescription>
                    <strong>Selected Existing Customer:</strong>
                    <br />
                    Name: {selectedCustomer.name}
                    <br />
                    Phone: {selectedCustomer.phone}
                    <br />
                    Bookings: {selectedCustomer.bookingCount}
                  </AlertDescription>
                </Alert>
              )}

              {newCustomerPhone && (
                <Alert>
                  <AlertDescription>
                    <strong>Register New Customer:</strong>
                    <br />
                    Phone: {newCustomerPhone}
                    <br />
                    (Would show registration form here)
                  </AlertDescription>
                </Alert>
              )}

              {guestPhone && (
                <Alert>
                  <AlertDescription>
                    <strong>Book as Guest:</strong>
                    <br />
                    Phone: {guestPhone}
                    <br />
                    (Would show guest booking form here)
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Code Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Basic Usage:</h3>
            <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
              <code>{`import { CustomerSearch } from '@/components/CustomerSearch';

function BookingForm() {
  const [bookingSource, setBookingSource] = useState<'WALK_IN' | 'PHONE'>('WALK_IN');

  const handleSelectExisting = (customer) => {
    // Customer selected - proceed with booking
    console.log('Using customer:', customer.id);
  };

  const handleRegisterNew = (phone) => {
    // Show registration form
    setShowRegistrationForm(true);
    setPhoneForRegistration(phone);
  };

  const handleBookAsGuest = (phone) => {
    // Show guest form (walk-in only)
    setShowGuestForm(true);
    setGuestPhone(phone);
  };

  return (
    <CustomerSearch
      bookingSource={bookingSource}
      onSelectExisting={handleSelectExisting}
      onRegisterNew={handleRegisterNew}
      onBookAsGuest={handleBookAsGuest}
    />
  );
}`}</code>
            </pre>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">In a Modal Workflow:</h3>
            <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
              <code>{`function BookingModal() {
  const [step, setStep] = useState<'source' | 'search' | 'register' | 'guest' | 'booking'>('source');
  const [bookingSource, setBookingSource] = useState<'WALK_IN' | 'PHONE'>('WALK_IN');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  return (
    <Dialog>
      <DialogContent>
        {step === 'search' && (
          <CustomerSearch
            bookingSource={bookingSource}
            onSelectExisting={(customer) => {
              setSelectedCustomer(customer);
              setStep('booking'); // Go to booking form
            }}
            onRegisterNew={(phone) => {
              setStep('register'); // Go to registration form
            }}
            onBookAsGuest={(phone) => {
              setStep('guest'); // Go to guest form
            }}
          />
        )}
        {/* Other steps... */}
      </DialogContent>
    </Dialog>
  );
}`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Props Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Props Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">Prop</th>
                <th className="text-left py-2 px-4">Type</th>
                <th className="text-left py-2 px-4">Required</th>
                <th className="text-left py-2 px-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="py-2 px-4 font-mono">bookingSource</td>
                <td className="py-2 px-4">'WALK_IN' | 'PHONE'</td>
                <td className="py-2 px-4">Yes</td>
                <td className="py-2 px-4">Controls guest option visibility</td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-mono">onSelectExisting</td>
                <td className="py-2 px-4">(customer: CustomerData) =&gt; void</td>
                <td className="py-2 px-4">Yes</td>
                <td className="py-2 px-4">Called when existing customer selected</td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-mono">onRegisterNew</td>
                <td className="py-2 px-4">(phone: string) =&gt; void</td>
                <td className="py-2 px-4">Yes</td>
                <td className="py-2 px-4">Called when "Register New" clicked</td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-mono">onBookAsGuest</td>
                <td className="py-2 px-4">(phone: string) =&gt; void</td>
                <td className="py-2 px-4">Yes</td>
                <td className="py-2 px-4">Called when "Book as Guest" clicked</td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-mono">apiBaseUrl</td>
                <td className="py-2 px-4">string</td>
                <td className="py-2 px-4">No</td>
                <td className="py-2 px-4">API base URL (default: '/api')</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* API Integration Info */}
      <Card>
        <CardHeader>
          <CardTitle>API Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">User Lookup API</h3>
            <pre className="bg-muted p-3 rounded text-sm">
              GET /api/users/lookup?phone=+14165551234
            </pre>
            <p className="text-sm text-muted-foreground mt-2">
              Returns user details with booking statistics if found, or {'{ found: false }'} if not found.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Recent Customers API</h3>
            <pre className="bg-muted p-3 rounded text-sm">
              GET /api/users/recent?limit=10
            </pre>
            <p className="text-sm text-muted-foreground mt-2">
              Returns list of recent customers sorted by last booking date.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
