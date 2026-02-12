# Technical Context: Stack & Development

## Technology Stack

### Bot (Python 3.13)

| Package             | Version | Purpose             |
| ------------------- | ------- | ------------------- |
| python-telegram-bot | 22.6+   | Telegram Bot API    |
| SQLAlchemy          | 2.0+    | Async ORM           |
| Pydantic            | 2.12+   | Data validation     |
| AsyncPG             | 0.31+   | PostgreSQL driver   |
| Redis               | 7.1+    | Caching             |

> **Removed**: FastAPI, Uvicorn, Alembic, sse-starlette (all part of `apps/api/` which is being deleted)

### Frontend (TypeScript)

| Package        | Version | Purpose                  |
| -------------- | ------- | ------------------------ |
| Next.js        | 16.1+   | React framework          |
| React          | 19.2+   | UI library               |
| TypeScript     | 5.9+    | Type safety              |
| Tailwind CSS   | 4.1+    | Styling                  |
| TanStack Query | 5.90+   | Data fetching            |
| shadcn/ui      | Latest  | UI components            |
| Recharts       | 3.7+    | Charts                   |
| @insforge/sdk  | Latest  | InsForge BaaS client     |

### Infrastructure

| Tool             | Purpose                        |
| ---------------- | ------------------------------ |
| InsForge BaaS    | Managed PostgreSQL, Realtime, Storage, Edge Functions |
| Docker           | Bot containerization           |
| Turborepo        | Monorepo management            |
| Caddy            | Reverse proxy                  |
| Bun              | Package manager (web)          |

### InsForge BaaS Services

| Service        | Purpose                                    |
| -------------- | ------------------------------------------ |
| Database       | PostgREST API over managed PostgreSQL      |
| Realtime       | WebSocket pub/sub with DB triggers         |
| Storage        | File upload/download (2 buckets)           |
| Edge Functions | Serverless functions (bot mgmt, webhooks)  |
| Base URL       | `https://u4ckbciy.us-west.insforge.app`    |

---

## Development Setup

### Quick Start

```bash
# Install dependencies
pip install -r requirements/base.txt -r requirements/dev.txt
cd apps/web && bun install

# Start services (2-tier: Web + Bot)
python -m apps.bot.main          # Bot (from root)
cd apps/web && bun dev           # Web (port 3000)
```

> **No longer needed**: `cd apps/api && uvicorn src.main:app` — API layer removed

### Environment Files

| App | File                  | Template                |
| --- | --------------------- | ----------------------- |
| Bot | `apps/bot/.env`       | `apps/bot/.env.example` |
| Web | `apps/web/.env.local` | `apps/web/.env.example` |

> **Removed**: `apps/api/.env` — API layer removed

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

> **Removed**: `NEXT_PUBLIC_API_URL` — no longer points to FastAPI

---

## Code Quality Tools

### Tool Responsibility Matrix

Each tool has a specific role — **no overlap, no gaps**:

| Concern                | Primary Tool               | Notes                                    |
| ---------------------- | -------------------------- | ---------------------------------------- |
| Linting (style, logic) | **Ruff**                   | Covers F, E, W, I, UP, B, SIM, RUF rules |
| Formatting             | **Ruff**                   | Auto-format on save via VS Code          |
| Import checking        | **Ruff** (F) + **Pyrefly** | Pylint `import-error` disabled           |
| Type checking          | **Pyrefly**                | Runs from venv Python                    |
| Code quality scoring   | **Pylint**                 | Score target: 10.00/10                   |
| Design patterns        | **Pylint**                 | max-locals, max-statements, etc.         |

### Python CLI Commands

```bash
# All from project root (only apps/bot after API removal)
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

### Tool Configuration Files

| Tool        | Config File                        | Key Settings                                          |
| ----------- | ---------------------------------- | ----------------------------------------------------- |
| **Ruff**    | `pyproject.toml` `[tool.ruff]`     | target-version, line-length, rule selection           |
| **Pylint**  | `pyproject.toml` `[tool.pylint.*]` | disabled rules, max-locals=25, max-statements=60      |
| **Pyrefly** | `pyrefly.toml`                     | search-path, ignore-missing-imports, project-includes |
| **Knip**    | `apps/web/knip.json`               | Dead code detection (Web)                             |

### VS Code IDE Configuration

All 3 tools configured in `.vscode/settings.json`:

- **Ruff**: `ruff.interpreter` → venv, auto-format on save
- **Pylint**: `pylint.interpreter` → venv, `--rcfile=pyproject.toml`
- **Pyrefly**: `pyrefly.interpreterPath` → venv
- Required extensions: `charliermarsh.ruff`, `ms-python.pylint`, `meta.pyrefly`

---

## Database

### InsForge Managed PostgreSQL (Cloud)

- **Base URL**: `https://u4ckbciy.us-west.insforge.app`
- **Tables**: 13 (created via `insforge/migrations/001-005.sql`)
- **RPC Functions**: 15 (analytics + charts)
- **Realtime Triggers**: 4 (verification, bot_status, commands, logs)
- **Auto-update Triggers**: 8 (updated_at on all relevant tables)
- **Schema managed via**: Raw SQL migration files in `insforge/migrations/`

> **Removed**: Docker PostgreSQL, Alembic migrations — replaced by InsForge managed DB

### Storage Buckets

| Bucket        | Visibility | Purpose               |
| ------------- | ---------- | --------------------- |
| `bot-exports` | Private    | CSV exports, backups  |
| `bot-assets`  | Public     | Bot avatars, media    |

---

## File Locations

| Type           | Location                   |
| -------------- | -------------------------- |
| Tests          | `tests/bot/`               |
| Logs           | `storage/logs/`            |
| Python deps    | `requirements/*.txt`       |
| Docker         | `config/docker/`           |
| SQL Migrations | `insforge/migrations/`     |
| Edge Functions | `insforge/functions/`      |
| Pre-migration backup | `docs/local/backup-2026-02-12-105223/` |

---

_Last Updated: 2026-02-12_
