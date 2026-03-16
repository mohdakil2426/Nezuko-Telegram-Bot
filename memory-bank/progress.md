# Progress: What Works, What's Left

## Current Phase: 141 — GitHub Actions Hardening ✅

> **Active Runtime**: `apps/grammy/` (Bun + grammY v1.41.1)
> **Last Updated**: 2026-03-16 18:40 IST

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

| Component                               | Status                                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| DigitalOcean App Platform (bot runtime) | ✅ Online                                                                                         |
| Upstash Redis (`rediss://` TLS)         | ✅ Connected                                                                                      |
| InsForge BaaS (PostgreSQL + Realtime)   | ✅ Healthy                                                                                        |
| GitHub Actions CI (grammy + web)        | ✅ Hardened: web-ci, grammy-ci, codeql, commitlint, release-please, bundle-size, dependency-review |
| grammY Test Isolation                   | ✅ Migrated `tests/grammy` → `apps/grammy/tests` (package portability)                            |
| Vercel (web hosting)                    | ✅ Deploy gated on CI (`web-ci` quality job must pass first)                                      |
| Dependabot                              | ✅ Grouped weekly PRs for web + grammy + actions                                                  |
| Branch protection (`main`)              | ✅ `Quality Gates` required status check                                                          |

### Database (Live — InsForge / Migration 028)

| Table / Component                     | Status                                     |
| ------------------------------------- | ------------------------------------------ |
| `dashboard_admins`                    | ✅ auth allowlist anchor for dashboard RLS |
| `owners`                              | ✅ BIGINT user_id PK                       |
| `bot_instances`                       | ✅ encrypted token store, soft-delete      |
| `bot_status`                          | ✅ BIGINT bot_id + bot_instance_id         |
| `protected_groups`                    | ✅                                         |
| `enforced_channels`                   | ✅                                         |
| `group_channel_links`                 | ✅ M:N with cascade                        |
| `verification_log`                    | ✅ latency_ms, cached, error_type          |
| `api_call_log`                        | ✅                                         |
| `admin_logs`                          | ✅ realtime trigger                        |
| `admin_commands`                      | ✅ status, payload, result JSONB           |
| `nezuko_secrets`                      | ✅ Security Vault                          |
| `bot_instances_safe` view             | ✅ dashboard-safe bot listing              |
| Dashboard/chart RPC set               | ✅ recreated + live-verified               |
| `get_group_verification_contract` RPC | ✅ live                                    |
| Admin-scoped RLS                      | ✅ live                                    |
| Bot anon operational policies         | ✅ live                                    |
| `admin_config`                        | ✅ removed from active schema              |

### Web Dashboard (`apps/web/`)

| Feature                                    | Status                                      |
| ------------------------------------------ | ------------------------------------------- |
| Dashboard layout + routing                 | ✅                                          |
| Bot status display (realtime)              | ✅                                          |
| Admin commands (start/stop/restart)        | ✅                                          |
| Analytics charts (verification, API calls) | ✅                                          |
| Settings page (vault actions)              | ✅                                          |
| InsForge auth middleware (`proxy.ts`)      | ✅                                          |
| Email/password sign-in                     | ✅ official SDK flow on `/login`            |
| Google/GitHub sign-in                      | ✅ `signInWithOAuth()` on `/login`          |
| Auth cookie sync via `/api/auth`           | ✅ official handlers + owner allowlist gate |
| First-login `dashboard_admins` sync        | ✅ server-side upsert through service key   |
| Bot CRUD via `manage-bot` function         | ✅                                          |
| Login compatibility callback route         | ✅ thin redirect-only `/auth/callback`      |

---

## ⚠️ Known Issues & Pending

| Issue                                                       | Severity     | Status                                                                                                                                         |
| ----------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fresh backend requires reseeding**                        | **Critical** | All data was intentionally reset. Security vault master key and first allowlisted dashboard login still need to happen on the live app.        |
| **Realtime `connect_error: Invalid token`** on App Platform | High         | InsForge Socket.IO rejects service key for realtime auth. Bot falls back to 30s polling — degraded but functional.                             |
| Runner crash storm — 409 Conflict on App Platform redeploy  | Medium       | Happens when 2 replicas briefly run simultaneously. Self-heals via `restartRunnerOnly`. Mitigate: confirm instance_count=1 after every deploy. |
| `update_settings` command handler not implemented           | Low          | Logged and ignored (scaffold only).                                                                                                            |
| Admin alert channel (bot → admin DM on error)               | Low          | Not wired; `bot.catch()` only logs.                                                                                                            |

---

## 🗂️ Migrations Applied

