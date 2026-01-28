#Requires -Version 5.1

<#
.SYNOPSIS
    Shared utility functions for Nezuko CLI scripts.
.DESCRIPTION
    Contains common functions used across multiple scripts.
#>

# ============================================================
# Path Utilities
# ============================================================

function Get-ProjectRoot {
    <#
    .SYNOPSIS
        Gets the project root directory.
    .OUTPUTS
        System.String - Absolute path to project root.
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param()
    
    $scriptPath = $PSScriptRoot
    # Navigate from scripts/core to project root
    return (Resolve-Path (Join-Path $scriptPath "..\..")).Path
}

# ============================================================
# Logging System
# ============================================================

# Global log file path
$script:LogsDir = $null
$script:CurrentLogFile = $null

function Initialize-LogSystem {
    <#
    .SYNOPSIS
        Initializes the logging system and creates log directory.
    .DESCRIPTION
        Creates the scripts/logs directory and sets up the current log file
        based on the current date.
    #>
    [CmdletBinding()]
    param()
    
    $projectRoot = Get-ProjectRoot
    $script:LogsDir = Join-Path $projectRoot "scripts\logs"
    
    # Create logs directory if it doesn't exist
    if (-not (Test-Path $script:LogsDir)) {
        New-Item -ItemType Directory -Path $script:LogsDir -Force | Out-Null
    }
    
    # Set current log file (daily rotation)
    $dateStr = Get-Date -Format "yyyy-MM-dd"
    $script:CurrentLogFile = Join-Path $script:LogsDir "nezuko-$dateStr.log"
    
    # Create .gitignore for logs
    $gitignorePath = Join-Path $script:LogsDir ".gitignore"
    if (-not (Test-Path $gitignorePath)) {
        "# Ignore all log files`n*.log" | Out-File -FilePath $gitignorePath -Encoding utf8
    }
}

function Write-Log {
    <#
    .SYNOPSIS
        Writes a timestamped message to the log file.
    .PARAMETER Message
        The message to log.
    .PARAMETER Level
        Log level: INFO, WARN, ERROR, DEBUG, SUCCESS
    .PARAMETER Category
        Category/source of the log: INSTALL, CLEAN, DEV, TEST, MENU, SYSTEM
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Message,
        
        [ValidateSet("INFO", "WARN", "ERROR", "DEBUG", "SUCCESS")]
        [string]$Level = "INFO",
        
        [ValidateSet("INSTALL", "CLEAN", "DEV", "TEST", "MENU", "SYSTEM", "PYTHON", "NODE")]
        [string]$Category = "SYSTEM"
    )
    
    # Initialize if not already done
    if (-not $script:CurrentLogFile) {
        Initialize-LogSystem
    }
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] [$Category] $Message"
    
    # Append to log file
    try {
        $logEntry | Out-File -FilePath $script:CurrentLogFile -Append -Encoding utf8
    }
    catch {
        # Silently fail if we can't write to log
    }
}

function Write-LogSection {
    <#
    .SYNOPSIS
        Writes a section header to the log file.
    .PARAMETER Title
        The section title.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Title
    )
    
    Write-Log -Message "===============================================" -Level "INFO" -Category "SYSTEM"
    Write-Log -Message $Title -Level "INFO" -Category "SYSTEM"
    Write-Log -Message "===============================================" -Level "INFO" -Category "SYSTEM"
}

function Write-CommandLog {
    <#
    .SYNOPSIS
        Logs a command execution with its output.
    .PARAMETER Command
        The command that was executed.
    .PARAMETER Output
        The command output.
    .PARAMETER ExitCode
        The exit code (optional).
    .PARAMETER Category
        The category for the log entry.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Command,
        
        [string]$Output = "",
        
        [int]$ExitCode = 0,
        
        [ValidateSet("INSTALL", "CLEAN", "DEV", "TEST", "MENU", "SYSTEM", "PYTHON", "NODE")]
        [string]$Category = "SYSTEM"
    )
    
    $level = if ($ExitCode -eq 0) { "INFO" } else { "ERROR" }
    
    Write-Log -Message "COMMAND: $Command" -Level $level -Category $Category
    if ($Output) {
        # Truncate long output
        $truncated = if ($Output.Length -gt 500) { $Output.Substring(0, 500) + "... [truncated]" } else { $Output }
        Write-Log -Message "OUTPUT: $truncated" -Level $level -Category $Category
    }
    if ($ExitCode -ne 0) {
        Write-Log -Message "EXIT CODE: $ExitCode" -Level "ERROR" -Category $Category
    }
}

function Get-LogPath {
    <#
    .SYNOPSIS
        Gets the path to the current log file.
    .OUTPUTS
        System.String - Path to current log file.
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param()
    
    if (-not $script:CurrentLogFile) {
        Initialize-LogSystem
    }
    
    return $script:CurrentLogFile
}

function Get-VenvPath {
    <#
    .SYNOPSIS
        Gets the virtual environment path.
    .OUTPUTS
        System.String - Path to .venv directory.
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param()
    
    return Join-Path (Get-ProjectRoot) ".venv"
}

function Get-VenvPython {
    <#
    .SYNOPSIS
        Gets the path to the Python executable in the virtual environment.
    .OUTPUTS
        System.String - Path to python.exe.
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param()
    
    return Join-Path (Get-VenvPath) "Scripts\python.exe"
}

