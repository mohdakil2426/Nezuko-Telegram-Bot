# Active Context: Current State

### Current Status

**Phase 110: Verification Enforcement Recovery + Redis Hardening — COMPLETE ✅**

The post-audit stabilization work is now documented:

- Phase 106 fixed the broken composer mounting in `bot-factory.ts` that caused many group commands to receive no reply at all.
- Phase 107 fixed the main latency causes: duplicate long-polling processes for the same bot token and slow-hanging InsForge REST calls.
- Phase 108 fixed a verification false-negative where users who joined a channel after an initial failed attempt could still be reported as missing because a stale negative membership cache entry was reused.
- Phase 108 also narrowed the per-group sequentialization queue so busy groups no longer serialize unrelated users behind a single `chat.id` key.
- Phase 109 replaced the hot verification read with a single `get_group_verification_contract` RPC, added Redis NX idempotency locks for verify/join-request paths, and invalidates membership state from channel-side `chat_member` events.
- Protected groups now default `params.join_request_preferred=true`, and approved join requests seed verified cache so users avoid a second mute/unmute cycle on entry.
- Follow-up in Phase 109 fixed a critical regression where `isUserVerified()` treated any historical `verified` row as permanent truth. It now checks only the latest verification status, and channel leave events actively re-mute affected users and resend verification prompts in linked groups.
- Phase 110 fixed the remaining enforcement gap: if Telegram does not emit a required-channel leave event, stale DB verification no longer lets the user chat indefinitely. Group messages now trigger a fresh membership revalidation once the latest verified state is stale, and failures now mute + log + re-prompt instead of only deleting the message.
- Phase 110 also made verification contract reads resilient when live InsForge is missing RPC `get_group_verification_contract`; the bot now falls back to direct table reads instead of throwing through the enforcement path.
- Redis was hardened in Phase 110 with `mget()`, pipelined `delMany()`, and cache health helpers so invalidation is cheaper and degradation is easier to observe.
- Live checks on 2026-03-07 confirmed Redis is healthy (`nezuko-redis-local` healthy, `redis-cli ping` => `PONG`), live InsForge still lacks RPC `get_group_verification_contract`, and the corrected enforcement flow is now confirmed working properly in real usage.
- Latest grammY quality gates after the hardening pass: type-check ✅ lint ✅ tests 139/139 ✅ build ✅
- Web remains green from Phase 105: type-check ✅ lint ✅ format ✅ build ✅

> **Python PTB bot (`apps/bot/`) is ARCHIVED as of Phase 96 — not maintained, not developed.**

---

## Phase 107: Bot Latency Investigation & Fix (2026-03-07)

### Root Causes Confirmed

| Issue | Root Cause | Status |
| --- | --- | --- |
| Bot replies were very slow or inconsistent | Multiple local bot processes were polling the same token, producing `getUpdates` 409 conflicts | ✅ Fixed in code, operational restart still required |
| DB-backed commands could hang for too long | `InsForgeClient` had no request timeout, so API/network failures stalled command handling | ✅ Fixed |

### Evidence Captured

| Source | Finding |
| --- | --- |
| `apps/grammy/runtime.log` | Repeated `409 Conflict: terminated by other getUpdates request` |
| `apps/grammy/runtime-2.log` | Same duplicate poller conflict during long polling |
| `apps/grammy/runtime-3.log` | Repeated InsForge failures: socket open failures, heartbeat write failures, command poll errors, connection resets |

### Files Changed in Phase 107

| File | Change |
| --- | --- |
| `apps/grammy/src/utils/process-lock.ts` | **NEW** startup lock to prevent duplicate bot instances on the same machine |
| `apps/grammy/src/main.ts` | Acquires/releases process lock and injects InsForge request timeout config |
| `apps/grammy/src/core/insforge-client.ts` | Added `AbortController`-based fetch timeout wrapper for all REST calls |
| `apps/grammy/src/config.ts` | Added `INSFORGE_REQUEST_TIMEOUT_MS` config with 5000ms default |
| `tests/grammy/unit/core/config.test.ts` | Added config coverage for timeout env handling |
| `tests/grammy/unit/database/insforge-client.test.ts` | Added timeout behavior coverage |

