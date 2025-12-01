import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Banknote } from 'lucide-react';

interface PaymentFormProps {
  seatIndex: number;
  totalAmount: number;
  currentStatus: 'UNPAID' | 'PAID';
  currentPaymentMethod?: string;
  onPayment: (paymentMethod: 'CARD' | 'CASH', tip?: number) => Promise<void>;
  isLoading?: boolean;
}

export default function PaymentForm({
  seatIndex,
  totalAmount,
  currentStatus,
  currentPaymentMethod,
  onPayment,
  isLoading = false,
}: PaymentFormProps) {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'CASH'>('CARD');
  const [tipAmount, setTipAmount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const tip = tipAmount ? parseFloat(tipAmount) : undefined;
      await onPayment(paymentMethod, tip);
      setShowPaymentDialog(false);
      setTipAmount('');
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (currentStatus === 'PAID') {
    return (
      <Card className="border border-green-500/30 bg-green-500/10">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Seat {seatIndex}</p>
              <p className="text-lg font-bold text-green-300">Paid</p>
              {currentPaymentMethod && (
                <p className="text-xs text-gray-500 mt-1">via {currentPaymentMethod}</p>
              )}
            </div>
            <Badge className="bg-green-500/20 text-green-300">✓ PAID</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border border-gray-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Seat {seatIndex}</CardTitle>
              <CardDescription>${totalAmount.toFixed(2)}</CardDescription>
            </div>
            <Badge className="bg-red-500/20 text-red-300">UNPAID</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setShowPaymentDialog(true)}
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            Collect Payment
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="bg-gray-900 border border-gray-700">
          <DialogHeader>
            <DialogTitle>Payment - Seat {seatIndex}</DialogTitle>
            <DialogDescription>
              Total Amount: ${totalAmount.toFixed(2)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'CARD' | 'CASH')}>
                <SelectTrigger id="payment-method" className="bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="CARD">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Card
                    </div>
                  </SelectItem>
                  <SelectItem value="CASH">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4" />
                      Cash
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tip-amount">Tip (Optional)</Label>
              <Input
                id="tip-amount"
                type="number"
                placeholder="0.00"
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                className="bg-gray-800 border-gray-700"
                min="0"
                step="0.01"
                disabled={submitting}
              />
            </div>

            {tipAmount && (
              <div className="bg-gray-800 p-3 rounded border border-gray-700">
                <div className="flex justify-between text-sm">
                  <span>Total with Tip:</span>
                  <span className="font-bold">${(totalAmount + parseFloat(tipAmount)).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700"
              disabled={submitting}
            >
              {submitting ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
