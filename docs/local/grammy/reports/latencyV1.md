# Nezuko Latency Audit and Optimization Report

**Date:** 2026-03-07
**Scope:** Project audit of Nezuko, analysis of the two uploaded latency reports, and best-practice optimization plan using official Telegram Bot API, grammY, and InsForge sources.

---

## Executive Summary

The main bottleneck is **not InsForge**. Your own telemetry shows that the dominant cost is the **Telegram-side verification workflow**: multiple `getChatMember` calls, moderation operations such as `restrictChatMember`, message operations, and sequential orchestration inside the verification path. In your measured data, raw Telegram API calls average about **479 ms**, full verification averages about **1324 ms**, and recent bot-facing InsForge requests are mostly in the **24–300 ms** range.  

The slowest measured hot Telegram methods are:

* `restrictChatMember`: **746.42 ms avg**
* `getChatMemberCount`: **586.67 ms avg**
* `sendMessage`: **490.99 ms avg**
* `deleteMessage`: **462.97 ms avg**
* `getChatMember`: **402.36 ms avg**
* `answerCallbackQuery`: **363.00 ms avg** 

That pattern strongly supports the same conclusion as your internal reports: the best wins will come from:

1. **Parallelizing membership checks**
2. **Caching membership and contract/config data**
3. **Avoiding redundant moderation calls**
4. **Responding to callback queries immediately**
5. **Moving non-critical work off the hot path**
6. **Improving update concurrency safely in grammY**  

---

## What the Uploaded Reports Show

### 1. Telegram dominates the latency budget

Your research found:

* Telegram API calls: **479.45 ms average**
* Verification flow: **1323.63 ms average**
* Verification p95: **2171 ms**
* Verification max: **2714 ms**  

This matters because verification is not one call. It is a chain:

```text
verify button click
→ answerCallbackQuery
→ load verification contract
→ check membership for each required channel
→ apply moderation action
→ send verification message
→ log verification event
```

That means the user-perceived delay is the **sum of several network and backend steps**, not one step. 

### 2. InsForge is not the primary problem

Your bot-facing InsForge operations are mostly in the tens to low hundreds of milliseconds:

* `GET group_channel_links`: **24 ms**
* `GET enforced_channels`: **25 ms**
* `POST admin_logs`: **33 ms**
* `PATCH protected_groups`: **103 ms**
* `GET admin_commands`: **204–275 ms**
* `GET bot_instances`: **201–239 ms** 

That does not explain a **1.3 s verification average** by itself. Your own report correctly concludes the main problem is the Telegram verification workflow, not InsForge REST. 

### 3. Current measurement is useful but incomplete

Your report also correctly notes an instrumentation gap: there is no single end-to-end metric for:

* update received → first visible response
* verify click → callback answered
* verify click → user unmuted
* blocked message → deleted
* blocked message → prompt sent 

That gap matters because it limits how precisely you can attribute improvements.

---

## Cross-Check With Official Docs

## Telegram Bot API

Telegram’s official Bot API states that after a user presses a callback button, clients show a **progress bar until `answerCallbackQuery` is called**, so bots should answer callback queries promptly even if no message is needed. ([Telegram][1])

Telegram also states that:

* `getChatMember` is only **guaranteed** to work for other users if the bot is an **administrator** in the chat. ([Telegram][1])
* `restrictChatMember` is the method used to restrict users, and passing all permissions as allowed lifts restrictions again. ([Telegram][1])
* When using webhooks, you can perform **one Bot API request in the webhook response**, but Telegram says you **cannot know whether it succeeded or get its result**. ([Telegram][1])
* Telegram’s local Bot API server is primarily documented for larger file handling, flexible webhook settings, local paths, and higher webhook connection limits; Telegram explicitly says **most bots will be OK with the default configuration**. ([Telegram][1])

## grammY

Official grammY docs recommend:

