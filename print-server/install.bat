@echo off
echo ========================================
echo K-Golf Print Server Installer
echo ========================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo This installer requires administrator privileges.
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

REM Get current directory
set INSTALL_DIR=%~dp0
cd /d "%INSTALL_DIR%"

echo Installing K-Golf Print Server...
echo Install directory: %INSTALL_DIR%
echo.

REM Create scheduled task to run on startup
echo Creating startup task...
schtasks /create /tn "K-Golf Printer" /tr "%INSTALL_DIR%k-golf-printer.exe" /sc onstart /rl highest /f

if %errorLevel% equ 0 (
    echo [OK] Startup task created
) else (
    echo [ERROR] Failed to create startup task
    pause
    exit /b 1
)

REM Start the service now
echo.
echo Starting print server...
start "" "%INSTALL_DIR%k-golf-printer.exe"

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo The print server will now start automatically when Windows boots.
echo You can close this window.
echo.
pause
