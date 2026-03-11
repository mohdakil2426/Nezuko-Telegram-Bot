#Requires -Version 5.1

<#
.SYNOPSIS
    Shared utility functions for Nezuko CLI scripts.
.DESCRIPTION
    Common helpers used by all dev scripts: logging, path resolution,
    prerequisite checks, and process management.
#>

# ============================================================
# Bootstrap — load centralised config constants
# ============================================================

. "$PSScriptRoot\config.ps1"

# ============================================================
# Path Utilities
# ============================================================

function Get-ProjectRoot {
    <#
    .SYNOPSIS
        Returns the absolute path to the project root.
    .OUTPUTS
        System.String
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param()

    # utils.ps1 lives in scripts/core/ — two levels up is the root
    return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

# ============================================================
# Logging
# ============================================================

$script:LogsDir = $null
$script:CurrentLogFile = $null

function Initialize-LogSystem {
    <#
    .SYNOPSIS
        Creates the logs directory and sets the daily log file path.
    #>
    [CmdletBinding()]
    param()

    $projectRoot = Get-ProjectRoot
    $script:LogsDir = Join-Path $projectRoot "scripts\logs"

    if (-not (Test-Path $script:LogsDir)) {
        New-Item -ItemType Directory -Path $script:LogsDir -Force | Out-Null
    }

    $dateStr = Get-Date -Format "yyyy-MM-dd"
    $script:CurrentLogFile = Join-Path $script:LogsDir "nezuko-$dateStr.log"

    $gitignorePath = Join-Path $script:LogsDir ".gitignore"
    if (-not (Test-Path $gitignorePath)) {
        "# Ignore all log files`n*.log" | Out-File -FilePath $gitignorePath -Encoding utf8
    }
}

function Write-Log {
    <#
    .SYNOPSIS
        Appends a timestamped entry to the daily log file.
    .PARAMETER Message
        The message to log.
    .PARAMETER Level
        INFO | WARN | ERROR | DEBUG | SUCCESS
    .PARAMETER Category
        INSTALL | CLEAN | DEV | TEST | MENU | SYSTEM | BUN | NODE
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Message,

        [ValidateSet("INFO", "WARN", "ERROR", "DEBUG", "SUCCESS")]
        [string]$Level = "INFO",

        [ValidateSet("INSTALL", "CLEAN", "DEV", "TEST", "MENU", "SYSTEM", "BUN", "NODE")]
        [string]$Category = "SYSTEM"
    )

    if (-not $script:CurrentLogFile) { Initialize-LogSystem }

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $entry = "[$timestamp] [$Level] [$Category] $Message"

    try {
        $entry | Out-File -FilePath $script:CurrentLogFile -Append -Encoding utf8
    }
    catch {
        # Silently discard log write failures — never crash a script over logging
    }
}

function Write-LogSection {
    <#
    .SYNOPSIS
        Writes a section separator to the log file.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Title
    )

    Write-Log "==============================================="
    Write-Log $Title
    Write-Log "==============================================="
}

function Get-LogPath {
    <#
    .SYNOPSIS
        Returns the current log file path, initialising the system if needed.
    .OUTPUTS
        System.String
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param()

    if (-not $script:CurrentLogFile) { Initialize-LogSystem }
    return $script:CurrentLogFile
}

# ============================================================
# Prerequisite Checks
# ============================================================

function Test-Prerequisites {
    <#
    .SYNOPSIS
        Verifies that required tools (Bun, Node.js, Docker, Git) are installed.
    .PARAMETER Quiet
        Suppresses console output.
    .OUTPUTS
        System.Boolean — $true if all required tools are present.
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [switch]$Quiet
    )

    $allGood = $true

    # Bun — required
    $bunVersion = try { (bun --version 2>&1).ToString().Trim() } catch { $null }
    if ($bunVersion) {
        if (-not $Quiet) { Write-Host "  ✅ Bun: v$bunVersion" -ForegroundColor Green }
    }
    else {
        if (-not $Quiet) {
            Write-Host "  ❌ Bun not found" -ForegroundColor Red
            Write-Host "     Install from: https://bun.sh/" -ForegroundColor Gray
        }
        $allGood = $false
    }

    # Docker — recommended
    $dockerVersion = try { (docker --version 2>&1).ToString().Trim() } catch { $null }
    if ($dockerVersion) {
        if (-not $Quiet) { Write-Host "  ✅ $dockerVersion" -ForegroundColor Green }
    }
    else {
        if (-not $Quiet) {
            Write-Host "  ⚠️  Docker not found (required for Redis cache)" -ForegroundColor Yellow
        }
    }

    # Node.js — required
    $nodeVersion = try { (node --version 2>&1).ToString().Trim() } catch { $null }
    if ($nodeVersion) {
        if (-not $Quiet) { Write-Host "  ✅ Node.js: $nodeVersion" -ForegroundColor Green }
    }
    else {
        if (-not $Quiet) {
            Write-Host "  ❌ Node.js not found" -ForegroundColor Red
            Write-Host "     Install from: https://nodejs.org/" -ForegroundColor Gray
        }
        $allGood = $false
    }

    # Git — recommended
    $gitVersion = try { (git --version 2>&1).ToString().Trim() } catch { $null }
    if ($gitVersion) {
        if (-not $Quiet) { Write-Host "  ✅ $gitVersion" -ForegroundColor Green }
    }
    else {
        if (-not $Quiet) { Write-Host "  ⚠️  Git not found" -ForegroundColor Yellow }
    }

    return $allGood
}

