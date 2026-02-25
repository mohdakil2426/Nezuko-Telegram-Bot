# 📜 Scripts Directory

Cross-platform utility scripts for development, deployment, and maintenance.

> **Note**: The `nezuko.bat` CLI menu is for **human developers**. AI agents should use direct PowerShell/Bash commands.

## 🚀 Quick Start

### One Command to Rule Them All

From the project root:

```bash
# Windows
nezuko.bat

# Mac/Linux
./nezuko
```

This opens an **interactive menu** for all development tasks.

### Direct Commands

| Command                | Windows        | Mac/Linux        |
| ---------------------- | -------------- | ---------------- |
| **Start all services** | `nezuko dev`   | `./nezuko dev`   |
| **Stop all services**  | `nezuko stop`  | `./nezuko stop`  |
| **First-time setup**   | `nezuko setup` | `./nezuko setup` |
| **Clean artifacts**    | `nezuko clean` | `./nezuko clean` |

> **🐳 Docker note**: `start` and `stop` automatically manage the Redis Docker container  
> (`nezuko-redis-local`) via `docker-compose.local.yml`. Docker Desktop must be running.

---

## 📁 Directory Structure

```
scripts/
├── README.md                   # 📚 This file
│
├── core/                       # 🎯 Core utilities (shared functions)
│   ├── menu.ps1                # Interactive menu (Windows)
│   ├── menu.sh                 # Interactive menu (Mac/Linux)
│   ├── utils.ps1               # Shared PowerShell functions
│   └── utils.sh                # Shared Bash functions
│
├── dev/                        # 🚀 Development server scripts
│   ├── start.ps1               # Start Redis (Docker) + services (Windows)
│   ├── start.sh                # Start Redis (Docker) + services (Mac/Linux)
│   ├── stop.ps1                # Stop services + Redis container (Windows)
│   └── stop.sh                 # Stop services + Redis container (Mac/Linux)
│
├── setup/                      # 📦 Initial setup scripts
│   ├── install.ps1             # First-time setup (Windows)
│   └── install.sh              # First-time setup (Mac/Linux)
│

├── logs/                       # 📋 Script execution logs (git-ignored)
│   └── nezuko-YYYY-MM-DD.log
│
└── utils/                      # 🔧 Utility scripts
    ├── clean.ps1               # Clean build artifacts (Windows)
    ├── clean.sh                # Clean build artifacts (Mac/Linux)
    ├── generate-key.ps1        # Generate Fernet encryption key
    └── generate-structure.ps1  # Folder structure generator
```

---

## 🖥️ Platform Support

| Platform    | Primary Scripts     | Entry Point  |
| ----------- | ------------------- | ------------ |
| **Windows** | `.ps1` (PowerShell) | `nezuko.bat` |
| **macOS**   | `.sh` (Bash)        | `./nezuko`   |
| **Linux**   | `.sh` (Bash)        | `./nezuko`   |

---

## 🎯 Interactive Menu

When you run `nezuko` without arguments, you get an interactive menu:

```
╔══════════════════════════════════════════════════════════╗
║                 🦊 NEZUKO DEVELOPER CLI                   ║
╠══════════════════════════════════════════════════════════╣
║   Telegram Bot Platform • Admin Dashboard • API           ║
╚══════════════════════════════════════════════════════════╝

┌── 📦 SETUP & CONFIGURATION ──────────────────────────┐
│    [1] 🏗️  First-Time Setup                          │
│    [2] 🔐 Security & Keys...                         │
├── 🚀 DEVELOPMENT ────────────────────────────────────┤
│    [4] ▶️  Start Services...                          │
│    [5] ⏹️  Stop All Services                          │
├── 🧹 UTILITIES ──────────────────────────────────────┤
│    [6] 🧼 Clean Artifacts...                         │
│    [7] ♻️  Full Reset (Clean + Reinstall)             │
│    [0] ❌ Exit                                       │
└──────────────────────────────────────────────────────┘
```

---

## 📦 First-Time Setup

Run once after cloning the repository:

```bash
# Via menu: [1] First-Time Setup
# Or directly:
.\scripts\setup\install.ps1
```

This will:

1. ✅ Check prerequisites (Python 3.13+, Bun)
2. ✅ Create Python virtual environment (`.venv`)
3. ✅ Install Python dependencies
4. ✅ Install Node.js dependencies (via Bun)
5. ✅ Create `.env` files from templates
6. ✅ Create storage directories

---

## 🐳 Docker (Redis)

The `docker-compose.local.yml` at the project root manages a local **Redis** cache container
(`nezuko-redis-local` on port 6379).

`start.ps1` / `start.sh` runs `docker compose ... up -d` automatically when you launch services.
`stop.ps1` / `stop.sh` stops the container (data is preserved in a named volume).

```bash
# Manage Redis manually
docker compose -f docker-compose.local.yml up -d    # Start
docker compose -f docker-compose.local.yml stop      # Stop (keeps data)
docker compose -f docker-compose.local.yml down -v   # Remove + wipe data
```

---

## 🔑 Security & Encryption

Generate a Fernet encryption key:

```bash
# Via menu: [2] Security & Keys → [1] Generate Key
# Or directly:
.\scripts\utils\generate-key.ps1
```

Add the key to:

- `apps/bot/.env` → `ENCRYPTION_KEY=...`

---

## 🧹 Cleaning Artifacts

```bash
# Via menu: [6] Clean Artifacts
# Or directly:
.\scripts\utils\clean.ps1                   # Clean caches
.\scripts\utils\clean.ps1 -IncludeVenv      # Also remove .venv
.\scripts\utils\clean.ps1 -DryRun           # Preview only
```

---

## 📋 Logging

Script operations are logged to `scripts/logs/nezuko-YYYY-MM-DD.log`.

### Log Format

```
[2026-02-05 16:30:47] [INFO] [DEV] Starting Web Dashboard
[2026-02-05 16:30:51] [SUCCESS] [DEV] All services started
```

---

_Last Updated: 2026-02-25_
