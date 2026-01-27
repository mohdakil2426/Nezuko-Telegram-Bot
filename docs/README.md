# 📚 Nezuko Documentation

> **Official Documentation for the Nezuko Telegram Bot Platform**

Welcome to the Nezuko documentation. This guide covers everything you need to get started, develop features, and deploy to production.

---

## 📖 Public Documentation (GitHub Release)

| Section | Description |
|---------|-------------|
| [**Getting Started**](./getting-started/) | Quick setup guides for all components |
| [**Architecture**](./architecture/) | System design, data flow, and component diagrams |
| [**API Reference**](./api/) | FastAPI endpoints, schemas, and authentication |
| [**Bot Reference**](./bot/) | Telegram bot commands, handlers, and events |
| [**Web Dashboard**](./web/) | Admin panel components, routing, and state |
| [**Database**](./database/) | Schema, models, migrations, and queries |
| [**Deployment**](./deployment/) | Docker, production setup, and CI/CD |
| [**Contributing**](./contributing/) | Development workflow and coding standards |

---

## 🔒 Local Documentation (Not for Release)

The following documentation is for internal development only and should NOT be included in public releases:

| Folder | Description |
|--------|-------------|
| [`local/admin-panel/`](./local/admin-panel/) | Internal admin panel development docs |
| [`local/official-rules-docs/`](./local/official-rules-docs/) | Internal rules and policies |
| [`local/openspec-my-guide/`](./local/openspec-my-guide/) | OpenSpec workflow guide |

---

## 🗺️ Navigation

```
docs/
├── README.md                    # This file
│
├── getting-started/             # Quick start guides
│   ├── README.md                # Overview and prerequisites
│   ├── quick-start.md           # 5-minute setup
│   ├── installation.md          # Detailed installation
│   └── configuration.md         # Environment variables
│
├── architecture/                 # System architecture
│   ├── README.md                # Architecture overview
│   ├── system-overview.md       # High-level diagrams
│   ├── data-flow.md             # Request/response flows
│   ├── component-diagrams.md    # Mermaid diagrams
│   └── folder-structure.md      # Project organization
│
├── api/                          # API documentation
│   ├── README.md                # API overview
│   ├── authentication.md        # JWT, Supabase auth
│   ├── endpoints.md             # All REST endpoints
│   ├── websocket.md             # Real-time WebSocket
│   └── errors.md                # Error codes & handling
│
├── bot/                          # Bot documentation
│   ├── README.md                # Bot overview
│   ├── commands.md              # All bot commands
│   ├── handlers.md              # Event handlers
│   ├── verification.md          # Verification flow
│   └── configuration.md         # Bot configuration
│
├── web/                          # Web dashboard docs
│   ├── README.md                # Dashboard overview
│   ├── routing.md               # App Router structure
│   ├── components.md            # UI components
│   ├── state-management.md      # Zustand & TanStack Query
│   └── authentication.md        # Supabase SSR auth
│
├── database/                     # Database docs
│   ├── README.md                # Schema overview
│   ├── models.md                # SQLAlchemy models
│   ├── migrations.md            # Alembic migrations
│   └── diagrams.md              # ER diagrams
│
├── deployment/                   # Deployment docs
│   ├── README.md                # Deployment overview
│   ├── docker.md                # Docker setup
│   ├── production.md            # Production checklist
│   └── ci-cd.md                 # GitHub Actions
│
├── contributing/                 # Contributor docs
│   ├── README.md                # Contribution guide
│   ├── development.md           # Local development
│   ├── code-style.md            # Coding standards
│   └── testing.md               # Testing strategies
│
└── local/                        # ⚠️ LOCAL ONLY - Not for release
    ├── admin-panel/             # Internal admin docs
    ├── official-rules-docs/     # Internal policies
    └── openspec-my-guide/       # OpenSpec workflow
```

---

## 🔗 Quick Links

- **[GitHub Repository](https://github.com/mohdakil2426/Nezuko-Telegram-Bot)**
- **[Report an Issue](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/issues)**
- **[Tech Stack](../TECH_STACK.md)**
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

*Last Updated: 2026-01-27*
