# Technical Context: Stack & Development

## Technology Stack

### Bot (Python 3.13)

| Package | Version | Purpose |
| --- | --- | --- |
| python-telegram-bot | 22.6+ | Telegram Bot API |
| httpx | 0.27+ | InsForge REST API client (`insforge_client.py`) |
| SQLAlchemy | 2.0+ | **Tests only** — SQLite in-memory (never in production code) |
| aiosqlite | 0.21+ | **Tests only** — SQLite async driver for pytest |
| Pydantic | 2.12+ | Data validation / config |
| Redis (aioredis) | 7.1+ | Caching layer |
| cryptography | 43+ | Fernet token encryption (`core/encryption.py`) |
| APScheduler | — | Required for `member_sync` job queue (pending config) |

> **⚠️ asyncpg**: Completely removed from production. No direct PG connection.
> **⚠️ SQLAlchemy**: Only present for offline test speed (SQLite). Never imported
> in handlers, services, or any production bot code.

### Frontend (TypeScript)

| Package | Version | Purpose |
| --- | --- | --- |
| Next.js | 16.1+ | React framework (App Router) |
| React | 19.2+ | UI library |
| TypeScript | 5.9+ | Type safety |
| Tailwind CSS | 4.1+ | Styling |
| TanStack Query | 5.90+ | Server state / data fetching |
| shadcn/ui | Latest | Accessible UI components |
| Recharts | 3.7+ | Dashboard charts |
| @insforge/sdk | Latest | InsForge BaaS client (DB, Realtime, Storage, Functions) |
| motion | 12.27+ | React micro-animations |

### Infrastructure

| Tool | Purpose |
| --- | --- |
| **InsForge BaaS** | Managed PostgreSQL, Realtime WebSocket, Storage, Edge Functions |
| **Koyeb** | Bot hosting (Docker/Python) — Free Tier |
| **Vercel** | Web hosting (Next.js) — Free Tier |
| **Docker** | Bot containerisation |
| **Caddy** | Reverse proxy |
| **Bun** | Package manager (web) |

---

## Development Setup

### Quick Start

```bash
# Install Python deps
pip install -r requirements.txt -r requirements-dev.txt

# Install web deps
cd apps/web && bun install

# Start services (parallel)
python -m apps.bot.main          # Bot (from project root)
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
DASHBOARD_MODE=true              # true = multi-bot from DB, false = use BOT_TOKEN
BOT_TOKEN=<telegram-bot-token>   # Only used when DASHBOARD_MODE=false
INSFORGE_BASE_URL=https://u4ckbciy.us-west.insforge.app
INSFORGE_ANON_KEY=<insforge-anon-key>   # Refreshed Phase 65
ENCRYPTION_KEY=<fernet-key>      # Required for dashboard mode (decrypt bot tokens)
REDIS_URL=redis://127.0.0.1:6379/0
LOG_LEVEL=DEBUG
# DATABASE_URL is only used in tests (auto-set to SQLite in conftest/test files)

# Web (apps/web/.env.local)
NEXT_PUBLIC_INSFORGE_BASE_URL=https://u4ckbciy.us-west.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=<insforge-anon-key>   # Must match bot key
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_DEV_LOGIN=true
NEXT_PUBLIC_LOGIN_BOT_USERNAME=gmakilbot
```

> ⚠️ **Both `INSFORGE_ANON_KEY` values must be identical** — use `get-anon-key` MCP to
> refresh both at the same time if either expires or behaves unexpectedly.

---

## Code Quality Tools

### Tool Responsibility Matrix

| Concern | Primary Tool | Notes |
| --- | --- | --- |
| Linting (style, logic) | **Ruff** | F, E, W, I, UP, B, SIM, RUF rules |
| Formatting | **Ruff** | Auto-format on save |
| Import checking | **Ruff** (F) + **Pyrefly** | Pylint `import-error` disabled |
| Type checking | **Pyrefly** | Runs from venv Python |
| Code quality scoring | **Pylint** | Score target: **10.00/10** |

### Python CLI Commands

```bash
# All from project root
ruff check apps/bot --fix             # Auto-fix lint (0 errors target)
ruff check apps/bot                   # Verify (0 errors)
ruff format apps/bot --check          # Verify formatting
pylint apps/bot --rcfile=pyproject.toml  # Score (10.00/10)
.venv/Scripts/python.exe -m pyrefly check  # Types (0 errors)
pytest tests/bot/ -v                  # All 55 tests pass
```

