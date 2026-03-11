#Requires -Version 5.1

<#
.SYNOPSIS
    Centralised project configuration constants for Nezuko CLI scripts.
.DESCRIPTION
    All magic values (ports, container names, compose file, app paths, canary
    packages) live here — scripts MUST NOT hard-code these inline.

    External contributors can adjust these without hunting through each script.
    Add new constants here; never scatter them across individual scripts.
#>

# ── App directory paths (relative to project root) ────────────
$script:NEZUKO_APP_WEB    = "apps\web"
$script:NEZUKO_APP_BOT    = "apps\grammy"

# ── Web Dashboard ─────────────────────────────────────────────
$script:NEZUKO_WEB_PORT   = 3000

# ── Docker / Redis ────────────────────────────────────────────
$script:NEZUKO_COMPOSE_FILE      = "docker-compose.local.yml"
$script:NEZUKO_REDIS_CONTAINER   = "nezuko-redis-local"
$script:NEZUKO_REDIS_PORT        = 6379

# ── Process names to kill when stopping services ─────────────
$script:NEZUKO_KILL_PROC_NAMES   = @("bun", "node", "next", "turbo")

# ── Canary packages used to detect corrupted installs ──────────
# Each entry: @{ App = "<relative app path>"; Package = "<npm package name>" }
$script:NEZUKO_CANARY_PACKAGES   = @(
    @{ App = "apps\web";    Package = "tw-animate-css" }
)

# ── File artifacts to treat as build caches ───────────────────
$script:NEZUKO_CACHE_DIRS = @(
    "apps\web\.next",
    "apps\web\.turbo",
    "apps\grammy\dist",
    "apps\grammy\.turbo",
    ".turbo",
    ".next"
)

# ── node_modules locations to clean ──────────────────────────
$script:NEZUKO_NM_DIRS = @(
    "node_modules",
    "apps\web\node_modules",
    "apps\grammy\node_modules"
)

# ── Apps to reinstall after a full clean ─────────────────────
$script:NEZUKO_INSTALL_APPS = @(
    "apps\web",
    "apps\grammy"
)
