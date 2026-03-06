# Active Context: Current State

### Current Status
**Phase 99: grammY Dashboard Mode Debugging — IN PROGRESS 🔧**

Bot starts, is `online`, heartbeating every 30s. Updates **DO arrive** (confirmed via `DEBUG_UPDATES`
middleware). Full middleware chain **completes cleanly** (no deadlock). But `/start` DM handler is
**not matching** — the `adminComposer.command("start")` filter fires but produces zero output.

**Suspected root cause: `CommandsFlavor` added to `NezukoContext` without its plugin middleware installed.**

---

## Phase 99: grammY Dashboard Mode Debugging (IN PROGRESS 🔧)

### Definitive Findings This Session (2026-03-06)

#### ✅ Confirmed Working
| Thing | Evidence |
|---|---|
| Telegram delivers updates | `DEBUG_UPDATES` middleware fires for every `/start`: `updateId: 822547088` etc. |
| `ctx.api.sendMessage()` works | RAW TEST handler (installed before sequentialize) replied successfully |
| Full middleware chain: no deadlock | `[CHAIN]` checkpoints: all 5 plugins ENTER+EXIT in order, no hang |
| `htmlTransformer` works | No parse_mode errors logged after fix |
| Redis works | Docker running, `Connected` + `Ready` in startup logs |

#### ❌ Still Broken
| Thing | Evidence |
|---|---|
| `/start` not responded to | `[CHAIN] → entering composers` + `[CHAIN] ← exited composers` immediately — command filter not matching |
| `[START] /start command handler matched!` never logged | Despite `ctx.log.info()` at top of handler — handler is never entered |
| 6 tests failing | `bun run test` exits code 1 (related: `encrypt` + `bot-factory` test files) |

---

### ⚠️ Root Cause Analysis

#### Candidate A (MOST LIKELY): `CommandsFlavor` Without Plugin Installed
```ts
// types.ts
export type NezukoContext = HydrateFlavor<
  Context & NezukoContextFlavor & CommandsFlavor & ChatMembersFlavor
>;
```
- `CommandsFlavor` is from `@grammyjs/commands` — adds `commands: CommandsGroupManager` to ctx
- The `@grammyjs/commands` plugin is **NEVER installed** in `wireBotMiddleware()` in `bot-factory.ts`
- When the Commands plugin is not installed but its flavor IS on the context type, grammY's `.command()` filter may behave differently or skip matching
- **Fix**: Remove `CommandsFlavor` from `NezukoContext` if the plugin is not used, OR install the Commands plugin middleware

#### Candidate B: Composer Singletons Shared Across Bot Instances
```ts
// admin.ts — module-level singleton
export const adminComposer = new Composer<NezukoContext>();
adminComposer.command("start", async (ctx) => { ... });
```
- In dashboard multi-bot mode, `wireBotMiddleware()` is called per bot — but the SAME global
  `adminComposer` instance is passed to each bot's `bot.use()` via `adminComposer.errorBoundary()`
- grammY internally marks middleware as "used" — installing the same Composer on multiple Bot
  instances simultaneously can cause handlers to silently skip
- **Fix**: Convert to factory functions: `export function createAdminComposer(): Composer<NezukoContext>`

---

### Checkpoint Trace (2026-03-06 07:17 IST — update #822547088, `/start` DM)

```
DEBUG: [DEBUG] Incoming update #822547088 type=message text="/start"
DEBUG: [CHAIN] → entering sequentialize
DEBUG: [CHAIN] → entering hydrate
DEBUG: [CHAIN] → entering chatMembers
DEBUG: [CHAIN] → entering contextEnricher
DEBUG: [CHAIN] → entering composers         ← adminComposer.errorBoundary fires
DEBUG: [CHAIN] ← exited composers           ← exits immediately, NO [START] log
DEBUG: [CHAIN] ← exited contextEnricher
DEBUG: [CHAIN] ← exited chatMembers
DEBUG: [CHAIN] ← exited hydrate
DEBUG: [CHAIN] ← exited sequentialize
```

Zero errors. Zero `GrammyError`. Zero `[START] /start command handler matched!`. **The command filter is silently not matching.**

---

### Files Changed This Session

| File | Change | Status |
|---|---|---|
| `apps/grammy/src/core/bot-factory.ts` | Full rewrite: `wireBotMiddleware()`, correct `makeErrorHandler()`, `DEBUG_UPDATES`, checkpoint debug (TEMP), removed RAW TEST handler | Keep (remove temp code) |
| `apps/grammy/src/core/cache.ts` | `maxRetriesPerRequest: 0`, `enableOfflineQueue: false`, `connectTimeout: 3000`, try/catch in all adapter methods | ✅ Keep |
| `apps/grammy/src/composers/admin.ts` | `[START]` debug log + try/catch in `/start` handler | TEMP — remove after fix |
| `apps/grammy/.env` | `DEBUG_UPDATES=true` | TEMP — revert to false after fix |

---

### IMMEDIATE Next Steps (priority order)

