# System Patterns: Architecture & Implementation

> **Active Runtime**: `apps/grammy/` (TypeScript + grammY v1.41.1)
> **Last Updated**: 2026-03-11 (Phase 126)

---

### 17 — Next.js 16 Optimization Patterns (Phase 126)

#### 17.1 — Heavy Library Code-Splitting

All visualization components (e.g., Recharts) must be dynamically imported with `ssr: false` and a loading skeleton to reduce entry bundle size and prevent hydration mismatch.

```tsx
const BarChart = dynamic(() => import("./bar-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[200px]" />,
});
```

#### 17.2 — Navigation Suspense Boundaries

Components using `useSearchParams()` or other client-side navigation hooks must be wrapped in `<Suspense>` to avoid Next.js "Bailout to client-side rendering" rules.

```tsx
export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
```

#### 17.3 — React Compiler State Safety

Avoid `try/finally` for state updates (e.g., `setIsLoading(false)`) as the compiler can sometimes struggle with closure tracking in complex `finally` blocks. Prefer explicit updates in `try` and `catch`.

```tsx
// ✅ Preferred
try {
  setIsLoading(true);
  await action();
  setIsLoading(false);
} catch (err) {
  setIsLoading(false);
  handleError(err);
}
```

---

## Architecture Overview

Nezuko is a **2-tier platform** with zero custom API server.
Bot and web both talk directly to InsForge REST / SDK.

```
┌──────────────────────────┐    ┌─────────────────────────────────────────┐
│  Web Dashboard (Next.js) │───►│  @insforge/sdk (TypeScript)             │
└──────────────────────────┘    └───────────────────┬─────────────────────┘
                                                    │ HTTPS
┌──────────────────────────┐    ┌───────────────────▼─────────────────────┐
│  grammY Bot (TypeScript) │───►│  InsForge BaaS                          │
│  InsForgeClient (fetch)  │    │  ┌────────────┐  ┌────────────────────┐ │
│  InsForgeRealtimeClient  │◄───│  │ PostgreSQL │  │ Realtime (WS)      │ │
│  (socket.io-client)      │    │  └─────┬──────┘  └────────────────────┘ │
└──────────────────────────┘    │        │ DB Triggers (5 channels)        │
                                │  ┌─────▼──────┐  ┌────────────────────┐ │
                                │  │  Storage   │  │ Edge Functions     │ │
                                │  └────────────┘  └────────────────────┘ │
                                └─────────────────────────────────────────┘
```

---

## grammY Bot Source Map

