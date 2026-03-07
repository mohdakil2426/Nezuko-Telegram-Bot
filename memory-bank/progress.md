# Progress: What Works, What's Left

## Current Phase: 114 — First-Message Enforcement Flow Restore (with 2026-03-07 follow-up fixes)

> **Active Runtime**: `apps/grammy/` (TypeScript + grammY v1.41.1)
> **Python PTB Bot**: 🗄️ ARCHIVED — preserved in `apps/bot/` for historical reference only. Not maintained.

---

## ✅ What Works (Confirmed as of Phase 113)

### grammY Bot Runtime

| Capability                     | Implementation                                                          | Status       |
| ------------------------------ | ----------------------------------------------------------------------- | ------------ |
| **Standalone mode**            | `main.ts` → `runStandaloneMode()`                                       | ✅ Ships     |
| **Dashboard mode**             | `main.ts` → `runDashboardMode()` → `BotManager`                         | ✅ Ships     |
| **Multi-bot support**          | `BotManager` + `BotRegistry` + `BotLifecycleManager`                    | ✅ Ships     |
| **Token decryption**           | AES-256-GCM via `encryption.ts` + Security Vault                        | ✅ Ships     |
| **Membership verification**    | `verifyMembership()` — multi-channel AND logic, inline keyboard         | ✅ Ships     |
| **Verification contract read** | RPC when available, direct-table fallback when live schema lags              | ✅ Phase 110 |
| **Idempotent verify/join-request** | Redis NX locks suppress duplicate callback/join-request work       | ✅ Phase 109 |
| **Channel-side cache invalidation** | Required-channel `chat_member` updates refresh membership/verified cache | ✅ Phase 109 |
| **Post-leave enforcement state** | Leaving a required channel revokes verified state and seeds message-path enforcement without immediately re-muting the user | ✅ Phase 114 |
| **Message-path revalidation** | Stale verified users are rechecked on group messages; failures now mute + prompt | ✅ Phase 110 |
| **Delayed verification prompt** | Channel leave is silent; first blocked group message deletes, restricts, and sends one deduped prompt | ✅ Phase 111 |
| **Burst blocked-message cleanup** | Messages that lose the in-flight enforcement lock are still deleted immediately, preventing older spam from remaining visible | ✅ Phase 112 |
| **Silent leave handling** | Required-channel leave stays silent, seeds fast enforcement-block cache state, and waits for the next blocked group message before muting again | ✅ Phase 114 |
| **Fast block-state message path** | Message enforcement now uses Redis/member-cache state before DB reads and reuses preloaded channel contract data | ✅ Phase 113 |
| **First blocked message flow** | The first blocked group message after a required-channel leave now performs the full delete → restrict → one-prompt flow | ✅ Phase 114 |
| **Join-request-first preference** | `protected_groups.params.join_request_preferred=true` by default     | ✅ Phase 109 |
| **Join restriction**           | `eventsComposer` — mutes on `chat_member` new member                    | ✅ Ships     |
| **Join request handling**      | `eventsComposer` — `chat_join_request` approve/decline + DM             | ✅ Phase 101 |
| **Inline verification button** | `verifyComposer` — `callback_query` handler                             | ✅ Ships     |
| **Admin protection commands**  | `adminComposer` — `/protect`, `/unprotect`, `/settings`, `/status`      | ✅ Phase 102 |
| **Admin guard**                | `adminGuard()` middleware — replies on failure                          | ✅ Phase 103 |
| **Permission guard**           | `permissionCheck()` middleware — replies on 403                         | ✅ Phase 103 |
| **Channel commands**           | `channelsComposer` — `/channels`, `/verify`, `/stats`                   | ✅ Ships     |
| **Composer mounting**          | Real boundary-wrapped composer mounting in `bot-factory.ts`             | ✅ Phase 106 |
| **Command menus**              | `bot-commands.ts` — private/group/admin scopes                          | ✅ Phase 102 |
| **Status writer**              | `status-writer.ts` — 30s DB heartbeat                                   | ✅ Phase 101 |
| **Member sync**                | `member-sync.ts` — 15min counts sync                                    | ✅ Ships     |
| **Command worker**             | `command-worker.ts` — realtime + 30s poll                               | ✅ Phase 101 |
| **Realtime client**            | `realtime-client.ts` — socket.io connection                             | ✅ Phase 101 |
| **Graceful shutdown**          | `shutdown.ts` — SIGINT/SIGTERM handling                                 | ✅ Ships     |
| **Health endpoint**            | `health.ts` — `/health` HTTP server with reporter/degraded support       | ✅ 2026-03-07 follow-up |
| **Runner stall detection**     | Poll-heartbeat tracking + watchdog restart for managed bots, with intentional-stop guards | ✅ 2026-03-07 follow-up |
| **Unexpected runner recovery** | `RunnerHandle.task()` supervision triggers bot restart on stop/failure   | ✅ 2026-03-07 follow-up |
| **Duplicate-start protection** | `process-lock.ts` — blocks multiple local pollers for same mode/bot     | ✅ Phase 107 |
| **HTML parse mode**            | Custom API transformer (not `parseMode()`)                              | ✅ Ships     |
| **Redis L1 cache**             | `ioredis` with `nezuko:v2:` prefix, pipelined bulk delete, health helpers | ✅ Phase 110 |
| **Cache degradation**          | Bot continues when Redis unavailable                                    | ✅ Ships     |
| **DB degradation**             | Standalone boots without INSFORGE\_\*                                   | ✅ Ships     |
| **InsForge request timeout**   | REST calls abort after configured timeout instead of hanging            | ✅ Phase 107 |
| **Pino logger**                | Structured JSON, child loggers per module                               | ✅ Ships     |
| **DB log transport**           | `db-log-transport.ts` — WARN+ logs → `admin_logs` (admin_logs realtime) | ✅ Phase 105 |
| **API call logging**           | `apiLogTransformer` in bot-factory — all calls → `api_call_log`         | ✅ Phase 105 |
| **Vitest tests**               | 151/151 tests passing (26 suites)                                       | ✅ 2026-03-07 follow-up |

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

