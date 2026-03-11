# Progress: What Works, What's Left

## Current Phase: 125 — Dashboard Performance & Cost Optimization (Next.js 16 PPR · Cache Components · Cost Pruning)

> **Active Runtime**: `apps/grammy/` (TypeScript + grammY v1.41.1)
> **Python PTB Bot**: 🗄️ ARCHIVED — preserved in `apps/bot/` for historical reference only. Not maintained.

---

## ✅ What Works (Confirmed as of Phase 121)

### grammY Bot Runtime

| Capability                            | Implementation                                                                                                                                                                                            | Status                  |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| **Standalone mode**                   | `main.ts` → `runStandaloneMode()`                                                                                                                                                                         | ✅ Ships                |
| **Dashboard mode**                    | `main.ts` → `runDashboardMode()` → `BotManager`                                                                                                                                                           | ✅ Ships                |
| **Multi-bot support**                 | `BotManager` + `BotRegistry` + `BotLifecycleManager`                                                                                                                                                      | ✅ Ships                |
| **Token decryption**                  | AES-256-GCM via `encryption.ts` + Security Vault                                                                                                                                                          | ✅ Ships                |
| **Membership verification**           | `verifyMembership()` — multi-channel AND logic, inline keyboard                                                                                                                                           | ✅ Ships                |
| **Two-phase callback ack (S1)**       | `answerCallbackQuery` called immediately before verification work; user sees response in ~363 ms avg                                                                                                      | ✅ Phase 115            |
| **allSettled membership checks (S2)** | `Promise.allSettled` in `verifyMembership` — one channel error doesn't abort others                                                                                                                       | ✅ Phase 115            |
| **Moderation state cache (S4)**       | Skips `restrictChatMember` when user already unrestricted (saves 746 ms avg per call)                                                                                                                     | ✅ Phase 115            |
| **Contract Redis cache (S6)**         | `getGroupVerificationContractCached()` — 300s TTL, invalidated on admin commands                                                                                                                          | ✅ Phase 115            |
| **Async log writes (S7)**             | `logVerification` fire-and-forget in verify + message-path hot paths                                                                                                                                      | ✅ Phase 115            |
| **Stage telemetry (S11)**             | Per-verify `t_ack`, `t_checks`, `t_moderation`, `t_total` logged as structured events                                                                                                                     | ✅ Phase 115            |
| **Verification contract read**        | RPC when available, direct-table fallback when live schema lags                                                                                                                                           | ✅ Phase 110            |
| **Idempotent verify/join-request**    | Redis NX locks suppress duplicate callback/join-request work                                                                                                                                              | ✅ Phase 109            |
| **Channel-side cache invalidation**   | Required-channel `chat_member` updates refresh membership/verified cache                                                                                                                                  | ✅ Phase 109            |
| **Post-leave enforcement state**      | Leaving a required channel revokes verified state and seeds message-path enforcement without immediately re-muting the user                                                                               | ✅ Phase 114            |
| **Message-path revalidation**         | Stale verified users are rechecked on group messages; failures now mute + prompt                                                                                                                          | ✅ Phase 110            |
| **Delayed verification prompt**       | Channel leave is silent; first blocked group message deletes, restricts, and sends one deduped prompt                                                                                                     | ✅ Phase 111            |
| **Burst blocked-message cleanup**     | Messages that lose the in-flight enforcement lock are still deleted immediately, preventing older spam from remaining visible                                                                             | ✅ Phase 112            |
| **Silent leave handling**             | Required-channel leave stays silent, seeds fast enforcement-block cache state, and waits for the next blocked group message before muting again                                                           | ✅ Phase 114            |
| **Fast block-state message path**     | Message enforcement now uses Redis/member-cache state before DB reads and reuses preloaded channel contract data                                                                                          | ✅ Phase 113            |
| **First blocked message flow**        | The first blocked group message after a required-channel leave now performs the full delete → restrict → one-prompt flow                                                                                  | ✅ Phase 114            |
| **Single-click rejoin verification**  | Verify callbacks now absorb short Telegram membership propagation lag and no longer leave sticky post-attempt verify locks/debounce state                                                                 | ✅ 2026-03-07 follow-up |
| **Serialized runner recovery**        | Managed-bot restart/stop/start transitions are now serialized per bot id, preventing sync-loop + watchdog duplicate starts and follow-on `getUpdates` 409 loops                                           | ✅ 2026-03-07 follow-up |
| **Join-request-first preference**     | `protected_groups.params.join_request_preferred=true` by default                                                                                                                                          | ✅ Phase 109            |
| **Join restriction**                  | `eventsComposer` — mutes on `chat_member` new member                                                                                                                                                      | ✅ Ships                |
| **Join request handling**             | `eventsComposer` — `chat_join_request` approve/decline + DM                                                                                                                                               | ✅ Phase 101            |
| **Inline verification button**        | `verifyComposer` — `callback_query` handler                                                                                                                                                               | ✅ Ships                |
| **Admin protection commands**         | `adminComposer` — `/protect`, `/unprotect`, `/settings`, `/status`; `/settings` now sends interactive `settingsMenu` inline keyboard instead of static text                                               | ✅ Phase 121            |
| **Interactive settings menu**         | `src/menus/settings.menu.ts` — dynamic channel list, Refresh (in-place update), Close; module-level `Menu<NezukoContext>`                                                                                 | ✅ Phase 121            |
| **Private chat menu**                 | `src/menus/private.menu.ts` — sub-menu navigation (Commands/How it Works/About/Quick Start + Back), single-message `editMessageText` pattern                                                              | ✅ Phase 121            |
| **Proactive rate limiting**           | `apiThrottler()` as first API transformer — queues before `autoRetry`; 30/s global, 20/min group, 1/s private                                                                                             | ✅ Phase 121            |
| **Auto-quote replies**                | `autoQuote({ allowSendingWithoutReply: true })` globally after `hydrate()` — all replies quote the triggering message                                                                                     | ✅ Phase 121            |
| **Setup wizard (/setup)**             | `src/composers/setup.ts` — guided `@grammyjs/conversations` wizard; all DB calls in `conversation.external()`; max 3 retries; `/cancel` exit                                                              | ✅ Phase 121            |
| **Admin protection commands**         | `adminComposer` — `/protect`, `/unprotect`, `/status` (pre-121 entries remain)                                                                                                                            | ✅ Phase 102            |
| **Admin guard**                       | `adminGuard()` middleware — replies on failure                                                                                                                                                            | ✅ Phase 103            |
| **Permission guard**                  | `permissionCheck()` middleware — replies on 403                                                                                                                                                           | ✅ Phase 103            |
| **Channel commands**                  | `channelsComposer` — `/channels`, `/verify`, `/stats`                                                                                                                                                     | ✅ Ships                |
| **Composer mounting**                 | Real boundary-wrapped composer mounting in `bot-factory.ts`                                                                                                                                               | ✅ Phase 106            |
| **Command menus**                     | `bot-commands.ts` — private/group/admin scopes                                                                                                                                                            | ✅ Phase 102            |
| **Status writer**                     | `status-writer.ts` — 30s DB heartbeat                                                                                                                                                                     | ✅ Phase 101            |
| **Member sync**                       | `member-sync.ts` — 15min counts sync                                                                                                                                                                      | ✅ Ships                |
| **Command worker**                    | `command-worker.ts` — realtime + 30s poll                                                                                                                                                                 | ✅ Phase 101            |
| **Realtime client**                   | `realtime-client.ts` — socket.io connection                                                                                                                                                               | ✅ Phase 101            |
| **Graceful shutdown**                 | `shutdown.ts` — SIGINT/SIGTERM handling                                                                                                                                                                   | ✅ Ships                |
| **Health endpoint**                   | `health.ts` — `/health` HTTP server with reporter/degraded support                                                                                                                                        | ✅ 2026-03-07 follow-up |
| **Runner stall detection**            | Poll-heartbeat tracking + watchdog restart for managed bots, with intentional-stop guards                                                                                                                 | ✅ 2026-03-07 follow-up |
| **Unexpected runner recovery**        | `RunnerHandle.task()` supervision triggers bot restart on stop/failure                                                                                                                                    | ✅ 2026-03-07 follow-up |
| **Duplicate-start protection**        | `process-lock.ts` — blocks multiple local pollers for same mode/bot                                                                                                                                       | ✅ Phase 107            |
| **HTML parse mode**                   | Custom API transformer (not `parseMode()`)                                                                                                                                                                | ✅ Ships                |
| **Redis L1 cache**                    | `ioredis` with `nezuko:v2:` prefix, pipelined bulk delete, health helpers                                                                                                                                 | ✅ Phase 110            |
| **Cache degradation**                 | Bot continues when Redis unavailable                                                                                                                                                                      | ✅ Ships                |
| **DB degradation**                    | Standalone boots without INSFORGE\_\*                                                                                                                                                                     | ✅ Ships                |
| **InsForge request timeout**          | REST calls abort after configured timeout instead of hanging                                                                                                                                              | ✅ Phase 107            |
| **Pino logger**                       | Structured JSON, child loggers per module                                                                                                                                                                 | ✅ Ships                |
| **DB log transport**                  | `db-log-transport.ts` — WARN+ logs → `admin_logs` (admin_logs realtime)                                                                                                                                   | ✅ Phase 105            |
| **API call logging**                  | `apiLogTransformer` in bot-factory — all calls → `api_call_log`                                                                                                                                           | ✅ Phase 105            |
| **S6 contract cache — verify path**   | `verify.ts` now calls `getGroupVerificationContractCached()` before `verifyMembership()`, passing preloaded channels; eliminates 200–280 ms InsForge read on every verify tap                             | ✅ Phase 116            |
| **S4 restricted state seeding**       | `events.ts` `enforceVerificationFailure()` now writes `mod_state:"restricted"` to Redis after `muteUser()`; enables verify.ts to skip redundant `restrictChatMember` on verify-fail path                  | ✅ Phase 116            |
| **Fast runner restart (dashboard)**   | `bot-lifecycle.ts` `restartRunnerOnly()` stops only the stalled poll loop and starts a new one on the same Bot instance; skips getMe/syncBotCommands/DB offline round-trip; recovery in ~1–2 s vs 10–15 s | ✅ Phase 116            |
| **Reduced stall threshold**           | `RUNNER_STALL_THRESHOLD_MS` lowered from 10 min → 2 min; watchdog now fires before users notice the bot is dead                                                                                           | ✅ Phase 116            |
| **Keep-alive module**                 | `utils/keep-alive.ts` self-pings `/health` on a configurable interval; prevents idle spin-down on free-tier cloud hosts; `KEEP_ALIVE_URL` + `KEEP_ALIVE_INTERVAL_MS` env vars                             | ✅ Phase 116            |
| **onBeforeShutdown hook**             | `ShutdownDeps.onBeforeShutdown` optional callback; lets callers inject cleanup (e.g. keep-alive stop) without coupling shutdown.ts to external modules                                                    | ✅ Phase 116            |
| **Config: keep-alive vars**           | `config.ts` exposes `keepAliveUrl` + `keepAliveIntervalMs` validated from env                                                                                                                             | ✅ Phase 116            |
| **Vitest tests**                      | 163/163 tests passing (28 suites)                                                                                                                                                                         | ✅ Phase 116            |

