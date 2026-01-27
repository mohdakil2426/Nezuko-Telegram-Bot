@echo off
:: ============================================================
:: Nezuko Project Setup Script
:: Run this ONCE to set up the development environment
:: ============================================================

title Nezuko Setup
echo.
echo  ====================================
echo   🦊 Nezuko Project Setup
echo  ====================================
echo.

:: Get the directory where this script is located
cd /d "%~dp0\.."

echo  [1/6] Checking prerequisites...

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo        ❌ Python not found! Install Python 3.13+
    pause
    exit /b 1
)
echo        ✅ Python found

:: Check Bun
bun --version >nul 2>&1
if %errorlevel% neq 0 (
    echo        ❌ Bun not found! Install from https://bun.sh
    pause
    exit /b 1
)
echo        ✅ Bun found

echo.
echo  [2/6] Creating Python virtual environment...
if not exist ".venv" (
    python -m venv .venv
    echo        ✅ Virtual environment created
) else (
    echo        ✅ Virtual environment already exists
)

echo.
echo  [3/6] Installing Python dependencies...
call .venv\Scripts\activate
pip install -r requirements.txt -q
echo        ✅ Python packages installed

echo.
echo  [4/6] Installing Node.js dependencies...
call bun install
echo        ✅ Node packages installed

echo.
echo  [5/6] Creating environment files...

:: Create apps/web/.env.local if it doesn't exist
if not exist "apps\web\.env.local" (
    if exist "apps\web\.env.example" (
        copy "apps\web\.env.example" "apps\web\.env.local" >nul
        echo        ✅ Created apps/web/.env.local
    )
) else (
    echo        ✅ apps/web/.env.local already exists
)

:: Create apps/api/.env if it doesn't exist
if not exist "apps\api\.env" (
    if exist "apps\api\.env.example" (
        copy "apps\api\.env.example" "apps\api\.env" >nul
        echo        ✅ Created apps/api/.env
    )
) else (
    echo        ✅ apps/api/.env already exists
)

:: Create apps/bot/.env if it doesn't exist
if not exist "apps\bot\.env" (
    if exist "apps\bot\.env.example" (
        copy "apps\bot\.env.example" "apps\bot\.env" >nul
        echo        ✅ Created apps/bot/.env
    )
) else (
    echo        ✅ apps/bot/.env already exists
)

echo.
echo  [6/6] Creating storage directories...
if not exist "storage\logs" mkdir "storage\logs"
if not exist "storage\data" mkdir "storage\data"
echo        ✅ Storage directories ready

echo.
echo  ====================================
echo   ✅ Setup Complete!
echo  ====================================
echo.
echo   IMPORTANT: Edit these files with your credentials:
echo.
echo   📝 apps/web/.env.local
echo      - NEXT_PUBLIC_SUPABASE_URL
echo      - NEXT_PUBLIC_SUPABASE_ANON_KEY
echo.
echo   📝 apps/api/.env
echo      - SUPABASE_URL, SUPABASE_ANON_KEY
echo      - Set MOCK_AUTH=true for local dev
echo.
echo   📝 apps/bot/.env
echo      - BOT_TOKEN (from @BotFather)
echo.
echo   Then run: scripts\dev.bat
echo.
pause