1. **Investigate `CommandsFlavor`** — check if `@grammyjs/commands` is actually called anywhere:
   ```bash
   grep -r "createCommandGroup\|setMyCommands\|Commands(" apps/grammy/src/
   ```
   If not used: **remove `CommandsFlavor` from `NezukoContext` in `types.ts`**

2. **Try a plain `bot.on("message:text")` before composers** to confirm whether ANY filter matches —
   if this fires but `.command("start")` doesn't, it's definitely a filter issue not a chain issue

3. **Convert composer singletons to factory functions** — all 6 composers:
   ```ts
   // BEFORE (singleton — shared across all bots in multi-bot mode)
   export const adminComposer = new Composer<NezukoContext>();
   // AFTER (factory — fresh instance per bot)
   export function createAdminComposer(): Composer<NezukoContext> {
     const c = new Composer<NezukoContext>();
     c.command("start", handler);
     return c;
   }
   ```
   Update `wireBotMiddleware()` in `bot-factory.ts` to call `createAdminComposer()` etc.

4. **Clean up all temp diagnostic code** after fix confirmed:
   - Remove `[CHAIN]` checkpoints from `bot-factory.ts`
   - Remove `[START]` logging from `admin.ts`
   - Set `DEBUG_UPDATES=false` in `.env`

5. **Fix 6 failing tests** — `bun run test` and review output

---

## Phase 98: InsForge Fresh DB Setup — grammY Clean Baseline (COMPLETE ✅)

### Summary
Audited, fixed, and executed a full clean InsForge database migration for the grammY bot. All
incremental PTB-era migrations (001–022) replaced by a single clean baseline
(`023_fresh_grammy_schema.sql`). DB cleared — ready for fresh grammY bot onboarding.

### Live DB State
- **`bot_instances`**: 1 row (ID 12 — `@grammynezukobot`, `bot_id: 8716661547`, freshly encrypted)
- **`bot_status`**: 1 row — `status: online`, heartbeating every 30s
- **Schema**: 23 migrations (001–022 PTB-era + 023 grammY clean baseline)
- **Master key**: In vault (`nezuko_secrets`) — first 8 chars: `ouuLjiEc`

---

## Architecture (Current — Phase 99)

```
Web Dashboard (Next.js 16) ──► @insforge/sdk ──► InsForge BaaS (PostgreSQL + Realtime WS)

Bot Engine (grammY/TS) ──► native fetch() REST ──► InsForge BaaS
  ├─ main.ts           (standalone vs dashboard mode switch)
  ├─ bot-factory.ts    (wireBotMiddleware: plugins → composers → bot.catch)
  │    Plugins:  autoRetry → htmlTransformer (api transformer)
  │              debugMiddleware → sequentialize → hydrate → chatMembers → contextEnricher
  │    Composers: admin.errorBoundary → channels.eb → migration.eb → events.eb → verify.eb → fallback
  ├─ cache.ts          (Redis/ioredis, maxRetriesPerRequest:0, enableOfflineQueue:false)
  ├─ insforge-client.ts(PostgREST REST)
  ├─ encryption.ts     (AES-256-GCM, getMasterKey() vault, 5min TTL)
  ├─ status-writer.ts  (30s heartbeat)
  ├─ command-worker.ts (WS + 30s poll fallback)
  ├─ member-sync.ts    (15min interval)
  ├─ bot-manager.ts    (multi-bot coordinator + 30s sync loop)
  ├─ bot-lifecycle.ts  (start/stop/restart, getMe() token validation)
  └─ bot-registry.ts   (instance storage)
```

---

## Key Credentials
- **InsForge Base URL**: in `apps/grammy/.env`
- **InsForge Anon Key**: in `apps/grammy/.env`, `apps/web/.env.local`
- **Master Key**: In vault (`nezuko_secrets` table) — accessed via `getMasterKey(db)`
- **Bot**: `@grammynezukobot` — Telegram ID `8716661547`

---

## Local Dev Stack

| Component | Where |
|---|---|
| Bot (grammY — PRIMARY) | `cd apps/grammy && bun run dev` |
| Bot (Python PTB — preserved) | `uv run python -m apps.bot.main` (from project root) |
| Web (Next.js) | `cd apps/web && bun dev` — port 3000 |
| Redis | Docker — `docker compose -f docker-compose.local.yml up -d` |
| PostgreSQL | **InsForge cloud REST API** — no local DB |

---

## All-time Quality Gates
| Check | Result |
|---|---|
| `ruff check apps/bot` | ✅ 0 errors |
| `pylint apps/bot` | ✅ **9.99/10** |
| `pyrefly check` | ✅ 0 errors |
| `pytest tests/bot/` | ✅ **101 passed** |
| `tsc --noEmit` (web) | ✅ 0 errors |
| `bun run build` (web) | ✅ exit 0 |
| `bun run type-check` (grammy) | ✅ 0 errors |
| `bun run lint` (grammy) | ✅ 0 warnings |
| `bun run test` (grammy) | ❌ **6 failing** (Phase 99 regression to fix) |

---

_Last Updated: 2026-03-06 07:20 IST (Phase 99 — confirmed: updates arrive, chain clean, `.command()` filter not matching — CommandsFlavor + singleton composer are top suspects)_
