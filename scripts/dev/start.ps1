#Requires -Version 5.1

<#
.SYNOPSIS
    Starts Nezuko development services.
.DESCRIPTION
    1. Starts Redis via Docker Compose (if available).
    2. Opens a separate pwsh terminal for the Web Dashboard (bun dev).
    3. Opens a separate pwsh terminal for the Telegram Bot (bun run dev).

    Each spawned terminal has a clear window title so it can be identified
    and closed correctly by stop.ps1.
.PARAMETER Service
    Which services to start: all (default) | web | bot | docker
.EXAMPLE
    .\start.ps1
    Starts Redis + Web Dashboard + Telegram Bot.
.EXAMPLE
    .\start.ps1 -Service bot
    Starts Redis + Bot only.
#>

[CmdletBinding()]
param(
    [ValidateSet("all", "web", "bot", "docker")]
    [string]$Service = "all"
)

# ── Bootstrap ────────────────────────────────────────────────
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$ScriptRoot\..\core\utils.ps1"

Initialize-LogSystem
Write-LogSection -Title "DEV SERVICES START"

# ── Detect PowerShell executable ─────────────────────────────
$PwshExe = if (Get-Command pwsh -ErrorAction SilentlyContinue) {
    (Get-Command pwsh).Source
}
elseif (Get-Command powershell -ErrorAction SilentlyContinue) {
    (Get-Command powershell).Source
}
else {
    $null
}

if (-not $PwshExe) {
    Write-Host ""
    Write-Host "  [ERROR] PowerShell not found!" -ForegroundColor Red
    Write-Host "  Install PowerShell 7: https://aka.ms/powershell" -ForegroundColor Yellow
    Write-Host ""
    Write-Log "PowerShell not found" -Level "ERROR" -Category "DEV"
    exit 1
}

$ProjectRoot = Get-ProjectRoot

Write-Log "Project Root: $ProjectRoot" -Category "DEV"
Write-Log "PowerShell:   $PwshExe" -Category "DEV"
Write-Log "Service:      $Service" -Category "DEV"

Write-Host ""
Write-Host "  =====================================" -ForegroundColor Cyan
Write-Host "   🦊 Nezuko Development Launcher" -ForegroundColor Yellow
Write-Host "  =====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Project:  $ProjectRoot" -ForegroundColor Gray
Write-Host "  Shell:    $PwshExe" -ForegroundColor Gray
Write-Host "  Service:  $Service" -ForegroundColor Gray
Write-Host ""

# ── Dependency health check ───────────────────────────────────
Write-Host "  Verifying dependencies..." -ForegroundColor Gray

if (-not (Check-Dependencies)) {
    Write-Host ""
    Write-Host "  ❌ Critical dependencies missing or corrupted!" -ForegroundColor Red
    Write-Host "  Run Setup [1] or Full Reset [5] from the menu." -ForegroundColor Yellow
    Write-Host ""
    Write-Log "Dependency check failed — aborting start" -Level "ERROR" -Category "DEV"
    exit 1
}

Write-Log "Dependency check passed" -Category "DEV"

# ── Step 1: Start Redis via Docker Compose ────────────────────
Write-Host "  [Redis] Starting Redis cache (Docker)..." -ForegroundColor Magenta
Write-Log "Starting Redis via docker compose" -Category "DEV"

$composeFile = Join-Path $ProjectRoot "docker-compose.local.yml"
$dockerAvail = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)

if (-not $dockerAvail) {
    Write-Host "        ⚠️  Docker not found — Redis will not start." -ForegroundColor Yellow
    Write-Host "        Install Docker Desktop: https://www.docker.com/products/docker-desktop/" -ForegroundColor Gray
    Write-Log "Docker not found — skipping Redis" -Level "WARN" -Category "DEV"
}
elseif (-not (Test-Path $composeFile)) {
    Write-Host "        ⚠️  docker-compose.local.yml not found — skipping Redis." -ForegroundColor Yellow
    Write-Log "docker-compose.local.yml not found" -Level "WARN" -Category "DEV"
}
else {
    docker compose -f $composeFile up -d 2>&1 | ForEach-Object {
        $line = [string]$_
        if ($line.Trim()) { Write-Host "        $line" -ForegroundColor DarkGray }
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Host "        ✅ Redis running (nezuko-redis-local → port 6379)" -ForegroundColor Green
        Write-Log "Redis started successfully" -Level "SUCCESS" -Category "DEV"
    }
    else {
        Write-Host "        ❌ Failed to start Redis (exit $LASTEXITCODE)" -ForegroundColor Red
        Write-Log "Redis start failed (exit $LASTEXITCODE)" -Level "ERROR" -Category "DEV"
    }
}

if ($Service -eq "docker") {
    Write-Host ""
    Write-Host "  Docker-only mode — done." -ForegroundColor Cyan
    Write-Host ""
    exit 0
}

Write-Host ""

# ── Step 2: Launch Web Dashboard ──────────────────────────────
if ($Service -eq "all" -or $Service -eq "web") {
    Write-Host "  [Web] Opening Web Dashboard terminal..." -ForegroundColor Blue
    Write-Log "Starting Web Dashboard (bun dev)" -Category "DEV"

    $webCmd = @"
`$Host.UI.RawUI.WindowTitle = 'Nezuko Web Dashboard'
Set-Location '$ProjectRoot\apps\web'
Write-Host '  🌐 Nezuko Web Dashboard' -ForegroundColor Cyan
Write-Host '  http://localhost:3000' -ForegroundColor Blue
Write-Host ''
bun dev
"@
    Start-Process $PwshExe -ArgumentList "-NoProfile", "-NoExit", "-Command", $webCmd
    Start-Sleep -Seconds 1
}

# ── Step 3: Launch Telegram Bot ───────────────────────────────
if ($Service -eq "all" -or $Service -eq "bot") {
    Write-Host "  [Bot] Opening Telegram Bot terminal..." -ForegroundColor Yellow
    Write-Log "Starting Telegram Bot (bun run dev)" -Category "DEV"

    $botCmd = @"
`$Host.UI.RawUI.WindowTitle = 'Nezuko Telegram Bot'
Set-Location '$ProjectRoot\apps\grammy'
Write-Host '  🤖 Nezuko Telegram Bot (grammY)' -ForegroundColor Yellow
Write-Host ''
bun run dev
"@
    Start-Process $PwshExe -ArgumentList "-NoProfile", "-NoExit", "-Command", $botCmd
}

# ── Summary ───────────────────────────────────────────────────
Write-LogSection -Title "DEV SERVICES STARTED"
Write-Log "Services launched successfully" -Level "SUCCESS" -Category "DEV"

Write-Host ""
Write-Host "  =====================================" -ForegroundColor Cyan
Write-Host "   ✅ Services started!" -ForegroundColor Green
Write-Host "  =====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Redis: " -NoNewline; Write-Host "nezuko-redis-local (port 6379)" -ForegroundColor Magenta
if ($Service -eq "all" -or $Service -eq "web") {
    Write-Host "   Web:   " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor Blue
}
if ($Service -eq "all" -or $Service -eq "bot") {
    Write-Host "   Bot:   " -NoNewline; Write-Host "Running in polling mode" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "   To stop all services: nezuko stop" -ForegroundColor Gray
Write-Host ""
