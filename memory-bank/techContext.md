# Technical Context: Stack & Development

## Technology Stack

### Bot (Python 3.13)

| Package | Version | Purpose |
| --- | --- | --- |
| python-telegram-bot | 22.6+ [webhooks,callback-data,http2] | Telegram Bot API (includes JobQueue for scheduled jobs) |
| httpx | <0.29 (pinned) | InsForge REST API client (`insforge_client.py`) |
| aiohttp | 3.13+ | Health check HTTP server (`/health`, `/metrics`, `/ready`) |
| SQLAlchemy | 2.0+ | **Tests only** — SQLite in-memory (never in production code) |
| aiosqlite | 0.21+ | **Tests only** — SQLite async driver for pytest |
| Pydantic | 2.12+ | Data validation / config |
| Redis (aioredis) | 7.1+ | Caching layer (membership + admin status; graceful degradation) |
| **uv** | Latest | Dependency management & environment virtualization |
| cryptography | 45+ | AES-256-GCM encryption (`core/encryption.py`) |
| python-socketio | 5.16+ [asyncio_client] | InsForge Realtime Socket.IO client (`core/realtime_client.py`) — event-driven bot sync |
| orjson | Latest | Fast JSON serialization |
| tenacity | Latest | Retry logic for transient failures |

> **⚠️ asyncpg**: Completely removed from production. No direct PG connection.
> **⚠️ SQLAlchemy**: Only present for offline test speed (SQLite). Never imported
> in handlers, services, or any production bot code.
> **⚠️ Member sync**: Uses PTB's built-in `JobQueue.run_repeating()` — no APScheduler needed.

### Bot (grammY — TypeScript, Phase 96)

| Package | Version | Purpose |
| --- | --- | --- |
| grammy | 1.41.1 | Telegram Bot API framework (TypeScript) |
| @grammyjs/auto-retry | 2.0.2 | Automatic retry on 429/500 errors |
| @grammyjs/hydrate | 1.6.0 | Hydrate API call results (no `hydrateReply` export) |
| @grammyjs/parse-mode | 2.2.1 | HTML parse mode transformer (no `ParseModeFlavor` export) |
| @grammyjs/runner | 2.0.3 | Long polling runner + sequentialize middleware |
| @grammyjs/ratelimiter | 1.2.1 | Per-user rate limiting |
| @grammyjs/commands | 1.3.2 | Command registration |
| @grammyjs/chat-members | 1.2.0 | Chat member caching (L1 cache) |
| ioredis | 5.10.0 | Redis client for caching |
| pino | 10.3.1 | Structured JSON logging |
| zod | 4.3.6 | Config validation (`.default()` before `.transform()`) |
| @sentry/node | 10.41.0 | Error monitoring |
| socket.io-client | 4.8.3 | InsForge Realtime WebSocket client |
| **typescript** | 5.9.3 | Type checking (strict mode, NodeNext resolution) |
| **vitest** | 4.0.18 | Test runner with v8 coverage |
| **eslint** | 9.28.0 | Linting (flat config with TypeScript ESLint) |
| **bun** | Latest | Package manager + dev server |

> **⚠️ Runtime**: Bun for development, Node.js 22 for production (Dockerfile).
> **⚠️ ESM only**: `"type": "module"` in package.json, `NodeNext` module resolution.

### Frontend (TypeScript)

| Package | Version | Purpose |
| --- | --- | --- |
| Next.js | 16.1+ | React framework (App Router) |
| React | 19.2+ | UI library |
| TypeScript | 5.9+ | Type safety |
| Tailwind CSS | 4.1+ | Styling |
| TanStack Query | 5.90+ | Server state / data fetching |
| shadcn/ui | Latest | Accessible UI components |
| Recharts | 2.15+ | Dashboard charts (via shadcn/ui ChartContainer) |
| @insforge/sdk | Latest | InsForge BaaS client (DB, Realtime, Storage, Functions) |
| @insforge/nextjs | 1.1.7+ | InsForge auth for Next.js: `InsforgeMiddleware` (proxy.ts), `InsforgeBrowserProvider`, `SignInButton`, `useAuth`, `useUser` |
| motion | 12.27+ | React micro-animations (LazyMotion optimized) |
| zod | 3.24+ | Schema validation |
| react-hook-form | 7.54+ | Form management |

### Infrastructure

