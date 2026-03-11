#Requires -Version 5.1

<#
.SYNOPSIS
    Nezuko First-Time Project Setup.
.DESCRIPTION
    Sets up the development environment:
    - Checks prerequisites (Bun, Node.js, Docker, Git)
    - Installs Web Dashboard dependencies (apps/web)
    - Installs Telegram Bot dependencies (apps/grammy)
    - Creates .env files from templates if they do not exist
    - Creates logging directories
.PARAMETER SkipWeb
    Skips apps/web dependency installation.
.PARAMETER SkipBot
    Skips apps/grammy dependency installation.
.EXAMPLE
    .\install.ps1
    Full setup.
.EXAMPLE
    .\install.ps1 -SkipWeb
    Bot dependencies only.
#>

[CmdletBinding()]
param(
    [switch]$SkipWeb,
    [switch]$SkipBot
)

# ── Bootstrap ────────────────────────────────────────────────
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$ScriptRoot\..\core\utils.ps1"   # also loads config.ps1 via utils.ps1

$ProjectRoot = Get-ProjectRoot

Initialize-LogSystem
Write-LogSection -Title "NEZUKO SETUP STARTED"
Write-Log "Project Root: $ProjectRoot | SkipWeb: $SkipWeb | SkipBot: $SkipBot" -Category "INSTALL"
Write-Log "PowerShell: $($PSVersionTable.PSVersion)" -Category "INSTALL"

Write-Host ""
Write-Host "  =====================================" -ForegroundColor Cyan
Write-Host "   🦊 Nezuko Project Setup" -ForegroundColor Yellow
Write-Host "  =====================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Prerequisites ─────────────────────────────────────
Write-Step -Step "1/4" -Message "Checking prerequisites..."
Write-Log "Step 1/4: Checking prerequisites" -Category "INSTALL"

if (-not (Test-Prerequisites)) {
    Write-Host ""
    Write-Host "  ❌ Prerequisites check failed. Install missing tools and retry." -ForegroundColor Red
    Write-Host ""
    Write-Log "Prerequisites check FAILED" -Level "ERROR" -Category "INSTALL"
    exit 1
}

Write-Log "Prerequisites check passed" -Level "SUCCESS" -Category "INSTALL"

# ── Step 2: Web Dashboard dependencies ───────────────────────
if ($SkipWeb) {
    Write-Step -Step "2/4" -Message "Skipping Web setup (--SkipWeb)"
}
else {
    Write-Step -Step "2/4" -Message "Installing Web dependencies (apps/web)..."
    Write-Log "Step 2/4: Installing Web dependencies" -Category "NODE"

    $webDir = Join-Path $ProjectRoot $script:NEZUKO_APP_WEB

    if (-not (Test-Path $webDir)) {
        Write-Failure "apps/web directory not found"
        Write-Log "apps/web not found" -Level "ERROR" -Category "NODE"
    }
    else {
        Write-Host ""
        Write-Host "        Running bun install in apps/web..." -ForegroundColor Cyan

        Push-Location $webDir
        bun install
        $exitCode = $LASTEXITCODE
        Pop-Location

        if ($exitCode -eq 0) {
            Write-Host ""
            Write-Success "Web Dashboard packages installed."
            Write-Log "Web packages installed successfully" -Level "SUCCESS" -Category "NODE"
        }
        else {
            Write-Failure "Failed to install web packages (exit $exitCode)"
            Write-Log "Web packages installation failed (exit $exitCode)" -Level "ERROR" -Category "NODE"
            Write-Host "        Run 'bun install' manually in apps/web to debug." -ForegroundColor Gray
        }
    }
}

