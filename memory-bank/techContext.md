# Technical Context: Stack & Development

## Active Technology Stack

### Bot (grammY — TypeScript, ACTIVE ✅)

| Package                | Version | Purpose                                                   |
| ---------------------- | ------- | --------------------------------------------------------- |
| grammy                 | 1.41.1  | Telegram Bot API framework (TypeScript)                   |
| @grammyjs/auto-retry   | 2.0.2   | Automatic retry on 429/500 errors                         |
| @grammyjs/hydrate      | 1.6.0   | Hydrate API call results (no `hydrateReply` export)       |
| @grammyjs/parse-mode   | 2.2.1   | HTML parse mode transformer (no `ParseModeFlavor` export) |
| @grammyjs/runner       | 2.0.3   | Long polling runner + sequentialize middleware            |
| @grammyjs/ratelimiter  | 1.2.1   | Per-user rate limiting                                    |
| @grammyjs/commands     | 1.3.2   | Command registration (`setMyCommands` scopes)             |
| @grammyjs/chat-members | 1.2.0   | Chat member caching (L1 cache)                            |
| ioredis                | 5.10.0  | Redis client for caching                                  |
| pino                   | 10.3.1  | Structured JSON logging                                   |
| zod                    | 4.3.6   | Config validation (`.default()` before `.transform()`)    |
| @sentry/node           | 10.41.0 | Error monitoring                                          |
| socket.io-client       | 4.8.3   | InsForge Realtime WebSocket client                        |
| **typescript**         | 5.9.3   | Type checking (strict mode, NodeNext resolution)          |
| **vitest**             | 4.0.18  | Test runner with v8 coverage                              |
| **prettier**           | 3.8.1   | Code formatting (root `.prettierrc`, no tailwind plugin)  |
| **eslint**             | 9.28.0  | Linting (flat config with TypeScript ESLint)              |
| **bun**                | Latest  | Package manager + dev server                              |

> **⚠️ Runtime**: Bun for development, Node.js 22 for production (Dockerfile).
> **⚠️ ESM only**: `"type": "module"` in package.json, `NodeNext` module resolution.

### Frontend (TypeScript, ACTIVE ✅)

| Package          | Version | Purpose                                                         |
| ---------------- | ------- | --------------------------------------------------------------- |
| Next.js          | 16.1+   | React framework (App Router)                                    |
| React            | 19.2+   | UI library                                                      |
| TypeScript       | 5.9+    | Type safety                                                     |
| Tailwind CSS     | 4.1+    | Styling                                                         |
| TanStack Query   | 5.90+   | Server state / data fetching                                    |
| shadcn/ui        | Latest  | Accessible UI components                                        |
| Recharts         | 2.15+   | Dashboard charts (via shadcn/ui ChartContainer)                 |
| @insforge/sdk    | Latest  | InsForge BaaS client (DB, Realtime, Storage, Functions)         |
| @insforge/nextjs | 1.1.7+  | InsForge auth for Next.js                                       |
| motion           | 12.27+  | React micro-animations (LazyMotion optimized)                   |
| zod              | 3.24+   | Schema validation                                               |
| react-hook-form  | 7.54+   | Form management                                                 |
| prettier         | 3.8.1   | Code formatting (`apps/web/.prettierrc` — adds tailwind plugin) |

### Infrastructure

| Tool              | Purpose                                                         |
| ----------------- | --------------------------------------------------------------- |
| **InsForge BaaS** | Managed PostgreSQL, Realtime WebSocket, Storage, Edge Functions |
| **Vercel**        | Web hosting (Next.js)                                           |
| **Docker**        | Bot containerisation                                            |
| **Caddy**         | Reverse proxy                                                   |
| **Bun**           | Package manager (grammy + web)                                  |

---

## Legacy: Python PTB Bot (ARCHIVED 🗄️)

> **`apps/bot/` is unmaintained since Phase 96. Do NOT use for new bot work.**

The original Python bot used:

- python-telegram-bot v22.6 (asyncio, webhooks, callback-data, http2)
- httpx < 0.29 (pinned) for InsForge REST
- SQLAlchemy 2.0 (**tests only** — SQLite in-memory)
- aiohttp 3.13+ (health server)
- python-socketio 5.16+ (InsForge Realtime)
- cryptography 45+ (AES-256-GCM)
- `uv` for dependency management

These are preserved in `pyproject.toml` and `uv.lock` but are no longer the active runtime.

---

## Development Setup

### Quick Start (Active Apps Only)

```bash
# Bot (grammY — TypeScript)
cd apps/grammy && bun run dev

# Web dashboard
cd apps/web && bun dev

# Redis (required for bot cache)
docker compose -f docker-compose.local.yml up -d
```

### Environment Files

