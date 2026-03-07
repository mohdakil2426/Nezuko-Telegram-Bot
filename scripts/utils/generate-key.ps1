#Requires -Version 5.1

<#
.SYNOPSIS
    Generate Encryption Key
.DESCRIPTION
    Generates a secure 32-byte (256-bit) hex encryption key.
    This key is used for AES-256-GCM encryption of bot tokens in the nezuko_secrets table.
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

Write-Host "  Generating secure 32-byte hex key (AES-256-GCM)..." -ForegroundColor Gray
Write-Host ""

try {
    # Generate 32 random bytes using .NET Cryptography
    $bytes = New-Object Byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    
    # Convert to hex string
    $key = ($bytes | ForEach-Object { "{0:x2}" -f $_ }) -join ""
    
    Write-Host "  ✅ Generated Key (AES-256-GCM Compatible):" -ForegroundColor Green
    Write-Host ""
    Write-Host "  $key" -ForegroundColor White -BackgroundColor DarkBlue
    Write-Host ""
    
    Write-Host "  📋 Instructions:" -ForegroundColor Yellow
    Write-Host "  1. Copy the key above."
    Write-Host "  2. Paste it into 'ENCRYPTION_KEY=' in apps/grammy/.env" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  ⚠️  IMPORTANT:" -ForegroundColor Red
    Write-Host "  - This key is used for the 'nezuko_secrets' table."
    Write-Host "  - If lost, all encrypted bot tokens in the database become permanently unreadable."
    Write-Host "  - Never commit it to git (apps/grammy/.env is in .gitignore)."
    Write-Host ""
}
catch {
    Write-Failure "An error occurred while generating the key: $_"
}