### Operational Note

- The code now blocks future duplicate starts, but already-running duplicate `bun`/`node` bot processes must still be stopped once so only one polling instance remains active.

---

## Phase 108: Verification Cache Correctness + Group Throughput Fix (2026-03-07)

### Root Causes Confirmed

| Issue | Root Cause | Status |
| --- | --- | --- |
| User joined required channel but Verify still said “not joined” | Negative `member:{channelId}:{userId}` cache entries were reused for up to 5 minutes, so explicit verify clicks could trust stale “not a member” state | ✅ Fixed |
| Group-only responses felt late under traffic | `sequentializeMiddleware` keyed all updates by `chat.id`, so one busy group serialized unrelated users behind a single queue | ✅ Fixed |

### Evidence Captured

| Source | Finding |
| --- | --- |
| `apps/grammy/src/services/verification.ts` | Membership checks cached both positive and negative results with the same 5 minute TTL |
| `apps/grammy/src/middleware/sequentialize.ts` | All group traffic was serialized by chat only |
| InsForge metadata + SQL | Protected group and channel link existed live, but `verification_log` still had 0 rows during the broken verification reports |
| `apps/grammy/runtime.log` + `runtime-3.log` | Separate operational issues also existed: duplicate pollers and intermittent InsForge connectivity failures |

### Files Changed in Phase 108

| File | Change |
| --- | --- |
| `apps/grammy/src/services/verification.ts` | Added `bypassNegativeCache` option so explicit verify clicks force a fresh Telegram membership check when Redis says “not joined” |
| `apps/grammy/src/composers/verify.ts` | Explicit verify path now calls `verifyMembership(..., { bypassNegativeCache: true })` |
| `apps/grammy/src/core/constants.ts` | Added `MEMBER_NEGATIVE_CACHE_TTL=30` while keeping positive membership cache at 5 minutes |
| `apps/grammy/src/middleware/sequentialize.ts` | Queue key narrowed to `chatId:userId` for ordinary user traffic; commands and membership updates remain chat-serialized |
| `apps/grammy/src/composers/events.ts` | Group message filter now checks verified cache/DB before doing the extra admin membership roundtrip |
| `tests/grammy/unit/services/verification.test.ts` | Added stale negative cache and short negative TTL coverage |
| `tests/grammy/unit/middleware/sequentialize.test.ts` | Added queue-key behavior coverage |

### Live Backend Findings

- `protected_groups`: 1 live protected group (`-1003283505627`)
- `group_channel_links`: 1 live required channel link
- `enforced_channels`: 1 live required channel (`@devicemasker`)
- `verification_log`: now contains live verification records from real usage
- `api_call_log`: historical RLS failure was observed on 2026-03-06, but later live writes succeeded

### Operational Note

- Phase 108 improves correctness and throughput in code, but a clean single-process restart is still required because old duplicate pollers can keep causing `409 getUpdates` conflicts even after the code fix.

---

## Phase 109: Verification Contract Hardening + Join-Request Preference (2026-03-07)

### Root Causes Confirmed

| Issue | Root Cause | Status |
| --- | --- | --- |
| Verification hot path still did duplicate DB reads | `verifyMembership()` still loaded group enforcement state with multiple queries | ✅ Fixed |
| Duplicate verify/join-request work could still happen under retried updates | No idempotency lock existed for callback or join-request processing | ✅ Fixed |
| Channel joins/leaves only refreshed membership state on explicit verify | Required-channel `chat_member` updates were not invalidating membership/verified cache | ✅ Fixed |
| Join-request path existed but was not the preferred persisted mode | Group configuration did not persist a join-request-first preference | ✅ Fixed |

### Files Changed in Phase 109

