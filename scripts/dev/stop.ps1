#Requires -Version 5.1

<#
.SYNOPSIS
    Stops all Nezuko development services.
.DESCRIPTION
    Terminates Node.js, Python, and Bun processes running for Nezuko.
    Also closes any PowerShell windows spawned by the start script.
.EXAMPLE
    .\stop.ps1
    Stops all services.
#>

[CmdletBinding(SupportsShouldProcess)]
param()

# Import utilities
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$ScriptRoot\..\core\utils.ps1"

# Initialize logging
Initialize-LogSystem
Write-LogSection -Title "DEV SERVICES STOP"

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   🛑 Stopping Nezuko Services" -ForegroundColor Red
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""

# Helper function to get process count before stopping
function Get-ServiceProcessCount {
    param([string]$ProcessName)
    $count = (Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Measure-Object).Count
    return $count
}

# Check what's running before we stop
$nodeRunning = Get-ServiceProcessCount -ProcessName "node"
$pythonRunning = Get-ServiceProcessCount -ProcessName "python"
$bunRunning = Get-ServiceProcessCount -ProcessName "bun"

# Stop Node.js processes (Web)
Write-Host "  [1/3] Stopping Web Dashboard (Node.js)..." -ForegroundColor Blue
Write-Log -Message "Checking Node.js processes: $nodeRunning found" -Category "DEV"

if ($nodeRunning -gt 0) {
    $nodeCount = Stop-ProcessByName -ProcessName "node"
    Write-Host "        Stopped $nodeCount process(es)!" -ForegroundColor Green
    Write-Log -Message "Stopped $nodeCount Node.js process(es)" -Level "SUCCESS" -Category "DEV"
}
else {
    Write-Host "        Not running" -ForegroundColor Gray
    Write-Log -Message "Node.js not running" -Category "DEV"
}

# Stop Python processes (API + Bot)
Write-Host "  [2/3] Stopping API and Bot (Python)..." -ForegroundColor Green
Write-Log -Message "Checking Python processes: $pythonRunning found" -Category "DEV"

if ($pythonRunning -gt 0) {
    $pythonCount = Stop-ProcessByName -ProcessName "python"
    Write-Host "        Stopped $pythonCount process(es)!" -ForegroundColor Green
    Write-Log -Message "Stopped $pythonCount Python process(es)" -Level "SUCCESS" -Category "DEV"
}
else {
    Write-Host "        Not running" -ForegroundColor Gray
    Write-Log -Message "Python not running" -Category "DEV"
}

# Stop Bun processes
Write-Host "  [3/3] Stopping Bun processes..." -ForegroundColor Yellow
Write-Log -Message "Checking Bun processes: $bunRunning found" -Category "DEV"

if ($bunRunning -gt 0) {
    $bunCount = Stop-ProcessByName -ProcessName "bun"
    Write-Host "        Stopped $bunCount process(es)!" -ForegroundColor Green
    Write-Log -Message "Stopped $bunCount Bun process(es)" -Level "SUCCESS" -Category "DEV"
}
else {
    Write-Host "        Not running" -ForegroundColor Gray
    Write-Log -Message "Bun not running" -Category "DEV"
}

# Summary
$totalStopped = $nodeRunning + $pythonRunning + $bunRunning
Write-LogSection -Title "DEV SERVICES STOPPED"
Write-Log -Message "Total processes stopped: $totalStopped" -Level "SUCCESS" -Category "DEV"

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
if ($totalStopped -gt 0) {
    Write-Host "   ✅ Stopped $totalStopped process(es)!" -ForegroundColor Green
}
else {
    Write-Host "   ℹ️  No services were running" -ForegroundColor Yellow
}
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""

# Note: The PowerShell terminal windows stay open (-NoExit) 
# User needs to close them manually as they may contain logs
if ($totalStopped -gt 0) {
    Write-Host "  💡 Note: You may need to close the terminal windows manually." -ForegroundColor Gray
    Write-Host ""
}