* For **long polling**, use **`grammy runner`** to process updates concurrently. ([grammy.dev][2])
* Use **`sequentialize`** to avoid race conditions when updates for the same chat or session must remain ordered. ([grammy.dev][3])
* Use **`auto-retry`** to handle 429s, 5xx, and networking failures. ([grammy.dev][4])
* For **webhooks**, avoid long-running middleware because Telegram may re-send non-acknowledged updates, causing duplicates and timeouts. ([grammy.dev][2])
* Webhooks can optionally use **webhook replies**. ([grammy.dev][2])

## InsForge

InsForge’s public docs describe it as a semantic backend layer exposing database, auth, storage, functions, and related backend state to agents and tools. That aligns with your architecture, but public InsForge docs do not suggest any special latency optimization that would outperform standard backend hygiene for this bot workload. ([GitHub][5])

---

## Audit of the Existing Recommendations

## Correct and high-value recommendations

Your uploaded plan is directionally right on the most important points:

### Parallelize membership checks

This is the strongest first optimization. Your own report shows that repeated `getChatMember` calls are expensive, and doing them serially causes additive latency. For three required channels, you can easily pay roughly `3 × 400 ms` before moderation even begins. 

### Add Redis membership cache

This is high leverage because repeated checks for the same user/channel or same verification contract can convert a Telegram call into a Redis read. Your draft suggests a **60–120 second TTL**, which is a sensible starting point. 

### Reduce moderation calls

This is also correct. `restrictChatMember` is your slowest hot Telegram method, so any unnecessary moderation call is expensive. 

### Preload contract/config

This is a good supporting optimization. It will not beat Telegram round-trip reductions, but it removes avoidable backend work and helps stabilize p50. 

### Add full telemetry

This is required if you want to move from educated estimates to hard before/after proof. 

---

## Where I would tighten or change the recommendations

### 1. Use `Promise.allSettled`, not plain `Promise.all`

For membership checks, use `Promise.allSettled` rather than `Promise.all`.

Why:

* One transient failure should not collapse the whole verification attempt
* You can still evaluate successful checks
* You can classify partial failures separately

### 2. Treat webhook replies as a narrow optimization, not a general one

Webhook replies can remove one outbound request, but Telegram explicitly says you cannot know if that request succeeded or obtain its result. That makes it a poor choice for calls that need observability or precise failure handling. ([Telegram][1])

Best use here:

* `answerCallbackQuery`

Bad use here:

* `restrictChatMember`
* `sendMessage`
* anything that must be logged or retried carefully

### 3. Do not assume a local Bot API server will make the bot faster

Telegram documents the local Bot API server for feature and deployment flexibility, not as an official low-latency feature. It **may** help in some network topologies, but that is something to benchmark, not assume. ([Telegram][1])

### 4. Remove `getChatMemberCount` from the hot path wherever possible

This is showing up as one of your slowest common methods. Unless it is absolutely needed to decide the current user action, it should be deferred, cached, or removed from user-facing verification paths. 

---

# Best Solution Set

## Solution 1: Redesign the verification flow into two phases

### Goal

Make the bot feel fast immediately, while moving expensive side effects after the decision point.

### New flow

```text
Phase A: user-facing fast path
1. receive callback/update
2. answerCallbackQuery immediately
3. load contract/config from cache
4. run membership checks in parallel
5. compute decision

Phase B: side effects
6. unrestrict/restrict only if state must change
7. edit/send follow-up message
8. write detailed logs asynchronously
9. trigger non-critical analytics/telemetry
```

### Why this works

Telegram clients wait on callback queries until `answerCallbackQuery`. Sending it immediately improves perceived speed even if later steps still take time. ([Telegram][1])

### Expected impact

High on perceived latency, medium on actual full-flow latency.

---

## Solution 2: Parallelize all membership checks

### Current anti-pattern

```ts
for (const channel of requiredChannels) {
  const member = await ctx.api.getChatMember(channel.chatId, userId);
  // evaluate
}
```

### Better pattern

