# Nezuko Latency Audit and Optimization Plan — V2

**Date:** 2026-03-08  
**Scope:** Final consolidated latency report for the Nezuko grammY bot, based on live InsForge production telemetry queried on 2026-03-08 and cross-validated against the 2026-03-07 research report. All solutions are treated as not yet implemented. This document supersedes `latencyV1.md`.

**Live data sources:**
- `api_call_log` — 976 total rows (973 real bot calls)
- `verification_log` — 62 rows
- `insforge.logs` — 50 most recent entries
- `postgREST.logs` — no issues

---

## Executive Summary

The primary bottleneck is **not InsForge**. Your own production telemetry confirms the dominant cost is the **Telegram-side verification workflow**: multiple sequential `getChatMember` calls, a slow `restrictChatMember` moderation step, message operations, and the fact that `answerCallbackQuery` is called only after all of this work completes.

**Live confirmed numbers:**

| Path | Avg Latency | P95 | Max |
|---|---|---|---|
| Full verification flow | **1,323.63 ms** | **2,171.60 ms** | **2,714 ms** |
| `restrictChatMember` | **746.42 ms** | **1,097.60 ms** | 1,984 ms |
| `getChatMemberCount` | **592.31 ms** | **1,010.00 ms** | 1,685 ms |
| `deleteMessage` | **569.41 ms** | **985.40 ms** | 14,779 ms* |
| `sendMessage` | **493.49 ms** | **845.85 ms** | 3,068 ms |
| `getChatMember` | **402.36 ms** | **736.85 ms** | 873 ms |
| `answerCallbackQuery` | **363.00 ms** | **398.75 ms** | 588 ms |
| `getMe` | **223.34 ms** | **320.00 ms** | 1,427 ms |
| InsForge poll reads | **~240 ms** | — | 280 ms |
| InsForge heartbeat writes | **~120 ms** | — | 281 ms |

*One documented tail spike. P95 = 985 ms is the reliable upper bound for planning.

**The biggest improvements will come from:**

1. Answering callback queries immediately before any Telegram work
2. Parallelizing all membership checks so they run concurrently
3. Caching membership verdicts in Redis with short TTLs
4. Skipping unnecessary `restrictChatMember` calls when state has not changed
5. Removing `getChatMemberCount` from the real-time verification path
6. Moving all non-critical logging and analytics off the hot path
7. Using grammY runner for safe concurrent long-polling
8. Caching the verification contract and channel config

---

## Part 1: What the Live Data Shows

### 1.1 — Verification flow is 3.6× slower than any single Telegram call

The average verification of 1,323.63 ms is not one Telegram call — it is a chain:

```
verify button click
  → answerCallbackQuery         ~363 ms avg
  → load verification contract  ~240 ms (InsForge poll)
  → getChatMember × N channels  ~402 ms avg × N (sequential today)
  → restrictChatMember (failed) ~746 ms avg
  → sendMessage (prompt)        ~493 ms avg
  → write verification_log      ~120 ms (InsForge write)
```

Each step adds to the total. The user waits for the **sum** of all steps, not the slowest one.

### 1.2 — InsForge is not the problem

All InsForge bot-facing request durations from live logs:

| Endpoint | Live Measurements | Max |
|---|---|---|
| `GET /admin_commands` | 183, 210, 216, 236, 252 ms | 252 ms |
| `GET /bot_instances` | 241, 243, 247, 265, 280 ms | 280 ms |
| `PATCH /bot_status` | 82, 98, 102, 216, 281 ms | 281 ms |
| `POST /api_call_log` | 101, 331 ms | 331 ms |

None of these explain a 1,323 ms average. InsForge backend is healthy (`postgREST.logs` returned zero errors).

### 1.3 — Cache is partially working but underexploited

From live `verification_log` data:

| | Count | Avg Latency |
|---|---|---|
| Cached verifications (Redis hit) | 25 / 62 = **40.3%** | **1,038 ms** |
| Uncached verifications (fresh Telegram API) | 37 / 62 = **59.7%** | **1,517 ms** |
| Benefit per cache hit | — | **~478 ms saved** |

Even with a Redis hit, the average is still over 1 second. This proves the remaining cost after eliminating the Telegram API call is orchestration: the `answerCallbackQuery`, unmute, and log writes all still run sequentially.

### 1.4 — Actual verification sequence from live rows

```
12:15:55 — restricted  1,799 ms  uncached  (user not in channel, fresh API check)
12:16:11 — restricted  1,836 ms  uncached  (second tap)
12:16:27 — restricted  2,714 ms  uncached  (third tap — measured max)
12:16:32 — verified      350 ms  cached    (user joins channel → Redis hit → fast)

12:59:32 — restricted  1,946 ms  uncached
12:59:44 — restricted  2,486 ms  uncached
12:59:50 — verified      392 ms  cached

13:23:38 — restricted  1,775 ms  uncached
13:23:46 — verified      365 ms  cached
```