### Database Schema (InsForge — Migration 023)

| Table/Component                  | Status                                    |
| -------------------------------- | ----------------------------------------- |
| `protected_groups`               | ✅ linked_channels_count                  |
| `enforced_channels`              | ✅ linked_groups_count                    |
| `group_channel_links`            | ✅ M:N with cascade                       |
| `owners`                         | ✅ BIGINT user_id PK                      |
| `bot_instances`                  | ✅ token_encrypted, is_active, is_deleted |
| `bot_status`                     | ✅ BIGINT bot_id + bot_instance_id        |
| `admin_commands`                 | ✅ status, payload, result JSONB          |
| `verification_log`               | ✅ latency_ms, cached, error_type         |
| `api_call_log`                   | ✅                                        |
| `admin_logs`                     | ✅                                        |
| `nezuko_secrets`                 | ✅ AES master key vault                   |
| RLS on all tables                | ✅ Migration 012 + 019                    |
| Realtime triggers (5)            | ✅ Migration 020                          |
| Anon policies (bot write access) | ✅ Migration 022                          |

### Web Dashboard

| Page/Component                     | Status                  |
| ---------------------------------- | ----------------------- |
| Dashboard overview page            | ✅                      |
| Analytics page (3 tabs, 13 charts) | ✅                      |
| Groups page                        | ✅                      |
| Channels page                      | ✅                      |
| Bots management page               | ✅                      |
| Logs page (realtime)               | ✅                      |
| Settings page (Streaming + PPR)    | ✅ Phase 125            |
| Auth (InsForge + proxy guard)      | ✅                      |
| Realtime updates (WebSocket)       | ✅                      |
| Central realtime coordinator       | ✅ Phase 113            |
| Route-stable realtime wrappers     | ✅ 2026-03-07 follow-up |
| Dark/Light theme                   | ✅                      |
| Optimistic mutations with rollback | ✅                      |
| Vercel Cost Optimization           | ✅ Phase 125            |
| Partial Prerendering (PPR)         | ✅ Phase 125            |