```ts
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

### Why this works

Your own data shows each `getChatMember` averages about **402 ms**. Sequential checks multiply that; parallel checks collapse it toward the slowest single call rather than the sum of all calls. 

### Expected impact

This is your best immediate latency reduction.

---

## Solution 3: Add Redis membership verdict caching

### Recommended keys

#### Option A: per-channel cache

```text
membership:{user_id}:{channel_id}
```

#### Option B: aggregated contract cache

```text
verify:{group_id}:{user_id}:{contract_revision}
```

### Recommended TTL

```text
60–120 seconds
```

### Best design

Use both:

* per-channel cache for reuse across different flows
* aggregated contract-level cache for the verify button path

### Important guardrails

* Include a `contract_revision` or config hash in the key
* Invalidate on admin changes to required channels
* Use short TTLs so users who leave quickly are revalidated soon
* Do not cache failed API errors as “not joined”

### Why this works

This converts repeated Telegram membership lookups into Redis reads in the hot path. Your own plan already points to this as a major gain. 

### Expected impact

High for repeated verify taps, repeated blocked messages, and bursty user interaction.

---

## Solution 4: Make moderation idempotent and skip redundant `restrictChatMember`

### Problem

You are paying one of your slowest Telegram calls even when the user is already in the correct state.

### Fix

Persist or cache the last known moderation state:

```text
moderation:{group_id}:{user_id}
```

### Logic

```ts
if (desiredState === cachedState) {
  // skip Telegram moderation call
} else {
  await ctx.api.restrictChatMember(...);
  // update state cache
}
```

### Why this works

`restrictChatMember` averages **746.42 ms** in your telemetry, making it the most expensive common action. 

### Extra note

Telegram documents that the bot must be an admin for this to work, and that passing all permissions enabled lifts restrictions. ([Telegram][1])

### Expected impact

High on flows that currently over-call moderation.

---

## Solution 5: Remove `getChatMemberCount` from real-time verification paths

### Problem

`getChatMemberCount` is expensive in your telemetry and usually unnecessary for the user’s immediate verification decision.

### Fix

* Cache counts
* Update counts on schedule
* Move them to analytics/dashboard jobs
* Never block verification or moderation on member-count fetches

### Why this works

This removes avoidable Telegram overhead from the hot path. 

### Expected impact

Medium.

---

## Solution 6: Cache contract/config resolution aggressively

### Cache candidates

* required channel list per group
* enforcement flags
* admin command config
* bot instance config
* verification templates

### Suggested layers

* in-process LRU for hottest items
* Redis for shared cache across bot workers/instances

### Example keys

```text
group_contract:{group_id}:{revision}
bot_instance:{bot_id}:{revision}
enforced_channels:{group_id}:{revision}
```

### Why this works

InsForge is not the top bottleneck, but removing repeated 20–275 ms reads still tightens the flow and reduces p50/p95 variability. 

### Expected impact

Medium.

---

## Solution 7: Move logging and analytics off the hot path

### Synchronous on hot path

Only keep:

* critical failure logs
* minimal security/audit records if mandatory

### Asynchronous

Queue:

* verification detail logs
* dashboard analytics
* non-critical admin activity logs
* API call rollups

### Pattern

```text
Bot hot path
→ enqueue event
→ return to user
→ worker flushes DB/log writes
```

### Why this works

Database writes are not the main bottleneck, but they still contribute to total orchestration cost and tail latency. Your own report identifies database logging as part of the accumulated flow cost. 

### Expected impact

Low to medium.

---

## Solution 8: Use grammY concurrency properly

## If you use long polling

Use **`grammy runner`**. Official grammY guidance explicitly recommends this for scaling long-polling bots. ([grammy.dev][2])

## If you use runner

Also use **`sequentialize`** for any stateful flows that can collide:

```ts
import { sequentialize } from "@grammyjs/runner";