| Page/Component                     | Status |
| ---------------------------------- | ------ |
| Dashboard overview page            | ✅     |
| Analytics page (3 tabs, 13 charts) | ✅     |
| Groups page                        | ✅     |
| Channels page                      | ✅     |
| Bots management page               | ✅     |
| Logs page (realtime)               | ✅     |
| Settings page                      | ✅     |
| Auth (InsForge + proxy guard)      | ✅     |
| Realtime updates (WebSocket)       | ✅     |
| Central realtime coordinator       | ✅ Phase 113 |
| Route-stable realtime wrappers     | ✅ 2026-03-07 follow-up |
| Dark/Light theme                   | ✅     |
| Optimistic mutations with rollback | ✅     |

---

## 🗄️ Archived: Python PTB Bot Timeline

> **These phases are historical reference. The work was superseded by the grammY rewrite.**

| Phase       | Description                                                                        | Runtime    |
| ----------- | ---------------------------------------------------------------------------------- | ---------- |
| Phase 1–80  | Initial Python PTB bot development                                                 | Python PTB |
| Phase 80–95 | Python bot stabilization, analytics, Redis, encryption                             | Python PTB |
| Phase 96    | grammY TypeScript port begins — canonical runtime switches                         | **grammY** |
| Phase 97    | grammY standalone + dashboard modes complete                                       | grammY     |
| Phase 98    | grammY multi-bot with BotManager                                                   | grammY     |
| Phase 99    | grammY encryption + Security Vault                                                 | grammY     |
| Phase 100   | grammY test coverage foundation                                                    | grammY     |
| Phase 101   | grammY PRD completion + realtime + join requests                                   | grammY     |
| Phase 102   | grammY command menus + /status parity                                              | grammY     |
| Phase 103   | Group command reliability + 127 tests ✅                                           | grammY     |
| Phase 104   | System audit — 14 bugs found, 7 P0/P1 fixed                                        | grammY     |
| Phase 105   | Remaining P2 bugs fixed — log transport, API logging, realtime hook, DB constraint | grammY     |
| Phase 106   | Group command composer mounting fixed; runtime wiring tests expanded               | grammY     |
| Phase 107   | Duplicate poller guard + InsForge request timeouts to reduce command latency       | grammY     |
| Phase 108   | Explicit verify bypasses stale negative cache; group sequentialization narrowed    | grammY     |

---

## ⚠️ Known Issues / Limitations

| Issue                                             | Severity    | Notes                                           |
| ------------------------------------------------- | ----------- | ----------------------------------------------- |
| `update_settings` command handler not implemented | Low         | Logged and ignored; scaffold only               |
| Admin alert channel (bot→admin DM on error)       | Low         | Not wired; `bot.catch()` only logs              |
| Webhook mode                                      | Not planned | grammY uses long-polling via `@grammyjs/runner` |
| Existing duplicate bot processes must be stopped once | Medium  | Code now prevents new duplicates, but old local pollers can still conflict until restarted |
| Standalone `/health` still lacks runner inactivity details | Low | Standalone mode now has self-healing runner recovery, but health output still only exposes static mode/db details |
| Live migration 024 not yet applied                | Medium  | Bot now falls back without the RPC, but live schema should still be aligned |
| `get_user_growth` analytics RPC is broken live    | Medium  | Postgres logs show a `verification_log.user_id` query bug |
| Join-request-first flow still needs full live validation | Pending | Core verify path is now confirmed working live |
| Groups/channels cross-session realtime still incomplete | Medium | Dashboard now has a central realtime coordinator, but true live updates for group/channel admin tables still need dedicated InsForge triggers |
| grammY format check still fails on unrelated files | Low | `apps/grammy/src/database/verification.repo.ts`, `apps/grammy/src/services/idempotency.ts`, and `apps/grammy/src/utils/health.ts` have pre-existing Prettier drift |

---

## 🏗️ Next Steps

1. **Add InsForge triggers for groups/channels/link rows** — finish true cross-session dashboard realtime for admin entity changes.
2. **Apply migration 024 live** — add `get_group_verification_contract` and backfill `join_request_preferred` so fallback is no longer needed.
3. **Validate join-request-first flow live** — verify request-only invite flow approves subscribed users without mute fallback.
4. **Fix `get_user_growth` RPC** — backend analytics query currently references `verification_log` incorrectly.
5. **Docker build** — update `Dockerfile` to point at `apps/grammy` (`bun install` + `bun run build` + `node dist/main.js`).
6. **Expose standalone runner health** — make standalone `/health` include runner inactivity/degraded state like dashboard mode.

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

_Last Updated: 2026-03-07 (Phase 114 + runner self-healing / health visibility follow-up documented)_
