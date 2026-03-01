#Requires -Version 5.1

<#
.SYNOPSIS
    Nezuko First-Time Project Setup (PowerShell)
.DESCRIPTION
    Sets up the development environment by:
    - Checking prerequisites (Python, Bun)
    - Creating Python virtual environment
    - Installing Python dependencies
    - Installing Node.js dependencies
    - Creating .env files from templates
    - Creating storage directories
.EXAMPLE
    .\install.ps1
    Runs the complete setup process.
.EXAMPLE
    .\install.ps1 -SkipNode
    Skips Node.js dependency installation.
#>

[CmdletBinding()]
param(
    [switch]$SkipPython,
    [switch]$SkipNode,
    [switch]$Force
)

# Import utilities
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$ScriptRoot\..\core\utils.ps1"

$ProjectRoot = Get-ProjectRoot

# Initialize logging
Initialize-LogSystem
Write-LogSection -Title "NEZUKO SETUP STARTED"
Write-Log -Message "Project Root: $ProjectRoot" -Category "INSTALL"
Write-Log -Message "PowerShell Version: $($PSVersionTable.PSVersion)" -Category "INSTALL"

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   🦊 Nezuko Project Setup" -ForegroundColor Yellow
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# Step 1: Check Prerequisites
# ============================================================

Write-Step -Step "1/6" -Message "Checking prerequisites..."
Write-Log -Message "Step 1/6: Checking prerequisites" -Category "INSTALL"

if (-not (Test-Prerequisites)) {
    Write-Host ""
    Write-Host "  ❌ Prerequisites check failed. Please install missing tools." -ForegroundColor Red
    Write-Host ""
    Write-Log -Message "Prerequisites check FAILED" -Level "ERROR" -Category "INSTALL"
    exit 1
}
Write-Log -Message "Prerequisites check passed" -Level "SUCCESS" -Category "INSTALL"

# ============================================================
# Step 2: Sync Python Environment (uv)
# ============================================================

if (-not $SkipPython) {
    Write-Step -Step "2/6" -Message "Syncing Python virtual environment (uv)..."
    Write-Log -Message "Step 2/6: Syncing Python environment with uv" -Category "PYTHON"
    
    $venvPath = Get-VenvPath
    
    if ($Force -and (Test-Path $venvPath)) {
        Write-Host "        Removing existing .venv..." -ForegroundColor Gray
        Remove-Item -Path $venvPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Log -Message "Removed existing .venv due to -Force" -Category "PYTHON"
    }

    $ProjectRoot = Get-ProjectRoot
    Push-Location $ProjectRoot
    
    Write-Log -Message "COMMAND: uv sync" -Category "PYTHON"
    
    # Run uv sync
    $syncExitCode = 0
    uv sync 2>&1 | ForEach-Object {
        $line = [string]$_
        Write-Host "        $line" -ForegroundColor DarkGray
        if ($line -and $line.Trim()) {
            Write-Log -Message $line -Category "PYTHON"
        }
    }
    $syncExitCode = $LASTEXITCODE
    Pop-Location

    if ($syncExitCode -eq 0) {
        Write-Success "Python environment synced successfully (regular + dev dependencies)"
        Write-Log -Message "uv sync completed successfully" -Level "SUCCESS" -Category "PYTHON"
    }
    else {
        Write-Failure "Failed to sync Python environment (exit code: $syncExitCode)"
        Write-Log -Message "uv sync failed with exit code: $syncExitCode" -Level "ERROR" -Category "PYTHON"
        exit 1
    }

    Write-Step -Step "3/6" -Message "Skipping legacy pip install (using uv sync instead)"
}
else {
    Write-Step -Step "2/6" -Message "Skipping Python setup (--SkipPython)"
    Write-Step -Step "3/6" -Message "Skipping Python dependencies (--SkipPython)"
}

# ============================================================
# Step 4: Install Node.js Dependencies
# ============================================================

