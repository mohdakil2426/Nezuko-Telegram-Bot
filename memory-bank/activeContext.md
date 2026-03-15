# Active Context: Current State

> **Last Updated**: 2026-03-15 22:40 IST
> **Phase**: 134 — InsForge fresh rebuild completed live; auth/schema/function flow unified

---

## Top Priority

The canonical backend/auth rebuild is now done. The next highest-value work is live login verification in the browser and a separate pass on bot realtime auth, which is still the one known degraded area.

## What Changed In Phase 134

- Live InsForge backend was destructively reset to a new canonical schema.
- Legacy `admin_config` was removed from the live backend and the active contract.
- Live schema now keeps only:
  - `dashboard_admins`
  - `owners`
  - `bot_instances`
  - `bot_status`
  - `protected_groups`
  - `enforced_channels`
  - `group_channel_links`
  - `verification_log`
  - `api_call_log`
  - `admin_logs`
  - `admin_commands`
  - `nezuko_secrets`
- Live RPCs were recreated and verified against the current dashboard service layer:
  - `get_dashboard_stats`
  - `get_verification_trends`
  - `get_user_growth`
  - `get_verification_distribution`
  - `get_cache_breakdown`
  - `get_groups_status`
  - `get_api_calls_distribution`
  - `get_hourly_activity`
  - `get_latency_distribution`
  - `get_top_groups`
  - `get_cache_hit_rate_trend`
  - `get_latency_trend`
  - `get_bot_health`
  - `get_analytics_overview`
  - `get_members_chart_data`
  - `get_group_verification_contract`
- Live `manage-bot` edge function was redeployed from repo and now enforces dashboard-admin authorization before add/update/delete.

## Canonical Web Auth Pattern

The web app no longer mixes hosted callback cookie minting with ad hoc auth helpers.

Current pattern:

1. `proxy.ts` uses `InsforgeMiddleware` with local app routes (`/login`, `/forgot-password`, `/verify-email`, `/reset-password`) and `afterSignInUrl: "/dashboard"`.
2. `/login` uses official `@insforge/sdk` auth methods:
   - `signInWithPassword`
   - `signInWithOAuth`
3. After client auth succeeds, `/api/auth` uses official `createAuthRouteHandlers`.
4. The app adds one thin server-side authorization layer in `/api/auth`:
   - only allowlisted emails (`INSFORGE_ALLOWED_EMAILS`) can sync a cookie session
   - successful sync also upserts `dashboard_admins` through `INSFORGE_SERVICE_KEY`
5. Dashboard/table access is then enforced by DB RLS using `dashboard_admins`, not only by client routing.

This thin `/api/auth` admin-sync layer is the intended bridge for clean-backend bootstrap on first login.

## Canonical Secure Operations Pattern

- Vault writes remain server-side in `apps/web/src/lib/actions/vault.ts`.
- Bot add/update/delete now go only through `insforge.functions.invoke("manage-bot")`.
- `manage-bot` is now the only supported secure path for encrypted bot token persistence.
- Web bot listing reads `bot_instances_safe`, not raw `bot_instances`.

## Current Known Issues

### Realtime server auth for the bot is still degraded

- Bot runtime still falls back to polling when InsForge Socket.IO rejects its token.
- This is separate from the fresh rebuild and was not solved in Phase 134.

### Clean backend starts with zero data by design

- All live tables were reset to empty.
- First dashboard login must be from an allowlisted owner email so `/api/auth` can seed `dashboard_admins`.
- Security vault is also empty; `master_key` must be configured again before adding bots.

## Verification Completed In This Phase

- Live SQL reset executed successfully through InsForge MCP.
- Live function redeploy executed successfully through InsForge MCP.
- RPC outputs were executed directly against the live backend and verified to return the shapes expected by the dashboard.
- Web quality gates passed:
  - `type-check`
  - `lint`
  - `prettier --check`
  - `knip`
  - `build`
- grammY safety pass passed:
  - `type-check`
  - `lint`
  - `format:check`
  - `knip`
  - `test`
  - `build`

## Files That Now Define The Active Contract

- Schema: `insforge/migrations/028_fresh_insforge_rebuild.sql`
- Secure function: `insforge/functions/manage-bot.js`
- Auth middleware: `apps/web/src/proxy.ts`
- Auth route bridge: `apps/web/src/app/api/auth/route.ts`
- Login UI flow: `apps/web/src/components/login-form.tsx`
- Vault actions: `apps/web/src/lib/actions/vault.ts`
- Bot management service: `apps/web/src/lib/services/bots.service.ts`

## Coding Standards Reminders

- **All Telegram IDs**: `BIGINT` in DB, `number` in TypeScript
- **Bot imports**: Relative ESM `.js` extensions within `apps/grammy/src`
- **Web imports**: `@/lib/insforge` for the InsForge SDK client
- **No raw SQL from app code**: All DB access via `InsForgeClient` (bot) or `@insforge/sdk` (web)
- **InsForge DB write pattern**: `apikey` header required alongside `Authorization: Bearer`
- **Upsert pattern**: PATCH-then-POST (not `Prefer: resolution=merge-duplicates`) for tables with multiple UNIQUE columns
- **Logger**: Pino only — no `console.log` in production paths
- **Secrets**: Never log tokens; sanitize all client-facing errors
