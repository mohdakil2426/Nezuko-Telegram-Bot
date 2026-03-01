# Active Context: Current State

### Current Status
**Phase 86: Critical Bug Fix — Auth Loop, Bot CRUD, Unified Sync — COMPLETE ✅**

Building on Phase 85, fixing the actual root causes of three critical bugs that were NOT properly resolved.

---

## Phase 86: Critical Bug Fix (COMPLETE ✅)

### Root Causes Identified & Fixed

#### Bug 1: Auth Redirect Loop (Login ↔ Dashboard) — Fixed ✅
- **Symptom**: After login, page rapidly loops between `/dashboard?access_token=...` and InsForge auth, generating new JWT tokens every ~2 seconds.
- **Root Cause**: Phase 86 initially added an `AuthGuard` client component that checked `useAuth().isSignedIn`. During InsForge's token exchange (`POST /api/auth`), `isSignedIn` is transiently `false`. The guard redirected to `/login`, which detected the user as signed in and redirected back → infinite loop.
- **Fix**: **Removed `AuthGuard` entirely**. The server-side guards (proxy.ts `InsforgeMiddleware` + layout.tsx `auth()`) are sufficient and don't have this race condition. Added a prominent `⚠️ DO NOT add a client-side AuthGuard` comment to prevent re-introduction.
- **Key Lesson**: `useAuth()` from `@insforge/nextjs` returns `isSignedIn: false` during the token exchange window after InsForge redirect. Client-side auth checks must NOT redirect during this period.

#### Bug 2: "Failed to add bot" (Edge Function 401) — Fixed ✅
- **Symptom**: After deleting a bot, re-adding it fails with "Failed to add bot".
- **Root Cause (1)**: `addBotSecure()` doesn't send `owner_telegram_id`, but `handleAdd` in the Edge Function required it (validation: `owner_telegram_id === undefined → 400`). This broke when Phase 75 removed Telegram auth.
- **Root Cause (2)**: Even after fixing the validation, UPSERT (POST) returned `401` because `bot_instances` had no INSERT RLS policy for `anon`.
- **Fix**:
    - Made `owner_telegram_id` optional in Edge Function (`?? 0` default — DB column has `DEFAULT 0`).
    - Added RLS policy `bot_instances_anon_insert: INSERT for anon`.
    - Added RLS policy `bot_instances_anon_update: UPDATE for anon`.
    - Deployed updated Edge Function.

#### Bug 3: Bot Delete Respawn (RLS Blocks Edge Function UPDATE) — Fixed ✅
- **Symptom**: Deleted bot reappears within seconds.
- **Root Cause**: The `anon` key had no UPDATE policy → `.update().eq('id', id)` silently returned `{ data: null, error: null }`.
- **Fix**: Added RLS policy + `.select().single()` verification + `!data` error response.

#### Bug 4: Bot Engine Doesn't Detect New Bots — Fixed ✅
- **Symptom**: Bot engine running with 0 bots; adding a bot via dashboard; engine doesn't start it (or takes 60s+ and never gets health monitor).
- **Root Cause**: `BotManager.run()` had **two separate loops**:
    - Empty-bots loop (60s, no health monitor, `return` after loop exits → never reaches main loop)
    - Main loop (30s, with health monitor and `_sync_bots()`)
  When starting with 0 bots, the engine entered the empty loop and NEVER transitioned to the main loop.
- **Fix**: Unified into a **single loop** — always starts health monitor, always runs `_sync_bots()` every 30s regardless of initial state.

#### Bug 5: handleSignOut Uses SPA Navigation — Fixed ✅
- **Fix**: Changed `router.push("/login")` to `window.location.href = "/login"` (hard redirect). Skips `insforge.auth.signOut()` in dev mode (no session exists). Removed unused `useRouter` import.

### RLS Policies Added (bot_instances)
| Policy | Operation | Role | Status |
|---|---|---|---|
| `bot_instances_anon_read` | SELECT | anon | Existed ✅ |
| `bot_instances_anon_update` | UPDATE | anon | **NEW** ✅ |
| `bot_instances_anon_insert` | INSERT | anon | **NEW** ✅ |
| `bot_instances_auth_all` | ALL | authenticated | Existed ✅ |

### Files Changed
| File | Change |
|---|---|
| `apps/bot/core/bot_manager.py` | Unified `run()` into single sync loop; improved `_sync_bots()` logging |
| `apps/web/src/app/dashboard/layout.tsx` | Removed AuthGuard; added "DO NOT add client-side AuthGuard" warning |
| `apps/web/src/components/auth-guard.tsx` | **DELETED** — caused infinite redirect loop |
| `apps/web/src/components/nav-user.tsx` | Hard redirect on sign-out; skip SDK call in dev mode; removed unused `useRouter` |
| `apps/web/.env.local` | Added step-by-step instructions for dev→prod mode switch |
| `insforge/functions/manage-bot.js` | `owner_telegram_id` optional; `.select().single()` verification on update/delete |
| **RLS Policies** | `bot_instances_anon_update` + `bot_instances_anon_insert` via `run-raw-sql` |

