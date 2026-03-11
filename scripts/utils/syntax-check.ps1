#Requires -Version 5.1

<#
.SYNOPSIS
    PS syntax check for all rewritten Nezuko scripts (no hardcoded paths).
.DESCRIPTION
    Dynamically locates scripts relative to this file's location and
    checks each one with the PowerShell parser. Exit code 0 = all pass.
.EXAMPLE
    .\syntax-check.ps1
#>

[CmdletBinding()]
param()

# Resolve project root dynamically from this file's location (scripts/utils/)
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$ScriptRoot = Resolve-Path (Join-Path $ScriptDir "..")

$targets = @(
    'core\utils.ps1',
    'core\menu.ps1',
    'dev\stop.ps1',
    'dev\start.ps1',
    'utils\clean.ps1',
    'setup\install.ps1',
    'utils\generate-key.ps1'
)

$failed = 0

foreach ($rel in $targets) {
    $fullPath = Join-Path $ScriptRoot $rel

    if (-not (Test-Path $fullPath)) {
        Write-Host "SKIP  $rel (file not found)" -ForegroundColor Yellow
        continue
    }

    $tokens    = $null
    $parseErrs = $null
    $null = [System.Management.Automation.Language.Parser]::ParseFile(
        $fullPath, [ref]$tokens, [ref]$parseErrs
    )

    if ($parseErrs.Count -gt 0) {
        Write-Host "FAIL  $rel" -ForegroundColor Red
        foreach ($e in $parseErrs) {
            Write-Host "      Line $($e.Extent.StartLineNumber) Col $($e.Extent.StartColumnNumber): $($e.Message)" -ForegroundColor Yellow
        }
        $failed++
    }
    else {
        Write-Host "OK    $rel" -ForegroundColor Green
    }
}

Write-Host ""
if ($failed -eq 0) {
    Write-Host "All files parse cleanly!" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "$failed file(s) have parse errors." -ForegroundColor Red
    exit 1
}
