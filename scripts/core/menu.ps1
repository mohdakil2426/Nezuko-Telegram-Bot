#Requires -Version 5.1

<#
.SYNOPSIS
    Nezuko Interactive CLI Menu (PowerShell)
.DESCRIPTION
    Provides an interactive menu for common development tasks.
    This is the main entry point for Windows developers.
.EXAMPLE
    .\menu.ps1
    Opens the interactive menu.
#>

[CmdletBinding()]
param()

# Import shared utilities
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$ScriptRoot\utils.ps1"

# ============================================================
# Menu Display Functions
# ============================================================

function Show-Banner {
    <#
    .SYNOPSIS
        Displays the Nezuko CLI banner.
    #>
    Clear-Host
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║                                                      ║" -ForegroundColor Cyan
    Write-Host "  ║         🦊 " -ForegroundColor Cyan -NoNewline
    Write-Host "NEZUKO DEVELOPER CLI" -ForegroundColor Yellow -NoNewline
    Write-Host "                   ║" -ForegroundColor Cyan
    Write-Host "  ║                                                      ║" -ForegroundColor Cyan
    Write-Host "  ╠══════════════════════════════════════════════════════╣" -ForegroundColor Cyan
    Write-Host "  ║   Telegram Bot Platform • Admin Dashboard • API      ║" -ForegroundColor DarkGray
    Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Menu {
    <#
    .SYNOPSIS
        Displays the main menu options.
    #>
    Write-Host "  ┌──────────────────────────────────────────────────────┐" -ForegroundColor White
    Write-Host "  │  " -ForegroundColor White -NoNewline
    Write-Host "DEVELOPMENT" -ForegroundColor Green -NoNewline
    Write-Host "                                         │" -ForegroundColor White
    Write-Host "  │                                                      │" -ForegroundColor White
    Write-Host "  │    [1] 🚀 Start All Services                         │" -ForegroundColor White
    Write-Host "  │    [2] 🛑 Stop All Services                          │" -ForegroundColor White
    Write-Host "  │    [3] 🔄 Restart All Services                       │" -ForegroundColor White
    Write-Host "  │                                                      │" -ForegroundColor White
    Write-Host "  ├──────────────────────────────────────────────────────┤" -ForegroundColor White
    Write-Host "  │  " -ForegroundColor White -NoNewline
    Write-Host "SETUP & MAINTENANCE" -ForegroundColor Yellow -NoNewline
    Write-Host "                               │" -ForegroundColor White
    Write-Host "  │                                                      │" -ForegroundColor White
    Write-Host "  │    [4] 📦 First-Time Setup (Install Dependencies)    │" -ForegroundColor White
    Write-Host "  │    [5] 🧹 Clean All Artifacts                        │" -ForegroundColor White
    Write-Host "  │    [6] ♻️  Total Reset (Clean + Reinstall)            │" -ForegroundColor White
    Write-Host "  │                                                      │" -ForegroundColor White
    Write-Host "  ├──────────────────────────────────────────────────────┤" -ForegroundColor White
    Write-Host "  │  " -ForegroundColor White -NoNewline
    Write-Host "TESTING & TOOLS" -ForegroundColor Magenta -NoNewline
    Write-Host "                                   │" -ForegroundColor White
    Write-Host "  │                                                      │" -ForegroundColor White
    Write-Host "  │    [7] 🧪 Run Tests                                  │" -ForegroundColor White
    Write-Host "  │    [8] 🗄️  Database Tools                            │" -ForegroundColor White
    Write-Host "  │    [9] 🐳 Docker Commands                            │" -ForegroundColor White
    Write-Host "  │                                                      │" -ForegroundColor White
    Write-Host "  ├──────────────────────────────────────────────────────┤" -ForegroundColor White
    Write-Host "  │    [0] ❌ Exit                                       │" -ForegroundColor White
    Write-Host "  └──────────────────────────────────────────────────────┘" -ForegroundColor White
    Write-Host ""
}

function Show-DatabaseMenu {
    <#
    .SYNOPSIS
        Displays the database tools submenu.
    #>
    Write-Host ""
    Write-Host "  ┌──────────────────────────────────────────────────────┐" -ForegroundColor White
    Write-Host "  │  " -ForegroundColor White -NoNewline
    Write-Host "DATABASE TOOLS" -ForegroundColor Cyan -NoNewline
    Write-Host "                                    │" -ForegroundColor White
    Write-Host "  │                                                      │" -ForegroundColor White
    Write-Host "  │    [1] 🔧 Setup Database (Create Tables)             │" -ForegroundColor White
    Write-Host "  │    [2] 🐛 Debug Database Connection                  │" -ForegroundColor White
    Write-Host "  │    [3] ⬆️  Run Migrations                             │" -ForegroundColor White
    Write-Host "  │    [0] ⬅️  Back to Main Menu                          │" -ForegroundColor White
    Write-Host "  └──────────────────────────────────────────────────────┘" -ForegroundColor White
    Write-Host ""
}

function Show-DockerMenu {
    <#
    .SYNOPSIS
        Displays the Docker commands submenu.
    #>
    Write-Host ""
    Write-Host "  ┌──────────────────────────────────────────────────────┐" -ForegroundColor White
    Write-Host "  │  " -ForegroundColor White -NoNewline
    Write-Host "DOCKER COMMANDS" -ForegroundColor Blue -NoNewline
    Write-Host "                                   │" -ForegroundColor White
    Write-Host "  │                                                      │" -ForegroundColor White
    Write-Host "  │    [1] 🏗️  Build All Containers                      │" -ForegroundColor White
    Write-Host "  │    [2] ▶️  Start Containers                           │" -ForegroundColor White
    Write-Host "  │    [3] ⏹️  Stop Containers                            │" -ForegroundColor White
    Write-Host "  │    [4] 📋 View Logs                                  │" -ForegroundColor White
    Write-Host "  │    [0] ⬅️  Back to Main Menu                          │" -ForegroundColor White
    Write-Host "  └──────────────────────────────────────────────────────┘" -ForegroundColor White
    Write-Host ""
}

# ============================================================
# Action Functions
# ============================================================

function Invoke-StartServices {
    Write-Host ""
    Write-Host "  🚀 Starting all development services..." -ForegroundColor Green
    $startScript = Join-Path $ScriptRoot "..\dev\start.ps1"
    & $startScript
}

function Invoke-StopServices {
    Write-Host ""
    Write-Host "  🛑 Stopping all services..." -ForegroundColor Red
    $stopScript = Join-Path $ScriptRoot "..\dev\stop.ps1"
    & $stopScript
}

function Invoke-RestartServices {
    Write-Host ""
    Write-Host "  🔄 Restarting all services..." -ForegroundColor Yellow
    Invoke-StopServices
    Start-Sleep -Seconds 2
    Invoke-StartServices
}

function Invoke-Setup {
    Write-Host ""
    Write-Host "  📦 Running first-time setup..." -ForegroundColor Yellow
    $setupScript = Join-Path $ScriptRoot "..\setup\install.ps1"
    & $setupScript
}

function Invoke-Clean {
    Write-Host ""
    Write-Host "  🧹 Cleaning all build artifacts..." -ForegroundColor Yellow
    $cleanScript = Join-Path $ScriptRoot "..\utils\clean.ps1"
    & $cleanScript
}

function Invoke-TotalReset {
    Write-Host ""
    Write-Host "  ♻️  Performing total reset (clean + reinstall)..." -ForegroundColor Red
    Invoke-Clean
    Start-Sleep -Seconds 1
    Invoke-Setup
}

function Invoke-RunTests {
    Write-Host ""
    Write-Host "  🧪 Running test suite..." -ForegroundColor Magenta
    $projectRoot = Split-Path -Parent (Split-Path -Parent $ScriptRoot)
    
    # Activate venv if exists
    $venvActivate = Join-Path $projectRoot ".venv\Scripts\Activate.ps1"
    if (Test-Path $venvActivate) {
        & $venvActivate
    }
    
    # Run pytest
    Push-Location $projectRoot
    python -m pytest tests/ -v
    Pop-Location
}

function Invoke-DatabaseMenu {
    while ($true) {
        Show-Banner
        Show-DatabaseMenu
        
        $choice = Read-Host "  Enter choice"
        
        switch ($choice) {
            "1" {
                Write-Host ""
                Write-Host "  🔧 Setting up database..." -ForegroundColor Cyan
                $dbScript = Join-Path $ScriptRoot "..\db\setup.py"
                python $dbScript
                Wait-ForKeyPress
            }
            "2" {
                Write-Host ""
                Write-Host "  🐛 Debugging database connection..." -ForegroundColor Cyan
                $debugScript = Join-Path $ScriptRoot "..\db\debug.py"
                python $debugScript
                Wait-ForKeyPress
            }
            "3" {
                Write-Host ""
                Write-Host "  ⬆️  Running migrations..." -ForegroundColor Cyan
                $projectRoot = Split-Path -Parent (Split-Path -Parent $ScriptRoot)
                Push-Location (Join-Path $projectRoot "apps\api")
                alembic upgrade head
                Pop-Location
                Wait-ForKeyPress
            }
            "0" { return }
            default {
                Write-Host "  ⚠️  Invalid choice. Please try again." -ForegroundColor Yellow
                Start-Sleep -Seconds 1
            }
        }
    }
}

function Invoke-DockerMenu {
    while ($true) {
        Show-Banner
        Show-DockerMenu
        
        $choice = Read-Host "  Enter choice"
        $dockerDir = Join-Path (Split-Path -Parent (Split-Path -Parent $ScriptRoot)) "config\docker"
        
        switch ($choice) {
            "1" {
                Write-Host ""
                Write-Host "  🏗️  Building Docker containers..." -ForegroundColor Blue
                Push-Location $dockerDir
                docker-compose build
                Pop-Location
                Wait-ForKeyPress
            }
            "2" {
                Write-Host ""
                Write-Host "  ▶️  Starting Docker containers..." -ForegroundColor Blue
                Push-Location $dockerDir
                docker-compose up -d
                Pop-Location
                Wait-ForKeyPress
            }
            "3" {
                Write-Host ""
                Write-Host "  ⏹️  Stopping Docker containers..." -ForegroundColor Blue
                Push-Location $dockerDir
                docker-compose down
                Pop-Location
                Wait-ForKeyPress
            }
            "4" {
                Write-Host ""
                Write-Host "  📋 Viewing Docker logs (Ctrl+C to exit)..." -ForegroundColor Blue
                Push-Location $dockerDir
                docker-compose logs -f --tail=100
                Pop-Location
            }
            "0" { return }
            default {
                Write-Host "  ⚠️  Invalid choice. Please try again." -ForegroundColor Yellow
                Start-Sleep -Seconds 1
            }
        }
    }
}

function Wait-ForKeyPress {
    Write-Host ""
    Write-Host "  Press any key to continue..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# ============================================================
# Main Loop
# ============================================================

function Start-MainMenu {
    <#
    .SYNOPSIS
        Main menu loop.
    #>
    while ($true) {
        Show-Banner
        Show-Menu
        
        $choice = Read-Host "  Enter choice"
        
        switch ($choice) {
            "1" { Invoke-StartServices; Wait-ForKeyPress }
            "2" { Invoke-StopServices; Wait-ForKeyPress }
            "3" { Invoke-RestartServices; Wait-ForKeyPress }
            "4" { Invoke-Setup; Wait-ForKeyPress }
            "5" { Invoke-Clean; Wait-ForKeyPress }
            "6" { Invoke-TotalReset; Wait-ForKeyPress }
            "7" { Invoke-RunTests; Wait-ForKeyPress }
            "8" { Invoke-DatabaseMenu }
            "9" { Invoke-DockerMenu }
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

# Run the menu
Start-MainMenu