---

## 🗄️ Archived: Python PTB Bot Timeline

> **These phases are historical reference. The work was superseded by the grammY rewrite.**

| Phase       | Description                                                                                                | Runtime    |
| ----------- | ---------------------------------------------------------------------------------------------------------- | ---------- |
| Phase 1–80  | Initial Python PTB bot development                                                                         | Python PTB |
| Phase 80–95 | Python bot stabilization, analytics, Redis, encryption                                                     | Python PTB |
| Phase 96    | grammY TypeScript port begins — canonical runtime switches                                                 | **grammY** |
| Phase 97    | grammY standalone + dashboard modes complete                                                               | grammY     |
| Phase 98    | grammY multi-bot with BotManager                                                                           | grammY     |
| Phase 99    | grammY encryption + Security Vault                                                                         | grammY     |
| Phase 100   | grammY test coverage foundation                                                                            | grammY     |
| Phase 101   | grammY PRD completion + realtime + join requests                                                           | grammY     |
| Phase 102   | grammY command menus + /status parity                                                                      | grammY     |
| Phase 103   | Group command reliability + 127 tests ✅                                                                   | grammY     |
| Phase 104   | System audit — 14 bugs found, 7 P0/P1 fixed                                                                | grammY     |
| Phase 105   | Remaining P2 bugs fixed — log transport, API logging, realtime hook, DB constraint                         | grammY     |
| Phase 1–80  | Initial Python PTB bot development                                                                         | Python PTB |
| Phase 80–95 | Python bot stabilization, analytics, Redis, encryption                                                     | Python PTB |
| Phase 96    | grammY TypeScript port begins — canonical runtime switches                                                 | **grammY** |
| Phase 97    | grammY standalone + dashboard modes complete                                                               | grammY     |
| Phase 98    | grammY multi-bot with BotManager                                                                           | grammY     |
| Phase 99    | grammY encryption + Security Vault                                                                         | grammY     |
| Phase 100   | grammY test coverage foundation                                                                            | grammY     |
| Phase 101   | grammY PRD completion + realtime + join requests                                                           | grammY     |
| Phase 102   | grammY command menus + /status parity                                                                      | grammY     |
| Phase 103   | Group command reliability + 127 tests ✅                                                                   | grammY     |
| Phase 104   | System audit — 14 bugs found, 7 P0/P1 fixed                                                                | grammY     |
| Phase 105   | Remaining P2 bugs fixed — log transport, API logging, realtime hook, DB constraint                         | grammY     |
| Phase 106   | Group command composer mounting fixed; runtime wiring tests expanded                                       | grammY     |
| Phase 107   | Duplicate poller guard + InsForge request timeouts to reduce command latency                               | grammY     |
| Phase 108   | Explicit verify bypasses stale negative cache; group sequentialization narrowed                            | grammY     |
| Phase 109   | Idempotent verify/join-request with Redis NX locks                                                         | grammY     |
| Phase 110   | Message-path revalidation + InsForge request timeouts                                                      | grammY     |
| Phase 111   | Delayed verification prompt on required-channel leave                                                      | grammY     |
| Phase 112   | Burst blocked-message cleanup (lock-loser deletion)                                                        | grammY     |
| Phase 113   | Fast block-state message path + central realtime coordinator                                               | grammY     |
| Phase 114   | First blocked message flow restore + 2026-03-07 follow-up fixes                                            | grammY     |
| Phase 115   | Latency V2: S1 immediate ack, S2 allSettled, S4 mod cache, S6 contract cache, S7 async logs, S11 telemetry | grammY     |
| Phase 116   | Latency Gap Fixes + Dashboard Runner Self-Healing                                                          | grammY     |
| Phase 117   | grammY Plugin Research & Integration Plan                                                                  | grammY     |
| Phase 121   | grammY Plugin Integration (Throttler · Autoquote · Menu · Conversations)                                   | grammY     |
| Phase 125   | Dashboard Performance & Cost Optimization (Next.js 16 PPR · Cache Components · Cost Pruning)               | Next.js    |

