import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Receipt from '../components/Receipt';
import { getReceipt, getSeatReceipt, sendReceiptEmail, type ReceiptData } from '../../services/pos-api';
import { Printer, Mail, Eye } from 'lucide-react';
import '../styles/print.css';

export default function ReceiptTest() {
  const [bookingId, setBookingId] = useState('eb6ee16d-2f0a-4605-a936-116b0b192e39');
  const [seatIndex, setSeatIndex] = useState('1');
  const [email, setEmail] = useState('');
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [printMode, setPrintMode] = useState<'full' | 'seat' | null>(null);
  const [printingSeatIndex, setPrintingSeatIndex] = useState<number | null>(null);

  const handleGetFullReceipt = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getReceipt(bookingId);
      setReceiptData(data);
      setPrintMode(null);
      setPrintingSeatIndex(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetSeatReceipt = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSeatReceipt(bookingId, parseInt(seatIndex));
      setReceiptData(data);
      setPrintMode('seat');
      setPrintingSeatIndex(parseInt(seatIndex));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintFull = () => {
    setPrintMode('full');
    setPrintingSeatIndex(null);
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 100);
  };

  const handlePrintSeat = (seat: number) => {
    setPrintMode('seat');
    setPrintingSeatIndex(seat);
    setTimeout(() => {
      window.print();
      setPrintMode(null);
      setPrintingSeatIndex(null);
    }, 100);
  };

  const handleSendEmail = async () => {
    if (!email) {
      setError('Please enter an email address');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const seatNum = printMode === 'seat' && printingSeatIndex ? printingSeatIndex : undefined;
      const result = await sendReceiptEmail(bookingId, email, seatNum);
      setSuccess(`Receipt sent to ${email}! Receipt #${result.receiptNumber}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Receipt Testing Tool</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Test Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="bookingId" className="text-slate-300">Booking ID</Label>
                  <Input
                    id="bookingId"
                    value={bookingId}
                    onChange={(e) => setBookingId(e.target.value)}
                    placeholder="Enter booking ID"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="seatIndex" className="text-slate-300">Seat Index</Label>
                  <Input
                    id="seatIndex"
                    type="number"
                    value={seatIndex}
                    onChange={(e) => setSeatIndex(e.target.value)}
                    placeholder="1"
                    min="1"
                    max="10"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={handleGetFullReceipt}
                    disabled={loading || !bookingId}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Load Full Receipt
                  </Button>

                  <Button
                    onClick={handleGetSeatReceipt}
                    disabled={loading || !bookingId || !seatIndex}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Load Seat {seatIndex} Receipt
                  </Button>
                </div>

                {receiptData && (
                  <>
                    <div className="border-t border-slate-700 pt-4">
                      <Label className="text-slate-300">Print Options</Label>
                      <div className="space-y-2 mt-2">
                        <Button
                          onClick={handlePrintFull}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                          <Printer className="mr-2 h-4 w-4" />
                          Print Full Receipt
                        </Button>

                        {receiptData.items.seats.map((seat) => (
                          <Button
                            key={seat.seatIndex}
                            onClick={() => handlePrintSeat(seat.seatIndex)}
                            variant="outline"
                            className="w-full border-purple-500 text-purple-400 hover:bg-purple-500/10"
                          >
                            <Printer className="mr-2 h-4 w-4" />
                            Print Seat {seat.seatIndex}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-700 pt-4">
                      <Label htmlFor="email" className="text-slate-300">Email Receipt</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="customer@example.com"
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                        <Button
                          onClick={handleSendEmail}
                          disabled={loading || !email}
                          className="bg-amber-600 hover:bg-amber-700"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded text-red-300 text-sm">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-green-500/20 border border-green-500/50 rounded text-green-300 text-sm">
                    {success}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Testing Tips</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-400 space-y-2">
                <p>1. Load a receipt using the booking ID</p>
                <p>2. Use "Print" buttons to test browser print dialog</p>
                <p>3. Test seat-specific printing</p>
                <p>4. Enter email and send to test email delivery</p>
                <p>5. Check your email inbox (may take a few seconds)</p>
                <p className="text-amber-400 mt-4">
                  Note: Make sure GMAIL_USER and GMAIL_APP_PASSWORD are set in .env
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Receipt Preview */}
          <div className="lg:col-span-2">
            {receiptData ? (
              <div className="bg-white rounded-lg shadow-2xl p-8">
                <div className="mb-4 no-print">
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Receipt Preview</h2>
                  <p className="text-sm text-slate-600">
                    This is how the receipt will look when printed
                  </p>
                </div>
                <Receipt
                  data={receiptData}
                  printMode={printMode}
                  printingSeatIndex={printingSeatIndex}
                />
              </div>
            ) : (
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="flex items-center justify-center h-96">
                  <div className="text-center text-slate-500">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Load a receipt to see the preview</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
