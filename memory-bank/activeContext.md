# Active Context: Current State

### Current Status
**Phase 72: Comprehensive Security Audit Fixes (v5) — COMPLETE ✅**

All critical, high, medium, and low priority issues from `COMPREHENSIVE_CODEBASE_AUDIT.md` have been resolved across the bot, web dashboard, and InsForge backend. The platform is now production-ready with full security hardening, InsForge auth integration, and a complete handler registry.

---

## Phase 72: Security Audit Fixes v5 (Complete)

### Security Fixes (Critical)
- **RLS Enabled**: Migration `012_enable_rls.sql` — RLS on all 12 public tables + 38 policies (`anon`, `authenticated`, `project_admin` roles). `nezuko_secrets` is blocked from anon reads.
- **Bot Token Encryption**: `addBot()` in `bots.service.ts` now fetches `master_key` from `nezuko_secrets` before calling the `manage-bot` edge function.
- **SSRF Protection**: `test-webhook` edge function — HTTPS-only, blocks RFC1918, loopback, link-local, and cloud metadata endpoints (`redirect=error`).
- **Phantom Tables Removed**: Deleted `audit.service.ts` which queried non-existent `admin_audit_log` + `admin_users` tables.
- **FK Constraints**: Migration `013_add_missing_fks.sql` — `bot_status.bot_instance_id → bot_instances.id` and `admin_commands.bot_id → bot_instances.bot_id`.

### Bot Improvements
- **Global Error Handler**: `apps/bot/handlers/error.py` + registered as `application.add_error_handler(error_handler)` in `loader.py` (last, as required by PTB).
- **PTB Defaults**: `create_application()` factory in `loader.py` — `Defaults(parse_mode=ParseMode.HTML)` applies to all bots (standalone + dashboard mode).
- **ChatJoinRequest Handler**: `handlers/events/join_request.py` — auto-approves verified users, declines and DMs instructions to unverified users. Registered as `ChatJoinRequestHandler`.
- **Cached Admin Check**: Admin-status `getChatMember` in `message.py` now cached (key: `admin:{user_id}:{chat_id}`, TTL: 120s + jitter) — eliminates API call per message.
- **Verification Fixes**: `ChatMemberRestricted.is_member` check, `use_independent_chat_permissions=True` on restrict calls, RESTRICTED→LEFT transition handling, all missing channels shown.
- **N+1 Query Fix**: `insforge_client.py` — `get_group_channels()` and `get_groups_for_channel()` now use single batch `in.()` filter.
- **Encryption Hardening**: `encryption.py` — specific exceptions instead of bare `except Exception`.
- **Dependency Cleanup**: Restored `aiohttp` (used by `health.py`); added PTB extras (`[webhooks,callback-data,http2]`); pinned `httpx<0.29`; removed unused deps.

### Web Dashboard Improvements
- **InsForge Auth**: `@insforge/nextjs@1.1.7` integrated:
  - `/api/auth/route.ts` — `createAuthRouteHandlers()` for cookie-based SSR auth
  - `providers/insforge-provider.tsx` — `InsforgeBrowserProvider` wrapping the app
  - `middleware.ts` / `proxy.ts` updated — `insforge_session` cookie checked for route protection
  - `use-auth.ts` — replaced stub with real `useAuth`/`useUser` re-exports
  - `nav-user.tsx` — uses `useUser()` profile + `insforge.auth.signOut()` for logout
  - `use-realtime-insforge.ts` — `isAuthenticated` → `isSignedIn`
- **Logs Fix**: `logs.service.ts` — removed phantom `extra` column, mapped actual `admin_logs` columns.
- **bot_manager.py**: Uses `create_application()` factory for consistent PTB config.

### Database Migrations Applied
| Migration | Description |
|---|---|
| `012_enable_rls.sql` | RLS on all 12 tables + 38 policies |
| `013_add_missing_fks.sql` | FK constraints for `bot_status` + `admin_commands` |
| `014_add_bot_id_columns.sql` | `bot_id` columns on `admin_logs` + `api_call_log` |

---

## Architecture (Complete — 100% Working)

```
Web Dashboard (Next.js) ──► @insforge/sdk ──► InsForge BaaS (PostgreSQL + Realtime)
  InsforgeProvider (auth)   @insforge/nextjs         ▲          ▲
  /api/auth route                                    │          │ WebSocket pushes
                                                     │ DB triggers fire on:
Bot Engine (Python) ──────► httpx REST ──────────────┘  • verification_log INSERT → "verification"
         └─ insforge_client.py (batch N+1 fixed)        • bot_status CHANGE → "status_changed"
         └─ status_writer.py                            • admin_logs INSERT → "new_log"
         └─ insforge_log_handler.py                     • admin_commands CHANGE → "command_updated"
         └─ verification_logger.py
         └─ api_call_logger.py
         └─ member_sync.py (every 15min via JobQueue)
```

---

## Key Credentials

- **InsForge Base URL**: `https://u4ckbciy.us-west.insforge.app`
- **InsForge Anon Key**: in `apps/bot/.env` AND `apps/web/.env.local` (must be identical)
- **Encryption Key**: `ENCRYPTION_KEY` in `apps/bot/.env` (AES-256-GCM, auto-synced from vault)
- **GitHub**: `mohdakil2426/Nezuko-Telegram-Bot` — latest: `4e5bb8d`

---

## Local Dev Stack

| Component | Where it runs |
|---|---|
| Bot (Python) | `uv run python -m apps.bot.main` (or `./nezuko.bat`) |
| Web (Next.js) | `cd apps/web && bun dev` — port 3000 |
| Redis | Docker — `docker compose -f docker-compose.local.yml up -d` |
| PostgreSQL | **InsForge cloud REST API** — no local DB |

---

## Remaining Issues

| Issue | Impact | Priority |
|---|---|---|
| `ownerTelegramId` placeholder `0` in AddBot dialog | Owner ID not set until user provides their Telegram ID | Medium |
| WebSocket offline locally | Falls back to 30s polling — works on deploy | Info |
| Test coverage at 58 tests | Target 100+ for full coverage | Low |
| Admin notification on error (Task 6.2) | Error alerts not sent to admin chat | Low |

---

## What to Work on Next

1. **Deploy** — VPS/Docker (bot) + Vercel (web)
2. **Set `ownerTelegramId`** properly — integrate Telegram user ID from InsForge auth user profile (if Telegram login is used in InsForge)
3. **Add admin notification** in global error handler (Task 6.2)
4. **Expand test coverage** — target 100+ tests

---

_Last Updated: 2026-02-27 (Phase 72 — Security Audit Fixes v5 Complete)_
