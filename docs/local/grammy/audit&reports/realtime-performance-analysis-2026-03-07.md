# Realtime Performance Analysis

Date: 2026-03-07
Scope: `apps/grammy`, `apps/web`, InsForge realtime contract, moderation latency, dashboard freshness

## Executive Summary

The platform is not truly end-to-end realtime yet. It is best described as:

- bot moderation path with several synchronous network checks in the hot path
- dashboard sockets that mostly invalidate queries and then wait for RPC/table refetches
- InsForge realtime infrastructure that is already capable of pushing useful payloads, but is not being fully used by the web client

The current moderation slowdown is not caused by one single bug. It is a stacked latency problem:

1. The bot serializes updates per `chatId:userId`, which is correct for race safety.
2. Inside that serialized queue, one blocked message still performs multiple synchronous Redis, InsForge, and Telegram API operations before the full moderation state settles.
3. During bursts, later messages wait behind the first one, and cleanup happens one message at a time.

The dashboard has the opposite problem. Realtime events exist, but many screens still behave like polling screens because websocket payloads are turned into `invalidateQueries` calls instead of direct cache updates.

If the goal is "as realtime as possible", the highest-value path is:

- make moderation decisions depend on fast local/Redis state first
- remove unnecessary synchronous InsForge reads from the message hot path
- batch cleanup burst messages
- move the dashboard from "socket then refetch" to "socket then patch cache"

Literal "100% realtime" is not achievable because Telegram API calls, WebSocket delivery, and network conditions are not zero-latency. The realistic target is sub-second visible reaction in the common path, with graceful fallback during network failure.

## Research Inputs

This report is based on:

- Memory bank review of all six core files
- Repo code analysis in `apps/grammy`, `apps/web`, and `insforge/setup`
- InsForge MCP docs for realtime and SDK usage
- InsForge backend metadata from MCP
- Official docs:
  - grammY runner and concurrency guidance: https://grammy.dev/plugins/runner
  - Telegram Bot API: https://core.telegram.org/bots/api
  - TanStack Query cache update guidance: https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses
  - TanStack Query invalidation guidance: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation

## Current Architecture Snapshot

### Bot

- Canonical runtime is `apps/grammy`
- Uses grammY runner sequentialization via `apps/grammy/src/middleware/sequentialize.ts`
- Uses Redis for membership/verification caches
- Uses InsForge REST through `apps/grammy/src/core/insforge-client.ts`
- Uses InsForge Socket.IO realtime through `apps/grammy/src/core/realtime-client.ts`

### Dashboard

- Next.js app in `apps/web`
- Uses `@insforge/sdk`
- Uses TanStack Query
- Has a custom realtime hook layer in `apps/web/src/lib/hooks/use-realtime-insforge.ts`

### Backend / Realtime

- InsForge realtime channels are already defined in `insforge/setup/001_bootstrap_nezuko.sql`
- Triggers already publish:
  - `verification` to `dashboard`
  - `status_changed` to `bot_status`
  - `command_updated` to `commands`
  - `new_log` to `logs`
  - `bot_instance_changed` to `bot_instances`

This means the backend is not the main blocker for dashboard freshness. The web client is underusing the payloads it already receives.

## Findings: Bot Moderation Latency

### 1. The hot path still does too much synchronous work before it finishes enforcement

In `apps/grammy/src/composers/events.ts`, the group message gate does all of the following before finishing:

- fetches the group verification contract
- checks Redis verified cache
- reads latest verification state from InsForge
- performs admin bypass with Telegram `getChatMember`
- acquires an idempotency lock
- runs `verifyMembership`

Relevant code:

- `apps/grammy/src/composers/events.ts:345`
- `apps/grammy/src/composers/events.ts:360`
- `apps/grammy/src/composers/events.ts:378`
- `apps/grammy/src/composers/events.ts:387`
- `apps/grammy/src/composers/events.ts:401`

This is too much synchronous IO for a moderation path that should react immediately.

### 2. Contract lookup is duplicated

The middleware fetches the contract first in `events.ts`, then `verifyMembership` fetches it again in `apps/grammy/src/services/verification.ts:52`.

