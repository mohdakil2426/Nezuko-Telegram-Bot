# Active Context: Current State

> **Last Updated**: 2026-03-15 19:55 IST
> **Phase**: 133 — Web auth hardening implemented in repo; callback route + owner allowlist + admin RLS migration added

---

## 🔴 Top Priority: Web Dashboard Login Still Broken

### Status

- Repo now uses a dedicated public callback route: `apps/web/src/app/auth/callback/route.ts`
- Proxy no longer trusts auth query params to mint cookies
- Local login uses hosted auth redirect → callback validation → cookie set → sanitized local redirect
- Owner-only access is now enforced by `INSFORGE_ALLOWED_EMAILS`
- DB-side follow-through is prepared in `insforge/migrations/027_dashboard_admin_rls.sql`
- Production rollout still requires env + migration apply + redeploy

### New Auth Pattern (Phase 133)

1. `/login` builds a hosted InsForge sign-in URL with a redirect to `/auth/callback?redirect=<safe-local-path>`
2. `/auth/callback` validates `access_token` against InsForge `/api/auth/sessions/current`
3. If email is not allowlisted, auth cookies are never created
4. If allowed, callback optionally syncs `dashboard_admins` via `INSFORGE_SERVICE_KEY`
5. Callback sets `insforge-session` / `insforge-user` cookies server-side and redirects to the sanitized local path
6. Dashboard SSR uses `auth()` plus owner allowlist for defense in depth

### New Web Security State

- Bots list now reads `bot_instances_safe`, not the raw `bot_instances` table
- Query auth redirects only trigger on structured auth failures, not broad string matching
- Groups/channels pages now use real server pagination
- `vercel.json` now includes a CSP

### Production Prerequisites

1. Set `INSFORGE_ALLOWED_EMAILS`
2. Ensure `INSFORGE_SERVICE_KEY` is available to the web app
3. Apply `027_dashboard_admin_rls.sql`
4. Redeploy web and test login in incognito

### Status

- Previous provider-side fix (`8f088f1`) was **insufficient on its own**
- Actual root cause identified from installed `@insforge/nextjs` middleware source
- Production already has the callback-cookie redirect fix live
- Remaining blocker is a second proxy config bug in `apps/web/src/proxy.ts`; redeploy is still required before production login works

### Root Cause (Corrected)

**Cause 1 — Stale baked-in env vars (original)**
`NEXT_PUBLIC_*` are embedded at build time. The Vercel bundle was built before the InsForge URL was updated, so all requests from the browser went to the wrong backend URL → `401` loop.

- Fixed: Vercel was redeployed manually by user. New bundle has correct env vars.

**Cause 2 — Cookie write/read race on the OAuth callback request (actual blocker)**
`@insforge/nextjs` middleware writes `insforge-session` and `insforge-user` cookies when `/dashboard` is hit with `access_token`, `user_id`, and `email` query params. But it returns `NextResponse.next()` on that **same request**. The dashboard server layout then calls `auth()` and only sees the *incoming* request cookies, not the cookies that middleware just wrote on the outgoing response, so it redirects to `/login` and the loop continues.

```
GET  /auth/sign-in 200                           ← hosted auth page
GET  /dashboard?access_token=...&user_id=...    ← OAuth returns to app
proxy.ts / InsforgeMiddleware sets cookies       ← outgoing response only
dashboard layout calls auth()                    ← request cookies still empty
redirect("/login")                               ← loop restarts
```

**Fix applied now** (`apps/web/src/proxy.ts`):

- Detect auth query params before handing off to `InsforgeMiddleware`
- Set `insforge-session` and `insforge-user` cookies directly
- Redirect immediately to the same URL with auth params removed
- The follow-up request reaches `/dashboard` with real request cookies, so `auth()` succeeds

The earlier provider `initialState` fix is still valid as a secondary hardening measure, but it was not the loop's primary blocker.

**Cause 3 — `/login` route is trapped by InsForge middleware config (current live blocker)**
The app configured both `signInUrl` and `signUpUrl` as `"/login"` while leaving `useBuiltInAuth: true`. In the installed `@insforge/nextjs` middleware, the internal route map uses object keys, so the `signUpUrl` entry wins and `/login` redirects to the hosted auth route instead of serving the local login page.

Observed on live site:

```text
GET https://nezuko-web.vercel.app/login
→ 307 Location: https://u4ckbciy.us-west.insforge.app/auth/sign-up?redirect=https://nezuko-web.vercel.app/dashboard
```

