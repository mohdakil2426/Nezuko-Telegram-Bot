#Requires -Version 5.1

<#
.SYNOPSIS
    Safely removes build artifacts, caches, and dependency folders.
.DESCRIPTION
    This script removes ONLY:
    - node_modules folders at SPECIFIC whitelisted locations (apps/web, apps/grammy)
    - Next.js build artifacts (.next, .turbo)
    - Bot build artifacts (dist)
    - Various development caches
    
    PROTECTED (never deleted):
    - .vscode folders (editor settings)
    - .env files (credentials)
    - Source code and config files
.PARAMETER DryRun
    Shows what would be deleted without actually deleting.
.EXAMPLE
    .\clean.ps1
    Removes caches and node_modules.
.EXAMPLE
    .\clean.ps1 -DryRun
    Preview mode - shows what would be deleted.
#>

[CmdletBinding(SupportsShouldProcess)]
param(
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
    "apps\grammy\node_modules",
    "packages\types\node_modules",
    "packages\config\node_modules"
)

# ============================================================
# Cache directories to clean (relative paths)
# ============================================================

$cachePaths = @(
    # Node/Web caches
    "apps\web\.next",
    "apps\web\.turbo",
    # Bot artifacts
    "apps\grammy\dist",
    "apps\grammy\.turbo",
    # Root level caches
    ".turbo",
    ".next"
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
# Step 1: Remove build caches (whitelisted paths)
# ============================================================

Write-Host "  [1/2] Removing build caches..." -ForegroundColor Blue
Write-Log -Message "Step 1/2: Removing build caches" -Category "CLEAN"

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
# Step 2: Remove node_modules (whitelisted paths only)
# ============================================================

Write-Host ""
Write-Host "  [2/2] Removing node_modules..." -ForegroundColor Blue
Write-Log -Message "Step 2/2: Removing node_modules" -Category "CLEAN"

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