| File | Change |
| --- | --- |
| `apps/grammy/src/core/insforge-client.ts` | Added `rpc()` support for InsForge SQL functions |
| `apps/grammy/src/core/cache.ts` | Added `setIfAbsent()` for Redis NX idempotency locks |
| `apps/grammy/src/database/group-contract.repo.ts` | **NEW** single-read verification contract repo |
| `apps/grammy/src/services/idempotency.ts` | **NEW** short-lived idempotency lock helper |
| `apps/grammy/src/services/verification.ts` | Switched to verification-contract RPC and now returns cache metadata + checked channel IDs |
| `apps/grammy/src/composers/events.ts` | Added idempotent join-request handling, verified-cache seeding, join-request approval cache, and channel-side membership invalidation |
| `apps/grammy/src/database/verification.repo.ts` | `isUserVerified()` now checks the latest verification row instead of any historical success |
| `apps/grammy/src/composers/events.ts` | Channel leave events now re-mute users in linked groups and resend verification prompts |
| `apps/grammy/src/composers/verify.ts` | Added verify idempotency lock and single-row verification logging |
| `insforge/migrations/024_verification_contract_hardening.sql` | **NEW** incremental migration for RPC + params backfill |

### Operational Note

- Live InsForge still needs migration `024_verification_contract_hardening.sql` applied before the new bot build is deployed.
- This phase improves duplicate suppression, but single-process runtime discipline from Phase 107 still matters.

---

## Phase 110: Verification Enforcement Recovery + Redis Hardening (2026-03-07)

### Root Causes Confirmed

| Issue | Root Cause | Status |
| --- | --- | --- |
| Users could still chat after leaving a required channel | Group message filter trusted historical verification state unless a channel-side leave event arrived | ✅ Fixed |
| Some live enforcement paths could throw before muting/prompting | Production InsForge does not currently expose RPC `get_group_verification_contract` | ✅ Fixed in bot via fallback |
| Verified-state invalidation did extra one-by-one Redis deletes | Cache client lacked a bulk invalidation primitive | ✅ Fixed |

### Live Evidence Captured

| Source | Finding |
| --- | --- |
| InsForge `information_schema.routines` | `get_group_verification_contract` missing live; only `get_user_growth` present |
| InsForge `verification_log` | 6 live rows exist for one real verification sequence |
| InsForge `admin_logs` | runtime boot confirms Redis connected/ready and one active bot process |
| Docker + `redis-cli ping` | local Redis container healthy and responds `PONG` |

### Files Changed in Phase 110

| File | Change |
| --- | --- |
| `apps/grammy/src/composers/events.ts` | Message filter now performs fresh revalidation on stale verified users and enforces mute + prompt on message-path failures |
| `apps/grammy/src/database/group-contract.repo.ts` | Falls back to direct `protected_groups` + linked-channel reads when RPC is absent |
| `apps/grammy/src/database/verification.repo.ts` | Added latest verification state lookup with timestamp |
| `apps/grammy/src/core/constants.ts` | Added stale-verification recheck interval constant |
| `apps/grammy/src/core/cache.ts` | Added `mget()`, pipelined `delMany()`, and Redis health helpers |
| `tests/grammy/helpers/mock-deps.ts` | Extended cache mocks for new Redis methods |
| `tests/grammy/integration/bot-factory-runtime.test.ts` | Updated runtime coverage for bulk verified-cache invalidation |
| `tests/grammy/unit/database/verification-repo.test.ts` | Updated latest-state query expectations |

### Operational Note

- Migration `024_verification_contract_hardening.sql` is still recommended live, but the bot no longer hard-depends on the RPC to enforce verification.
- Message-path revalidation closed the missed-`chat_member` gap; live verification enforcement is now working properly after the fix.

---

## Phase 106: grammY Group Command Wiring Fix (2026-03-06)

### Root Cause

| Issue | Root Cause | Status |
| --- | --- | --- |
| Many group commands produced no reply | `composer.errorBoundary(...)` was applied incorrectly in `bot-factory.ts`, so several composers were effectively not mounted into the real bot middleware chain | ✅ Fixed |

### Files Changed in Phase 106

| File | Change |
| --- | --- |
| `apps/grammy/src/core/bot-factory.ts` | Mounted each composer inside a real protected error boundary instead of replacing it with an empty wrapper |
| `tests/grammy/integration/bot-factory-runtime.test.ts` | Added runtime wiring coverage for shipped group commands through the actual bot factory |

