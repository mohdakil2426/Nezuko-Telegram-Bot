# 📜 Scripts Directory

Cross-platform utility scripts for development, deployment, and maintenance.

> **Note**: The `nezuko.bat` CLI menu is for **human developers**. AI agents should use direct PowerShell commands.

## 🚀 Quick Start

### One Command to Rule Them All

From the project root:

```powershell
# Windows
nezuko.bat

# Mac/Linux (Upcoming)
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
│   ├── utils.ps1               # Shared PowerShell functions
│   └── ...
│
├── dev/                        # 🚀 Development server scripts
│   ├── start.ps1               # Start Redis (Docker) + services (Windows)
│   ├── stop.ps1                # Stop services + Redis container (Windows)
│   └── ...
│
├── setup/                      # 📦 Initial setup scripts
│   ├── install.ps1             # First-time setup (Windows)
│   └── ...
│
├── logs/                       # 📋 Script execution logs (git-ignored)
│   └── nezuko-YYYY-MM-DD.log
│
└── utils/                      # 🔧 Utility scripts
    ├── clean.ps1               # Clean build artifacts (Windows)
    ├── generate-key.ps1        # Generate 32-byte hex encryption key
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
╔══════════════════════════════════════════════════════╗
║                                                      ║
║         🦊 NEZUKO DEVELOPER CLI                   ║
║                                                      ║
╠══════════════════════════════════════════════════════╣
║   Telegram Bot Platform • Admin Dashboard            ║
╚══════════════════════════════════════════════════════╝

┌── 📦 SETUP & CONFIGURATION ──────────────────────────┐
│    [1] 🏗️  First-Time Setup                          │
│    [2] 🔐 Security & Keys...                         │
├── 🚀 DEVELOPMENT ────────────────────────────────────┤
│    [3] ▶️  Start Services...                          │
│    [4] ⏹️  Stop All Services                          │
├── 🧹 UTILITIES ──────────────────────────────────────┤
│    [5] 🧼 Clean Artifacts...                         │
│    [6] ♻️  Full Reset (Clean + Reinstall)             │
│    [7] 🔄 Update & Sync Dependencies                 │
│    ──────────────────────────────────────────────    │
│    [0] ❌ Exit                                       │
└──────────────────────────────────────────────────────┘
```

---

## 📦 First-Time Setup

Run once after cloning the repository:

```powershell
# Via menu: [1] First-Time Setup
# Or directly:
.\scripts\setup\install.ps1
```

This will:

1. ✅ Check prerequisites (Bun, Node.js, Docker)
2. ✅ Install Web Dashboard dependencies (`apps/web`)
3. ✅ Install Telegram Bot dependencies (`apps/grammy`)
4. ✅ Create `.env` files from templates
5. ✅ Create logging directories

---

## 🐳 Docker (Redis)

The `docker-compose.local.yml` at the project root manages a local **Redis** cache container
(`nezuko-redis-local` on port 6379).

`start.ps1` runs `docker compose ... up -d` automatically when you launch services.
`stop.ps1` stops the container (data is preserved in a named volume).

```powershell
# Manage Redis manually
docker compose -f docker-compose.local.yml up -d    # Start
docker compose -f docker-compose.local.yml stop      # Stop (keeps data)
docker compose -f docker-compose.local.yml down -v   # Remove + wipe data
```

---

## 🔑 Security & Encryption

Generate a 32-byte hex encryption key for AES-256-GCM:

```powershell
# Via menu: [2] Security & Keys → [1] Generate Key
# Or directly:
.\scripts\utils\generate-key.ps1
```

Add the key to:

- `apps/grammy/.env` → `ENCRYPTION_KEY=...`

---

## 🧹 Cleaning Artifacts

```powershell
# Via menu: [5] Clean Artifacts
# Or directly:
.\scripts\utils\clean.ps1                   # Clean caches
.\scripts\utils\clean.ps1 -DryRun           # Preview only
```

---

## 📋 Logging

Script operations are logged to `scripts/logs/nezuko-YYYY-MM-DD.log`.

### Log Format

```
[2026-03-06 16:30:47] [INFO] [DEV] Starting Web Dashboard
[2026-03-06 16:30:51] [SUCCESS] [DEV] All services started
```

---

_Last Updated: 2026-03-06_