# ============================================================
# Prerequisite Checks
# ============================================================

function Test-Prerequisites {
    <#
    .SYNOPSIS
        Checks if all required tools are installed.
    .OUTPUTS
        System.Boolean - True if all prerequisites are met.
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [switch]$Quiet
    )
    
    $allGood = $true
    
    # Check Python
    $pythonVersion = $null
    try {
        $pythonVersion = (python --version 2>&1).ToString()
    }
    catch {
        $pythonVersion = $null
    }
    
    if ($pythonVersion -and $pythonVersion -match "Python 3\.") {
        if (-not $Quiet) {
            Write-Host "  ✅ Python: $pythonVersion" -ForegroundColor Green
        }
    }
    else {
        if (-not $Quiet) {
            Write-Host "  ❌ Python 3.x not found" -ForegroundColor Red
        }
        $allGood = $false
    }
    
    # Check Bun
    $bunVersion = $null
    try {
        $bunVersion = (bun --version 2>&1).ToString()
    }
    catch {
        $bunVersion = $null
    }
    
    if ($bunVersion) {
        if (-not $Quiet) {
            Write-Host "  ✅ Bun: $bunVersion" -ForegroundColor Green
        }
    }
    else {
        if (-not $Quiet) {
            Write-Host "  ❌ Bun not found (https://bun.sh)" -ForegroundColor Red
        }
        $allGood = $false
    }
    
    # Check Git (optional)
    $gitVersion = $null
    try {
        $gitVersion = (git --version 2>&1).ToString()
    }
    catch {
        $gitVersion = $null
    }
    
    if ($gitVersion) {
        if (-not $Quiet) {
            Write-Host "  ✅ Git: $gitVersion" -ForegroundColor Green
        }
    }
    else {
        if (-not $Quiet) {
            Write-Host "  ⚠️  Git not found (optional)" -ForegroundColor Yellow
        }
    }
    
    return $allGood
}

function Test-VenvExists {
    <#
    .SYNOPSIS
        Checks if the virtual environment exists.
    .OUTPUTS
        System.Boolean
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param()
    
    return Test-Path (Get-VenvPath)
}

function Test-VenvActivate {
    <#
    .SYNOPSIS
        Gets the path to the venv activation script if it exists.
    .OUTPUTS
        System.String or $null
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param()
    
    $activatePath = Join-Path (Get-VenvPath) "Scripts\Activate.ps1"
    if (Test-Path $activatePath) {
        return $activatePath
    }
    return $null
}

# ============================================================
# Process Management
# ============================================================

function Stop-ProcessByName {
    <#
    .SYNOPSIS
        Stops all processes matching the given name.
    .PARAMETER ProcessName
        Name of the process to stop (without .exe).
    .OUTPUTS
        System.Int32 - Number of processes stopped.
    #>
    [CmdletBinding(SupportsShouldProcess)]
    [OutputType([int])]
    param(
        [Parameter(Mandatory)]
        [ValidateNotNullOrEmpty()]
        [string]$ProcessName
    )
    
    $processes = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    $count = 0
    
    foreach ($proc in $processes) {
        if ($PSCmdlet.ShouldProcess($proc.Name, "Stop Process")) {
            try {
                $proc | Stop-Process -Force -ErrorAction Stop
                $count++
            }
            catch {
                Write-Verbose "Could not stop process $($proc.Id): $_"
            }
        }
    }
    
    return $count
}

# ============================================================
# Output Utilities
# ============================================================

function Write-Step {
    <#
    .SYNOPSIS
        Writes a formatted step message.
    .PARAMETER Step
        Step number (e.g., "1/5").
    .PARAMETER Message
        Step description.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Step,
        
        [Parameter(Mandatory)]
        [string]$Message
    )
    
    Write-Host ""
    Write-Host "  [$Step] $Message" -ForegroundColor Cyan
}

function Write-Success {
    <#
    .SYNOPSIS
        Writes a success message.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Message
    )
    
    Write-Host "        ✅ $Message" -ForegroundColor Green
}

function Write-Failure {
    <#
    .SYNOPSIS
        Writes a failure message.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Message
    )
    
    Write-Host "        ❌ $Message" -ForegroundColor Red
}

function Write-Info {
    <#
    .SYNOPSIS
        Writes an info message.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Message
    )
    
    Write-Host "        ℹ️  $Message" -ForegroundColor DarkGray
}

# ============================================================
# Environment File Utilities
# ============================================================

function Copy-EnvFileIfMissing {
    <#
    .SYNOPSIS
        Copies .env.example to .env if .env doesn't exist.
    .PARAMETER TargetDir
        Directory containing the env files.
    .PARAMETER EnvFileName
        Name of the target env file (default: .env).
    .PARAMETER ExampleFileName
        Name of the example file (default: .env.example).
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$TargetDir,
        
        [string]$EnvFileName = ".env",
        
        [string]$ExampleFileName = ".env.example"
    )
    
    $envFile = Join-Path $TargetDir $EnvFileName
    $exampleFile = Join-Path $TargetDir $ExampleFileName
    
    if (-not (Test-Path $envFile)) {
        if (Test-Path $exampleFile) {
            Copy-Item -Path $exampleFile -Destination $envFile
            return $true
        }
    }
    
    return $false
}
