#!/bin/bash

# K-Golf Print Server Uninstaller for macOS

echo "========================================"
echo "K-Golf Print Server Uninstaller (macOS)"
echo "========================================"
echo ""

PLIST_PATH="$HOME/Library/LaunchAgents/com.kgolf.printer.plist"

echo "Stopping print server..."
launchctl unload "$PLIST_PATH" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "[OK] Service stopped"
else
    echo "[WARN] Service not running"
fi

echo "Removing LaunchAgent..."
rm -f "$PLIST_PATH"

if [ $? -eq 0 ]; then
    echo "[OK] LaunchAgent removed"
else
    echo "[WARN] No LaunchAgent found"
fi

echo ""
echo "========================================"
echo "Uninstallation Complete!"
echo "========================================"
echo ""
echo "You can now safely delete this folder."
echo ""
