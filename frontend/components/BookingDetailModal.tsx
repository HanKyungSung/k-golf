import React from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import POSBookingDetail from '../src/pages/pos/booking-detail';

interface BookingDetailModalProps {
  bookingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void; // Called when modal closes, for refreshing data
}

export function BookingDetailModal({ 
  bookingId, 
  open, 
  onOpenChange,
  onClose 
}: BookingDetailModalProps) {
  const handleClose = () => {
    onOpenChange(false);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        onClose?.();
      }
    }}>
      <DialogContent 
        className="bg-slate-900 border-slate-700 text-white !w-[95vw] !max-w-[95vw] !h-[95vh] !max-h-[95vh] p-0 overflow-hidden"
        showCloseButton={false}
      >
        {bookingId && (
          <POSBookingDetail 
            bookingId={bookingId} 
            onBack={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default BookingDetailModal;
