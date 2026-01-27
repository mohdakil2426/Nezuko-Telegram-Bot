@echo off
:: ============================================================
:: Nezuko Project Management Tool
:: A comprehensive tool for managing the Nezuko monorepo
:: ============================================================

:: Set code page to UTF-8 for better emoji/symbol support
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

:: Store project root
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

:: Cleanup accidental file from previous runs
if exist "]" del /f /q "]" 2>nul

:menu
cls
echo.
echo  ╔════════════════════════════════════════════════════════╗
echo  ║        🦊 Nezuko Project Management Tool               ║
echo  ╠════════════════════════════════════════════════════════╣
echo  ║                                                        ║
echo  ║  🚀 DEVELOPMENT                                        ║
echo  ║     1. Start All Services (3 terminals)                ║
echo  ║     2. Stop All Services                               ║
echo  ║                                                        ║
echo  ║  📦 INSTALLATION                                       ║
echo  ║     3. Install Everything (Node + Python)              ║
echo  ║     4. Install Node Only (bun install)                 ║
echo  ║     5. Install Python Only (.venv + deps)              ║
echo  ║                                                        ║
echo  ║  🧹 CLEANUP                                            ║
echo  ║     6. Clean Everything (node_modules, .venv, cache)   ║
echo  ║     7. Clean Node Only (node_modules, .next, dist)     ║
echo  ║     8. Clean Python Only (.venv, __pycache__)          ║
echo  ║                                                        ║
echo  ║  🔄 RESET                                              ║
echo  ║     9. Total Reset (Clean All + Reinstall All)         ║
echo  ║                                                        ║
echo  ║     0. Exit                                            ║
echo  ║                                                        ║
echo  ╚════════════════════════════════════════════════════════╝
echo.
set /p choice="  Enter your choice (0-9): "

if "%choice%"=="1" goto start_dev
if "%choice%"=="2" goto stop_dev
if "%choice%"=="3" goto install_all
if "%choice%"=="4" goto install_node
if "%choice%"=="5" goto install_python
if "%choice%"=="6" goto clean_all
if "%choice%"=="7" goto clean_node
if "%choice%"=="8" goto clean_python
if "%choice%"=="9" goto total_reset
if "%choice%"=="0" goto exit_app
goto menu

:: ============================================================
:: DEVELOPMENT COMMANDS
:: ============================================================

:start_dev
echo.
echo  [^>] Starting all development services...
echo.
if exist "scripts\dev\start.bat" (
    call "scripts\dev\start.bat"
) else (
    echo  [X] Error: scripts\dev\start.bat not found!
    echo      Please ensure the scripts folder is properly set up.
)
pause
goto menu

:stop_dev
echo.
echo  [^>] Stopping all development services...
echo.
if exist "scripts\dev\stop.bat" (
    call "scripts\dev\stop.bat"
) else (
    echo  [^>] Stopping processes manually...
    taskkill /F /IM node.exe 2>nul && echo      Stopped Node.js
    taskkill /F /IM bun.exe 2>nul && echo      Stopped Bun
    taskkill /F /IM python.exe 2>nul && echo      Stopped Python
    echo  [OK] All processes stopped.
)
pause
goto menu

:: ============================================================
:: INSTALLATION COMMANDS
:: ============================================================

:install_all
echo.
echo  ╔════════════════════════════════════════════════════════╗
echo  ║  Installing All Dependencies                           ║
echo  ╚════════════════════════════════════════════════════════╝
echo.
call :check_requirements
if !ERRORLEVEL! neq 0 (
    pause
    goto menu
)
call :install_node_logic
call :install_python_logic
echo.
echo  [OK] All installations complete!
pause
goto menu

:install_node
echo.
echo  ╔════════════════════════════════════════════════════════╗
echo  ║  Installing Node.js Dependencies                       ║
echo  ╚════════════════════════════════════════════════════════╝
echo.
call :check_bun
if !ERRORLEVEL! neq 0 (
    pause
    goto menu
)
call :install_node_logic
echo.
pause
goto menu

