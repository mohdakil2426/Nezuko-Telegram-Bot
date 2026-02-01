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
# Step 2: Create Virtual Environment
# ============================================================

if (-not $SkipPython) {
    Write-Step -Step "2/6" -Message "Creating Python virtual environment..."
    Write-Log -Message "Step 2/6: Creating Python virtual environment" -Category "PYTHON"
    
    $venvPath = Get-VenvPath
    $pyvenvCfg = Join-Path $venvPath "pyvenv.cfg"
    
    # Check if venv exists AND is valid (has pyvenv.cfg)
    $venvIsValid = (Test-Path $venvPath) -and (Test-Path $pyvenvCfg)
    
    if ($venvIsValid -and -not $Force) {
        Write-Info "Virtual environment already exists. Use -Force to recreate."
        Write-Log -Message "Venv already exists, skipping creation" -Category "PYTHON"
    }
    else {
        # Remove corrupted or existing venv if present
        if (Test-Path $venvPath) {
            Write-Host "        Removing corrupted/existing .venv..." -ForegroundColor Gray
            Remove-Item -Path $venvPath -Recurse -Force -ErrorAction SilentlyContinue
            Write-Log -Message "Removed existing .venv" -Category "PYTHON"
        }
        
        Push-Location $ProjectRoot
        # Use py -3 which is more reliable on Windows than python command
        Write-Log -Message "COMMAND: py -3 -m venv .venv" -Category "PYTHON"
        $venvOutput = py -3 -m venv .venv 2>&1
        Write-Log -Message "OUTPUT: $venvOutput" -Category "PYTHON"
        Pop-Location
        
        # Verify venv was created properly
        if ((Test-Path $venvPath) -and (Test-Path $pyvenvCfg)) {
            Write-Success "Virtual environment created at .venv"
            Write-Log -Message "Virtual environment created successfully" -Level "SUCCESS" -Category "PYTHON"
        }
        else {
            Write-Failure "Failed to create virtual environment"
            Write-Log -Message "Failed to create virtual environment" -Level "ERROR" -Category "PYTHON"
            exit 1
        }
    }
    
    # ============================================================
    # Step 3: Install Python Dependencies
    # ============================================================
    
    Write-Step -Step "3/6" -Message "Installing Python dependencies..."
    Write-Log -Message "Step 3/6: Installing Python dependencies" -Category "PYTHON"
    
    $venvPython = Get-VenvPython
    
    # Verify venv python exists
    if (-not (Test-Path $venvPython)) {
        Write-Failure "Virtual environment Python not found at $venvPython"
        Write-Log -Message "Venv Python not found" -Level "ERROR" -Category "PYTHON"
        exit 1
    }
    
    # Upgrade pip first
    Write-Host ""
    Write-Host "        Upgrading pip..." -ForegroundColor Gray
    Write-Log -Message "COMMAND: pip install --upgrade pip" -Category "PYTHON"
    & $venvPython -m pip install --upgrade pip 2>&1 | ForEach-Object {
        $line = [string]$_
        Write-Host "        $line" -ForegroundColor DarkGray
        if ($line -and $line.Trim()) {
            Write-Log -Message $line -Category "PYTHON"
        }
    }
    
    # Install requirements (root requirements.txt includes all dependencies)
    # Use --prefer-binary to avoid needing C++ build tools for packages like pyroaring
    $requirementsFile = Join-Path $ProjectRoot "requirements.txt"
    
    if (Test-Path $requirementsFile) {
        Write-Host ""
        Write-Host "        Installing requirements.txt (all dependencies)..." -ForegroundColor Cyan
        Write-Host "        Using --prefer-binary to avoid build issues..." -ForegroundColor Gray
        Write-Log -Message "COMMAND: pip install --prefer-binary -r requirements.txt" -Category "PYTHON"
        
        # Capture pip output to check for pyroaring error
        $pipOutput = & $venvPython -m pip install --prefer-binary -r $requirementsFile 2>&1
        $pipExitCode = $LASTEXITCODE
        
        # Display output
        $pipOutput | ForEach-Object {
            $line = [string]$_
            if ($line -match "^(Installing|Collecting|Requirement|Successfully|WARNING|ERROR|Failed)" -or $line -match "already satisfied") {
                Write-Host "        $line" -ForegroundColor DarkGray
            }
            if ($line -and $line.Trim()) {
                Write-Log -Message $line -Category "PYTHON"
            }
        }
        
        # Check if pyroaring failed - if so, use the standalone supabase installer
        $pyroaringFailed = ($pipOutput | Out-String) -match "pyroaring|Failed building wheel"
        
        if ($pipExitCode -ne 0 -and $pyroaringFailed) {
            Write-Host ""
            Write-Host "        ⚠️  pyroaring build failed (requires C++ build tools)" -ForegroundColor Yellow
            Write-Host "        Running standalone Supabase installer..." -ForegroundColor Cyan
            Write-Log -Message "Running standalone Supabase installer" -Category "PYTHON"
            
            # Call the standalone supabase installer script
            $supabaseInstaller = Join-Path $ScriptRoot "install-supabase.ps1"
            if (Test-Path $supabaseInstaller) {
                & $supabaseInstaller -VenvPath $venvPath -Force
                $supabaseExitCode = $LASTEXITCODE
                
                if ($supabaseExitCode -eq 0) {
                    Write-Log -Message "Supabase installed via standalone installer" -Level "SUCCESS" -Category "PYTHON"
                    
                    # Now install remaining packages from individual requirement files (skip base.txt which has supabase)
                    Write-Host ""
                    Write-Host "        Installing remaining packages (skipping supabase)..." -ForegroundColor Gray
                    
                    $reqFiles = @(
                        (Join-Path $ProjectRoot "requirements\api.txt"),
                        (Join-Path $ProjectRoot "requirements\bot.txt"),
                        (Join-Path $ProjectRoot "requirements\dev.txt")
                    )
                    
                    foreach ($reqFile in $reqFiles) {
                        if (Test-Path $reqFile) {
                            $fileName = Split-Path $reqFile -Leaf
                            Write-Host "        Installing $fileName..." -ForegroundColor DarkGray
                            & $venvPython -m pip install --prefer-binary -r $reqFile 2>&1 | Out-Null
                        }
                    }
                    
                    # Install base.txt packages individually (excluding supabase)
                    Write-Host "        Installing base packages (excluding supabase)..." -ForegroundColor DarkGray
                    $basePackages = @(
                        "sqlalchemy[asyncio]>=2.0.46",
                        "asyncpg>=0.31.0",
                        "aiosqlite>=0.22.1",
                        "alembic>=1.18.3",
                        "redis>=7.1.0",
                        "pyjwt>=2.11.0",
                        "aiohttp>=3.13.3",
                        "pydantic>=2.12.5",
                        "pydantic-settings>=2.12.0",
                        "python-dotenv>=1.2.1",
                        "structlog>=25.5.0",
                        "prometheus-client>=0.24.1",
                        "sentry-sdk>=2.51.0"
                    )
                    foreach ($pkg in $basePackages) {
                        & $venvPython -m pip install --prefer-binary $pkg 2>&1 | Out-Null
                    }
                    
                    Write-Success "All Python dependencies installed (with supabase workaround)"
                    Write-Log -Message "Installed with supabase workaround" -Level "SUCCESS" -Category "PYTHON"
                }
                else {
                    Write-Failure "Supabase installation failed"
                    Write-Log -Message "Supabase installer failed" -Level "ERROR" -Category "PYTHON"
                }
            }
            else {
                Write-Failure "Supabase installer not found at: $supabaseInstaller"
                Write-Log -Message "install-supabase.ps1 not found" -Level "ERROR" -Category "PYTHON"
            }
        }
        elseif ($pipExitCode -eq 0) {
            Write-Success "All Python dependencies installed"
            Write-Log -Message "Installed from requirements.txt" -Level "SUCCESS" -Category "PYTHON"
        }
        else {
            Write-Failure "Some dependencies failed to install (exit code: $pipExitCode)"
            Write-Log -Message "pip install failed with exit code: $pipExitCode" -Level "ERROR" -Category "PYTHON"
            Write-Host "        You may need to install Microsoft C++ Build Tools" -ForegroundColor Yellow
            Write-Host "        https://visualstudio.microsoft.com/visual-cpp-build-tools/" -ForegroundColor Gray
        }
    }
    else {
        Write-Failure "requirements.txt not found"
        Write-Log -Message "requirements.txt not found" -Level "ERROR" -Category "PYTHON"
        exit 1
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
    Write-Log -Message "Step 4/6: Installing Node.js dependencies" -Category "NODE"
    
    Write-Host ""
    Write-Host "        Running bun install..." -ForegroundColor Cyan
    
    Push-Location $ProjectRoot
    Write-Log -Message "COMMAND: bun install" -Category "NODE"
    
    # Stream bun output to terminal
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
        Write-Success "Node.js packages installed"
        Write-Log -Message "Node.js packages installed successfully" -Level "SUCCESS" -Category "NODE"
    }
    else {
        Write-Failure "Failed to install Node.js packages"
        Write-Log -Message "Failed to install Node.js packages (exit code: $bunExitCode)" -Level "ERROR" -Category "NODE"
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
Write-Host "  📋 Log file: " -NoNewline -ForegroundColor Gray
Write-Host (Get-LogPath) -ForegroundColor DarkGray
Write-Host ""