```
apps/grammy/src/
├── main.ts               # Entry point: runStandaloneMode() + runDashboardMode()
├── config.ts             # Zod v4 soft validation — all fields optional at schema level
├── types.ts              # NezukoContext (HydrateFlavor<ConversationFlavor<Context & NezukoContextFlavor & ChatMembersFlavor>>) + BotDeps
├── core/
│   ├── bot-factory.ts    # createBot() + createBotWithDeps() + apiLogTransformer
│   ├── bot-commands.ts   # syncBotCommands() — private/group/group-admin menu scopes
│   ├── insforge-client.ts# InsForgeClient (native fetch REST — getRecords/postRecords/patchRecords/deleteRecords/rpc)
│   ├── realtime-client.ts# InsForgeRealtimeClient (socket.io — subscribes to 5 channels)
│   ├── cache.ts          # CacheClient wrapping ioredis — graceful degradation + bulk invalidation helpers
│   ├── encryption.ts     # AES-256-GCM token encrypt/decrypt + getMasterKey() from vault
│   ├── shutdown.ts       # setupShutdown() — SIGINT/SIGTERM handler
│   ├── db-log-transport.ts # pino DestinationStream → admin_logs (WARN+ forwarding)
│   └── constants.ts      # All timing, channel, cache prefix, allowed_updates constants
├── middleware/
│   ├── sequentialize.ts  # Per-chat sequentialize (MUST be first middleware)
│   ├── hydrate.ts        # hydrate() install helper
│   ├── context-enricher.ts# Injects db, cache, botId, log into ctx
│   ├── admin-guard.ts    # Must be admin — replies on fail
│   ├── group-only.ts     # Must be in group/supergroup
│   └── permission-check.ts# Bot must have admin rights in group — replies on 403
├── composers/
│   ├── admin.ts          # /protect, /unprotect, /settings (→ settingsMenu), /status
│   ├── channels.ts       # /channels, /verify, /stats
│   ├── events.ts         # chat_member + chat_join_request handlers
│   ├── verify.ts         # callback_query verification handler
│   ├── fallback.ts       # Catch-all (always last)
│   ├── migration.ts      # my_chat_member handler — group migration
│   └── setup.ts          # /setup guided wizard (@grammyjs/conversations; Golden Rule compliant)
├── menus/
│   ├── settings.menu.ts  # Group admin /settings menu — dynamic channel range, Refresh, Close
│   └── private.menu.ts   # Private DM menu — 4 sub-menus (Commands/How/About/QuickStart) + Back nav
├── services/
│   ├── verification.ts   # verifyMembership() — multi-channel AND logic + explicit verify/message recheck bypass, preloaded channels, parallel checks
│   ├── verification-prompt.ts # Active prompt tracking + safe prompt deletion helpers
│   ├── idempotency.ts    # acquireIdempotencyLock() — short-lived Redis NX guards
│   ├── protection.ts     # muteUser(), unmuteUser(), kickUser()
│   ├── channel-linker.ts # linkChannel(), unlinkChannel()
│   ├── batch-verification.ts # batchVerify() — Map<userId, result>
│   ├── member-sync.ts    # startMemberSync() — 15min interval
│   ├── status-writer.ts  # startStatusWriter() — 30s heartbeat
│   └── command-worker.ts # CommandWorker — realtime + 30s poll fallback
├── multi-bot/
│   ├── bot-manager.ts    # BotManager — initialize(), startSyncLoop(), handleCommand(), shutdown()
│   ├── bot-lifecycle.ts  # BotLifecycleManager — startBot(), stopBot(), restartBot()
│   └── bot-registry.ts   # BotRegistry — Map<botId, BotInstance>
└── database/
    ├── types.ts          # ProtectedGroup, EnforcedChannel, GroupChannelLink, VerificationLog, BotStatus
    ├── group-contract.repo.ts # getGroupVerificationContract() — RPC first, direct-table fallback
    ├── owner.repo.ts     # upsertOwner() — FK-safe owner upsert before protected_groups INSERT
    ├── group.repo.ts     # getGroupChannels(), setGroupActive(), createProtectedGroup()
    ├── channel.repo.ts   # updateSubscriberCount()
    ├── link.repo.ts      # linkGroupChannel(), unlinkGroupChannel()
    ├── verification.repo.ts # logVerification() — status: 'verified'|'restricted'|'error' only
    └── bot-status.repo.ts# upsertBotStatus() — PATCH-then-POST pattern
└── utils/
    ├── logger.ts         # createLogger() — pino JSON logger with child() support
    ├── messages.ts       # All user-facing HTML message strings (constants)
    ├── auto-delete.ts    # scheduleDelete() — setTimeout → msg.delete()
    ├── health.ts         # startHealthServer() — /health HTTP endpoint
    ├── keep-alive.ts     # startKeepAlive() — self-ping loop for cloud idle-timeout prevention
    ├── standalone-watchdog.ts # startStandaloneWatchdog() — task+poll supervision for standalone mode (created, not yet wired)
    └── process-lock.ts   # acquireProcessLock() — prevents duplicate local bot starts
```

---

## Key Implementation Patterns

### 1 — Startup: Mode-Aware Entry Point

```typescript
// config.ts — Zod v4, all fields optional; empty string → undefined
const config = loadConfig(); // never throws for missing creds

// main.ts — mode detection first
if (config.dashboardMode) {
  if (!config.dbAvailable) process.exit(1); // fail fast with clear message
  await runDashboardMode(config, logger);
} else {
  if (!config.botToken) process.exit(1);
  await runStandaloneMode(config, logger); // degrades gracefully without InsForge
}

// Phase 107 — startup singleton protection
const releaseLock = await acquireProcessLock(
  config.dashboardMode ? "dashboard-mode" : `standalone-${config.botId}`,
  logger
);
try {
  // run selected mode...
} finally {
  releaseLock();
}
```

### 2 — Bot Wiring: Middleware Order (CRITICAL)