| Tool | Purpose |
| --- | --- |
| **InsForge BaaS** | Managed PostgreSQL, Realtime WebSocket, Storage, Edge Functions |
| **Vercel** | Web hosting (Next.js) — Free Tier |
| **Docker** | Bot containerisation |
| **Caddy** | Reverse proxy |
| **Bun** | Package manager (web) |

---

## Development Setup

### Quick Start

```bash
# Install dependencies and sync environment
uv sync

# Start services (parallel)
uv run python -m apps.bot.main   # Bot (from project root)
cd apps/web && bun dev           # Web (port 3000)
```

### Environment Files

| App | File | Template |
| --- | --- | --- |
| Bot (Python) | `apps/bot/.env` | `apps/bot/.env.example` |
| Bot (grammY) | `apps/grammy/.env` | `apps/grammy/.env.example` |
| Web | `apps/web/.env.local` | `apps/web/.env.example` |

### Required Environment Variables

```bash
# Bot (apps/bot/.env)
DASHBOARD_MODE=true              # true = multi-bot from DB, false = use BOT_TOKEN
BOT_TOKEN=<telegram-bot-token>   # Only used when DASHBOARD_MODE=false
INSFORGE_BASE_URL=https://u4ckbciy.us-west.insforge.app
INSFORGE_ANON_KEY=<insforge-anon-key>
# No manual ENCRYPTION_KEY required! Syncs from Security Vault.
LOG_LEVEL=DEBUG
# DATABASE_URL is only used in tests (auto-set to SQLite in conftest/test files)

# Web (apps/web/.env.local)
NEXT_PUBLIC_INSFORGE_BASE_URL=https://u4ckbciy.us-west.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=<insforge-anon-key>   # Must match bot key
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_DEV_LOGIN=false       # Set true for local dev bypass (skip InsForge auth)
# NEXT_PUBLIC_LOGIN_BOT_USERNAME removed — Telegram widget fully removed (Phase 75)
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

# All from project root using uv
uv run ruff check apps/bot --fix      # Auto-fix lint (0 errors target)
uv run ruff check apps/bot            # Verify (0 errors)
uv run ruff format apps/bot           # Format code
uv run pylint apps/bot --rcfile=pyproject.toml  # Score (10.00/10)
.venv/Scripts/python.exe -m pyrefly check  # Types (0 errors)
uv run pytest tests/bot/ -v           # All 58 tests pass
```

### TypeScript CLI Commands

```bash
# ── Web (Next.js) ──
cd apps/web
bun run type-check    # TypeScript (0 errors) — tsc --noEmit
bun run lint          # ESLint — ⚠️ eslint-plugin-react v10 incompatible with ESLint 10.0.0 (known issue)
bun run build         # TypeScript (0 errors) — exit code 0
bun run format        # Prettier + Tailwind Sort

# ── grammY Bot (TypeScript) ──
cd apps/grammy
bun run type-check    # tsc --noEmit → 0 errors
bun run lint          # eslint src/ --max-warnings 0 → 0 warnings
bun run test          # vitest run → **111 tests passed** (Phase 97)
bun run test:coverage # vitest run --coverage (80% thresholds)
bun run dev           # bun run --watch src/main.ts
bun run build         # tsc -p tsconfig.build.json → dist/
```

> **⚠️ ESLint Known Issue**: `eslint-plugin-react` is incompatible with ESLint 10.0.0
> (`contextOrFilename.getFilename is not a function`). Use `bun run type-check` (tsc) as
> the primary TypeScript validation gate. This predates Phase 77.

---

## Database (InsForge Managed PostgreSQL)

- **Base URL**: `https://u4ckbciy.us-west.insforge.app`
- **Access (Bot)**: REST API via `httpx` — `GET/POST/PATCH/DELETE /api/database/records/{table}`
- **Access (Web)**: InsForge SDK (TypeScript) — `@insforge/sdk`
- **Auth header**: `Authorization: Bearer <INSFORGE_ANON_KEY>`
- **Tables**: 11 (created via `insforge/migrations/009_clean_schema.sql` + `010_add_linked_channels_count.sql`)
- **RPC Functions**: 14 (analytics + charts — see systemPatterns.md for full list)
- **Realtime Channels**: 5 (`dashboard`, `bot_status`, `logs`, `commands`, `bot_instances`)
- **Realtime Triggers**: 5 (fire on INSERT/UPDATE — push to channels via `realtime.publish()`)
- **Edge Functions**: 2 (`manage-bot`, `test-webhook/index.js`) — legacy `test-webhook.js` deleted in Phase 77 (SSRF-vulnerable)
- **Storage Buckets**: 2 (`bot-assets` public, `bot-exports` private)
- **SQL Migrations**: 20 files (`001` through `020`)
- **⚠️ No direct PG connection**: InsForge does not expose raw PostgreSQL passwords