| App          | File                  | Template                   |
| ------------ | --------------------- | -------------------------- |
| Bot (grammY) | `apps/grammy/.env`    | `apps/grammy/.env.example` |
| Web          | `apps/web/.env.local` | `apps/web/.env.example`    |

### Required Environment Variables

```bash
# Bot (apps/grammy/.env)
DASHBOARD_MODE=true              # true = multi-bot from DB, false = use BOT_TOKEN
BOT_TOKEN=<telegram-bot-token>   # Only used when DASHBOARD_MODE=false
INSFORGE_BASE_URL=https://u4ckbciy.us-west.insforge.app
INSFORGE_ANON_KEY=<insforge-anon-key>
INSFORGE_REQUEST_TIMEOUT_MS=5000 # Phase 107: fail fast on slow/unreachable InsForge requests
# Master key is fetched from Security Vault (nezuko_secrets) at runtime — not in .env
LOG_LEVEL=info
REDIS_URL=redis://localhost:6379
HEALTH_PORT=8080

# Web (apps/web/.env.local)
NEXT_PUBLIC_INSFORGE_BASE_URL=https://u4ckbciy.us-west.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=<insforge-anon-key>   # Must match bot key
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_DEV_LOGIN=false       # Set true for local dev bypass
```

> ⚠️ **Both `INSFORGE_ANON_KEY` values must be identical** — use `get-anon-key` MCP to
> refresh both at the same time if either expires or behaves unexpectedly.

---

## Code Quality Tools

### TypeScript CLI Commands

```bash
# ── grammY Bot ──
cd apps/grammy
bun run type-check    # tsc --noEmit → 0 errors
bun run lint          # eslint src/ --max-warnings 0 → 0 warnings
bun run format        # prettier src/ ../../tests/grammy --write
bun run format:check  # prettier src/ ../../tests/grammy --check
bun run test          # vitest run → 145/145 tests passed
bun run test:coverage # vitest run --coverage (80% thresholds)
bun run build         # tsc -p tsconfig.build.json → dist/

# ── Web (Next.js) ──
cd apps/web
bun run type-check    # tsc --noEmit → 0 errors
bun run lint          # eslint src --max-warnings 0 → 0 warnings
bun x prettier src --write   # auto-format
bun x prettier src --check   # verify clean
bun run build         # next build → 0 errors
```

### Prettier Configuration

| File                   | Scope                     | Plugin                        |
| ---------------------- | ------------------------- | ----------------------------- |
| Root `.prettierrc`     | grammy src + tests/grammy | none (no tailwind)            |
| `apps/web/.prettierrc` | web src only              | `prettier-plugin-tailwindcss` |

---

## Database (InsForge Managed PostgreSQL)

- **Base URL**: `https://u4ckbciy.us-west.insforge.app`
- **Access (Bot)**: REST API via native `fetch()` — `GET/POST/PATCH/DELETE /api/database/records/{table}`
- **Access (Web)**: InsForge SDK (TypeScript) — `@insforge/sdk`
- **Auth header**: `Authorization: Bearer <INSFORGE_ANON_KEY>`
- **Canonical Migration**: `insforge/migrations/023_fresh_grammy_schema.sql`
- **Latest Incremental Migration**: `insforge/migrations/024_verification_contract_hardening.sql`
- **Tables**: 12 (all with RLS)
- **RPC Functions**: analytics functions plus verification contract RPC after migration 024 is applied live
- **Realtime Channels**: live backend now exposes 9 enabled patterns (`dashboard`, `bot_status`, `logs`, `commands`, `bot_instances`, `groups`, `channels`, `group_links`, `verification:%`)
- **Edge Functions**: 2 (`manage-bot`, `test-webhook/index.js`)
- **Storage Buckets**: 2 (`bot-assets` public, `bot-exports` private)
- **SQL Migrations**: 24 files (`001` through `023_fresh_grammy_schema.sql`)
- **⚠️ No direct PG connection**: InsForge does not expose raw PostgreSQL passwords

### InsForge Tables Written by Bot (all via REST fetch)