```typescript
// ── API Transformers (outgoing) ──────────────────────────────
bot.api.config.use(autoRetry({ maxRetryAttempts: 3, maxDelaySeconds: 60 }));
bot.api.config.use(htmlTransformer);    // custom Transformer — NOT parseMode()
bot.api.config.use(apiLogTransformer);  // Phase 105: logs method/latency/success to api_call_log

// ── Middleware (upstream → downstream) ───────────────────────
bot.use(sequentializeMiddleware);       // MUST be position 1
bot.use(hydrate());                     // adds .editText(), .delete() on API results
bot.use(chatMembers(cache.chatMembersAdapter));
bot.use(contextEnricher(deps));         // injects db, cache, botId, log into ctx

// ── Core commands (inline — not via singleton composer) ───────
wireCoreCommands(bot, deps);            // /start, /help

// ── Composers with real protected mounting ────────────────────
// Phase 106 — each composer must be mounted inside a live boundary.
bot.use(adminBoundary);
bot.use(channelsBoundary);
bot.use(migrationBoundary);
bot.use(eventsBoundary);
bot.use(verifyBoundary);
bot.use(fallbackComposer);              // ALWAYS last, no boundary

// ── Global catch ─────────────────────────────────────────────
bot.catch(async (err) => { ... });
```

### 3 — HTML Parse Mode (Phase 99 — Canonical)

> ⚠️ `@grammyjs/parse-mode` v2.2.1 does NOT export `parseMode()` or `ParseModeFlavor`. Use a raw `Transformer`:

```typescript
import type { Transformer } from "grammy";

const HTML_PARSE_MODE_METHODS = new Set([
  "sendMessage",
  "sendPhoto",
  "sendVideo",
  "sendDocument",
  "sendAnimation",
  "sendAudio",
  "sendVoice",
  "editMessageText",
  "editMessageCaption",
  "sendPoll",
  "copyMessage",
]);

const htmlTransformer: Transformer = (prev, method, payload, signal) => {
  if (HTML_PARSE_MODE_METHODS.has(method) && payload !== null && payload !== undefined) {
    const p = payload as Record<string, unknown>;
    if (!p["parse_mode"]) p["parse_mode"] = "HTML";
  }
  return prev(method, payload, signal);
};

// Applied in both createBot() and createBotWithDeps()
bot.api.config.use(htmlTransformer);
```

### 4 — InsForge REST Client (TypeScript)

```typescript
// All DB access goes through InsForgeClient — never raw PostgreSQL
const client = new InsForgeClient({
  baseUrl,
  anonKey,
  logger,
  requestTimeoutMs: config.insforgeRequestTimeoutMs,
});

await client.getRecords<T>("table", { column: "eq.value" });
await client.postRecords<T>("table", [{ col: "val" }]);
await client.patchRecords<T>("table", { col: "eq.val" }, { col: "new" });
await client.deleteRecords("table", { col: "eq.val" });
await client.getSecret("master_key"); // reads from nezuko_secrets vault

// Phase 107 — all REST calls use AbortController timeouts so
// slow InsForge/network failures do not stall command handling indefinitely.

// ❌ Any import of @insforge/sdk in the grammy bot — use InsForgeClient instead
```

### 5 — UPSERT Pattern (PATCH-then-POST)

```typescript
// ✅ Correct: PATCH first, POST only if no row matched
const patched = await client.patchRecords<T>("bot_status", { bot_id: `eq.${botId}` }, data);
if (patched.length === 0) {
  await client.postRecords<T>("bot_status", [{ bot_id: botId, ...data }]);
}

// ❌ Wrong: Prefer: resolution=merge-duplicates fails on multi-UNIQUE tables
// That header causes 409 when table has multiple UNIQUE columns
```

### 6 — Multi-Bot Dashboard Flow

```typescript
// Dashboard startup sequence
const manager = new BotManager({ db, cache, logger, botFactory: createBotWithDeps });

await manager.initialize(); // fetches bot_instances; decrypts tokens; starts each bot
manager.startSyncLoop(); // 30s reconciliation: starts new bots, stops removed ones

const commandWorker = new CommandWorker({ db, realtime, botManager: manager, botId: 0, logger });
commandWorker.start(); // listens on admin_commands channel; falls back to poll

// Per-bot startup (inside BotLifecycleManager.startBot)
createBotWithDeps(bot, deps); // wires all middleware + composers
syncBotCommands(bot.api, log); // set command menu scopes
run(bot, { runner: { fetch: { allowed_updates: [...ALLOWED_UPDATES] } } }); // long-poll
startStatusWriter(db, botId, botInstanceId, log); // 30s DB heartbeat
startMemberSync(bot.api, db, botId, log); // 15min count sync
```

### 7 — Realtime Channel Contract

Shared between grammY bot (socket.io-client) and web (InsForge SDK).
**Never rename channels without updating both sides.**

| Channel         | Event                  | Source Trigger                 |
| --------------- | ---------------------- | ------------------------------ |
| `dashboard`     | `verification`         | `verification_log` INSERT      |
| `bot_status`    | `status_changed`       | `bot_status` INSERT/UPDATE     |
| `logs`          | `new_log`              | `admin_logs` INSERT            |
| `commands`      | `command_updated`      | `admin_commands` INSERT/UPDATE |
| `bot_instances` | `bot_instance_changed` | `bot_instances` INSERT/UPDATE  |

