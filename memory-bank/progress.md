# Progress: What Works, What's Left

## Current Phase: 110 — Verification Enforcement Recovery, RPC Fallback, Redis Hardening

> **Active Runtime**: `apps/grammy/` (TypeScript + grammY v1.41.1)
> **Python PTB Bot**: 🗄️ ARCHIVED — preserved in `apps/bot/` for historical reference only. Not maintained.

---

## ✅ What Works (Confirmed as of Phase 110)

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
| **Post-leave re-restriction** | Leaving a required channel now re-mutes the user and re-sends the join/verify prompt | ✅ Phase 109 |
| **Message-path revalidation** | Stale verified users are rechecked on group messages; failures now mute + prompt | ✅ Phase 110 |
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
| **Health endpoint**            | `health.ts` — `/health` HTTP server                                     | ✅ Ships     |
| **Duplicate-start protection** | `process-lock.ts` — blocks multiple local pollers for same mode/bot     | ✅ Phase 107 |
| **HTML parse mode**            | Custom API transformer (not `parseMode()`)                              | ✅ Ships     |
| **Redis L1 cache**             | `ioredis` with `nezuko:v2:` prefix, pipelined bulk delete, health helpers | ✅ Phase 110 |
| **Cache degradation**          | Bot continues when Redis unavailable                                    | ✅ Ships     |
| **DB degradation**             | Standalone boots without INSFORGE\_\*                                   | ✅ Ships     |
| **InsForge request timeout**   | REST calls abort after configured timeout instead of hanging            | ✅ Phase 107 |
| **Pino logger**                | Structured JSON, child loggers per module                               | ✅ Ships     |
| **DB log transport**           | `db-log-transport.ts` — WARN+ logs → `admin_logs` (admin_logs realtime) | ✅ Phase 105 |
| **API call logging**           | `apiLogTransformer` in bot-factory — all calls → `api_call_log`         | ✅ Phase 105 |
| **Vitest tests**               | 139/139 tests passing (23 suites)                                       | ✅ Phase 110 |

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
| Live migration 024 not yet applied                | Medium  | Bot now falls back without the RPC, but live schema should still be aligned |
| `get_user_growth` analytics RPC is broken live    | Medium  | Postgres logs show a `verification_log.user_id` query bug |
| Join-request-first flow still needs full live validation | Pending | Core verify path is now confirmed working live |

---

## 🏗️ Next Steps

1. **Apply migration 024 live** — add `get_group_verification_contract` and backfill `join_request_preferred` so fallback is no longer needed.
2. **Validate join-request-first flow live** — verify request-only invite flow approves subscribed users without mute fallback.
3. **Fix `get_user_growth` RPC** — backend analytics query currently references `verification_log` incorrectly.
4. **Docker build** — update `Dockerfile` to point at `apps/grammy` (`bun install` + `bun run build` + `node dist/main.js`).
5. **CI/CD** — update GitHub Actions workflow to run the full quality gate (type-check, lint, format:check, test, build) on every push.

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

_Last Updated: 2026-03-07 (Phase 110 — message-path revalidation, RPC fallback, Redis hardening documented)_
