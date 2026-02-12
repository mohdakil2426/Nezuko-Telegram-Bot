#Requires -Version 5.1

<#
.SYNOPSIS
    Test runner for Nezuko project (PowerShell)
.DESCRIPTION
    Runs pytest with various options for testing the project.
.PARAMETER Suite
    Test suite to run: all, edge, handlers, services
.PARAMETER VerboseOutput
    Enable verbose output.
.PARAMETER Coverage
    Generate coverage report.
.EXAMPLE
    .\run.ps1
    Shows available test options.
.EXAMPLE
    .\run.ps1 -Suite all
    Runs all tests.
.EXAMPLE
    .\run.ps1 -Suite handlers -Coverage
    Runs handler tests with coverage.
#>

[CmdletBinding()]
param(
    [ValidateSet("all", "edge", "handlers", "services", "")]
    [string]$Suite = "",
    
    [switch]$VerboseOutput,
    
    [switch]$Coverage
)

# Import utilities
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$ScriptRoot\..\core\utils.ps1"

$ProjectRoot = Get-ProjectRoot

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   🧪 Nezuko Test Runner" -ForegroundColor Yellow
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""

# Activate virtual environment
$venvActivate = Test-VenvActivate
if ($venvActivate) {
    & $venvActivate
}
else {
    Write-Host "  ⚠️  Virtual environment not found. Using system Python." -ForegroundColor Yellow
}

Push-Location $ProjectRoot

# Build pytest arguments
$pytestArgs = @("tests/")

if ($VerboseOutput) {
    $pytestArgs += "-v"
}

if ($Coverage) {
    $pytestArgs += "--cov=apps"
    $pytestArgs += "--cov-report=html"
    $pytestArgs += "--cov-report=term-missing"
}

# If no suite specified, show menu
if ($Suite -eq "") {
    Write-Host "  Available test suites:" -ForegroundColor White
    Write-Host ""
    Write-Host "    [1] 🧪 All Tests" -ForegroundColor White
    Write-Host "    [2] 📡 Handlers" -ForegroundColor White
    Write-Host "    [3] ⚙️  Services" -ForegroundColor White
    Write-Host ""
    Write-Host "  Usage:" -ForegroundColor Gray
    Write-Host "    .\run.ps1 -Suite all           # Run all tests" -ForegroundColor Gray
    Write-Host "    .\run.ps1 -Suite handlers -v   # Verbose handler tests" -ForegroundColor Gray
    Write-Host "    .\run.ps1 -Suite all -Coverage # With coverage report" -ForegroundColor Gray
    Write-Host ""

    $choice = Read-Host "  Select suite (1-3, or Enter to cancel)"

    switch ($choice) {
        "1" { $Suite = "all" }
        "2" { $Suite = "handlers" }
        "3" { $Suite = "services" }
        default {
            Write-Host "  Cancelled." -ForegroundColor Gray
            Pop-Location
            exit 0
        }
    }
}

# Filter by suite
switch ($Suite) {
    "all" {
        Write-Host "  🧪 Running all tests..." -ForegroundColor Green
        # No filter needed
    }
    "handlers" {
        Write-Host "  📡 Running handler tests..." -ForegroundColor Green
        $pytestArgs = @("tests/bot/test_handlers.py") + $pytestArgs[1..($pytestArgs.Length - 1)]
    }
    "services" {
        Write-Host "  ⚙️  Running service tests..." -ForegroundColor Green
        $pytestArgs = @("tests/bot/test_services.py") + $pytestArgs[1..($pytestArgs.Length - 1)]
    }
}

Write-Host ""

# Run pytest
python -m pytest $pytestArgs

$exitCode = $LASTEXITCODE

Pop-Location

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "  ✅ All tests passed!" -ForegroundColor Green
}
else {
    Write-Host "  ❌ Some tests failed." -ForegroundColor Red
}
Write-Host ""

exit $exitCode
