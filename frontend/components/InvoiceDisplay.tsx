import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface InvoiceLineItem {
  id: string;
  description: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice: number;
}

interface InvoiceDisplayProps {
  seatIndex: number;
  subtotal: number;
  tax: number;
  tip?: number;
  totalAmount: number;
  status: 'UNPAID' | 'PAID';
  paymentMethod?: string;
  orders: InvoiceLineItem[];
}

export default function InvoiceDisplay({
  seatIndex,
  subtotal,
  tax,
  tip,
  totalAmount,
  status,
  paymentMethod,
  orders,
}: InvoiceDisplayProps) {
  const statusColor = status === 'PAID' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300';
  const basePrice = subtotal - (orders?.reduce((sum, o) => sum + (o.totalPrice || 0), 0) || 0);

  return (
    <Card className="border border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Seat {seatIndex}</CardTitle>
          <Badge className={statusColor}>{status}</Badge>
        </div>
        {paymentMethod && (
          <CardDescription className="text-xs">Paid via {paymentMethod}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Line Items */}
        <div className="space-y-2 text-sm">
          {basePrice > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Booking Fee</span>
              <span>${basePrice.toFixed(2)}</span>
            </div>
          )}

          {orders && orders.length > 0 && (
            <>
              <Separator className="my-2 bg-gray-700" />
              {orders.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span className="text-gray-400">
                    {item.description}
                    {item.quantity && item.quantity > 1 && ` x${item.quantity}`}
                  </span>
                  <span>${item.totalPrice.toFixed(2)}</span>
                </div>
              ))}
            </>
          )}

          <Separator className="my-2 bg-gray-700" />

          {/* Totals */}
          <div className="flex justify-between font-medium">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-gray-400">
            <span>Tax (10%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>

          {tip && tip > 0 && (
            <div className="flex justify-between text-gray-400">
              <span>Tip</span>
              <span>${tip.toFixed(2)}</span>
            </div>
          )}

          <Separator className="my-2 bg-gray-700" />

          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
