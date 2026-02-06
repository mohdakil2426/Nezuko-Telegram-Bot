#Requires -Version 5.1

<#
.SYNOPSIS
    Nezuko Development Server Launcher (PowerShell)
.DESCRIPTION
    Opens 3 separate PowerShell 7 terminals for Web, API, and Bot services.
    Prefers pwsh (PowerShell 7) with fallback to powershell (5.1).
.EXAMPLE
    .\start.ps1
    Launches all development services in separate terminals.
#>

[CmdletBinding()]
param(
    [ValidateSet("all", "web", "api", "bot")]
    [string]$Service = "all"
)

# Import utilities for logging
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$ScriptRoot\..\core\utils.ps1"

# Initialize logging
Initialize-LogSystem
Write-LogSection -Title "DEV SERVICES START"

# ============================================================
# Detect PowerShell: Prefer pwsh (PS7) over powershell (PS5.1)
# ============================================================

$PwshPath = $null

# Check for PowerShell 7 (pwsh)
$pwsh7 = Get-Command pwsh -ErrorAction SilentlyContinue
if ($pwsh7) {
    $PwshPath = $pwsh7.Source
}
else {
    # Fallback to PowerShell 5.1
    $ps5 = Get-Command powershell -ErrorAction SilentlyContinue
    if ($ps5) {
        $PwshPath = $ps5.Source
    }
}

if (-not $PwshPath) {
    Write-Host ""
    Write-Host "  [ERROR] PowerShell not found!" -ForegroundColor Red
    Write-Host "  Please install PowerShell 7 from: https://aka.ms/powershell" -ForegroundColor Yellow
    Write-Host ""
    Write-Log -Message "PowerShell not found!" -Level "ERROR" -Category "DEV"
    exit 1
}

$ProjectRoot = Get-ProjectRoot

Write-Log -Message "Project Root: $ProjectRoot" -Category "DEV"
Write-Log -Message "PowerShell: $PwshPath" -Category "DEV"

# ============================================================
# Setup
# ============================================================

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   🦊 Nezuko Development Launcher" -ForegroundColor Yellow
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "  Project: $ProjectRoot" -ForegroundColor Gray
Write-Host "  PowerShell: $PwshPath" -ForegroundColor Gray
Write-Host "  Service(s): $Service" -ForegroundColor Gray
Write-Host ""
Write-Host "  Starting services in separate terminals..." -ForegroundColor White
Write-Host ""

# ============================================================
# Start Services in Separate Terminals
# ============================================================

# Start Web Dashboard (Next.js)
# Start Web Dashboard (Next.js)
if ($Service -eq "all" -or $Service -eq "web") {
    Write-Host "  [Web] Starting Dashboard..." -ForegroundColor Blue
    Write-Log -Message "Starting Web Dashboard (bun dev)" -Category "DEV"
    $webCmd = "Set-Location '$ProjectRoot\apps\web'; Write-Host '  🌐 Web Dashboard - http://localhost:3000' -ForegroundColor Cyan; Write-Host ''; bun dev"
    Start-Process $PwshPath -ArgumentList "-NoExit", "-Command", $webCmd
    Start-Sleep -Seconds 1
}

Start-Sleep -Seconds 2

# Start API Server (FastAPI)
# Start API Server (FastAPI)
if ($Service -eq "all" -or $Service -eq "api") {
    Write-Host "  [API] Starting Server..." -ForegroundColor Green
    Write-Log -Message "Starting API Server (uvicorn)" -Category "DEV"
    $venvActivate = Join-Path $ProjectRoot ".venv\Scripts\Activate.ps1"
    $venvPython = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
    $venvUvicorn = Join-Path $ProjectRoot ".venv\Scripts\uvicorn.exe"

    if (Test-Path $venvUvicorn) {
        # Use venv uvicorn directly (most reliable)
        $apiCmd = "Set-Location '$ProjectRoot\apps\api'; Write-Host '  🔌 API Server - http://localhost:8080' -ForegroundColor Green; Write-Host ''; & '$venvUvicorn' src.main:app --reload --port 8080"
    }
    elseif (Test-Path $venvPython) {
        # Fallback: use python -m uvicorn (works when uvicorn.exe not in PATH)
        $apiCmd = "Set-Location '$ProjectRoot\apps\api'; Write-Host '  🔌 API Server - http://localhost:8080' -ForegroundColor Green; Write-Host ''; & '$venvPython' -m uvicorn src.main:app --reload --port 8080"
    }
    elseif (Test-Path $venvActivate) {
        # Fallback: activate venv then run python -m uvicorn
        $apiCmd = "Set-Location '$ProjectRoot\apps\api'; Write-Host '  🔌 API Server - http://localhost:8080' -ForegroundColor Green; Write-Host ''; & '$venvActivate'; python -m uvicorn src.main:app --reload --port 8080"
    }
    else {
        # Last resort: system python
        $apiCmd = "Set-Location '$ProjectRoot\apps\api'; Write-Host '  🔌 API Server - http://localhost:8080' -ForegroundColor Green; Write-Host ''; python -m uvicorn src.main:app --reload --port 8080"
    }
    Start-Process $PwshPath -ArgumentList "-NoExit", "-Command", $apiCmd
    Start-Sleep -Seconds 1
}

Start-Sleep -Seconds 2

# Start Telegram Bot
# Start Telegram Bot
if ($Service -eq "all" -or $Service -eq "bot") {
    Write-Host "  [Bot] Starting Telegram Bot..." -ForegroundColor Yellow
    Write-Log -Message "Starting Telegram Bot (python -m apps.bot.main)" -Category "DEV"
    
    # Re-verify python path inside block
    $venvPython = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
    $venvActivate = Join-Path $ProjectRoot ".venv\Scripts\Activate.ps1"

    if (Test-Path $venvPython) {
        # Use venv python directly (most reliable)
        $botCmd = "Set-Location '$ProjectRoot'; Write-Host '  🤖 Telegram Bot - Polling Mode' -ForegroundColor Yellow; Write-Host ''; & '$venvPython' -m apps.bot.main"
    }
    elseif (Test-Path $venvActivate) {
        # Fallback: activate venv then run python
        $botCmd = "Set-Location '$ProjectRoot'; Write-Host '  🤖 Telegram Bot - Polling Mode' -ForegroundColor Yellow; Write-Host ''; & '$venvActivate'; python -m apps.bot.main"
    }
    else {
        $botCmd = "Set-Location '$ProjectRoot'; Write-Host '  🤖 Telegram Bot - Polling Mode' -ForegroundColor Yellow; Write-Host ''; python -m apps.bot.main"
    }
    Start-Process $PwshPath -ArgumentList "-NoExit", "-Command", $botCmd
}

# ============================================================
# Summary
# ============================================================

Write-LogSection -Title "DEV SERVICES STARTED"
Write-Log -Message "All 3 services started successfully" -Level "SUCCESS" -Category "DEV"

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   ✅ All services started!" -ForegroundColor Green
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Web:  " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor Blue
Write-Host "   API:  " -NoNewline; Write-Host "http://localhost:8080" -ForegroundColor Green
Write-Host "   Bot:  " -NoNewline; Write-Host "Running in polling mode" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Press Ctrl+C in each terminal to stop services." -ForegroundColor Gray
Write-Host ""
