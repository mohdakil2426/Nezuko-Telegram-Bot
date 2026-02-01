<#
.SYNOPSIS
    Supabase Python SDK Installer - Handles problematic dependencies
    
.DESCRIPTION
    This script installs the Supabase Python SDK while handling the known issue where:
    supabase -> storage3 -> pyiceberg -> pyroaring
    
    pyroaring requires C++ build tools to compile from source, and prebuilt wheels
    may not exist for newer Python versions (like 3.14).
    
    This script works around this by:
    1. First attempting normal installation with --prefer-binary
    2. If pyroaring fails, installing supabase with --no-deps
    3. Manually installing required sub-packages (excluding storage3)
    
.PARAMETER VenvPath
    Path to the virtual environment. Defaults to .venv in project root.
    
.PARAMETER Force
    Skip the initial attempt and go straight to workaround installation.
    
.PARAMETER Verbose
    Show detailed output during installation.

.EXAMPLE
    .\install-supabase.ps1
    
.EXAMPLE
    .\install-supabase.ps1 -Force -Verbose
    
.NOTES
    Author: Nezuko Bot Team
    Version: 1.0.0
    Last Updated: 2026-01-31
    
    Compatible with:
    - Windows (PowerShell 5.1+ / PowerShell Core 7+)
    - macOS (PowerShell Core 7+)
    - Linux (PowerShell Core 7+)
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$VenvPath,
    
    [Parameter()]
    [switch]$Force,
    
    [Parameter()]
    [switch]$Quiet
)

# ============================================================
# Configuration
# ============================================================

$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptRoot)

# Supabase version to install
$SUPABASE_VERSION = "2.27.2"

# Core supabase dependencies (excluding storage3 which causes the pyroaring issue)
# These are the packages that supabase imports and uses
$SUPABASE_CORE_DEPS = @(
    "postgrest>=0.16.0",
    "realtime>=2.0.0",
    "gotrue>=2.0.0",           # Also known as supabase-auth
    "httpx>=0.26.0",
    "pydantic>=2.0.0",
    "python-dateutil",
    "websockets>=10.0"
)

# Optional supabase sub-packages (install if available, skip if not)
$SUPABASE_OPTIONAL_DEPS = @(
    "supabase-auth",
    "supabase-functions"
)

# ============================================================
# Helper Functions
# ============================================================

function Write-Status {
    param(
        [string]$Message,
        [string]$Type = "INFO"
    )
    
    if ($Quiet -and $Type -eq "INFO") { return }
    
    $color = switch ($Type) {
        "SUCCESS" { "Green" }
        "ERROR"   { "Red" }
        "WARN"    { "Yellow" }
        "INFO"    { "Cyan" }
        default   { "White" }
    }
    
    $prefix = switch ($Type) {
        "SUCCESS" { "✅" }
        "ERROR"   { "❌" }
        "WARN"    { "⚠️" }
        "INFO"    { "ℹ️" }
        default   { "•" }
    }
    
    Write-Host "  $prefix $Message" -ForegroundColor $color
}

function Get-PythonExecutable {
    param([string]$VenvPath)
    
    if ($IsWindows -or $env:OS -match "Windows") {
        return Join-Path $VenvPath "Scripts\python.exe"
    }
    else {
        return Join-Path $VenvPath "bin/python"
    }
}

function Get-PipExecutable {
    param([string]$VenvPath)
    
    if ($IsWindows -or $env:OS -match "Windows") {
        return Join-Path $VenvPath "Scripts\pip.exe"
    }
    else {
        return Join-Path $VenvPath "bin/pip"
    }
}

function Test-SupabaseInstalled {
    param([string]$PythonExe)
    
    try {
        $result = & $PythonExe -c "import supabase; print(supabase.__version__)" 2>&1
        if ($LASTEXITCODE -eq 0) {
            return $result.Trim()
        }
    }
    catch { }
    
    return $null
}

function Test-PyroaringBuildError {
    param([string]$Output)
    
    $errorPatterns = @(
        "pyroaring",
        "Failed building wheel",
        "Microsoft Visual C\+\+ 14.0",
        "failed-wheel-build"
    )
    
    foreach ($pattern in $errorPatterns) {
        if ($Output -match $pattern) {
            return $true
        }
    }
    
    return $false
}

# ============================================================
# Main Installation Logic
# ============================================================