### 8 — Verification Flow

```typescript
// 1. Resolve the group verification contract
const contract = await getGroupVerificationContract(db, groupId);
// RPC first: get_group_verification_contract(p_group_id)
// Fallback: protected_groups + group_channel_links + enforced_channels

// 2. Join-request path
// chat_join_request -> verifyMembership()
// success   -> approve request + seed verified/join_request_approved cache + log verified
// failure   -> decline request + DM missing channels + log restricted

// 3. Join path
// new_chat_members -> mute user
// if join_request_preferred and approval marker exists:
//   seed verified cache and skip second mute/prompt cycle
// else:
//   send verification prompt with Join buttons + verify:{groupId} callback

// 4. Verify button path
const result = await verifyMembership(api, db, cache, groupId, userId, log, {
  bypassNegativeCache: true,
});
if (result.success) {
  await unmuteUser(api, groupId, userId);
  await cache.set(`verified:${groupId}:${userId}`, "1", "EX", VERIFIED_CACHE_TTL);
  await logVerification(db, { status: "verified", ... });
} else {
  await logVerification(db, { status: "restricted", ... });
  await ctx.answerCallbackQuery({ show_alert: true, text: VERIFY_MISSING_CHANNELS(...) });
}

// Explicit verify clicks are latency-sensitive:
// - debounce is scoped by (groupId, userId)
// - verify lock is released when the callback completes
// - fresh Telegram membership checks retry briefly to absorb rejoin propagation lag

// 5. Channel leave path
// required-channel chat_member event -> write member cache
// if left/kicked:
//   invalidate verified cache for every linked group
//   seed short-lived enforcement_block cache
//   silently re-mute linked groups immediately
//   do not prompt linked groups immediately
//   rely on message-path enforcement for visible prompting

// 6. Group message path
// if verified cache hit -> allow
// else if enforcement_block is set and all member caches are positive:
//   clear block + reseed verified cache + allow
// else if latest DB verification is still fresh -> reseed cache and allow
// else:
//   re-run verifyMembership(..., { bypassNegativeCache: true, channels })
//   success -> reseed cache and allow
//   failure -> delete message + mute + log restricted + send one deduped prompt
```

### 8.5 — Delayed Prompt Dedupe (Phase 111)

```typescript
// Visible verification prompting is now message-driven for users who lose
// required-channel membership after entering the group.

const promptKey = `verification_prompt:${groupId}:${userId}`;

// Channel leave path:
//   invalidate verified cache only
//   do not send a prompt

// Group message path:
//   delete blocked message first
//   restrict user again
//   if no active prompt key exists:
//     send verification prompt
//     store prompt message id in Redis

// Verification success / group leave:
//   delete active prompt if present
//   clear prompt key
```

### 8.6 — Burst Message Cleanup While Enforcement Is In Flight (Phase 112)

```typescript
// The first blocked message may hold the short-lived enforcement lock while
// verifyMembership() and prompt work run. Later blocked messages from the same
// user must still be deleted even if they lose the lock.

const lockAcquired = await acquireIdempotencyLock(cache, "message-enforce", [groupId, userId]);

if (!lockAcquired) {
  await ctx.deleteMessage().catch(() => {});
  return;
}

// Only the lock winner performs verification + prompt work.
```

### 8.7 — Fast Enforcement Block State (Phase 113)

```typescript
const blockKey = `enforcement_block:${groupId}:${userId}`;

// Required-channel leave:
await cache.set(blockKey, "1", "EX", 300);
// do not mute or prompt yet; the next blocked group message is the
// visible enforcement point

// Group message path:
//   if blockKey exists and all member caches are now "1":
//     clear block + reseed verified cache + allow
//   otherwise:
//     skip the latest-verification DB read and verify using preloaded channels
```

### 8.1 — Membership Cache Rules (Phase 108)

```typescript
MEMBER_CACHE_TTL = 300; // positive membership cache
MEMBER_NEGATIVE_CACHE_TTL = 30; // negative membership cache

// Explicit verify clicks must not trust stale cached "0" results.
await verifyMembership(api, db, cache, groupId, userId, log, {
  bypassNegativeCache: true,
});

// If Telegram still briefly reports "left" right after a real rejoin,
// explicit verify performs a couple of short fresh retries before failing.
```