| Migration | Applied           | Notes                                                                                                       |
| --------- | ----------------- | ----------------------------------------------------------------------------------------------------------- |
| 001–022   | ✅ Long ago       | Full schema history                                                                                         |
| 023       | ✅                | Fresh grammY schema (BIGINT Telegram IDs, all tables)                                                       |
| 024       | ✅ **2026-03-15** | `get_group_verification_contract` RPC + `join_request_preferred` backfill                                   |
| 025       | ✅                | (previous)                                                                                                  |
| 026       | ✅ **2026-03-15** | Lock down anon policies — removed READ/UPDATE on privileged tables; kept INSERT-only for bot runtime writes |
| 028       | ✅ **2026-03-15** | Destructive fresh rebuild: canonical tables, RPCs, view, RLS, realtime triggers, dashboard admin model      |

---

## 🔲 Next Steps (Priority Order)

1. **Test live owner login end-to-end** — verify `/login` → cookie sync → `dashboard_admins` seed → `/dashboard`
2. **Recreate vault master key** — `nezuko_secrets.master_key` must exist before bot add flows work
3. **Re-add bot records through dashboard** — all previous bot data is gone by design
4. **Fix realtime Socket.IO auth** — investigate InsForge server-side token requirements
5. **Monitor first real data writes** — confirm logs/status/verification/api telemetry populate as expected

---

## 📊 Quality Gate Baseline (Phase 139 — 2026-03-16)

> ⚠️ Web gates below are from Phase 137. After `recharts@3.8.0` bump, web build gate status is **unknown** until CI run after lockfile refresh completes.

| Check                      | Result                                                        |
| -------------------------- | ------------------------------------------------------------- |
| `grammy type-check`        | ✅ 0 errors                                                   |
| `grammy lint`              | ✅ 0 warnings                                                 |
| `grammy format:check`      | ✅ clean                                                      |
| `grammy test`              | ✅ 163/163 pass (in local `apps/grammy/tests/`)               |
| `grammy build`             | ✅ 0 errors                                                   |
| `grammy docker build`      | ✅ fixed (`oven/bun:1.2.23` in Dockerfile)                    |
| `web type-check`           | ✅ 0 errors (recharts 3.x + eslint 10)                        |
| `web lint`                 | ✅ 0 warnings                                                 |
| `web knip`                 | ✅ 0 errors                                                   |
| `web prettier --check`     | ✅ clean                                                      |
| `web build`                | ✅ successful                                                 |
| Live migration 028 apply   | ✅ successful through InsForge MCP                            |
| Live `manage-bot` redeploy | ✅ successful through InsForge MCP                            |
| Live RPC smoke test        | ✅ dashboard + chart RPCs return correct empty-state shapes   |
| Vercel deploy              | ✅ lockfile fix pushed — next deploy should install correctly |

## 📊 CI/CD Baseline (Phase 138+139 — 2026-03-16)

| Check                | Result                                                                             |
| -------------------- | ---------------------------------------------------------------------------------- |
| `codeql.yml`         | ✅ Workflow live, weekly + push triggered                                          |
| `commitlint.yml`     | ✅ Passing (new commits lowercase-compliant)                                       |
| `release-please.yml` | ✅ `v4.4.0` pinned, node.js 24 opt-in at step scope, PR permission enabled in repo |
| `bundle-size.yml`    | ✅ Lightweight Next.js bundle snapshot workflow                                    |
| `dependabot.yml`     | ✅ Weekly grouped updates configured                                               |
| `dependency-review.yml` | ✅ PR dependency risk gate added                                                |
| Auto-fix CI          | ✅ Removed; CI now validates without rewriting branch history                      |
| Vercel deploy gate   | ✅ Hook-only deploy, native auto-deploy disabled; lockfile fixed                   |
| Branch protection    | ✅ `Quality Gates` required status check on `main`                                 |
| README badges        | ✅ Web CI, Bot CI, CodeQL, License badges live                                     |

## 📦 Dependency Versions (Phase 139 — Dependabot bumps applied 2026-03-16)

| Package               | Old       | New       | Risk                                         |
| --------------------- | --------- | --------- | -------------------------------------------- |
| `recharts`            | `2.15.4`  | `3.8.0`   | 🔴 Major — breaking API changes expected     |
| `react` / `react-dom` | `19.2.3`  | `19.2.4`  | 🟢 Patch — safe                              |
| `lucide-react`        | `0.563.0` | `0.577.0` | 🟢 Minor — safe                              |
| `eslint` (web)        | `9.28.0`  | `10.0.3`  | 🟡 Major — flat config API unchanged, verify |
| `@types/node` (web)   | `22.15.0` | `25.5.0`  | 🟡 Major — type shapes may change            |
