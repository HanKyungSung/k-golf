# Local Build Test - Simulating GitHub Actions VM

Testing the complete build process from scratch to verify the artifact works correctly.

## Step 1: Clean Everything ✅

```bash
cd /Users/hankyungsung/Desktop/project/k-golf

# Remove all node_modules (root and nested)
rm -rf node_modules
rm -rf pos/apps/electron/node_modules
rm -rf pos/packages/*/node_modules
rm -rf backend/node_modules
rm -rf frontend/node_modules

# Remove all dist/build folders
rm -rf pos/apps/electron/dist
rm -rf pos/apps/electron/release

# Remove .env if exists
rm -f pos/apps/electron/.env
```

**Status:** Ready to run

---

## Step 2: Install Dependencies

```bash
cd /Users/hankyungsung/Desktop/project/k-golf
npm install
```

**Status:** Waiting for Step 1

---

## Step 3: Create Production .env

```bash
echo "API_BASE_URL=https://k-golf.inviteyou.ca" > pos/apps/electron/.env
```

**Status:** Waiting for Step 2

---

## Step 4: Rebuild Native Modules for Electron

```bash
cd /Users/hankyungsung/Desktop/project/k-golf
./node_modules/.bin/electron-rebuild
```

**Status:** Waiting for Step 3

---

## Step 5: Build the Electron App

```bash
cd /Users/hankyungsung/Desktop/project/k-golf/pos/apps/electron
npm run build
```

**Status:** Waiting for Step 4

---

## Step 6: Package with electron-builder

```bash
cd /Users/hankyungsung/Desktop/project/k-golf/pos/apps/electron
npx electron-builder --mac --arm64 --publish never
```

**Status:** Waiting for Step 5

---

## Step 7: Test the Packaged App

```bash
cd /Users/hankyungsung/Desktop/project/k-golf/pos/apps/electron
open release/
# Open the .dmg file and test if the renderer displays correctly
```

**Status:** Waiting for Step 6

---

## Expected Results

- ✅ No errors during native module rebuild
- ✅ Build completes successfully
- ✅ DMG file created in `pos/apps/electron/release/`
- ✅ App launches and renderer displays correctly
- ✅ No "NODE_MODULE_VERSION 115" error

---

## Notes

- This simulates the exact process that GitHub Actions runs
- If this works locally, the CI should work the same way
- Pay attention to any warnings about native modules during rebuild