### InsForge Tables Written by Bot (all via REST)

| Table | Written By | Method | Notes |
|---|---|---|---|
| `verification_log` | `verification_logger.py` | `post_records()` fire-and-forget | `latency_ms`, `cached`, `status` |
| `api_call_log` | `api_call_logger.py` | `post_records()` fire-and-forget | `method`, `success`, `latency_ms` |
| `protected_groups` | `member_sync.py` | `patch_records()` count update | `member_count`, `last_sync_at` |
| `protected_groups` | `insforge_client.py` | `patch_records()` link counter | `linked_channels_count` (on link/unlink) |
| `enforced_channels` | `member_sync.py` | `patch_records()` count update | `subscriber_count`, `last_sync_at` |
| `enforced_channels` | `insforge_client.py` | `patch_records()` link counter | `linked_groups_count` (on link/unlink) |
| `bot_status` | `status_writer.py` | **PATCH-then-POST** (via httpx client) | `status='online'` (not `'running'`) |
| `admin_logs` | `insforge_log_handler.py` | `post_records()` fire-and-forget | WARNING+ level only |
| `admin_commands` | `command_worker.py` | `get_records()` + `patch_records()` | polls every 10s |
| `bot_instances` | `bot_manager.py` | `get_records()` load active bots | reads `is_active=true, is_deleted=false` |

> **⚠️ Phase 66 lesson**: All INSERT operations require `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon`.
> Without this, every INSERT returns **401 Unauthorized** from PostgREST.
> This is separate from and in addition to table-level `GRANT INSERT`.

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
| Tests (Python bot) | `tests/bot/` |
| Tests (grammY bot) | `tests/grammy/` |
| Logs | `apps/bot/logs/` |
| Python deps | `pyproject.toml` (managed via `uv`) |
| grammY deps | `apps/grammy/package.json` (managed via `bun`) |
| SQL Migrations | `insforge/migrations/` (001-020) |
| Canonical Schema | `insforge/migrations/009_clean_schema.sql` + `011_add_nezuko_secrets_table.sql` |
| Edge Functions | `insforge/functions/` |

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

## grammY Bot Startup Patterns (Phase 97)

### Mode Detection Flow

```
loadConfig()        → Zod schema (soft — no required fields)
  ↓
main()
  ├─ dashboardMode=true  → validate INSFORGE_* + MASTER_KEY → runDashboardMode()
  └─ dashboardMode=false → validate BOT_TOKEN → runStandaloneMode()
```

### Graceful Degradation (standalone mode)

| Config State | Behaviour |
|---|---|
| `BOT_TOKEN` + `INSFORGE_*` set | Full mode: bot + DB + Redis |
| `BOT_TOKEN` only (no INSFORGE) | Degraded: bot works, no status writer / member sync / command worker |
| `BOT_TOKEN` missing | Fatal error with clear message, `process.exit(1)` |
| `INSFORGE_BASE_URL=""` (blank) | Treated as not set (Zod coerces to `undefined`) |

### `botInstanceId` Sentinel Values
| Value | Meaning |
|---|---|
| `N` (positive int) | Real `bot_instances.id` row (dashboard mode per-bot) |
| `0` | Standalone mode sentinel — no DB row exists; shutdown handler skips upsert |

---

## InsForge Database (Phase 98 — Clean Baseline)

| Metric | Value |
|---|---|
| **Canonical migration** | `insforge/migrations/023_fresh_grammy_schema.sql` |
| **Tables** | 12 (all empty after Phase 98 fresh clear) |
| **RPC functions** | 15 analytics functions |
| **Realtime channels** | 5 (`dashboard`, `bot_status`, `logs`, `commands`, `bot_instances`) |
| **`realtime.publish` signature** | `(text, text, jsonb)` — payload must be cast `::JSONB` |
| **All Telegram IDs** | `BIGINT` (prevents INT4 overflow) |
| **UPSERT pattern** | PATCH-then-POST (PostgREST does not support native upsert on multi-UNIQUE tables) |
| **Sequences** | Reset to 1 after fresh clear |

---

_Last Updated: 2026-03-06 (Phase 98 — InsForge Fresh DB Setup — COMPLETE)_
