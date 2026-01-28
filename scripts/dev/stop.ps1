#Requires -Version 5.1

<#
.SYNOPSIS
    Stops all Nezuko development services.
.DESCRIPTION
    Terminates Node.js, Python, and Bun processes running for Nezuko.
.EXAMPLE
    .\stop.ps1
    Stops all services.
#>

[CmdletBinding(SupportsShouldProcess)]
param()

# Import utilities
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$ScriptRoot\..\core\utils.ps1"

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   🛑 Stopping Nezuko Services" -ForegroundColor Red
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""

# Stop Node.js processes (Web)
Write-Host "  [1/3] Stopping Web Dashboard (Node.js)..." -ForegroundColor Blue
$nodeCount = Stop-ProcessByName -ProcessName "node"
if ($nodeCount -gt 0) {
    Write-Host "        Stopped $nodeCount process(es)!" -ForegroundColor Green
}
else {
    Write-Host "        Not running" -ForegroundColor Gray
}

# Stop Python processes (API + Bot)
Write-Host "  [2/3] Stopping API and Bot (Python)..." -ForegroundColor Green
$pythonCount = Stop-ProcessByName -ProcessName "python"
if ($pythonCount -gt 0) {
    Write-Host "        Stopped $pythonCount process(es)!" -ForegroundColor Green
}
else {
    Write-Host "        Not running" -ForegroundColor Gray
}

# Stop Bun processes
Write-Host "  [3/3] Stopping Bun processes..." -ForegroundColor Yellow
$bunCount = Stop-ProcessByName -ProcessName "bun"
if ($bunCount -gt 0) {
    Write-Host "        Stopped $bunCount process(es)!" -ForegroundColor Green
}
else {
    Write-Host "        Not running" -ForegroundColor Gray
}

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   ✅ All services stopped!" -ForegroundColor Green
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""