### 8.2 — Sequentialization Rules (Phase 108)

```typescript
// Busy groups should not serialize unrelated users behind one queue key.
getSequentializeKey(ctx) => `${chatId}:${userId}`;  // ordinary user traffic
getSequentializeKey(ctx) => `${chatId}`;            // slash commands + membership updates
```

### 8.3 — Verification Contract + Idempotency

```typescript
// Contract read prefers RPC but no longer hard-depends on it in production.
const contract = await getGroupVerificationContract(db, groupId);
// returns: { groupId, enabled, joinRequestPreferred, channels }

// Duplicate callback/join-request work is suppressed with Redis NX locks
await acquireIdempotencyLock(cache, "verify", [groupId, userId]);
await acquireIdempotencyLock(cache, "join-request", [groupId, userId]);
await acquireIdempotencyLock(cache, "group-join", [groupId, userId]);
await acquireIdempotencyLock(cache, "message-enforce", [groupId, userId]);
```

### 8.9 — Managed Bot Recovery Must Be Serialized Per Bot ID

```typescript
// Runner watchdog/task failure recovery must not remove the bot from the
// registry and then start a replacement outside the lifecycle lock, otherwise
// the 30s sync loop can observe the gap and start the same bot a second time.

await lifecycle.restartBot(botId, config);

// BotLifecycleManager now serializes start/stop/restart per bot id.
// stopRunner() also swallows rejected runner.task() promises so cleanup still
// completes after getUpdates 409 conflicts or failed runner tasks.
```

### 8.4 — Channel-Side Invalidation + Message Recheck (Phase 110)

```typescript
// Required-channel chat_member updates refresh membership cache
if (ctx.chat.type === "channel") {
  await cache.set(`member:${channelId}:${userId}`, isMember ? "1" : "0", "EX", ttl);
  if (!isMember) {
    await cache.delMany?.([`verified:${groupId}:${userId}`, ...otherLinkedGroupKeys]);
  }
}

// Missed channel-leave updates are recovered on the group message path.
const latest = await getLatestVerificationState(db, groupId, userId);
const recentlyVerified =
  latest?.status === "verified" &&
  Date.now() - Date.parse(latest.timestamp) <= VERIFIED_RECHECK_INTERVAL_MS;

if (!recentlyVerified) {
  const result = await verifyMembership(api, db, cache, groupId, userId, log, {
    bypassNegativeCache: true,
  });
  if (!result.success) {
    await muteUser(api, groupId, userId);
    await logVerification(db, { status: "restricted", ... });
    await sendVerificationPrompt(ctx, groupId, userName, channels);
  }
}
```

### 9 — Test Patterns (Vitest v4)

```typescript
// ✅ Test bot setup (from helpers/test-bot.ts)
const { bot, apiCalls } = createTestBot();
bot.use(contextEnricher(deps));
bot.use(someComposer);
await bot.handleUpdate(createMessageUpdate({ text: "/start" }));
expect(apiCalls.find(c => c.method === "sendMessage")).toBeDefined();

// ✅ Mock deps
const deps = {
  db: createMockDb(),
  cache: createMockCache(),
  botId: 12345678,
  logger: createMockLogger(),
};
vi.mocked(deps.db.getRecords).mockResolvedValue([...]);

// ✅ Commands auto-get bot_command entity when text starts with /
const update = createMessageUpdate({ text: "/protect @channel" });

// ✅ vitest.config.ts — testTimeout (not timeout) in Vitest v4
test: { testTimeout: 10_000, include: [...] }
```

### 10 — Quality Gate Commands

```bash
cd apps/grammy
bun run type-check    # 0 errors REQUIRED
bun run lint          # 0 warnings REQUIRED (--max-warnings 0)
bun run format        # prettier src/ ../../tests/grammy --write
bun run format:check  # All matched files use Prettier code style! REQUIRED
bun run test          # 145/145 REQUIRED — never decrease without justification
bun run build         # dist/ produced with 0 errors REQUIRED

cd apps/web
bun run type-check    # 0 errors REQUIRED
bun run lint          # 0 warnings REQUIRED
bun x prettier src --write && bun x prettier src --check  # All clean REQUIRED
bun run build         # Next.js build 0 errors REQUIRED
```

### 11 — DB Log Transport (Phase 105)

