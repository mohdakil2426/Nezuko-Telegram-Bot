@echo off
:: ============================================================
:: Nezuko Development Server Launcher
:: Opens 3 separate terminals for Web, API, and Bot
:: ============================================================

title Nezuko Launcher
echo.
echo  ====================================
echo   🦊 Nezuko Development Launcher
echo  ====================================
echo.

:: Get the directory where this script is located
cd /d "%~dp0"

echo  Starting services in separate terminals...
echo.

:: Start Web Dashboard (Next.js)
echo  [1/3] Starting Web Dashboard...
start "Nezuko - Web" cmd /k "cd apps\web && bun dev"

:: Wait 2 seconds for web to initialize
timeout /t 2 /nobreak > nul

:: Start API Server (FastAPI)
echo  [2/3] Starting API Server...
start "Nezuko - API" cmd /k "cd apps\api && ..\..\.venv\Scripts\activate && uvicorn src.main:app --reload --port 8080"

:: Wait 2 seconds
timeout /t 2 /nobreak > nul

:: Start Telegram Bot
echo  [3/3] Starting Telegram Bot...
start "Nezuko - Bot" cmd /k ".venv\Scripts\activate && python -m apps.bot.main"

echo.
echo  ====================================
echo   ✅ All services started!
echo  ====================================
echo.
echo   Web:  http://localhost:3000
echo   API:  http://localhost:8080
echo   Bot:  Running in polling mode
echo.
echo   Close this window when done.
echo   Press Ctrl+C in each terminal to stop services.
echo.
pause
