#Requires -Version 5.1

<#
.SYNOPSIS
    Safely removes build artifacts, caches, and dependency folders.
.DESCRIPTION
    This script removes ONLY:
    - node_modules folders at SPECIFIC whitelisted locations
    - Python __pycache__ folders (everywhere)
    - Build caches (.ruff_cache, .pytest_cache, .mypy_cache, htmlcov)
    - Next.js build artifacts (.next, .turbo)
    - Python .venv folder at project root (only with -IncludeVenv flag)
    
    PROTECTED (never deleted):
    - .vscode folders (editor settings)
    - .env files (credentials)
    - Source code and config files
.PARAMETER IncludeVenv
    Also removes the Python virtual environment (.venv).
.PARAMETER DryRun
    Shows what would be deleted without actually deleting.
.EXAMPLE
    .\clean.ps1
    Removes caches, __pycache__, and node_modules.
.EXAMPLE
    .\clean.ps1 -IncludeVenv
    Also removes .venv folder.
.EXAMPLE
    .\clean.ps1 -DryRun
    Preview mode - shows what would be deleted.
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [switch]$IncludeVenv,
    [switch]$DryRun
)

# Import utilities for logging
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$ScriptDir\..\core\utils.ps1"

$ProjectRoot = Get-ProjectRoot

# Initialize logging
Initialize-LogSystem
Write-LogSection -Title "NEZUKO CLEAN STARTED"
Write-Log -Message "Project Root: $ProjectRoot" -Category "CLEAN"
Write-Log -Message "IncludeVenv: $IncludeVenv" -Category "CLEAN"
Write-Log -Message "DryRun: $DryRun" -Category "CLEAN"

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   Nezuko Build Artifact Cleaner" -ForegroundColor Yellow
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "  [DRY RUN] Nothing will be deleted" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================
# STRICT WHITELIST - node_modules paths
# ============================================================

$allowedNodeModulePaths = @(
    "node_modules",
    "apps\web\node_modules",
    "apps\bot\node_modules",
    "packages\types\node_modules",
    "packages\config\node_modules"
)

# ============================================================
# Cache directories to clean (relative paths)
# ============================================================

$cachePaths = @(
    # Python caches
    "apps\bot\.ruff_cache",
    "apps\bot\.pytest_cache",
    "apps\bot\.mypy_cache",
    # Next.js / Turborepo caches
    "apps\web\.next",
    "apps\web\.turbo",
    # Root level caches
    ".ruff_cache",
    ".pytest_cache",
    ".mypy_cache",
    ".turbo"
)

# Helper function to remove a directory
function Remove-CacheDirectory {
    param(
        [string]$RelativePath,
        [string]$FullPath,
        [switch]$DryRun
    )
    
    if (Test-Path $FullPath -PathType Container) {
        if ($DryRun) {
            Write-Host "        [WOULD DELETE] $RelativePath" -ForegroundColor Gray
            Write-Log -Message "[DRY RUN] Would delete: $RelativePath" -Category "CLEAN"
        }
        else {
            Write-Host "        Removing $RelativePath..." -ForegroundColor Gray
            Write-Log -Message "Removing: $RelativePath" -Category "CLEAN"
            Remove-Item -Path $FullPath -Recurse -Force -ErrorAction SilentlyContinue
            Write-Log -Message "Removed: $RelativePath" -Level "SUCCESS" -Category "CLEAN"
        }
        return $true
    }
    return $false
}

# ============================================================
# Step 1: Remove __pycache__ folders (recursive)
# ============================================================

Write-Host "  [1/4] Removing Python __pycache__..." -ForegroundColor Blue
Write-Log -Message "Step 1/4: Removing __pycache__ folders" -Category "CLEAN"

$pycacheCount = 0
$pycacheDirs = Get-ChildItem -Path $ProjectRoot -Directory -Recurse -Filter "__pycache__" -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notlike "*\.venv\*" -and $_.FullName -notlike "*\node_modules\*" }