---

## Phase 105: Remaining P2 Bug Fixes (2026-03-06)

### Bugs Fixed in Phase 105

| Bug                                                  | Root Cause                                                                                                               | Status          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------- |
| BUG-09 (re-verified)                                 | `logVerification()` was already called in `verify.ts`                                                                    | ✅ Already done |
| BUG-10: `admin_logs` never populated                 | No pino DB transport existed                                                                                             | ✅ Fixed        |
| BUG-11: `api_call_log` never populated               | No API call logging transformer                                                                                          | ✅ Fixed        |
| BUG-13: Realtime hook reconnect loop                 | `connectionState` in `useEffect` deps caused `disconnect()` on every state change                                        | ✅ Fixed        |
| **HIDDEN BUG**: `verify.ts` logged `"failed"` status | DB `CHECK` constraint only allows `verified\|restricted\|error` — `"failed"` caused silent 409 on every non-member check | ✅ Fixed        |

### Files Changed in Phase 105

| File                                              | Change                                                                                                    |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/core/db-log-transport.ts`                    | **NEW** — pino `DestinationStream` that forwards WARN+ to `admin_logs`                                    |
| `src/utils/logger.ts`                             | Upgraded to support `pino.multistream` with optional extra destinations                                   |
| `src/main.ts`                                     | Wires DB log transport into both standalone and dashboard startup modes                                   |
| `src/core/bot-factory.ts`                         | Added `apiLogTransformer` — logs all Telegram API calls to `api_call_log`                                 |
| `src/composers/verify.ts`                         | Changed failed verification status from `"failed"` → `"restricted"` (DB constraint)                       |
| `src/database/verification.repo.ts`               | Removed `"failed"` from `LogVerificationData.status` union type                                           |
| `apps/web/src/lib/hooks/use-realtime-insforge.ts` | Fixed reconnect loop: `connectionState` ref + removed from deps, unmount-only cleanup via `disconnectRef` |

---

## Phase 104: System Audit & Bug Fixes (COMPLETE ✅)

### Root Causes of "Commands Not Working" + "No Web Data"

| Bug                                        | Root Cause                                                                                | Status                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------- | --------------------- |
| BUG-02: `/protect` silently fails          | `protected_groups.owner_id` FK → `owners.user_id` but `owners` table was **always empty** | ✅ Fixed              |
| BUG-04: Errors invisible to user           | Error boundary in `bot-factory.ts` only logged errors, never replied to user              | ✅ Fixed              |
| BUG-05: Double `/start` `/help` replies    | Both `wireCoreCommands()` and `adminComposer` had these handlers                          | ✅ Fixed              |
| BUG-06: Any member could call `/status`    | No `adminGuard()` on `/status` command                                                    | ✅ Fixed              |
| BUG-07: DB shows bot "online" when stopped | No stale heartbeat detection; DB never cleaned up on crash                                | ✅ Fixed (DB updated) |
| BUG-08: Realtime command dispatch broken   | `admin_commands` trigger only fired on `UPDATE`, not `INSERT`                             | ✅ Fixed (DB + SQL)   |
| BUG-12: Wrong migration comment            | `database/types.ts` referenced `009_clean_schema.sql` instead of `023`                    | ✅ Fixed              |

### Files Changed in Phase 104

| File                                              | Change                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------- |
| `src/database/owner.repo.ts`                      | **NEW** — `upsertOwner()` for FK-safe owner creation                  |
| `src/services/channel-linker.ts`                  | Added `upsertOwner()` call before `createGroup()` in Step 7           |
| `src/composers/admin.ts`                          | Removed duplicate `/start`/`/help`; added `adminGuard()` to `/status` |
| `src/core/bot-factory.ts`                         | Added `ctx.reply()` to error boundary so users see error feedback     |
| `src/database/types.ts`                           | Fixed stale comment (009 → 023)                                       |
| `insforge/migrations/023_fresh_grammy_schema.sql` | Fixed `notify_command_event()` + trigger: INSERT OR UPDATE            |
| InsForge DB (live)                                | `bot_status` set to `stopped`; command trigger updated                |

### Remaining P2 Bugs (Not Yet Fixed)

- BUG-09: `logVerification()` not called in `verify.ts` — analytics always zero
- BUG-10: `admin_logs` never populated — no log streaming on web
- BUG-11: `api_call_log` never populated — no API telemetry
- BUG-13: Realtime hook reconnect loop risk in web

---

## Phase 103: grammY Group Command Reliability Fix (COMPLETE ✅)

### Root Cause

| Issue                                                                   | Root Cause                                                                                                     | Status |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------ |
| Some group commands looked dead while `/start` and `/help` still worked | `adminGuard` and `permissionCheck` had silent fail-closed branches (`return` with no reply)                    | ✅     |
| Group admin commands inconsistent in live usage                         | Anonymous-admin / missing-sender cases and membership lookup failures produced no user-visible response        | ✅     |
| Logs insufficient to explain the failure                                | `admin_logs` table currently had no useful recent records; failure happened before meaningful app-side logging | ✅     |

### Implemented This Session

| Area                 | Change                                                                                                           | Status |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- | ------ |
| Admin guard          | `admin-guard.ts` now replies when sender info is unavailable and when admin membership lookup fails              | ✅     |
| Bot permission guard | `permission-check.ts` now replies on 403 and unexpected permission lookup failures instead of silently returning | ✅     |
| User messaging       | Added explicit messages for unavailable admin checks and bot-permission check failures                           | ✅     |
| Coverage             | Added/expanded guard tests for missing sender and failed permission lookups                                      | ✅     |

---

## Phase 102: Command Menu Sync & `/status` Parity (2026-03-06)

| Area               | Change                                                                                                 | Status |
| ------------------ | ------------------------------------------------------------------------------------------------------ | ------ |
| Command sync       | Added shared `core/bot-commands.ts` with private/group/group-admin command scopes and menu-button sync | ✅     |
| Standalone startup | `main.ts` now syncs command menus after `getMe()`                                                      | ✅     |
| Multi-bot startup  | `bot-lifecycle.ts` now syncs command menus for every started dashboard bot                             | ✅     |
| PTB parity         | Added `/status` handler in `admin.ts`                                                                  | ✅     |
| Coverage           | Added tests for command sync and updated admin integration coverage                                    | ✅     |

---

## Phase 101: PRD Completion & Audit Fixes (2026-03-06)

| Area                 | Change                                                                                                                                   | Status |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Dashboard realtime   | `main.ts` now creates `InsForgeRealtimeClient`, connects it in dashboard mode, passes it to `CommandWorker`, and disconnects on shutdown | ✅     |
| Multi-bot lifecycle  | `bot-lifecycle.ts` now starts the real `startStatusWriter(...)` and `startMemberSync(...)` services instead of placeholder intervals     | ✅     |
| Batch verification   | `services/batch-verification.ts` now performs real verification via `verifyMembership(...)` and returns a `Map` keyed by user ID         | ✅     |
| Join requests        | `events.ts` now handles `chat_join_request`, approves verified users, declines missing users, and DMs guidance                           | ✅     |
| Update subscriptions | `chat_join_request` added to `ALLOWED_UPDATES`                                                                                           | ✅     |
| Data typing          | `ProtectedGroup` now includes `linked_channels_count`                                                                                    | ✅     |
| Test coverage        | Added runtime wiring, command worker, batch verification, and join-request test coverage                                                 | ✅     |

---

## Architecture Notes (Current)

The active grammY runtime path is now:

```
Standalone mode
  main.ts
    -> loadConfig() (Zod soft validation)
    -> runStandaloneMode()
    -> createBot(token, deps)
    -> bot.api.getMe() + syncBotCommands()
    -> run(bot, { allowed_updates })
    -> startMemberSync() (if DB available)
    -> setupShutdown()