:install_python
echo.
echo  ╔════════════════════════════════════════════════════════╗
echo  ║  Installing Python Dependencies                        ║
echo  ╚════════════════════════════════════════════════════════╝
echo.
call :check_python
if !ERRORLEVEL! neq 0 (
    pause
    goto menu
)
call :install_python_logic
echo.
pause
goto menu

:: ============================================================
:: CLEANUP COMMANDS
:: ============================================================

:clean_all
echo.
echo  ╔════════════════════════════════════════════════════════╗
echo  ║  Cleaning All Artifacts                                ║
echo  ╚════════════════════════════════════════════════════════╝
echo.
call :clean_node_logic
call :clean_python_logic
call :clean_storage_logic
echo.
echo  [OK] Global cleanup finished!
pause
goto menu

:clean_node
echo.
echo  ╔════════════════════════════════════════════════════════╗
echo  ║  Cleaning Node.js Artifacts                            ║
echo  ╚════════════════════════════════════════════════════════╝
echo.
call :clean_node_logic
echo.
pause
goto menu

:clean_python
echo.
echo  ╔════════════════════════════════════════════════════════╗
echo  ║  Cleaning Python Artifacts                             ║
echo  ╚════════════════════════════════════════════════════════╝
echo.
call :clean_python_logic
echo.
pause
goto menu

:: ============================================================
:: RESET COMMAND
:: ============================================================

:total_reset
echo.
echo  ╔════════════════════════════════════════════════════════╗
echo  ║  TOTAL RESET - Clean and Reinstall Everything          ║
echo  ╚════════════════════════════════════════════════════════╝
echo.
echo  [!] This will delete ALL artifacts and reinstall.
set /p confirm="  Are you sure? (y/N): "
if /i not "%confirm%"=="y" (
    echo  [i] Reset cancelled.
    pause
    goto menu
)
echo.
call :check_requirements
if !ERRORLEVEL! neq 0 (
    pause
    goto menu
)
call :clean_node_logic
call :clean_python_logic
call :clean_storage_logic
call :install_node_logic
call :install_python_logic
echo.
echo  [OK] TOTAL RESET COMPLETE!
pause
goto menu

:exit_app
echo.
echo  Goodbye!
timeout /t 1 >nul
exit /b 0

:: ============================================================
:: UTILITY FUNCTIONS
:: ============================================================

:check_requirements
call :check_bun
set bun_result=!ERRORLEVEL!
call :check_python
set py_result=!ERRORLEVEL!
if !bun_result! neq 0 exit /b 1
if !py_result! neq 0 exit /b 1
exit /b 0

:check_bun
where bun >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo  [X] ERROR: Bun not found in PATH!
    echo      Install from: https://bun.sh
    exit /b 1
)
echo  [OK] Bun found: && bun --version
exit /b 0

:check_python
where python >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo  [X] ERROR: Python not found in PATH!
    echo      Install Python 3.13+ from: https://python.org
    exit /b 1
)
echo  [OK] Python found: && python --version
exit /b 0

:: ============================================================
:: LOGIC FUNCTIONS
:: ============================================================

:clean_node_logic
echo  [^>] Cleaning Node.js artifacts...
set "found=0"

:: Root node_modules
if exist "node_modules" (
    set "found=1"
    echo      [-] Deleting root/node_modules...
    rd /s /q "node_modules" 2>nul
)

:: Bun lockfile binary cache
if exist "bun.lockb" (
    echo      [-] Keeping bun.lockb (lockfile)
)

:: Apps folder
if exist "apps" (
    for /d %%i in (apps\*) do (
        if exist "%%i\node_modules" (
            set "found=1"
            echo      [-] Deleting %%i\node_modules...
            rd /s /q "%%i\node_modules" 2>nul
        )
        if exist "%%i\.next" (
            set "found=1"
            echo      [-] Deleting %%i\.next...
            rd /s /q "%%i\.next" 2>nul
        )
        if exist "%%i\dist" (
            set "found=1"
            echo      [-] Deleting %%i\dist...
            rd /s /q "%%i\dist" 2>nul
        )
        if exist "%%i\out" (
            set "found=1"
            echo      [-] Deleting %%i\out...
            rd /s /q "%%i\out" 2>nul
        )
    )
)

