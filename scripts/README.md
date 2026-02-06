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
│   ├── start.ps1               # Start services (with -Service param)
│   ├── start.sh                # Start all services (Mac/Linux)
│   ├── stop.ps1                # Stop all services (Windows)
│   └── stop.sh                 # Stop all services (Mac/Linux)
│
├── setup/                      # 📦 Initial setup scripts
│   ├── install.ps1             # First-time setup (Windows)
│   └── install.sh              # First-time setup (Mac/Linux)
│
├── db/                         # 🗄️ Database scripts
│   ├── init.sql                # PostgreSQL init script (Docker)
│   ├── seed.py                 # 🌱 Seed test data (charts, verifications)
│   └── README.md               # Database documentation
│
├── test/                       # 🧪 Test scripts
│   ├── run.ps1                 # Run pytest (Windows)
│   ├── run.sh                  # Run pytest (Mac/Linux)
│   └── load_test.py            # 📊 API performance benchmarking
│
├── deploy/                     # 🚢 Deployment scripts
│   └── docker-build.sh         # Docker build script
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
│    [3] 🗄️  Database...                                │
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

## 🗄️ Database Setup

### Start PostgreSQL (Docker)

```bash
# Via menu: [3] Database → [1] Start PostgreSQL
# Or directly:
docker run -d --name nezuko-postgres \
  -e POSTGRES_USER=nezuko \
  -e POSTGRES_PASSWORD=nezuko123 \
  -e POSTGRES_DB=nezuko \
  -p 5432:5432 \
  postgres:17-alpine
```

### Run Migrations

```bash
# Via menu: [3] Database → [3] Run Migrations
# Or directly:
cd apps/api && alembic upgrade head
```

### Seed Test Data

```bash
# Via menu: [3] Database → [4] Seed Test Data
# Or directly:
python scripts/db/seed.py --days 30 --count 20
```

**What it does:** Creates fake verification records so dashboard charts show data instead of empty graphs.

---

## 🧪 Testing

### Run Unit Tests

```bash
# Via script:
.\scripts\test\run.ps1

# Or directly:
pytest tests/ -v
pytest tests/api/ -v --cov=apps/api
```

### Load Testing (API Performance)

```bash
# Benchmark API endpoints:
python scripts/test/load_test.py --requests 50 --concurrency 10

# Options:
#   --api-url     Target API (default: http://localhost:8080)
#   --requests    Requests per endpoint (default: 50)
#   --concurrency Concurrent requests (default: 10)
```

**What it does:** Measures latency (avg, p95, p99) and throughput for all chart endpoints.

---

## 🔑 Security & Encryption

Generate a Fernet encryption key:

```bash
# Via menu: [2] Security & Keys → [1] Generate Key
# Or directly:
.\scripts\utils\generate-key.ps1
```

Add the key to:

- `apps/api/.env` → `ENCRYPTION_KEY=...`
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

_Last Updated: 2026-02-05_
