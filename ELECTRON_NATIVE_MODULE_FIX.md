# Electron Native Module Build Fix

## Problem Summary

The Electron POS app was failing to launch with a blank renderer window when built via GitHub Actions CI, despite working perfectly in local development. The root cause was a **Node.js ABI version mismatch** for native modules.

### Error Message
```
Error: The module '.../better_sqlite3.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 131. This version of Node.js requires
NODE_MODULE_VERSION 133.
```

### Root Cause Analysis

1. **Electron 35.7.5 uses Node.js MODULE_VERSION 133**
2. **System Node.js v23 uses MODULE_VERSION 131**
3. **better-sqlite3 v11** uses `prebuild-install` which:
   - Downloads prebuilt binaries optimized for the system's Node.js version
   - Does NOT automatically rebuild for Electron's embedded Node.js
4. **electron-rebuild was failing silently** because:
   - It detected existing prebuilt binaries and skipped rebuilding
   - In npm workspaces, dependencies are hoisted to root, causing path confusion
5. **electron-builder's automatic rebuild** was also ineffective because:
   - It ran after we manually rebuilt, overwriting our correct builds
   - It used the wrong Node.js version in its temp directory

## Solution

### 1. Use `node-gyp` Directly with Electron Headers

Instead of relying on `electron-rebuild` or `@electron/rebuild`, we use `node-gyp` directly to force compilation against Electron's Node.js version:

```bash
cd node_modules/better-sqlite3
npx node-gyp rebuild \
  --target=35.7.5 \
  --arch=arm64 \
  --dist-url=https://electronjs.org/headers

cd ../keytar
npx node-gyp rebuild \
  --target=35.7.5 \
  --arch=arm64 \
  --dist-url=https://electronjs.org/headers
```

**Parameters:**
- `--target=35.7.5`: Electron version (determines Node.js MODULE_VERSION 133)
- `--arch=arm64`: Target architecture (arm64 for Apple Silicon, x64 for Intel/Windows)
- `--dist-url`: Location of Electron's Node.js headers

### 2. Disable electron-builder's Automatic Rebuild

In `pos/apps/electron/package.json`:

```json
{
  "build": {
    "npmRebuild": false,
    "nodeGypRebuild": false,
    "buildDependenciesFromSource": false
  }
}
```

This prevents electron-builder from overwriting our correctly rebuilt native modules.

### 3. Update Build Script

In `pos/apps/electron/package.json`:

```json
{
  "scripts": {
    "rebuild": "cd /Users/hankyungsung/Desktop/project/k-golf/node_modules/better-sqlite3 && node-gyp rebuild --target=35.7.5 --arch=arm64 --dist-url=https://electronjs.org/headers && cd ../keytar && node-gyp rebuild --target=35.7.5 --arch=arm64 --dist-url=https://electronjs.org/headers",
    "dist:mac": "npm run build && npm run rebuild && electron-builder --mac"
  }
}
```

### 4. GitHub Actions CI Workflow

Updated `.github/workflows/pos-release.yml`:

```yaml
- name: Rebuild native modules for Electron
  shell: bash
  run: |
    echo "Rebuilding native modules for Electron 35.7.5 and arch ${{ matrix.arch }}"
    cd node_modules/better-sqlite3 && npx node-gyp rebuild --target=35.7.5 --arch=${{ matrix.arch }} --dist-url=https://electronjs.org/headers
    cd ../keytar && npx node-gyp rebuild --target=35.7.5 --arch=${{ matrix.arch }} --dist-url=https://electronjs.org/headers
```

**Note:** Use `npx node-gyp` in CI since node-gyp isn't globally installed.

### 5. Bundle Format

Reverted from IIFE to **ESM format** for the renderer bundle:

```json
{
  "scripts": {
    "bundle:renderer:prod": "esbuild src/renderer/index.tsx --bundle --format=esm --platform=browser --minify --outfile=dist/renderer/index.js"
  }
}
```

And in `src/renderer/index.html`:

```html
<script type="module" src="./index.js"></script>
```

ESM format works correctly with Electron's `file://` protocol.

### 6. Console Logging Fix

Replaced all `console.log/warn/error` with `electron-log` in core files to prevent EPIPE errors in packaged apps:

```typescript
import log from 'electron-log';

// Instead of: console.log('[SYNC] ...')
log.info('[SYNC] ...');

// Instead of: console.warn('[SYNC] ...')
log.warn('[SYNC] ...');

// Instead of: console.error('[SYNC] ...')
log.error('[SYNC] ...');
```

**Files updated:**
- `pos/apps/electron/src/core/db.ts`
- `pos/apps/electron/src/core/sync.ts`
- `pos/apps/electron/src/core/sync-queue.ts`

## Build Process

### Local Build (macOS)

```bash
cd /path/to/k-golf

# 1. Clean everything
rm -rf node_modules pos/apps/electron/dist pos/apps/electron/release

# 2. Install dependencies
npm install

# 3. Create production .env
echo "API_BASE_URL=https://k-golf.inviteyou.ca" > pos/apps/electron/.env

# 4. Build and package (includes native module rebuild)
cd pos/apps/electron
npm run dist:mac -- --arm64 --publish never
```

### CI Build

GitHub Actions automatically:
1. Installs dependencies (hoisted to root node_modules)
2. Rebuilds native modules with correct Electron version
3. Builds TypeScript and bundles renderer
4. Packages with electron-builder
5. Creates DMG (macOS) or NSIS installer (Windows)

## Verification

### Check Native Module Version

```bash
# Should show current timestamp if rebuilt correctly
ls -lh node_modules/better-sqlite3/build/Release/better_sqlite3.node

# Test if module loads for system Node.js
node -e "require('./node_modules/better-sqlite3'); console.log('OK for Node', process.versions.modules)"

# In packaged app, check for errors
./release/mac-arm64/K-Golf\ POS.app/Contents/MacOS/K-Golf\ POS 2>&1 | grep MODULE_VERSION
```

If no MODULE_VERSION errors appear, the native modules are built correctly!

## Key Learnings

1. **better-sqlite3 v11 uses prebuild-install** - automatically downloads prebuilt binaries for system Node.js, not Electron
2. **electron-rebuild doesn't force rebuild** when prebuilts exist - must delete build directory or use node-gyp directly
3. **npm workspaces hoist dependencies to root** - rebuild tools must run from workspace root
4. **electron-builder's npmRebuild can overwrite** - disable it when manually rebuilding
5. **Console output in packaged Electron apps** causes EPIPE errors - use electron-log instead
6. **ESM format works with Electron** - no need for IIFE when using proper `type="module"`

## Related Files

- `pos/apps/electron/package.json` - Build configuration and scripts
- `.github/workflows/pos-release.yml` - CI/CD workflow
- `pos/apps/electron/src/core/*.ts` - Core files using electron-log
- `pos/apps/electron/src/renderer/index.html` - Renderer entry point

## References

- [Electron Native Module Documentation](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules)
- [node-gyp Documentation](https://github.com/nodejs/node-gyp)
- [better-sqlite3 Installation](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/compilation.md)
- [Electron Node.js Version Compatibility](https://github.com/electron/electron/blob/main/docs/tutorial/electron-timelines.md)

## Status

✅ **RESOLVED** - App now builds successfully in both local and CI environments, with renderer displaying correctly and no MODULE_VERSION errors.
