@echo off
:: Set code page to UTF-8 for better emoji/symbol support
chcp 65001 >nul
setlocal DisableDelayedExpansion

:: Cleanup the accidental ']' file if it exists from previous runs
if exist "]" del /f /q "]"

:menu
cls
echo ======================================================
echo           Nezuko Project Management Tool
echo ======================================================
echo.
echo  1. Clean Everything (node_modules, .venv, .next, pycache)
echo  2. Install Everything (Node + Python)
echo  3. Total Reset (Clean all + Reinstall all)
echo.
echo  -- Individual Operations --
echo  4. Node: Clean node_modules ^& Build Artifacts
echo  5. Node: Install (bun install)
echo  6. Python: Clean .venv ^& Pycache
echo  7. Python: Reinstall .venv ^& Deps
echo  8. Exit
echo.
echo ======================================================
set /p choice="Enter your choice (1-8): "

if "%choice%"=="1" goto clean_all
if "%choice%"=="2" goto install_all
if "%choice%"=="3" goto total_reset
if "%choice%"=="4" goto clean_node
if "%choice%"=="5" goto install_node
if "%choice%"=="6" goto clean_python
if "%choice%"=="7" goto install_python
if "%choice%"=="8" exit
goto menu

:clean_all
echo.
echo [^!] Cleaning all artifacts...
call :clean_node_logic
call :clean_python_logic
echo.
echo [^✓] Global cleanup finished.
pause
goto menu

:install_all
echo.
echo [^!] Installing all dependencies...
call :check_requirements
call :install_node_logic
call :install_python_logic
echo.
echo [^✓] All installations complete.
pause
goto menu

:total_reset
echo.
echo [^!] PERFORMING TOTAL RESET...
call :check_requirements
call :clean_node_logic
call :clean_python_logic
call :install_node_logic
call :install_python_logic
echo.
echo [^✓] TOTAL RESET COMPLETE!
pause
goto menu

:clean_node
echo.
call :clean_node_logic
pause
goto menu

:install_node
echo.
call :check_bun
call :install_node_logic
pause
goto menu

:clean_python
echo.
call :clean_python_logic
pause
goto menu

:install_python
echo.
call :check_python
call :install_python_logic
pause
goto menu

:: --- Utility Sections ---

:check_requirements
call :check_bun
call :check_python
exit /b

:check_bun
where bun >nul 2>nul
if %ERRORLEVEL% neq 0 echo [^!] WARNING: Bun not found in PATH.
exit /b

:check_python
where python >nul 2>nul
if %ERRORLEVEL% neq 0 echo [^!] WARNING: Python not found in PATH.
exit /b

:: --- Logic Sections ---

:clean_node_logic
echo [^>] Cleaning Node.js ^& Web artifacts...
set "found_node=0"

:: 1. Root node_modules
if exist "node_modules" (
    set "found_node=1"
    echo     [-] Deleting root/node_modules...
    rd /s /q "node_modules" 2>nul
)

:: 2. App node_modules and .next/dist
if exist "apps" (
    for /d %%i in (apps\*) do (
        if exist "%%i\node_modules" (
            set "found_node=1"
            echo     [-] Deleting %%i\node_modules...
            rd /s /q "%%i\node_modules" 2>nul
        )
        if exist "%%i\.next" (
            set "found_node=1"
            echo     [-] Deleting %%i\.next ^(Next.js Build^)...
            rd /s /q "%%i\.next" 2>nul
        )
        if exist "%%i\dist" (
            set "found_node=1"
            echo     [-] Deleting %%i\dist...
            rd /s /q "%%i\dist" 2>nul
        )
        if exist "%%i\out" (
            set "found_node=1"
            echo     [-] Deleting %%i\out...
            rd /s /q "%%i\out" 2>nul
        )
    )
)

:: 3. Package node_modules
if exist "packages" (
    for /d %%i in (packages\*) do (
        if exist "%%i\node_modules" (
            set "found_node=1"
            echo     [-] Deleting %%i\node_modules...
            rd /s /q "%%i\node_modules" 2>nul
        )
    )
)

if "%found_node%"=="0" (
    echo     [i] No Node.js artifacts found. Already clean.
) else (
    echo [^✓] Node.js cleaning complete.
)
exit /b

:clean_python_logic
echo [^>] Cleaning Python artifacts...
set "found_py=0"

if exist ".venv" (
    set "found_py=1"
    echo     [-] Deleting virtual environment ^(.venv^)...
    rd /s /q ".venv" 2>nul
)

echo [^>] Searching for pycache...
set /a pycount=0

:: Use a temporary file to avoid complex piping issues in loops
setlocal EnabledDelayedExpansion
for /f "delims=" %%a in ('dir /s /b /ad __pycache__ 2^>nul') do (
    if exist "%%a" (
        set "found_py=1"
        echo     [-] Removing "%%a"
        rd /s /q "%%a" 2>nul
        set /a pycount+=1
    )
)
if "!found_py!"=="0" (
    echo     [i] No Python artifacts found. Already clean.
) else (
    if !pycount! gtr 0 (
        echo [^✓] Python cleaning complete ^(!pycount! cache folders removed^).
    ) else (
        echo [^✓] Python cleaning complete.
    )
)
endlocal
exit /b

:install_node_logic
echo [^>] Installing Node dependencies ^(Bun^)...
call bun install
if %ERRORLEVEL% equ 0 (
    echo [^✓] Node installation success.
) else (
    echo [X] Node installation FAILED.
)
exit /b

:install_python_logic
echo [^>] Creating virtual environment...
python -m venv .venv
if %ERRORLEVEL% neq 0 (
    echo [X] Failed to create .venv.
    exit /b
)
echo [^>] Upgrading pip...
".venv\Scripts\python.exe" -m pip install --upgrade pip
echo [^>] Installing dependencies...
".venv\Scripts\python.exe" -m pip install -r requirements.txt -r apps\api\requirements.txt
if %ERRORLEVEL% equ 0 (
    echo [^✓] Python installation success.
) else (
    echo [X] Python installation FAILED.
)
exit /b