---

## ⚠️ Known Issues / Limitations

| Issue                                                      | Severity    | Notes                                                                                                                                         |
| ---------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `update_settings` command handler not implemented          | Low         | Logged and ignored; scaffold only                                                                                                             |
| Admin alert channel (bot→admin DM on error)                | Low         | Not wired; `bot.catch()` only logs                                                                                                            |
| Webhook mode                                               | Not planned | grammY uses long-polling via `@grammyjs/runner`                                                                                               |
| Existing duplicate bot processes must be stopped once      | Medium      | Code now prevents new duplicates, but old local pollers can still conflict until restarted                                                    |
| Standalone `/health` still lacks runner inactivity details | Low         | Standalone mode has `standalone-watchdog.ts` (file created but not wired into main.ts — deferred)                                             |
| Live migration 024 not yet applied                         | Medium      | Bot now falls back without the RPC, but live schema should still be aligned                                                                   |
| `get_user_growth` analytics RPC is broken live             | Medium      | Postgres logs show a `verification_log.user_id` query bug                                                                                     |
| Join-request-first flow still needs full live validation   | Pending     | Core verify path is now confirmed working live                                                                                                |
| Groups/channels cross-session realtime still incomplete    | Medium      | Dashboard now has a central realtime coordinator, but true live updates for group/channel admin tables still need dedicated InsForge triggers |
| `standalone-watchdog.ts` created but not wired             | Low         | Created as utility; standalone mode 95% unused — deferred                                                                                     |

