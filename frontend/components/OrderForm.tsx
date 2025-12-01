import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
}

interface OrderFormProps {
  bookingId: string;
  seatIndex: number;
  menuItems: MenuItem[];
  onOrderAdded: (menuItemId: string, quantity: number) => Promise<void>;
  isLoading?: boolean;
}

export default function OrderForm({
  bookingId,
  seatIndex,
  menuItems,
  onOrderAdded,
  isLoading = false,
}: OrderFormProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [submitting, setSubmitting] = useState(false);

  const selectedItem = menuItems.find((item) => item.id === selectedMenuItem);

  const handleSubmit = async () => {
    if (!selectedMenuItem || !quantity) return;

    try {
      setSubmitting(true);
      await onOrderAdded(selectedMenuItem, parseInt(quantity));
      setShowDialog(false);
      setSelectedMenuItem('');
      setQuantity('1');
    } catch (error) {
      console.error('Order error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const totalPrice = selectedItem ? selectedItem.price * parseInt(quantity || '1') : 0;

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        variant="outline"
        className="w-full border-gray-700 hover:bg-gray-800"
        disabled={isLoading}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Order for Seat {seatIndex}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-gray-900 border border-gray-700">
          <DialogHeader>
            <DialogTitle>Add Order - Seat {seatIndex}</DialogTitle>
            <DialogDescription>
              Select a menu item and quantity
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="menu-item">Menu Item</Label>
              <Select value={selectedMenuItem} onValueChange={setSelectedMenuItem}>
                <SelectTrigger id="menu-item" className="bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Select item..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 max-h-48">
                  {menuItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      <div className="flex items-center gap-2">
                        <span>{item.name}</span>
                        <span className="text-xs text-gray-500">${item.price.toFixed(2)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedItem && (
              <div className="bg-gray-800 p-3 rounded border border-gray-700">
                <p className="text-sm font-medium">{selectedItem.name}</p>
                {selectedItem.description && (
                  <p className="text-xs text-gray-500 mt-1">{selectedItem.description}</p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="bg-gray-800 border-gray-700"
                min="1"
                disabled={submitting}
              />
            </div>

            {selectedItem && (
              <div className="bg-gray-800 p-3 rounded border border-gray-700">
                <div className="flex justify-between text-sm">
                  <span>Unit Price:</span>
                  <span>${selectedItem.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold mt-2">
                  <span>Total:</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={submitting || !selectedMenuItem}
            >
              {submitting ? 'Adding...' : 'Add Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
