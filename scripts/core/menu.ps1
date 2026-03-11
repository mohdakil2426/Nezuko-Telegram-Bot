#Requires -Version 5.1

<#
.SYNOPSIS
    Nezuko Interactive CLI Menu.
.DESCRIPTION
    Main entry point for Windows developers. Provides an interactive
    menu for all common development tasks.
.EXAMPLE
    .\menu.ps1
#>

[CmdletBinding()]
param()

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$ScriptRoot\utils.ps1"

# ============================================================
# Display Functions
# ============================================================

function Show-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║                                                      ║" -ForegroundColor Cyan
    Write-Host "  ║         🦊 " -ForegroundColor Cyan -NoNewline
    Write-Host "NEZUKO DEVELOPER CLI" -ForegroundColor Yellow -NoNewline
    Write-Host "                   ║" -ForegroundColor Cyan
    Write-Host "  ║                                                      ║" -ForegroundColor Cyan
    Write-Host "  ╠══════════════════════════════════════════════════════╣" -ForegroundColor Cyan
    Write-Host "  ║   Telegram Bot Platform • Admin Dashboard            ║" -ForegroundColor DarkGray
    Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Show-MainMenu {
    Write-Host "  ┌── 📦 SETUP ────────────────────────────────────────────┐" -ForegroundColor Magenta
    Write-Host "  │    [1] 🏗️  First-Time Setup                            │" -ForegroundColor White
    Write-Host "  ├── 🚀 DEVELOPMENT ──────────────────────────────────────┤" -ForegroundColor Green
    Write-Host "  │    [2] ▶️  Start Services...                            │" -ForegroundColor White
    Write-Host "  │    [3] ⏹️  Stop All Services                            │" -ForegroundColor White
    Write-Host "  ├── 🧹 UTILITIES ────────────────────────────────────────┤" -ForegroundColor Yellow
    Write-Host "  │    [4] 🧼 Clean Artifacts...                           │" -ForegroundColor White
    Write-Host "  │    [5] ♻️  Full Reset (Clean + Reinstall)               │" -ForegroundColor White
    Write-Host "  │    [6] 🔄 Update & Sync Dependencies                   │" -ForegroundColor White
    Write-Host "  │    ────────────────────────────────────────────────    │" -ForegroundColor DarkGray
    Write-Host "  │    [0] ❌ Exit                                         │" -ForegroundColor White
    Write-Host "  └────────────────────────────────────────────────────────┘" -ForegroundColor White
    Write-Host ""
}

function Show-StartMenu {
    Write-Host ""
    Write-Host "  ┌──────────────────────────────────────────────────────┐" -ForegroundColor White
    Write-Host "  │  " -ForegroundColor White -NoNewline
    Write-Host "▶️  START SERVICES" -ForegroundColor Green -NoNewline
    Write-Host "                               │" -ForegroundColor White
    Write-Host "  │                                                      │" -ForegroundColor White
    Write-Host "  │    [1] 🚀 Start ALL (Bot + Web)                      │" -ForegroundColor White
    Write-Host "  │    ──────────────────────────────────────────────    │" -ForegroundColor DarkGray
    Write-Host "  │    [2] 🤖 Bot Only (grammY)                          │" -ForegroundColor White
    Write-Host "  │    [3] 💻 Web Dashboard Only                         │" -ForegroundColor White
    Write-Host "  │    ──────────────────────────────────────────────    │" -ForegroundColor DarkGray
    Write-Host "  │    [4] 🐳 Start Docker (Redis) Only                  │" -ForegroundColor White
    Write-Host "  │    [5] 🐳 Stop Docker (Redis) Only                   │" -ForegroundColor White
    Write-Host "  │    ──────────────────────────────────────────────    │" -ForegroundColor DarkGray
    Write-Host "  │    [6] ⏹️  Stop All Services                          │" -ForegroundColor White
    Write-Host "  │    ──────────────────────────────────────────────    │" -ForegroundColor DarkGray
    Write-Host "  │    [0] ⬅️  Back                                       │" -ForegroundColor White
    Write-Host "  └──────────────────────────────────────────────────────┘" -ForegroundColor White
    Write-Host ""
}

