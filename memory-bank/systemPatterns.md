# System Patterns: Architecture & Implementation

> **Active Runtime**: `apps/grammy/` (TypeScript + grammY v1.41.1)
> **Last Updated**: 2026-03-16 (Phase 137)

---

## Architecture Overview

Nezuko is a **2-tier platform** — zero custom API server. Bot and web both talk directly to InsForge REST / SDK.

```
┌─────────────────────────┐     ┌──────────────────────────────────────────┐
│  Web Dashboard (Next.js)│────►│  @insforge/sdk                           │
└─────────────────────────┘     └───────────────────┬──────────────────────┘
                                                    │ HTTPS
┌─────────────────────────┐     ┌───────────────────▼──────────────────────┐
│  grammY Bot (TypeScript)│────►│  InsForge BaaS (PostgreSQL + Realtime WS)│
│  InsForgeClient (fetch) │◄────│  DB Triggers → 5 Realtime channels       │
│  InsForgeRealtimeClient │     │  Edge Functions (manage-bot)             │
└─────────────────────────┘     └──────────────────────────────────────────┘
```

---

## grammY Bot Source Map

```text
apps/grammy/src/
├── main.ts, config.ts    # Entry points & Zod soft validation
├── types.ts              # NezukoContext, BotDeps, VerificationResult, DashboardCommand
├── core/                 # Bot factory, InsForge REST/Realtime clients, Cache, Encryption
├── middleware/           # sequentialize, rate-limiter, hydrate, contextEnricher, guards
├── composers/            # Command & event handlers (admin, channels, verify, setup, fallback)
├── menus/                # Inline keyboards (settings.menu.ts, private.menu.ts)
├── services/             # verification, protection, member-sync, status-writer, cmd-worker
├── multi-bot/            # BotManager, BotLifecycleManager, BotRegistry (DASHBOARD_MODE)
├── database/             # Repository layer over InsForge REST
└── utils/                # logger, health, keep-alive, auto-delete, process-lock, watchdog
```

---

## 1 — Operating Modes

```typescript
// Standalone mode  (DASHBOARD_MODE=false, default)
//   BOT_TOKEN from .env → single bot → long-polling via @grammyjs/runner
//   InsForge optional — graceful degradation without DB
//   statusWriter SKIPPED (no bot_instances row) — member sync runs if DB available

// Dashboard mode  (DASHBOARD_MODE=true)
//   Reads bot_instances from InsForge DB → decrypts tokens → BotManager starts each
//   Requires INSFORGE_BASE_URL + INSFORGE_SERVICE_KEY
//   Full services: statusWriter (30s heartbeat) + memberSync (15min) + CommandWorker
```

---

## 2 — NezukoContext Type (types.ts — actual)

```typescript
// ✅ Correct — includes CommandsFlavor (added Phase 135)
export type NezukoContext = Context &
  HydrateFlavor<Context> &
  CommandsFlavor<Context> &
  ConversationFlavor<Context> &
  ChatMembersFlavor &
  NezukoContextFlavor; // { db, cache, botId, log }

// ❌ Wrong: old docs omitted CommandsFlavor
```

---

## 3 — Middleware & Composer Order (bot-factory.ts — CRITICAL)

Full plugin installation order matters for correctness:

```typescript
// ── API Transformers (outgoing, applied in order)
bot.api.config.use(apiThrottler());      // FIRST — proactive rate queue
bot.api.config.use(autoRetry({ maxRetryAttempts: 3, maxDelaySeconds: 10 })); // reactive 429/500
bot.api.config.use(htmlTransformer);     // default parse_mode="HTML"
bot.api.config.use(apiLogTransformer);   // fire-and-forget → api_call_log

// ── Middleware (upstream → downstream)
bot.use(updateActivityMiddleware);       // tracks lastUpdateAt / lastPollAt for watchdog
bot.use(sequentializeMiddleware);        // MUST be first stateful — per (chatId:userId)
bot.use(limit({ timeFrame: 2000, limit: 3, storageClient: cache.redis })); // Redis rate-limit
bot.use(hydrate());                      // adds .delete(), .editText() on API results
bot.use(commands());                     // @grammyjs/commands flavor
bot.use(chatMembers(cache.chatMembersAdapter)); // caches getChatMember results
bot.use(autoQuote({ allowSendingWithoutReply: true }));
bot.use(contextEnricher(deps));          // injects db, cache, botId, log into ctx

// ── Conversations (AFTER contextEnricher)
bot.use(conversations());
bot.use(setupWizardConversation);        // /setup guided wizard

// ── Menus (BEFORE composers — intercepts callback_query)
bot.use(settingsMenu);
bot.use(privateMenu);

// ── Core commands (/start, /help) wired directly on bot
wireCoreCommands(bot, deps);

// ── Composers (each wrapped in errorBoundary, except fallback)
mountProtectedComposer(setupComposer);   // /setup
mountProtectedComposer(adminComposer);   // /protect /unprotect /settings /status
mountProtectedComposer(channelsComposer);// /channels /verify /stats
mountProtectedComposer(migrationComposer);
mountProtectedComposer(eventsComposer);  // chat_member + chat_join_request
mountProtectedComposer(verifyComposer);  // callback_query verify:{groupId}
bot.use(fallbackComposer);               // ALWAYS last — no errorBoundary

bot.catch(async (err) => { ... });       // global catch — handles 401/403/409
```