Pattern confirmed: repeated restricted attempts (uncached, slow) followed by a single cached verified hit. The gap between the last negative attempt and the successful verify is typically 6–8 seconds — which is the real user-perceived delay when they finally join the required channel and tap verify.

### 1.5 — New finding: 14,779 ms `deleteMessage` tail spike

A single `deleteMessage` at `2026-03-07T16:47:47Z` took **14,779 ms** (P95 is 985 ms; this is a rare Telegram tail event). If this were on the synchronous hot path, it would freeze the verification flow for 14 seconds for that user. This confirms the need for fire-and-forget patterns on non-critical operations.

### 1.6 — All 973 real Telegram API calls succeeded (100%)

Zero failures in the entire production window. Telegram infrastructure is reliable for this bot's scale.

---

## Part 2: Root Cause Analysis

### Primary cause: Sequential Telegram API orchestration

The verification path currently executes every step in sequence on the hot path:

```typescript
// Current anti-pattern — everything blocks the user response
await verifyMembership(...);   // ~400 ms × N channels
await unmuteUser(...);         // ~746 ms if restricting
await cache.set(...);          // ~1 ms (Redis, fast)
await logVerification(...);    // ~120 ms (InsForge)
await ctx.answerCallbackQuery();  // ~363 ms — called LAST
```

The user sees **nothing** until the final `answerCallbackQuery` completes at ~1,323 ms average.

### Secondary cause: No per-channel membership parallelism

If a group requires 3 channels, today the bot checks them one after another:

```typescript
// Current pattern (serial)
for (const channel of requiredChannels) {
  const member = await ctx.api.getChatMember(channel.chatId, userId);
}
// Total cost: 3 × 402 ms = ~1,206 ms just for membership checks
```

### Tertiary cause: `restrictChatMember` called regardless of current state

At 746 ms average, `restrictChatMember` is the most expensive common Telegram action. It is called even when the user is already muted. There is no state cache to skip the call when the desired restriction state matches the current state.

### Supporting cause: `getChatMemberCount` on the hot path

244 calls at 592 ms average. This method fetches the group's total member count, which is not needed to make a verification decision. It is running as part of the enforcement flow when it should only run in background sync jobs.

### Supporting cause: Non-critical writes blocking the response

`logVerification()` and other DB writes are awaited before the user receives any feedback. These writes take 100–330 ms and could be deferred.

---

## Part 3: Solutions

### Solution 1 — Two-phase verification flow (answer callback immediately)

**Impact: Highest on user-perceived latency.**

#### Goal

The user should feel the verify button respond in ~363 ms. Background enforcement work can continue after the acknowledgement is sent.

#### Current flow (broken UX):

```text
verify click → [all work] → answerCallbackQuery → user sees response (~1,323 ms)
```

#### Target flow:

```text
Phase A (user-facing fast path):
  1. Receive callback update
  2. answerCallbackQuery immediately        ← user sees response in ~363 ms
  3. Load verification contract from cache
  4. Run membership checks in parallel
  5. Compute decision

Phase B (background side effects):
  6. Unrestrict or restrict only if state must change
  7. Edit or send follow-up message
  8. Write DB logs asynchronously
  9. Trigger analytics / telemetry
```

#### Implementation

```typescript
bot.callbackQuery(/^verify:(-?\d+)$/, async (ctx) => {
  const started = Date.now();
  const groupId = Number(ctx.match[1]);
  const userId = ctx.from.id;

  // Phase A — answer immediately so Telegram stops showing progress indicator
  await ctx.answerCallbackQuery().catch(() => {});

  // Phase B — all remaining work runs after user gets acknowledgement
  const contract = await getVerificationContractCached(groupId);

  const checks = await Promise.allSettled(
    contract.requiredChannels.map((channelId) =>
      ctx.api.getChatMember(channelId, userId)
    )
  );

  const verdict = evaluateMembershipChecks(checks, contract);

  await applyEnforcement(ctx, groupId, userId, verdict);

  queueVerificationLog({
    chatId: groupId,
    userId,
    verdict,
    latencyMs: Date.now() - started,
  });
});
```

#### Expected impact

User-perceived latency: **~1,323 ms → ~363 ms** (answerCallbackQuery avg).  
Actual full-flow latency is unchanged until solutions 2–5 are also applied.

---

### Solution 2 — Parallelize all membership checks

**Impact: Highest on actual full-flow latency.**

#### Current anti-pattern

```typescript
// Serial — total cost multiplies with channel count
for (const channel of requiredChannels) {
  const member = await ctx.api.getChatMember(channel.chatId, userId);
  // evaluate
}
// 3 channels = 3 × 402 ms = ~1,206 ms
```

