# Auto-Update System Explained

## Overview

The print server checks for updates automatically and installs them without user interaction.

## Step-by-Step Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Print Server Starts                                │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  server.ts (line 50-58):                                    │
│    const updateService = new UpdateService(                 │
│      'https://k-golf.inviteyou.ca',  ← Backend URL         │
│      '1.0.0',                         ← Current version     │
│      21600000                         ← Check every 6 hours │
│    );                                                        │
│    updateService.startChecking();                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Periodic Check (Every 6 Hours)                     │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  update-service.ts (line 27-31):                            │
│    setInterval(() => {                                       │
│      this.checkForUpdates();  ← Runs every 6 hours         │
│    }, this.checkInterval);                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Fetch Version Info from Backend                    │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  GET https://k-golf.inviteyou.ca/api/printer-updates/version.json
│                                                              │
│  Backend responds:                                           │
│  {                                                           │
│    "version": "1.0.5",                                       │
│    "downloadUrl": "https://.../k-golf-printer-1.0.5.exe",  │
│    "autoUpdate": true                                        │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Compare Versions                                   │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  update-service.ts (line 93-104):                           │
│    isNewerVersion('1.0.5', '1.0.0')                         │
│      → Splits: [1,0,5] vs [1,0,0]                          │
│      → Compares: 5 > 0 → TRUE                              │
│                                                              │
│  If newer version found:                                     │
│    → Log: "Update available: 1.0.5"                        │
│    → Call: downloadAndInstall()                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 5: Download New Executable                            │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  download-service.ts (line 115):                            │
│    Download from: versionInfo.downloadUrl                    │
│    Save to: k-golf-printer-new.exe (Windows)                │
│         or: k-golf-printer-new (macOS)                      │
│                                                              │
│  Result:                                                     │
│    ├── k-golf-printer.exe      ← Currently running (old)   │
│    └── k-golf-printer-new.exe  ← Just downloaded (new)     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 6: Create Update Script                               │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Windows (update.bat):                                       │
│    @echo off                                                 │
│    timeout /t 2       ← Wait 2 seconds for process to exit │
│    move /y k-golf-printer-new.exe k-golf-printer.exe       │
│    start k-golf-printer.exe  ← Restart with new version    │
│                                                              │
│  macOS (update.sh):                                          │
│    sleep 2                                                   │
│    mv k-golf-printer-new k-golf-printer                     │
│    ./k-golf-printer &                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 7: Execute Update Script & Exit                       │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Windows:                                                    │
│    execSync('start /min cmd /c "update.bat"')              │
│    process.exit(0)  ← Current process stops                │
│                                                              │
│  What happens:                                               │
│    1. Current process exits                                  │
│    2. Update script waits 2 seconds                         │
│    3. Update script replaces old .exe with new .exe         │
│    4. Update script starts new .exe                         │
│    5. New version is now running!                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 8: New Version Running                                │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  server.ts starts again with VERSION = '1.0.5'             │
│  User sees nothing - completely transparent!                 │
│                                                              │
│  Logs show:                                                  │
│    [INFO] K-Golf Print Server v1.0.5 starting...           │
│    [INFO] Connected to backend WebSocket                    │
│    [INFO] Print server running and ready                    │
└─────────────────────────────────────────────────────────────┘
```

## Key Points

### 1. **Version Check is Periodic**
```typescript
// In server.ts (line 50-58)
const updateService = new UpdateService(
  config.serverUrl,
  VERSION,              // '1.0.0' hardcoded in server.ts
  config.updateCheckInterval  // 21600000 ms = 6 hours
);
updateService.startChecking();  // Starts the timer
```

### 2. **Backend Must Host Version File**
The backend needs to serve:
```
GET /api/printer-updates/version.json

Response:
{
  "version": "1.0.5",
  "downloadUrl": "https://k-golf.inviteyou.ca/downloads/k-golf-printer-1.0.5.exe",
  "autoUpdate": true,
  "notes": "Bug fixes and improvements"
}
```

### 3. **Self-Replacement Trick**
The running process **cannot replace itself** while running, so:
1. Download new file with different name (`k-golf-printer-new.exe`)
2. Create a batch script that will run **after** process exits
3. Exit current process
4. Script waits 2 seconds
5. Script replaces old file with new file
6. Script starts new file

### 4. **User Experience**
From the user's perspective:
- No popups or notifications
- No "update available" prompts
- No downloads they need to manage
- App just silently updates and keeps running

## How to Test Locally

### 1. Create Mock Version Server

Create `test-update-server.js`:
```javascript
const express = require('express');
const app = express();

app.get('/api/printer-updates/version.json', (req, res) => {
  res.json({
    version: '1.0.5',
    downloadUrl: 'http://localhost:3000/k-golf-printer-1.0.5.exe',
    autoUpdate: true
  });
});

app.listen(3000, () => {
  console.log('Test update server running on port 3000');
});
```

### 2. Modify config.json for Testing
```json
{
  "serverUrl": "http://localhost:3000",
  "updateCheckInterval": 10000,  // Check every 10 seconds (instead of 6 hours)
  "printer": { ... }
}
```

### 3. Watch It Work
```bash
npm run dev
```

Logs will show:
```
[INFO] [Updater] Checking for updates...
[INFO] [Updater] Update available { current: '1.0.0', latest: '1.0.5' }
[INFO] [Updater] Downloading update...
[INFO] [Updater] Update downloaded, preparing to install...
[INFO] [Updater] Update ready, restarting...
```

## Disabling Auto-Update

Set in `config.json`:
```json
{
  "updateCheckInterval": 0  // Disables checking
}
```

Or modify `src/server.ts`:
```typescript
// Comment out these lines:
// const updateService = new UpdateService(...);
// updateService.startChecking();
```

## Questions?

The key insight: **The update service runs in the background, independent of the WebSocket and printer services**. It's just a timer that periodically checks a URL and performs a self-replacement if needed.