| Table               | Written By             | Method                            | Notes                                                    |
| ------------------- | ---------------------- | --------------------------------- | -------------------------------------------------------- |
| `verification_log`  | `verification.repo.ts` | `postRecords()`                   | status: 'verified'\|'restricted'\|'error' (NOT 'failed') |
| `protected_groups`  | `member-sync.ts`       | `patchRecords()` count update     | `member_count`, `last_sync_at`                           |
| `enforced_channels` | `member-sync.ts`       | `patchRecords()` count update     | `subscriber_count`, `last_sync_at`                       |
| `bot_status`        | `status-writer.ts`     | PATCH-then-POST                   | `status='online'`, heartbeat every 30s                   |
| `admin_commands`    | `command-worker.ts`    | `getRecords()` + `patchRecords()` | polls every 30s; realtime INSERT trigger active          |
| `bot_instances`     | `bot-manager.ts`       | `getRecords()` load active bots   | reads `is_active=true, is_deleted=false`                 |
| `admin_logs`        | `db-log-transport.ts`  | `postRecords()` fire-and-forget   | WARN+ pino lines; web Logs page realtime stream          |
| `api_call_log`      | `apiLogTransformer`    | `postRecords()` fire-and-forget   | all Telegram API calls (excl. getUpdates); latency_ms    |
| `owners`            | `owner.repo.ts`        | GET + `postRecords()` upsert      | Must exist before any `protected_groups` INSERT          |

> **⚠️ Phase 66 lesson**: All INSERT operations require `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon`.
> Without this, every INSERT returns **401 Unauthorized** from PostgREST.

### Verification Cache Tuning (Phase 108)

- Positive membership cache: `MEMBER_CACHE_TTL=300` seconds
- Negative membership cache: `MEMBER_NEGATIVE_CACHE_TTL=30` seconds
- Verification/join-request idempotency lock: `INTERVALS.IDEMPOTENCY_LOCK=15` seconds
- Active verification prompt TTL: `INTERVALS.VERIFICATION_PROMPT=300` seconds
- Verified-state freshness recheck: `VERIFIED_RECHECK_INTERVAL_MS=600000` milliseconds
- Fast enforcement block TTL: `INTERVALS.ENFORCEMENT_BLOCK=300` seconds
- Explicit verify clicks bypass cached negative membership results and force a fresh Telegram `getChatMember` check
- Explicit verify clicks also do a short fresh retry loop (`VERIFY_FRESH_CHECK_RETRIES=2`, `VERIFY_FRESH_CHECK_RETRY_DELAY_MS=350`) to absorb Telegram membership propagation lag after channel rejoins
- Group message enforcement revalidates stale previously verified users and re-restricts when needed
- Required-channel leave now seeds `enforcement_block:{groupId}:{userId}` without immediately re-restricting linked groups; the next blocked group message performs the visible enforcement step
- When multiple blocked messages arrive while one message-enforcement pass already holds the lock, lock-losing updates now still delete their own message immediately before returning

---

## InsForge MCP Tools Reference

| MCP Tool                   | When to Use                                                                   |
| -------------------------- | ----------------------------------------------------------------------------- |
| `get-backend-metadata`     | Check table record counts, functions, storage, edge functions                 |
| `get-anon-key`             | Refresh anon key — apply to BOTH `apps/grammy/.env` AND `apps/web/.env.local` |
| `run-raw-sql`              | Execute schema changes, seed data, run diagnostics                            |
| `get-table-schema`         | Inspect column types, constraints, indexes for a specific table               |
| `fetch-docs` instructions  | Read setup basics before writing any InsForge SDK code                        |
| `fetch-docs` db-sdk        | DB operations (select, insert, update, delete, rpc, filters, modifiers)       |
| `fetch-docs` real-time     | Realtime channels, triggers, `realtime.publish()`, SDK subscription API       |
| `fetch-docs` functions-sdk | Edge Function invocation from TypeScript                                      |

---

## grammY Bot Startup Patterns (Phase 97)

### Mode Detection Flow

```
loadConfig()        → Zod schema (soft — no required fields; empty strings → undefined)
  ↓
main()
  ├─ dashboardMode=true  → validate INSFORGE_* → runDashboardMode()
  └─ dashboardMode=false → validate BOT_TOKEN  → runStandaloneMode()
```

### Graceful Degradation (standalone mode)

| Config State                   | Behaviour                                                            |
| ------------------------------ | -------------------------------------------------------------------- |
| `BOT_TOKEN` + `INSFORGE_*` set | Full mode: bot + DB + Redis                                          |
| `BOT_TOKEN` only (no INSFORGE) | Degraded: bot works, no status writer / member sync / command worker |
| `BOT_TOKEN` missing            | Fatal error with clear message, `process.exit(1)`                    |
| `INSFORGE_BASE_URL=""` (blank) | Treated as not set (Zod coerces to `undefined`)                      |
| InsForge unreachable           | DB-backed operations fail fast via request timeout instead of hanging |

### `botInstanceId` Sentinel Values

| Value              | Meaning                                                                    |
| ------------------ | -------------------------------------------------------------------------- |
| `N` (positive int) | Real `bot_instances.id` row (dashboard mode per-bot)                       |
| `0`                | Standalone mode sentinel — no DB row exists; shutdown handler skips upsert |

---

_Last Updated: 2026-03-07 (Phase 113 — enforcement block TTL and dashboard coordinator documented)_
