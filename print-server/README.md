# K-Golf Print Server

Thermal printer service for K-Golf system. Connects to backend via WebSocket and prints receipts to thermal printer.

## Features

- ✅ WebSocket connection to K-Golf backend
- ✅ Automatic reconnection on disconnect
- ✅ Thermal printer support (Epson, Star, etc.)
- ✅ Auto-update capability
- ✅ Windows Service/Startup integration
- ✅ Logging to file

## The Complete Print Flow

```
Backend                Print Server              Thermal Printer
───────                ────────────              ───────────────

1. Admin clicks      →  
   "Print" button
   
2. POST /api/print/receipt
   {
     "bookingId": "uuid-123"
   }
   
3. Backend fetches
   booking data from
   PostgreSQL
   
4. Backend formats
   PrintJob:
   {
     "type": "print-job",
     "job": {
       "id": "job-001",
       "type": "receipt",
       "data": {
         "items": [...],
         "subtotal": 127.00,
         "tax": 12.70,
         "total": 139.70
       }
     }
   }
   
5. WebSocket broadcast  →  6. Receive JSON
                              Parse PrintJob
                              Extract data
                              
                          7. Format for Printer
                             printer.bold(true);
                             printer.println('K-GOLF');
                             printer.tableCustom([...]);
                             
                             Converts to ESC/POS:
                             - 0x1B 0x45 0x01 (bold)
                             - Text bytes
                             - 0x1D 0x56 0x00 (cut)
                             
                          8. printer.execute()  →  9. Printer receives
                                                      ESC/POS commands
                                                      
                                                      Paper prints! 📄
```

**Key Points:**
- Backend sends **structured JSON data** (what to print)
- Print server handles **formatting & ESC/POS conversion** (how to print)
- Changes to layout/format only require print server updates
- Changes to data content require backend updates

## Installation (End User)

### Prerequisites
- **Windows**: Windows 10/11
- **macOS**: macOS 10.15 (Catalina) or later
- Thermal printer connected (USB, Network, or Serial)

### Steps - Windows

1. **Extract Files**
   - Unzip `k-golf-print-server-windows.zip` to `C:\K-Golf\`

2. **Configure Printer**
   - Edit `config.json`
   - Set printer interface:
     - Network: `"interface": "tcp://192.168.1.100"`
     - USB: `"interface": "usb://vendorId/productId"`
     - Serial: `"interface": "com://COM1"`

3. **Install Service**
   - Right-click `install.bat`
   - Select "Run as administrator"
   - Print server will start automatically on boot

4. **Verify**
   - Check `print-server.log` for successful connection
   - Look for: "Connected to backend WebSocket"

### Steps - macOS

1. **Extract Files**
   - Unzip `k-golf-print-server-macos.zip` to `~/K-Golf/`

2. **Configure Printer**
   - Edit `config.json`
   - Set printer interface:
     - Network: `"interface": "tcp://192.168.1.100"`
     - USB: `"interface": "usb://vendorId/productId"`
     - Serial: `"interface": "/dev/tty.usbserial"`

3. **Install Service**
   - Open Terminal
   - `cd ~/K-Golf`
   - `chmod +x install.sh`
   - `./install.sh`
   - Print server will start automatically on login

4. **Verify**
   - Check status: `launchctl list | grep kgolf`
   - View logs: `tail -f ~/K-Golf/print-server.log`

## Configuration

Edit `config.json`:

```json
{
  "serverUrl": "wss://k-golf.ca",
  "reconnectInterval": 5000,
  "updateCheckInterval": 21600000,
  "printer": {
    "type": "epson",
    "interface": "tcp://192.168.1.100",
    "characterSet": "PC437_USA",
    "removeSpecialCharacters": false,
    "lineCharacter": "-",
    "width": 48
  },
  "logging": {
    "level": "info",
    "file": "print-server.log"
  }
}
```

### Configuration Properties

#### Server Settings
- **`serverUrl`** (string, required)
  - WebSocket URL of K-Golf backend
  - Format: `wss://domain.com` or `ws://localhost:8080`
  - Default: `"wss://k-golf.inviteyou.ca"`

- **`reconnectInterval`** (number, milliseconds)
  - Time to wait before reconnecting after disconnect
  - Default: `5000` (5 seconds)
  - Increase for slower networks, decrease for faster recovery

- **`updateCheckInterval`** (number, milliseconds)
  - How often to check for software updates
  - Default: `21600000` (6 hours)
  - Set to `0` to disable auto-updates

#### Printer Settings

- **`printer.type`** (string, required)
  - Printer brand/protocol
  - Options: `"epson"`, `"star"`, `"tanca"`
  - Default: `"epson"` (most common ESC/POS)

- **`printer.interface`** (string, required)
  - How to connect to the printer
  - Options:
    - `"auto"` - Auto-discover network printers (recommended for first setup)
    - `"tcp://192.168.1.100:9100"` - Network printer (IP:PORT)
    - `"usb://0x04b8/0x0202"` - USB (vendorId/productId)
    - `"com://COM1"` - Serial port (Windows)
    - `"/dev/tty.usbserial"` - Serial port (macOS/Linux)
  - Default: `"auto"`

