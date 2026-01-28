#Requires -Version 5.1

<#
.SYNOPSIS
    Safely removes ONLY node_modules and Python .venv.
.DESCRIPTION
    This script removes ONLY:
    - node_modules folders at SPECIFIC whitelisted locations
    - Python .venv folder at project root (only with -IncludeVenv flag)
    
    NOTHING ELSE IS EVER DELETED.
    NO source code, config files, or any other files are touched.
.PARAMETER IncludeVenv
    Also removes the Python virtual environment (.venv).
.PARAMETER DryRun
    Shows what would be deleted without actually deleting.
.EXAMPLE
    .\clean.ps1
    Removes only node_modules folders.
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
Write-Host "   Nezuko Module Cleaner" -ForegroundColor Yellow
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "  [DRY RUN] Nothing will be deleted" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================
# STRICT WHITELIST - ONLY these exact paths can be deleted
# These are all node_modules folders - nothing else
# ============================================================

$allowedNodeModulePaths = @(
    "node_modules",
    "apps\web\node_modules",
    "apps\api\node_modules", 
    "apps\bot\node_modules",
    "packages\types\node_modules",
    "packages\config\node_modules"
)

# ============================================================
# Step 1: Remove node_modules (whitelisted paths only)
# ============================================================

Write-Host "  [1/2] Removing node_modules..." -ForegroundColor Blue
Write-Log -Message "Step 1/2: Removing node_modules" -Category "CLEAN"

$removedCount = 0

foreach ($relativePath in $allowedNodeModulePaths) {
    $fullPath = Join-Path $ProjectRoot $relativePath
    
    # Verify it's actually a node_modules directory
    if ((Test-Path $fullPath -PathType Container) -and ($relativePath -like "*node_modules")) {
        if ($DryRun) {
            Write-Host "        [WOULD DELETE] $relativePath" -ForegroundColor Gray
            Write-Log -Message "[DRY RUN] Would delete: $relativePath" -Category "CLEAN"
        }
        else {
            Write-Host "        Removing $relativePath..." -ForegroundColor Gray
            Write-Log -Message "Removing: $relativePath" -Category "CLEAN"
            Remove-Item -Path $fullPath -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "        Done." -ForegroundColor Green
            Write-Log -Message "Removed: $relativePath" -Level "SUCCESS" -Category "CLEAN"
        }
        $removedCount++
    }
}

if ($removedCount -eq 0) {
    Write-Host "        No node_modules found." -ForegroundColor Gray
    Write-Log -Message "No node_modules found" -Category "CLEAN"
}
else {
    Write-Host "        Removed $removedCount folder(s)." -ForegroundColor Green
    Write-Log -Message "Removed $removedCount node_modules folder(s)" -Level "SUCCESS" -Category "CLEAN"
}

# ============================================================
# Step 2: Remove .venv (only if explicitly requested)
# ============================================================

Write-Host ""
Write-Host "  [2/2] Python virtual environment..." -ForegroundColor Yellow

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