#### Correct pattern

```typescript
// Parallel — total cost = slowest single check
const results = await Promise.allSettled(
  requiredChannels.map((channel) =>
    ctx.api.getChatMember(channel.chatId, userId)
  )
);

const verdicts = results.map((result, i) => ({
  channelId: requiredChannels[i].chatId,
  ok: result.status === "fulfilled",
  member: result.status === "fulfilled" ? result.value : null,
  error: result.status === "rejected" ? result.reason : null,
}));
```

Use `Promise.allSettled`, not `Promise.all`:
- One transient Telegram error should not collapse the entire verification
- Partial results can be evaluated independently
- Failures on one channel can be logged without killing the whole flow

#### Why this works

For 3 channels:
- **Serial today:** 3 × 402 ms = ~1,206 ms for checks
- **Parallel after:** max(402, 402, 402) = ~402 ms for checks
- **Saving: ~804 ms** for a 3-channel group

#### Expected impact

For groups with 2+ required channels: **~400–1,200 ms reduction** on the verification check stage.

---

### Solution 3 — Redis membership verdict cache

**Impact: High for repeated interactions and bursty verify taps.**

Redis is already in the stack (`ioredis`, `nezuko:v2:` prefix). The live data shows a 478 ms benefit per cache hit at 40.3% hit rate. This solution formalizes and extends the caching strategy to cover the full verdict, not just individual channel checks.

#### Cache design

**Layer 1: Per-channel membership cache**

```text
Key:   nezuko:v2:member:{channel_id}:{user_id}
Value: "1" (member) or "0" (not member)
TTL:   60 seconds (positive) / 30 seconds (negative)
```

**Layer 2: Aggregated contract-level verdict cache**

```text
Key:   nezuko:v2:verify:{group_id}:{user_id}:{contract_revision}
Value: JSON { allowed: boolean, missingChannels: string[] }
TTL:   60 seconds
```

Use both layers:
- L1 is reusable across different flows and groups
- L2 is the fastest path — one Redis read gives the entire verification answer

#### Implementation sketch

```typescript
async function getVerificationVerdict(
  cache: CacheClient,
  groupId: number,
  userId: number,
  contractRevision: string
): Promise<VerificationVerdict | null> {
  const key = `nezuko:v2:verify:${groupId}:${userId}:${contractRevision}`;
  const raw = await cache.get(key);
  if (!raw) return null;
  return JSON.parse(raw) as VerificationVerdict;
}

async function setVerificationVerdict(
  cache: CacheClient,
  groupId: number,
  userId: number,
  contractRevision: string,
  verdict: VerificationVerdict
): Promise<void> {
  const key = `nezuko:v2:verify:${groupId}:${userId}:${contractRevision}`;
  await cache.set(key, JSON.stringify(verdict), "EX", 60);
}
```

#### Required guardrails

- Include `contractRevision` (or a hash of the required channel list) in the cache key — stale verdicts for old contract versions must not persist
- Invalidate contract-level cache immediately when an admin changes required channels
- Never cache API errors as "not a member" — only cache actual Telegram API membership results
- Short TTLs (60 s or less) so users who leave and rejoin quickly are revalidated

#### Expected impact

Cache hit rate **40.3% → 70–85%** for active groups with repeat verify taps.  
Each additional cache hit saves **~478 ms** over the uncached path.

---

### Solution 4 — Idempotent moderation (skip redundant `restrictChatMember`)

**Impact: High. `restrictChatMember` is the slowest common Telegram method at 746 ms avg.**

#### Problem

The bot calls `restrictChatMember` even when the user is already muted. Every redundant call costs ~746 ms with no user-visible effect.

#### Fix — Moderation state cache

```text
Key:   nezuko:v2:mod_state:{group_id}:{user_id}
Value: "restricted" or "unrestricted"
TTL:   300 seconds
```

#### Logic

```typescript
const cachedState = await cache.get(`nezuko:v2:mod_state:${groupId}:${userId}`);
const desiredState = verdict.allowed ? "unrestricted" : "restricted";

if (cachedState === desiredState) {
  // State already correct — skip the Telegram call entirely
  log.debug({ groupId, userId }, "Skipping redundant moderation call");
} else {
  if (desiredState === "restricted") {
    await ctx.api.restrictChatMember(groupId, userId, NO_PERMISSIONS);
  } else {
    await ctx.api.restrictChatMember(groupId, userId, ALL_PERMISSIONS);
  }
  await cache.set(
    `nezuko:v2:mod_state:${groupId}:${userId}`,
    desiredState,
    "EX",
    300
  );
}
```

#### Guardrails

- Invalidate `mod_state` cache when bot restarts (in case real Telegram state has drifted)
- On any Telegram 400/403 error, clear the cached state so next call is forced fresh
- The bot must be group admin — `restrictChatMember` returns 400 otherwise

