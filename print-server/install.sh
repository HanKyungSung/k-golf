#!/bin/bash

# K-Golf Print Server Installer for macOS

echo "========================================"
echo "K-Golf Print Server Installer (macOS)"
echo "========================================"
echo ""

# Get current directory
INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$INSTALL_DIR"

echo "Installing K-Golf Print Server..."
echo "Install directory: $INSTALL_DIR"
echo ""

# Make executable
chmod +x "$INSTALL_DIR/k-golf-printer"

# Create LaunchAgent plist for auto-start
PLIST_PATH="$HOME/Library/LaunchAgents/com.kgolf.printer.plist"

echo "Creating LaunchAgent..."
cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.kgolf.printer</string>
    <key>ProgramArguments</key>
    <array>
        <string>$INSTALL_DIR/k-golf-printer</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$INSTALL_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$INSTALL_DIR/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$INSTALL_DIR/stderr.log</string>
</dict>
</plist>
EOF

if [ $? -eq 0 ]; then
    echo "[OK] LaunchAgent created"
else
    echo "[ERROR] Failed to create LaunchAgent"
    exit 1
fi

# Load the LaunchAgent
echo ""
echo "Loading LaunchAgent..."
launchctl load "$PLIST_PATH"

if [ $? -eq 0 ]; then
    echo "[OK] Service started"
else
    echo "[WARN] Failed to start service (may already be running)"
fi

echo ""
echo "========================================"
echo "Installation Complete!"
echo "========================================"
echo ""
echo "The print server will now start automatically when you log in."
echo ""
echo "Status commands:"
echo "  Check status: launchctl list | grep kgolf"
echo "  View logs: tail -f $INSTALL_DIR/print-server.log"
echo "  Stop: launchctl unload $PLIST_PATH"
echo "  Start: launchctl load $PLIST_PATH"
echo ""
