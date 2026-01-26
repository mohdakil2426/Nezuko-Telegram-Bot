@echo off
setlocal enabledelayedexpansion

:menu
cls
echo ======================================================
echo           Nezuko Project Management Tool
echo ======================================================
echo.
echo  1. Clean Node Modules (Root ^& Apps)
echo  2. Install Dependencies (Bun)
echo  3. Reinstall Everything (Clean + Install)
echo  4. Exit
echo.
echo ======================================================
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto clean
if "%choice%"=="2" goto install
if "%choice%"=="3" goto reinstall
if "%choice%"=="4" exit
goto menu

:clean
echo.
echo [!] Deleting node_modules...
echo.

if exist "node_modules" (
    echo [^>] Deleting root node_modules...
    rd /s /q "node_modules"
)

for /d %%i in (apps\*) do (
    if exist "%%i\node_modules" (
        echo [^>] Deleting %%i\node_modules...
        rd /s /q "%%i\node_modules"
    )
)

for /d %%i in (packages\*) do (
    if exist "%%i\node_modules" (
        echo [^>] Deleting %%i\node_modules...
        rd /s /q "%%i\node_modules"
    )
)

echo.
echo [^✓] All node_modules deleted successfully.
pause
goto menu

:install
echo.
echo [!] Installing dependencies with Bun...
echo.
bun install
if %ERRORLEVEL% equ 0 (
    echo.
    echo [^✓] Installation complete!
) else (
    echo.
    echo [X] Installation failed. Make sure Bun is installed.
)
pause
goto menu

:reinstall
echo.
echo [!] Starting total reinstall...
echo.

echo [^>] Step 1: Cleaning...
if exist "node_modules" rd /s /q "node_modules"
for /d %%i in (apps\*) do if exist "%%i\node_modules" rd /s /q "%%i\node_modules"
for /d %%i in (packages\*) do if exist "%%i\node_modules" rd /s /q "%%i\node_modules"

echo [^>] Step 2: Installing...
bun install

if %ERRORLEVEL% equ 0 (
    echo.
    echo [^✓] Reinstall complete!
) else (
    echo.
    echo [X] Reinstall failed.
)
pause
goto menu
