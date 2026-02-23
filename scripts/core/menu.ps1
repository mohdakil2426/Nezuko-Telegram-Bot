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
    Write-Host "  ║   Telegram Bot Platform • Admin Dashboard            ║" -ForegroundColor DarkGray
    Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Show-MainMenu {
    <#
    .SYNOPSIS
        Displays the main menu options.
    #>
    Write-Host "  ┌── 📦 SETUP & CONFIGURATION ──────────────────────────┐" -ForegroundColor Magenta
    Write-Host "  │    [1] 🏗️  First-Time Setup                          │" -ForegroundColor White
    Write-Host "  │    [2] 🔐 Security & Keys...                         │" -ForegroundColor White
    Write-Host "  ├── 🚀 DEVELOPMENT ────────────────────────────────────┤" -ForegroundColor Green
    Write-Host "  │    [3] ▶️  Start Services...                          │" -ForegroundColor White
    Write-Host "  │    [4] ⏹️  Stop All Services                          │" -ForegroundColor White
    Write-Host "  ├── 🧹 UTILITIES ──────────────────────────────────────┤" -ForegroundColor Yellow
    Write-Host "  │    [5] 🧼 Clean Artifacts...                         │" -ForegroundColor White
    Write-Host "  │    [6] ♻️  Full Reset (Clean + Reinstall)             │" -ForegroundColor White
    Write-Host "  │    ──────────────────────────────────────────────    │" -ForegroundColor DarkGray
    Write-Host "  │    [0] ❌ Exit                                       │" -ForegroundColor White
    Write-Host "  └──────────────────────────────────────────────────────┘" -ForegroundColor White
    Write-Host ""
}

function Show-SecurityMenu {
    <#
    .SYNOPSIS
        Displays the security tools submenu.
    #>
    Write-Host ""
    Write-Host "  ┌──────────────────────────────────────────────────────┐" -ForegroundColor White
    Write-Host "  │  " -ForegroundColor White -NoNewline
    Write-Host "🔐 SECURITY & KEYS" -ForegroundColor Red -NoNewline
    Write-Host "                              │" -ForegroundColor White
    Write-Host "  │                                                      │" -ForegroundColor White
    Write-Host "  │    [1] 🔑 Generate Encryption Key (Fernet)           │" -ForegroundColor White
    Write-Host "  │    [2] 📋 Check .env Files Status                    │" -ForegroundColor White
    Write-Host "  │    ──────────────────────────────────────────────    │" -ForegroundColor DarkGray
    Write-Host "  │    [0] ⬅️  Back                                       │" -ForegroundColor White
    Write-Host "  └──────────────────────────────────────────────────────┘" -ForegroundColor White
    Write-Host ""
}

function Show-StartMenu {
    <#
    .SYNOPSIS
        Displays the start services submenu.
    #>
    Write-Host ""
    Write-Host "  ┌──────────────────────────────────────────────────────┐" -ForegroundColor White
    Write-Host "  │  " -ForegroundColor White -NoNewline
    Write-Host "▶️  START SERVICES" -ForegroundColor Green -NoNewline
    Write-Host "                               │" -ForegroundColor White
    Write-Host "  │                                                      │" -ForegroundColor White
    Write-Host "  │    [1] 🚀 Start ALL (Bot + Web)                      │" -ForegroundColor White
    Write-Host "  │    ──────────────────────────────────────────────    │" -ForegroundColor DarkGray
    Write-Host "  │    [2] 🤖 Bot Only                                   │" -ForegroundColor White
    Write-Host "  │    [3] 💻 Web Dashboard Only                         │" -ForegroundColor White
    Write-Host "  │    ──────────────────────────────────────────────    │" -ForegroundColor DarkGray
    Write-Host "  │    [4] ⏹️  Stop All Services                          │" -ForegroundColor White
    Write-Host "  │    ──────────────────────────────────────────────    │" -ForegroundColor DarkGray
    Write-Host "  │    [0] ⬅️  Back                                       │" -ForegroundColor White
    Write-Host "  └──────────────────────────────────────────────────────┘" -ForegroundColor White
    Write-Host ""
}

