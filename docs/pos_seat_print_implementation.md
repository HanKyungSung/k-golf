# POS Seat-Specific Print Implementation

## Overview
Implemented customizable seat-specific bill printing using Electron IPC approach. Each seat can print its own bill with filtered order items.

## Architecture

### Electron IPC Approach (Approach 3)
```
BookingDetailPage (Renderer) 
    ↓ handlePrintSeat()
    ↓ window.kgolf.printBill(printData)
Preload.ts (IPC Bridge)
    ↓ ipcRenderer.invoke('print:bill', printData)
Main.ts (Main Process)
    ↓ Creates hidden BrowserWindow
    ↓ Generates custom HTML
    ↓ webContents.print()
```

## Implementation Details

### 1. Main Process Handler (`pos/apps/electron/src/main.ts`)
**Location:** After `update:installNow` handler (~line 780)

**Handler:** `print:bill`
- Creates hidden BrowserWindow
- Generates HTML with seat-specific data
- Calls `webContents.print()` with print dialog
- Cleans up window after printing

**HTML Template:**
- K-GOLF header
- Customer and room info
- Seat name
- Itemized list with quantities and prices
- Subtotal, tax, and grand total
- Thank you footer

### 2. Preload Bridge (`pos/apps/electron/src/preload.ts`)
**Method:** `printBill(printData)`
- Exposed via contextBridge
- Type-safe interface for renderer
- Invokes `print:bill` IPC channel

**Print Data Structure:**
```typescript
{
  seatName: string;          // "Seat 1"
  customerName?: string;     // Optional booking customer
  roomName?: string;         // Optional room name
  date: string;              // Current timestamp
  items: Array<{
    name: string;
    quantity: number;
    price: number;           // Individual item price (handles split items)
  }>;
  subtotal: number;
  tax: number;
  total: number;
}
```

### 3. Renderer Component (`pos/apps/electron/src/renderer/pages/BookingDetailPage.tsx`)
**Function:** `handlePrintSeat(seat: number)`
- Retrieves items for specific seat
- Calculates seat subtotal, tax, and total
- Prepares print data object
- Calls `window.kgolf.printBill()`
- Error handling for empty seats or print failures

### 4. TypeScript Types (`pos/apps/electron/src/renderer/types/global.d.ts`)
**Interface:** `KgolfAPI.printBill()`
- Type definitions for print data
- Return type: `Promise<{ success: boolean; error?: string }>`

## Features

### Current Capabilities
✅ **Seat Filtering:** Only prints items assigned to selected seat
✅ **Professional Layout:** Clean receipt-style format
✅ **Cost Calculation:** Handles regular prices and split item prices
✅ **Customer Context:** Shows booking customer and room name
✅ **Error Handling:** Alerts user if seat is empty or print fails
✅ **Non-blocking:** Async/await pattern, doesn't freeze UI

### Print Dialog Options
- **silent: false** - Shows system print dialog (current setting)
- **printBackground: true** - Prints background colors/images
- **margins: printableArea** - Automatic margins

## Usage

### User Workflow
1. Admin opens booking detail page
2. Adds items to various seats
3. Clicks "Print Seat 1" button
4. Print dialog appears with formatted bill
5. Selects printer and prints
6. Receipt shows only Seat 1 items

### Error Cases
- **Empty Seat:** Alert "No items for Seat X"
- **Print Failure:** Alert "Print failed. Please try again."
- **IPC Error:** Console error logged, user notified

## Testing Checklist
- [ ] Print with single seat, multiple items
- [ ] Print with split items (verify price calculation)
- [ ] Print with empty seat (verify alert)
- [ ] Print with customer name and room
- [ ] Print with guest booking (no customer name)
- [ ] Test on different printers (receipt, laser, PDF)
- [ ] Verify calculations match on-screen totals
- [ ] Test error handling (printer offline, etc.)

## Future Enhancements

### Template Customization
- [ ] Customizable header/footer text
- [ ] Logo upload for business branding
- [ ] Adjustable font sizes and layout
- [ ] Multi-language support

### Batch Printing
- [ ] "Print All Seats" button
- [ ] Select multiple seats for batch print
- [ ] Combined receipt option

### Silent Printing
- [ ] Add setting for silent printing (skip dialog)
- [ ] Remember default printer per seat/room
- [ ] Auto-print on order completion

### Print Preview
- [ ] Preview window before printing
- [ ] Edit mode for one-time changes
- [ ] Save as PDF option

### Thermal Printer Support
- [ ] Integrate ESC/POS commands
- [ ] USB/network printer discovery
- [ ] Kitchen-specific layout (narrower format)
- [ ] Auto-cut after print

## Related Files
- `pos/apps/electron/src/main.ts` - IPC handler
- `pos/apps/electron/src/preload.ts` - Bridge API
- `pos/apps/electron/src/renderer/pages/BookingDetailPage.tsx` - UI logic
- `pos/apps/electron/src/renderer/types/global.d.ts` - TypeScript types
- `TASKS.md` - Task tracking and roadmap

## References
- Electron Print Documentation: https://www.electronjs.org/docs/latest/api/web-contents#contentsprintoptions-callback
- Electron BrowserWindow: https://www.electronjs.org/docs/latest/api/browser-window
- ESC/POS Protocol (future): https://en.wikipedia.org/wiki/ESC/P

## Commit Information
**Branch:** main
**Date:** November 14, 2025
**Status:** Implementation complete, ready for testing