# ── Step 3: Bot dependencies ──────────────────────────────────
if ($SkipBot) {
    Write-Step -Step "3/4" -Message "Skipping Bot setup (--SkipBot)"
}
else {
    Write-Step -Step "3/4" -Message "Installing Bot dependencies (apps/grammy)..."
    Write-Log "Step 3/4: Installing Bot dependencies" -Category "NODE"

    $botDir = Join-Path $ProjectRoot $script:NEZUKO_APP_BOT

    if (-not (Test-Path $botDir)) {
        Write-Failure "apps/grammy directory not found"
        Write-Log "apps/grammy not found" -Level "ERROR" -Category "NODE"
    }
    else {
        Write-Host ""
        Write-Host "        Running bun install in apps/grammy..." -ForegroundColor Cyan

        Push-Location $botDir
        bun install
        $exitCode = $LASTEXITCODE
        Pop-Location

        if ($exitCode -eq 0) {
            Write-Host ""
            Write-Success "Telegram Bot packages installed."
            Write-Log "Bot packages installed successfully" -Level "SUCCESS" -Category "NODE"
        }
        else {
            Write-Failure "Failed to install bot packages (exit $exitCode)"
            Write-Log "Bot packages installation failed (exit $exitCode)" -Level "ERROR" -Category "NODE"
            Write-Host "        Run 'bun install' manually in apps/grammy to debug." -ForegroundColor Gray
        }
    }
}

# ── Step 4: Environment files + directories ───────────────────
Write-Step -Step "4/4" -Message "Creating env files and logging directories..."

$envConfigs = @(
    @{ Dir = "apps\web";    EnvFile = ".env.local"; Example = ".env.example" },
    @{ Dir = "apps\grammy"; EnvFile = ".env";        Example = ".env.example" }
)

foreach ($cfg in $envConfigs) {
    $targetDir = Join-Path $ProjectRoot $cfg.Dir
    if (-not (Test-Path $targetDir)) { continue }

    $created = Copy-EnvFileIfMissing -TargetDir $targetDir -EnvFileName $cfg.EnvFile -ExampleFileName $cfg.Example
    if ($created) {
        Write-Success "Created $($cfg.Dir)\$($cfg.EnvFile)"
    }
    else {
        Write-Info "$($cfg.Dir)\$($cfg.EnvFile) already exists"
    }
}

# Create logging directory for the bot
$logsDir = Join-Path $ProjectRoot "apps\grammy\logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    Write-Success "Created apps/grammy/logs"
}
else {
    Write-Info "apps/grammy/logs already exists"
}

# ── Summary ───────────────────────────────────────────────────
Write-LogSection -Title "NEZUKO SETUP COMPLETED"
Write-Log "Setup completed" -Level "SUCCESS" -Category "INSTALL"

Write-Host ""
Write-Host "  =====================================" -ForegroundColor Cyan
Write-Host "   ✅ Setup Complete!" -ForegroundColor Green
Write-Host "  =====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  " -NoNewline
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host " Edit these files with your credentials:"
Write-Host ""
Write-Host "  📝 " -NoNewline -ForegroundColor White
Write-Host "apps/grammy/.env" -ForegroundColor Cyan
Write-Host "     BOT_TOKEN              (from @BotFather — used when DASHBOARD_MODE=false)" -ForegroundColor Gray
Write-Host "     INSFORGE_BASE_URL      (your InsForge project URL)" -ForegroundColor Gray
Write-Host "     INSFORGE_ANON_KEY      (from InsForge metadata — must match web)" -ForegroundColor Gray
Write-Host "     ENCRYPTION_KEY         (32-byte hex for AES-256-GCM — run: nezuko keygen)" -ForegroundColor Gray
Write-Host "     REDIS_URL              (redis://127.0.0.1:6379 — local Docker Redis)" -ForegroundColor Gray
Write-Host ""
Write-Host "  📝 " -NoNewline -ForegroundColor White
Write-Host "apps/web/.env.local" -ForegroundColor Cyan
Write-Host "     NEXT_PUBLIC_INSFORGE_BASE_URL     (your InsForge project URL)" -ForegroundColor Gray
Write-Host "     NEXT_PUBLIC_INSFORGE_ANON_KEY     (from InsForge metadata — must match bot)" -ForegroundColor Gray
Write-Host ""
Write-Host "  🐳 Local Redis starts automatically when you run: " -NoNewline -ForegroundColor White
Write-Host "nezuko dev" -ForegroundColor Green
Write-Host ""
Write-Host "  📋 Log: " -NoNewline -ForegroundColor Gray
Write-Host (Get-LogPath) -ForegroundColor DarkGray
Write-Host ""

Set-Location $ProjectRoot