```typescript
// core/db-log-transport.ts — pino DestinationStream → admin_logs
// WARN+ only (levelNum >= 40). Fire-and-forget — failures never propagate.
export function createDbLogDestination(
  db: InsForgeClient, botId: number | null
): DestinationStream { ... }

// Wired in main.ts (both modes) — after InsForge client is ready:
const effectiveLogger = db
  ? createLogger(config.logLevel, [createDbLogDestination(db, null)])
  : logger;

// logger.ts now supports pino.multistream:
export function createLogger(level: string, extras: DestinationStream[] = []): Logger
// extras=[] → fast path (no multistream overhead)
// extras=[dbTransport] → stdout + admin_logs
```

### 12 — API Call Telemetry (Phase 105)

```typescript
// bot-factory.ts — added after htmlTransformer
const API_LOG_SKIP = new Set(["getUpdates"]); // exclude polling calls

const apiLogTransformer: Transformer = async (prev, method, payload, signal) => {
  if (API_LOG_SKIP.has(method)) return prev(method, payload, signal);
  const start = performance.now();
  const botIdForLog: number | null = deps.botId > 0 ? deps.botId : null; // FK safety
  try {
    const result = await prev(method, payload, signal);
    db.postRecords("api_call_log", [
      { bot_id: botIdForLog, method, success: true, latency_ms },
    ]).catch(() => {});
    return result;
  } catch (err) {
    db.postRecords("api_call_log", [
      { bot_id: botIdForLog, method, success: false, latency_ms, error_type },
    ]).catch(() => {});
    throw err;
  }
};
```

### 13 — Verification Status Constraint (Phase 105)

```typescript
// ⚠️ DB CHECK on verification_log.status allows ONLY:
//   'verified' | 'restricted' | 'error'
// 'failed' is NOT allowed — it causes a silent 409 POST failure.
// In verify.ts: use 'restricted' for non-member checks, 'error' for unexpected exceptions.
export interface LogVerificationData {
  status: "verified" | "restricted" | "error"; // NOT "failed"
}
```

### 14 — Realtime Hook: Avoiding Reconnect Loop (Phase 105)

```typescript
// ⚠️ BUG-13 pattern — DO NOT put connectionState in the auto-connect useEffect deps.
// It causes: connect() → state changes → cleanup runs → disconnect() → repeat.

// ✅ CORRECT: Mirror state into a ref; read ref inside effect:
const connectionStateRef = useRef<ConnectionState>("disconnected");
useEffect(() => {
  connectionStateRef.current = connectionState;
}, [connectionState]);

useEffect(() => {
  const timer = setTimeout(() => {
    if (connectionStateRef.current !== "connected" && connectionStateRef.current !== "connecting") {
      connect();
    }
  }, 0);
  return () => clearTimeout(timer); // DO NOT call disconnect() here
}, [autoConnect, isSignedIn, connect, retryAttempt]); // connectionState NOT in deps

// ✅ Unmount cleanup — separate effect using disconnectRef:
const disconnectRef = useRef(disconnect);
useEffect(() => {
  disconnectRef.current = disconnect;
}, [disconnect]);
useEffect(() => () => disconnectRef.current(), []); // unmount only
```

### 16 — Dashboard Realtime Coordinator (Phase 113)

```tsx
<QueryClientProvider client={queryClient}>
  <RealtimeQueryCoordinatorProvider>{children}</RealtimeQueryCoordinatorProvider>
</QueryClientProvider>

// The coordinator subscribes once, patches cache for logs/activity/bots,
// and centrally invalidates aggregate dashboard/analytics/chart queries.
// useRealtimeChart() now consumes connection state from the coordinator
// instead of mounting its own websocket subscription per widget.
```

### 16.1 — Route-Level Realtime Hooks Must Reuse Coordinator State

```tsx
// After the coordinator exists, route/page convenience hooks must not become
// effective owners of the shared socket lifecycle during navigation.
// Wrappers such as useRealtimeActivity/useRealtimeLogs/useDashboardRealtime/
// useBotsRealtime/useRealtime should return coordinator state when available,
// and only fall back to useInsForgeRealtime when the coordinator is absent.

// This avoids the regression where navigating between dashboard pages could
// release channels or disconnect the shared socket, causing the UI to show
// polling until a hard reload restored live updates.
```

### 8.8 — First Blocked Message After Channel Leave Must Stay Deterministic

```typescript
// required-channel leave remains silent and seeds enforcement_block.
// On the first actually blocked group message:
//   if enforcement_block exists and cached member state is fully restored:
//     allow without deleting or prompting
//   else:
//     re-run verification
//     if still failing -> delete message + restrict again + send exactly one prompt
//
// This keeps the UX quiet on channel leave while ensuring the first blocked
// message is the visible enforcement flow for still-unverified users.
```

