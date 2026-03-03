# Nezuko grammY Bot

A production-ready Telegram bot built with [grammY](https://grammy.dev) v1.41.1 (TypeScript), providing automated channel membership enforcement for Telegram groups. This is a ground-up TypeScript rebuild of the original Python bot (`apps/bot/`), maintaining full dashboard compatibility.

---

## Architecture

```
apps/grammy/src/
├── main.ts                    # Entry point — wires everything together
├── config.ts                  # Zod-validated environment config
├── types.ts                   # NezukoContext + shared types
├── core/
│   ├── bot-factory.ts         # Creates Bot<NezukoContext> with all plugins
│   ├── cache.ts               # Redis client (ioredis) with cache prefix
│   ├── constants.ts           # Shared constants (TTLs, namespaces, intervals)
│   ├── encryption.ts          # AES-256-GCM token decryption
│   ├── insforge-client.ts     # InsForge REST client (native fetch)
│   ├── realtime-client.ts     # InsForge Socket.IO realtime client
│   └── shutdown.ts            # 4-step graceful shutdown handler
├── middleware/
│   ├── sequentialize.ts       # [1st] Per-chat ordering (MUST be first)
│   ├── context-enricher.ts    # [6th] DI middleware — injects db/cache/log
│   ├── admin-guard.ts         # Filter: admin-only commands
│   ├── group-only.ts          # Filter: group/supergroup only
│   └── permission-check.ts   # Bot permission validation
├── composers/
│   ├── admin.ts               # /start, /help, /protect, /unprotect, /settings
│   ├── channels.ts            # /channels, /verify, /stats
│   ├── events.ts              # join, leave, message filter
│   ├── migration.ts           # Supergroup migration (migrate_to_chat_id)
│   ├── verify.ts              # callback_query verify:* handler
│   └── fallback.ts            # Catch-all callback answerer (always last)
├── services/
│   ├── verification.ts        # 3-layer membership check + cache
│   ├── protection.ts          # mute/unmute/kick via Telegram API
│   ├── channel-linker.ts      # Link/unlink channels + counter maintenance
│   ├── status-writer.ts       # 30s heartbeat (setInterval)
│   ├── member-sync.ts         # 15min member count sync (setInterval)
│   └── batch-verification.ts  # Batch verify pending users (scaffold)
├── database/
│   ├── types.ts               # DB entity types (ProtectedGroup, EnforcedChannel, etc.)
│   ├── group.repo.ts          # protected_groups CRUD
│   ├── channel.repo.ts        # enforced_channels CRUD
│   ├── link.repo.ts           # group_channel_links CRUD
│   ├── verification.repo.ts   # verification_log writes
│   └── bot-status.repo.ts     # bot_status UPSERT heartbeat
└── utils/
    ├── auto-delete.ts          # Timed message deletion (unref timer)
    ├── health.ts               # HTTP health endpoint (GET /health)
    ├── logger.ts               # pino structured JSON logger
    └── messages.ts             # All user-facing strings (HTML format)
```

### Middleware Pipeline (order is critical)

```
1. sequentialize    — per-chat queue (MUST be first — prevents race conditions)
2. ratelimiter      — drop spam before expensive processing
3. hydrateReply     — ctx.replyWithHTML, ctx.replyFmt
4. hydrate          — msg.editText(), msg.delete()
5. chatMembers      — auto-cache getChatMember results in Redis (L1)
6. contextEnricher  — inject db, cache, logger, botId into every ctx
   └── Composer tree (adminComposer, eventsComposer, verifyComposer, ...)
```

### Transformer Pipeline

```
1. autoRetry   — handles 429/500/network errors with Retry-After compliance
2. parseMode   — sets default parse_mode: "HTML" on all send methods
```

---

## Prerequisites

- **Node.js 22** or **Bun 1.2+**
- **Redis 7.4+** (local or remote)
- **InsForge** backend (PostgreSQL BaaS)
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable              | Required | Default               | Description                                                    |
| --------------------- | -------- | --------------------- | -------------------------------------------------------------- |
| `BOT_TOKEN`           | Yes      | —                     | Telegram bot token from BotFather (`123456:ABC-DEF...`)        |
| `INSFORGE_BASE_URL`   | Yes      | —                     | InsForge backend URL (`https://your-app.region.insforge.app`)  |
| `INSFORGE_ANON_KEY`   | Yes      | —                     | InsForge anonymous JWT key                                     |
| `REDIS_URL`           | No       | `redis://localhost:6379` | Redis connection URL                                         |
| `LOG_LEVEL`           | No       | `info`                | Logging level: `debug`, `info`, `warn`, `error`               |
| `HEALTH_PORT`         | No       | `8080`                | HTTP health check server port                                  |
| `DASHBOARD_MODE`      | No       | `false`               | `true` = multi-bot from DB; `false` = single bot from token   |
| `MASTER_KEY`          | No       | —                     | 32-byte hex AES-256 master key (required for dashboard mode)   |

---

## Development

### Install dependencies

```bash
bun install
```

### Start in development mode (hot reload)

```bash
bun run dev
```

### Start in production mode

```bash
bun run build && bun run start
```

### Type check

```bash
bun run type-check
```

### Lint

```bash
bun run lint
```

---

## Testing

Tests use [vitest](https://vitest.dev) with grammY transformer mocking — no real Telegram API calls are made.

### Run all tests

```bash
bun run test
```

### Watch mode

```bash
bun run test:watch
```

### Coverage report

```bash
bun run test:coverage
```

### Test structure

```
tests/grammy/
├── helpers/
│   ├── test-bot.ts      # createTestBot() — intercepts all API calls via transformer
│   ├── mock-update.ts   # Factory functions for Telegram Update objects
│   └── mock-deps.ts     # Mock InsForgeClient, CacheClient, Logger
├── unit/
│   ├── core/
│   │   ├── config.test.ts       # Zod config validation
│   │   └── encryption.test.ts   # AES-256-GCM decryption
│   ├── database/
│   │   ├── group-repo.test.ts        # group.repo CRUD + UPSERT
│   │   └── insforge-client.test.ts   # InsForgeClient HTTP methods
│   ├── services/
│   │   ├── verification.test.ts  # 3-layer membership check (9 cases)
│   │   └── protection.test.ts    # mute/unmute/kick (5 cases)
│   └── middleware/
│       ├── context-enricher.test.ts  # DI injection
│       ├── admin-guard.test.ts       # Admin filter
│       └── group-only.test.ts        # Group filter
└── integration/
    ├── bot-factory.test.ts   # Full bot pipeline
    └── composers/
        ├── admin.test.ts   # /start, /help, /protect (7 EC), /unprotect, /settings
        ├── events.test.ts  # join mute, bot skip, admin skip, leave, message filter
        └── verify.test.ts  # successful verify, missing channels, debounce, expired
```

---

## Docker

### Build image

```bash
docker build -t nezuko-grammy apps/grammy/
```

### Run container

```bash
docker run -d \
  --name nezuko-grammy \
  -e BOT_TOKEN=your_token \
  -e INSFORGE_BASE_URL=https://your-app.region.insforge.app \
  -e INSFORGE_ANON_KEY=your_anon_key \
  -e REDIS_URL=redis://your-redis:6379 \
  -p 8080:8080 \
  nezuko-grammy
```

### Health check

```bash
curl http://localhost:8080/health
# {"status":"ok","uptime":42}
```

### 3-Stage build overview

| Stage     | Base image     | Purpose                          |
| --------- | -------------- | -------------------------------- |
| `deps`    | `oven/bun:1.2` | `bun install --frozen-lockfile`  |
| `builder` | `node:22-slim` | `tsc` compile to `dist/`         |
| `runner`  | `node:22-slim` | Production runtime (~120 MB)     |

---

## Graceful Shutdown

The bot performs a 4-step shutdown on `SIGTERM` / `SIGINT` (Docker sends SIGTERM 10s before SIGKILL):

1. `handle.stop()` — stop accepting new updates
2. `await Promise.race([handle.task(), timeout(8000)])` — wait for in-flight updates (max 8s)
3. `await Promise.allSettled([db.upsertBotStatus(botId, "offline"), cache.quit()])` — cleanup
4. `process.exit(0)` — clean exit

---

## Plugin List

| Plugin                    | Version  | Purpose                                              |
| ------------------------- | -------- | ---------------------------------------------------- |
| `grammy`                  | 1.41.1   | Core framework                                       |
| `@grammyjs/runner`        | 2.0.3    | Concurrent update processing (`run()`)               |
| `@grammyjs/auto-retry`    | 2.0.2    | Transformer: 429/500 retry with Retry-After          |
| `@grammyjs/parse-mode`    | 2.2.1    | Transformer: default `parse_mode: "HTML"`            |
| `@grammyjs/hydrate`       | 1.6.0    | `msg.editText()`, `msg.delete()` sugar               |
| `@grammyjs/ratelimiter`   | 1.2.1    | Flood protection per user (Redis-backed)             |
| `@grammyjs/commands`      | 1.3.2    | Typed command routing                                |
| `@grammyjs/chat-members`  | 1.2.0    | L1 cache: event-driven `getChatMember` cache (Redis) |
| `ioredis`                 | 5.10.0   | Redis client (L2 verification cache)                 |
| `pino`                    | 10.3.1   | Structured JSON logging                              |
| `zod`                     | 4.3.6    | Config schema validation                             |
| `socket.io-client`        | 4.8.3    | InsForge realtime WebSocket (dashboard mode)         |

---

## Key Design Decisions

1. **No ORM** — Uses native `fetch()` against InsForge REST API (PostgREST). Same pattern as Python bot.
2. **PATCH-then-POST UPSERT** — For tables with multiple UNIQUE columns (PostgREST 409 workaround).
3. **Redis key prefix** — All keys use `nezuko:v2:` prefix to avoid conflicts with Python bot during parallel run.
4. **Bun dev + Node.js prod** — Bun's `--watch` for fast dev; Node.js 22 LTS for proven ioredis stability in Docker.
5. **`emit()` not `call()`** — InsForge Realtime doesn't ACK `REALTIME_SUBSCRIBE`. Using `call()` causes 10s timeout.
6. **`sequentialize` MUST be first** — grammY deployment checklist requirement; prevents race conditions per chat.
7. **`fallbackComposer` MUST be last** — answers all unclaimed callback queries to remove Telegram's loading spinner.

---

## CI/CD

GitHub Actions workflow at `.github/workflows/grammy-ci.yml` runs on every push/PR that touches `apps/grammy/**`:

| Job            | Command              | Gate               |
| -------------- | -------------------- | ------------------ |
| `lint`         | `npm run lint`       | 0 ESLint warnings  |
| `type-check`   | `npm run type-check` | 0 TypeScript errors|
| `test`         | `npm run test`       | All tests pass     |
| `docker-build` | `docker build`       | Build succeeds     |
