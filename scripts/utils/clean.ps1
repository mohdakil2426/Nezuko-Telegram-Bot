#Requires -Version 5.1

<#
.SYNOPSIS
    Removes Nezuko build artifacts, caches, and dependency folders.
.DESCRIPTION
    Always stops running processes first to release file locks, then:

    Without -CachesOnly (default):
      • Deletes build caches (.next, dist, .turbo)
      • Deletes node_modules in apps/web and apps/grammy
      • Reinstalls dependencies with bun install

    With -CachesOnly:
      • Deletes only build caches — node_modules are preserved and NOT reinstalled.

    PROTECTED (never deleted): .env files, source code, .vscode, .git
.PARAMETER CachesOnly
    When set, only cache folders are removed. node_modules stay intact.
.PARAMETER DryRun
    Shows what would be deleted without deleting anything.
.EXAMPLE
    .\clean.ps1
    Full clean: caches + node_modules + reinstall.
.EXAMPLE
    .\clean.ps1 -CachesOnly
    Semi-clean: caches only. node_modules untouched.
.EXAMPLE
    .\clean.ps1 -DryRun
    Preview mode.
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [switch]$CachesOnly,
    [switch]$DryRun
)

# ── Bootstrap ────────────────────────────────────────────────
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$ScriptDir\..\core\utils.ps1"

$ProjectRoot = Get-ProjectRoot

Initialize-LogSystem
Write-LogSection -Title "NEZUKO CLEAN STARTED"
Write-Log "Project Root: $ProjectRoot | CachesOnly: $CachesOnly | DryRun: $DryRun" -Category "CLEAN"

Write-Host ""
Write-Host "  =====================================" -ForegroundColor Cyan
Write-Host "   Nezuko Build Artifact Cleaner" -ForegroundColor Yellow
Write-Host "  =====================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "  [DRY RUN] Nothing will actually be deleted" -ForegroundColor Yellow
    Write-Host ""
}

# ── Step 0: Stop processes that could lock files ─────────────
Write-Host "  [0] Stopping background processes..." -ForegroundColor Blue
Stop-ProjectProcesses

# ============================================================
# Helper: Delete a directory with 3-attempt retry
# ============================================================

function Remove-CacheDir {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$RelPath,
        [Parameter(Mandatory)][string]$FullPath
    )

    if (-not (Test-Path $FullPath -PathType Container)) { return $false }

    if ($DryRun) {
        Write-Host "        [WOULD DELETE] $RelPath" -ForegroundColor Gray
        Write-Log "[DRY RUN] Would delete: $RelPath" -Category "CLEAN"
        return $false
    }

    Write-Host "        Removing $RelPath..." -ForegroundColor Gray
    Write-Log "Removing: $RelPath" -Category "CLEAN"

    for ($attempt = 1; $attempt -le 3; $attempt++) {
        try {
            Remove-Item -Path $FullPath -Recurse -Force -ErrorAction Stop
            Write-Log "Removed: $RelPath" -Level "SUCCESS" -Category "CLEAN"
            return $true
        }
        catch {
            if ($attempt -lt 3) {
                Write-Host "          (Retry $attempt/3 for $RelPath...)" -ForegroundColor Gray
                Start-Sleep -Seconds 1
            }
            else {
                Write-Host "        ⚠️  Failed to remove $RelPath — it may still be in use." -ForegroundColor Yellow
                Write-Log "Failed to remove: $RelPath" -Level "WARN" -Category "CLEAN"
            }
        }
    }

    return $false
}

# ── Step 1: Remove build caches ───────────────────────────────
Write-Host ""
Write-Host "  [1] Removing build caches..." -ForegroundColor Blue
Write-Log "Step 1: Removing build caches" -Category "CLEAN"

$cachePaths = @(
    "apps\web\.next",
    "apps\web\.turbo",
    "apps\grammy\dist",
    "apps\grammy\.turbo",
    ".turbo",
    ".next"
)

$cacheCount = 0
foreach ($rel in $cachePaths) {
    if (Remove-CacheDir -RelPath $rel -FullPath (Join-Path $ProjectRoot $rel)) {
        $cacheCount++
    }
}

