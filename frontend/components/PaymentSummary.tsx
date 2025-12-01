import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface SeatPaymentStatus {
  seatIndex: number;
  paid: boolean;
  totalAmount: number;
  paymentMethod?: string;
  paidAt?: Date;
}

interface PaymentSummaryProps {
  seats: SeatPaymentStatus[];
  allPaid: boolean;
  remaining: number;
  totalRevenue: number;
}

export default function PaymentSummary({
  seats,
  allPaid,
  remaining,
  totalRevenue,
}: PaymentSummaryProps) {
  const paidSeats = seats.filter((s) => s.paid).length;
  const unpaidSeats = seats.filter((s) => !s.paid).length;

  return (
    <Card className="border border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {allPaid ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Payment Complete</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <span>Payment Summary</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seats Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800 p-3 rounded border border-gray-700">
            <p className="text-xs text-gray-400 mb-1">Paid</p>
            <p className="text-2xl font-bold text-green-400">{paidSeats}</p>
            <p className="text-xs text-gray-500">of {seats.length} seats</p>
          </div>
          <div className="bg-gray-800 p-3 rounded border border-gray-700">
            <p className="text-xs text-gray-400 mb-1">Unpaid</p>
            <p className="text-2xl font-bold text-red-400">{unpaidSeats}</p>
            <p className="text-xs text-gray-500">of {seats.length} seats</p>
          </div>
        </div>

        <Separator className="bg-gray-700" />

        {/* Seat Details */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {seats.map((seat) => (
            <div
              key={seat.seatIndex}
              className="flex items-center justify-between p-2 bg-gray-800 rounded border border-gray-700 text-sm"
            >
              <div>
                <span className="font-medium">Seat {seat.seatIndex}</span>
                {seat.paymentMethod && (
                  <span className="text-xs text-gray-500 ml-2">({seat.paymentMethod})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">${seat.totalAmount.toFixed(2)}</span>
                {seat.paid ? (
                  <Badge className="bg-green-500/20 text-green-300 text-xs">PAID</Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-300 text-xs">UNPAID</Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        <Separator className="bg-gray-700" />

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total Revenue (Paid):</span>
            <span className="font-bold text-green-400">${totalRevenue.toFixed(2)}</span>
          </div>
          {remaining > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Outstanding Balance:</span>
              <span className="font-bold text-yellow-400">${remaining.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="pt-2">
          {allPaid ? (
            <div className="bg-green-500/10 border border-green-500/30 p-3 rounded text-center">
              <p className="text-sm font-medium text-green-300">
                ✓ All payments collected
              </p>
            </div>
          ) : (
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded text-center">
              <p className="text-sm font-medium text-yellow-300">
                {unpaidSeats} seat{unpaidSeats > 1 ? 's' : ''} awaiting payment
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