:: Packages folder
if exist "packages" (
    for /d %%i in (packages\*) do (
        if exist "%%i\node_modules" (
            set "found=1"
            echo      [-] Deleting %%i\node_modules...
            rd /s /q "%%i\node_modules" 2>nul
        )
        if exist "%%i\dist" (
            set "found=1"
            echo      [-] Deleting %%i\dist...
            rd /s /q "%%i\dist" 2>nul
        )
    )
)

:: Turbo cache
if exist ".turbo" (
    set "found=1"
    echo      [-] Deleting .turbo cache...
    rd /s /q ".turbo" 2>nul
)

if "!found!"=="0" (
    echo      [i] No Node.js artifacts found. Already clean.
) else (
    echo  [OK] Node.js cleaning complete.
)
exit /b 0

:clean_python_logic
echo  [^>] Cleaning Python artifacts...
set "found=0"
set "pycount=0"

:: Virtual environment
if exist ".venv" (
    set "found=1"
    echo      [-] Deleting .venv...
    rd /s /q ".venv" 2>nul
)

:: Use PowerShell to reliably find and remove __pycache__ directories
echo      [^>] Searching for __pycache__...
for /f "delims=" %%n in ('powershell -NoProfile -Command "(Get-ChildItem -Recurse -Directory -Filter '__pycache__' -ErrorAction SilentlyContinue).Count"') do set "pycount=%%n"

if %pycount% gtr 0 (
    set "found=1"
    echo      [-] Removing %pycount% __pycache__ folders...
    powershell -NoProfile -Command "Get-ChildItem -Recurse -Directory -Filter '__pycache__' -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue"
)

:: Remove .pyc and .pyo files using PowerShell
powershell -NoProfile -Command "Get-ChildItem -Recurse -Include '*.pyc','*.pyo' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue"

if "%found%"=="0" (
    if %pycount% equ 0 (
        echo      [i] No Python artifacts found. Already clean.
    )
) else (
    if %pycount% gtr 0 (
        echo  [OK] Python cleaning complete ^(%pycount% cache folders removed^).
    ) else (
        echo  [OK] Python cleaning complete.
    )
)
exit /b 0

:clean_storage_logic
echo  [^>] Cleaning storage artifacts...

:: Clean logs (but keep directory)
if exist "storage\logs\*" (
    echo      [-] Clearing storage\logs...
    del /q "storage\logs\*" 2>nul
)

:: Note: Don't delete storage/data as it may contain the SQLite database
echo      [i] Keeping storage\data (contains database)
exit /b 0

:install_node_logic
echo  [^>] Installing Node.js dependencies with Bun...
call bun install
if !ERRORLEVEL! equ 0 (
    echo  [OK] Node.js installation successful.
) else (
    echo  [X] Node.js installation FAILED.
)
exit /b 0

:install_python_logic
echo  [^>] Creating Python virtual environment...
python -m venv .venv
if !ERRORLEVEL! neq 0 (
    echo  [X] Failed to create .venv.
    exit /b 1
)

echo  [^>] Activating virtual environment...
call ".venv\Scripts\activate.bat"

echo  [^>] Upgrading pip...
python -m pip install --upgrade pip -q

echo  [^>] Installing dependencies...
if exist "requirements.txt" (
    python -m pip install -r requirements.txt -q
)
if exist "apps\api\requirements.txt" (
    python -m pip install -r apps\api\requirements.txt -q
)
if exist "apps\bot\requirements.txt" (
    python -m pip install -r apps\bot\requirements.txt -q
)

if !ERRORLEVEL! equ 0 (
    echo  [OK] Python installation successful.
) else (
    echo  [X] Python installation FAILED.
)
exit /b 0
