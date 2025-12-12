#!/bin/bash

# Build script for print server
# Creates executables for Windows and macOS

echo "Building K-Golf Print Server..."
echo ""

# Detect platform
PLATFORM=$(uname -s)
echo "Detected platform: $PLATFORM"
echo ""

# Clean previous builds
rm -rf dist/ release/

# Build TypeScript
echo "Compiling TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "TypeScript compilation failed!"
    exit 1
fi

# Build executables
echo ""
echo "Building executables..."
echo ""

if [ "$1" == "macos" ]; then
    echo "Building macOS executable only..."
    npm run build:macos
elif [ "$1" == "windows" ]; then
    echo "Building Windows executable only..."
    npm run build:exe
else
    echo "Building for both Windows and macOS..."
    npm run build:all
fi

if [ $? -ne 0 ]; then
    echo "Executable build failed!"
    exit 1
fi

# Copy config and scripts to release folder
echo ""
echo "Copying deployment files..."
mkdir -p release/windows release/macos

# Windows package
if [ -f "release/k-golf-printer.exe" ]; then
    cp config.json release/windows/
    cp install.bat release/windows/
    cp uninstall.bat release/windows/
    cp README.md release/windows/
    mv release/k-golf-printer.exe release/windows/
fi

# macOS package
if [ -f "release/k-golf-printer" ]; then
    cp config.json release/macos/
    cp install.sh release/macos/
    cp uninstall.sh release/macos/
    cp README.md release/macos/
    chmod +x release/macos/install.sh
    chmod +x release/macos/uninstall.sh
    mv release/k-golf-printer release/macos/
    chmod +x release/macos/k-golf-printer
fi

# Create release packages
echo "Creating release packages..."
cd release

if [ -d "windows" ]; then
    cd windows
    zip -r ../k-golf-print-server-windows.zip * -x "*.DS_Store"
    cd ..
    echo "  ✅ Windows package created"
fi

if [ -d "macos" ]; then
    cd macos
    zip -r ../k-golf-print-server-macos.zip * -x "*.DS_Store"
    cd ..
    echo "  ✅ macOS package created"
fi

cd ..

echo ""
echo "✅ Build complete!"
echo ""
echo "Output:"
if [ -d "release/windows" ]; then
    echo "  Windows:"
    echo "    - Executable: release/windows/k-golf-printer.exe"
    echo "    - Package: release/k-golf-print-server-windows.zip"
fi
if [ -d "release/macos" ]; then
    echo "  macOS:"
    echo "    - Executable: release/macos/k-golf-printer"
    echo "    - Package: release/k-golf-print-server-macos.zip"
fi
echo ""
echo "Testing locally:"
if [ "$PLATFORM" == "Darwin" ] && [ -d "release/macos" ]; then
    echo "  cd release/macos && ./k-golf-printer"
elif [ -d "release/windows" ]; then
    echo "  cd release/windows && wine k-golf-printer.exe"
fi
echo ""
