@echo off
echo ========================================
echo K-Golf Print Server Uninstaller
echo ========================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo This uninstaller requires administrator privileges.
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo Stopping print server...
taskkill /f /im k-golf-printer.exe >nul 2>&1

echo Removing startup task...
schtasks /delete /tn "K-Golf Printer" /f

if %errorLevel% equ 0 (
    echo [OK] Startup task removed
) else (
    echo [WARN] No startup task found
)

echo.
echo ========================================
echo Uninstallation Complete!
echo ========================================
echo.
echo You can now safely delete this folder.
echo.
pause
