# 📜 Scripts Directory

Utility scripts for development, deployment, and maintenance.

## 📁 Directory Structure

```
scripts/
├── dev/              # 🚀 Development server scripts
│   ├── start.bat     # Start all services (3 terminals) - Windows CMD
│   ├── start.ps1     # Start all services (3 terminals) - PowerShell
│   └── stop.bat      # Stop all running services
│
├── setup/            # 📦 Initial setup scripts
│   └── install.bat   # First-time project setup (deps, env files)
│
├── db/               # 🗄️ Database scripts
│   ├── init.sql      # Initial database schema
│   ├── setup.py      # Database setup utility
│   └── debug.py      # Database debugging tool
│
├── deploy/           # 🚢 Deployment scripts
│   └── docker-build.sh  # Docker build script
│
└── utils/            # 🔧 Utility scripts
    ├── generate-structure.ps1  # Generate folder structure
    ├── manage.ps1              # Project management utilities
    └── run-tests.py            # Test runner
```

---

## 🚀 Quick Start

### Start Development Servers

```powershell
# PowerShell (Recommended - colored output)
.\scripts\dev\start.ps1

# Or Windows CMD
.\scripts\dev\start.bat
```

This opens **3 separate terminals**:
- 🔵 **Web Dashboard** - http://localhost:3000
- 🟢 **API Server** - http://localhost:8080  
- 🟡 **Telegram Bot** - Polling mode

### Stop All Services

```powershell
.\scripts\dev\stop.bat
```

Or just press `Ctrl+C` in each terminal window.

---

## 📦 First-Time Setup

Run once after cloning:

```powershell
.\scripts\setup\install.bat
```

This will:
1. ✅ Check prerequisites (Python, Bun)
2. ✅ Create virtual environment
3. ✅ Install all dependencies
4. ✅ Create `.env` files from templates
5. ✅ Create storage directories

---

## 🗄️ Database Scripts

```powershell
# Setup database
python scripts\db\setup.py

# Debug database issues
python scripts\db\debug.py
```

---

## 📝 Notes

- All `.bat` scripts work in Windows CMD
- All `.ps1` scripts work in PowerShell (recommended for better output)
- Scripts auto-detect and use the `.venv` virtual environment