function Check-Dependencies {
    <#
    .SYNOPSIS
        Verifies that node_modules exist and critical packages are present.
    .OUTPUTS
        System.Boolean — $true if both apps have intact node_modules.
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param()

    $projectRoot = Get-ProjectRoot
    $allGood = $true

    foreach ($app in $script:NEZUKO_INSTALL_APPS) {
        $nodeModules = Join-Path $projectRoot "$app\node_modules"
        if (-not (Test-Path $nodeModules)) {
            Write-Failure "Missing node_modules in $app"
            $allGood = $false
            continue
        }

        # Canary package checks — defined in config.ps1
        foreach ($canary in $script:NEZUKO_CANARY_PACKAGES) {
            if ($canary.App -eq $app) {
                $pkgPath = Join-Path $nodeModules $canary.Package
                if (-not (Test-Path $pkgPath)) {
                    Write-Failure "Critical package '$($canary.Package)' missing in $app — installation may be corrupted."
                    $allGood = $false
                }
            }
        }
    }

    return $allGood
}

# ============================================================
# Process Management
# ============================================================

function Stop-ProjectProcesses {
    <#
    .SYNOPSIS
        Stops all bun/node/next development processes except the current shell.
    .DESCRIPTION
        Uses Get-Process piped to Stop-Process -Force, the canonical PowerShell
        approach (Microsoft recommended). Self-excludes the current process ($PID)
        to avoid killing the running script itself.
    #>
    [CmdletBinding()]
    param()

    Write-Log "Stopping project processes..." -Category "SYSTEM"

    $killedCount = 0

    foreach ($procName in $script:NEZUKO_KILL_PROC_NAMES) {
        $stopped = Get-Process -Name $procName -ErrorAction SilentlyContinue |
                   Where-Object { $_.Id -ne $PID } |
                   ForEach-Object {
                       $_ | Stop-Process -Force -ErrorAction SilentlyContinue
                       $killedCount++
                       $_  # pass through for logging
                   }
    }

    if ($killedCount -gt 0) {
        Write-Log "Stopped $killedCount process(es)." -Level "SUCCESS" -Category "SYSTEM"
        Start-Sleep -Milliseconds 600  # Let OS release file handles
    }
}

# ============================================================
# Output Helpers
# ============================================================

function Write-Step {
    <#
    .SYNOPSIS
        Prints a formatted step label (e.g. "[2/5] Installing...").
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Step,
        [Parameter(Mandatory)][string]$Message
    )
    Write-Host ""
    Write-Host "  [$Step] $Message" -ForegroundColor Cyan
}

function Write-Success {
    <#
    .SYNOPSIS
        Prints a green success message.
    #>
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$Message)
    Write-Host "        ✅ $Message" -ForegroundColor Green
}

function Write-Failure {
    <#
    .SYNOPSIS
        Prints a red failure message.
    #>
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$Message)
    Write-Host "        ❌ $Message" -ForegroundColor Red
}

function Write-Info {
    <#
    .SYNOPSIS
        Prints a dim info message.
    #>
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$Message)
    Write-Host "        ℹ️  $Message" -ForegroundColor DarkGray
}

# ============================================================
# Environment File Utilities
# ============================================================

function Copy-EnvFileIfMissing {
    <#
    .SYNOPSIS
        Copies .env.example to the target env file if the target does not exist.
    .PARAMETER TargetDir
        Directory that contains both the example and the target file.
    .PARAMETER EnvFileName
        Target env file name (default: .env).
    .PARAMETER ExampleFileName
        Source template file name (default: .env.example).
    .OUTPUTS
        System.Boolean — $true if the file was created.
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory)][string]$TargetDir,
        [string]$EnvFileName = ".env",
        [string]$ExampleFileName = ".env.example"
    )

    $envFile     = Join-Path $TargetDir $EnvFileName
    $exampleFile = Join-Path $TargetDir $ExampleFileName

    if (-not (Test-Path $envFile) -and (Test-Path $exampleFile)) {
        Copy-Item -Path $exampleFile -Destination $envFile
        return $true
    }

    return $false
}
