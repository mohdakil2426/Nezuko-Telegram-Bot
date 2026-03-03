## Context

### Current State
The Nezuko Telegram bot platform is at **Phase 95** with a fully production-ready Python bot (`apps/bot/`, 25 files, 101 tests, 10.00/10 Pylint). The web dashboard (`apps/web/`, Next.js 16, 120+ TS files) connects to InsForge BaaS via `@insforge/sdk`. Both systems share the same InsForge PostgreSQL database (11 tables, 14 RPC functions, 5 realtime triggers).

### Why Rebuild (Not Migrate)
A line-by-line migration would carry Python patterns (`handler_groups`, `JobQueue`, `fire_and_forget` wrappers, custom `rate_limiter.py`) that don't map to grammY idioms. The PRD (§1.3) explicitly establishes this as a **ground-up rebuild** — referencing existing features but implementing with grammY-native architecture from day one.

### Constraints
1. **Dashboard Compatibility** — The grammY bot MUST produce identical database writes (same tables, same field names, same UPSERT patterns) so the existing web dashboard works without any modification.
2. **Parallel Running** — Both Python and grammY bots MUST be able to run simultaneously (different bot tokens) during the switchover period.
3. **InsForge BaaS** — No direct PostgreSQL access. All DB operations go through InsForge REST API (`/api/database/records/{table}`).
4. **Same Redis** — Same Redis 7.4+ instance but with namespaced keys (`nezuko:v2:` prefix) to avoid conflicts during parallel run.
5. **Same Realtime Protocol** — InsForge Socket.IO with `emit("REALTIME_SUBSCRIBE", { channel })` (NOT `call()` — learned in Phase 93).
6. **Telegram IDs are BIGINT** — IDs like `8265490825` exceed INT32 max (2.1B). JavaScript `number` is safe up to 2^53 (~9 quadrillion).

### Stakeholders
- **Bot Users** — Zero behavioral change. Verification flow identical.
- **Group Admins** — Same commands (`/protect`, `/unprotect`, `/channels`, `/settings`, `/verify`, `/stats`).
- **Dashboard Users** — No dashboard changes. Charts, logs, analytics continue working.

---

## Goals / Non-Goals

**Goals:**
1. Build a complete, production-ready Telegram bot at `apps/grammy/` using grammY v1.41.1 (TypeScript)
2. Implement ALL P0 features: join mute, verify button, multi-channel check, protection setup, leave detection, message filter, 8 bot commands
3. Implement P1 features: status heartbeat (30s), dashboard commands (realtime-driven), member count sync (15min), multi-bot mode
4. Achieve dashboard-compatible database writes (identical to Python bot)
5. Establish 80%+ test coverage with vitest
6. Deploy via Docker with 3-stage build (Bun install → Node build → Node 22-slim runtime)
7. Graceful 4-step shutdown: stop runner → await in-flight (8s max) → cleanup → exit
8. Handle all 70 documented edge cases from PRD §23

**Non-Goals:**
1. **NOT modifying `apps/web/`** — Zero dashboard changes
2. **NOT modifying `apps/bot/`** — Python bot remains untouched (parallel running)
3. **NOT adding new database tables or migrations** — Use existing schema
4. **NOT implementing P2 features** (batch verification, join request handling) in initial build — scaffold only
5. **NOT using `@insforge/sdk` for bot DB access** — Native `fetch()` for server-side control
6. **NOT using Prisma or any ORM** — Direct REST API calls
7. **NOT implementing webhooks** — Long polling via `@grammyjs/runner` only
8. **NOT internationalization** — English only (i18n deferred)

---

## Decisions

### Decision 1: Runtime — Bun Dev + Node.js 22 Production
**Choice**: Use Bun 1.3.10 for development (`bun run --watch`), Node.js 22.14.0 LTS for production Docker.
**Alternatives**: (a) Bun everywhere — rejected due to ioredis compatibility issues in production containers. (b) Node.js everywhere — rejected because Bun's watch mode and install speed improve developer experience 3-5x.
**Rationale**: Bun's `--watch` flag eliminates the need for `nodemon`/`tsx`. Node.js 22 LTS has proven ioredis stability and is the Docker standard.
> Reference: PRD §19, Decision #1