if ($cacheCount -eq 0) {
    Write-Host "        No build caches found." -ForegroundColor Gray
}
else {
    Write-Host "        Removed $cacheCount cache folder(s)." -ForegroundColor Green
    Write-Log "Removed $cacheCount cache folder(s)" -Level "SUCCESS" -Category "CLEAN"
}

# ── Step 2: Remove node_modules (skipped when -CachesOnly) ───
if ($CachesOnly) {
    Write-Host ""
    Write-Host "  [2] Skipping node_modules (--CachesOnly)" -ForegroundColor Gray
    Write-Log "Skipping node_modules removal (CachesOnly)" -Category "CLEAN"
}
else {
    Write-Host ""
    Write-Host "  [2] Removing node_modules..." -ForegroundColor Blue
    Write-Log "Step 2: Removing node_modules" -Category "CLEAN"

    $nmPaths = @(
        "node_modules",
        "apps\web\node_modules",
        "apps\grammy\node_modules"
    )

    $nmCount = 0
    foreach ($rel in $nmPaths) {
        $full = Join-Path $ProjectRoot $rel
        if ((Test-Path $full -PathType Container) -and ($rel -like "*node_modules")) {
            if (Remove-CacheDir -RelPath $rel -FullPath $full) {
                $nmCount++
            }
        }
    }

    if ($nmCount -eq 0) {
        Write-Host "        No node_modules found." -ForegroundColor Gray
    }
    else {
        Write-Host "        Removed $nmCount folder(s)." -ForegroundColor Green
        Write-Log "Removed $nmCount node_modules folder(s)" -Level "SUCCESS" -Category "CLEAN"
    }

    # ── Step 3: Reinstall dependencies ────────────────────────
    if (-not $DryRun) {
        Write-Host ""
        Write-Host "  [3] Reinstalling dependencies..." -ForegroundColor Blue
        Write-Log "Step 3: Reinstalling dependencies" -Category "CLEAN"

        foreach ($appPath in @("apps\web", "apps\grammy")) {
            $full = Join-Path $ProjectRoot $appPath

            if (-not (Test-Path $full)) { continue }

            Write-Host ""
            Write-Host "        --- $appPath ---" -ForegroundColor Cyan
            Write-Log "Running bun install in: $appPath" -Category "CLEAN"

            Push-Location $full
            try {
                bun install
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "        ✅ $appPath — installed" -ForegroundColor Green
                    Write-Log "bun install succeeded in $appPath" -Level "SUCCESS" -Category "CLEAN"
                }
                else {
                    Write-Host "        ❌ $appPath — bun install failed (exit $LASTEXITCODE)" -ForegroundColor Red
                    Write-Log "bun install failed in $appPath (exit $LASTEXITCODE)" -Level "ERROR" -Category "CLEAN"
                    Write-Host "        Run 'bun install' manually in $appPath to debug." -ForegroundColor Gray
                }
            }
            catch {
                Write-Host "        ⚠️ $($appPath) — Unexpected error: $($_.Exception.Message)" -ForegroundColor Yellow
                Write-Log "Unexpected failure in $($appPath): $($_.Exception.Message)" -Level "WARN" -Category "CLEAN"
            }
            finally {
                Pop-Location
            }
        }
    }
}

# ── Summary ───────────────────────────────────────────────────
Write-LogSection -Title "NEZUKO CLEAN COMPLETED"
Write-Log "Clean operation completed" -Level "SUCCESS" -Category "CLEAN"

Write-Host ""
Write-Host "  =====================================" -ForegroundColor Cyan
Write-Host "   ✅ Complete!" -ForegroundColor Green
Write-Host "  =====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  📋 Log: " -NoNewline -ForegroundColor Gray
Write-Host (Get-LogPath) -ForegroundColor DarkGray
Write-Host ""
Write-Host "  PROTECTED (never deleted):" -ForegroundColor DarkGray
Write-Host "    ✓ .env files, source code, .vscode, .git" -ForegroundColor DarkGray
Write-Host ""
