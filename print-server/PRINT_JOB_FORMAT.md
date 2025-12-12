# Print Job Format & Flow

## Complete Flow: Backend → Print Server → Printer

```
┌──────────────────────────────────────────────────────────────────┐
│  STEP 1: Admin/POS triggers print                                │
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  Admin clicks "Print" button in browser                          │
│  OR POS app prints automatically                                 │
└──────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│  STEP 2: Frontend/POS calls Backend API                          │
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  POST /api/print/receipt                                         │
│  {                                                                │
│    "bookingId": "uuid-123",                                      │
│    "seatIndex": 1  // optional, for seat bills                  │
│  }                                                                │
└──────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│  STEP 3: Backend formats print job                               │
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  Backend fetches booking data from PostgreSQL                    │
│  Formats into PrintJob structure                                 │
│  Broadcasts via WebSocket to connected print servers             │
└──────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│  STEP 4: WebSocket message sent                                  │
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  ws.send(JSON.stringify({                                        │
│    type: 'print-job',                                            │
│    job: { /* PrintJob structure */ }                            │
│  }))                                                              │
└──────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│  STEP 5: Print server receives message                           │
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  websocket-client.ts handleMessage() parses JSON                 │
│  Emits 'print-job' event with job data                          │
└──────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│  STEP 6: Printer service prints                                  │
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  printer-service.ts formats receipt                              │
│  Sends ESC/POS commands to thermal printer                       │
│  Paper comes out!                                                │
└──────────────────────────────────────────────────────────────────┘
```

## Print Job Data Structure

### TypeScript Interface (Lines 5-22 in websocket-client.ts)

```typescript
export interface PrintJob {
  id: string;                    // Unique job ID (for tracking)
  type: 'receipt' | 'seat-bill'; // Type of print
  data: {
    receiptNumber?: string;      // For full receipts
    seatName?: string;           // For seat bills (e.g., "Seat 1")
    customerName?: string;       // Customer name
    roomName?: string;           // Room name
    date: string;                // ISO date string
    items: Array<{
      name: string;              // Item name (e.g., "Beer")
      quantity: number;          // Quantity
      price: number;             // Price per item
    }>;
    subtotal: number;            // Subtotal before tax
    tax: number;                 // Tax amount
    total: number;               // Final total
  };
}
```

## Example WebSocket Messages

### 1. Full Receipt (from booking)

```json
{
  "type": "print-job",
  "job": {
    "id": "job-001-2025-12-08-15-30",
    "type": "receipt",
    "data": {
      "receiptNumber": "R-2025-001234",
      "customerName": "John Doe",
      "roomName": "Room 1",
      "date": "2025-12-08T15:30:00.000Z",
      "items": [
        {
          "name": "Room Booking (2 hours)",
          "quantity": 1,
          "price": 100.00
        },
        {
          "name": "Beer",
          "quantity": 3,
          "price": 5.00
        },
        {
          "name": "Wings",
          "quantity": 1,
          "price": 12.00
        }
      ],
      "subtotal": 127.00,
      "tax": 12.70,
      "total": 139.70
    }
  }
}
```

**What prints:**
```
================================
        K-GOLF
    Golf Simulator
--------------------------------

Receipt: R-2025-001234
Date: 2025-12-08T15:30:00.000Z
Customer: John Doe
Room: Room 1
--------------------------------

Item                 Qty   Price
--------------------------------
Room Booking (2 h... 1     $100.00
Beer                 3     $5.00
Wings                1     $12.00
--------------------------------

                Subtotal: $127.00
                     Tax: $12.70
                   TOTAL: $139.70

--------------------------------
Thank you for visiting K-Golf!

Printed: 12/8/2025, 3:30:45 PM
```

### 2. Seat Bill (split check)

```json
{
  "type": "print-job",
  "job": {
    "id": "job-002-2025-12-08-16-00",
    "type": "seat-bill",
    "data": {
      "seatName": "Seat 1",
      "customerName": "John Doe",
      "roomName": "Room 1",
      "date": "2025-12-08T16:00:00.000Z",
      "items": [
        {
          "name": "Beer",
          "quantity": 2,
          "price": 5.00
        },
        {
          "name": "Nachos",
          "quantity": 1,
          "price": 8.00
        }
      ],
      "subtotal": 18.00,
      "tax": 1.80,
      "total": 19.80
    }
  }
}
```

**What prints:**
```
================================
         Seat 1
--------------------------------

Customer: John Doe
Room: Room 1
Date: 2025-12-08T16:00:00.000Z
--------------------------------

Item              Qty     Price
Beer              2       $5.00
Nachos            1       $8.00

--------------------------------
                  TOTAL: $19.80

        K-Golf
```

## Backend Implementation (What You Need to Add)

### 1. WebSocket Server Setup