- **`printer.characterSet`** (string, optional)
  - Character encoding for text
  - Common options:
    - `"PC437_USA"` - Standard English/ASCII (default)
    - `"PC850_MULTILINGUAL"` - Western European languages
    - `"KOREA"` - Korean characters (CP949)
    - `"JAPAN"` - Japanese characters
    - `"CHINA"` - Simplified Chinese
  - Default: `"PC437_USA"`
  - **Note**: Use `PC437_USA` for English-only content (golf receipts, names, etc.)

- **`printer.removeSpecialCharacters`** (boolean, optional)
  - Strip special characters that printer can't display
  - Default: `false`
  - Set to `true` if seeing garbled text

- **`printer.lineCharacter`** (string, optional)
  - Character used for separator lines
  - Default: `"-"`
  - Can use `"="`, `"_"`, `"*"`, etc.

- **`printer.width`** (number, optional)
  - Number of characters per line
  - Default: `48`
  - Common values: `32` (2-inch), `48` (3-inch), `64` (4-inch)
  - Adjust based on your printer model

#### Logging Settings

- **`logging.level`** (string, optional)
  - Log verbosity
  - Options: `"debug"`, `"info"`, `"warn"`, `"error"`
  - Default: `"info"`
  - Use `"debug"` for troubleshooting

- **`logging.file`** (string, optional)
  - Log file name (saved in same folder as exe)
  - Default: `"print-server.log"`

### Example Configurations

**Auto-discovery (First Setup)**
```json
{
  "serverUrl": "wss://k-golf.ca",
  "printer": {
    "type": "epson",
    "interface": "auto"
  }
}
```

**Network Printer (Fixed IP)**
```json
{
  "serverUrl": "wss://k-golf.ca",
  "printer": {
    "type": "epson",
    "interface": "tcp://192.168.1.100:9100",
    "width": 48
  }
}
```

**USB Printer**
```json
{
  "serverUrl": "ws://localhost:8080",
  "printer": {
    "type": "epson",
    "interface": "usb://0x04b8/0x0202"
  }
}
```

**Korean Language Support**
```json
{
  "serverUrl": "wss://k-golf.ca",
  "printer": {
    "type": "epson",
    "interface": "tcp://192.168.1.100:9100",
    "characterSet": "KOREA"
  }
}
```

## Troubleshooting

### Printer Not Found
1. Check printer is powered on and connected
2. For network printers: ping the IP address
3. For USB printers: check Device Manager
4. Try `interface: "printer:PrinterName"` (Windows printer name)

### WebSocket Connection Failed
1. Check internet connection
2. Verify `serverUrl` in config.json
3. Check firewall settings (allow outbound WSS)

### Logs
- Location: `print-server.log` (same folder as .exe)
- View real-time: `type print-server.log`
- Clear old logs: delete the file (will recreate)

## Uninstallation

### Windows
1. Right-click `uninstall.bat`
2. Select "Run as administrator"
3. Delete folder

### macOS
1. Open Terminal
2. `cd ~/K-Golf`
3. `./uninstall.sh`
4. Delete folder

## Development

### Build from Source

```bash
# Install dependencies
npm install

# Development (works on both macOS and Windows)
npm run dev

# Build TypeScript
npm run build

# Build executables
npm run build:exe       # Windows only
npm run build:macos     # macOS only
npm run build:all       # Both platforms

# Or use the build script
chmod +x build.sh
./build.sh              # Builds for both platforms
./build.sh macos        # macOS only
./build.sh windows      # Windows only
```

Output:
- Windows: `release/windows/k-golf-printer.exe`
- macOS: `release/macos/k-golf-printer`

### Testing Locally

```bash
# Edit config.json for local backend
{
  "serverUrl": "ws://localhost:8080"
}

# Run in dev mode
npm run dev
```

## Auto-Update

The print server checks for updates every 6 hours automatically.

### Update Process
1. Server checks `https://k-golf.inviteyou.ca/api/printer-updates/version.json`
2. If newer version available, downloads `.exe`
3. Replaces itself and restarts
4. User sees nothing (completely automatic)

### Disable Auto-Update
Edit `config.json`:
```json
{
  "updateCheckInterval": 0
}
```

## System Requirements

- **Windows**: Windows 10/11 (64-bit)
- **macOS**: macOS 10.15 (Catalina) or later (Intel or Apple Silicon)
- 50 MB disk space
- Internet connection
- Thermal printer (ESC/POS compatible)ter)
├── Update Service (auto-update checker)
└── Logger (file logging)
```

## System Requirements

- Windows 10/11 (64-bit)
- 50 MB disk space
- Internet connection
- Thermal printer (ESC/POS compatible)

## Support

For issues, contact: support@k-golf.com

## Version

Current: 1.0.0