#### Expected impact

For any flow that re-restricts an already-muted user: **saves 746 ms per skipped call**.  
Most impactful for: message-path enforcement (repeated blocked messages from the same user), and channel-leave re-muting.

---

### Solution 5 — Remove `getChatMemberCount` from the verification hot path

**Impact: Medium — 592 ms avg, 244 calls recorded. None of these should block verification.**

#### Problem

`getChatMemberCount` is currently called during verification and enforcement flows. It fetches the total group member count. This number is used for analytics and dashboard display — it has zero relevance to whether a specific user is allowed to chat.

Live data: **244 calls, avg 592.31 ms, P95 1,010 ms.** This is one of the most expensive methods in the log.

#### Fix

Move all `getChatMemberCount` calls out of the real-time bot hot path:

```typescript
// ❌ Wrong — blocks any path that calls it
const count = await ctx.api.getChatMemberCount(groupId);
await db.patchRecords("protected_groups", { group_id: `eq.${groupId}` }, {
  member_count: count,
});

// ✅ Correct — scheduled background job only
// In member-sync.ts, run on its own 15min interval
// Never called inline during message handling or verification
async function syncGroupMemberCount(api: Api, db: InsForgeClient, groupId: number) {
  const count = await api.getChatMemberCount(groupId);
  await db.patchRecords("protected_groups", { group_id: `eq.${groupId}` }, {
    member_count: count,
  });
}
```

Alternatively, cache the count and update on a schedule:

```text
Key:  nezuko:v2:member_count:{group_id}
TTL:  900 seconds (15 min, matches sync interval)
```

#### Expected impact

Removes up to 592 ms from any hot path that currently calls it. For the message-filter path this is significant because member-count fetches have no business being there.

---

### Solution 6 — Cache verification contract and channel config

**Impact: Medium — removes 200–280 ms InsForge reads from the hot path.**

Every verification currently triggers an InsForge read for the group's verification contract (required channels, enforcement flags, admin config). These reads take 200–280 ms. They can be safely cached because they only change when an admin modifies group settings.

#### Cache design

```text
Key:   nezuko:v2:group_contract:{group_id}:{revision}
Value: JSON serialized contract object
TTL:   300 seconds

Key:   nezuko:v2:enforced_channels:{group_id}
Value: JSON array of channel objects
TTL:   300 seconds

Key:   nezuko:v2:bot_instance:{bot_id}
Value: JSON bot config
TTL:   300 seconds
```

#### Use stale-while-revalidate for config reads

```typescript
async function getVerificationContractCached(
  cache: CacheClient,
  db: InsForgeClient,
  groupId: number
): Promise<VerificationContract> {
  const key = `nezuko:v2:group_contract:${groupId}`;
  const cached = await cache.get(key);

  if (cached) {
    return JSON.parse(cached) as VerificationContract;
  }

  // Cache miss — fetch from InsForge
  const contract = await getGroupVerificationContract(db, groupId);
  await cache.set(key, JSON.stringify(contract), "EX", 300);
  return contract;
}
```

#### Invalidate on admin changes

```typescript
// When admin runs /protect, /unprotect, or /settings
await cache.del(`nezuko:v2:group_contract:${groupId}`);
await cache.del(`nezuko:v2:enforced_channels:${groupId}`);
```

#### Expected impact

Eliminates a 200–280 ms InsForge read from every verification hot path after the first call. Combined with Solution 3 (verdict cache), the contract read and the membership API calls can both be skipped for repeat interactions.

---

### Solution 7 — Move logging and analytics off the hot path

**Impact: Low to medium — removes 100–330 ms from the synchronous flow.**

#### Current blocking writes on hot path

- `logVerification()` — awaited in verify path before response is sent
- `postRecords("api_call_log", ...)` — fire-and-forget today, but adds DB connection pressure
- `postRecords("admin_logs", ...)` — WARN+ forwarding, potentially blocking on DB

#### Target: async queue pattern

```typescript
// Lightweight in-process queue
const logQueue: VerificationLogEntry[] = [];

function queueVerificationLog(entry: VerificationLogEntry): void {
  logQueue.push(entry);
}

// Flushed on an interval — never on the hot path
setInterval(async () => {
  if (logQueue.length === 0) return;
  const batch = logQueue.splice(0, 50);
  await db.postRecords("verification_log", batch).catch((err) => {
    log.warn({ err }, "Batch verification log write failed");
  });
}, 2000);
```

#### What stays synchronous (security/audit-critical)

- Critical failure logs (error status, security violations)
- Any write that must be confirmed before moderation actions

#### What moves to async queue

- Verification result logs (latency_ms, cached, status)
- API call log writes
- Dashboard analytics updates
- Non-critical admin activity