### Quality Gates
| Check | Result |
|---|---|
| `bun run type-check` | ✅ 0 errors |
| `bun run lint` | ✅ 0 warnings |
| `bun run build` | ✅ exit 0 |
| `ruff check apps/bot` | ✅ 0 errors |
| `pylint apps/bot` | ✅ 10.00/10 |
| `pyrefly check` | ✅ 0 errors |
| `pytest tests/bot/` | ✅ 58 passed |

---

## Phase 85: Audit & Robustness (COMPLETE ✅)

### Root Causes Identified & Fixed

#### Bug 1: Bot Restoration (RLS Dev Bypass) — Fixed ✅
- **Symptom**: Deleted bots reappear after 30s in dev mode.
- **Cause**: Browser called `bot_instances` update directly via `anon` key. RLS policy blocked the update (401/403). UI showed optimistic delete, but next refetch (allowed by SELECT policy) restored the bot from DB.
- **Fix**: Centralized all bot CRUD (`add`, `update`, `delete`) into the `manage-bot` Edge Function.
- **Implementation**:
    - Updated `insforge/functions/manage-bot.js` to handle `update` and `delete` actions.
    - Created `updateBotSecure()` and `deleteBotSecure()` Server Actions in `apps/web/src/lib/actions/vault.ts`.
    - Updated `apps/web/src/lib/services/bots.service.ts` to use these secure actions.

#### Bug 2: Auth Bypass Inconsistency (Mode Switching) — Fixed ✅
- **Symptom**: Switching between dev and production modes leads to improper logout and stale sessions.
- **Fix**: 
    - Implemented a **Global 401 Interceptor** in `apps/web/src/providers/query-provider.tsx` using `QueryCache.onError`. Automatically redirects to `/login` if any background request fails with 401/403.
    - Hardened `NavUser` component to always show "Exit Dev Mode" button when `DEV_LOGIN=true`, ensuring a clean fallback to the login page.

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

- **InsForge Base URL**: in `apps/bot/.env` (no hardcoded default — SEC-02 fix)
- **InsForge Anon Key**: in `apps/bot/.env` AND `apps/web/.env.local` (must be kept in sync — Phase 84 lesson)
- **Encryption Key**: Auto-synced from vault (AES-256-GCM, 3600s TTL cache)
- **GitHub**: `mohdakil2426/Nezuko-Telegram-Bot`

---

## Local Dev Stack

| Component | Where it runs |
|---|---|
| Bot (Python) | `uv run python -m apps.bot.main` (from project root) |
| Web (Next.js) | `cd apps/web && bun dev` — port 3000 |
| Redis | Docker — `docker compose -f docker-compose.local.yml up -d` |
| PostgreSQL | **InsForge cloud REST API** — no local DB |

---

## Remaining Issues

| Issue | Impact | Priority |
|---|---|---|
| Legacy Base64 bot token | Security gap + warning spam every 30s | **High** — delete + re-add bot via dashboard (now working!) |
| WebSocket offline locally | Falls back to 30s polling — works on deploy | Info |
| Test coverage at 58 tests | Target 100+ for full coverage | Low |
| Admin notification on error (Task 6.2) | Error alerts not sent to admin chat | Low |
| InsForge JWT not server-validated | Middleware checks cookie existence only | Low |
| ARCH-01: BotManager god class | 780 lines, 7 responsibilities — split deferred | Medium |
| ARCH-03: Public facades needed | `_get/_post/_patch` still accessed externally | Medium |

---

## What to Work on Next

1. **Re-encrypt bot token** — Delete + re-add `@gmakilbot` via Dashboard → Bots page (now working!)
2. **Deploy** — VPS/Docker (bot) + Vercel (web)
3. **Apply SQL migration 019** — Run via InsForge MCP `run-raw-sql`
4. **Set `ALLOWED_ORIGIN` env var** — Required for edge function CORS
5. **Add admin notification** in global error handler (Task 6.2)
6. **Expand test coverage** — target 100+ tests
7. **BotManager refactor** — Split into `BotRegistry`, `BotHealthMonitor`, `BotSyncWorker`

---

_Last Updated: 2026-03-01 (Phase 86 — Critical Bug Fix: Auth Loop, Bot CRUD, Unified Sync — COMPLETE)_