foreach ($dir in $pycacheDirs) {
    $relativePath = $dir.FullName.Replace($ProjectRoot, "").TrimStart("\")
    if (Remove-CacheDirectory -RelativePath $relativePath -FullPath $dir.FullName -DryRun:$DryRun) {
        $pycacheCount++
    }
}

if ($pycacheCount -eq 0) {
    Write-Host "        No __pycache__ folders found." -ForegroundColor Gray
    Write-Log -Message "No __pycache__ folders found" -Category "CLEAN"
}
else {
    Write-Host "        Removed $pycacheCount folder(s)." -ForegroundColor Green
    Write-Log -Message "Removed $pycacheCount __pycache__ folder(s)" -Level "SUCCESS" -Category "CLEAN"
}

# ============================================================
# Step 2: Remove build caches (whitelisted paths)
# ============================================================

Write-Host ""
Write-Host "  [2/4] Removing build caches..." -ForegroundColor Blue
Write-Log -Message "Step 2/4: Removing build caches" -Category "CLEAN"

$cacheCount = 0

foreach ($relativePath in $cachePaths) {
    $fullPath = Join-Path $ProjectRoot $relativePath
    if (Remove-CacheDirectory -RelativePath $relativePath -FullPath $fullPath -DryRun:$DryRun) {
        $cacheCount++
    }
}

if ($cacheCount -eq 0) {
    Write-Host "        No build caches found." -ForegroundColor Gray
    Write-Log -Message "No build caches found" -Category "CLEAN"
}
else {
    Write-Host "        Removed $cacheCount cache folder(s)." -ForegroundColor Green
    Write-Log -Message "Removed $cacheCount cache folder(s)" -Level "SUCCESS" -Category "CLEAN"
}

# ============================================================
# Step 3: Remove node_modules (whitelisted paths only)
# ============================================================

Write-Host ""
Write-Host "  [3/4] Removing node_modules..." -ForegroundColor Blue
Write-Log -Message "Step 3/4: Removing node_modules" -Category "CLEAN"

$nodeCount = 0

foreach ($relativePath in $allowedNodeModulePaths) {
    $fullPath = Join-Path $ProjectRoot $relativePath
    
    # Verify it's actually a node_modules directory
    if ((Test-Path $fullPath -PathType Container) -and ($relativePath -like "*node_modules")) {
        if (Remove-CacheDirectory -RelativePath $relativePath -FullPath $fullPath -DryRun:$DryRun) {
            $nodeCount++
        }
    }
}

if ($nodeCount -eq 0) {
    Write-Host "        No node_modules found." -ForegroundColor Gray
    Write-Log -Message "No node_modules found" -Category "CLEAN"
}
else {
    Write-Host "        Removed $nodeCount folder(s)." -ForegroundColor Green
    Write-Log -Message "Removed $nodeCount node_modules folder(s)" -Level "SUCCESS" -Category "CLEAN"
}

# ============================================================
# Step 4: Remove .venv (only if explicitly requested)
# ============================================================

Write-Host ""
Write-Host "  [4/4] Python virtual environment..." -ForegroundColor Yellow

$venvPath = Join-Path $ProjectRoot ".venv"

if ($IncludeVenv) {
    Write-Log -Message "IncludeVenv flag set - checking .venv" -Category "CLEAN"
    if (Test-Path $venvPath -PathType Container) {
        if ($DryRun) {
            Write-Host "        [WOULD DELETE] .venv" -ForegroundColor Gray
            Write-Log -Message "[DRY RUN] Would delete: .venv" -Category "CLEAN"
        }
        else {
            Write-Host "        Removing .venv..." -ForegroundColor Gray
            Write-Log -Message "Removing: .venv" -Category "CLEAN"
            Remove-Item -Path $venvPath -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "        Done." -ForegroundColor Green
            Write-Log -Message "Removed: .venv" -Level "SUCCESS" -Category "CLEAN"
        }
    }
    else {
        Write-Host "        .venv not found." -ForegroundColor Gray
        Write-Log -Message ".venv not found" -Category "CLEAN"
    }
}
else {
    Write-Host "        Skipped. Use -IncludeVenv to remove." -ForegroundColor Gray
}

# ============================================================
# Summary
# ============================================================

Write-LogSection -Title "NEZUKO CLEAN COMPLETED"
Write-Log -Message "Clean operation completed" -Level "SUCCESS" -Category "CLEAN"

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   Complete!" -ForegroundColor Green
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  📋 Log file: " -NoNewline -ForegroundColor Gray
Write-Host (Get-LogPath) -ForegroundColor DarkGray
Write-Host ""
Write-Host "  PROTECTED (never deleted):" -ForegroundColor DarkGray
Write-Host "    ✓ .vscode, .env files, source code" -ForegroundColor DarkGray
Write-Host ""
