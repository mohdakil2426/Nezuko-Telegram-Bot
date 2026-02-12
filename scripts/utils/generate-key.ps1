#Requires -Version 5.1

<#
.SYNOPSIS
    Generate Encryption Key
.DESCRIPTION
    Generates a secure Fernet encryption key using Python.
    This key is used for encrypting bot tokens in the database.
.EXAMPLE
    .\generate-key.ps1
#>

[CmdletBinding()]
param()

# Import utilities
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$ScriptRoot\..\core\utils.ps1"

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   🔑 Generate Encryption Key" -ForegroundColor Yellow
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""

# Check for Python
if (-not (Test-Prerequisites)) {
    Write-Failure "Python or Virtual Environment not found."
    exit 1
}

$venvPython = Get-VenvPython

Write-Host "  Generating secure Fernet key..." -ForegroundColor Gray
Write-Host ""

try {
    # Generate key using Python cryptography module
    $key = & $venvPython -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        $key = $key.Trim()
        
        Write-Host "  ✅ Generated Key:" -ForegroundColor Green
        Write-Host ""
        Write-Host "  $key" -ForegroundColor White -BackgroundColor DarkBlue
        Write-Host ""
        
        Write-Host "  📋 Instructions:" -ForegroundColor Yellow
        Write-Host "  1. Copy the key above."
        Write-Host "  2. Paste it into 'ENCRYPTION_KEY=' in:"
        Write-Host "     - apps/api/.env" -ForegroundColor Cyan
        Write-Host "     - apps/bot/.env" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  ⚠️  IMPORTANT:" -ForegroundColor Red
        Write-Host "  - The key MUST be identical in both files."
        Write-Host "  - Store this key safely. If lost, all encrypted tokens are lost."
        Write-Host ""
    }
    else {
        Write-Failure "Failed to generate key. Is 'cryptography' installed?"
        Write-Host "Error: $key" -ForegroundColor Red
    }
}
catch {
    Write-Failure "An error occurred: $_"
}