Dashboard mode
  main.ts
    -> runDashboardMode()
    -> InsForgeRealtimeClient.connect()
    -> BotManager.initialize()   ← fetches bot_instances, decrypts tokens, starts each bot
    -> BotManager.startSyncLoop() ← 30s reconciliation loop
    -> CommandWorker.start()     ← realtime + 30s poll fallback
    -> await SIGINT/SIGTERM
    -> CommandWorker.stop() -> realtime.disconnect() -> manager.shutdown() -> cache.quit()

Per managed bot (dashboard mode)
  BotLifecycleManager.startBot()
    -> createBotWithDeps(bot, deps)   ← wires all middleware + composers
    -> bot.api.getMe() + syncBotCommands()
    -> run(bot, { allowed_updates })
    -> startStatusWriter(...)         ← 30s heartbeat
    -> startMemberSync(...)           ← 15min sync
```

### Key grammY Implementation Facts (from code inspection)

| Fact                          | Detail                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| `htmlTransformer`             | Custom `Transformer` installed on `bot.api.config` — sets `parse_mode: "HTML"` on all send methods        |
| Core commands wired inline    | `/start` and `/help` wired directly in `bot-factory.ts` `wireCoreCommands()` — not via composer singleton |
| `CACHE_PREFIX = "nezuko:v2:"` | All Redis keys use this prefix to avoid conflict with old Python bot keys                                 |
| `botInstanceId = 0`           | Standalone mode sentinel — skips `bot_status` upsert (no `bot_instances` FK row)                          |
| `CommandsFlavor` removed      | `NezukoContext` does NOT include `CommandsFlavor` — grammY built-in `.command()` is used                  |
| `token_encrypted` column      | `bot_instances` table uses this column name in `023_fresh_grammy_schema.sql`                              |

### Middleware Order (CRITICAL — do not reorder)

```typescript
// API Transformers
bot.api.config.use(autoRetry({ maxRetryAttempts: 3 }));
bot.api.config.use(htmlTransformer);  // custom Transformer, NOT parseMode()

