@echo off
echo ==========================================
echo  Konegolf Score Capture - Setup
echo ==========================================
echo.

REM Try to find Python automatically
where python >nul 2>nul
if %errorlevel%==0 (
    set PYTHON=python
    goto :found
)

REM Common Python install locations
if exist "C:\Python310\python.exe" set PYTHON=C:\Python310\python.exe & goto :found
if exist "C:\Python311\python.exe" set PYTHON=C:\Python311\python.exe & goto :found
if exist "C:\Python312\python.exe" set PYTHON=C:\Python312\python.exe & goto :found
if exist "C:\Python313\python.exe" set PYTHON=C:\Python313\python.exe & goto :found
if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" set PYTHON=%LOCALAPPDATA%\Programs\Python\Python310\python.exe & goto :found
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set PYTHON=%LOCALAPPDATA%\Programs\Python\Python311\python.exe & goto :found
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set PYTHON=%LOCALAPPDATA%\Programs\Python\Python312\python.exe & goto :found
if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" set PYTHON=%LOCALAPPDATA%\Programs\Python\Python313\python.exe & goto :found

echo ERROR: Python not found!
echo Please reinstall Python and check "Add Python to PATH"
echo Or edit this file and set PYTHON= to your python.exe path
pause
exit /b 1

:found
echo Found Python: %PYTHON%
echo.

echo [1/3] Upgrading pip...
%PYTHON% -m pip install --upgrade pip --quiet

echo [2/3] Installing dependencies...
%PYTHON% -m pip install -r requirements.txt --quiet

echo [3/3] Creating captures folder...
if not exist "captures" mkdir captures

echo.
echo ==========================================
echo  Setup complete!
echo  Edit config.json with your bay number
echo  and POS server URL, then run:
echo    %PYTHON% capture.py
echo ==========================================
pause
