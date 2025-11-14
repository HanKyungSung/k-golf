# Electron Auto-Update Guide

Complete guide to understanding and implementing auto-updates in K-Golf POS.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Pipeline Configuration](#pipeline-configuration)
4. [Main Process Configuration](#main-process-configuration)
5. [Testing Auto-Update](#testing-auto-update)
6. [Troubleshooting](#troubleshooting)

---

## 🔄 Overview

K-Golf POS uses **electron-updater** (part of electron-builder) for automatic updates. This provides:

- ✅ **Automatic background downloads** (no user action required)
- ✅ **Delta updates** (only downloads changed files via blockmap)
- ✅ **Silent installation** (installs on app quit, no interruptions)
- ✅ **SHA512 verification** (ensures file integrity)
- ✅ **Cross-platform** (same code for macOS and Windows)

---

## 🏗️ How It Works

### Update Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER'S COMPUTER                           │
│  ┌────────────────────────────────────────┐                │
│  │     Electron App (v0.1.0)              │                │
│  │  ┌──────────────────────────────────┐  │                │
│  │  │  electron-updater module         │  │                │
│  │  └──────────────────────────────────┘  │                │
│  └────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                      │
                      │ 1. Check for updates
                      │    (Periodic: every X hours)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              RELEASE SERVER (GitHub)                         │
│  https://github.com/HanKyungSung/k-golf-release/releases   │
│                                                              │
│  Files:                                                      │
│  ├─ latest-mac.yml      ← Metadata (version, SHA512)       │
│  ├─ K-Golf POS.dmg      ← Installer                        │
│  └─ K-Golf POS.dmg.blockmap  ← Delta update file           │
└─────────────────────────────────────────────────────────────┘
                      │
                      │ 2. Compare versions
                      │    Server: v0.2.0
                      │    Local:  v0.1.0
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    UPDATE DECISION                           │
│                                                              │
│  IF server version > local version:                         │
│    → Download delta (.blockmap)                             │
│    → Only changed blocks downloaded (not full DMG)          │
│    → Verify SHA512 checksum                                 │
│    → Install update in background                           │
│    → Notify user: "Update ready - restart to apply"        │
└─────────────────────────────────────────────────────────────┘
```

### Key Files Generated

When you publish a release, electron-builder automatically generates:

**macOS:**
```
latest-mac.yml                    ← Update metadata
K-Golf POS-0.2.0-arm64.dmg        ← Full installer
K-Golf POS-0.2.0-arm64.dmg.blockmap  ← Delta update
```

**Windows:**
```
latest.yml                        ← Update metadata
K-Golf POS Setup 0.2.0.exe        ← Full installer
K-Golf POS Setup 0.2.0.exe.blockmap  ← Delta update
```

### Metadata File Example (latest-mac.yml)

```yaml
version: 0.2.0
releaseDate: '2025-11-13T10:30:00.000Z'
files:
  - url: K-Golf-POS-0.2.0-arm64.dmg
    sha512: abc123def456...
    size: 89234567
path: K-Golf-POS-0.2.0-arm64.dmg
sha512: abc123def456...
```

electron-updater reads this file to determine if an update is available.

---

## 🔧 Pipeline Configuration

### Why We Changed the Release Pipeline

#### **Before (No Auto-Update):**
```yaml
npx electron-builder --mac --${{ matrix.arch }} --publish never
```

#### **After (With Auto-Update):**
```yaml
npx electron-builder --mac --${{ matrix.arch }}
env:
  GH_TOKEN: ${{ secrets.PUBLIC_RELEASE_TOKEN }}
```

### What Changed and Why

**1. Removed `--publish never` flag**

**Why:** This flag tells electron-builder "Don't generate update metadata files"
- Without metadata files (`latest-mac.yml`, `latest.yml`), auto-update cannot work
- The app has no way to know what version is available

**2. Added `GH_TOKEN` environment variable**

**Why:** electron-builder needs GitHub access to:
- Read repository info (owner, repo name)
- Generate correct download URLs in metadata files
- The URLs point to: `https://github.com/HanKyungSung/k-golf-release/releases/download/pos-vX.X.X/...`

### What Happens During Build

```
electron-builder runs
  │
  ├─ Builds DMG/EXE installer
  │
  ├─ Generates .blockmap file (for delta updates)
  │
  ├─ Generates latest-mac.yml / latest.yml
  │     │
  │     └─ Contains:
  │         - Version number
  │         - SHA512 checksum
  │         - File size
  │         - Download URL
  │
  └─ GitHub Actions uploads ALL files to releases
```

---

## ⚙️ Main Process Configuration

### Imports

```typescript
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
```

- **`autoUpdater`**: Core module for update management
- **`log`**: Persistent logging to files (not just console)

### Logger Configuration

```typescript
autoUpdater.logger = log;
(autoUpdater.logger as any).transports.file.level = 'info';
```

**Why:** Writes logs to persistent files for debugging

**Log locations:**
- **macOS**: `~/Library/Logs/K-Golf POS/main.log`
- **Windows**: `%USERPROFILE%\AppData\Roaming\K-Golf POS\logs\main.log`

**View logs in real-time:**
```bash
# macOS
tail -f ~/Library/Logs/K-Golf\ POS/main.log | grep AUTO_UPDATE

# Windows
Get-Content "$env:USERPROFILE\AppData\Roaming\K-Golf POS\logs\main.log" -Tail 50 -Wait | Select-String "AUTO_UPDATE"
```

### Update Behavior Settings

```typescript
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
```

**`autoDownload: true`**
- When update detected → automatically download in background
- Alternative: `false` = Ask user permission before downloading

**`autoInstallOnAppQuit: true`**
- When user quits app → silently install update then relaunch
- Alternative: `false` = Prompt "Install now?" (forces immediate quit)

### Event Listeners

#### 1. Checking for Update
```typescript
autoUpdater.on('checking-for-update', () => {
  log.info('[AUTO_UPDATE] Checking for updates...');
  emitToAll('update:checking', {});
});
```
**When fired:** App starts checking for updates  
**Purpose:** Show "Checking for updates..." spinner in UI

---

#### 2. Update Available
```typescript
autoUpdater.on('update-available', (info) => {
  log.info('[AUTO_UPDATE] Update available:', info.version);
  emitToAll('update:available', { 
    version: info.version, 
    releaseNotes: info.releaseNotes 
  });
});
```
**When fired:** New version found (`server version > local version`)  
**Purpose:** Notify user "Update available: v0.2.0"  
**What happens next:** Automatically starts downloading (because `autoDownload: true`)

---

#### 3. Update Not Available
```typescript
autoUpdater.on('update-not-available', (info) => {
  log.info('[AUTO_UPDATE] Update not available. Current version:', info.version);
  emitToAll('update:not-available', { version: info.version });
});
```
**When fired:** No new version available (you're on latest)  
**Purpose:** Silent (no UI notification needed)

---

#### 4. Download Progress
```typescript
autoUpdater.on('download-progress', (progress) => {
  log.info(`[AUTO_UPDATE] Download progress: ${progress.percent.toFixed(2)}%`);
  emitToAll('update:download-progress', {
    percent: progress.percent,           // 0-100
    transferred: progress.transferred,   // Bytes downloaded
    total: progress.total,               // Total file size
    bytesPerSecond: progress.bytesPerSecond // Download speed
  });
});
```
**When fired:** Repeatedly during download (every few seconds)  
**Purpose:** Show progress bar: "Downloading update... 45% (23MB/50MB)"

---

#### 5. Update Downloaded
```typescript
autoUpdater.on('update-downloaded', (info) => {
  log.info('[AUTO_UPDATE] Update downloaded:', info.version);
  windows[0].webContents.send('update:ready', {
    version: info.version,
    message: 'Update downloaded. Will install on next restart.'
  });
});
```
**When fired:** Download complete and ready to install  
**Purpose:** Show notification: "Update ready! Restart to install v0.2.0"  
**Install happens:** When user quits app (thanks to `autoInstallOnAppQuit: true`)

---

#### 6. Error
```typescript
autoUpdater.on('error', (error) => {
  log.error('[AUTO_UPDATE] Error:', error);
  emitToAll('update:error', { message: error.message });
});
```
**When fired:** Network error, file corruption, permission issue  
**Purpose:** Log error and optionally show user-friendly message

---

### Update Check Schedule

#### Initial Check (10 second delay)
```typescript
setTimeout(() => {
  log.info('[AUTO_UPDATE] Performing initial update check');
  autoUpdater.checkForUpdates();
}, 10000);
```
**Why 10 seconds?** Give app time to fully initialize (auth, database, UI)

#### Periodic Check (every 4 hours)
```typescript
const CHECK_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours
setInterval(() => {
  log.info('[AUTO_UPDATE] Performing periodic update check');
  autoUpdater.checkForUpdates();
}, CHECK_INTERVAL);
```
**Why 4 hours?** Balance between:
- ⚡ Fast updates (users get fixes quickly)
- 📡 Reasonable server load (not checking every minute)

---

### Manual Triggers (IPC Handlers)

#### Manual Update Check
```typescript
ipcMain.handle('update:check', async () => {
  const result = await autoUpdater.checkForUpdates();
  return { ok: true, updateInfo: result?.updateInfo };
});
```
**Usage:** User clicks "Check for updates" button in settings

**Renderer code:**
```typescript
const result = await window.electron.invoke('update:check');
console.log('Update info:', result.updateInfo);
```

---

#### Install Now
```typescript
ipcMain.handle('update:installNow', () => {
  log.info('[AUTO_UPDATE] Install now requested');
  autoUpdater.quitAndInstall(false, true); // (isSilent, isForceRunAfter)
});
```
**Usage:** User clicks "Install now" instead of waiting  
**What happens:** Immediate quit → Install → Relaunch

**Renderer code:**
```typescript
await window.electron.invoke('update:installNow');
// App will quit and restart with new version
```

---

## 🧪 Testing Auto-Update

### Prerequisites

1. **Two different versions** (e.g., v0.1.0 and v0.2.0)
2. **Both versions published** to GitHub releases
3. **App installed** (not running from DMG/Downloads)

### Test Scenarios

#### **Scenario 1: Fresh Update Detection**

**Setup:**
1. Have v0.1.0 installed on your machine
2. Publish v0.2.0 to GitHub releases

**Test steps:**
```bash
# 1. Launch v0.1.0 app
open /Applications/K-Golf\ POS.app

# 2. Watch logs in real-time
tail -f ~/Library/Logs/K-Golf\ POS/main.log | grep AUTO_UPDATE

# Expected output (after 10 seconds):
# [AUTO_UPDATE] Performing initial update check
# [AUTO_UPDATE] Checking for updates...
# [AUTO_UPDATE] Update available: 0.2.0
# [AUTO_UPDATE] Download progress: 15.34% (15728640/102400000 bytes)
# [AUTO_UPDATE] Download progress: 45.67% (46759936/102400000 bytes)
# [AUTO_UPDATE] Download progress: 78.92% (80834560/102400000 bytes)
# [AUTO_UPDATE] Download progress: 100.00% (102400000/102400000 bytes)
# [AUTO_UPDATE] Update downloaded: 0.2.0

# 3. Quit the app
# App should quit → Install update → Relaunch

# 4. Verify new version
# App should now show v0.2.0 in About dialog or title bar
```

---

#### **Scenario 2: Manual Update Check**

**Test steps:**
1. Open developer console in app (`Cmd+Option+I`)
2. Run manual check:
```javascript
// In console
window.electron.invoke('update:check').then(console.log);

// Expected response:
// { ok: true, updateInfo: { version: "0.2.0", ... } }
```

---

#### **Scenario 3: Download Progress Monitoring**

**Setup:**
Add listener in renderer process (`src/renderer/index.tsx`):

```typescript
// Listen for download progress
window.electron.on('update:download-progress', (progress) => {
  console.log(`Download: ${progress.percent.toFixed(2)}%`);
  // Update UI progress bar here
});

// Listen for update ready
window.electron.on('update:ready', (info) => {
  console.log('Update ready:', info.version);
  // Show notification: "Update downloaded, restart to install"
});
```

**Test:**
1. Launch app with v0.1.0
2. Watch console for download progress
3. Verify notification appears when download completes

---

#### **Scenario 4: Install Now (Immediate)**

**Test:**
```javascript
// In console
window.electron.invoke('update:installNow');

// Expected behavior:
// App quits immediately
// Update installs
// App relaunches with new version
```

---

#### **Scenario 5: No Update Available**

**Setup:**
1. Install latest version (v0.2.0)
2. No newer version published

**Test:**
```bash
# Watch logs
tail -f ~/Library/Logs/K-Golf\ POS/main.log | grep AUTO_UPDATE

# Expected output:
# [AUTO_UPDATE] Checking for updates...
# [AUTO_UPDATE] Update not available. Current version: 0.2.0
```

---

#### **Scenario 6: Periodic Check (4 hours)**

**Test:**
1. Launch app
2. Leave running for 4+ hours
3. Check logs for periodic update check:

```bash
# Should see multiple checks:
# 10:00 - [AUTO_UPDATE] Performing initial update check
# 14:00 - [AUTO_UPDATE] Performing periodic update check (4 hours later)
# 18:00 - [AUTO_UPDATE] Performing periodic update check (8 hours later)
```

---

### Delta Update Verification

**Test that blockmap delta updates work:**

1. **Install v0.1.0** (full install, ~100MB)
2. **Publish v0.2.0** (with only small code changes)
3. **Launch v0.1.0** and wait for update

**Verify delta download:**
```bash
# Watch download size in logs
tail -f ~/Library/Logs/K-Golf\ POS/main.log | grep "download-progress"

# Expected: Download only ~5-10MB (changed blocks)
# Not: Download full 100MB DMG
```

**How it works:**
- `.blockmap` file contains checksums of all blocks in the DMG
- electron-updater compares local blocks with remote blocks
- Only downloads blocks that changed
- Reassembles full DMG locally

---

### Network Failure Testing

**Test error handling:**

1. Launch app
2. Disconnect internet
3. Wait for update check (10 seconds)

**Expected logs:**
```
[AUTO_UPDATE] Performing initial update check
[AUTO_UPDATE] Error: net::ERR_INTERNET_DISCONNECTED
```

**App should:**
- ✅ Log error
- ✅ Continue running normally (not crash)
- ✅ Retry on next periodic check (4 hours later)

---

### Mock Server Testing (Advanced)

**Use local update server for faster testing:**

```bash
# 1. Build v0.1.0
cd pos/apps/electron
npm run dist

# 2. Modify version to 0.2.0
echo "0.2.0" > package.json # Change version field

# 3. Build v0.2.0
npm run dist

# 4. Start local server
npx http-server release/ -p 8080

# 5. Modify app to use local server (in main.ts)
# Before app.whenReady():
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'http://localhost:8080'
});

# 6. Install v0.1.0
# 7. Launch - should detect v0.2.0 from local server
```

---

## 🐛 Troubleshooting

### Update Not Detected

**Symptoms:** App logs "Update not available" even though newer version exists

**Checks:**
1. ✅ Verify `latest-mac.yml` exists in GitHub releases
2. ✅ Verify version in `latest-mac.yml` > version in `package.json`
3. ✅ Check logs for network errors
4. ✅ Verify app is installed (not running from DMG)

**Debug:**
```bash
# Check what electron-updater sees
tail -f ~/Library/Logs/K-Golf\ POS/main.log

# Manually fetch metadata file
curl https://github.com/HanKyungSung/k-golf-release/releases/download/pos-v0.2.0/latest-mac.yml

# Should return:
# version: 0.2.0
# files: ...
```

---

### Download Fails

**Symptoms:** Update available but download fails

**Common causes:**
1. **Network interruption** - Will retry on next check
2. **Corrupted blockmap** - Delete `~/Library/Caches/k-golf-pos-updater/` and retry
3. **Permission issues** - Check write access to cache directory

**Debug:**
```bash
# Clear update cache
rm -rf ~/Library/Caches/k-golf-pos-updater/

# Check disk space
df -h

# Check network
curl -I https://github.com/HanKyungSung/k-golf-release/releases/download/pos-v0.2.0/K-Golf-POS-0.2.0-arm64.dmg
```

---

### Update Downloads but Won't Install

**Symptoms:** "Update downloaded" log but app doesn't update on restart

**Checks:**
1. ✅ Verify `autoInstallOnAppQuit: true` is set
2. ✅ Check app is writable (not in read-only location)
3. ✅ Verify not running as different user

**Debug:**
```bash
# Check app permissions
ls -la /Applications/K-Golf\ POS.app

# Should be owned by current user
# drwxr-xr-x  yourusername  staff  ...
```

---

### Manual Fix: Force Update

**If auto-update stuck, manually update:**

```bash
# 1. Download latest DMG from releases
curl -L -o ~/Downloads/K-Golf-POS.dmg \
  https://github.com/HanKyungSung/k-golf-release/releases/download/pos-v0.2.0/K-Golf-POS-0.2.0-arm64.dmg

# 2. Quit app
killall "K-Golf POS"

# 3. Install new version
open ~/Downloads/K-Golf-POS.dmg
# Drag to Applications, replace old version

# 4. Launch
open /Applications/K-Golf\ POS.app
```

---

## 📊 Complete Update Lifecycle

```
App Launch
  │
  ├─ [10 second delay]
  │
  ├─ autoUpdater.checkForUpdates()
  │     │
  │     ├─ GET https://github.com/.../latest-mac.yml
  │     │
  │     ├─ Parse version: 0.2.0
  │     │
  │     ├─ Compare: 0.2.0 > 0.1.0 ✅
  │     │
  │     └─ Fire: 'update-available'
  │           │
  │           ├─ Log: "Update available: 0.2.0"
  │           │
  │           └─ autoDownload: true
  │                 │
  │                 ├─ GET https://github.com/.../K-Golf-POS.dmg.blockmap
  │                 │
  │                 ├─ Compare blocks with local DMG
  │                 │
  │                 ├─ GET only changed blocks (delta download)
  │                 │
  │                 ├─ Fire: 'download-progress' (multiple times)
  │                 │     └─ Log: "Download progress: 45.67%"
  │                 │
  │                 ├─ Verify SHA512 checksum
  │                 │
  │                 └─ Fire: 'update-downloaded'
  │                       │
  │                       ├─ Log: "Update downloaded: 0.2.0"
  │                       │
  │                       └─ Show notification: "Update ready"
  │
  └─ User quits app
        │
        └─ autoInstallOnAppQuit: true
              │
              ├─ Extract new DMG contents
              │
              ├─ Replace /Applications/K-Golf POS.app/
              │
              └─ Relaunch
                    │
                    └─ Now running v0.2.0 ✅
```

---

## 🎯 Best Practices

### For Development

1. **Always test with two real versions** (don't mock version numbers)
2. **Watch logs during testing** (`tail -f main.log`)
3. **Test both delta and full downloads** (small and large changes)
4. **Test network failure scenarios** (disconnect WiFi)
5. **Clear cache between tests** (`rm -rf ~/Library/Caches/k-golf-pos-updater/`)

### For Production

1. **Always include release notes** in GitHub releases (shown to users)
2. **Test release before announcing** (install previous version, verify auto-update works)
3. **Monitor update adoption** (check how many users are on latest version)
4. **Have rollback plan** (can re-publish previous version as "latest")
5. **Sign apps with certificates** (macOS: Apple Developer, Windows: Code signing cert)

### For Users

1. **Keep app installed in Applications folder** (not Downloads)
2. **Don't run from DMG** (auto-update won't work)
3. **Allow network access** (updates download in background)
4. **Restart app periodically** (updates install on quit)

---

## 🔗 Related Documentation

- **Release Guide**: [pos_release_guide.md](./pos_release_guide.md)
- **Native Module Fix**: [electron_native_module_fix.md](./electron_native_module_fix.md)
- **Project Tasks**: [../TASKS.md](../TASKS.md)

---

## 📚 External Resources

- [electron-updater Documentation](https://www.electron.build/auto-update)
- [electron-builder Publishing](https://www.electron.build/configuration/publish)
- [GitHub Releases as Update Server](https://www.electron.build/configuration/publish#githuboptions)