### Decision 2: Database — InsForge REST from Day One
**Choice**: TypeScript port of `apps/bot/core/insforge_client.py` using native `fetch()` API. No ORM, no `@insforge/sdk`.
**Alternatives**: (a) Prisma — rejected (schema sync overhead, extra dependency). (b) `@insforge/sdk` — rejected (browser-focused, lacks server-side HTTP control needed for `Prefer` headers). (c) `drizzle-orm` — rejected (no direct PostgreSQL access via InsForge).
**Rationale**: Same proven REST pattern as the Python bot. Zero schema drift. `fetch()` is built into Node.js 22 — no dependencies needed.
> Reference: PRD §10, Decision #2, #11

### Decision 3: Middleware Pipeline Order
**Choice**: Strict ordering: `sequentialize` → `ratelimiter` → `hydrateReply + hydrate` → `chatMembers` → `contextEnricher` → Composer tree
**Alternatives**: None — grammY deployment checklist mandates `sequentialize` first.
**Rationale**:
1. `sequentialize` MUST be first (grammY doc: prevents race conditions when using `runner`)
2. `ratelimiter` drops spam before expensive processing
3. `hydrate` enriches API responses (`msg.editText()`, `msg.delete()`)
4. `chatMembers` caches `getChatMember` results in Redis
5. `contextEnricher` last — injects `db`, `cache`, `logger`, `botId` into every `ctx`
> Reference: PRD §4.2, §9.2, Decision #33; grammY deployment checklist

### Decision 4: Transformer Pipeline
**Choice**: Two transformers installed on `bot.api.config`: `autoRetry()` then `parseMode("HTML")`
**Rationale**: Transformers intercept OUTGOING API calls. `auto-retry` wraps all calls with 429/500/network retry logic. `parseMode` sets default `parse_mode: "HTML"` on all send methods — eliminates per-call boilerplate.
> Reference: PRD §5.7, §6.1; `grammy/references/advanced/transformers.md`

