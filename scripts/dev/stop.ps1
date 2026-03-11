#Requires -Version 5.1

<#
.SYNOPSIS
    Stops all Nezuko development services.
.DESCRIPTION
    Terminates the grammY bot (bun/node) and Web Dashboard (port 3000),
    and optionally stops the Redis Docker container.

    Uses Get-Process | Stop-Process -Force (canonical PowerShell approach).
    Uses a broad "kill all bun/node except self" strategy — not pattern matching
    — because spawned bun workers on Windows often have no path in CommandLine.
.PARAMETER Service
    Which services to stop: all (default) | web | bot | docker
.PARAMETER KeepRedis
    When specified, skips stopping the Redis Docker container.
.EXAMPLE
    .\stop.ps1
    Stops bot, web dashboard, and Redis container.
.EXAMPLE
    .\stop.ps1 -KeepRedis
    Stops bot and web dashboard; keeps Redis running.
.EXAMPLE
    .\stop.ps1 -Service docker
    Stops only the Redis Docker container.
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [ValidateSet("all", "web", "bot", "docker")]
    [string]$Service = "all",

    [switch]$KeepRedis
)

# ── Bootstrap ────────────────────────────────────────────────
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$ScriptRoot\..\core\utils.ps1"   # also loads config.ps1 via utils.ps1

Initialize-LogSystem
Write-LogSection -Title "DEV SERVICES STOP"

Write-Host ""
Write-Host "  =====================================" -ForegroundColor Cyan
Write-Host "   Stopping Nezuko Services" -ForegroundColor Red
Write-Host "  =====================================" -ForegroundColor Cyan
Write-Host ""

$WEB_PORT = $script:NEZUKO_WEB_PORT

# ============================================================
# Stop a process listening on a specific TCP port
# ============================================================

function Stop-ServiceOnPort {
    <#
    .SYNOPSIS
        Finds and stops the process listening on the given TCP port.
    .OUTPUTS
        System.Int32 — number of processes stopped.
    #>
    [CmdletBinding()]
    [OutputType([int])]
    param(
        [Parameter(Mandatory)][int]$Port
    )

    $stopped = 0

    # netstat gives us "$IP:$PORT ... LISTENING $PID"
    netstat -ano 2>$null |
        Select-String -Pattern ":$Port\s+.*LISTENING" |
        ForEach-Object {
            $parts    = $_.ToString().Trim() -split '\s+'
            $pidValue = $parts[-1]

            if ($pidValue -match '^\d+$') {
                $proc = Get-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue
                if ($proc) {
                    $proc | Stop-Process -Force -ErrorAction SilentlyContinue
                    Write-Host "        Stopped $($proc.ProcessName) (PID $($proc.Id)) on port $Port" -ForegroundColor Green
                    Write-Log "Stopped $($proc.ProcessName) PID $($proc.Id) on port $Port" -Level "SUCCESS" -Category "DEV"
                    $stopped++
                }
            }
        }

    return $stopped
}

# ============================================================
# Stop all bun/node processes except this shell
# ============================================================

function Stop-BotAndWebProcesses {
    <#
    .SYNOPSIS
        Kills every bun, node, next, or turbo process that is not the current PID.
    .DESCRIPTION
        Simple broad kill — reliable on Windows because CommandLine matching for
        spawned bun workers is unreliable (they often have no path context).
    .OUTPUTS
        System.Int32 — number of processes stopped.
    #>
    [CmdletBinding()]
    [OutputType([int])]
    param()

    $stopped = 0

    foreach ($name in $script:NEZUKO_KILL_PROC_NAMES) {
        Get-Process -Name $name -ErrorAction SilentlyContinue |
            Where-Object { $_.Id -ne $PID } |
            ForEach-Object {
                $_ | Stop-Process -Force -ErrorAction SilentlyContinue
                Write-Host "        Stopped $($_.ProcessName) (PID $($_.Id))" -ForegroundColor Green
                Write-Log "Stopped $($_.ProcessName) PID $($_.Id)" -Level "SUCCESS" -Category "DEV"
                $stopped++
            }
    }

    return $stopped
}

# ============================================================
# Step 1 — Web Dashboard (port 3000)
# ============================================================

$totalStopped = 0

Write-Host "  [1/3] Web Dashboard (port $WEB_PORT)..." -ForegroundColor Blue

if ($Service -eq "all" -or $Service -eq "web") {
    $n = Stop-ServiceOnPort -Port $WEB_PORT
    if ($n -eq 0) { Write-Host "        Not running" -ForegroundColor Gray }
    $totalStopped += $n
}
else {
    Write-Host "        Skipped" -ForegroundColor Gray
}

# ============================================================
# Step 2 — Telegram Bot (grammY / bun / node)
# ============================================================

Write-Host "  [2/3] Telegram Bot (grammY)..." -ForegroundColor Yellow

if ($Service -eq "all" -or $Service -eq "bot") {
    $n = Stop-BotAndWebProcesses
    if ($n -eq 0) { Write-Host "        Not running" -ForegroundColor Gray }
    $totalStopped += $n
}
else {
    Write-Host "        Skipped" -ForegroundColor Gray
}

# ============================================================
# Step 3 — Redis Docker container
# ============================================================

Write-Host "  [3/3] Redis (Docker: $($script:NEZUKO_REDIS_CONTAINER))..." -ForegroundColor Magenta

$shouldStopRedis = ($Service -eq "all" -or $Service -eq "docker") -and (-not $KeepRedis)

if (-not $shouldStopRedis) {
    Write-Host "        Skipped" -ForegroundColor Gray
    Write-Log "Redis container kept running/skipped" -Category "DEV"
}
else {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Host "        Docker not available — skipping" -ForegroundColor Gray
    }
    else {
        $composeFile = Join-Path (Get-ProjectRoot) $script:NEZUKO_COMPOSE_FILE

        if (-not (Test-Path $composeFile)) {
            Write-Host "        docker-compose.local.yml not found" -ForegroundColor Gray
        }
        else {
            $running = docker ps --filter "name=$($script:NEZUKO_REDIS_CONTAINER)" --format "{{.Names}}" 2>$null
            if ($running -eq $script:NEZUKO_REDIS_CONTAINER) {
                docker compose -f $composeFile stop 2>$null | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "        Stopped Redis container (data preserved)" -ForegroundColor Green
                    Write-Log "Stopped Redis container" -Level "SUCCESS" -Category "DEV"
                    $totalStopped++
                }
                else {
                    Write-Host "        Failed to stop Redis container" -ForegroundColor Red
                    Write-Log "Redis compose stop failed (exit $LASTEXITCODE)" -Level "ERROR" -Category "DEV"
                }
            }
            else {
                Write-Host "        Not running" -ForegroundColor Gray
            }
        }
    }
}

# ============================================================
# Summary
# ============================================================

Write-LogSection -Title "DEV SERVICES STOPPED"

Write-Host ""
Write-Host "  =====================================" -ForegroundColor Cyan
if ($totalStopped -gt 0) {
    Write-Host "   Stopped $totalStopped service(s)" -ForegroundColor Green
}
else {
    Write-Host "   No Nezuko services were running" -ForegroundColor Yellow
}
Write-Host "  =====================================" -ForegroundColor Cyan
Write-Host ""
