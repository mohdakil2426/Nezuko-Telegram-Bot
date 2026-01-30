# 📚 Nezuko Documentation

> **Official Documentation for the Nezuko Telegram Bot Platform**

Welcome to the Nezuko documentation. This guide covers everything you need to get started, develop features, and deploy to production.

---

## 📖 Documentation

| Section | Description |
|---------|-------------|
| [**Getting Started**](./getting-started/) | Quick setup guides for all components |
| [**Architecture**](./architecture/) | System design, data flow, and component diagrams |
| [**Tech Stack**](./architecture/tech-stack.md) | Complete technology reference |
| [**API Reference**](./api/) | FastAPI endpoints, schemas, and authentication |
| [**Bot Reference**](./bot/) | Telegram bot commands, handlers, and events |
| [**Web Dashboard**](./web/) | Admin panel components, routing, and state |
| [**Database**](./database/) | Schema, models, migrations, and queries |
| [**Deployment**](./deployment/) | Docker, production setup, and CI/CD |
| [**Contributing**](./contributing/) | Development workflow and coding standards |

---

## 🗺️ Navigation

```
docs/
├── README.md                    # This file (You are here)
│
├── getting-started/             # Quick start guides
│   └── README.md               # Installation, setup, verification
│
├── architecture/                # System architecture
│   ├── README.md               # Architecture overview + diagrams
│   ├── tech-stack.md           # Technology reference
│   ├── diagrams.md             # All Mermaid diagrams
│   ├── folder-structure.md     # Project organization
│   └── horizontal-scaling.md   # Scaling strategies
│
├── api/                         # API documentation
│   └── README.md               # Complete API reference
│
├── bot/                         # Bot documentation
│   └── README.md               # Commands, handlers, verification
│
├── web/                         # Web dashboard docs
│   └── README.md               # Components, routing, state
│
├── database/                    # Database docs
│   └── README.md               # Schema, models, migrations
│
├── deployment/                  # Deployment docs
│   └── README.md               # Docker, CI/CD, production
│
└── contributing/                # Contributor docs
    └── README.md               # Development workflow
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ with Bun
- Python 3.13+
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/mohdakil2426/Nezuko-Telegram-Bot.git
cd Nezuko-Telegram-Bot

# Install dependencies (use the unified CLI)
./nezuko.bat  # Select option 4

# Or install directly
pip install -r requirements.txt
bun install
```

### Run Development Servers

```bash
# Option 1: Interactive menu
./nezuko.bat

# Option 2: Direct commands
./scripts/dev/start.ps1    # Start all services
./scripts/dev/stop.ps1     # Stop all services
```

---

## 📂 Key Directories

| Directory | Purpose |
|-----------|---------|
| `apps/api/` | FastAPI REST backend |
| `apps/bot/` | Telegram bot application |
| `apps/web/` | Next.js admin dashboard |
| `requirements/` | Modular Python dependencies |
| `storage/` | Runtime files (databases, logs, cache) |
| `scripts/` | CLI utilities and automation |
| `memory-bank/` | Project context for AI agents |

---

## 🔗 Quick Links

- **[GitHub Repository](https://github.com/mohdakil2426/Nezuko-Telegram-Bot)**
- **[Report an Issue](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/issues)**
- **[Tech Stack](./architecture/tech-stack.md)**
- **[Contributing Guide](../CONTRIBUTING.md)**

---

## 📋 Version Information

| Component | Version |
|-----------|---------|
| Bot Core | v1.0.0 |
| API | v0.1.0 |
| Web Dashboard | v0.1.0 |
| Documentation | v1.0.0 |

---

*Last Updated: 2026-01-30*