if (-not $SkipNode) {
    Write-Step -Step "4/6" -Message "Installing Node.js dependencies (Bun — apps/web)..."
    Write-Log -Message "Step 4/6: Installing Node.js dependencies" -Category "NODE"

    $webDir = Join-Path $ProjectRoot "apps\web"

    if (-not (Test-Path $webDir)) {
        Write-Failure "apps/web directory not found"
        Write-Log -Message "apps/web not found" -Level "ERROR" -Category "NODE"
    }
    else {
        Write-Host ""
        Write-Host "        Running bun install in apps/web..." -ForegroundColor Cyan

        Push-Location $webDir
        Write-Log -Message "COMMAND: bun install (in apps/web)" -Category "NODE"

        $bunExitCode = 0
        bun install 2>&1 | ForEach-Object {
            $line = [string]$_
            Write-Host "        $line" -ForegroundColor DarkGray
            if ($line -and $line.Trim()) {
                Write-Log -Message $line -Category "NODE"
            }
        }
        $bunExitCode = $LASTEXITCODE
        Pop-Location

        if ($bunExitCode -eq 0) {
            Write-Host ""
            Write-Success "Node.js packages installed (apps/web)"
            Write-Log -Message "Node.js packages installed successfully" -Level "SUCCESS" -Category "NODE"
        }
        else {
            Write-Failure "Failed to install Node.js packages (exit code: $bunExitCode)"
            Write-Log -Message "Failed to install Node.js packages (exit code: $bunExitCode)" -Level "ERROR" -Category "NODE"
        }
    }
}
else {
    Write-Step -Step "4/6" -Message "Skipping Node.js setup (--SkipNode)"
}

# ============================================================
# Step 5: Create Environment Files
# ============================================================

Write-Step -Step "5/6" -Message "Creating environment files..."

$envConfigs = @(
    @{ Dir = "apps\web"; EnvFile = ".env.local"; Example = ".env.example" },
    @{ Dir = "apps\bot"; EnvFile = ".env"; Example = ".env.example" }
)

foreach ($config in $envConfigs) {
    $targetDir = Join-Path $ProjectRoot $config.Dir
    $created = Copy-EnvFileIfMissing -TargetDir $targetDir -EnvFileName $config.EnvFile -ExampleFileName $config.Example
    
    if ($created) {
        Write-Success "Created $($config.Dir)\$($config.EnvFile)"
    }
    else {
        Write-Info "$($config.Dir)\$($config.EnvFile) already exists"
    }
}

# ============================================================
# Step 6: Create Logging Directories
# ============================================================

Write-Step -Step "6/6" -Message "Creating logging directories..."

$storageDirs = @(
    "apps\bot\logs"
)

foreach ($dir in $storageDirs) {
    $fullPath = Join-Path $ProjectRoot $dir
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Success "Created $dir"
    }
    else {
        Write-Info "$dir already exists"
    }
}

# ============================================================
# Summary
# ============================================================

Write-LogSection -Title "NEZUKO SETUP COMPLETED"
Write-Log -Message "Setup completed successfully" -Level "SUCCESS" -Category "INSTALL"

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   ✅ Setup Complete!" -ForegroundColor Green
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  " -NoNewline
Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host " Edit these files with your credentials:"
Write-Host ""

Write-Host "  📝 " -NoNewline -ForegroundColor White
Write-Host "apps/bot/.env" -ForegroundColor Cyan
Write-Host "     - BOT_TOKEN              (from @BotFather, used when DASHBOARD_MODE=false)" -ForegroundColor Gray
Write-Host "     - INSFORGE_BASE_URL      (your InsForge project URL)" -ForegroundColor Gray
Write-Host "     - INSFORGE_ANON_KEY      (from InsForge dashboard — must match web)" -ForegroundColor Gray
Write-Host "     - ENCRYPTION_KEY         (generate with Security menu → Generate Key)" -ForegroundColor Gray
Write-Host "     - REDIS_URL              (redis://127.0.0.1:6379/0 — local Docker Redis)" -ForegroundColor Gray
Write-Host ""

Write-Host "  📝 " -NoNewline -ForegroundColor White
Write-Host "apps/web/.env.local" -ForegroundColor Cyan
Write-Host "     - NEXT_PUBLIC_INSFORGE_BASE_URL     (your InsForge project URL)" -ForegroundColor Gray
Write-Host "     - NEXT_PUBLIC_INSFORGE_ANON_KEY     (from InsForge dashboard — must match bot)" -ForegroundColor Gray
Write-Host "     - NEXT_PUBLIC_LOGIN_BOT_USERNAME    (your bot's username without @)" -ForegroundColor Gray
Write-Host ""

Write-Host "  🐳 Start local Redis:" -ForegroundColor White
Write-Host "     docker compose -f docker-compose.local.yml up -d" -ForegroundColor Gray
Write-Host "     (Or just run: nezuko dev — Redis starts automatically)" -ForegroundColor DarkGray
Write-Host ""

Write-Host "  Then run: " -NoNewline
Write-Host "nezuko dev" -ForegroundColor Green
Write-Host ""
Write-Host "  📋 Log file: " -NoNewline -ForegroundColor Gray
Write-Host (Get-LogPath) -ForegroundColor DarkGray
Write-Host ""