function Show-CleanMenu {
    Write-Host ""
    Write-Host "  ┌──────────────────────────────────────────────────────┐" -ForegroundColor White
    Write-Host "  │  " -ForegroundColor White -NoNewline
    Write-Host "🧼 CLEAN ARTIFACTS" -ForegroundColor Yellow -NoNewline
    Write-Host "                               │" -ForegroundColor White
    Write-Host "  │                                                      │" -ForegroundColor White
    Write-Host "  │    [1] 🧹 Semi-Clean (Caches only, keep node_modules)│" -ForegroundColor White
    Write-Host "  │    [2] 🧹 Full-Clean (node_modules + Caches + Reinstall)│" -ForegroundColor White
    Write-Host "  │    ──────────────────────────────────────────────    │" -ForegroundColor DarkGray
    Write-Host "  │    [0] ⬅️  Back                                       │" -ForegroundColor White
    Write-Host "  └──────────────────────────────────────────────────────┘" -ForegroundColor White
    Write-Host ""
    Write-Host "  " -NoNewline
    Write-Host "⚠️  WARNING:" -ForegroundColor Red -NoNewline
    Write-Host " These actions cannot be undone!" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================
# Helpers
# ============================================================

function Wait-ForKeyPress {
    Write-Host ""
    Write-Host "  Press any key to continue..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# ============================================================
# Action Functions
# ============================================================

function Invoke-FirstTimeSetup {
    Write-Host ""
    Write-Host "  📦 Running first-time setup..." -ForegroundColor Yellow
    & (Join-Path $ScriptRoot "..\setup\install.ps1")
}

function Invoke-StartMenu {
    $startScript = Join-Path $ScriptRoot "..\dev\start.ps1"
    $stopScript  = Join-Path $ScriptRoot "..\dev\stop.ps1"

    while ($true) {
        Show-Banner
        Show-StartMenu

        $choice = Read-Host "  Enter choice"

        switch ($choice) {
            "1" {
                Write-Host ""; Write-Host "  🚀 Starting ALL services..." -ForegroundColor Green
                & $startScript -Service "all"
                Wait-ForKeyPress
            }
            "2" {
                Write-Host ""; Write-Host "  🤖 Starting Bot (grammY)..." -ForegroundColor Yellow
                & $startScript -Service "bot"
                Wait-ForKeyPress
            }
            "3" {
                Write-Host ""; Write-Host "  💻 Starting Web Dashboard..." -ForegroundColor Blue
                & $startScript -Service "web"
                Wait-ForKeyPress
            }
            "4" {
                Write-Host ""; Write-Host "  🐳 Starting Docker (Redis)..." -ForegroundColor Magenta
                & $startScript -Service "docker"
                Wait-ForKeyPress
            }
            "5" {
                Write-Host ""; Write-Host "  🐳 Stopping Docker (Redis)..." -ForegroundColor Yellow
                & $stopScript -Service "docker"
                Wait-ForKeyPress
            }
            "6" {
                Write-Host ""; Write-Host "  ⏹️  Stopping all services..." -ForegroundColor Red
                & $stopScript
                Wait-ForKeyPress
            }
            "0" { return }
            default {
                Write-Host "  ⚠️  Invalid choice." -ForegroundColor Yellow
                Start-Sleep -Seconds 1
            }
        }
    }
}

function Invoke-StopServices {
    Write-Host ""
    Write-Host "  ⏹️  Stopping all services..." -ForegroundColor Red
    & (Join-Path $ScriptRoot "..\dev\stop.ps1")
}

function Invoke-CleanMenu {
    $cleanScript = Join-Path $ScriptRoot "..\utils\clean.ps1"

    while ($true) {
        Show-Banner
        Show-CleanMenu

        $choice = Read-Host "  Enter choice"

        switch ($choice) {
            "1" {
                Write-Host ""
                Write-Host "  🧹 This will delete build caches only (node_modules preserved)." -ForegroundColor Yellow
                $confirm = Read-Host "  Are you sure? (y/N)"
                if ($confirm -ieq "y") {
                    & $cleanScript -CachesOnly
                    Write-Host "  ✅ Caches cleaned!" -ForegroundColor Green
                }
                else {
                    Write-Host "  ❌ Cancelled." -ForegroundColor Gray
                }
                Wait-ForKeyPress
            }
            "2" {
                Write-Host ""
                Write-Host "  🧹 This will delete ALL node_modules, caches, and reinstall." -ForegroundColor Yellow
                Write-Host "  ⚠️  Requires internet connection for bun install." -ForegroundColor Red
                $confirm = Read-Host "  Are you sure? (y/N)"
                if ($confirm -ieq "y") {
                    & $cleanScript
                    Write-Host "  ✅ Full clean + reinstall done!" -ForegroundColor Green
                }
                else {
                    Write-Host "  ❌ Cancelled." -ForegroundColor Gray
                }
                Wait-ForKeyPress
            }
            "0" { return }
            default {
                Write-Host "  ⚠️  Invalid choice." -ForegroundColor Yellow
                Start-Sleep -Seconds 1
            }
        }
    }
}

function Invoke-FullReset {
    Write-Host ""
    Write-Host "  ♻️  FULL RESET" -ForegroundColor Red
    Write-Host ""
    Write-Host "  This will:" -ForegroundColor Yellow
    Write-Host "     1. Stop all running services" -ForegroundColor Gray
    Write-Host "     2. Delete all node_modules and caches" -ForegroundColor Gray
    Write-Host "     3. Reinstall all dependencies" -ForegroundColor Gray
    Write-Host ""
    $confirm = Read-Host "  Are you sure? (y/N)"

    if ($confirm -ieq "y") {
        Write-Host ""
        Write-Host "  ♻️  Performing full reset..." -ForegroundColor Red

        # Stop running processes before cleaning to avoid Access Denied
        & (Join-Path $ScriptRoot "..\dev\stop.ps1")
        Start-Sleep -Seconds 1

        # Full clean + reinstall
        & (Join-Path $ScriptRoot "..\utils\clean.ps1")
    }
    else {
        Write-Host "  ❌ Cancelled." -ForegroundColor Gray
    }
}

# ============================================================
# Main Loop
# ============================================================

function Start-MainMenu {
    while ($true) {
        Show-Banner
        Show-MainMenu

        $choice = Read-Host "  Enter choice"

        switch ($choice) {
            "1" { Invoke-FirstTimeSetup; Wait-ForKeyPress }
            "2" { Invoke-StartMenu }
            "3" { Invoke-StopServices; Wait-ForKeyPress }
            "4" { Invoke-CleanMenu }
            "5" { Invoke-FullReset; Wait-ForKeyPress }
            "6" {
                Write-Host ""
                Write-Host "  🔄 Pulling latest changes & syncing dependencies..." -ForegroundColor Cyan
                $projectRoot = Get-ProjectRoot
                if (Test-Path (Join-Path $projectRoot ".git")) {
                    git pull
                }
                Invoke-FirstTimeSetup
                Wait-ForKeyPress
            }
            "0" {
                Write-Host ""
                Write-Host "  👋 Goodbye!" -ForegroundColor Cyan
                Write-Host ""
                exit 0
            }
            default {
                Write-Host "  ⚠️  Invalid choice. Please try again." -ForegroundColor Yellow
                Start-Sleep -Seconds 1
            }
        }
    }
}

Start-MainMenu