---

## 4 — InsForge REST Client Pattern (bot-side)

```typescript
// ✅ Bot always uses InsForgeClient — NEVER @insforge/sdk
const db = new InsForgeClient({ baseUrl, anonKey: serviceKey, logger, requestTimeoutMs });

await db.getRecords<T>("table", { column: "eq.value" });
await db.postRecords<T>("table", [{ col: "val" }]);
await db.patchRecords<T>("table", { col: "eq.val" }, { col: "new" });
await db.deleteRecords("table", { col: "eq.val" });
await db.rpc<T>("function_name", { param: "value" });
await db.getSecret("master_key"); // reads from nezuko_secrets vault

// All calls have AbortController timeout — slow network never stalls handlers
```

---

## 5 — UPSERT Pattern (PATCH-then-POST)

```typescript
// ✅ Correct — multi-UNIQUE tables break on Prefer: resolution=merge-duplicates
const patched = await db.patchRecords<BotStatus>("bot_status", { bot_id: `eq.${botId}` }, data);
if (patched.length === 0) {
  await db.postRecords<BotStatus>("bot_status", [{ bot_id: botId, ...data }]);
}

// ❌ Wrong: Prefer: resolution=merge-duplicates → 409 when table has multiple UNIQUE cols
```

---

## 6 — Realtime Channel Contract

Both bot (socket.io-client) and web (@insforge/sdk) share these channels.
**Never rename without updating both sides.**

| Channel         | Event                  | DB Trigger Source              |
| --------------- | ---------------------- | ------------------------------ |
| `dashboard`     | `verification`         | `verification_log` INSERT      |
| `bot_status`    | `status_changed`       | `bot_status` INSERT/UPDATE     |
| `logs`          | `new_log`              | `admin_logs` INSERT            |
| `commands`      | `command_updated`      | `admin_commands` INSERT/UPDATE |
| `bot_instances` | `bot_instance_changed` | `bot_instances` INSERT/UPDATE  |

---

## 7 — Verification Flow

```typescript
// 1. Resolve group contract (RPC first, direct-table fallback)
const contract = await getGroupVerificationContract(db, groupId);
// → { groupId, enabled, joinRequestPreferred, channels[] }

// 2. Join-request path: verifyMembership() → approve/decline + log

// 3. Group member join:
//    mute user → if join_request_preferred + approval marker: reseed cache + skip
//    else: send prompt with Join buttons + verify:{groupId} callback

// 4. Verify button (callback_query):
const result = await verifyMembership(api, db, cache, groupId, userId, log, {
  bypassNegativeCache: true, // explicit clicks must not trust stale "0"
});
// success → unmuteUser + seed verified cache + logVerification("verified")
// failure → logVerification("restricted") + alert missing channels

// 5. Channel leave:
//    invalidate verified cache → seed enforcement_block (5min TTL)
//    do NOT mute or prompt immediately; message path is the enforcement point

// 6. Group message path (enforcement):
//    verified cache hit → allow
//    enforcement_block + member caches restored → clear block + allow
//    else → delete msg + mute + single deduped prompt (idempotency lock)

// Idempotency locks (Redis NX):
await acquireIdempotencyLock(cache, "verify", [groupId, userId]);
await acquireIdempotencyLock(cache, "join-request", [groupId, userId]);
await acquireIdempotencyLock(cache, "group-join", [groupId, userId]);
await acquireIdempotencyLock(cache, "message-enforce", [groupId, userId]);
```

---

## 8 — Cache Constants & Key Patterns

