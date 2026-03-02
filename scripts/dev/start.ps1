#Requires -Version 5.1

<#
.SYNOPSIS
    Nezuko Development Server Launcher (PowerShell)
.DESCRIPTION
    Starts Redis via Docker Compose, then opens separate PowerShell terminals
    for the Web Dashboard and Telegram Bot.
    Prefers pwsh (PowerShell 7) with fallback to powershell (5.1).
.EXAMPLE
    .\start.ps1
    Starts Redis (Docker) + all development services in separate terminals.
.EXAMPLE
    .\start.ps1 -Service web
    Starts Redis (Docker) + Web Dashboard only.
#>

[CmdletBinding()]
param(
    [ValidateSet("all", "web", "bot", "docker")]
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
# Step 0: Start Redis via Docker Compose
# ============================================================

Write-Host "  [Redis] Starting Redis cache (Docker)..." -ForegroundColor Magenta
Write-Log -Message "Starting Redis via docker compose" -Category "DEV"

$composeFile = Join-Path $ProjectRoot "docker-compose.local.yml"
$dockerCheck = Get-Command docker -ErrorAction SilentlyContinue

if (-not $dockerCheck) {
    Write-Host "        ⚠️  Docker not found — Redis will not start." -ForegroundColor Yellow
    Write-Host "        Install Docker Desktop: https://www.docker.com/products/docker-desktop/" -ForegroundColor Gray
    Write-Log -Message "Docker not found — skipping Redis start" -Level "WARN" -Category "DEV"
}
elseif (-not (Test-Path $composeFile)) {
    Write-Host "        ⚠️  docker-compose.local.yml not found — skipping Redis." -ForegroundColor Yellow
    Write-Log -Message "docker-compose.local.yml not found" -Level "WARN" -Category "DEV"
}
else {
    $redisOutput = docker compose -f $composeFile up -d 2>&1
    $redisOutput | ForEach-Object {
        $line = [string]$_
        if ($line.Trim()) { Write-Host "        $line" -ForegroundColor DarkGray }
    }
    if ($LASTEXITCODE -eq 0) {
        Write-Host "        ✅ Redis is up (nezuko-redis-local on port 6379)" -ForegroundColor Green
        Write-Log -Message "Redis started successfully" -Level "SUCCESS" -Category "DEV"
    }
    else {
        Write-Host "        ❌ Failed to start Redis (exit code $LASTEXITCODE)" -ForegroundColor Red
        Write-Log -Message "Redis start failed" -Level "ERROR" -Category "DEV"
    }
}

Write-Host ""

# ============================================================
# Start Services in Separate Terminals
# ============================================================

# Start Web Dashboard (Next.js)
if ($Service -eq "all" -or $Service -eq "web") {
    Write-Host "  [Web] Starting Dashboard..." -ForegroundColor Blue
    Write-Log -Message "Starting Web Dashboard (bun dev)" -Category "DEV"
    $webCmd = "Set-Location '$ProjectRoot\apps\web'; Write-Host '  🌐 Web Dashboard - http://localhost:3000' -ForegroundColor Cyan; Write-Host ''; bun dev"
    Start-Process $PwshPath -ArgumentList "-NoExit", "-Command", $webCmd
    Start-Sleep -Seconds 1
}

Start-Sleep -Seconds 2

# Start Telegram Bot
if ($Service -eq "all" -or $Service -eq "bot") {
    Write-Host "  [Bot] Starting Telegram Bot..." -ForegroundColor Yellow
    Write-Log -Message "Starting Telegram Bot (uv run python -m apps.bot.main)" -Category "DEV"
    
    $botCmd = "Set-Location '$ProjectRoot'; Write-Host '  🤖 Telegram Bot' -ForegroundColor Yellow; Write-Host ''; uv run python -m apps.bot.main"
    Start-Process $PwshPath -ArgumentList "-NoExit", "-Command", $botCmd
}

# ============================================================
# Summary
# ============================================================

Write-LogSection -Title "DEV SERVICES STARTED"
Write-Log -Message "All services started successfully" -Level "SUCCESS" -Category "DEV"

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   ✅ All services started!" -ForegroundColor Green
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Redis: " -NoNewline; Write-Host "nezuko-redis-local (port 6379)" -ForegroundColor Magenta
if ($Service -eq "all" -or $Service -eq "web") {
    Write-Host "   Web:   " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor Blue
}
if ($Service -eq "all" -or $Service -eq "bot") {
    Write-Host "   Bot:   " -NoNewline; Write-Host "Running in polling mode" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "   Press Ctrl+C in each terminal to stop services." -ForegroundColor Gray
Write-Host "   Run stop.ps1 to shut down Redis + services." -ForegroundColor Gray
Write-Host ""