function Show-CleanMenu {
    <#
    .SYNOPSIS
        Displays the clean/delete options submenu.
    #>
    Write-Host ""
    Write-Host "  ┌──────────────────────────────────────────────────────┐" -ForegroundColor White
    Write-Host "  │  " -ForegroundColor White -NoNewline
    Write-Host "🧼 CLEAN ARTIFACTS" -ForegroundColor Yellow -NoNewline
    Write-Host "                               │" -ForegroundColor White
    Write-Host "  │                                                      │" -ForegroundColor White
    Write-Host "  │    [1] 📦 Clean node_modules only                    │" -ForegroundColor White
    Write-Host "  │    [2] 🐍 Clean Python .venv only                    │" -ForegroundColor White
    Write-Host "  │    [3] 🧹 Clean ALL (node_modules + .venv)           │" -ForegroundColor White
    Write-Host "  │    ──────────────────────────────────────────────    │" -ForegroundColor DarkGray
    Write-Host "  │    [0] ⬅️  Back                                       │" -ForegroundColor White
    Write-Host "  └──────────────────────────────────────────────────────┘" -ForegroundColor White
    Write-Host ""
    Write-Host "  " -NoNewline
    Write-Host "⚠️  WARNING:" -ForegroundColor Red -NoNewline
    Write-Host " These actions are irreversible!" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================
# Helper Functions
# ============================================================

function Wait-ForKeyPress {
    Write-Host ""
    Write-Host "  Press any key to continue..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Get-ProjectRoot {
    # Navigate up from scripts/core to project root
    return Split-Path -Parent (Split-Path -Parent $ScriptRoot)
}

# ============================================================
# Action Functions - Setup & Configuration
# ============================================================

function Invoke-FirstTimeSetup {
    Write-Host ""
    Write-Host "  📦 Running first-time setup..." -ForegroundColor Yellow
    $setupScript = Join-Path $ScriptRoot "..\setup\install.ps1"
    & $setupScript
}

function Invoke-SecurityMenu {
    <#
    .SYNOPSIS
        Security tools submenu handler.
    #>
    while ($true) {
        Show-Banner
        Show-SecurityMenu

        $choice = Read-Host "  Enter choice"

        switch ($choice) {
            "1" {
                Write-Host ""
                Write-Host "  🔑 Generating encryption key..." -ForegroundColor Yellow
                $keyScript = Join-Path $ScriptRoot "..\utils\generate-key.ps1"
                & $keyScript
                Wait-ForKeyPress
            }
            "2" {
                Write-Host ""
                Write-Host "  📋 Checking .env files status..." -ForegroundColor Cyan
                Write-Host ""

                $projectRoot = Get-ProjectRoot

                # Check Bot .env
                $botEnv = Join-Path $projectRoot "apps\bot\.env"
                $botEnvExample = Join-Path $projectRoot "apps\bot\.env.example"
                Write-Host "  apps/bot/.env: " -NoNewline
                if (Test-Path $botEnv) {
                    Write-Host "✅ EXISTS" -ForegroundColor Green
                }
                else {
                    Write-Host "❌ MISSING" -ForegroundColor Red -NoNewline
                    if (Test-Path $botEnvExample) {
                        Write-Host " (copy from .env.example)" -ForegroundColor Gray
                    }
                    else {
                        Write-Host ""
                    }
                }

                Write-Host ""
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

# ============================================================
# Action Functions - Development
# ============================================================

function Invoke-StartMenu {
    <#
    .SYNOPSIS
        Start services submenu handler.
    #>
    while ($true) {
        Show-Banner
        Show-StartMenu
        
        $choice = Read-Host "  Enter choice"
        $startScript = Join-Path $ScriptRoot "..\dev\start.ps1"
        
        switch ($choice) {
            "1" {
                Write-Host ""
                Write-Host "  🚀 Starting ALL services..." -ForegroundColor Green
                Write-Host ""

                & $startScript -Service "all"
                Wait-ForKeyPress
            }
            "2" {
                Write-Host ""
                Write-Host "  🤖 Starting Bot..." -ForegroundColor Yellow
                & $startScript -Service "bot"
                Wait-ForKeyPress
            }
            "3" {
                Write-Host ""
                Write-Host "  💻 Starting Web Dashboard..." -ForegroundColor Blue
                & $startScript -Service "web"
                Wait-ForKeyPress
            }
            "4" {
                Write-Host ""
                Write-Host "  ⏹️  Stopping all services..." -ForegroundColor Red
                $stopScript = Join-Path $ScriptRoot "..\dev\stop.ps1"
                & $stopScript
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





function Invoke-StopServices {
    Write-Host ""   
    Write-Host "  ⏹️  Stopping all services..." -ForegroundColor Red
    $stopScript = Join-Path $ScriptRoot "..\dev\stop.ps1"
    & $stopScript
}

# ============================================================
# Action Functions - Utilities
# ============================================================

function Invoke-CleanMenu {
    <#
    .SYNOPSIS
        Clean submenu with options and confirmations.
    #>
    $cleanScript = Join-Path $ScriptRoot "..\utils\clean.ps1"
    $projectRoot = Get-ProjectRoot
    
    while ($true) {
        Show-Banner
        Show-CleanMenu
        
        $choice = Read-Host "  Enter choice"
        
        switch ($choice) {
            "1" {
                # Clean node_modules only
                Write-Host ""
                Write-Host "  📦 This will delete all node_modules folders." -ForegroundColor Yellow
                $confirm = Read-Host "  Are you sure? (y/N)"
                if ($confirm -eq "y" -or $confirm -eq "Y") {
                    Write-Host ""
                    & $cleanScript
                    Write-Host "  ✅ node_modules cleaned!" -ForegroundColor Green
                }
                else {
                    Write-Host "  ❌ Cancelled." -ForegroundColor Gray
                }
                Wait-ForKeyPress
            }
            "2" {
                # Clean .venv only
                Write-Host ""
                Write-Host "  🐍 This will delete the Python virtual environment (.venv)." -ForegroundColor Yellow
                Write-Host "  ⚠️  You will need to run Setup to recreate it!" -ForegroundColor Red
                $confirm = Read-Host "  Are you sure? (y/N)"
                if ($confirm -eq "y" -or $confirm -eq "Y") {
                    Write-Host ""
                    $venvPath = Join-Path $projectRoot ".venv"
                    if (Test-Path $venvPath) {
                        Write-Host "  Removing .venv..." -ForegroundColor Gray
                        Remove-Item -Path $venvPath -Recurse -Force -ErrorAction SilentlyContinue
                        Write-Host "  ✅ .venv deleted!" -ForegroundColor Green
                    }
                    else {
                        Write-Host "  ℹ️  .venv not found." -ForegroundColor Gray
                    }
                }
                else {
                    Write-Host "  ❌ Cancelled." -ForegroundColor Gray
                }
                Wait-ForKeyPress
            }
            "3" {
                # Clean ALL
                Write-Host ""
                Write-Host "  🧹 This will delete ALL:" -ForegroundColor Yellow
                Write-Host "     - node_modules folders" -ForegroundColor Gray
                Write-Host "     - Python .venv" -ForegroundColor Gray
                Write-Host ""
                Write-Host "  ⚠️  You will need to run Setup to reinstall!" -ForegroundColor Red
                $confirm = Read-Host "  Are you sure? (y/N)"
                if ($confirm -eq "y" -or $confirm -eq "Y") {
                    Write-Host ""
                    & $cleanScript -IncludeVenv
                    Write-Host "  ✅ All artifacts cleaned!" -ForegroundColor Green
                }
                else {
                    Write-Host "  ❌ Cancelled." -ForegroundColor Gray
                }
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

function Invoke-FullReset {
    Write-Host ""
    Write-Host "  ♻️  FULL RESET" -ForegroundColor Red
    Write-Host ""
    Write-Host "  This will:" -ForegroundColor Yellow
    Write-Host "     1. Delete all node_modules" -ForegroundColor Gray
    Write-Host "     2. Delete Python .venv" -ForegroundColor Gray
    Write-Host "     3. Reinstall all dependencies" -ForegroundColor Gray
    Write-Host ""
    $confirm = Read-Host "  Are you sure? (y/N)"
    
    if ($confirm -eq "y" -or $confirm -eq "Y") {
        Write-Host ""
        Write-Host "  ♻️  Performing full reset..." -ForegroundColor Red
        
        # Clean
        $cleanScript = Join-Path $ScriptRoot "..\utils\clean.ps1"
        & $cleanScript -IncludeVenv
        
        Start-Sleep -Seconds 1
        
        # Reinstall
        Invoke-FirstTimeSetup
    }
    else {
        Write-Host "  ❌ Cancelled." -ForegroundColor Gray
    }
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
        Show-MainMenu
        
        $choice = Read-Host "  Enter choice"
        
        switch ($choice) {
            # Setup & Configuration
            "1" { Invoke-FirstTimeSetup; Wait-ForKeyPress }
            "2" { Invoke-SecurityMenu }

            # Development
            "3" { Invoke-StartMenu }
            "4" { Invoke-StopServices; Wait-ForKeyPress }

            # Utilities
            "5" { Invoke-CleanMenu }
            "6" { Invoke-FullReset; Wait-ForKeyPress }

            # Exit
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