### Decision 5: Handler Structure — Composer Tree with Error Boundaries
**Choice**: 6 `Composer<NezukoContext>` instances, each wrapped in `errorBoundary()`:
| Composer | Handles | Error Behavior |
|---|---|---|
| `adminComposer` | `/start`, `/help`, `/protect`, `/unprotect`, `/settings` | Reply "⚠️ Error, try again" |
| `channelsComposer` | `/channels`, `/verify`, `/stats` | Reply "⚠️ Error, try again" |
| `eventsComposer` | `new_chat_members`, `left_chat_member`, `message` filter | Silent log (don't spam group) |
| `migrationComposer` | `migrate_to_chat_id` | Silent log (internal) |
| `verifyComposer` | `callback_query /^verify:(-?\d+)$/` | `answerCallbackQuery("⚠️ Error")` |
| `fallbackComposer` | All unclaimed `callback_query:data` | Always answers (no boundary) |

**Alternatives**: (a) Single composer — rejected (one crash kills everything). (b) PTB handler groups — not applicable to grammY.
**Rationale**: Each composer is an isolated branch in grammY's middleware tree. `errorBoundary` prevents one domain's crash from propagating. `fallbackComposer` is ALWAYS last — answers unclaimed callback queries to remove Telegram's loading spinner.
> Reference: PRD §9.2, §11.3, Decision #33; `grammy/references/guide/errors.md`

### Decision 6: Concurrency — `run()` with `sequentialize`
**Choice**: Use `@grammyjs/runner`'s `run(bot)` in both single-bot and multi-bot modes. `sequentialize` keyed on `ctx.chat?.id.toString()`.
**Alternatives**: (a) `bot.start()` — rejected (processes updates sequentially, insufficient for multi-bot). (b) Manual `getUpdates` — rejected (reinventing the wheel).
**Rationale**: `run()` processes updates concurrently (default 500 in-flight). `sequentialize` ensures same-chat updates are processed in order — preventing race conditions on Redis cache and InsForge DB writes.
> Reference: PRD §12.1-12.2, Decision #18; `grammy/references/plugins/runner.md`

### Decision 7: State Management — DB-First, No Sessions
**Choice**: No `@grammyjs/session`. All state stored in InsForge PostgreSQL and Redis cache.
**Alternatives**: `session()` middleware — rejected (Nezuko doesn't need per-chat conversational state; all data is in the database).
**Rationale**: Verification is a single-action flow (click button → check membership → unmute). No multi-step conversations. Cache handles transient state (`verified:{groupId}:{userId}` keys).
> Reference: PRD §4.3, §6.2, Decision #4

### Decision 8: Cache Strategy — 3-Layer Hybrid
**Choice**:
| Layer | What | TTL | Implementation |
|---|---|---|---|
| L1 | Individual channel membership | Event-driven (no TTL) | `@grammyjs/chat-members` plugin (Redis adapter) |
| L2 | Derived verification status | 6 hours | Custom Redis key `nezuko:v2:verified:{groupId}:{userId}` |
| L3 | Periodic bulk re-check | Every 15 min | `member-sync` service via `setInterval` |

**Alternatives**: (a) Single Redis TTL — rejected (misses real-time membership changes). (b) No cache — rejected (getChatMember API latency 100-300ms per call).
**Rationale**: L1 cache via `chat-members` plugin automatically updates on `chat_member` events — no TTL needed because it's event-driven. L2 provides fast verification lookups without per-channel API calls. L3 catches edge cases where Telegram doesn't deliver `chat_member` updates.
> Reference: PRD §6.1 (chat-members), Decision #21, #22

### Decision 9: allowed_updates — Exactly 4 Types
**Choice**: `["message", "callback_query", "chat_member", "my_chat_member"]`
**No `chat_join_request`** — deferred to v2 (P2 feature).
**Rationale**: `message` for commands + text filter. `callback_query` for verify buttons. `chat_member` for join/leave detection + chat-members plugin cache. `my_chat_member` for bot added/removed/promoted/demoted detection.
> Reference: PRD Decision #27

### Decision 10: Graceful Shutdown — 4-Step Enhanced
**Choice**: On SIGINT/SIGTERM:
1. `handle.stop()` — stop accepting new updates
2. `await Promise.race([handle.task(), timeout(8000)])` — wait for in-flight updates (max 8s)
3. `await Promise.allSettled([db.upsertBotStatus(botId, "offline"), cache.quit()])` — cleanup
4. `process.exit(0)` — exit

**Rationale**: Docker sends SIGTERM then SIGKILL after 10s. We need to complete in-flight verification unmutes before dying. 8s timeout ensures we never exceed Docker's grace period.
> Reference: PRD §11.4, Decision #29; `grammy/references/advanced/reliability.md`

### Decision 11: InsForge REST Client API Surface
**Choice**: `InsForgeClient` class with methods: `getRecords<T>()`, `postRecords<T>()`, `patchRecords<T>()`, `deleteRecords()`, plus high-level wrappers in repository files.
**Rationale**: Mirrors the Python bot's refactored public API (Phase 95: `get_records`, `post_records`, `patch_records`, `delete_records`, `rpc`). Same `Prefer` header patterns, same `content-range` checking for UPSERT detection.
> Reference: PRD §10.1; Memory bank: `systemPatterns.md` InsForge Client Public API section

### Decision 12: InsForge REST UPSERT Pattern
**Choice**: PATCH-then-POST for tables with multiple UNIQUE constraints (e.g., `bot_status` has both `bot_id UNIQUE` and `bot_instance_id UNIQUE`).
**Rationale**: PostgREST `Prefer: resolution=merge-duplicates` fails with 409 on multiple UNIQUE columns. PATCH first with `Prefer: return=representation`, check if empty array returned → POST if no row matched.
> Reference: Memory bank: `systemPatterns.md` UPSERT with Multiple UNIQUE Constraints

### Decision 13: InsForge Realtime — emit() Not call()
**Choice**: Use `socket.emit("REALTIME_SUBSCRIBE", { channel })` — NOT `socket.call()`.
**Rationale**: InsForge Realtime does not send ACKs for `REALTIME_SUBSCRIBE`. Using `call()` causes a 10-second timeout freeze followed by disconnect (discovered in Phase 93). `emit()` fires-and-forgets correctly.
> Reference: Memory bank: `activeContext.md` Phase 93; `systemPatterns.md` InsForge Realtime Client Pattern

### Decision 14: Logging — pino v10 Structured JSON
**Choice**: `pino` with child logger per module/update. JSON output in production, `pino-pretty` in development.
**Rationale**: Fastest Node.js logger. JSON structure enables dashboard log forwarding (same pattern as `InsForgeLogHandler` in Python). Child loggers scope `module` and `updateId` fields.
> Reference: PRD Decision #9

### Decision 15: Testing — vitest v4 + Transformer Mocking
**Choice**: vitest for test framework. Mock outgoing Telegram API calls via grammY transformer functions. Feed mock updates via `bot.handleUpdate()`.
**Alternatives**: (a) Jest — rejected (ESM support issues, slower). (b) Real Telegram API calls — rejected (rate limits, requires live bot token).
**Rationale**: grammY's transformer API allows intercepting all outgoing API calls without mocking internals. `bot.handleUpdate()` is the official way to test handlers with mock update objects.
> Reference: PRD §14.2; `grammy/references/advanced/deployment.md` (Testing section)

### Decision 16: Project Structure — Flat Database Layer
**Choice**: 5 flat repo files in `src/database/` (no subdirectories, no abstract base class).
**Rationale**: With only 5 repositories, nested directories add complexity without benefit. Each repo is a function factory returning a `GroupRepository` interface implementation.
> Reference: PRD §8.2

### Decision 17: Docker — 3-Stage Build
**Choice**: Stage 1: `oven/bun:1.2` for `bun install --frozen-lockfile`. Stage 2: `node:22-slim` for `tsc` build. Stage 3: `node:22-slim` for runtime.
**Rationale**: Bun's install is 10x faster than npm. Node.js runtime ensures ioredis compatibility. Final image ~120MB.
> Reference: PRD §13.2, Decision #19

---

## Architecture

### High-Level System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                       apps/grammy/ (TypeScript)                   │
│                                                                   │
│  main.ts ──► Bot<NezukoContext>(token)                           │
│     │                                                             │
│     ├── Transformer Stack                                        │
│     │   1. auto-retry        (outgoing — handles 429/500/net)    │
│     │   2. parse-mode        (outgoing — default HTML)           │
│     │                                                             │
│     ├── Middleware Stack (ORDER CRITICAL!)                        │
│     │   1. sequentialize     (per-chat queue — MUST be first)    │
│     │   2. ratelimiter       (user flood protect — Redis)        │
│     │   3. hydrateReply      (ctx.replyWithHTML, ctx.replyFmt)   │
│     │   4. hydrate           (msg.editText(), msg.delete())      │
│     │   5. chatMembers       (auto-cache getChatMember)          │
│     │   6. contextEnricher   (inject db, cache, logger, botId)   │
│     │                                                             │
│     ├── Composer Tree (with errorBoundary per composer)          │
│     │   ├── adminComposer    → /start, /help, /protect, etc.    │
│     │   ├── channelsComposer → /channels, /verify, /stats        │
│     │   ├── eventsComposer   → joins, leaves, message filter     │
│     │   ├── migrationComposer → supergroup migration             │
│     │   ├── verifyComposer   → callback_query verify:*           │
│     │   ├── fallbackComposer → catch-all callback answerer       │
│     │   └── bot.catch()      → global GrammyError/HttpError      │
│     │                                                             │
│     ├── Services (ZERO grammY imports — framework agnostic)      │
│     │   ├── verification.ts  → 3-layer cache + membership check  │
│     │   ├── protection.ts    → mute/unmute via Telegram API      │
│     │   ├── channel-linker   → link/unlink + counter maintenance │
│     │   ├── status-writer    → 30s heartbeat (setInterval)       │
│     │   ├── member-sync      → 15min count sync (setInterval)    │
│     │   └── batch-verify     → verify multiple pending users     │
│     │                                                             │
│     ├── Database (InsForge REST — native fetch)                  │
│     │   ├── InsForgeClient   → getRecords, postRecords, etc.    │
│     │   ├── group.repo       → protected_groups CRUD             │
│     │   ├── channel.repo     → enforced_channels CRUD            │
│     │   ├── link.repo        → group_channel_links CRUD          │
│     │   ├── verification.repo → verification_log writes          │
│     │   └── bot-status.repo  → bot_status UPSERT                │
│     │                                                             │
│     ├── Cache (ioredis → Redis 7.4+)                             │
│     │   ├── L1: chat-members plugin (event-driven)               │
│     │   ├── L2: verified:{groupId}:{userId} (6h TTL)             │
│     │   └── L3: member-sync (15min periodic)                     │
│     │                                                             │
│     └── Realtime (socket.io-client → InsForge WS)                │
│         ├── Subscribe: "commands", "bot_instances"                │
│         ├── Listen: "command_updated", "bot_instance_changed"     │
│         └── Fallback: 30s polling if WS unavailable              │
└──────────────────────────────────────────────────────────────────┘
```

### Directory Layout (~30 Source Files)

```
apps/grammy/
├── src/
│   ├── main.ts                          # Entry point + graceful shutdown
│   ├── config.ts                        # Zod-validated env config
│   ├── types.ts                         # NezukoContext + all shared types
│   ├── core/
│   │   ├── bot-factory.ts               # Creates Bot with all plugins
│   │   ├── cache.ts                     # Redis client (ioredis)
│   │   ├── constants.ts                 # Shared constants
│   │   ├── insforge-client.ts           # InsForge REST client (fetch)
│   │   ├── encryption.ts               # AES-256-GCM decryption (Phase 5)
│   │   └── shutdown.ts                 # 4-step shutdown handler
│   ├── middleware/
│   │   ├── sequentialize.ts            # [1st] Per-chat ordering
│   │   ├── context-enricher.ts          # [2nd] DI middleware
│   │   ├── admin-guard.ts              # Filter: admin-only
│   │   ├── group-only.ts              # Filter: group/supergroup
│   │   └── permission-check.ts        # Bot permission validation
│   ├── composers/
│   │   ├── admin.ts                     # /start, /help, /protect, etc.
│   │   ├── channels.ts                 # /channels, /verify, /stats
│   │   ├── events.ts                   # join, leave, message filter
│   │   ├── migration.ts               # Supergroup migration
│   │   ├── verify.ts                   # Callback query handler
│   │   └── fallback.ts                # Catch-all callback answerer
│   ├── services/
│   │   ├── verification.ts             # Membership check + cache
│   │   ├── protection.ts              # Mute/unmute/kick
│   │   ├── channel-linker.ts          # Link/unlink channels
│   │   ├── status-writer.ts           # 30s heartbeat
│   │   ├── member-sync.ts            # 15min count sync
│   │   └── batch-verification.ts     # Batch verify (scaffold)
│   ├── database/
│   │   ├── types.ts                    # DB entity types
│   │   ├── group.repo.ts              # Protected groups
│   │   ├── channel.repo.ts            # Enforced channels
│   │   ├── link.repo.ts              # Group↔Channel links
│   │   ├── verification.repo.ts      # Verification logs
│   │   └── bot-status.repo.ts        # Bot status heartbeat
│   └── utils/
│       ├── auto-delete.ts             # Timed message deletion
│       ├── logger.ts                  # pino structured logging
│       ├── messages.ts                # User-facing strings
│       └── health.ts                  # HTTP health endpoint
├── Dockerfile
├── .dockerignore
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── vitest.config.ts
├── .env.example
└── .env                                # gitignored
```

### Data Flow: Verification (Complete)

```
User joins group
  → Telegram delivers update (message:new_chat_members)
  → grammY runner receives via getUpdates
  → sequentialize queues per chat_id
  → ratelimiter checks user flood (1/1s)
  → hydrate enriches ctx
  → chatMembers middleware (no-op for join events)
  → contextEnricher injects db/cache/logger
  → eventsComposer handles:
    1. Skip if member.is_bot (EC-1)
    2. Skip if !member.id (EC-9)
    3. Check if admin → skip (EC-17)
    4. getGroupChannels(chatId) via InsForge REST
    5. If no channels → skip (not protected)
    6. restrictChatMember(chatId, userId, {can_send_messages: false})
    7. Build InlineKeyboard with channel links + verify button
    8. ctx.reply(greeting, {reply_markup: keyboard})
    9. setTimeout → auto-delete after 5 min

User clicks "✅ Verify"
  → Telegram delivers callback_query with data="verify:-1001234567"
  → verifyComposer matches /^verify:(-?\d+)$/
  → Debounce check: Redis GET verify_debounce:{userId} (EC-11)
  → For each linked channel:
    a. L1: chatMembers plugin cache (Redis adapter)
    b. L2: Redis GET member:{channelId}:{userId}
    c. L3: Telegram API getChatMember(channelId, userId)
    d. Cache result on hit
  → If all channels verified:
    1. restrictChatMember(chatId, userId, {all permissions: true})
    2. Redis SET verified:{chatId}:{userId} "1" EX 21600 (6h)
    3. InsForge POST verification_log (fire-and-forget)
    4. answerCallbackQuery("✅ Verified!")
    5. deleteMessage() (verification message)
  → If missing channels:
    1. answerCallbackQuery("❌ Please join: @channel1, @channel2")
```

---

## Risks / Trade-offs

### Risk 1: ioredis Event Listener Issues on Bun
**Risk**: `ioredis` may have subtle event listener issues when running under Bun runtime.
**Likelihood**: Medium | **Impact**: Medium
**Mitigation**: Development uses Bun; production uses Node.js 22 (proven stable). The `@grammyjs/ratelimiter` plugin passes ioredis instances differently than direct usage — test on Node.js before Docker deployment.

### Risk 2: InsForge API Downtime Affects Bot
**Risk**: InsForge REST API goes down → all DB operations fail → bot can't verify users.
**Likelihood**: Low | **Impact**: High
**Mitigation**: Catch HTTP errors on all DB operations. Bot continues operating with cached data (Redis L1+L2 caches survive). Log errors via pino. Status writer marks bot as "degraded". Resume automatically when API recovers.

### Risk 3: Redis Cache Key Conflicts During Parallel Run
**Risk**: Both Python and grammY bots write to the same Redis keys → stale/conflicting data.
**Likelihood**: Medium | **Impact**: Medium
**Mitigation**: Namespace ALL grammY cache keys with `nezuko:v2:` prefix (Decision #14 from PRD). Python bot uses unprefixed keys. No overlap possible.

### Risk 4: Telegram Rate Limits During Testing
**Risk**: Running integration tests hits Telegram rate limits → bot banned.
**Likelihood**: Medium | **Impact**: Low
**Mitigation**: All tests use transformer-mocked API calls. `auto-retry` plugin handles production rate limits with `Retry-After` compliance. Use separate test bot token.

### Risk 5: Multi-Bot Mode Race Conditions
**Risk**: Two updates for the same chat processed concurrently → DB write conflicts, double-mute.
**Likelihood**: Medium | **Impact**: High
**Mitigation**: `sequentialize` middleware keys on `chat_id` — guarantees same-chat updates run sequentially. Combined with per-bot `runner` instances in multi-bot mode.

### Risk 6: InsForge Realtime Socket.IO Disconnect
**Risk**: WebSocket connection drops → bot stops receiving instant commands.
**Likelihood**: Low | **Impact**: Medium
**Mitigation**: Socket.IO built-in reconnection (2s → 60s exponential backoff). Command worker falls back to 30s polling if WS unavailable. Both modes produce identical behavior.

### Risk 7: Dashboard Shows Stale Data During Switchover
**Risk**: During parallel run, dashboard shows data from both bots → confusing.
**Likelihood**: Low | **Impact**: Low
**Mitigation**: Each bot writes with its own `bot_id`. Dashboard filters by active bot. Python bot's heartbeat will stop when it's decommissioned.

---

## Migration Plan

### Phase 0: Preparation
1. Create separate Telegram test bot token (BotFather → `/newbot`)
2. Verify InsForge anon key works for both bots
3. Confirm Redis is accessible
4. Reserve `apps/grammy/` directory

### Phase 1-4: Build (Single-Bot Mode)
1. Implement foundation → core infra → bot logic → background services
2. Test with dedicated test bot token
3. Validate: DB writes match Python bot patterns
4. Run vitest suite: all tests pass

### Phase 5: Multi-Bot Mode
1. Implement bot registry, lifecycle manager, encryption
2. Add InsForge Realtime client
3. Test with dashboard-managed bots
4. Validate: command worker processes dashboard commands

### Phase 6: Parallel Running
1. Both bots active (different tokens, same groups for testing)
2. Compare DB writes side-by-side
3. 24h stability window: error rate ≤ 1%, p99 latency ≤ 200ms, heartbeat continuous

### Phase 7: Token Swap
1. Stop Python bot
2. Update production bot token to grammY bot
3. Monitor dashboard + logs for 48 hours

### Rollback Strategy
- If error rate > 2% for 10 minutes OR heartbeat gap > 120 seconds:
  1. Stop grammY bot
  2. Restart Python bot with production token
  3. Investigate and fix
- Python bot remains deployable throughout the transition period

---

## Open Questions

1. **Sentry DSN**: Should the grammY bot use the same Sentry project as the Python bot, or a separate one? (Recommendation: separate project, shared org)
2. **Log forwarding**: Should the grammY bot forward WARNING+ logs to `admin_logs` table like the Python bot's `InsForgeLogHandler`? (Recommendation: yes, same pattern)
3. **Multi-bot max instances**: What's the cap for concurrent bot instances in dashboard mode? (PRD suggests monitoring, no hard limit — consider adding `MAX_BOT_INSTANCES=20` env var)
4. **Bun lockfile**: Should `bun.lock` or `bun.lockb` be committed? (Recommendation: `bun.lock` text format for readability)
