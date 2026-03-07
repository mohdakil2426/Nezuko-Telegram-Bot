#Required -Version 5.1

<#
.SYNOPSIS
    Generates a visual folder structure tree for the Nezuko project.
.DESCRIPTION
    Scans the project directory and outputs a tree-like structure,
    ignoring common binary, dependency, and build folders to keep it readable.
.EXAMPLE
    .\generate-structure.ps1
#>

$ProjectRoot = (Get-Item "$PSScriptRoot\..\..").FullName
Set-Location $ProjectRoot

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   📁 Nezuko Project Structure" -ForegroundColor Yellow
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""

# Directories to ignore
$ExcludeDirs = @(
    "node_modules",
    ".venv",
    "__pycache__",
    ".git",
    ".next",
    ".turbo",
    ".ruff_cache",
    ".pytest_cache",
    "dist",
    "build",
    "htmlcov",
    ".opencode",
    ".playwright-mcp",
    ".agent",
    ".agents",
    "docs"
)

# Implementation of a simple tree generator
function Show-Tree {
    param(
        [string]$Path,
        [string]$Indent = "",
        [int]$MaxDepth = 4,
        [int]$CurrentDepth = 0
    )

    if ($CurrentDepth -gt $MaxDepth) { return }

    $Items = Get-ChildItem -Path $Path | Where-Object { 
        $name = $_.Name
        $isExcluded = $false
        foreach ($exclude in $ExcludeDirs) {
            if ($name -eq $exclude) { $isExcluded = $true; break }
        }
        -not $isExcluded
    } | Sort-Object PSIsContainer, Name -Descending

    $Count = $Items.Count
    for ($i = 0; $i -lt $Count; $i++) {
        $Item = $Items[$i]
        $IsLast = ($i -eq $Count - 1)
        
        $Prefix = if ($IsLast) { "└── " } else { "├── " }
        
        # Color coding
        $Color = if ($Item.PSIsContainer) { "Cyan" } else { "White" }
        
        Write-Host "$Indent$Prefix" -NoNewline -ForegroundColor Gray
        Write-Host "$($Item.Name)" -ForegroundColor $Color
        
        if ($Item.PSIsContainer) {
            $NextIndent = $Indent + (if ($IsLast) { "    " } else { "│   " })
            Show-Tree -Path $Item.FullName -Indent $NextIndent -MaxDepth $MaxDepth -CurrentDepth ($CurrentDepth + 1)
        }
    }
}

Write-Host "Nezuko-Telegram-Bot" -ForegroundColor Yellow
Show-Tree -Path $ProjectRoot

Write-Host ""
Write-Host "  (Structure generated at $(Get-Date -Format "yyyy-MM-dd HH:mm:ss"))" -ForegroundColor Gray
Write-Host ""
