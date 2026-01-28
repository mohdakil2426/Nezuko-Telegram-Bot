@echo off
:: ============================================================
:: Nezuko CLI - Windows Entry Point
:: Launches the interactive PowerShell menu
:: ============================================================
:: Usage: nezuko.bat [command]
::   nezuko.bat          - Opens interactive menu
::   nezuko.bat dev      - Start development servers
::   nezuko.bat stop     - Stop all services
::   nezuko.bat setup    - First-time setup
::   nezuko.bat test     - Run tests
::   nezuko.bat help     - Show commands
:: ============================================================

setlocal EnableDelayedExpansion

:: Get script directory
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: Check if PowerShell is available
where pwsh >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "PS_CMD=pwsh"
) else (
    where powershell >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set "PS_CMD=powershell"
    ) else (
        echo [ERROR] PowerShell not found! Please install PowerShell.
        exit /b 1
    )
)

:: Route to appropriate script based on argument
if "%1"=="" (
    :: No argument - launch interactive menu
    %PS_CMD% -ExecutionPolicy Bypass -NoProfile -File "%SCRIPT_DIR%scripts\core\menu.ps1"
) else if /i "%1"=="dev" (
    %PS_CMD% -ExecutionPolicy Bypass -NoProfile -File "%SCRIPT_DIR%scripts\dev\start.ps1"
) else if /i "%1"=="start" (
    %PS_CMD% -ExecutionPolicy Bypass -NoProfile -File "%SCRIPT_DIR%scripts\dev\start.ps1"
) else if /i "%1"=="stop" (
    %PS_CMD% -ExecutionPolicy Bypass -NoProfile -File "%SCRIPT_DIR%scripts\dev\stop.ps1"
) else if /i "%1"=="setup" (
    %PS_CMD% -ExecutionPolicy Bypass -NoProfile -File "%SCRIPT_DIR%scripts\setup\install.ps1"
) else if /i "%1"=="install" (
    %PS_CMD% -ExecutionPolicy Bypass -NoProfile -File "%SCRIPT_DIR%scripts\setup\install.ps1"
) else if /i "%1"=="test" (
    %PS_CMD% -ExecutionPolicy Bypass -NoProfile -File "%SCRIPT_DIR%scripts\test\run.ps1"
) else if /i "%1"=="clean" (
    %PS_CMD% -ExecutionPolicy Bypass -NoProfile -File "%SCRIPT_DIR%scripts\utils\clean.ps1"
) else if /i "%1"=="help" (
    goto :show_help
) else if /i "%1"=="-h" (
    goto :show_help
) else if /i "%1"=="--help" (
    goto :show_help
) else (
    echo [ERROR] Unknown command: %1
    goto :show_help
)

exit /b %ERRORLEVEL%

:show_help
echo.
echo  ====================================
echo   Nezuko CLI - Available Commands
echo  ====================================
echo.
echo  Usage: nezuko [command]
echo.
echo  Commands:
echo    (none)    Open interactive menu
echo    dev       Start development servers
echo    stop      Stop all services
echo    setup     First-time project setup
echo    test      Run test suite
echo    clean     Clean build artifacts
echo    help      Show this help message
echo.
echo  Examples:
echo    nezuko            # Open menu
echo    nezuko dev        # Start all servers
echo    nezuko setup      # Install dependencies
echo.
exit /b 0
