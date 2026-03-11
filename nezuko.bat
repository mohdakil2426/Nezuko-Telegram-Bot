@echo off
:: ============================================================
:: Nezuko CLI - Windows Entry Point
:: Prefers PowerShell 7 (pwsh) with fallback to PowerShell 5.1
:: ============================================================
:: Usage: nezuko [command]
::   nezuko          - Open interactive menu
::   nezuko dev      - Start all development services
::   nezuko stop     - Stop all services
::   nezuko setup    - First-time project setup
::   nezuko clean    - Clean caches and node_modules
::   nezuko keygen   - Generate AES-256-GCM encryption key
::   nezuko tree     - Print project folder structure
::   nezuko help     - Show this help
:: ============================================================

setlocal EnableDelayedExpansion

:: Store project root
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

:: ── Detect PowerShell: prefer pwsh (PS7) over powershell (5.1) ──
set "PWSH_CMD="

where pwsh >nul 2>&1
if %errorlevel%==0 (
    set "PWSH_CMD=pwsh"
    goto :found_pwsh
)

where powershell >nul 2>&1
if %errorlevel%==0 (
    set "PWSH_CMD=powershell"
    goto :found_pwsh
)

echo.
echo  [ERROR] PowerShell not found!
echo  Install PowerShell 7: https://aka.ms/powershell
echo.
exit /b 1

:found_pwsh

:: ── Route based on command argument ──────────────────────────
if "%~1"==""          goto :menu
if /i "%~1"=="menu"   goto :menu
if /i "%~1"=="dev"    goto :dev
if /i "%~1"=="start"  goto :dev
if /i "%~1"=="stop"   goto :stop
if /i "%~1"=="setup"  goto :setup
if /i "%~1"=="install" goto :setup
if /i "%~1"=="clean"  goto :clean
if /i "%~1"=="keygen" goto :keygen
if /i "%~1"=="tree"   goto :tree
if /i "%~1"=="structure" goto :tree
if /i "%~1"=="help"   goto :help
if /i "%~1"=="-h"     goto :help
if /i "%~1"=="--help" goto :help

echo.
echo  [ERROR] Unknown command: %~1
goto :help

:: ── Command Handlers ─────────────────────────────────────────

:menu
%PWSH_CMD% -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_ROOT%scripts\core\menu.ps1"
goto :eof

:dev
%PWSH_CMD% -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_ROOT%scripts\dev\start.ps1"
goto :eof

:stop
%PWSH_CMD% -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_ROOT%scripts\dev\stop.ps1"
goto :eof

:setup
%PWSH_CMD% -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_ROOT%scripts\setup\install.ps1"
goto :eof

:clean
%PWSH_CMD% -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_ROOT%scripts\utils\clean.ps1"
goto :eof

:keygen
%PWSH_CMD% -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_ROOT%scripts\utils\generate-key.ps1"
goto :eof

:tree
%PWSH_CMD% -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_ROOT%scripts\utils\generate-structure.ps1"
goto :eof

:help
echo.
echo  =====================================
echo   Nezuko CLI - Available Commands
echo  =====================================
echo.
echo  Usage: nezuko [command]
echo.
echo  Commands:
echo    (none)      Open interactive menu
echo    dev         Start all development services (Bot + Web + Redis)
echo    stop        Stop all services
echo    setup       First-time setup (bun install)
echo    clean       Clean caches and node_modules
echo    keygen      Generate 32-byte AES-256-GCM encryption key
echo    tree        Print project folder structure
echo    help        Show this help message
echo.
echo  Examples:
echo    nezuko              Open menu
echo    nezuko dev          Start all servers
echo    nezuko stop         Stop all servers
echo    nezuko setup        Install dependencies
echo    nezuko keygen       Generate encryption key
echo.
echo  PowerShell: %PWSH_CMD%
echo.
goto :eof