### 15 — FK-Safe Owner Upsert (Phase 105)

```typescript
// ⚠️ protected_groups.owner_id FK → owners.user_id.
// If owners table is empty, any createGroup() call fails with 409 FK violation.
// MUST call upsertOwner() first in channel-linker.ts:

// owner.repo.ts
export async function upsertOwner(db: InsForgeClient, ownerId: number): Promise<void> {
  const existing = await db.getRecords<Owner>("owners", { user_id: `eq.${ownerId}` });
  if (existing.length === 0) {
    await db.postRecords<Owner>("owners", [{ user_id: ownerId }]);
  }
}

// channel-linker.ts — Step 7 (BEFORE createGroup):
await upsertOwner(db, ownerId); // ✅ always before createGroup()
await createGroup(db, groupId, ownerId, groupTitle, memberCount);
```

---

## Database Schema (Migration 023 — Canonical)

> **Canonical file**: `insforge/migrations/023_fresh_grammy_schema.sql`
> Migrations 001–022 are historical. `023` is the single source of truth for the grammY era.

### Core Tables

| Table                 | Purpose                                    | Key Types                                                                      |
| --------------------- | ------------------------------------------ | ------------------------------------------------------------------------------ |
| `owners`              | Bot owner Telegram user IDs                | `user_id BIGINT PK`                                                            |
| `bot_instances`       | Registered bots (`token_encrypted` column) | `bot_id BIGINT UNIQUE`, `is_active + is_deleted BOOLEAN`                       |
| `protected_groups`    | Groups with verification enforcement       | `group_id BIGINT PK`, `params JSONB`, `linked_channels_count INT`, FK → owners |
| `enforced_channels`   | Required channel subscriptions             | `channel_id BIGINT PK`, `subscriber_count INT`, `linked_groups_count INT`      |
| `group_channel_links` | M:N group↔channel relationships            | FK cascade both ways, `is_required BOOLEAN`                                    |

### Analytics Tables

| Table              | Purpose                              | Key Columns                                                                        |
| ------------------ | ------------------------------------ | ---------------------------------------------------------------------------------- |
| `verification_log` | Per-verification analytics           | `status VARCHAR(20)`, `latency_ms INT`, `cached BOOLEAN`, `error_type VARCHAR(50)` |
| `api_call_log`     | Per-Telegram-API-call analytics      | `method VARCHAR(50)`, `success BOOLEAN`, `latency_ms INT`                          |
| `admin_logs`       | Bot log lines forwarded to dashboard | `level, logger, message, module, function, line_no, path`                          |

### Runtime Tables

| Table            | Purpose                         | Key Columns                                                       |
| ---------------- | ------------------------------- | ----------------------------------------------------------------- |
| `bot_status`     | Live bot heartbeat              | **`bot_id BIGINT UNIQUE`, `bot_instance_id BIGINT UNIQUE`**       |
| `admin_commands` | Dashboard→Bot command queue     | `status VARCHAR(20)`, `command_type VARCHAR(50)`, `payload JSONB` |
| `nezuko_secrets` | Security vault (AES master key) | `key_name TEXT UNIQUE`, `key_value TEXT`                          |

### ⚠️ Critical Type Rules

- **All Telegram IDs** MUST be `BIGINT` — `user_id`, `group_id`, `channel_id`, `bot_id`, `bot_instance_id`
- Telegram Bot IDs regularly exceed INT4 max (2,147,483,647). `8265490825 > 2^31`.
- Any `INTEGER` for a Telegram ID silently fails on UPSERT via PostgREST.

### ⚠️ Critical Grant Rule (Phase 66)

```sql
-- ALWAYS run after CREATE TABLE with SERIAL/auto-increment
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

Without sequence `USAGE`, every INSERT by the `anon` role returns **401 Unauthorized** via PostgREST.

### ⚠️ Denormalized Counters

`linked_channels_count` on `protected_groups` and `linked_groups_count` on `enforced_channels`
are maintained by bot code — always **recalculate from actual rows**, never increment/decrement.

---

## Web Dashboard Patterns

### InsForge SDK Usage

```typescript
// ✅ Correct: Always via the shared insforge client
import { insforge } from "@/lib/insforge";

const { data, error } = await insforge.db.getRecords("protected_groups", {
  filters: { enabled: "eq.true" },
});
```

### TanStack Query v5 Patterns

```typescript
// ✅ Correct: Object syntax (v5 — not v4 function syntax)
const { data, isPending, error } = useQuery({
  queryKey: queryKeys.groups.list(),
  queryFn: () => groupsService.getGroups(),
  refetchInterval: REFETCH_INTERVALS.STANDARD,  // named constant, not magic number
  staleTime: STALE_TIMES.SHORT,
});