That makes the local login page effectively unreachable in production and keeps auth flow behavior inconsistent.

**Fix applied locally now** (`apps/web/src/proxy.ts`):

- Set `useBuiltInAuth: false` so protected routes redirect to the app's local `/login` page first
- Move `signUpUrl` off `"/login"` to `"/sign-up"` to remove the route collision
- Keep `/login` in `publicRoutes` so the page remains accessible

### Live Verification Findings

- `curl` against production `/dashboard?access_token=...` returns `307 /dashboard`
- Live response sets both `insforge-session` and `insforge-user` cookies
- This confirms the callback-cookie handoff patch is already deployed
- `curl` against production `/login` still returns a redirect to InsForge hosted sign-up
- Therefore the remaining production failure is the `/login` proxy trap, not the callback cookie race

### After Deploy — What to Check

1. Open **incognito window** → go to `nezuko-web.vercel.app`
2. Click **Sign in with Google**
3. ✅ Should land on `/dashboard`
4. ❌ If still 403 in DevTools Network tab → deeper InsForge SDK issue; need to check `InsforgeProviderCore` source in `@insforge/react`

---

## ✅ What Was Fixed This Session (Phase 130)

### 1. Migration 024 Applied Live

- `get_group_verification_contract` RPC created in DB
- `join_request_preferred=true` backfilled on all `protected_groups`
- Bot uses fast RPC path instead of slow direct-table fallback

### 2. Migration 026 Applied + Corrected

**Applied**: Removed all 25 legacy anon READ/UPDATE/INSERT/DELETE policies from privileged tables:

- Security vault (`nezuko_secrets`)
- Control plane (`bot_instances`, `bot_status`, `admin_commands`)
- Admin entities (`protected_groups`, `enforced_channels`, `group_channel_links`)

**Corrected (same session)**: Migration 026 initially broke the bot because `POST /bot_status 401` and `POST /admin_logs 401` appeared in live logs — the bot uses `INSFORGE_ANON_KEY` for fire-and-forget INSERT writes. Four INSERT-only anon policies were restored:

| Policy                   | Table              | Why                                   |
| ------------------------ | ------------------ | ------------------------------------- |
| `bot_status_anon_insert` | `bot_status`       | Heartbeat fallback on PATCH-then-POST |
| `logs_anon_insert`       | `admin_logs`       | DB log transport (WARN+ logs)         |
| `api_log_anon_insert`    | `api_call_log`     | API call telemetry                    |
| `verify_log_anon_insert` | `verification_log` | Verification results                  |

### 3. Web Login CSRF Fix (Code — Pushed to GitHub)

- File: `apps/web/src/providers/insforge-provider-wrapper.tsx`
- Commits: `8f088f1` (login fix), `afd65ee` (migration 026 SQL correction)
- Vercel auto-deploy in progress from `main`

---

## 📌 Pending Issues (Not Fixed Yet)

### 🔴 Web Login Still Looping

- Callback-cookie fix is already live
- Remaining `/login` proxy-routing fix is local only and awaiting Vercel deploy
- After deploy: test in incognito
- If it still fails after deploy, inspect live request chain `/login` → OAuth → `/dashboard` and compare cookies on the second `/dashboard` request

### 🟠 Realtime `connect_error: Invalid token` (Bot App Platform)

- InsForge Socket.IO rejects the service key for realtime auth
- Bot falls back cleanly to 30-second polling — **degraded, not broken**
- No fix yet; needs InsForge docs review for correct server-side realtime auth

### 🟡 `get_user_growth` RPC Broken

- Analytics "User Growth" chart is blank/broken on dashboard
- Function likely returns wrong shape or `NULL`
- Needs SQL investigation; not urgent

### 🟡 Runner Crash Storm on App Platform Deploy

- Seen at `22:54` IST on 2026-03-14: 8+ rapid `grammY runner task failed` in 30s
- Caused by 2 replicas briefly running simultaneously (409 Conflict cascade)
- Bot self-healed via `restartRunnerOnly()`; recovered in ~3s
- Mitigation: **always confirm instance_count=1** after each App Platform deploy

---

## 🏗️ Architecture Quick Reference

