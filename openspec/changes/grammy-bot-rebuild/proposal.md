## Why

The existing Nezuko Telegram bot (`apps/bot/`) is built with Python 3.13 and `python-telegram-bot` v22.6. While production-ready (Phase 95, 101 tests, 10.00/10 Pylint), it has accumulated structural limitations that a ground-up rebuild with **grammY** (TypeScript) addresses:

1. **Language Fragmentation** — The bot (Python) and web dashboard (Next.js 16 / TypeScript) are in different languages, preventing code sharing (types, utilities, validation schemas, constants). A TypeScript bot eliminates this gap entirely.
2. **Framework Architecture** — PTB uses handler groups (flat, implicit ordering) while grammY uses a **middleware tree** with `Composer` branching, `errorBoundary` isolation, and type-safe filter queries — a fundamentally superior composition model.
3. **Plugin Ecosystem** — PTB requires hand-rolled solutions for rate limiting (600+ line `rate_limiter.py`), retry logic, and member caching. grammY provides official plugins (`auto-retry`, `ratelimiter`, `chat-members`, `parse-mode`, `hydrate`, `runner`, `commands`) that replace hundreds of lines of custom code with battle-tested, maintained implementations.
4. **Type Safety** — Python requires triple-checking (Ruff + Pylint + Pyrefly) to achieve what TypeScript strict mode + grammY's type narrowing via filter queries delivers natively at compile time.
5. **Concurrency Model** — PTB's `JobQueue` and asyncio task management require careful `RUF006` patterns and `fire_and_forget` wrappers. grammY's `@grammyjs/runner` with `sequentialize` provides concurrent update processing with per-chat ordering out of the box.

**Why now?** The Python bot is stable (Phase 95), the PRD v3.3 is complete (3,308 lines, 37 decisions, 70 edge cases cataloged), and the dashboard compatibility requirements are fully documented (§17 of PRD). This is the optimal time to rebuild before adding new features.

## What Changes

### New Application (`apps/grammy/`)
- **New TypeScript bot application** at `apps/grammy/` — ~30 source files built from scratch using grammY v1.41.1, Bot API 9.4
- **grammY middleware tree architecture** — `Composer`-based handler isolation with `errorBoundary` per feature domain
- **7 official grammY plugins** — `auto-retry`, `parse-mode`, `hydrate`, `runner`, `ratelimiter`, `commands`, `chat-members`
- **Custom NezukoContext type** — Composed from `ParseModeFlavor<HydrateFlavor<Context & NezukoContextFlavor & CommandsFlavor & ChatMembersFlavor>>`
- **InsForge REST client (TypeScript port)** — Native `fetch()` based, mirroring `apps/bot/core/insforge_client.py` patterns. No `@insforge/sdk` for bot (server-side control needed)
- **InsForge Realtime client** — `socket.io-client` v4.8.3 for WebSocket event-driven command dispatch and bot instance lifecycle
- **3-layer hybrid cache** — L1: `chat-members` plugin (event-driven), L2: Redis 6h TTL (derived verification), L3: 15min sync job
- **Repository pattern** — 5 flat repo files (`group.repo.ts`, `channel.repo.ts`, `link.repo.ts`, `verification.repo.ts`, `bot-status.repo.ts`)
- **6 Composers** — `admin`, `channels`, `events`, `migration`, `verify`, `fallback` (each with `errorBoundary`)
- **6 Services** — `verification`, `protection`, `channel-linker`, `status-writer`, `member-sync`, `batch-verification`
- **4 Custom middleware** — `sequentialize`, `context-enricher`, `admin-guard`, `group-only`, `permission-check`
- **Structured logging** — `pino` v10.3.1 with JSON output
- **Config validation** — `zod` v4.3.6 for environment variable validation
- **Docker deployment** — 3-stage build (Bun install → Node tsc build → Node 22-slim runtime)
- **CI/CD** — GitHub Actions workflow for lint + type-check + test + Docker build
- **8 bot commands** — `/start`, `/help`, `/protect`, `/unprotect`, `/channels`, `/settings`, `/verify`, `/stats`

### Multi-Bot Mode (Phase 5)
- **Bot registry** — `Map<botId, BotInstance>` for concurrent multi-bot management
- **Bot lifecycle manager** — Start/stop/restart individual bot instances
- **AES-256-GCM token decryption** — Port of `core/encryption.py`
- **Realtime-driven sync** — `bot_instance_changed` and `command_updated` events via InsForge Socket.IO

### Testing Infrastructure
- **Vitest v4.0.18** — ESM-native test framework
- **Test helpers** — Mock update factory, test bot with transformer-mocked API calls
- **Unit + integration tests** — Services, middleware, composers, bot factory
- **Target: 80%+ coverage** with 30-40 focused tests

