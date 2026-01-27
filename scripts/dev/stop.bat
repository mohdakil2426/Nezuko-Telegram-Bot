@echo off
:: ============================================================
:: Nezuko Development Server Stopper
:: Stops all running dev services
:: ============================================================

title Nezuko Stopper
echo.
echo  ====================================
echo   🛑 Stopping Nezuko Services
echo  ====================================
echo.

:: Kill Node.js processes (Web)
echo  [1/3] Stopping Web Dashboard (Node.js)...
taskkill /F /IM node.exe 2>nul
if %errorlevel%==0 (echo        Stopped!) else (echo        Not running)

:: Kill Python processes (API + Bot)
echo  [2/3] Stopping API and Bot (Python)...
taskkill /F /IM python.exe 2>nul
if %errorlevel%==0 (echo        Stopped!) else (echo        Not running)

:: Kill Bun processes
echo  [3/3] Stopping Bun processes...
taskkill /F /IM bun.exe 2>nul
if %errorlevel%==0 (echo        Stopped!) else (echo        Not running)

echo.
echo  ====================================
echo   ✅ All services stopped!
echo  ====================================
echo.
pause
