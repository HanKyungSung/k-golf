# Quick Start - macOS Development

## Test Print Server on macOS (Without Building)

### 1. Install Dependencies
```bash
cd print-server
npm install
```

### 2. Configure for Local Testing
Edit `config.json`:
```json
{
  "serverUrl": "ws://localhost:8080",
  "reconnectInterval": 5000,
  "updateCheckInterval": 0,
  "printer": {
    "type": "epson",
    "interface": "tcp://192.168.1.100",
    "width": 48
  }
}
```

**Note:** Set `updateCheckInterval: 0` to disable auto-update during testing.

### 3. Run in Development Mode
```bash
npm run dev
```

You should see:
```
[INFO] [Main] K-Golf Print Server v1.0.0 starting...
[INFO] [Main] Configuration loaded
[INFO] [Printer] Printer initialized
[INFO] [WebSocket] Connecting to backend...
```

### 4. Test Without Printer

If you don't have a physical printer, comment out the printer initialization:

Edit `src/server.ts`:
```typescript
// const printerService = new PrinterService(config.printer);
// await printerService.initialize();
const printerService = null; // Testing without printer
```

### 5. Simulate Print Job

Create a test script `test-print.ts`:
```typescript
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8080/print-jobs');

ws.on('open', () => {
  console.log('Connected to print server');
  
  // Send a test print job
  ws.send(JSON.stringify({
    type: 'print-job',
    job: {
      id: 'test-123',
      type: 'receipt',
      data: {
        receiptNumber: 'R001',
        customerName: 'Test Customer',
        roomName: 'Room 1',
        date: new Date().toISOString(),
        items: [
          { name: 'Beer', quantity: 2, price: 5.00 },
          { name: 'Wings', quantity: 1, price: 12.00 }
        ],
        subtotal: 22.00,
        tax: 2.20,
        total: 24.20
      }
    }
  }));
});

ws.on('message', (data) => {
  console.log('Response:', data.toString());
});
```

Run: `npx tsx test-print.ts`

## Build for Testing

### Build macOS Executable
```bash
chmod +x build.sh
./build.sh macos
```

### Test the Executable
```bash
cd release/macos
./k-golf-printer
```

### Install as Service (LaunchAgent)
```bash
cd release/macos
./install.sh
```

Check if running:
```bash
launchctl list | grep kgolf
```

View logs:
```bash
tail -f ~/K-Golf/print-server.log
```

## Troubleshooting

### Printer Not Found
```bash
# List USB devices (find vendor/product ID)
system_profiler SPUSBDataType

# Network printer - test connectivity
ping 192.168.1.100
```

### WebSocket Connection Failed
```bash
# Check if backend is running
curl http://localhost:8080/health

# Check WebSocket endpoint
wscat -c ws://localhost:8080/print-jobs
```

### Permission Denied
```bash
chmod +x k-golf-printer
chmod +x install.sh
chmod +x uninstall.sh
```

## Clean Up Test Installation

```bash
# Stop service
launchctl unload ~/Library/LaunchAgents/com.kgolf.printer.plist

# Remove service
rm ~/Library/LaunchAgents/com.kgolf.printer.plist

# Delete files
rm -rf ~/K-Golf
```
