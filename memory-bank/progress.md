# Progress: What Works, What's Left

## Current Phase: 103 — All Quality Gates Green

> **Active Runtime**: `apps/grammy/` (TypeScript + grammY v1.41.1)
> **Python PTB Bot**: 🗄️ ARCHIVED — preserved in `apps/bot/` for historical reference only. Not maintained.

---

## ✅ What Works (Confirmed as of Phase 103)

### grammY Bot Runtime

| Capability                     | Implementation                                                     | Status       |
| ------------------------------ | ------------------------------------------------------------------ | ------------ |
| **Standalone mode**            | `main.ts` → `runStandaloneMode()`                                  | ✅ Ships     |
| **Dashboard mode**             | `main.ts` → `runDashboardMode()` → `BotManager`                    | ✅ Ships     |
| **Multi-bot support**          | `BotManager` + `BotRegistry` + `BotLifecycleManager`               | ✅ Ships     |
| **Token decryption**           | AES-256-GCM via `encryption.ts` + Security Vault                   | ✅ Ships     |
| **Membership verification**    | `verifyMembership()` — multi-channel AND logic, inline keyboard    | ✅ Ships     |
| **Join restriction**           | `eventsComposer` — mutes on `chat_member` new member               | ✅ Ships     |
| **Join request handling**      | `eventsComposer` — `chat_join_request` approve/decline + DM        | ✅ Phase 101 |
| **Inline verification button** | `verifyComposer` — `callback_query` handler                        | ✅ Ships     |
| **Admin protection commands**  | `adminComposer` — `/protect`, `/unprotect`, `/settings`, `/status` | ✅ Phase 102 |
| **Admin guard**                | `adminGuard()` middleware — replies on failure                     | ✅ Phase 103 |
| **Permission guard**           | `permissionCheck()` middleware — replies on 403                    | ✅ Phase 103 |
| **Channel commands**           | `channelsComposer` — `/channels`, `/verify`, `/stats`              | ✅ Ships     |
| **Command menus**              | `bot-commands.ts` — private/group/admin scopes                     | ✅ Phase 102 |
| **Status writer**              | `status-writer.ts` — 30s DB heartbeat                              | ✅ Phase 101 |
| **Member sync**                | `member-sync.ts` — 15min counts sync                               | ✅ Ships     |
| **Command worker**             | `command-worker.ts` — realtime + 30s poll                          | ✅ Phase 101 |
| **Realtime client**            | `realtime-client.ts` — socket.io connection                        | ✅ Phase 101 |
| **Graceful shutdown**          | `shutdown.ts` — SIGINT/SIGTERM handling                            | ✅ Ships     |
| **Health endpoint**            | `health.ts` — `/health` HTTP server                                | ✅ Ships     |
| **HTML parse mode**            | Custom API transformer (not `parseMode()`)                         | ✅ Ships     |
| **Redis L1 cache**             | `ioredis` with `nezuko:v2:` prefix                                 | ✅ Ships     |
| **Cache degradation**          | Bot continues when Redis unavailable                               | ✅ Ships     |
| **DB degradation**             | Standalone boots without INSFORGE\_\*                              | ✅ Ships     |
| **Pino logger**                | Structured JSON, child loggers per module                          | ✅ Ships     |
| **Vitest tests**               | 127/127 tests passing (21 suites)                                  | ✅ Phase 103 |

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

| Phase       | Description                                                | Runtime    |
| ----------- | ---------------------------------------------------------- | ---------- |
| Phase 1–80  | Initial Python PTB bot development                         | Python PTB |
| Phase 80–95 | Python bot stabilization, analytics, Redis, encryption     | Python PTB |
| Phase 96    | grammY TypeScript port begins — canonical runtime switches | **grammY** |
| Phase 97    | grammY standalone + dashboard modes complete               | grammY     |
| Phase 98    | grammY multi-bot with BotManager                           | grammY     |
| Phase 99    | grammY encryption + Security Vault                         | grammY     |
| Phase 100   | grammY test coverage foundation                            | grammY     |
| Phase 101   | grammY PRD completion + realtime + join requests           | grammY     |
| Phase 102   | grammY command menus + /status parity                      | grammY     |
| Phase 103   | Group command reliability + 127 tests ✅                   | grammY     |

---

## ⚠️ Known Issues / Limitations

| Issue                                             | Severity    | Notes                                           |
| ------------------------------------------------- | ----------- | ----------------------------------------------- |
| `update_settings` command handler not implemented | Low         | Logged and ignored; scaffold only               |
| Admin alert channel (bot→admin DM on error)       | Low         | Not wired; `bot.catch()` only logs              |
| Webhook mode                                      | Not planned | grammY uses long-polling via `@grammyjs/runner` |
| Live validation of dashboard commands             | Pending     | Should be verified in a real Telegram group     |

---

## 🏗️ Next Steps

1. **Live E2E validation** — run dashboard mode against a real Telegram group; test `/protect`, join restriction, inline verification, and realtime command dispatch.
2. **Docker build** — update `Dockerfile` to point at `apps/grammy` (`bun install` + `bun run build` + `node dist/main.js`).
3. **CI/CD** — update GitHub Actions workflow to run the full quality gate (type-check, lint, format:check, test, build) on every push.
4. **`update_settings` scaffold** — implement if/when needed (P2 priority).
5. **Admin alert channel** — wire `bot.catch()` to forward fatal errors to a configured admin chat ID (P2 priority).

---

## Phase 103 Quality Gate Baseline

| Check                 | Result               |
| --------------------- | -------------------- |
| `grammy type-check`   | ✅ 0 errors          |
| `grammy lint`         | ✅ 0 warnings        |
| `grammy format:check` | ✅ All files conform |
| `grammy test`         | ✅ 127/127 passed    |
| `web type-check`      | ✅ 0 errors          |
| `web lint`            | ✅ 0 warnings        |
| `web prettier check`  | ✅ All files conform |

---

_Last Updated: 2026-03-06 (Phase 103 — prettier gates added; PTB bot archived with timeline)_
