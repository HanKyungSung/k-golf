import React from 'react';
import { VENUE_TIMEZONE } from '@/lib/timezone';

export interface ReceiptData {
  receiptNumber: string;
  bookingId: string;
  customer: {
    name: string;
    phone: string;
    email?: string | null;
  };
  business: {
    name: string;
    address: string;
    phone: string;
    taxId?: string;
  };
  booking: {
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
    room: {
      name: string;
      rate: number;
    };
    players: number;
  };
  items: {
    roomCharge: {
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    };
    seats: Array<{
      seatIndex: number;
      orders: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        total: number;
      }>;
      discounts: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        total: number;
      }>;
      preDiscountSubtotal: number;
      subtotal: number;
    }>;
  };
  totals: {
    subtotal: string;
    tax: string;
    tip: string;
    grandTotal: string;
    taxRate: number;
  };
  payment: {
    method?: string | null;
    status: string;
    paidAt?: Date | null;
  };
  metadata: {
    generatedAt: Date;
    generatedBy?: string | null;
  };
}

interface ReceiptProps {
  data: ReceiptData;
  printMode?: 'full' | 'seat' | null;
  printingSeatIndex?: number | null;
}

export function Receipt({ data, printMode, printingSeatIndex }: ReceiptProps) {
  // Determine which seats to show
  const shouldShowSeat = (seatIndex: number) => {
    if (!printMode) return true; // Show all on screen
    if (printMode === 'full') return true; // Show all when printing full receipt
    return printingSeatIndex === seatIndex; // Show only specific seat
  };

  const seatsToShow = data.items.seats.filter(seat => shouldShowSeat(seat.seatIndex));

  return (
    <div className="receipt bg-white text-slate-900 max-w-[80mm] mx-auto p-6">
      {/* Header */}
      <div className="receipt-header text-center mb-6">
        <h1 className="text-2xl font-bold mb-1">{data.business.name}</h1>
        <p className="text-xs text-slate-600">{data.business.address}</p>
        <p className="text-xs text-slate-600">{data.business.phone}</p>
        {data.business.taxId && (
          <p className="text-xs text-slate-500 mt-1">Tax ID: {data.business.taxId}</p>
        )}
      </div>

      <div className="border-t border-b border-dashed border-slate-300 py-3 my-3">
        <div className="text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Receipt</p>
          <p className="text-sm font-bold mt-1">{data.receiptNumber}</p>
        </div>
      </div>

      {/* Customer & Booking Info */}
      <div className="receipt-section mb-4 text-xs">
        <div className="grid grid-cols-2 gap-y-1">
          <div className="text-slate-600">Customer:</div>
          <div className="text-right font-medium">{data.customer.name}</div>
          
          <div className="text-slate-600">Phone:</div>
          <div className="text-right font-medium">{data.customer.phone}</div>
          
          <div className="text-slate-600">Date:</div>
          <div className="text-right font-medium">{data.booking.date}</div>
          
          <div className="text-slate-600">Time:</div>
          <div className="text-right font-medium">
            {data.booking.startTime} - {data.booking.endTime}
          </div>
          
          <div className="text-slate-600">Room:</div>
          <div className="text-right font-medium">{data.booking.room.name}</div>
          
          <div className="text-slate-600">Players:</div>
          <div className="text-right font-medium">{data.booking.players}</div>
        </div>
      </div>

      <div className="border-t border-dashed border-slate-300 my-3"></div>

      {/* Items */}
      <div className="receipt-section mb-4">
        <h3 className="text-sm font-bold mb-2">Items</h3>
        
        {/* Room Charge (only in full receipt) */}
        {printMode !== 'seat' && data.items.roomCharge.total > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium">Room Charge</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>{data.items.roomCharge.description}</span>
              <span className="font-medium">${data.items.roomCharge.total.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Seat Orders */}
        {seatsToShow.map((seat) => {
          const hasDiscounts = seat.discounts && seat.discounts.length > 0;
          return (
          <div key={seat.seatIndex} className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-slate-700">Seat {seat.seatIndex}</span>
              <span className="text-xs text-slate-500">Total: ${seat.subtotal.toFixed(2)}</span>
            </div>
            
            {seat.orders.map((order, idx) => (
              <div key={idx} className="flex justify-between text-xs text-slate-600 mb-0.5 pl-2">
                <span>
                  {order.name} <span className="text-slate-400">×{order.quantity}</span>
                </span>
                <span className="font-medium">${order.total.toFixed(2)}</span>
              </div>
            ))}

            {hasDiscounts && (
              <>
                <div className="flex justify-between text-xs text-slate-500 mt-1 pl-2 border-t border-dotted border-slate-200 pt-1">
                  <span>Subtotal</span>
                  <span>${seat.preDiscountSubtotal.toFixed(2)}</span>
                </div>
                {seat.discounts.map((discount, idx) => (
                  <div key={`d-${idx}`} className="flex justify-between text-xs text-emerald-700 mb-0.5 pl-2">
                    <span>↳ {discount.name}</span>
                    <span className="font-medium">-${Math.abs(discount.total).toFixed(2)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
          );
        })}
      </div>

      <div className="border-t border-dashed border-slate-300 my-3"></div>

      {/* Totals */}
      <div className="receipt-section mb-4">
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-600">Subtotal:</span>
            <span className="font-medium">${data.totals.subtotal}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-600">Tax ({data.totals.taxRate}%):</span>
            <span className="font-medium">${data.totals.tax}</span>
          </div>
          
          {parseFloat(data.totals.tip) > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">Tip:</span>
              <span className="font-medium">${data.totals.tip}</span>
            </div>
          )}
          
          <div className="border-t border-slate-300 pt-2 mt-2">
            <div className="flex justify-between text-base font-bold">
              <span>Total:</span>
              <span>${data.totals.grandTotal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Status */}
      <div className="receipt-section mb-4">
        <div className={`text-center py-2 px-3 rounded text-xs font-bold ${
          data.payment.status === 'PAID' 
            ? 'bg-green-100 text-green-800' 
            : data.payment.status === 'PARTIAL'
            ? 'bg-amber-100 text-amber-800'
            : 'bg-slate-100 text-slate-800'
        }`}>
          {data.payment.status === 'PAID' ? '✓ PAID' : 
           data.payment.status === 'PARTIAL' ? '◐ PARTIALLY PAID' : 
           '○ UNPAID'}
        </div>
        {data.payment.method && (
          <p className="text-xs text-center text-slate-500 mt-2">
            Payment Method: {data.payment.method}
          </p>
        )}
      </div>

      <div className="border-t border-dashed border-slate-300 my-3"></div>

      {/* Footer */}
      <div className="receipt-footer text-center text-xs text-slate-500">
        <p className="mb-2">Thank you for choosing {data.business.name}!</p>
        <p className="text-[10px]">
          Generated: {new Date(data.metadata.generatedAt).toLocaleString('en-US', { timeZone: VENUE_TIMEZONE })}
        </p>
      </div>

    </div>
  );
}

export default Receipt;