```typescript
MEMBER_CACHE_TTL = 300; // positive membership (5 min)
MEMBER_NEGATIVE_CACHE_TTL = 30; // negative membership (30 sec)
VERIFIED_CACHE_TTL = 3600; // verified set (1 hour)
AUTO_DELETE_DELAY = 30_000; // auto-delete bot messages (30s)

// Key patterns:
`member:${channelId}:${userId}` // chatMembers adapter
`verified:${groupId}:${userId}` // full verification pass
`enforcement_block:${groupId}:${userId}` // channel-leave flag
`verification_prompt:${groupId}:${userId}`; // active prompt tracking
```

---

## 9 — Multi-Bot Dashboard Flow

```typescript
// Dashboard startup:
const manager = new BotManager({ db, cache, logger, botFactory: createBotWithDeps });
await manager.initialize(); // fetch bot_instances → decrypt → start each
manager.startSyncLoop(); // 30s reconcile: start new, stop removed

// Per-bot startup (BotLifecycleManager.startBot):
createBotWithDeps(bot, deps); // wires all middleware + composers
syncBotCommands(bot.api, log); // set command menu scopes
run(bot, { runner: { fetch: { allowed_updates: ALLOWED_UPDATES } } }); // long-poll
startStatusWriter(db, botId, botInstanceId, log); // 30s heartbeat → bot_status
startMemberSync(bot.api, db, botId, log); // 15min subscriber count sync

// CommandWorker (processes admin_commands):
const commandWorker = new CommandWorker({ db, realtime, botManager, botId: 0, logger });
commandWorker.start(); // realtime subscription + 30s poll fallback

// BotLifecycleManager serializes start/stop/restart per botId
// (prevents registry gap that 30s sync loop could fill with a duplicate)
```

---

## 10 — Database Schema (Migration 028 — Canonical)

> **Source**: `insforge/migrations/028_fresh_insforge_rebuild.sql`

### Tables

| Table                 | Purpose                                 | Key Types                                     |
| --------------------- | --------------------------------------- | --------------------------------------------- |
| `dashboard_admins`    | Web dashboard user access list          | `user_id TEXT PK`                             |
| `owners`              | Bot owner Telegram IDs                  | `user_id BIGINT PK`                           |
| `bot_instances`       | Registered bots (encrypted tokens)      | `bot_id BIGINT UNIQUE`, `is_active BOOLEAN`   |
| `bot_status`          | Live bot heartbeat                      | `bot_id BIGINT UNIQUE`, `bot_instance_id`     |
| `protected_groups`    | Groups with enforcement                 | `group_id BIGINT PK`, FK → owners             |
| `enforced_channels`   | Required channel subscriptions          | `channel_id BIGINT PK`, `linked_groups_count` |
| `group_channel_links` | M:N group↔channel                       | FK cascade, `is_required BOOLEAN`             |
| `verification_log`    | Per-verification analytics              | `status: 'verified'\|'restricted'\|'error'`   |
| `api_call_log`        | Per-Telegram-API-call analytics         | `method`, `success`, `latency_ms`             |
| `admin_logs`          | Bot WARN+ forwarded to dashboard        | `level`, `message`, `module`                  |
| `admin_commands`      | Dashboard→Bot command queue             | `command_type`, `payload JSONB`, `status`     |
| `nezuko_secrets`      | Security vault (AES-256-GCM master key) | `key_name TEXT UNIQUE`, `key_value TEXT`      |

### Critical DB Rules

```sql
-- ⚠️ ALL Telegram IDs MUST be BIGINT (user_id, group_id, channel_id, bot_id)
-- Bot IDs exceed INT4 max: 8265490825 > 2^31

-- ⚠️ ALWAYS grant sequences after CREATE TABLE
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
-- Without this: every INSERT returns 401 Unauthorized via PostgREST

-- ⚠️ verification_log.status CHECK allows ONLY: 'verified' | 'restricted' | 'error'
-- 'failed' is NOT valid — causes silent 409 POST failure

-- ⚠️ Denormalized counters (linked_channels_count, linked_groups_count):
-- Always recalculate from group_channel_links rows — never increment/decrement
```

---

## 11 — Auth & Security Patterns (Web)

