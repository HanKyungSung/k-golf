# POS Deployment Guide

**Last Updated:** November 10, 2025  
**Target:** K-Golf POS Electron App (Single-Venue Deployment)

---

## Overview

This guide provides step-by-step instructions for building, packaging, and deploying the K-Golf POS Electron application. This deployment strategy is optimized for single-venue use (no code signing or auto-updates required).

---

## Phase 1: Local Build Setup

### 1.1 Install Electron Builder

```bash
cd pos/apps/electron
npm install --save-dev electron-builder
```

### 1.2 Configure electron-builder in package.json

Add the following configuration to `pos/apps/electron/package.json`:

```json
{
  "build": {
    "appId": "com.kgolf.pos",
    "productName": "K-Golf POS",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "package.json"
    ],
    "mac": {
      "target": "dmg",
      "category": "public.app-category.business",
      "icon": "assets/icon.icns"
    },
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "linux": {
      "target": "AppImage",
      "category": "Office",
      "icon": "assets/icon.png"
    }
  }
}
```

### 1.3 Add Build Scripts

Add these scripts to `pos/apps/electron/package.json`:

```json
{
  "scripts": {
    "pack": "electron-builder --dir",
    "dist": "npm run build && electron-builder",
    "dist:mac": "npm run build && electron-builder --mac",
    "dist:win": "npm run build && electron-builder --win",
    "dist:linux": "npm run build && electron-builder --linux"
  }
}
```

### 1.4 Create App Icons

Create platform-specific icons in `pos/apps/electron/assets/`:

**macOS (.icns):**
- Source: 512x512 PNG
- Convert: `iconutil` or online converter
- Location: `assets/icon.icns`

**Windows (.ico):**
- Source: 256x256 PNG
- Convert: Online ICO converter
- Location: `assets/icon.ico`

**Linux (.png):**
- Source: 512x512 PNG
- Location: `assets/icon.png`

**Quick Icon Creation:**
```bash
mkdir -p pos/apps/electron/assets
# Add your icon files here (for now, you can skip and use default Electron icon)
```

### 1.5 Test Local Build

```bash
cd pos/apps/electron
npm run dist
```

**Expected Output:**
```
pos/apps/electron/release/
├── K-Golf POS-0.1.0.dmg          # macOS (on Mac)
├── K-Golf POS Setup 0.1.0.exe    # Windows (on Windows)
└── K-Golf POS-0.1.0.AppImage     # Linux (on Linux)
```

---

## Phase 2: GitHub Release Automation

### 2.1 Create GitHub Actions Workflow

Create `.github/workflows/pos-release.yml`:

```yaml
name: POS Release Build

on:
  push:
    tags:
      - 'pos-v*'  # Trigger on tags like pos-v0.1.0
  workflow_dispatch:  # Allow manual trigger

jobs:
  build:
    name: Build POS App
    strategy:
      matrix:
        os: [macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: 'pos/apps/electron/package-lock.json'
      
      - name: Install dependencies
        run: |
          cd pos/apps/electron
          npm ci
      
      - name: Build TypeScript
        run: |
          cd pos/apps/electron
          npm run build
      
      - name: Build Electron App
        run: |
          cd pos/apps/electron
          npm run dist
      
      - name: Upload Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: pos-${{ matrix.os }}
          path: pos/apps/electron/release/*
          retention-days: 30

  release:
    name: Create GitHub Release
    needs: build
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/pos-v')
    
    steps:
      - name: Download macOS Artifact
        uses: actions/download-artifact@v4
        with:
          name: pos-macos-latest
          path: release-macos
      
      - name: Download Windows Artifact
        uses: actions/download-artifact@v4
        with:
          name: pos-windows-latest
          path: release-windows
      
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            release-macos/*
            release-windows/*
          draft: false
          prerelease: false
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 2.2 Test Workflow

**Manual trigger:**
1. Go to GitHub Actions tab
2. Select "POS Release Build"
3. Click "Run workflow"
4. Check artifacts in workflow run

**Tag trigger:**
```bash
git tag pos-v0.1.0
git push origin pos-v0.1.0
```

---

## Phase 3: Distribution & Installation

### 3.1 Download from GitHub Releases

**Location:** `https://github.com/HanKyungSung/k-golf/releases`

**Files:**
- `K-Golf POS-0.1.0.dmg` (macOS)
- `K-Golf POS Setup 0.1.0.exe` (Windows)

### 3.2 Installation Instructions

#### macOS Installation

1. Download `K-Golf POS-0.1.0.dmg`
2. Open the DMG file
3. Drag "K-Golf POS" to Applications folder
4. First launch:
   - Right-click app → "Open"
   - Click "Open" on security warning
   - Alternative: System Settings → Privacy & Security → "Open Anyway"

#### Windows Installation

1. Download `K-Golf POS Setup 0.1.0.exe`
2. Run the installer
3. If SmartScreen appears:
   - Click "More info"
   - Click "Run anyway"
4. Follow installation wizard
5. Launch from Start Menu or Desktop shortcut

### 3.3 First-Time Setup

1. **Launch Application**
2. **Configure API URL** (if prompted):
   - Production: `https://k-golf.inviteyou.ca`
   - Local dev: `http://localhost:8080`
3. **Login:**
   - Email: `admin@kgolf.com`
   - Password: (your admin password)
4. **Verify Sync:**
   - Check connection status indicator
   - Create test booking
   - Verify sync completes

---

## Phase 4: Updates & Maintenance

### 4.1 Update Process (Manual)

**When new version is released:**

1. Download latest release from GitHub
2. Close running POS app
3. Install new version (same process as initial install)
4. Launch app - existing data preserved in:
   - macOS: `~/Library/Application Support/K-Golf POS/`
   - Windows: `%APPDATA%/K-Golf POS/`

