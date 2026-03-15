# Progress: What Works, What's Left

## Current Phase: 131 — Proxy Auth Callback Fix Applied (Pending Vercel)

> **Active Runtime**: `apps/grammy/` (Bun + grammY v1.41.1)
> **Last Updated**: 2026-03-15

---

## ✅ Confirmed Working

### Bot Runtime (`apps/grammy/`)

| Feature                                                                  | Status |
| ------------------------------------------------------------------------ | ------ |
| Membership verification (multi-channel AND)                              | ✅     |
| Join-request-first flow (`join_request_preferred=true`)                  | ✅     |
| Inline verify button + callback handling                                 | ✅     |
| Events: new member mute, join-request approve/decline                    | ✅     |
| Message-path revalidation (delayed enforce after channel leave)          | ✅     |
| Admin commands: `/protect`, `/unprotect`, `/status`, `/settings`         | ✅     |
| Interactive settings menu + private chat menu                            | ✅     |
| Setup wizard (`/setup` via conversations)                                | ✅     |
| Proactive rate limiting (`apiThrottler`)                                 | ✅     |
| Two-phase callback ack (S1 — ~363ms avg)                                 | ✅     |
| Contract Redis cache (S6 — 300s TTL)                                     | ✅     |
| Restricted state seeding (S4 — skip redundant mute)                      | ✅     |
| Async log writes (S7 — fire-and-forget)                                  | ✅     |
| Stage telemetry (S11 — per-verify timing logs)                           | ✅     |
| Status heartbeat (30s to `bot_status`)                                   | ✅     |
| Member sync (15min `getChatMemberCount`)                                 | ✅     |
| Command worker (realtime + 30s poll fallback)                            | ✅     |
| Multi-bot support (`BotManager` + `BotRegistry` + `BotLifecycleManager`) | ✅     |
| Fast runner restart — `restartRunnerOnly()` (~1–2s vs 10–15s full)       | ✅     |
| Runner stall watchdog (2min threshold)                                   | ✅     |
| Serialized transition locks per bot (no 409 races)                       | ✅     |
| Token decryption (AES-256-GCM via Security Vault)                        | ✅     |
| Graceful shutdown (SIGINT/SIGTERM)                                       | ✅     |
| Health endpoint (`/health` HTTP + reporter/degraded support)             | ✅     |
| Keep-alive self-ping (`KEEP_ALIVE_URL`)                                  | ✅     |
| Redis L1 cache (`ioredis`, `nezuko:v2:` prefix)                          | ✅     |
| Cache degradation (bot works without Redis)                              | ✅     |
| DB log transport (WARN+ → `admin_logs`)                                  | ✅     |
| API call telemetry (all calls → `api_call_log`)                          | ✅     |
| Duplicate-start protection (`process-lock.ts`)                           | ✅     |
| Pino structured logger (child loggers per module)                        | ✅     |
| `DASHBOARD_MODE=true` (multi-bot from DB)                                | ✅     |
| `DASHBOARD_MODE=false` (single bot from `BOT_TOKEN`)                     | ✅     |

### Infrastructure

| Component                               | Status                               |
| --------------------------------------- | ------------------------------------ |
| DigitalOcean App Platform (bot runtime) | ✅ Online                            |
| Upstash Redis (`rediss://` TLS)         | ✅ Connected                         |
| InsForge BaaS (PostgreSQL + Realtime)   | ✅ Healthy                           |
| GitHub Actions CI (grammy + web)        | ✅ `actions/checkout@v5`             |
| Vercel (web hosting)                    | ✅ Deployed — newest login fix pending |

### Database (Live — InsForge / Migration 023+)

| Table / Component                          | Status                                  |
| ------------------------------------------ | --------------------------------------- |
| `protected_groups`                         | ✅                                      |
| `enforced_channels`                        | ✅                                      |
| `group_channel_links`                      | ✅ M:N with cascade                     |
| `owners`                                   | ✅ BIGINT user_id PK                    |
| `bot_instances`                            | ✅ token_encrypted, is_active           |
| `bot_status`                               | ✅ BIGINT bot_id + bot_instance_id      |
| `admin_commands`                           | ✅ status, payload, result JSONB        |
| `verification_log`                         | ✅ latency_ms, cached, error_type       |
| `api_call_log`                             | ✅                                      |
| `admin_logs`                               | ✅ realtime trigger                     |
| `nezuko_secrets`                           | ✅ Security Vault                       |
| `get_group_verification_contract` RPC      | ✅ **Migration 024 applied 2026-03-15** |
| RLS policies — anon INSERT on write tables | ✅ **Migration 026 applied 2026-03-15** |

