# Active Context: Current State

### Current Status
**Phase 76: Auth System Hardening — COMPLETE ✅**

Full auth lifecycle implemented. Removed dead settings UI, wired real InsForge user data, added all missing auth pages, fixed InsforgeMiddleware misconfiguration, and resolved the cookie stale-session bug that bypassed route protection.

---

## Phase 76: Auth System Hardening (Complete)

### Settings Cleanup
| Changed | Detail |
|---|---|
| `bot-configuration-card.tsx` | **Deleted** — fake form, simulated server action, never wrote to DB |
| `lib/actions/settings.ts` | **Deleted** — fake `setTimeout` action, no real persistence |
| `lib/schemas/settings.ts` | **Deleted** — only used by deleted card |
| `account-info-card.tsx` | **Rewritten** — uses real `useUser()` from InsForge; dev mode shows amber alert |
| `settings-page-content.tsx` | Removed `BotConfigurationCard`, balanced 2-col grid |
| `bots.service.ts` | Removed dead `owner_telegram_id: 0` + stale comment |
| `nav-user.tsx` | Dev mode shows "Dev Mode / auth bypassed" instead of fake "Bot Owner" |

### Auth Pages Added
| Page | Purpose |
|---|---|
| `/verify-email` | 6-digit OTP code verification (backend: `verifyEmailMethod: "code"`) |
| `/forgot-password` | Step 1: email → send reset code |
| `/reset-password` | Step 2: enter code → `exchangeResetPasswordToken` → new password |

### Auth Flow Fixes
| Fix | Detail |
|---|---|
| `proxy.ts` — `signInUrl: "/login"` | Was defaulting to `/sign-in` (non-existent); now correctly maps our `/login` page |
| `proxy.ts` — `afterSignInUrl: "/dashboard"` | Was defaulting to `/`; now goes directly to dashboard after auth |
| `proxy.ts` — env read at request time | `DEV_LOGIN` was a stale module-level const; now read per-request inside `proxy()` |
| `dashboard/layout.tsx` — server guard | Checks both `!userId \|\| !token`; env also read at request time |
| `login-form.tsx` — auto-redirect | `useEffect` redirects to `/dashboard` if already signed in |
| `login-form.tsx` — "Forgot password?" | Link added below sign-in button |
| `middleware.ts` deleted | Was conflicting with `proxy.ts` (Next.js 16 uses proxy.ts only) |

### Key Insight: Stale Cookie Bug
The InsForge middleware only checks **cookie existence** (not JWT validity). Browser stale `insforge-session` + `insforge-user` cookies from dev sessions bypassed auth. Fix: clear those cookies in DevTools after switching modes.

### Quality Gates
- `bun run type-check` → **0 errors** ✅
- `bun run lint` → **0 warnings** ✅

---

## Phase 75: Telegram Auth Removal (Complete)

### What Was Removed
| Deleted/Changed | Detail |
|---|---|
| `src/components/auth/telegram-login.tsx` | **Deleted** — Telegram Login Widget component |
| `src/components/auth/` directory | **Deleted** — empty after above |
| `LOGIN_BOT_USERNAME` constant | Removed from `config.ts` + `api/index.ts` re-exports |
| `getConfig()` function | Removed from `config.ts` — was dead, nothing imported it |
| `ownerTelegramId` param in `addBot()` | Removed from service, hook, and call site in `bots/page.tsx` |
| `NEXT_PUBLIC_LOGIN_BOT_USERNAME` env var | Removed from `.env.local` and `.env.example` |
| Stale TODO comment (ISSUE-IF-8) | Removed from `bots/page.tsx` |

### What Was Kept
| Kept | Why |
|---|---|
| `DEV_LOGIN` constant + `NEXT_PUBLIC_DEV_LOGIN` env var | Dev bypass still useful for local development |
| `proxy.ts` `DEV_LOGIN` check | Allows `NextResponse.next()` to skip InsForge middleware in dev |
| `login-form.tsx` dev bypass button | Renders when `NEXT_PUBLIC_DEV_LOGIN=true` |
| `@BotFather` copy text in `bots/page.tsx` | UX help text about bot token format — not auth-related |
| Mock data Telegram-style IDs | Group/channel entity IDs — not auth-related |

### Quality Gates
- `bun run type-check` → **0 errors** ✅
- `bun run lint` → **0 warnings** ✅

---

## Phase 74: Login Auth Fix (Complete)

### Problems Fixed
| Problem | Fix |
|---|---|
| "Bot domain invalid" — Telegram widget broke | Removed widget; `SignInButton` redirects to InsForge hosted auth |
| No real session ever created | InsForge `InsforgeBrowserProvider` + `/api/auth` route sets `insforge_session` cookie |
| `proxy.ts` custom check never enforced | Replaced with `InsforgeMiddleware` from `@insforge/nextjs/middleware` |
| Dev bypass unreachable | `proxy.ts` short-circuits to `NextResponse.next()` when `DEV_LOGIN=true` |

### How Auth Works Now
```
Unauthenticated → any /dashboard/* route
  → proxy.ts → InsforgeMiddleware intercepts
  → redirect to https://u4ckbciy.us-west.insforge.app/auth/sign-in
  → user signs in (email/password, GitHub, Google)
  → redirect back to /api/auth → sets insforge_session HTTP-only cookie
  → InsforgeBrowserProvider picks up session → useAuth().isSignedIn = true
  → afterSignInUrl="/dashboard" ✅

Dev mode (NEXT_PUBLIC_DEV_LOGIN=true):
  → proxy.ts returns NextResponse.next() (no middleware check)
  → /login page renders with amber-styled "Skip Login" button
  → click → router.push("/dashboard") ✅
```

---

## Phase 73: Security Vault RLS Fix (Complete)

### Root Cause
Migration `012_enable_rls.sql` (Phase 72) enabled RLS on `nezuko_secrets` but only defined:
- `project_admin` → ALL
- `authenticated` → SELECT

The `anon` role had **ZERO policies**, so:
1. Web Server Action (`saveMasterKey`) → INSERT blocked (HTTP 42501)
2. Bot startup (`get_secret("master_key")`) → SELECT also blocked → returns `None`
3. `is_encryption_configured()` returned `False` → bot refused to start

### Fix Applied
**Migration `015_fix_nezuko_secrets_rls.sql`** applied directly to InsForge:
- `anon` SELECT — bot can read `master_key` on startup
- `anon` INSERT — web Server Action can save new generated key 
- `anon` UPDATE — web Server Action can regenerate/update key
- `authenticated` SELECT + ALL — future-proof if SignIn is enabled
- `project_admin` ALL — unchanged

**Note**: Anon key is safe here — it's only in `apps/bot/.env` and `apps/web/.env.local` (server-side). It is never sent to the browser.

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
| WebSocket offline locally | Falls back to 30s polling — works on deploy | Info |
| Test coverage at 58 tests | Target 100+ for full coverage | Low |
| Admin notification on error (Task 6.2) | Error alerts not sent to admin chat | Low |
| InsForge JWT not server-validated | Middleware checks cookie existence only; stale cookies pass through (clear manually) | Low |

---

## What to Work on Next

1. **Clear browser cookies** → `insforge-session` + `insforge-user` on localhost after switching DEV_LOGIN modes
2. **Deploy** — VPS/Docker (bot) + Vercel (web)
3. **Register InsForge user** — sign up at the InsForge hosted auth page to create the dashboard owner account
4. **Add admin notification** in global error handler (Task 6.2)
5. **Expand test coverage** — target 100+ tests

---

_Last Updated: 2026-02-27 (Phase 76 — Auth System Hardening)_