That creates avoidable InsForge latency on the most sensitive path.

### 3. Latest verification state is another blocking InsForge read

`getLatestVerificationState` is called before the decisive moderation branch:

- `apps/grammy/src/composers/events.ts:360`
- `apps/grammy/src/database/verification.repo.ts:64`

That DB read may be useful for analytics correctness, but it is expensive in the message hot path. A moderation gate should not need a fresh database lookup to decide whether to delete a burst message.

### 4. Admin bypass adds another Telegram round trip

Admin detection currently uses `ctx.api.getChatMember(ctx.chat.id, ctx.from.id)` before the enforcement branch:

- `apps/grammy/src/composers/events.ts:378`

That is correct functionally, but it is another synchronous network call in the critical path.

### 5. Multi-channel verification is sequential

`verifyMembership` loops channels one by one:

- `apps/grammy/src/services/verification.ts:68`
- `apps/grammy/src/services/verification.ts:69`
- `apps/grammy/src/services/verification.ts:132`

If one group requires several channels and the cache is cold or bypassed, total latency grows linearly with channel count.

### 6. Per-user sequentialization is correct, but it amplifies hot-path slowness

The queue key is `chatId:userId` for ordinary user traffic:

- `apps/grammy/src/middleware/sequentialize.ts:36`
- `apps/grammy/src/middleware/sequentialize.ts:37`

This is the right safety tradeoff. Removing it would risk race conditions and inconsistent enforcement. But because the first blocked message is slow, every later message from that same user waits behind it.

### 7. Current burst cleanup is still one-message-at-a-time

The current fix deletes lock-losing messages individually:

- `apps/grammy/src/composers/events.ts:392`
- `apps/grammy/src/composers/events.ts:394`

That is safer than before, but still not optimal under rapid bursts. Telegram's Bot API supports `deleteMessages`, which can be used as a burst cleanup accelerator if the current grammY version exposes it or if a raw API call is used.

### 8. InsForge timeout is too large for a hot moderation path

`InsForgeClient` defaults to a 5000 ms timeout:

- `apps/grammy/src/core/insforge-client.ts:27`
- `apps/grammy/src/core/insforge-client.ts:49`

That timeout may be reasonable for background operations, but it is too high for a message moderation critical path. If an InsForge request stalls, visible moderation delay becomes unacceptable.

### 9. Logging architecture adds backend pressure under load

DB log forwarding is fire-and-forget, which is good, but it still creates more backend writes:

- `apps/grammy/src/core/db-log-transport.ts:82`
- `apps/grammy/src/core/db-log-transport.ts:83`

The project also records API call telemetry. Even if these writes are not blocking the current update directly, they add backend load during moderation bursts and can worsen total system responsiveness.

## Findings: Dashboard Is Not Truly Realtime

### 1. Realtime mostly means "socket event then refetch"

`useRealtimeChart` subscribes to events and invalidates queries:

- `apps/web/src/lib/hooks/use-realtime-insforge.ts:506`
- `apps/web/src/lib/hooks/use-realtime-insforge.ts:515`

This means the websocket event itself does not update the UI. It only triggers another network fetch.

### 2. Connected polling is still enabled

Even while connected, the hook keeps a refetch interval:

- `apps/web/src/lib/hooks/use-realtime-insforge.ts:501`
- `apps/web/src/lib/hooks/use-realtime-insforge.ts:524`

Many hooks pass `REFETCH_INTERVALS.FALLBACK`, so the dashboard still behaves like a polling dashboard with websocket-triggered extra refetches.

### 3. Multiple widgets subscribe and invalidate independently

Each widget-level hook mounts its own realtime handler and event buffer. One backend event can cause several invalidations and several React updates across multiple widgets.

This creates redundant work and makes the dashboard feel less immediate than it should.

### 4. A central dashboard realtime hook exists but is not the active pattern

`useDashboardRealtime` exists in:

- `apps/web/src/lib/hooks/use-realtime-insforge.ts:415`

But the codebase currently relies more on per-widget subscriptions than a single coordinated dashboard event path.

### 5. Group/channel admin changes are not fully covered by realtime events

