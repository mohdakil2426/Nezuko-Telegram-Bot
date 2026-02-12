# 📚 Nezuko Documentation

> **Official Documentation for the Nezuko Telegram Bot Platform**

Welcome to the Nezuko documentation. This guide covers everything you need to get started, develop features, and deploy to production.

---

## 📖 Documentation

| Section                                            | Description                                      |
| -------------------------------------------------- | ------------------------------------------------ |
| [**Getting Started**](./getting-started/README.md) | Quick setup guides for all components            |
| [**Architecture**](./architecture/README.md)       | System design, data flow, and component diagrams |
| [**Tech Stack**](./architecture/tech-stack.md)     | Complete technology reference                    |
| [**Bot Reference**](./bot/README.md)               | Telegram bot commands, handlers, and events      |
| [**Web Dashboard**](./web/README.md)               | Admin panel components, routing, and state       |
| [**Database**](./database/README.md)               | Schema, models, migrations, and queries          |
| [**Deployment**](./deployment/README.md)           | Docker, production setup, and CI/CD              |
| [**Contributing**](./contributing/README.md)       | Development workflow and coding standards        |

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

- Node.js 20+
- Python 3.13+
- Git
- InsForge Account

### Installation

```bash
# Clone repository
git clone https://github.com/mohdakil2426/Nezuko-Telegram-Bot.git
cd Nezuko-Telegram-Bot

# Install dependencies
npm install
pip install -r requirements.txt
```

### Run Development Servers

```bash
# Start all services
npm run dev
```

---

## 📂 Key Directories

| Directory       | Purpose                                |
| --------------- | -------------------------------------- |
| `apps/bot/`     | Telegram bot application               |
| `apps/web/`     | Next.js admin dashboard                |
| `storage/`      | Runtime files (logs, cache)            |
| `scripts/`      | CLI utilities and automation           |

---

## 🔗 Quick Links

- **[GitHub Repository](https://github.com/mohdakil2426/Nezuko-Telegram-Bot)**
- **[Report an Issue](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/issues)**
- **[Tech Stack](./architecture/tech-stack.md)**
- **[Contributing Guide](../CONTRIBUTING.md)**

---

## 📋 Version Information

| Component     | Version |
| ------------- | ------- |
| Bot Core      | v1.0.0  |
| API           | v0.1.0  |
| Web Dashboard | v0.1.0  |
| Documentation | v1.0.0  |

---

_Last Updated: 2026-02-05_
