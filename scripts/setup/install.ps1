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

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   🦊 Nezuko Project Setup" -ForegroundColor Yellow
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# Step 1: Check Prerequisites
# ============================================================

Write-Step -Step "1/6" -Message "Checking prerequisites..."

if (-not (Test-Prerequisites)) {
    Write-Host ""
    Write-Host "  ❌ Prerequisites check failed. Please install missing tools." -ForegroundColor Red
    Write-Host ""
    exit 1
}

# ============================================================
# Step 2: Create Virtual Environment
# ============================================================

if (-not $SkipPython) {
    Write-Step -Step "2/6" -Message "Creating Python virtual environment..."
    
    $venvPath = Get-VenvPath
    
    if ((Test-Path $venvPath) -and -not $Force) {
        Write-Info "Virtual environment already exists. Use -Force to recreate."
    }
    else {
        if (Test-Path $venvPath) {
            Remove-Item -Path $venvPath -Recurse -Force
        }
        
        Push-Location $ProjectRoot
        python -m venv .venv
        Pop-Location
        
        if (Test-Path $venvPath) {
            Write-Success "Virtual environment created at .venv"
        }
        else {
            Write-Failure "Failed to create virtual environment"
            exit 1
        }
    }
    
    # ============================================================
    # Step 3: Install Python Dependencies
    # ============================================================
    
    Write-Step -Step "3/6" -Message "Installing Python dependencies..."
    
    $venvPython = Get-VenvPython
    
    # Upgrade pip first
    & $venvPython -m pip install --upgrade pip --quiet
    
    # Install requirements
    $requirementsFiles = @(
        (Join-Path $ProjectRoot "requirements.txt"),
        (Join-Path $ProjectRoot "apps\api\requirements.txt")
    )
    
    foreach ($reqFile in $requirementsFiles) {
        if (Test-Path $reqFile) {
            & $venvPython -m pip install -r $reqFile --quiet
            Write-Success "Installed from $(Split-Path -Leaf $reqFile)"
        }
    }
}
else {
    Write-Step -Step "2/6" -Message "Skipping Python setup (--SkipPython)"
    Write-Step -Step "3/6" -Message "Skipping Python dependencies (--SkipPython)"
}

# ============================================================
# Step 4: Install Node.js Dependencies
# ============================================================

if (-not $SkipNode) {
    Write-Step -Step "4/6" -Message "Installing Node.js dependencies (Bun)..."
    
    Push-Location $ProjectRoot
    bun install 2>&1 | Out-Null
    Pop-Location
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Node.js packages installed"
    }
    else {
        Write-Failure "Failed to install Node.js packages"
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
    @{ Dir = "apps\api"; EnvFile = ".env"; Example = ".env.example" },
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
# Step 6: Create Storage Directories
# ============================================================

Write-Step -Step "6/6" -Message "Creating storage directories..."

$storageDirs = @(
    "storage\logs",
    "storage\data",
    "storage\cache"
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
Write-Host "apps/web/.env.local" -ForegroundColor Cyan
Write-Host "     - NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Gray
Write-Host "     - NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "  📝 " -NoNewline -ForegroundColor White
Write-Host "apps/api/.env" -ForegroundColor Cyan
Write-Host "     - SUPABASE_URL, SUPABASE_ANON_KEY" -ForegroundColor Gray
Write-Host "     - Set MOCK_AUTH=true for local dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  📝 " -NoNewline -ForegroundColor White
Write-Host "apps/bot/.env" -ForegroundColor Cyan
Write-Host "     - BOT_TOKEN (from @BotFather)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Then run: " -NoNewline
Write-Host "nezuko dev" -ForegroundColor Green
Write-Host ""
