# 📜 Scripts Directory

Cross-platform utility scripts for development, deployment, and maintenance.

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

| Command | Windows | Mac/Linux |
|---------|---------|-----------|
| **Start all services** | `nezuko dev` | `./nezuko dev` |
| **Stop all services** | `nezuko stop` | `./nezuko stop` |
| **First-time setup** | `nezuko setup` | `./nezuko setup` |
| **Run tests** | `nezuko test` | `./nezuko test` |
| **Clean artifacts** | `nezuko clean` | `./nezuko clean` |
| **Help** | `nezuko help` | `./nezuko help` |

---

## 📁 Directory Structure

```
scripts/
├── core/                  # 🎯 Core utilities (shared functions)
│   ├── menu.ps1           # Interactive menu (Windows)
│   ├── menu.sh            # Interactive menu (Mac/Linux)
│   ├── utils.ps1          # Shared PowerShell functions
│   └── utils.sh           # Shared Bash functions
│
├── dev/                   # 🚀 Development server scripts
│   ├── start.ps1          # Start all services (Windows)
│   ├── start.sh           # Start all services (Mac/Linux)
│   ├── start.bat          # Legacy Windows CMD (deprecated)
│   ├── stop.ps1           # Stop all services (Windows)
│   ├── stop.sh            # Stop all services (Mac/Linux)
│   └── stop.bat           # Legacy Windows CMD (deprecated)
│
├── setup/                 # 📦 Initial setup scripts
│   ├── install.ps1        # First-time setup (Windows)
│   ├── install.sh         # First-time setup (Mac/Linux)
│   └── install.bat        # Legacy Windows CMD (deprecated)
│
├── test/                  # 🧪 Test runners
│   ├── run.ps1            # Test runner (Windows)
│   └── run.sh             # Test runner (Mac/Linux)
│
├── db/                    # 🗄️ Database scripts
│   ├── setup.py           # Database setup utility
│   ├── debug.py           # Database debugging tool
│   └── init.sql           # Initial database schema
│
├── deploy/                # 🚢 Deployment scripts
│   └── docker-build.sh    # Docker build script
│
└── utils/                 # 🔧 Utility scripts
    ├── clean.ps1          # Clean build artifacts (Windows)
    ├── clean.sh           # Clean build artifacts (Mac/Linux)
    ├── generate-structure.ps1  # Generate folder structure
    ├── manage.ps1         # Project management utilities
    └── run-tests.py       # Legacy test runner (deprecated)
```

---

## 🖥️ Platform Support

| Platform | Primary Scripts | Entry Point |
|----------|----------------|-------------|
| **Windows** | `.ps1` (PowerShell) | `nezuko.bat` |
| **macOS** | `.sh` (Bash) | `./nezuko` |
| **Linux** | `.sh` (Bash) | `./nezuko` |

### Windows Notes

- Requires PowerShell 5.1 or later (included in Windows 10/11)
- PowerShell 7 (pwsh) is preferred if available
- Scripts auto-enable execution policy when run via `nezuko.bat`

### Mac/Linux Notes

- Requires Bash 4.0 or later
- Run `chmod +x nezuko` if permission denied
- Run `chmod +x scripts/**/*.sh` to make all scripts executable

---

## 🎯 Interactive Menu

When you run `nezuko` without arguments, you get an interactive menu:

```
╔══════════════════════════════════════════════════════╗
║         🦊 NEZUKO DEVELOPER CLI                      ║
╠══════════════════════════════════════════════════════╣
║   Telegram Bot Platform • Admin Dashboard • API      ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│  DEVELOPMENT                                         │
│                                                      │
│    [1] 🚀 Start All Services                         │
│    [2] 🛑 Stop All Services                          │
│    [3] 🔄 Restart All Services                       │
├──────────────────────────────────────────────────────┤
│  SETUP & MAINTENANCE                                 │
│                                                      │
│    [4] 📦 First-Time Setup (Install Dependencies)   │
│    [5] 🧹 Clean All Artifacts                        │
│    [6] ♻️  Total Reset (Clean + Reinstall)           │
├──────────────────────────────────────────────────────┤
│  TESTING & TOOLS                                     │
│                                                      │
│    [7] 🧪 Run Tests                                  │
│    [8] 🗄️  Database Tools                            │
│    [9] 🐳 Docker Commands                            │
├──────────────────────────────────────────────────────┤
│    [0] ❌ Exit                                       │
└──────────────────────────────────────────────────────┘
```

---

## 📦 First-Time Setup

Run once after cloning the repository:

```bash
# Windows
nezuko setup

# Mac/Linux
./nezuko setup
```

This will:
1. ✅ Check prerequisites (Python

 3.13+, Bun)
2. ✅ Create Python virtual environment (`.venv`)
3. ✅ Install Python dependencies
4. ✅ Install Node.js dependencies (via Bun)
5. ✅ Create `.env` files from templates
6. ✅ Create storage directories

---

## 🗄️ Database Scripts

```bash
# Setup database (create tables)
python scripts/db/setup.py

# Debug database connection
python scripts/db/debug.py
```

---

## 🧪 Running Tests

```bash
# Interactive test menu
nezuko test

# Direct pytest (with venv activated)
python -m pytest tests/ -v

# With coverage
python -m pytest tests/ --cov=apps --cov-report=html
```

---

## 🧹 Cleaning Artifacts

```bash
# Windows
.\scripts\utils\clean.ps1                   # Clean node_modules, __pycache__, etc.
.\scripts\utils\clean.ps1 -IncludeVenv      # Also remove .venv

# Mac/Linux
./scripts/utils/clean.sh                    # Clean node_modules, __pycache__, etc.
./scripts/utils/clean.sh --include-venv     # Also remove .venv
```

---

## 🐳 Docker

```bash
# Build containers
cd config/docker && docker-compose build

# Start containers
cd config/docker && docker-compose up -d

# View logs
cd config/docker && docker-compose logs -f
```

---

## 📝 Notes

- **Legacy scripts** (`.bat` files) are deprecated but kept for backward compatibility
- **PowerShell scripts** (`.ps1`) are the primary Windows scripts
- **Bash scripts** (`.sh`) are the primary Mac/Linux scripts
- All scripts support `--help` or `-h` for usage information

---

*Last Updated: 2026-01-28*
