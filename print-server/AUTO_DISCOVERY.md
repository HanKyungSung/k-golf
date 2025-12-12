# Printer Auto-Discovery

The print server can automatically find printers on your network!

## How It Works

### Method 1: Network Scan (Default)
1. Print server starts up
2. Detects your local network (e.g., 192.168.1.x)
3. Scans all IPs (192.168.1.1 → 192.168.1.254)
4. Checks port 9100 (standard ESC/POS port)
5. Uses first printer found

**Time:** ~10-30 seconds depending on network size

### Method 2: mDNS/Bonjour (Optional, Faster)
1. Queries network for `_printer._tcp` service
2. Printers that support mDNS respond immediately
3. Gets printer IP, port, and info

**Time:** ~2-5 seconds

---

## Configuration

### Enable Auto-Discovery

Edit `config.json`:

```json
{
  "printer": {
    "type": "epson",
    "interface": "auto"  // ← Set to "auto"
  }
}
```

### Manual IP (Traditional)

```json
{
  "printer": {
    "interface": "tcp://192.168.1.100"  // ← Specific IP
  }
}
```

---

## Usage Examples

### Example 1: Single Printer Network

```
Your network: 192.168.1.x
Printer: 192.168.1.100

Config:
{
  "printer": {
    "interface": "auto"
  }
}

Result:
[INFO] Auto-discovery enabled, scanning for printers...
[INFO] Scanning subnet: 192.168.1.0/24
[INFO] Found printer at 192.168.1.100:9100
[INFO] Using discovered printer: tcp://192.168.1.100:9100
[INFO] Printer service initialized
```

### Example 2: Different Networks (Auto-Adapts!)

**At your office:**
```
Network: 192.168.1.x
Printer auto-discovered: 192.168.1.100
```

**At your parents' house:**
```
Network: 192.168.0.x
Printer auto-discovered: 192.168.0.100
```

**Same config.json works everywhere!**

### Example 3: Multiple Printers Found

```
[INFO] Found printer at 192.168.1.100:9100
[INFO] Found printer at 192.168.1.101:9100
[WARN] Multiple printers found (2):
[INFO]   1. 192.168.1.100:9100
[INFO]   2. 192.168.1.101:9100
[INFO] Using first printer: tcp://192.168.1.100:9100
```

---

## Advantages

### ✅ No Manual IP Configuration
```
Old way:
1. Find printer IP
2. Edit config.json
3. Restart print server

New way:
1. Run print server
2. Done!
```

### ✅ Works Anywhere
```
Same .exe works at:
├── Office (192.168.1.x)
├── Home (192.168.0.x)
├── Parents' house (10.0.0.x)
└── Any location!
```

### ✅ Survives Network Changes
```
Router reset → IP changes
Print server restarts → Auto-discovers new IP
No manual intervention needed!
```

### ✅ Easy Deployment
```
Zip file contains:
├── k-golf-printer.exe
├── config.json (interface: "auto")
├── install.bat
└── README.txt

Deploy to any location → Just works!
```

---

## Troubleshooting

### No Printer Found

**Problem:**
```
[ERROR] No printers found on network
```

**Solutions:**
1. Check printer is powered on
2. Check printer is connected to same network
3. Check firewall isn't blocking ports
4. Manually set IP in config.json:
   ```json
   {
     "printer": {
       "interface": "tcp://192.168.1.100"
     }
   }
   ```

### Multiple Printers (Choose Specific One)

**Problem:**
```
[WARN] Multiple printers found (2)
```

**Solution:** Manually specify which one:
```json
{
  "printer": {
    "interface": "tcp://192.168.1.101"  // Use the second one
  }
}
```

### Slow Startup

**Problem:** Network scan takes 30+ seconds

**Solutions:**
1. Use manual IP for faster startup
2. Reduce subnet size (configure your network to use /28 instead of /24)
3. Use printer hostname if supported:
   ```json
   {
     "printer": {
       "interface": "tcp://epson-printer.local"
     }
   }
   ```

---

## Advanced: Port Configuration

Most thermal printers use port 9100, but you can scan different ports:

Edit `printer-discovery.ts`:
```typescript
// Check multiple ports
const ports = [9100, 9101, 9102];
for (const port of ports) {
  if (await this.checkPrinter(ip, port)) {
    printers.push({ ip, port });
  }
}
```

---

## Technical Details

### Network Scan Algorithm

```
1. Get local machine IP: 192.168.1.50
2. Extract subnet: 192.168.1
3. For each IP in range (1-254):
   - Try to connect to IP:9100
   - Timeout: 1 second
   - If connection succeeds → printer found
4. Return all found printers
```

### Port Check (TCP)

```typescript
socket.connect(9100, '192.168.1.100')
  ↓
  Connection succeeds → Printer is there!
  Timeout/Error → No printer
```

### mDNS Discovery

```
Broadcast: "Who provides _printer._tcp service?"
  ↓
Printer responds: "I'm at 192.168.1.100:9100"
  ↓
Print server connects
```

---

## Comparison: Auto vs Manual

| Feature | Auto | Manual |
|---------|------|--------|
| Setup time | 10-30 sec scan | Instant |
| Works anywhere | ✅ Yes | ❌ No |
| Network changes | ✅ Adapts | ❌ Breaks |
| Multiple locations | ✅ Same config | ❌ Different config |
| Speed | Slower startup | Faster startup |
| Reliability | Depends on network | Always works if IP correct |

---

## Recommendation

### Use Auto-Discovery If:
- ✅ Deploying to multiple locations
- ✅ Network changes frequently
- ✅ Non-technical users setting up
- ✅ Want zero-config deployment

### Use Manual IP If:
- ✅ Single permanent location
- ✅ Need fast startup
- ✅ Printer has static IP configured
- ✅ Multiple printers (need specific one)

### Hybrid Approach:
```json
{
  "printer": {
    "interface": "auto",
    // Fallback if auto-discovery fails:
    "fallbackInterface": "tcp://192.168.1.100"
  }
}
```

---

## Summary

**Auto-discovery makes deployment effortless:**

```
Old way:
1. Deploy print server
2. Find printer IP
3. Edit config.json
4. Restart

New way:
1. Deploy print server
2. Done! (auto-finds printer)
```

**Configuration:**
```json
{
  "printer": {
    "interface": "auto"  // ← Magic!
  }
}
```

**Works everywhere - office, home, parents' house, any venue!**