function Install-SupabaseNormal {
    param([string]$PipExe)
    
    Write-Status "Attempting normal installation: supabase>=$SUPABASE_VERSION" "INFO"
    
    $output = & $PipExe install --prefer-binary "supabase>=$SUPABASE_VERSION" 2>&1 | Out-String
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Status "Supabase installed successfully via normal method" "SUCCESS"
        return $true
    }
    
    if (Test-PyroaringBuildError -Output $output) {
        Write-Status "pyroaring build failed - C++ build tools required" "WARN"
        Write-Status "Falling back to workaround installation..." "INFO"
        return $false
    }
    
    Write-Status "Installation failed with unknown error" "ERROR"
    Write-Host $output -ForegroundColor DarkGray
    return $false
}

function Install-SupabaseWorkaround {
    param([string]$PipExe)
    
    Write-Status "Using workaround: Installing supabase without storage3" "INFO"
    
    # Step 1: Uninstall any existing broken installation
    Write-Status "Step 1/4: Cleaning up existing installation..." "INFO"
    & $PipExe uninstall -y supabase storage3 pyiceberg pyroaring 2>&1 | Out-Null
    
    # Step 2: Install supabase without dependencies
    Write-Status "Step 2/4: Installing supabase (no-deps)..." "INFO"
    $output = & $PipExe install --no-deps "supabase>=$SUPABASE_VERSION" 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) {
        Write-Status "Failed to install supabase --no-deps" "ERROR"
        Write-Host $output -ForegroundColor DarkGray
        return $false
    }
    
    # Step 3: Install core dependencies (excluding storage3)
    Write-Status "Step 3/4: Installing core dependencies..." "INFO"
    foreach ($dep in $SUPABASE_CORE_DEPS) {
        $depName = ($dep -split "[<>=]")[0]
        Write-Host "        Installing $depName..." -ForegroundColor DarkGray
        $output = & $PipExe install --prefer-binary $dep 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) {
            Write-Status "Warning: Failed to install $depName" "WARN"
        }
    }
    
    # Step 4: Install optional sub-packages (may fail, that's OK)
    Write-Status "Step 4/4: Installing optional sub-packages..." "INFO"
    foreach ($dep in $SUPABASE_OPTIONAL_DEPS) {
        Write-Host "        Installing $dep..." -ForegroundColor DarkGray
        & $PipExe install --prefer-binary --quiet $dep 2>&1 | Out-Null
        # Don't check exit code - these are optional
    }
    
    Write-Status "Supabase installed successfully (without storage3)" "SUCCESS"
    Write-Status "Note: File storage features are disabled" "WARN"
    return $true
}

# ============================================================
# Main Entry Point
# ============================================================

function Main {
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════╗" -ForegroundColor Magenta
    Write-Host "  ║         Supabase Python SDK Installer                ║" -ForegroundColor Magenta
    Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor Magenta
    Write-Host ""
    
    # Determine venv path
    if (-not $VenvPath) {
        $VenvPath = Join-Path $ProjectRoot ".venv"
    }
    
    # Validate venv exists
    $pyvenvCfg = Join-Path $VenvPath "pyvenv.cfg"
    if (-not (Test-Path $pyvenvCfg)) {
        Write-Status "Virtual environment not found at: $VenvPath" "ERROR"
        Write-Status "Run the setup script first to create the virtual environment" "INFO"
        return $false
    }
    
    # Get pip executable
    $pipExe = Get-PipExecutable -VenvPath $VenvPath
    if (-not (Test-Path $pipExe)) {
        Write-Status "pip not found at: $pipExe" "ERROR"
        return $false
    }
    
    # Get python executable
    $pythonExe = Get-PythonExecutable -VenvPath $VenvPath
    
    Write-Status "Virtual environment: $VenvPath" "INFO"
    Write-Status "Target version: supabase>=$SUPABASE_VERSION" "INFO"
    
    # Check if already installed
    $installedVersion = Test-SupabaseInstalled -PythonExe $pythonExe
    if ($installedVersion -and -not $Force) {
        Write-Status "Supabase already installed: v$installedVersion" "SUCCESS"
        return $true
    }
    
    # Attempt installation
    $success = $false
    
    if ($Force) {
        # Skip normal attempt, go straight to workaround
        $success = Install-SupabaseWorkaround -PipExe $pipExe
    }
    else {
        # Try normal installation first
        $success = Install-SupabaseNormal -PipExe $pipExe
        
        if (-not $success) {
            # Fall back to workaround
            $success = Install-SupabaseWorkaround -PipExe $pipExe
        }
    }
    
    # Verify installation
    if ($success) {
        $installedVersion = Test-SupabaseInstalled -PythonExe $pythonExe
        if ($installedVersion) {
            Write-Host ""
            Write-Status "Installation verified: supabase v$installedVersion" "SUCCESS"
        }
        else {
            Write-Status "Warning: Installation completed but import test failed" "WARN"
        }
    }
    
    Write-Host ""
    return $success
}

# Run main
$result = Main
exit $(if ($result) { 0 } else { 1 })