// Middleware chain
[DEBUG_UPDATES middleware — only when DEBUG_UPDATES=true]
bot.use(sequentializeMiddleware);     // MUST be first
bot.use(hydrate());                   // no hydrateReply in v1.6.0
bot.use(chatMembers(cache.chatMembersAdapter));
bot.use(contextEnricher(deps));

// Core commands (inline, not via singleton composer)
wireCoreCommands(bot, deps);          // /start, /help

// Composers with errorBoundary
bot.use(adminComposer.errorBoundary(errorHandler));
bot.use(channelsComposer.errorBoundary(errorHandler));
bot.use(migrationComposer.errorBoundary(errorHandler));
bot.use(eventsComposer.errorBoundary(errorHandler));
bot.use(verifyComposer.errorBoundary(errorHandler));
bot.use(fallbackComposer);            // ALWAYS last, no boundary

// Global error handler
bot.catch(...)
```

---

## Quality Gate Status (Phase 107 Baseline)

| Check                                       | Result                |
| ------------------------------------------- | --------------------- |
| `cd apps/grammy && bun run type-check`      | ✅ 0 errors           |
| `cd apps/grammy && bun run lint`            | ✅ 0 warnings         |
| `cd apps/grammy && bun run format:check`    | ✅ All files clean    |
| `cd apps/grammy && bun run test`            | ✅ **139/139 passed** |
| `cd apps/web && bun run type-check`         | ✅ 0 errors           |
| `cd apps/web && bun run lint`               | ✅ 0 warnings         |
| `cd apps/web && bun x prettier src --check` | ✅ All files clean    |

---

## Next Steps

1. **Apply migration 024 live** — keep backend schema aligned with the bot’s preferred contract path.
2. **Live join-request validation** — create/use a join-request invite link and confirm verified users are approved without a mute cycle.
3. **Fix `get_user_growth` RPC** — current analytics function is still broken live.
4. **Keep single-process runtime discipline** — avoid reintroducing long-polling conflicts.

---

_Last Updated: 2026-03-07 (Phase 110 — message-path revalidation, RPC fallback, Redis hardening documented)_