bot.use(sequentialize((ctx) => String(ctx.chat?.id ?? ctx.from?.id ?? "")));
```

This prevents race conditions when multiple updates from the same chat or user arrive concurrently. Official grammY docs specifically warn that concurrency improves scalability but can introduce clashes without sequencing constraints. ([grammy.dev][3])

## If you use webhooks

You already get concurrent update delivery, but grammY warns not to do long-running operations inside middleware because Telegram can retry unacknowledged updates. ([grammy.dev][2])

### Expected impact

High for throughput and load handling, medium for latency under concurrency.

---

## Solution 9: Add `auto-retry`, but treat it as reliability work

### What it helps

* 429 flood limits
* 5xx Telegram-side errors
* transient networking failures

### What it does not do

It does **not** improve median latency. In some cases it will make slow requests even slower because retries wait and repeat.

### Why still use it

It improves success rate, tail reliability, and operational stability. Official grammY docs recommend it for handling flood waits and retryable failures. ([grammy.dev][4])

### Expected impact

Low on p50, positive on p95/p99 reliability.

---

## Solution 10: Consider webhook reply only for `answerCallbackQuery`

### Good candidate

```ts
answerCallbackQuery
```

### Why

* It is user-facing
* It returns only success/failure semantics
* Fast acknowledgment matters because Telegram shows a progress bar until this call is made. ([Telegram][1])

### Why not broader

Telegram explicitly says that webhook-response API calls cannot be observed for success or result. That is too risky for moderation or audit-sensitive actions. ([Telegram][1])

### Expected impact

Small but worthwhile on perceived responsiveness.

---

## Solution 11: Benchmark, do not assume, a local Bot API server

### What Telegram officially promises

* larger file limits
* flexible webhook networking
* local path behavior
* higher webhook connection options
* ability to run your own endpoint instead of `api.telegram.org` ([Telegram][1])

### What Telegram does not promise

* lower latency

### Recommendation

Only test this if:

* your infra is geographically or network-wise disadvantaged relative to Telegram’s hosted API
* you already run stable dedicated infrastructure
* you can benchmark p50/p95 before and after

### Expected impact

Unknown; environment-dependent.

---

# Complete Prioritized Plan

## Priority 0: Instrumentation first

Before or alongside changes, add stage timings for:

```text
update_received → callback_answered
update_received → contract_loaded
update_received → membership_checks_done
update_received → decision_ready
decision_ready → moderation_done
decision_ready → message_done
update_received → full_flow_done
```

Also capture:

* p50 / p95 / p99 by Telegram method
* cache hit rates
* count of skipped moderation calls
* retries / rate-limit events 

---

## Priority 1: Immediate engineering changes

1. Answer callback queries immediately
2. Parallelize membership checks
3. Remove `getChatMemberCount` from hot paths
4. Cache contract/config reads
5. Skip redundant moderation calls

### Expected result

Fastest path to visible improvement.

---

## Priority 2: Cache and state layer

1. Add Redis membership cache
2. Add contract revisioned cache
3. Add moderation state cache
4. Add stale-while-revalidate for low-risk config reads

### Expected result

Large wins for repeated interactions and burst traffic.

---

## Priority 3: Async and concurrency layer

1. Move detailed logging off hot path
2. Use `grammy runner` if on long polling
3. Use `sequentialize` for per-chat/per-user state
4. Add `auto-retry`

### Expected result

Better throughput, fewer race conditions, more stable p95/p99.

---

## Priority 4: Optional experiments

1. Webhook replies only for `answerCallbackQuery`
2. Local Bot API server benchmark
3. Message editing instead of extra sends where UX allows
4. Precomputed verification UI payloads

### Expected result

Incremental improvements, not the main win.

---

# Expected Performance After Optimization

Your uploaded plan estimates:

* verification avg: **1323 ms → 700–900 ms**
* verification p95: **2171 ms → <1500 ms**
* Telegram avg: **479 ms → 350–400 ms**
* throughput under load: **2–3× improvement**  

My view:

## High-confidence target

```text
verification avg: 700–900 ms
verification p95: 1300–1600 ms
```

## Plausible but lower-confidence target

```text
verification avg: 600–750 ms
```

That lower range will depend on:

* how much of the current flow is truly sequential
* how many membership checks are repeated
* how often moderation calls can be skipped
* whether there are hidden waits or retries not visible in current telemetry

---

# Recommended Implementation Blueprint

## Hot-path pseudocode

```ts
bot.callbackQuery("verify", async (ctx) => {
  const started = Date.now();

  // 1. Immediate client ack
  await ctx.answerCallbackQuery();

  // 2. Fast config load
  const contract = await getVerificationContractCached(ctx.chat!.id);

  // 3. Membership verdict cache
  const cachedVerdict = await getCachedVerifyVerdict(
    ctx.chat!.id,
    ctx.from!.id,
    contract.revision
  );

  let verdict;
  if (cachedVerdict) {
    verdict = cachedVerdict;
  } else {
    const checks = await Promise.allSettled(
      contract.requiredChannels.map((channelId) =>
        ctx.api.getChatMember(channelId, ctx.from!.id)
      )
    );

    verdict = evaluateMembershipChecks(checks, contract);
    await cacheVerifyVerdict(ctx.chat!.id, ctx.from!.id, contract.revision, verdict);
  }

  // 4. Idempotent moderation
  const currentState = await getCachedModerationState(ctx.chat!.id, ctx.from!.id);
  const desiredState = verdict.allowed ? "unrestricted" : "restricted";

  if (currentState !== desiredState) {
    await applyModeration(ctx, desiredState);
    await setCachedModerationState(ctx.chat!.id, ctx.from!.id, desiredState);
  }

  // 5. Send or edit user-facing message
  await respondToVerificationResult(ctx, verdict);

  // 6. Async logs
  queueVerificationLog({
    chatId: ctx.chat!.id,
    userId: ctx.from!.id,
    verdict,
    latencyMs: Date.now() - started,
  });
});
```

---

# Final Conclusions

## What is actually slowing Nezuko down

The main problem is **Telegram round trips plus sequential orchestration**, not InsForge. Your own internal telemetry supports that clearly. 

## What will make it faster

The biggest improvements will come from:

1. **Parallel membership checks**
2. **Short-TTL Redis verdict caching**
3. **Skipping unnecessary moderation calls**
4. **Immediate callback acknowledgment**
5. **Removing expensive non-essential Telegram calls from the hot path**
6. **Safe grammY concurrency setup**

## What should not be overestimated

* InsForge-specific tuning
* webhook replies as a general solution
* local Bot API server as a guaranteed speed boost

## Best practical outcome

A **30–50% reduction** is plausible, with the most defensible target being roughly **1323 ms → 700–900 ms average verification latency** if the first three solutions are implemented well and measured properly.  

---

# Solutions Checklist

```markdown
[ ] Answer callback queries immediately
[ ] Parallelize all getChatMember checks with Promise.allSettled
[ ] Add Redis membership verdict cache
[ ] Add revisioned contract/config cache
[ ] Add moderation-state cache
[ ] Skip redundant restrictChatMember calls
[ ] Remove getChatMemberCount from hot paths
[ ] Move detailed logging off the hot path
[ ] Add end-to-end stage telemetry
[ ] Use grammY runner if on long polling
[ ] Use sequentialize for stateful flows
[ ] Add auto-retry for resiliency
[ ] Benchmark webhook reply for answerCallbackQuery only
[ ] Benchmark local Bot API server before adopting
```

If you want the next step, I can turn this into a **repo-ready Markdown document with code patches and exact cache key design**.

[1]: https://core.telegram.org/bots/api "Telegram Bot API"
[2]: https://grammy.dev/advanced/deployment.html "Deployment Checklist | grammY"
[3]: https://grammy.dev/ref/runner/sequentialize "sequentialize | grammY"
[4]: https://grammy.dev/plugins/auto-retry "Retry API Requests (auto-retry) | grammY"
[5]: https://github.com/InsForge/InsForge/blob/main/README.md "InsForge/README.md at main · InsForge/InsForge · GitHub"