```typescript
// Auth model (Next.js dashboard):
// proxy.ts → InsforgeMiddleware (route protection)
// /login   → signInWithPassword | signInWithOAuth
// /api/auth → createAuthRouteHandlers
// On success → auto-upserts user into dashboard_admins via INSFORGE_SERVICE_KEY

// ⚠️ First login creates dashboard_admins record automatically
// Never allow self-INSERT through RLS

// Security guards:
if (devLogin && process.env.NODE_ENV !== "production") return NextResponse.next();
const BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;
if (!BASE_URL) throw new Error("required"); // no hardcoded fallback

// Open redirect prevention:
const redirectTo =
  rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/dashboard";

// Bot token management: ALWAYS via manage-bot edge function (server-side only)
// Web must call insforge.functions.invoke("manage-bot") — never write tokens directly
// Read-only dashboard view uses bot_instances_safe (without encrypted token column)
```

---

## 12 — Web Dashboard Patterns

```typescript
// InsForge SDK (web only):
import { insforge } from "@/lib/insforge";
const { data, error } = await insforge.db.getRecords("protected_groups", {
  filters: { enabled: "eq.true" },
});

// TanStack Query v5 (object syntax — not v4 function syntax):
const { data, isPending } = useQuery({
  queryKey: queryKeys.groups.list(),    // from @/lib/query-keys
  queryFn: () => groupsService.getGroups(),
  staleTime: STALE_TIMES.SHORT,
});

// Dev-bypass: never mount InsforgeProvider when NEXT_PUBLIC_DEV_LOGIN=true
// (causes /api/auth/refresh noise with no real session)
if (DEV_LOGIN) return <>{children}</>;
return <InsforgeProvider>{children}</InsforgeProvider>;

// Realtime: single RealtimeQueryCoordinatorProvider at root
// Route hooks (useRealtimeActivity, useRealtimeLogs, etc.) consume coordinator state
// Never create per-route socket subscriptions — causes disconnect on navigation

// Next.js 16 caching:
async function getCachedData() { "use cache"; cacheTag("my-tag"); }
// Invalidate: updateTag("my-tag") inside server action

// Recharts + heavy libs: dynamic import with ssr:false + Suspense skeleton
// Link prefetch={false} on non-critical dashboard routes (Vercel cost optimization)
```

---

## 13 — HTML Parse Mode (bot-side, canonical)

```typescript
// ⚠️ @grammyjs/parse-mode v2.2.1 does NOT export parseMode() or ParseModeFlavor
// Use a raw Transformer — already applied in bot-factory.ts

const htmlTransformer: Transformer = (prev, method, payload, signal) => {
  if (HTML_PARSE_MODE_METHODS.has(method) && payload) {
    const p = payload as Record<string, unknown>;
    if (!p["parse_mode"]) p["parse_mode"] = "HTML";
  }
  return prev(method, payload, signal);
};
// Covered methods: sendMessage, sendPhoto, editMessageText, editMessageCaption, etc.
```

---

## 14 — FK-Safe Owner Upsert

```typescript
// ⚠️ protected_groups.owner_id FK → owners.user_id
// Always call upsertOwner() BEFORE createGroup()

await upsertOwner(db, ownerId); // check-then-insert
await createGroup(db, groupId, ownerId); // safe — FK exists
```

---

## 15 — Test Patterns (Bun built-in runner)

```typescript
// Tests live at: apps/grammy/tests/ (post migration 2026-03-16)
bun run test tests/

const { bot, apiCalls } = createTestBot(); // from tests/helpers/test-bot.ts
bot.use(contextEnricher(deps));
await bot.handleUpdate(createMessageUpdate({ text: "/protect @channel" }));
expect(apiCalls.find((c) => c.method === "sendMessage")).toBeDefined();

const deps = {
  db: createMockDb(), // tests/helpers/mock-deps.ts
  cache: createMockCache(),
  botId: 12345678,
  logger: createMockLogger(),
};
// mock.mockResolvedValue([...]) — bun uses jest-compatible mock API
```

---

## 16 — DB Log Transport & API Telemetry

```typescript
// pino → admin_logs (WARN+ only, fire-and-forget, never propagates)
const effectiveLogger = db
  ? createLogger(config.logLevel, [createDbLogDestination(db, null)])
  : logger;
// botId=null in manager-level logger (avoids FK violation with botId=0 sentinel)

// API telemetry → api_call_log (all methods except getUpdates)
// bot_id=null for standalone/sentinel bots (botId > 0 check before logging)
```

---

## 17 — Sequentialize Key Rules

```typescript
// User traffic: per (chatId:userId) — avoids serializing unrelated users
getSequentializeKey(ctx) => `${chatId}:${userId}`;

// Commands + membership updates: per chatId
getSequentializeKey(ctx) => `${chatId}`;
```

---

_Last Updated: 2026-03-16 (Phase 136 — full rewrite; accurate against codebase)_
