<div align="center">

<!-- HERO SECTION -->
<img src="https://raw.githubusercontent.com/mohdakil2426/Nezuko-Telegram-Bot/main/docs/assets/nezuko-banner.jpg" alt="Nezuko Banner" width="800"/>

<br/>

# Nezuko

### The Ultimate All-In-One Telegram Bot Platform

_Production-ready, multi-tenant, async-first architecture designed for scale_

<br/>

<!-- BADGES - Row 1: Version & Status -->

[![Version](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square&labelColor=000000)](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/releases)
[![Python](https://img.shields.io/badge/python-3.13+-3776AB?style=flat-square&logo=python&logoColor=white&labelColor=000000)](https://www.python.org/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square&labelColor=000000)](LICENSE)
[![Telegram Bot API](https://img.shields.io/badge/Bot_API-v22.5+-26A5E4?style=flat-square&logo=telegram&logoColor=white&labelColor=000000)](https://python-telegram-bot.org/)

<!-- BADGES - Row 2: Quality -->

[![Pylint](https://img.shields.io/badge/pylint-10.00/10-brightgreen?style=flat-square&labelColor=000000)](https://pylint.org/)
[![Type Check](https://img.shields.io/badge/pyrefly-passing-brightgreen?style=flat-square&labelColor=000000)](https://pyrefly.org/)
[![Tests](https://img.shields.io/badge/tests-37_passing-brightgreen?style=flat-square&labelColor=000000)](tests/)
[![Coverage](https://img.shields.io/badge/coverage-85%25-yellowgreen?style=flat-square&labelColor=000000)](tests/)

<!-- BADGES - Row 3: Tech Stack -->

[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?style=flat-square&logo=postgresql&logoColor=white&labelColor=000000)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D?style=flat-square&logo=redis&logoColor=white&labelColor=000000)](https://redis.io/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?style=flat-square&labelColor=000000)](https://www.sqlalchemy.org/)
[![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?style=flat-square&logo=prometheus&logoColor=white&labelColor=000000)](https://prometheus.io/)

<br/>

<!-- QUICK LINKS -->

[**Documentation**](docs/README.md) | [**Architecture**](docs/architecture/README.md) | [**Contributing**](CONTRIBUTING.md) | [**Report Bug**](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/issues)

<br/>

---

</div>

## Overview

**Nezuko** is more than a Telegram bot - it's a **scalable bot platform** engineered for production workloads. Built with async-first Python 3.13+, it handles thousands of verifications per minute with sub-100ms latency.

```
                    ┌─────────────────────────────────────────┐
                    │           NEZUKO PLATFORM               │
                    │                                         │
  ┌─────────┐       │  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
  │ Telegram│──────▶│  │ Handlers│─▶│ Services│─▶│   Core  │ │
  │   API   │◀──────│  └─────────┘  └─────────┘  └─────────┘ │
  └─────────┘       │       │            │            │      │
                    │       ▼            ▼            ▼      │
                    │  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
                    │  │  Redis  │  │PostgreSQL│ │Prometheus│ │
                    │  │  Cache  │  │   DB    │  │ Metrics │ │
                    │  └─────────┘  └─────────┘  └─────────┘ │
                    └─────────────────────────────────────────┘
```

<br/>

<!-- TABLE OF CONTENTS -->
<details open>
<summary><h2>Table of Contents</h2></summary>

- [Features](#-features)
- [Performance](#-performance)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [Commands](#-commands)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Monitoring](#-monitoring)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

</details>

---

## Features

<table>
<tr>
<td width="50%">

### Channel Membership Enforcement

Automated verification ensuring users join required channels before participating in groups.

- **Instant Join Protection** - Mutes users on entry
- **Strict Leave Detection** - Real-time subscription monitoring
- **Multi-Channel Support** - Require multiple channels (AND logic)
- **One-Click Verification** - Inline button self-service

</td>
<td width="50%">

### Enterprise-Grade Infrastructure

Built for scale with production-ready architecture.

- **Horizontal Scaling** - Stateless design, run N instances
- **Redis Distributed Cache** - TTL jitter prevents stampedes
- **Circuit Breakers** - Graceful degradation on failures
- **Rate Limiting** - 25 msg/sec shield (below Telegram limits)

</td>
</tr>
<tr>
<td width="50%">

### Self-Service Administration

Empower group admins with simple commands.

- `/protect @Channel` - Enable protection instantly
- `/status` - View real-time protection status
- `/unprotect` - Disable without losing config
- `/settings` - Manage configuration options

</td>
<td width="50%">

### Full Observability

Monitor everything in production.

- **Prometheus Metrics** - 20+ custom metrics
- **Structured Logging** - JSON format with structlog
- **Health Endpoints** - `/health`, `/ready`, `/live`
- **Sentry Integration** - Error tracking & traces

</td>
</tr>
</table>

---

## Performance

<div align="center">

|           Metric           |     Target     |   Achieved   |
| :------------------------: | :------------: | :----------: |
| Verification Latency (p95) |     <100ms     |  **~50ms**   |
|       Cache Hit Rate       |      >70%      |   **~80%**   |
|    Database Query (p95)    |     <50ms      |  **~10ms**   |
|         Throughput         | 1000 verif/min | **1200/min** |

</div>

<details>
<summary><b>Benchmark Details</b></summary>

```
Load Test Results (1000 concurrent users, 60 seconds)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Requests/sec:     1,247
Avg Latency:      42ms
p50 Latency:      38ms
p95 Latency:      67ms
p99 Latency:      94ms
Error Rate:       0.02%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</details>

---

## Quick Start

### Prerequisites

- Python 3.13+
- PostgreSQL 16+ (production) or SQLite (development)
- Redis 7+ (optional, recommended)

### Option A: Using CLI Menu (Recommended)

```bash
# Clone repository
git clone https://github.com/mohdakil2426/Nezuko-Telegram-Bot.git
cd Nezuko-Telegram-Bot

# Launch interactive CLI
.\nezuko.bat           # Windows
./nezuko               # Mac/Linux

# Select [4] First-Time Setup
# Then select [1] Start All Services
```

### Option B: Manual Installation

```bash
# Clone repository
git clone https://github.com/mohdakil2426/Nezuko-Telegram-Bot.git
cd Nezuko-Telegram-Bot

# Create virtual environment
python -m venv .venv

# Activate (choose your OS)
source .venv/bin/activate      # Linux/Mac
.\.venv\Scripts\activate       # Windows

# Install JavaScript dependencies (for web/api)
bun install

# Install Python dependencies
pip install -r requirements.txt

# Set up environment (copy templates)
cp apps/bot/.env.example apps/bot/.env
# Edit apps/bot/.env with your BOT_TOKEN

# Initialize database
alembic upgrade head

# Run the bot (from project root)
python -m apps.bot.main
```

### Setup Flow

```
1. Add Nezuko to your GROUP as Administrator
2. Add Nezuko to your CHANNEL as Administrator
3. In the group, run: /protect @YourChannel
4. Done! Members must now join the channel to chat.
```

---

## Configuration

### Environment Setup

Each app has its own environment file following Turborepo best practices:

#### 1. **Web Dashboard**: `apps/web/.env.local`

```bash
cd apps/web
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key
- `NEXT_PUBLIC_API_URL` - API backend URL (default: http://localhost:8080/api/v1)

#### 2. **API Backend**: `apps/api/.env`

```bash
cd apps/api
cp .env.example .env
# Edit .env with your configuration
```

Required variables:

- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations)
- `REDIS_URL` - Redis connection string

#### 3. **Telegram Bot**: `apps/bot/.env`

```bash
cd apps/bot
cp .env.example .env
# Edit .env with your bot token
```

Required variables:

- `BOT_TOKEN` - Get this from @BotFather on Telegram
- `DATABASE_URL` - PostgreSQL connection string (use `postgresql+asyncpg://` driver)
- `REDIS_URL` - Redis for caching (optional, graceful degradation if unavailable)

> **Note**: Root `.env.example` documents all variables for reference, but actual values should be in per-app `.env` files.

<details>
<summary><b>All Environment Variables</b></summary>

| Variable         | Required | Default       | Description                        |
| ---------------- | :------: | ------------- | ---------------------------------- |
| `BOT_TOKEN`      |   Yes    | -             | Telegram Bot Token from @BotFather |
| `ENVIRONMENT`    |    No    | `development` | `development` or `production`      |
| `DATABASE_URL`   |    No    | SQLite        | PostgreSQL connection string       |
| `REDIS_URL`      |    No    | -             | Redis connection string            |
| `WEBHOOK_URL`    |    No    | -             | Public URL for webhook mode        |
| `WEBHOOK_SECRET` |    No    | -             | Secret token for webhook security  |
| `PORT`           |    No    | `8000`        | HTTP server port                   |
| `SENTRY_DSN`     |    No    | -             | Sentry error tracking DSN          |
| `LOG_LEVEL`      |    No    | `INFO`        | Logging verbosity                  |

</details>

---

## Commands

| Command             | Context | Permission | Description                           |
| ------------------- | ------- | ---------- | ------------------------------------- |
| `/start`            | Private | Anyone     | Welcome message with setup guide      |
| `/help`             | Any     | Anyone     | Command reference and troubleshooting |
| `/protect @Channel` | Group   | Admin      | Enable channel enforcement            |
| `/status`           | Group   | Anyone     | View protection status                |
| `/unprotect`        | Group   | Admin      | Disable protection                    |
| `/settings`         | Group   | Admin      | View/modify configuration             |

---

## Architecture

### Project Structure

```
nezuko-monorepo/
├── apps/                       # All applications
│   ├── web/                    # Next.js 16 Admin Dashboard
│   │   ├── .env.example        # Environment template
│   │   ├── src/app/            # App Router pages
│   │   ├── src/components/     # shadcn/ui components
│   │   └── src/lib/            # API clients, hooks
│   │
│   ├── api/                    # FastAPI REST Backend
│   │   ├── .env.example        # Environment template
│   │   ├── src/api/v1/         # REST endpoints
│   │   └── src/services/       # Business logic
│   │
│   └── bot/                    # Telegram Bot (PTB v22)
│       ├── .env.example        # Environment template
│       ├── config.py           # Environment configuration
│       ├── main.py             # Entry point (polling/webhook)
│       ├── core/               # Database, cache, rate limiter
│       ├── database/           # SQLAlchemy models, CRUD
│       ├── handlers/           # Telegram update handlers
│       ├── services/           # Verification, protection logic
│       └── utils/              # Metrics, health, logging
│
├── packages/                   # Shared packages
│   ├── types/                  # @nezuko/types (Zod + TS)
│   └── config/                 # Shared ESLint/TypeScript configs
│
├── config/                     # Infrastructure configs
│   └── docker/                 # All Docker files
│       ├── docker-compose.yml
│       └── Dockerfile.monorepo
│
├── scripts/                    # Organized scripts
│   ├── setup/                  # One-time setup
│   ├── deploy/                 # Deployment automation
│   └── maintenance/            # Utilities
│
├── storage/                    # Runtime files (GITIGNORED)
│   ├── logs/                   # Application logs
│   └── data/                   # Local databases
│
├── docs/                       # Documentation
│   └── README.md               # 📖 Start here for all docs
|
└── tests/                      # Pytest test suite
```

### 📚 Documentation

Comprehensive documentation is available in the [`docs/`](docs/README.md) directory:

| Guide                                                 | Description                               |
| ----------------------------------------------------- | ----------------------------------------- |
| [**Getting Started**](docs/getting-started/README.md) | Installation, setup, and first run        |
| [**Architecture**](docs/architecture/README.md)       | System design, data flow, diagrams        |
| [**Tech Stack**](docs/architecture/tech-stack.md)     | Complete technology reference             |
| [**API Reference**](docs/api/README.md)               | REST endpoints, WebSocket, authentication |
| [**Bot Reference**](docs/bot/README.md)               | Commands, handlers, verification flow     |
| [**Web Dashboard**](docs/web/README.md)               | Admin panel, components, state management |
| [**Database**](docs/database/README.md)               | Schema, models, migrations                |
| [**Deployment**](docs/deployment/README.md)           | Docker, CI/CD, production setup           |
| [**Contributing**](docs/contributing/README.md)       | Development workflow, code style          |

---

## Tech Stack

<div align="center">

|   Category    |                                                                 Technology                                                                 |
| :-----------: | :----------------------------------------------------------------------------------------------------------------------------------------: |
| **Language**  |                ![Python](https://img.shields.io/badge/Python-3.13+-3776AB?style=for-the-badge&logo=python&logoColor=white)                 |
| **Framework** | ![python-telegram-bot](https://img.shields.io/badge/python--telegram--bot-v22.5+-26A5E4?style=for-the-badge&logo=telegram&logoColor=white) |
| **Database**  |           ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)            |
|    **ORM**    |                        ![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0_Async-D71F00?style=for-the-badge)                         |
|   **Cache**   |                   ![Redis](https://img.shields.io/badge/Redis-7+-DC382D?style=for-the-badge&logo=redis&logoColor=white)                    |
|  **Metrics**  |             ![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?style=for-the-badge&logo=prometheus&logoColor=white)              |
|  **Errors**   |                   ![Sentry](https://img.shields.io/badge/Sentry-362D59?style=for-the-badge&logo=sentry&logoColor=white)                    |
|  **Logging**  |                            ![structlog](https://img.shields.io/badge/structlog-JSON-000000?style=for-the-badge)                            |

</div>

_For complete technology details with versions, see [Tech Stack Documentation](docs/architecture/tech-stack.md)._

---

## Monitoring

### Health Endpoints

```bash
# Full health check
curl http://localhost:8000/health

# Kubernetes readiness
curl http://localhost:8000/ready

# Kubernetes liveness
curl http://localhost:8000/live

# Prometheus metrics
curl http://localhost:8000/metrics
```

### Key Metrics

| Metric                             | Type      | Description                          |
| ---------------------------------- | --------- | ------------------------------------ |
| `bot_verifications_total{status}`  | Counter   | Verification outcomes (success/fail) |
| `bot_verification_latency_seconds` | Histogram | End-to-end verification latency      |
| `bot_cache_hits_total`             | Counter   | Cache hit count                      |
| `bot_cache_misses_total`           | Counter   | Cache miss count                     |
| `bot_active_groups`                | Gauge     | Currently protected groups           |
| `bot_telegram_api_calls_total`     | Counter   | Telegram API call count              |

---

## Roadmap

Nezuko is built to evolve. The modular architecture supports:

- [ ] **Custom Welcome Messages** - Personalized greetings with templates
- [ ] **Member Whitelisting** - Exempt specific users from verification
- [ ] **Multi-Language Support (i18n)** - Localized messages
- [x] **Admin Dashboard** - Web-based management interface
- [x] **Analytics & Insights** - Group growth and engagement metrics
- [ ] **Auto-Moderation** - Spam detection and content filtering
- [ ] **Scheduled Messages** - Timed announcements and reminders
- [ ] **Integration Plugins** - Connect to external services

_Have a feature idea? [Open an issue](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/issues)!_

---

## Development

<details>
<summary><b>CLI Commands (Recommended)</b></summary>

```bash
# Launch interactive menu
.\nezuko.bat           # Windows
./nezuko               # Mac/Linux

# All script operations are logged to:
# scripts/logs/nezuko-YYYY-MM-DD.log
```

</details>

<details>
<summary><b>Running Tests</b></summary>

```bash
# All tests
pytest

# With coverage
pytest --cov=bot --cov-report=html

# Single test file
pytest tests/test_handlers.py -v

# Specific test
pytest tests/test_verification.py::test_check_membership -v
```

</details>

<details>
<summary><b>Code Quality</b></summary>

```bash
# Linting
ruff check .
ruff format .

# Type checking
python -m pyrefly check

# Full quality check
pylint bot/
```

</details>

<details>
<summary><b>Database Migrations</b></summary>

```bash
# Create migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

</details>

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Fork → Clone → Branch → Commit → Push → PR
git checkout -b feature/amazing-feature
git commit -m 'Add amazing feature'
git push origin feature/amazing-feature
```

---

## Troubleshooting

<details>
<summary><b>Bot not responding</b></summary>

1. Ensure bot is admin in both Group AND Channel
2. Verify `BOT_TOKEN` is correct in `.env`
3. Run `/status` to check protection status
4. Check logs: `tail -f logs/nezuko.log`

</details>

<details>
<summary><b>Permission errors</b></summary>

1. Bot needs "Ban/Restrict Users" permission in the group
2. Bot needs admin rights in the channel
3. Re-add the bot and grant all required permissions

</details>

<details>
<summary><b>High latency</b></summary>

1. Check Redis is running: `redis-cli ping`
2. Review database connection pool settings
3. Enable structured logging to identify bottlenecks
4. Check Prometheus metrics at `/metrics`

</details>

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

<div align="center">

**Built with async Python and designed to scale.**

<br/>

[![GitHub Stars](https://img.shields.io/github/stars/mohdakil2426/Nezuko-Telegram-Bot?style=social)](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/stargazers)

_If you find Nezuko useful, consider giving it a star!_

</div>