### Web Dashboard (`apps/web/`)

| Feature                                      | Status                                        |
| -------------------------------------------- | --------------------------------------------- |
| Dashboard layout + routing                   | ✅                                            |
| Bot status display (realtime)                | ✅                                            |
| Admin commands (start/stop/restart)          | ✅                                            |
| Analytics charts (verification, API calls)   | ✅                                            |
| Settings page (vault actions)                | ✅                                            |
| InsForge auth middleware (`proxy.ts`)        | ✅                                            |
| Google OAuth flow (InsForge built-in auth)   | ⚠️ Login loop — proxy callback fix awaiting Vercel |
| Server-side `initialState` for auth provider | ✅ Secondary hardening applied                  |

---

## ⚠️ Known Issues & Pending

| Issue                                                             | Severity     | Status                                                                                                                                         |
| ----------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Web dashboard login loop** (OAuth callback cookie race)         | **Critical** | Root cause corrected in `apps/web/src/proxy.ts`: auth params now set cookies and redirect once before dashboard SSR runs. Awaiting Vercel deploy. |
| **Realtime `connect_error: Invalid token`** on App Platform       | High         | InsForge Socket.IO rejects service key for realtime auth. Bot falls back to 30s polling — degraded but functional.                             |
| `get_user_growth` RPC broken (analytics chart blank)              | Medium       | Function not returning correct data. Needs investigation.                                                                                      |
| Runner crash storm — 409 Conflict on App Platform redeploy        | Medium       | Happens when 2 replicas briefly run simultaneously. Self-heals via `restartRunnerOnly`. Mitigate: confirm instance_count=1 after every deploy. |
| `update_settings` command handler not implemented                 | Low          | Logged and ignored (scaffold only).                                                                                                            |
| Admin alert channel (bot → admin DM on error)                     | Low          | Not wired; `bot.catch()` only logs.                                                                                                            |

---

## 🗂️ Migrations Applied

| Migration | Applied           | Notes                                                                                                       |
| --------- | ----------------- | ----------------------------------------------------------------------------------------------------------- |
| 001–022   | ✅ Long ago       | Full schema history                                                                                         |
| 023       | ✅                | Fresh grammY schema (BIGINT Telegram IDs, all tables)                                                       |
| 024       | ✅ **2026-03-15** | `get_group_verification_contract` RPC + `join_request_preferred` backfill                                   |
| 025       | ✅                | (previous)                                                                                                  |
| 026       | ✅ **2026-03-15** | Lock down anon policies — removed READ/UPDATE on privileged tables; kept INSERT-only for bot runtime writes |

---

## 🔲 Next Steps (Priority Order)

1. **Verify Vercel deploy** (proxy callback fix) — test login in incognito → should land on `/dashboard`
2. **Fix realtime Socket.IO auth** — investigate InsForge realtime token requirements for server-side connections
3. **Fix `get_user_growth` RPC** — analytics User Growth chart is blank
4. **Validate join-request-first live** — end-to-end test with a real user
5. **Add InsForge triggers for groups/channels** — finish cross-session dashboard realtime

---

## 📊 Quality Gate Baseline (Phase 130)

| Check                 | Result                                  |
| --------------------- | --------------------------------------- |
| `grammy type-check`   | ✅ 0 errors                             |
| `grammy lint`         | ✅ 0 warnings                           |
| `grammy format:check` | ✅ clean                                |
| `grammy test`         | ✅ 163/163 pass                         |
| `grammy build`        | ✅ 0 errors                             |
| `web type-check`      | ✅ 0 errors                             |
| `web lint`            | ✅ 0 warnings                           |
| `web build`           | ✅ 0 errors                             |
| Bot live heartbeat    | ✅ `8716661547` online                  |
| Migration 024         | ✅ RPC active                           |
| Migration 026         | ✅ Policies locked + bot INSERT rescued |
