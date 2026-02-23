# Technical Context: Stack & Development

## Technology Stack

### Bot (Python 3.13)
| Package | Version | Purpose |
| --- | --- | --- |
| python-telegram-bot | 22.6+ | Telegram Bot API |
| httpx | 0.27+ | InsForge REST API client |
| SQLAlchemy | 2.0+ | Async ORM (tests only — SQLite) |
| Pydantic | 2.12+ | Data validation |
| Redis | 7.1+ | Caching |

### Frontend (TypeScript)
| Package | Version | Purpose |
| --- | --- | --- |
| Next.js | 16.1+ | React framework |
| React | 19.2+ | UI library |
| TypeScript | 5.9+ | Type safety |
| Tailwind CSS | 4.1+ | Styling |
| TanStack Query | 5.90+ | Data fetching |
| shadcn/ui | Latest | UI components |
| Recharts | 3.7+ | Charts |
| @insforge/sdk | Latest | InsForge BaaS client |
| motion | 12.27+ | UI/UX React Micro-Animations |

### Infrastructure
| Tool | Purpose |
| --- | --- |
| **InsForge BaaS** | Managed PostgreSQL, Realtime, Storage, Edge Functions |
| **Koyeb** | Bot Hosting (Docker/Python) - Free Tier |
| **Vercel** | Web Hosting (Next.js) - Free Tier |
| **Docker** | Bot containerization |
| **Caddy** | Reverse proxy |
| **Bun** | Package manager (web) |

---

## Development Setup

### Quick Start

```bash
# Install dependencies
pip install -r requirements.txt -r requirements-dev.txt
cd apps/web && bun install

# Start services (Parallel)
python -m apps.bot.main          # Bot (from root)
cd apps/web && bun dev           # Web (port 3000)
```

### Environment Files

| App | File | Template |
| --- | --- | --- |
| Bot | `apps/bot/.env` | `apps/bot/.env.example` |
| Web | `apps/web/.env.local` | `apps/web/.env.example` |

### Required Environment Variables

```bash
# Bot (apps/bot/.env)
BOT_TOKEN=<telegram-bot-token>
INSFORGE_BASE_URL=https://u4ckbciy.us-west.insforge.app
INSFORGE_ANON_KEY=<insforge-anon-key>
ENCRYPTION_KEY=<fernet-key>
REDIS_URL=redis://127.0.0.1:6379/0
LOG_LEVEL=DEBUG
# DATABASE_URL is only used in tests (auto-set to SQLite)

# Web (apps/web/.env.local)
NEXT_PUBLIC_INSFORGE_BASE_URL=https://u4ckbciy.us-west.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=<insforge-anon-key>
NEXT_PUBLIC_LOGIN_BOT_USERNAME=YourBotUsername
```

---

## Code Quality Tools

### Tool Responsibility Matrix

| Concern | Primary Tool | Notes |
| --- | --- | --- |
| Linting (style, logic) | **Ruff** | Covers F, E, W, I, UP, B, SIM, RUF rules |
| Formatting | **Ruff** | Auto-format on save via VS Code |
| Import checking | **Ruff** (F) + **Pyrefly** | Pylint `import-error` disabled |
| Type checking | **Pyrefly** | Runs from venv Python |
| Code quality scoring | **Pylint** | Score target: 10.00/10 |

### Python CLI Commands

```bash
# All from project root
ruff check apps/bot                             # Lint (0 errors)
ruff format .                                   # Format
pylint apps/bot --rcfile=pyproject.toml          # Score (10.00/10)
.venv/Scripts/python.exe -m pyrefly check       # Types (0 errors)
pytest                                           # Tests
```

### TypeScript CLI Commands

```bash
cd apps/web
bun run lint                    # ESLint (0 warnings)
bun run knip                    # Dead code check
bun run build                   # TypeScript (0 errors)
bun run format                  # Prettier + Tailwind Sort
```

---

## Database (InsForge Managed PostgreSQL)

-   **Base URL**: `https://u4ckbciy.us-west.insforge.app`
-   **Access (Bot)**: REST API via `httpx` — `GET/POST/PATCH /api/database/records/{table}`
-   **Access (Web)**: InsForge SDK (TypeScript) — `@insforge/sdk`
-   **Auth header**: `Authorization: Bearer <INSFORGE_ANON_KEY>`
-   **Tables**: 13 (created via `insforge/migrations/001-005.sql`)
-   **RPC Functions**: 15 (analytics + charts)
-   **Realtime Triggers**: 4 (verification, bot_status, commands, logs)
-   **Schema managed via**: Raw SQL migration files in `insforge/migrations/`
-   **⚠️ No direct PG connection**: InsForge does not expose raw PostgreSQL passwords.

---

## File Locations

| Type | Location |
| --- | --- |
| Tests | `tests/bot/` |
| Logs | `apps/bot/logs/` |
| Python deps | `requirements.txt` + `requirements-dev.txt` |
| SQL Migrations | `insforge/migrations/` |
| Edge Functions | `insforge/functions/` |
| Pre-migration backup | `docs/local/backup-2026-02-12-105223/` |

---

_Last Updated: 2026-02-23 (Phase 58)_
