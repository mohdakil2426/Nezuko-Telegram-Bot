# Technical Context: Stack & Development

## Technology Stack

### Bot (Python 3.13)
| Package | Version | Purpose |
| --- | --- | --- |
| python-telegram-bot | 22.6+ | Telegram Bot API |
| SQLAlchemy | 2.0+ | Async ORM |
| Pydantic | 2.12+ | Data validation |
| AsyncPG | 0.31+ | PostgreSQL driver |
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

### Infrastructure
| Tool | Purpose |
| --- | --- |
| **InsForge BaaS** | Managed PostgreSQL, Realtime, Storage, Edge Functions |
| **Docker** | Bot containerization |
| **Turborepo** | Monorepo management |
| **Caddy** | Reverse proxy |
| **Bun** | Package manager (web) |

---

## Development Setup

### Quick Start

```bash
# Install dependencies
pip install -r requirements/base.txt -r requirements/dev.txt
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
# Bot (.env)
BOT_TOKEN=<telegram-bot-token>
DATABASE_URL=postgresql+asyncpg://<user>:<pass>@<insforge-host>:<port>/<db>?sslmode=require
ENCRYPTION_KEY=<fernet-key>
REDIS_URL=redis://localhost:6379/0

# Web (.env.local)
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
-   **Hostname**: `db.u4ckbciy.us-west.insforge.app` (Port 5432 or 6543)
-   **Driver**: `asyncpg` (Python) - Requires `ssl="require"` in `connect_args`, NOT `sslmode` in URL.
-   **Tables**: 13 (created via `insforge/migrations/001-005.sql`)
-   **RPC Functions**: 15 (analytics + charts)
-   **Realtime Triggers**: 4 (verification, bot_status, commands, logs)
-   **Schema managed via**: Raw SQL migration files in `insforge/migrations/`

---

## File Locations

| Type | Location |
| --- | --- |
| Tests | `tests/bot/` |
| Logs | `storage/logs/` |
| Python deps | `requirements/*.txt` |
| Docker | `config/docker/` |
| SQL Migrations | `insforge/migrations/` |
| Edge Functions | `insforge/functions/` |
| Pre-migration backup | `docs/local/backup-2026-02-12-105223/` |

---

_Last Updated: 2026-02-12_