```
Web Dashboard (Next.js 16)  ──► @insforge/sdk ──► InsForge BaaS (PostgreSQL)
                                                     ▲         ▲
Bot Runtime (grammY / Bun) ──► fetch REST ───────────┘         │ Socket.IO
  └─ insforge-client.ts (anon key for writes)                   │ (30s poll fallback)
  └─ realtime-client.ts (Socket.IO — auth broken, polling)
  └─ status-writer.ts (30s heartbeat)
  └─ command-worker.ts (realtime + poll)
  └─ member-sync.ts (15min)
```

### Key Env Variables

| App    | Var                             | Notes                                             |
| ------ | ------------------------------- | ------------------------------------------------- |
| grammy | `INSFORGE_BASE_URL`             | `https://u4ckbciy.us-west.insforge.app`           |
| grammy | `INSFORGE_ANON_KEY`             | Used for all DB reads + INSERT writes             |
| grammy | `INSFORGE_SERVICE_KEY`          | Used only for vault secret reads (encryption key) |
| grammy | `DASHBOARD_MODE=true`           | Multi-bot from DB                                 |
| grammy | `REDIS_URL`                     | `rediss://` (TLS) for Upstash                     |
| web    | `NEXT_PUBLIC_INSFORGE_BASE_URL` | Baked into bundle at build time                   |
| web    | `NEXT_PUBLIC_INSFORGE_ANON_KEY` | Baked into bundle at build time                   |
| web    | `INSFORGE_SERVICE_KEY`          | Server-only (vault actions)                       |

### RLS Policy State (Post Migration 026)

| Table                 | anon SELECT | anon INSERT | anon UPDATE | anon DELETE |
| --------------------- | ----------- | ----------- | ----------- | ----------- |
| `nezuko_secrets`      | ❌ removed  | ❌ removed  | ❌ removed  | —           |
| `bot_instances`       | ❌ removed  | ❌ removed  | ❌ removed  | —           |
| `bot_status`          | ❌ removed  | ✅ kept     | ❌ removed  | —           |
| `admin_commands`      | ❌ removed  | —           | ❌ removed  | —           |
| `protected_groups`    | ❌ removed  | ❌ removed  | ❌ removed  | —           |
| `enforced_channels`   | ❌ removed  | ❌ removed  | ❌ removed  | —           |
| `group_channel_links` | ❌ removed  | ❌ removed  | ❌ removed  | ❌ removed  |
| `verification_log`    | ❌ removed  | ✅ kept     | —           | —           |
| `api_call_log`        | ❌ removed  | ✅ kept     | —           | —           |
| `admin_logs`          | ❌ removed  | ✅ kept     | —           | —           |

---

## 📐 Coding Standards Reminders

- **All Telegram IDs**: `BIGINT` in DB, `number` in TypeScript
- **Bot imports**: Relative ESM `.js` extensions within `apps/grammy/src`
- **Web imports**: `@/lib/insforge` for the InsForge SDK client
- **No raw SQL from app code**: All DB access via `InsForgeClient` (bot) or `@insforge/sdk` (web)
- **InsForge DB write pattern**: `apikey` header required alongside `Authorization: Bearer`
- **Upsert pattern**: PATCH-then-POST (not `Prefer: resolution=merge-duplicates`) for tables with multiple UNIQUE columns
- **Logger**: Pino only — no `console.log` in production paths
- **Secrets**: Never log tokens; sanitize all client-facing errors

---

## 🔧 Key File Locations

| Thing                 | File                                                   |
| --------------------- | ------------------------------------------------------ |
| Bot main entry        | `apps/grammy/src/main.ts`                              |
| Bot env               | `apps/grammy/.env`                                     |
| InsForge client (bot) | `apps/grammy/src/core/insforge-client.ts`              |
| Multi-bot manager     | `apps/grammy/src/multi-bot/bot-manager.ts`             |
| Bot lifecycle         | `apps/grammy/src/multi-bot/bot-lifecycle.ts`           |
| Verification logic    | `apps/grammy/src/services/verification.ts`             |
| Web auth middleware   | `apps/web/src/proxy.ts`                                |
| Web auth provider     | `apps/web/src/providers/insforge-provider-wrapper.tsx` |
| Web auth route        | `apps/web/src/app/api/auth/route.ts`                   |
| Web InsForge client   | `apps/web/src/lib/insforge.ts`                         |
| Migrations            | `insforge/migrations/*.sql`                            |
| DB log transport      | `apps/grammy/src/core/db-log-transport.ts`             |
| Status writer         | `apps/grammy/src/services/status-writer.ts`            |
| Realtime client       | `apps/grammy/src/core/realtime-client.ts`              |