**SQLite Database Location:**
- `data/pos.sqlite` (preserved across updates)
- Sync queue and local bookings retained

### 4.2 Version Tagging Strategy

**Semantic Versioning:**
```
pos-v0.1.0  → Initial release
pos-v0.1.1  → Bug fixes
pos-v0.2.0  → New features
pos-v1.0.0  → Production ready
```

**Create Release:**
```bash
# Tag the commit
git tag -a pos-v0.2.0 -m "Add room management features"

# Push tag to trigger build
git push origin pos-v0.2.0

# GitHub Actions will build and create release automatically
```

### 4.3 Rollback Procedure

If new version has issues:

1. Download previous version from GitHub Releases
2. Uninstall current version
3. Install previous version
4. Database is compatible (schema migrations are forward/backward compatible)

---

## Troubleshooting

### Build Errors

**Issue:** `better-sqlite3 fails to load`
```bash
cd pos/apps/electron
rm -rf node_modules package-lock.json
npm install
npm run rebuild:native
```

**Issue:** `electron-builder not found`
```bash
npm install --save-dev electron-builder
```

### Installation Issues

**macOS: "App is damaged and can't be opened"**
```bash
# Remove quarantine attribute
xattr -cr /Applications/K-Golf\ POS.app
```

**Windows: SmartScreen blocks installation**
- Click "More info" → "Run anyway"
- This is expected for unsigned apps

### Runtime Issues

**Issue:** Cannot connect to API
- Check `API_BASE_URL` in settings
- Verify backend server is running
- Check network connectivity

**Issue:** Sync not working
- Check authentication (re-login)
- View sync logs in DevTools (Help → Toggle Developer Tools)
- Check outbox table: `sqlite3 data/pos.sqlite "SELECT * FROM SyncQueue;"`

**Issue:** Database corruption
```bash
# Backup first
cp data/pos.sqlite data/pos.sqlite.backup

# Reset database (WARNING: loses unsent changes)
rm data/pos.sqlite
# Restart app - will recreate and sync from server
```

---

## Development vs Production

### Development Build
```bash
cd pos/apps/electron
npm run dev
# Hot reload, DevTools open, verbose logging
```

### Production Build
```bash
cd pos/apps/electron
npm run dist
# Minified, optimized, packaged executable
```

### Environment Variables

**Development (`.env`):**
```bash
API_BASE_URL=http://localhost:8080
LOG_LEVEL=debug
ELECTRON_DEV=1
SYNC_INTERVAL_MS=5000
```

**Production (embedded in build):**
```bash
API_BASE_URL=https://k-golf.inviteyou.ca
LOG_LEVEL=info
SYNC_INTERVAL_MS=5000
```

---

## Security Considerations

### Single-Venue Deployment

**What we skipped:**
- ❌ Code signing ($300-500/year)
- ❌ Auto-update infrastructure
- ❌ Multi-device coordination

**Why it's safe:**
- ✅ Internal use only (controlled devices)
- ✅ Private GitHub repository
- ✅ Manual security exceptions acceptable
- ✅ Direct control over update process

### Data Security

**Local SQLite:**
- Stored in user application data directory
- OS-level file permissions protect data
- No encryption at rest (low-risk PII)

**Network Security:**
- HTTPS for API communication
- API key authentication
- Refresh tokens in OS keychain (keytar)

**Recommendations:**
- Don't share installer publicly
- Don't commit `.env` with production API keys
- Regular backups of SQLite database

---

## Future Enhancements

### If Scaling to Multiple Venues

**Consider adding:**
1. **Code Signing** ($300-500/year)
   - Eliminates security warnings
   - Professional distribution
   - Required for App Store

2. **Auto-Update** (electron-updater)
   - Seamless updates
   - Background downloads
   - Notification on restart

3. **Multi-Device Sync**
   - WebSocket real-time updates
   - Conflict resolution UI
   - Device management dashboard

4. **Remote Monitoring**
   - Centralized logging (Sentry/LogRocket)
   - Health check dashboard
   - Alert system for critical errors

---

## Quick Reference

### Build Commands
```bash
# Development
npm run dev

# Production build (current platform)
npm run dist

# Platform-specific builds
npm run dist:mac
npm run dist:win
npm run dist:linux

# Package without installer (for testing)
npm run pack
```

### Release Commands
```bash
# Create and push tag
git tag pos-v0.2.0
git push origin pos-v0.2.0

# Delete tag (if mistake)
git tag -d pos-v0.2.0
git push origin :refs/tags/pos-v0.2.0
```

### Database Inspection
```bash
# SQLite location
cd ~/Library/Application\ Support/K-Golf\ POS/data  # macOS
cd %APPDATA%/K-Golf POS/data  # Windows

# Check sync queue
sqlite3 pos.sqlite "SELECT COUNT(*) FROM SyncQueue;"

# View recent operations
sqlite3 pos.sqlite "SELECT * FROM SyncQueue ORDER BY createdAt DESC LIMIT 5;"
```

---

## Support

**Documentation:**
- Main README: `/pos/README.md`
- Sync Architecture: `/docs/pos_sync_flow_diagram.md`
- Interval Optimization: `/docs/pos_sync_interval_optimization.md`

**Logs:**
- macOS: `~/Library/Logs/K-Golf POS/log.log`
- Windows: `%USERPROFILE%\AppData\Roaming\K-Golf POS\logs\log.log`

**Common Files:**
- Config: `data/.env` (if exists)
- Database: `data/pos.sqlite`
- Logs: OS-specific location above

---

**End of Deployment Guide**