Current realtime triggers cover verifications, bot status, logs, commands, and bot instances:

- `insforge/setup/001_bootstrap_nezuko.sql:404`
- `insforge/setup/001_bootstrap_nezuko.sql:442`
- `insforge/setup/001_bootstrap_nezuko.sql:474`
- `insforge/setup/001_bootstrap_nezuko.sql:504`
- `insforge/setup/001_bootstrap_nezuko.sql:533`

There is no equivalent trigger contract for:

- `protected_groups`
- `enforced_channels`
- `group_channel_links`

So group/channel changes from another session are not truly live unless a local mutation invalidates them or a fallback refetch happens.

### 6. Some screens double-process realtime

The logs page consumes direct realtime events and also uses the query-backed logs hook:

- `apps/web/src/app/dashboard/logs/page.tsx:170`
- `apps/web/src/app/dashboard/logs/page.tsx:257`

This causes duplicate work on one of the noisiest screens.

### 7. The activity feed expects more event types than it actually subscribes to

The component maps `member_join`, `member_leave`, and `activity` types:

- `apps/web/src/components/dashboard/activity-feed.tsx:153`

But the realtime subscription only listens to `verification` events:

- `apps/web/src/lib/hooks/use-realtime-insforge.ts:582`

That creates a mismatch between intended live UX and actual delivered event types.

### 8. Refetches are often expensive aggregate RPCs

Many dashboard reads hit RPCs rather than simple object caches:

- `apps/web/src/lib/services/dashboard.service.ts:19`
- `apps/web/src/lib/services/dashboard.service.ts:35`
- `apps/web/src/lib/services/analytics.service.ts:29`
- `apps/web/src/lib/services/analytics.service.ts:75`
- `apps/web/src/lib/services/analytics.service.ts:126`

So every invalidation can become a relatively expensive round trip. This is exactly where direct `setQueryData` cache patching is a better fit for pushed event payloads.

## Findings: InsForge Realtime Capability vs Current Usage

InsForge already supports the pieces needed for a much faster system:

- DB triggers can call `realtime.publish(channel, event, payload)`
- the TypeScript SDK can auto-connect on subscribe
- received payloads include metadata
- clients can subscribe to multiple channels and patch UI directly from payloads

This is important because it means the dashboard is not blocked by missing platform capability. It is blocked by how the current hooks consume those events.

The same applies to the bot side. The bot already has a realtime client for command dispatch, but moderation is still dominated by synchronous REST and Telegram API checks.

## Recommended Direction

## P0: Highest Priority

### 1. Move moderation decisions onto fast local state first

Target behavior:

- if Redis already knows the user is currently blocked or recently failed verification, delete immediately
- do not wait on fresh InsForge reads before deleting obvious burst spam
- only use fresh verification checks for recovery or confirmation

Concretely:

- introduce a short-lived "hot block" Redis state per `groupId:userId`
- set it on channel-leave invalidation and failed verification
- let the first blocked message use that state to delete immediately
- keep slower verification logic as confirmation and prompt orchestration, not as the first visible action

This is the biggest win for perceived realtime moderation.

### 2. Remove duplicated contract fetches from the hot path

`verifyMembership` should accept preloaded channels or a preloaded contract instead of refetching the contract internally.

This removes an avoidable InsForge round trip from every moderation decision.

### 3. Replace sequential channel verification with parallel bounded checks

Current sequential checking is too slow for groups with multiple required channels.

Use a bounded `Promise.allSettled` style strategy for channel membership verification so cold-cache checks complete in parallel rather than serially. Concurrency should still be capped to avoid Telegram flood or burst spikes.

### 4. Add burst cleanup with batch deletion

Current logic deletes messages one by one. Under rapid spam, this still feels slow.

Use a short Redis queue of recent blocked message IDs per `groupId:userId`, then have the lock owner issue a bulk cleanup using `deleteMessages` where available. If bulk deletion is unavailable in the current stack, keep single deletes as fallback.

### 5. Shorten or bypass InsForge dependency in the message hot path

Moderation should not wait up to 5 seconds for InsForge.

Options:

- add a faster timeout for hot-path reads
- cache group verification contract in Redis
- stop reading latest verification state from DB on every message

