#Requires -Version 5.1

<#
.SYNOPSIS
    Stops Nezuko development services by port and process name.
.DESCRIPTION
    Terminates Nezuko-specific processes and stops the Redis Docker container:
    - Port 3000: Web Dashboard (Next.js)
    - Bot: Python process running apps.bot.main
    - Redis: Docker container nezuko-redis-local (docker-compose.local.yml)
    Does NOT kill all node/python processes - only our services.
.PARAMETER KeepRedis
    If specified, keeps the Redis Docker container running.
.EXAMPLE
    .\stop.ps1
    Stops all Nezuko services including Redis Docker container.
.EXAMPLE
    .\stop.ps1 -KeepRedis
    Stops services but keeps Redis running.
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [switch]$KeepRedis
)

# Import utilities
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$ScriptRoot\..\core\utils.ps1"

# Initialize logging
Initialize-LogSystem
Write-LogSection -Title "DEV SERVICES STOP"

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   Stopping Nezuko Services" -ForegroundColor Red
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""

# Define our specific ports
$WEB_PORT = 3000

# Helper function to stop process by port (Windows-specific using netstat)
function Stop-ProcessOnPort {
    param(
        [int]$Port,
        [string]$ServiceName
    )

    $stopped = 0

    try {
        # Use netstat to find processes listening on the port
        $netstatResult = netstat -ano 2>$null | Select-String -Pattern ":$Port\s+.*LISTENING"

        if ($netstatResult) {
            foreach ($line in $netstatResult) {
                $lineText = $line.ToString().Trim()
                # Split by whitespace and get the last element (PID)
                $parts = $lineText -split '\s+'
                $processId = $parts[-1]

                if ($processId -match '^\d+$' -and [int]$processId -gt 0) {
                    try {
                        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                        if ($process) {
                            $processName = $process.ProcessName
                            Stop-Process -Id $processId -Force -ErrorAction Stop
                            Write-Host "        Stopped $processName (PID: $processId)" -ForegroundColor Green
                            Write-Log -Message "Stopped $ServiceName - $processName (PID: $processId) on port $Port" -Level "SUCCESS" -Category "DEV"
                            $stopped++
                        }
                    }
                    catch {
                        Write-Host "        Failed to stop PID $processId" -ForegroundColor Yellow
                    }
                }
            }
        }
    }
    catch {
        Write-Log -Message "Error checking port ${Port}: $_" -Level "ERROR" -Category "DEV"
    }

    return $stopped
}

# Helper function to stop bot process by command line pattern
function Stop-BotProcess {
    $stopped = 0

    try {
        # Find Python processes running the bot module
        $botProcesses = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like "*apps.bot.main*" -or $_.CommandLine -like "*apps/bot/main*" }

        if ($botProcesses) {
            foreach ($proc in $botProcesses) {
                try {
                    $process = Get-Process -Id $proc.ProcessId -ErrorAction SilentlyContinue
                    if ($process) {
                        Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
                        Write-Host "        Stopped python (PID: $($proc.ProcessId))" -ForegroundColor Green
                        Write-Log -Message "Stopped Bot - python (PID: $($proc.ProcessId))" -Level "SUCCESS" -Category "DEV"
                        $stopped++
                    }
                }
                catch {
                    Write-Host "        Failed to stop PID $($proc.ProcessId)" -ForegroundColor Yellow
                }
            }
        }
    }
    catch {
        Write-Log -Message "Error finding bot process: $_" -Level "ERROR" -Category "DEV"
    }

    return $stopped
}

# Track total stopped
$totalStopped = 0

# Stop Web Dashboard (Port 3000)
Write-Host "  [1/3] Web Dashboard (Port $WEB_PORT)..." -ForegroundColor Blue
$webStopped = Stop-ProcessOnPort -Port $WEB_PORT -ServiceName "Web"
if ($webStopped -eq 0) {
    Write-Host "        Not running" -ForegroundColor Gray
}
$totalStopped += $webStopped

# Stop Telegram Bot
Write-Host "  [2/3] Telegram Bot..." -ForegroundColor Yellow
$botStopped = Stop-BotProcess
if ($botStopped -eq 0) {
    Write-Host "        Not running" -ForegroundColor Gray
}
$totalStopped += $botStopped

# Stop Redis Docker container
Write-Host "  [3/3] Redis (Docker: nezuko-redis-local)..." -ForegroundColor Magenta

if ($KeepRedis) {
    Write-Host "        Skipped (-KeepRedis flag)" -ForegroundColor Gray
    Write-Log -Message "Redis container kept running (-KeepRedis)" -Category "DEV"
}
else {
    # Check if Docker is available
    $dockerAvailable = $null
    try {
        $null = docker --version 2>&1
        $dockerAvailable = $true
    }
    catch {
        $dockerAvailable = $false
    }

    if (-not $dockerAvailable) {
        Write-Host "        Docker not available" -ForegroundColor Gray
    }
    else {
        $composeFile = Join-Path (Get-ProjectRoot) "docker-compose.local.yml"
        if (Test-Path $composeFile) {
            # Check if container is running
            $containerRunning = docker ps --filter "name=nezuko-redis-local" --format "{{.Names}}" 2>$null

            if ($containerRunning -eq "nezuko-redis-local") {
                docker compose -f $composeFile stop 2>$null | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "        Stopped Redis container (data preserved)" -ForegroundColor Green
                    Write-Log -Message "Stopped Redis container" -Level "SUCCESS" -Category "DEV"
                    $totalStopped++
                }
                else {
                    Write-Host "        Failed to stop Redis container" -ForegroundColor Red
                }
            }
            else {
                Write-Host "        Not running" -ForegroundColor Gray
            }
        }
        else {
            Write-Host "        docker-compose.local.yml not found" -ForegroundColor Gray
        }
    }
}

# Summary
Write-LogSection -Title "DEV SERVICES STOPPED"

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
if ($totalStopped -gt 0) {
    Write-Host "   Stopped $totalStopped service(s)" -ForegroundColor Green
}
else {
    Write-Host "   No Nezuko services were running" -ForegroundColor Yellow
}
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""
