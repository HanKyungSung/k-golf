React DevTools Vendor Directory
--------------------------------

Place the unpacked React Developer Tools extension here to have it auto-loaded in dev mode.

Expected structure:

pos/apps/electron/devtools/react/manifest.json
pos/apps/electron/devtools/react/build/... (etc)

How to obtain:
1. In Chrome: chrome://extensions
2. Enable Developer Mode
3. Locate "React Developer Tools" -> "Details" -> "Version" and click "Show in Finder" (macOS) / "Show in File Explorer" (Win)
4. Copy the entire version folder contents into this directory named "react" (do NOT nest version folder again). The manifest.json should live directly under devtools/react.

Alternative: Set environment variable REACT_DEVTOOLS_PATH to the absolute path of the version folder.

On startup (with ELECTRON_DEV=1) the app will try:
1. REACT_DEVTOOLS_PATH (if set)
2. ./devtools/react (this directory)

Logs will show which paths were tried and whether load succeeded.