The practical direction is to prefer Redis plus Telegram truth for hot moderation, and let InsForge remain the durable log/state store.

## P1: Dashboard True Realtime

### 6. Centralize dashboard realtime handling

Stop attaching widget-level realtime invalidation everywhere. Introduce one shared realtime coordinator that:

- subscribes once
- maps payloads once
- patches TanStack Query cache once
- invalidates only when the pushed payload is insufficient

### 7. Use `setQueryData` for payload-driven screens

For data already present in pushed payloads, update cache directly instead of refetching.

Best candidates:

- activity feed
- logs stream
- bot status cards
- bot instances list
- overview counters affected by `verification` events

Keep `invalidateQueries` only for derived aggregates that cannot be updated safely from the payload alone.

### 8. Turn off connected polling for payload-covered queries

If websocket is healthy and the event payload is sufficient, connected polling should be `false`, not "poll slowly anyway".

Polling should be fallback only when:

- websocket is disconnected
- the screen depends on derived aggregates not represented in events

### 9. Add realtime triggers for admin entity changes

If groups, channels, and link rows must be live across sessions, add triggers and channel contracts for:

- `protected_groups`
- `enforced_channels`
- `group_channel_links`

Without those, those screens will continue to feel poll-based.

## P2: System Hygiene and Backpressure

### 10. Reduce optional write pressure

Review how aggressively the system writes:

- `admin_logs`
- API call telemetry
- verification logs

These are useful, but high write volume can increase load and latency. Sampling or buffering non-critical telemetry can help under burst conditions.

### 11. Re-evaluate webhook mode only after hot-path fixes

Switching from long polling to webhooks is not the first fix here.

The dominant problem is synchronous work inside the moderation middleware, not update delivery alone. Webhooks may help at the edges, but they will not solve the current hot-path design by themselves.

## What Should Not Be Done

- Do not remove `sequentialize` for user traffic. That trades correctness for chaos.
- Do not "fix realtime" by reducing polling intervals everywhere. That only increases load.
- Do not keep growing dashboard event invalidation lists. That creates more refetch churn, not better immediacy.
- Do not depend on fresh InsForge reads before every moderation action. Durable storage is not the right first dependency for burst cleanup.

## Recommended Execution Order

### Phase A: Bot Hot Path

1. Remove duplicate contract fetches.
2. Introduce hot blocked-state Redis keys.
3. Skip latest verification DB lookup in ordinary blocked-message handling.
4. Parallelize multi-channel verification with bounded concurrency.
5. Add burst message ID buffering and bulk deletion.

Expected result:

- much faster visible deletion
- fewer surviving burst messages
- less dependence on InsForge latency during moderation

### Phase B: Dashboard Realtime

1. Build one central realtime coordinator hook/provider.
2. Convert logs/activity/bot-status screens from invalidate-refetch to direct cache patching.
3. Disable connected polling on payload-covered queries.
4. Add missing realtime triggers for groups/channels/links.

Expected result:

- dashboard updates appear immediately from pushed payloads
- less RPC load
- less duplicate invalidation churn

### Phase C: Backpressure and Observability

1. Review log and API telemetry volume.
2. Add latency measurements around the new hot path.
3. Track:
   - message delete latency
   - prompt send latency
   - verification latency by channel count
   - dashboard render freshness after realtime events

## Success Metrics

Use these as acceptance targets:

- first blocked message visibly deleted in under 500 ms on warm cache
- burst of 5 to 10 blocked messages cleaned without leaving stale earlier messages behind
- dashboard status/log/activity updates visible without waiting for a follow-up RPC
- group/channel admin changes visible across sessions without manual refresh
- fallback behavior remains correct when websocket or Redis is unavailable

## Bottom Line

The platform already has most of the infrastructure needed for much faster behaviour. The gap is architectural, not foundational.

For the bot, the fix is to stop making the moderation hot path wait on durable-state reads and serial external checks before visible enforcement.

For the dashboard, the fix is to stop treating websocket events as "please refetch later" and start treating them as authoritative incremental updates where possible.

That combination will get the system much closer to true realtime than any isolated polling tweak or transport swap.