### Dashboard Compatibility (Zero Changes to `apps/web/`)
- **Identical DB writes** — Same tables, same field names, same UPSERT patterns as Python bot
- **Same realtime triggers** — All 5 existing DB triggers continue to fire correctly
- **Same InsForge REST API** — PostgREST endpoints unchanged

### What Does NOT Change
- `apps/web/` — **No modifications** to the Next.js dashboard
- `apps/bot/` — **No modifications** to the Python bot (runs in parallel during switchover)
- `insforge/migrations/` — **No new migrations** needed (schema is compatible)
- `insforge/functions/` — **No edge function changes** (manage-bot works with both bots)

## Capabilities

### New Capabilities
- `grammy-foundation`: Project scaffolding — `package.json`, `tsconfig.json`, Zod config, `NezukoContext` type system, pino logger, shared constants, `.env.example`
- `grammy-core-infra`: Core infrastructure — Bot factory with plugin stack, InsForge REST client (TypeScript), Redis cache client, context enricher middleware, admin guard, group-only filter, permission checker
- `grammy-bot-logic`: Core bot handlers — Admin composer (`/start`, `/help`, `/protect`, `/unprotect`, `/settings`), channels composer (`/channels`, `/verify`, `/stats`), events composer (join/leave/message filter), verify composer (callback query verification), migration composer (supergroup migration), fallback composer (catch-all callback answerer)
- `grammy-services`: Business logic services — Verification service (3-layer cache, membership check), protection service (mute/unmute/kick), channel linker service (link/unlink + counter maintenance), status writer (30s heartbeat), member sync (15min bulk re-check), batch verification
- `grammy-database`: Data access layer — InsForge REST repository pattern (5 repos), database types, UPSERT patterns matching Python bot for dashboard compatibility
- `grammy-multibot`: Multi-bot mode — Bot registry, bot lifecycle manager, AES-256-GCM encryption, InsForge Realtime client (`socket.io-client`), dashboard command processing
- `grammy-testing`: Test infrastructure — Vitest config, mock update factory, test bot helper, unit tests (services, middleware), integration tests (composers, bot factory), coverage target 80%+
- `grammy-deployment`: Docker + CI/CD — 3-stage Dockerfile (Bun/Node), `.dockerignore`, GitHub Actions workflow, graceful shutdown (4-step), health endpoint

### Modified Capabilities
_(None — this is a net-new `apps/grammy/` directory. No existing specs are modified.)_

## Impact

### Code
- **New directory**: `apps/grammy/` (~30 TypeScript source files, ~4,000 lines estimated)
- **New test directory**: `tests/grammy/` (~15 test files, ~1,500 lines estimated)
- **New CI workflow**: `.github/workflows/grammy-ci.yml`
- **Root config updates**: Minor — may need workspace config awareness in `pyproject.toml` or root scripts

### Dependencies (New)
| Package | Version | Purpose |
|---|---|---|
| `grammy` | 1.41.1 | Telegram Bot framework (Bot API 9.4) |
| `@grammyjs/auto-retry` | 2.0.2 | Retry 429/500/network errors |
| `@grammyjs/hydrate` | 1.6.0 | Enriched API responses |
| `@grammyjs/parse-mode` | 2.2.1 | Default HTML formatting |
| `@grammyjs/runner` | 2.0.3 | Concurrent update processing |
| `@grammyjs/ratelimiter` | 1.2.1 | User-level flood protection |
| `@grammyjs/commands` | 1.3.2 | Command groups and scoping |
| `@grammyjs/chat-members` | 1.2.0 | Automatic getChatMember cache |
| `ioredis` | 5.10.0 | Redis client |
| `pino` | 10.3.1 | Structured JSON logging |
| `zod` | 4.3.6 | Runtime config validation |
| `@sentry/node` | 10.41.0 | Error reporting |
| `socket.io-client` | 4.8.3 | InsForge Realtime WebSocket |
| `typescript` | 5.9.3 | TypeScript compiler (dev) |
| `vitest` | 4.0.18 | Test framework (dev) |

### Systems Affected
- **Telegram API** — New bot token (separate from Python bot during parallel run)
- **InsForge PostgreSQL** — Same tables, same writes (dashboard-compatible)
- **InsForge Realtime** — Same Socket.IO protocol, same channel subscriptions
- **Redis** — Namespaced keys `nezuko:v2:` to avoid conflicts with Python bot
- **Docker** — New `apps/grammy/Dockerfile`
- **GitHub Actions** — New CI workflow scoped to `apps/grammy/**`

### Switchover Plan (from PRD §17.11)
1. Parallel running (both bots, different tokens)
2. Database verification (compare writes, heartbeat cadence)
3. Gate check (24h error rate ≤ 1%, p99 latency ≤ 200ms)
4. Token swap to grammY bot
5. Monitor 48 hours
6. Rollback rule: revert if error rate > 2% for 10min or heartbeat gap > 120s
7. Cleanup: deprecate Python bot after stable window