### TypeScript CLI Commands

```bash
cd apps/web
bun run lint          # ESLint (0 warnings)
bun run build         # TypeScript (0 errors) — exit code 0
bun run format        # Prettier + Tailwind Sort
```

---

## Database (InsForge Managed PostgreSQL)

- **Base URL**: `https://u4ckbciy.us-west.insforge.app`
- **Access (Bot)**: REST API via `httpx` — `GET/POST/PATCH/DELETE /api/database/records/{table}`
- **Access (Web)**: InsForge SDK (TypeScript) — `@insforge/sdk`
- **Auth header**: `Authorization: Bearer <INSFORGE_ANON_KEY>`
- **Tables**: 10 (created via `insforge/migrations/009_clean_schema.sql`)
- **RPC Functions**: 14 (analytics + charts — see systemPatterns.md for full list)
- **Realtime Channels**: 4 (`dashboard`, `bot_status`, `logs`, `commands`)
- **Realtime Triggers**: 4 (fire on INSERT/UPDATE — push to channels via `realtime.publish()`)
- **Edge Functions**: 2 (`manage-bot`, `test-webhook`)
- **Storage Buckets**: 2 (`bot-assets` public, `bot-exports` private)
- **Schema managed via**: `insforge/migrations/009_clean_schema.sql` (canonical)
- **⚠️ No direct PG connection**: InsForge does not expose raw PostgreSQL passwords

### InsForge Tables Written by Bot (all via REST)

| Table | Written By | Method | Notes |
|---|---|---|---|
| `verification_log` | `verification_logger.py` | `_post()` fire-and-forget | `latency_ms`, `cached`, `status` |
| `api_call_log` | `api_call_logger.py` | `_post()` fire-and-forget | `method`, `success`, `latency_ms` |
| `protected_groups` | `member_sync.py` | `_patch()` count update | `member_count` |
| `enforced_channels` | `member_sync.py` | `_patch()` count update | `subscriber_count` |
| `bot_status` | `status_writer.py` | POST UPSERT every 30s | `status='online'` (not `'running'`) |
| `admin_logs` | `insforge_log_handler.py` | `_post()` fire-and-forget | WARNING+ level only |
| `admin_commands` | `command_worker.py` | `_get()` + `_patch()` status update | polls every 10s |
| `bot_instances` | `bot_manager.py` | `_get()` load active bots | reads `is_active=true, is_deleted=false` |

### InsForge RPC Functions Called by Web (all via SDK)

| Service File | RPCs Called | Return Shape |
|---|---|---|
| `dashboard.service.ts` | `get_dashboard_stats`, `get_verification_trends` | Object, Envelope |
| `analytics.service.ts` | `get_verification_trends`, `get_user_growth`, `get_analytics_overview` | Envelope, Object |
| `charts.service.ts` | `get_verification_distribution`, `get_cache_breakdown`, `get_groups_status`, `get_api_calls_distribution`, `get_hourly_activity`, `get_latency_distribution`, `get_top_groups`, `get_cache_hit_rate_trend`, `get_latency_trend`, `get_bot_health` | Mix: Objects + Flat Arrays |

---

## File Locations

| Type | Location |
| --- | --- |
| Tests | `tests/bot/` |
| Logs | `apps/bot/logs/` |
| Python deps | `requirements.txt` + `requirements-dev.txt` |
| SQL Migrations | `insforge/migrations/` |
| Canonical Schema | `insforge/migrations/009_clean_schema.sql` |
| Edge Functions | `insforge/functions/` |
| Pre-migration backup | `docs/local/backup-2026-02-12-105223/` |

---

## InsForge MCP Tools Reference

| MCP Tool | When to Use |
|---|---|
| `get-backend-metadata` | Check table record counts, functions, storage, edge functions |
| `get-anon-key` | Refresh anon key — apply to BOTH `apps/bot/.env` AND `apps/web/.env.local` |
| `run-raw-sql` | Execute schema changes, seed data, run diagnostics |
| `get-table-schema` | Inspect column types, constraints, indexes for a specific table |
| `fetch-docs` instructions | Read setup basics before writing any InsForge SDK code |
| `fetch-docs` db-sdk | DB operations (select, insert, update, delete, rpc, filters, modifiers) |
| `fetch-docs` real-time | Realtime channels, triggers, `realtime.publish()`, SDK subscription API |
| `fetch-docs` functions-sdk | Edge Function invocation from TypeScript |

---

_Last Updated: 2026-02-23 (Phase 65)_
