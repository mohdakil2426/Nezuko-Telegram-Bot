# ============================================================
# Nezuko Development Server Launcher (PowerShell)
# Opens 3 separate terminals for Web, API, and Bot
# ============================================================

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   🦊 Nezuko Development Launcher" -ForegroundColor Yellow
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

# Change to project root
Set-Location $projectRoot

Write-Host "  Starting services in separate terminals..." -ForegroundColor White
Write-Host ""

# Start Web Dashboard
Write-Host "  [1/3] Starting Web Dashboard..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectRoot\apps\web'; bun dev"

Start-Sleep -Seconds 2

# Start API Server
Write-Host "  [2/3] Starting API Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectRoot'; & '$projectRoot\.venv\Scripts\Activate.ps1'; Set-Location apps\api; uvicorn src.main:app --reload --port 8080"

Start-Sleep -Seconds 2

# Start Telegram Bot
Write-Host "  [3/3] Starting Telegram Bot..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectRoot'; & '$projectRoot\.venv\Scripts\Activate.ps1'; python -m apps.bot.main"

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