```typescript
// backend/src/server.ts
import { WebSocketServer } from 'ws';
import http from 'http';

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ 
  server,
  path: '/print-jobs'
});

// Track connected print servers
const printServers = new Set<WebSocket>();

wss.on('connection', (ws, req) => {
  console.log('Print server connected');
  
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    
    if (message.type === 'register') {
      printServers.add(ws);
      ws.send(JSON.stringify({ type: 'registered' }));
      console.log('Print server registered, total:', printServers.size);
    }
    
    if (message.type === 'job-status') {
      console.log('Print job status:', message);
      // Update job status in database
    }
  });
  
  ws.on('close', () => {
    printServers.delete(ws);
    console.log('Print server disconnected');
  });
});

// Broadcast print job to all connected print servers
export function broadcastPrintJob(job: PrintJob) {
  const message = JSON.stringify({
    type: 'print-job',
    job
  });
  
  let sent = 0;
  printServers.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      sent++;
    }
  });
  
  console.log(`Print job broadcast to ${sent} servers`);
}

// Start server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`WebSocket endpoint: ws://localhost:${port}/print-jobs`);
});
```

### 2. Print API Endpoint

```typescript
// backend/src/routes/print.ts
import { Router } from 'express';
import { broadcastPrintJob } from '../server';
import { requireAuth } from '../middleware/requireAuth';
import prisma from '../db';

const router = Router();

// Print full receipt
router.post('/receipt', requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.body;
    
    // Fetch booking with items
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: true,
        user: true,
        receiptItems: true
      }
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Format print job
    const printJob: PrintJob = {
      id: `job-${Date.now()}`,
      type: 'receipt',
      data: {
        receiptNumber: `R-${booking.id.slice(0, 8)}`,
        customerName: booking.customerName,
        roomName: booking.room.name,
        date: new Date().toISOString(),
        items: booking.receiptItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        subtotal: booking.subtotal,
        tax: booking.tax,
        total: booking.total
      }
    };
    
    // Broadcast to print servers
    broadcastPrintJob(printJob);
    
    res.json({ success: true, jobId: printJob.id });
    
  } catch (error) {
    console.error('Print error:', error);
    res.status(500).json({ error: 'Print failed' });
  }
});

// Print seat bill
router.post('/seat-bill', requireAuth, async (req, res) => {
  try {
    const { bookingId, seatIndex } = req.body;
    
    // Fetch booking and filter items for seat
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: true,
        user: true,
        receiptItems: {
          where: { seatIndex }
        }
      }
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const seatItems = booking.receiptItems.filter(i => i.seatIndex === seatIndex);
    const subtotal = seatItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;
    
    const printJob: PrintJob = {
      id: `job-${Date.now()}`,
      type: 'seat-bill',
      data: {
        seatName: `Seat ${seatIndex}`,
        customerName: booking.customerName,
        roomName: booking.room.name,
        date: new Date().toISOString(),
        items: seatItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        subtotal,
        tax,
        total
      }
    };
    
    broadcastPrintJob(printJob);
    
    res.json({ success: true, jobId: printJob.id });
    
  } catch (error) {
    console.error('Print error:', error);
    res.status(500).json({ error: 'Print failed' });
  }
});

export default router;
```

### 3. Frontend Integration

```typescript
// frontend: Trigger print from admin page
async function printReceipt(bookingId: string) {
  try {
    const response = await fetch('/api/print/receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ bookingId })
    });
    
    const result = await response.json();
    
    if (result.success) {
      toast.success('Print job sent to printer');
    } else {
      toast.error('Print failed');
    }
  } catch (error) {
    toast.error('Failed to send print job');
  }
}

// Print seat bill
async function printSeatBill(bookingId: string, seatIndex: number) {
  const response = await fetch('/api/print/seat-bill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ bookingId, seatIndex })
  });
  
  const result = await response.json();
  if (result.success) {
    toast.success(`Seat ${seatIndex} bill sent to printer`);
  }
}
```

## Data Validation

Print server validates incoming data:

```typescript
// In websocket-client.ts
private handleMessage(message: any): void {
  if (message.type === 'print-job') {
    const job = message.job as PrintJob;
    
    // Basic validation
    if (!job.id || !job.type || !job.data) {
      this.logger.error('Invalid print job format');
      return;
    }
    
    if (!job.data.items || job.data.items.length === 0) {
      this.logger.error('Print job has no items');
      return;
    }
    
    // Emit to printer service
    this.emit('print-job', job);
  }
}
```

## Summary

**Format:** JSON over WebSocket  
**Content:** PrintJob interface with items array, totals, and metadata  
**Flow:** Admin → Backend API → WebSocket broadcast → Print Server → Thermal Printer  
**Types:** Two types - `receipt` (full) and `seat-bill` (per-seat)

The key is the **PrintJob interface** defined in `websocket-client.ts` - this is the contract between backend and print server!