#### Expected impact

Removes 100–330 ms of DB write time from the verification completion path. Tail latency (P95, P99) improves more than median because slow DB writes are the main cause of tail events.

---

### Solution 8 — Use grammY runner for safe concurrent long polling

**Impact: High on throughput. Medium on per-request latency.**

Without `@grammyjs/runner`, updates are processed one at a time. Under any load, a slow verification is blocking the next incoming update for the entire bot.

#### Setup

```typescript
import { run, sequentialize } from "@grammyjs/runner";

// Sequentialize MUST come before other middleware to prevent race conditions
bot.use(
  sequentialize((ctx) => {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    if (!chatId || !userId) return String(chatId ?? userId ?? "global");
    // Commands and membership updates: serialize by chat only
    if (ctx.message?.text?.startsWith("/") || ctx.myChatMember || ctx.chatMember) {
      return String(chatId);
    }
    // Ordinary user traffic: serialize by (chat, user) pair so busy groups
    // do not serialize unrelated users behind each other
    return `${chatId}:${userId}`;
  })
);

// Start runner — processes updates concurrently across different chats/users
const runnerHandle = run(bot, {
  runner: {
    fetch: {
      allowed_updates: ALLOWED_UPDATES,
    },
  },
});
```

#### Key grammY docs principles

