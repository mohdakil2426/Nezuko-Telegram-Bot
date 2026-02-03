<div align="center">

<!-- BANNER -->
<img src="docs/assets/nezuko-banner.jpg" alt="Nezuko Banner" width="100%"/>

<br/>
<br/>

<!-- HERO SECTION -->

# 🌸 Nezuko

### The Ultimate All-In-One Telegram Bot Platform

**Production-ready • Multi-tenant • Async-first • Built for Scale**

<br/>

<!-- BADGES - Row 1: Core Info -->

[![Version](https://img.shields.io/badge/version-1.0.0-9333ea?style=for-the-badge&labelColor=1a1a2e)](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/releases)
[![Python](https://img.shields.io/badge/python-3.13+-3776AB?style=for-the-badge&logo=python&logoColor=white&labelColor=1a1a2e)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white&labelColor=1a1a2e)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge&labelColor=1a1a2e)](LICENSE)

<!-- BADGES - Row 2: Quality Metrics -->

[![Pylint](https://img.shields.io/badge/pylint-10.00/10-brightgreen?style=for-the-badge&labelColor=1a1a2e)](https://pylint.org/)
[![Type Check](https://img.shields.io/badge/pyrefly-0_errors-brightgreen?style=for-the-badge&labelColor=1a1a2e)](https://pyrefly.org/)
[![Tests](https://img.shields.io/badge/tests-19_passing-brightgreen?style=for-the-badge&labelColor=1a1a2e)](tests/)
[![Build](https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge&labelColor=1a1a2e)](https://github.com/mohdakil2426/Nezuko-Telegram-Bot)

<!-- BADGES - Row 3: Tech Stack -->

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white&labelColor=1a1a2e)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.128+-009688?style=for-the-badge&logo=fastapi&logoColor=white&labelColor=1a1a2e)](https://fastapi.tiangolo.com/)
[![Telegram Bot API](https://img.shields.io/badge/PTB-v22.6+-26A5E4?style=for-the-badge&logo=telegram&logoColor=white&labelColor=1a1a2e)](https://python-telegram-bot.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white&labelColor=1a1a2e)](https://supabase.com/)

<br/>

<!-- QUICK LINKS -->

[**📖 Documentation**](docs/README.md) • [**🏗️ Architecture**](docs/architecture/README.md) • [**🚀 Quick Start**](#-quick-start) • [**🤝 Contributing**](docs/contributing/README.md)

<br/>

</div>

---

<!-- TABLE OF CONTENTS -->
<details open>
<summary><h2>📑 Table of Contents</h2></summary>

- [✨ What is Nezuko?](#-what-is-nezuko)
- [🎯 Key Features](#-key-features)
- [📈 Performance Metrics](#-performance-metrics)
- [🚀 Quick Start](#-quick-start)
- [🏗️ Project Structure](#️-project-structure)
- [💻 Tech Stack](#-tech-stack)
- [🎨 Dashboard Preview](#-dashboard-preview)
- [🧪 Development](#-development)
- [📚 Documentation](#-documentation)
- [🔧 Bot Commands](#-bot-commands)
- [🗺️ Roadmap](#️-roadmap)
- [🤝 Contributing](#-contributing)
- [🐛 Troubleshooting](#-troubleshooting)
- [📄 License](#-license)
- [Built with 💜 using async Python \& modern React](#built-with--using-async-python--modern-react)

</details>

---

## ✨ What is Nezuko?

**Nezuko** is a complete **Telegram bot ecosystem** for automated channel membership enforcement. It's not just a bot — it's a full-stack platform with an admin dashboard, REST API, and enterprise-grade bot engine.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          NEZUKO MONOREPO                                │
├─────────────────────┬─────────────────────┬─────────────────────────────┤
│      apps/web       │      apps/api       │        apps/bot             │
│   ┌─────────────┐   │   ┌─────────────┐   │    ┌─────────────┐          │
│   │  Next.js 16 │   │   │   FastAPI   │   │    │     PTB     │          │
│   │  React 19   │   │   │  REST API   │   │    │   v22.6+    │          │
│   │  shadcn/ui  │   │   │  Pydantic   │   │    │   AsyncIO   │          │
│   └──────┬──────┘   │   └──────┬──────┘   │    └──────┬──────┘          │
│          │          │          │          │           │                 │
└──────────┼──────────┴──────────┼──────────┴───────────┼─────────────────┘
           │                     │                      │
           └─────────────────────┴──────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │   PostgreSQL + Redis    │
                    │      (Supabase)         │
                    └─────────────────────────┘
```

<br/>

## 🎯 Key Features

<table>
<tr>
<td width="50%">

### 🔐 Channel Membership Enforcement

Automatically ensure users join required channels before participating in groups.

- **Instant Join Protection** — Mutes users the moment they join
- **Real-time Leave Detection** — Revokes access immediately
- **Multi-Channel Support** — Require multiple channels (AND logic)
- **One-Click Verification** — Self-service inline buttons

</td>
<td width="50%">

### 📊 Admin Dashboard

A beautiful, responsive web interface for complete control.

- **26 shadcn/ui Components** — Clean, professional design
- **10 Analytics Charts** — Donut, bar, line, radial visualizations
- **TanStack Table** — Sortable, filterable data grids
- **Light/Dark/System Themes** — Automatic theme detection

</td>
</tr>
<tr>
<td width="50%">

### ⚡ Enterprise Performance

Built for scale with production-ready architecture.

- **Sub-100ms Latency** — p95 verification under 50ms
- **Redis Distributed Cache** — 80%+ cache hit rate
- **Horizontal Scaling** — Stateless design, run N instances
- **Rate Limiting** — Built-in Telegram API protection

</td>
<td width="50%">

### 🛠️ Self-Service Admin Commands

Empower group admins with simple commands.

- `/protect @Channel` — Enable protection instantly
- `/status` — View real-time protection status
- `/unprotect` — Disable protection cleanly
- `/settings` — Configure verification behavior

</td>
</tr>
</table>

<br/>

## 📈 Performance Metrics

<div align="center">

|             Metric             | Target |   Achieved   |
| :----------------------------: | :----: | :----------: |
| **Verification Latency (p95)** | <100ms | **~50ms** ✅ |
|       **Cache Hit Rate**       |  >70%  | **~80%** ✅  |
|    **Database Query (p95)**    | <50ms  | **~10ms** ✅ |
|        **Pylint Score**        | 10.00  | **10.00** ✅ |
|        **Type Errors**         |   0    |   **0** ✅   |

</div>

<br/>

## 🚀 Quick Start

### Prerequisites

| Requirement    | Version | Notes                                   |
| -------------- | ------- | --------------------------------------- |
| **Python**     | 3.13+   | Required for bot & API                  |
| **Node.js**    | 20+     | Required for web dashboard              |
| **Bun**        | 1.3+    | Recommended (faster than npm)           |
| **PostgreSQL** | 15+     | Production database (or SQLite for dev) |
| **Redis**      | 7+      | Optional, but recommended               |

### Option A: Interactive CLI (Recommended)

```bash
# Clone the repository
git clone https://github.com/mohdakil2426/Nezuko-Telegram-Bot.git
cd Nezuko-Telegram-Bot

# Launch the interactive menu
.\nezuko.bat           # Windows
./nezuko               # Mac/Linux

# Select [4] First-Time Setup
# Then  [1] Start All Services
```

### Option B: Manual Setup

```bash
# Clone and enter directory
git clone https://github.com/mohdakil2426/Nezuko-Telegram-Bot.git
cd Nezuko-Telegram-Bot

# Install Node.js dependencies
bun install

# Create Python virtual environment
python -m venv .venv
.\.venv\Scripts\activate    # Windows
source .venv/bin/activate   # Mac/Linux

# Install Python dependencies
pip install -r requirements.txt

# Set up environment files
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp apps/bot/.env.example apps/bot/.env
# Edit each .env file with your credentials
```

### Running Services

```bash
# Terminal 1: Web Dashboard (localhost:3000)
cd apps/web && bun dev

# Terminal 2: API Server (localhost:8080)
cd apps/api && uvicorn src.main:app --reload --port 8080

# Terminal 3: Telegram Bot (run from project root!)
python -m apps.bot.main
```

### Bot Setup Flow

```
1️⃣  Add Nezuko to your GROUP as Administrator
2️⃣  Add Nezuko to your CHANNEL as Administrator
3️⃣  In the group, run: /protect @YourChannel
4️⃣  Done! Members must now join the channel to chat.
```

<br/>

## 🏗️ Project Structure

```
nezuko-monorepo/
├── 📁 apps/
│   ├── 🌐 web/                 # Next.js 16 Admin Dashboard
│   │   ├── src/app/            # App Router pages
│   │   ├── src/components/     # shadcn/ui + custom components
│   │   ├── src/lib/            # Hooks, services, utilities
│   │   └── .env.local          # Web environment
│   │
│   ├── 🔌 api/                 # FastAPI REST Backend
│   │   ├── src/api/v1/         # Versioned endpoints
│   │   ├── src/core/           # Auth, database, security
│   │   ├── src/services/       # Business logic
│   │   └── .env                # API environment
│   │
│   └── 🤖 bot/                 # Telegram Bot Engine
│       ├── handlers/           # Command & event handlers
│       ├── services/           # Verification logic
│       ├── core/               # Database, cache, limiter
│       └── .env                # Bot environment
│
├── 📦 packages/                # Shared packages
│   ├── types/                  # @nezuko/types (TypeScript)
│   └── config/                 # Shared ESLint/TS configs
│
├── 🐳 config/docker/           # Docker configurations
├── 📜 scripts/                 # Dev, setup, deploy scripts
├── 📂 storage/                 # Runtime files (gitignored)
├── 📚 docs/                    # Comprehensive documentation
└──  🧪 tests/                   # Pytest test suites
```

<br/>

## 💻 Tech Stack

<div align="center">

### Frontend

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.1-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![shadcn/ui](https://img.shields.io/badge/shadcn/ui-26_components-000000?style=for-the-badge)](https://ui.shadcn.com/)

### Backend

[![Python](https://img.shields.io/badge/Python-3.13+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.128+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0_Async-D71F00?style=for-the-badge)](https://www.sqlalchemy.org/)
[![Pydantic](https://img.shields.io/badge/Pydantic-V2-E92063?style=for-the-badge&logo=pydantic&logoColor=white)](https://docs.pydantic.dev/)

### Bot & Infrastructure

[![PTB](https://img.shields.io/badge/python--telegram--bot-v22.6+-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://python-telegram-bot.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

</div>

<details>
<summary><b>📋 Full Technology Reference</b></summary>

| Category               | Technology          | Version                |
| ---------------------- | ------------------- | ---------------------- |
| **Frontend Framework** | Next.js             | 16.1.6                 |
| **React**              | React               | 19.2.3                 |
| **Styling**            | Tailwind CSS        | 4.1.x                  |
| **UI Components**      | shadcn/ui           | Latest (26 components) |
| **State Management**   | TanStack Query      | 5.76.2                 |
| **Data Tables**        | TanStack Table      | 8.21.3                 |
| **Charts**             | Recharts            | 2.15.3                 |
| **Theming**            | next-themes         | 0.4.6                  |
| **Backend Framework**  | FastAPI             | 0.128+                 |
| **ORM**                | SQLAlchemy          | 2.0 (async)            |
| **Validation**         | Pydantic            | V2                     |
| **Bot Library**        | python-telegram-bot | 22.6+                  |
| **Database**           | PostgreSQL          | 15+                    |
| **Cache**              | Redis               | 7+                     |
| **Auth**               | Supabase Auth       | Latest                 |
| **Package Manager**    | Bun                 | 1.3+                   |
| **Monorepo**           | Turborepo           | Latest                 |

</details>

<br/>

## 🎨 Dashboard Preview

The admin dashboard is built with **pure shadcn/ui** components for maintainability and a professional look.

### Features

| Feature                    | Description                                        |
| -------------------------- | -------------------------------------------------- |
| **📊 Dashboard**           | Overview stats, activity feed, verification charts |
| **👥 Groups Management**   | View, search, filter protected groups              |
| **📢 Channels Management** | Manage linked channels with full CRUD              |
| **📈 Analytics**           | 4-tab layout with 10 chart types                   |
| **⚙️ Settings**            | Theme toggle, account info, preferences            |

### Data Architecture

```
Component → Hook → Service → (Mock or API) → Response
```

Toggle between mock data and real API with a single environment variable:

```bash
# apps/web/.env.local
NEXT_PUBLIC_USE_MOCK=true   # Development (mock data)
NEXT_PUBLIC_USE_MOCK=false  # Production (real API)
```

<br/>

## 🧪 Development

### Commands

```bash
# Run all services (from root)
npx turbo dev

# Individual services
cd apps/web && bun dev                                    # Web: localhost:3000
cd apps/api && uvicorn src.main:app --reload --port 8080  # API: localhost:8080
python -m apps.bot.main                                   # Bot (from root!)
```

### Testing

```bash
# Run all tests
pytest

# With coverage report
pytest --cov=apps --cov-report=html

# Specific test file
pytest tests/bot/test_handlers.py -v
```

### Code Quality

```bash
# Python linting (target: 10.00/10)
ruff check .
ruff format .
pylint apps/bot apps/api

# Type checking (target: 0 errors)
python -m pyrefly check

# TypeScript linting
cd apps/web && bun run lint
```

### Database Migrations

```bash
# Apply migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"

# Rollback last migration
alembic downgrade -1
```

<br/>

## 📚 Documentation

Comprehensive documentation is available in [`docs/`](docs/README.md):

| Guide                                                 | Description                         |
| ----------------------------------------------------- | ----------------------------------- |
| [**📚 Docs Home**](docs/README.md)                    | Documentation index & quick links   |
| [**Getting Started**](docs/getting-started/README.md) | Installation, setup, first run      |
| [**Architecture**](docs/architecture/README.md)       | System design, data flow, diagrams  |
| [**Tech Stack**](docs/architecture/tech-stack.md)     | Complete technology reference       |
| [**API Reference**](docs/api/README.md)               | REST endpoints, authentication      |
| [**Bot Reference**](docs/bot/README.md)               | Commands, handlers, verification    |
| [**Web Dashboard**](docs/web/README.md)               | Components, hooks, state management |
| [**Database**](docs/database/README.md)               | Schema, models, migrations          |
| [**Deployment**](docs/deployment/README.md)           | Docker, CI/CD, production setup     |
| [**Contributing**](docs/contributing/README.md)       | Development workflow, code style    |

<br/>

## 🔧 Bot Commands

| Command             | Context | Permission | Description                           |
| ------------------- | ------- | ---------- | ------------------------------------- |
| `/start`            | Private | Anyone     | Welcome message with setup guide      |
| `/help`             | Any     | Anyone     | Command reference and troubleshooting |
| `/protect @Channel` | Group   | Admin      | Enable channel enforcement            |
| `/status`           | Group   | Anyone     | View protection status                |
| `/unprotect`        | Group   | Admin      | Disable protection                    |
| `/settings`         | Group   | Admin      | View/modify configuration             |

<br/>

## 🗺️ Roadmap

### Completed ✅

- [x] **Telegram Bot Engine** — Async verification with PTB v22.6
- [x] **FastAPI REST Backend** — Pydantic V2, SQLAlchemy 2.0
- [x] **Admin Dashboard** — Pure shadcn/ui with 26 components
- [x] **Analytics Charts** — 10 chart types across 4 tabs
- [x] **Supabase Auth** — JWT-based authentication
- [x] **Mock Data Layer** — Development without backend

### Planned 🚧

- [ ] **Multi-Language Support (i18n)** — Localized bot messages
- [ ] **Member Whitelisting** — Exempt specific users
- [ ] **Telegram Login Widget** — Seamless web auth
- [ ] **Command Palette** — Cmd+K quick actions
- [ ] **Auto-Moderation** — Spam detection & filtering
- [ ] **Scheduled Messages** — Timed announcements

<br/>

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](docs/contributing/README.md) for details.

```bash
# Fork → Clone → Branch → Commit → Push → PR
git checkout -b feature/amazing-feature
git commit -m 'feat: add amazing feature'
git push origin feature/amazing-feature
```

<br/>

## 🐛 Troubleshooting

<details>
<summary><b>Bot not responding</b></summary>

1. Ensure bot is admin in **both** Group AND Channel
2. Verify `BOT_TOKEN` is correct in `apps/bot/.env`
3. Run `/status` in the group to check protection status
4. Check logs: `storage/logs/bot.log`

</details>

<details>
<summary><b>Permission errors</b></summary>

1. Bot needs "Ban/Restrict Users" permission in the group
2. Bot needs admin rights in the channel to check membership
3. Re-add the bot and grant all required permissions

</details>

<details>
<summary><b>Dashboard not loading</b></summary>

1. Ensure `bun dev` is running in `apps/web`
2. Check `NEXT_PUBLIC_USE_MOCK=true` for offline development
3. Verify `.env.local` exists with correct values
4. Check browser console for errors

</details>

<details>
<summary><b>API connection issues</b></summary>

1. Ensure API is running on port 8080
2. Check CORS configuration in `apps/api/src/main.py`
3. Verify `NEXT_PUBLIC_API_URL` in web's `.env.local`

</details>

<br/>

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.

<br/>

---

<div align="center">

### Built with 💜 using async Python & modern React

<br/>

[![GitHub Stars](https://img.shields.io/github/stars/mohdakil2426/Nezuko-Telegram-Bot?style=social)](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/mohdakil2426/Nezuko-Telegram-Bot?style=social)](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/network/members)

**If Nezuko helps your community, consider giving it a ⭐!**

<br/>

[Report Bug](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/issues) • [Request Feature](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/issues) • [Discussions](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/discussions)

</div>