// ✅ Correct: Optimistic mutation with rollback
return useMutation({
  mutationFn: (id: number) => deleteItem(id),
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.items.list() });
    const previous = queryClient.getQueryData(queryKeys.items.list());
    queryClient.setQueryData(queryKeys.items.list(), (old) => /* optimistic remove */);
    return { previous };
  },
  onError: (_error, _id, context) => {
    if (context?.previous) queryClient.setQueryData(queryKeys.items.list(), context.previous);
  },
  onSettled: () => { queryClient.invalidateQueries({ queryKey: queryKeys.items.all }); },
});

// ❌ Wrong: refetchIntervalInBackground: true (removed Phase 77 — wastes 25+ req/min)
// ❌ Wrong: keepPreviousData (v4 API — not available in v5)
// ❌ Wrong: isLoading (v5 uses isPending for queries without cached data)
```

### Query Keys Pattern

```typescript
// ✅ Correct: queryKeys factory in apps/web/src/lib/query-keys.ts
import { queryKeys, REFETCH_INTERVALS, STALE_TIMES } from "@/lib/query-keys";

queryKeys.groups.list(); // ["groups", "list"]
queryKeys.groups.detail(id); // ["groups", "detail", id]
```

### Form Hardening Pattern (Zod + Server Actions)

```typescript
// ✅ Action
"use server";
export async function updateData(data: SchemaType) {
  const validated = schema.safeParse(data);
  if (!validated.success) return { error: "Validation failed" };
  // ... secure DB operation via insforge SDK ...
}
```

### Shared Components

```tsx
import { DataTable } from "@/components/shared/data-table";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { PageErrorState } from "@/components/shared/page-error-state";
import { ChartErrorBoundary } from "@/components/charts/chart-error-boundary";

<DataTable columns={columns} data={data} filterColumn="name" filterPlaceholder="Search..." />;
```

### Security Patterns (Proxy / Auth)

```typescript
// ✅ Dev bypass guarded by NODE_ENV
if ((devLogin || useMock) && process.env.NODE_ENV !== "production") {
  return NextResponse.next();
}

// ✅ No hardcoded fallback — throw if env var missing
const BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;
if (!BASE_URL) throw new Error("NEXT_PUBLIC_INSFORGE_BASE_URL is required");

// ✅ Open redirect prevention
// ✅ Open redirect prevention
const redirectTo =
  rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/dashboard";
```

### 11 — Next.js 16 Caching & PPR Patterns (Phase 125)

The dashboard leverages Next.js 16 Cache Components and Partial Prerendering (PPR) for high performance.

#### `'use cache'` Directive

Used for expensive or sensitive data fetching (e.g., Master Key). Unlike `unstable_cache`, it is native to the Next.js 16 runtime.

```typescript
async function getCachedData() {
  "use cache";
  cacheTag("my-tag");
  // ... fetch data
}
```

#### Atomic Invalidation with `updateTag`

Used to invalidate cache immediately within a server action, ensuring the UI is consistent without background revalidation lag.

```typescript
export async function updateAction() {
  // ... save data
  updateTag("my-tag"); // Instant invalidation
  revalidatePath("/dashboard/settings");
}
```

#### Partial Prerendering (PPR)

The Root Layout and page shells are static and prerendered. Dynamic components (Auth providers, Vault sections) are wrapped in `Suspense`.

```tsx
// Root Layout
<Suspense>
  <DynamicAuthProviderWrapper>
    {children}
  </DynamicAuthProviderWrapper>
</Suspense>

// Settings Page
<SettingsPageContent>
  <Suspense fallback={<Skeleton />}>
    <VaultSection />
  </Suspense>
</SettingsPageContent>
```

#### Cost Optimization (Prefetching)

To prevent excessive Vercel compute usage, `Link` prefetching is disabled for non-essential dashboard routes.

```tsx
<Link href="/dashboard/logs" prefetch={false}>
  View Logs
</Link>
```

### RPC Envelope Helper

```tsx
import { unwrapEnvelopeSeries, extractEnvelopeMetadata } from "@/lib/utils/rpc-helpers";

const series = unwrapEnvelopeSeries<TrendPoint>(data);
const { period, summary } = extractEnvelopeMetadata(data);
```

---

_Last Updated: 2026-03-11 (Phase 126 — PTB bot fully removed; grammY is the sole runtime)_