- `sequentialize` is required with `runner` for any stateful flows that can collide ([grammY docs](https://grammy.dev/ref/runner/sequentialize))
- Long polling with `run()` fetches and processes updates concurrently ([grammY docs](https://grammy.dev/advanced/deployment.html))
- Without sequentialize, two updates from the same user can race and corrupt state

#### Expected impact

Under concurrent traffic: **2–3× throughput improvement**. Per-request latency unchanged for isolated users but improves under load because slow flows no longer block fast ones.

---

### Solution 9 — Add `auto-retry` for reliability

**Impact: Low on median latency. Positive on P95/P99 tail reliability.**

Live data shows 100% API success rate in the measured window. However, Telegram rate-limits (429) and transient 5xx errors do occur in production. Without auto-retry, a single transient failure causes a hard error that the user must recover from manually.

```typescript
import { autoRetry } from "@grammyjs/auto-retry";

// Applied as an API transformer — before other transformers
bot.api.config.use(
  autoRetry({
    maxRetryAttempts: 3,
    maxDelaySeconds: 60,
    rethrowInternalServerErrors: false,
  })
);
```

#### What it helps

- Telegram 429 flood limits — waits `retry_after` seconds and retries
- Transient 5xx errors — retries up to maxRetryAttempts
- Network timeouts — retries on connection failures

#### What it does NOT do

It never improves median (P50) latency. It will make slow requests even slower because retries add wait time. Do not use it as a performance tool — use it as a reliability tool.

#### Expected impact

P50: no change. P95 tail: improved (fewer hard failures that cascade into error paths). Operational stability: meaningfully better under Telegram's rate-limit events.

---

### Solution 10 — Webhook reply for `answerCallbackQuery` only

**Impact: Small but worthwhile on perceived responsiveness.**

Telegram allows sending one Bot API request as the HTTP response body to a webhook. This saves one outbound network round trip. However, Telegram explicitly states that webhook-response API calls **cannot be observed for success or result**. ([Telegram Bot API docs](https://core.telegram.org/bots/api))

#### Good candidate

```typescript
// Only for answerCallbackQuery — fire-and-forget semantics are acceptable
// success/failure of this call has no downstream logic dependency
answerCallbackQuery({ text: "Verifying..." });
```

#### Bad candidates (do NOT use webhook reply for these)

- `restrictChatMember` — must be confirmed before state cache is updated
- `sendMessage` — must know messageId for later deletion
- `deleteMessage` — must confirm before logging
- Anything that must be logged, retried, or observed

#### Expected impact

Saves ~363 ms (one `answerCallbackQuery` round trip) from the perceived response time if webhook mode is used. In long-polling mode this optimization does not apply.

---

### Solution 11 — Add full end-to-end stage telemetry

**Impact: Zero on latency. Required to measure all other solutions.**

The current `api_call_log` measures individual Telegram method calls. The `verification_log` measures the verification logic. But there is no single metric for:

- **update received → first visible response to user** (true end-to-end)
- **verify click → callback answered** (user-perceived)
- **verify click → user unmuted** (full enforcement)
- **blocked message → message deleted** (message path)
- **blocked message → prompt sent** (message path)

Without these, you cannot prove before/after improvement from any optimization.

#### Telemetry to add

```typescript
// At the start of each major flow, record timestamps:
const t = {
  start: Date.now(),
  callbackAnswered: 0,
  contractLoaded: 0,
  checksComplete: 0,
  decisionReady: 0,
  moderationDone: 0,
  messageDone: 0,
  total: 0,
};

// After each stage:
t.callbackAnswered = Date.now() - t.start;
t.contractLoaded   = Date.now() - t.start;
// ... etc

// Log as structured event (or to verification_log metadata)
logger.info({ flow: "verify", stages: t, userId, groupId }, "Verification flow completed");
```

#### Also track

- Cache hit rates per cache key type (membership, verdict, contract)
- Count of skipped `restrictChatMember` calls (idempotent moderation)
- Count of retried `getChatMember` calls (fresh verify retries)
- Rate-limit events (from auto-retry)
- P50 / P95 / P99 per method over 1h rolling windows

---

### Solution 12 — InsForge request timeout guard

**Impact: Prevents hang — does not improve median latency.**

InsForge requests average 82–280 ms, but occasionally a backend or network issue can cause a request to stall indefinitely. Without a timeout, a stalled InsForge request freezes the entire bot worker handling that update.

#### Implementation

```typescript
// All InsForge REST calls wrapped with AbortController
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
```

Apply this to every `getRecords`, `postRecords`, `patchRecords`, and `deleteRecords` call inside `InsForgeClient`.

#### Expected impact

Median: no change. Tail: prevents indefinite hangs. The 5,000 ms timeout means a worst-case InsForge failure costs at most 5 seconds, not indefinitely.

---

### Solution 13 — Process-lock singleton guard

**Impact: Prevents immediate worst-case latency regression from dual polling.**

Running two bot processes with the same token causes Telegram to issue a `409 Conflict: terminated by other getUpdates request`. Both pollers fight, updates get dropped, and perceived latency becomes unbounded because updates are not reliably delivered to either process.

#### Implementation

```typescript
// Acquire a lock file or port at startup
// Use a Node.js lockfile or a Redis SET NX key
const lockKey = `nezuko:v2:process_lock:${mode}`;
const acquired = await cache.set(lockKey, process.pid.toString(), "NX", "EX", 60);

if (!acquired) {
  logger.error("Another bot process is already running. Exiting.");
  process.exit(1);
}

// Refresh the lock every 30 seconds while running
setInterval(async () => {
  await cache.set(lockKey, process.pid.toString(), "EX", 60);
}, 30_000);
```

#### Expected impact

Prevents the most severe latency regression: dual pollers cause complete update delivery failure, making every user interaction appear broken regardless of how fast the underlying Telegram API is.

---

## Part 4: Complete Prioritized Implementation Plan

### Priority 0 — Instrumentation (before or alongside everything else)

Add stage timers so every subsequent change can be measured with before/after proof:

```text
[ ] Add update_received → callback_answered timer
[ ] Add update_received → contract_loaded timer
[ ] Add update_received → membership_checks_done timer
[ ] Add update_received → decision_ready timer
[ ] Add decision_ready → moderation_done timer
[ ] Add decision_ready → message_done timer
[ ] Add update_received → full_flow_done timer
[ ] Track cache hit/miss per key type
[ ] Track skipped moderation calls
[ ] Track retry counts
[ ] Track p50/p95/p99 per Telegram method over rolling windows
```

---

### Priority 1 — Immediate Engineering (highest impact, lowest risk)

```text
[ ] S1: Move answerCallbackQuery before verifyMembership — user-perceived latency ~1,323 → ~363 ms
[ ] S2: Parallelize membership checks with Promise.allSettled — removes serial check cost
[ ] S5: Remove getChatMemberCount from verification/enforcement hot paths — saves ~592 ms per call
[ ] S12: Add AbortController timeout to all InsForgeClient fetch calls — prevents hangs
[ ] S13: Add process-lock singleton guard — prevents dual-poller latency regression
```

**Expected result after P1:** Perceived latency drops to ~363 ms (answerCallbackQuery). Full flow drops toward ~900 ms.

---

### Priority 2 — Cache and State Layer

```text
[ ] S3: Add Redis per-channel membership cache (60s positive / 30s negative TTL)
[ ] S3: Add Redis aggregated contract-level verdict cache (verify:{group_id}:{user_id}:{revision})
[ ] S4: Add Redis moderation state cache (mod_state:{group_id}:{user_id})
[ ] S4: Implement idempotent restrictChatMember skip when state matches cache
[ ] S6: Add Redis verification contract cache (group_contract:{group_id})
[ ] S6: Add Redis enforced channels cache (enforced_channels:{group_id})
[ ] S6: Invalidate contract caches on admin /protect, /unprotect, /settings commands
```

**Expected result after P2:** Cache hit rate 40% → 75%+. Each hit saves ~478 ms. Full flow drops to 600–750 ms for repeat interactions.

---

### Priority 3 — Async and Concurrency Layer

```text
[ ] S7: Move verification_log writes to async fire-and-forget queue
[ ] S7: Move api_call_log batch writes to async queue (flush every 2 seconds)
[ ] S7: Move dashboard analytics off hot path — never await inside verify/enforce flow
[ ] S8: Use @grammyjs/runner for concurrent long-polling update processing
[ ] S8: Use sequentialize with per-chat key for commands, per-chat:user for traffic
[ ] S9: Add @grammyjs/auto-retry with maxRetryAttempts=3
```

**Expected result after P3:** Throughput 2–3× better. P95/P99 tail latency more stable. No more hard failures from transient Telegram errors.

---

### Priority 4 — Optional Experiments

```text
[ ] S10: Benchmark webhook reply for answerCallbackQuery only (not other methods)
[ ] S11: Benchmark local Bot API server if infra topology warrants it
[ ] Message editing instead of extra sends where UX allows
[ ] Precomputed verification UI payloads (HTML prepared, not generated per-request)
```

**Expected result:** Incremental improvements. Not the main win.

---

## Part 5: Implementation Blueprint

### Hot-path pseudocode after all solutions applied

```typescript
bot.callbackQuery(/^verify:(-?\d+)$/, async (ctx) => {
  const flowStart = Date.now();
  const groupId = Number(ctx.match[1]);
  const userId = ctx.from.id;

  // ── Phase A: Immediate user acknowledgement ──────────────────────
  // S1: Answer FIRST — Telegram progress bar stops immediately
  await ctx.answerCallbackQuery({ text: "Verifying…" }).catch(() => {});
  const t_ack = Date.now() - flowStart; // ~363 ms avg

  // ── S13: Idempotency guard ────────────────────────────────────────
  const lockAcquired = await acquireIdempotencyLock(ctx.cache, "verify", [groupId, userId]);
  if (!lockAcquired) return; // already being processed

  try {
    // ── S6: Load contract from cache ─────────────────────────────────
    const contract = await getVerificationContractCached(ctx.cache, ctx.db, groupId);
    const t_contract = Date.now() - flowStart;

    // ── S3: Check aggregated verdict cache first ──────────────────────
    const cachedVerdict = await getVerificationVerdict(
      ctx.cache, groupId, userId, contract.revision
    );
    const t_verdict_check = Date.now() - flowStart;

    let verdict: VerificationVerdict;

    if (cachedVerdict) {
      verdict = cachedVerdict;
    } else {
      // ── S2: Parallel membership checks ───────────────────────────────
      const checks = await Promise.allSettled(
        contract.requiredChannels.map((channelId) =>
          ctx.api.getChatMember(channelId, userId)
        )
      );
      verdict = evaluateMembershipChecks(checks, contract);
      const t_checks = Date.now() - flowStart;

      // Cache the verdict for next tap
      await setVerificationVerdict(ctx.cache, groupId, userId, contract.revision, verdict);
    }

    const t_decision = Date.now() - flowStart;

    // ── S4: Idempotent moderation ─────────────────────────────────────
    const desiredState = verdict.allowed ? "unrestricted" : "restricted";
    const cachedModState = await cache.get(`nezuko:v2:mod_state:${groupId}:${userId}`);

    if (cachedModState !== desiredState) {
      await applyModeration(ctx.api, groupId, userId, desiredState);
      await cache.set(`nezuko:v2:mod_state:${groupId}:${userId}`, desiredState, "EX", 300);
    }
    const t_moderation = Date.now() - flowStart;

    // Send result message (edit existing verification prompt)
    await respondToVerificationResult(ctx, verdict);
    const t_message = Date.now() - flowStart;

    // ── S7: Async logging — never await on hot path ───────────────────
    queueVerificationLog({
      userId, groupId,
      verdict,
      latencyMs: Date.now() - flowStart,
      stages: { t_ack, t_contract, t_verdict_check, t_decision, t_moderation, t_message },
    });

  } finally {
    await releaseIdempotencyLock(ctx.cache, "verify", [groupId, userId]);
  }
});
```

---

## Part 6: Expected Performance After Full Optimization

### Baseline (current, unoptimized)

| Metric | Value |
|---|---|
| User-perceived latency (verify tap) | ~1,323 ms |
| Verification avg | 1,323.63 ms |
| Verification P95 | 2,171.60 ms |
| Verification max | 2,714 ms |
| Throughput | 1 update at a time (no runner) |

### After Priority 1 (immediate engineering)

| Metric | Expected |
|---|---|
| User-perceived latency | **~363 ms** (answerCallbackQuery avg) |
| Full verification avg | **~1,000–1,100 ms** (parallel checks) |
| Verification P95 | **~1,600 ms** |

### After Priority 2 (cache layer)

| Metric | Expected |
|---|---|
| User-perceived latency | **~363 ms** |
| Full verification avg | **700–900 ms** |
| Verification P95 | **~1,300–1,500 ms** |
| Cache hit rate | **~70–85%** |

### After Priority 3 (async + concurrency)

| Metric | Expected |
|---|---|
| Verification avg | **600–750 ms** |
| Verification P95 | **~1,100–1,300 ms** |
| Throughput | **2–3× current** |
| Tail stability | Meaningfully improved |

### Plausible lower bound (best case, all solutions applied well)

```text
verification avg: 500–600 ms
verification P95: 900–1,100 ms
```

This lower bound depends on:
- How many membership checks are truly parallel vs still sequential
- How many moderation calls can be skipped
- How often the verdict cache hits on first tap
- Whether any hidden waits exist in the current flow

---

## Part 7: What Should Never Be Overestimated

| Thing | Why |
|---|---|
| InsForge-specific tuning | InsForge is already 82–280 ms — not the bottleneck |
| Webhook replies as a general solution | Cannot observe success; unsafe for moderation |
| Local Bot API server as a guaranteed speed boost | Telegram only promises file/networking features, not lower latency |
| `auto-retry` as a latency tool | It can only make slow requests slower (retries add wait time) |
| Caching alone, without fixing the sequential orchestration | Even a perfect cache hit still averages 1,038 ms today |

---

## Part 8: Implementation Checklist

```markdown
## Priority 0 — Instrumentation
[ ] Stage timers in verification callback (t_ack, t_contract, t_checks, t_decision, t_moderation, t_message, t_total)
[ ] Stage timers in message-path enforcement
[ ] Stage timers in join-request path
[ ] Cache hit/miss logging per key type
[ ] Skipped moderation call counter
[ ] P50/P95/P99 rolling metrics per Telegram method

## Priority 1 — Immediate Engineering
[ ] S1: answerCallbackQuery before verifyMembership
[ ] S2: Promise.allSettled for all membership checks
[ ] S5: Remove getChatMemberCount from verify/enforce/message hot paths
[ ] S12: AbortController timeout on all InsForgeClient fetch calls (5,000 ms default)
[ ] S13: Process-lock singleton guard on bot startup

## Priority 2 — Cache Layer
[ ] S3: Per-channel membership cache (60s/30s TTLs)
[ ] S3: Contract-level verdict cache (60s TTL, keyed with contract revision)
[ ] S4: Moderation state cache (300s TTL)
[ ] S4: Skip restrictChatMember when cachedModState === desiredState
[ ] S6: Verification contract Redis cache (300s TTL)
[ ] S6: Enforced channels Redis cache (300s TTL)
[ ] S6: Invalidate contract caches on admin command changes

## Priority 3 — Async and Concurrency
[ ] S7: Async batch queue for verification_log (flush every 2s)
[ ] S7: Async batch queue for api_call_log
[ ] S7: Never await analytics/dashboard writes on hot path
[ ] S8: @grammyjs/runner for concurrent long-polling
[ ] S8: sequentialize with chatId:userId for user traffic, chatId for commands
[ ] S9: @grammyjs/auto-retry (maxRetryAttempts=3, maxDelaySeconds=60)

## Priority 4 — Experiments
[ ] S10: Benchmark webhook reply for answerCallbackQuery only (measure before/after)
[ ] Local Bot API server benchmark (only if geographically disadvantaged)
[ ] Message editing instead of new sends where UX allows
```

---

## Part 9: Summary of Live-Validated Root Causes and Actions

| Root Cause | Confirmed By | Solution |
|---|---|---|
| `answerCallbackQuery` called last in chain | Code inspection + 1,323 ms avg | S1 — move it first |
| Serial `getChatMember` calls per channel | Code + live verification avg | S2 — parallel with `Promise.allSettled` |
| No verdict-level Redis cache | 59.7% cache misses, 1,517 ms uncached avg | S3 — contract-level verdict cache |
| `restrictChatMember` called regardless of state | 69 calls at 746 ms avg | S4 — moderation state cache |
| `getChatMemberCount` in hot path | 244 calls at 592 ms avg | S5 — move to background sync |
| Contract/config re-read every verification | 200–280 ms InsForge poll per verify | S6 — Redis contract cache |
| `logVerification()` awaited before response | Adds 100–330 ms to hot path | S7 — async queue |
| No concurrent update processing | 1 update at a time | S8 — grammY runner |
| No timeout on InsForge REST calls | Risk of indefinite hangs | S12 — AbortController |
| No process-lock guard | Risk of dual poller 409 conflicts | S13 — startup singleton |

---

_Version: V2 — Final consolidated, live-validated_  
_Date: 2026-03-08_  
_Based on: 7 live InsForge SQL queries + 2 container log fetches on 2026-03-08_  
_Supersedes: `latencyV1.md` (2026-03-07)_