---

## 🏗️ Next Steps

1. **Add InsForge triggers for groups/channels/link rows** — finish true cross-session dashboard realtime for admin entity changes.
2. **Apply migration 024 live** — add `get_group_verification_contract` and backfill `join_request_preferred` so fallback is no longer needed.
3. **Validate join-request-first flow live** — verify request-only invite flow approves subscribed users without mute fallback.
4. **Fix `get_user_growth` RPC** — backend analytics query currently references `verification_log` incorrectly.
5. **Docker build** — update `Dockerfile` to point at `apps/grammy` (`bun install` + `bun run build` + `node dist/main.js`).
6. **S3 verdict-level L2 cache** — implement `setVerificationVerdict()` in verify.ts to skip repeat getChatMember checks on re-taps.
7. **Wire standalone-watchdog.ts into main.ts** — complete standalone runner supervision if standalone mode gains more users.

---

## Phase 103 Quality Gate Baseline

| Check                 | Result               |
| --------------------- | -------------------- |
| `grammy type-check`   | ✅ 0 errors          |
| `grammy lint`         | ✅ 0 warnings        |
| `grammy format:check` | ✅ All files conform |
| `grammy test`         | ✅ 139/139 passed    |
| `web type-check`      | ✅ 0 errors          |
| `web lint`            | ✅ 0 warnings        |
| `web prettier check`  | ✅ All files conform |

---

_Last Updated: 2026-03-08 (Phase 116 — S6 verify-path gap fix, S4 restricted seeding, fast runner restart in dashboard mode, RUNNER_STALL_THRESHOLD_MS 10 min → 2 min, keep-alive module, 163/163 tests)_
