# Web Fix Summary

Date: 2026-03-15
Scope: `apps/web/`, `insforge/migrations/027_dashboard_admin_rls.sql`

## What Was Fixed

### 1. Auth callback and session establishment

- Removed unsafe proxy-side cookie minting from auth query parameters.
- Added a dedicated server callback route at `apps/web/src/app/auth/callback/route.ts`.
- The callback now:
  - validates the returned access token against the InsForge session endpoint
  - enforces owner-email allowlisting before creating any local session
  - sets the auth cookies only after validation
  - redirects to a sanitized local path

### 2. Redirect consistency

- Standardized login redirects around `redirect`.
- Updated login, query-provider forced-login flow, verify-email flow, and callback handling to use the same redirect contract.

### 3. Owner-only dashboard enforcement

- Added `INSFORGE_ALLOWED_EMAILS` support.
- Dashboard layout and auth provider wrapper now reject non-owner emails server-side.
- Server actions in `vault.ts` also reject unauthorized dashboard users.

### 4. OTP/email verification flow

- `verifyEmail()` success now syncs the SSR auth cookie through `/api/auth` before navigating.
- This closes the client-success/server-redirect mismatch in the verification flow.

### 5. Secret exposure reduction

- Bot list reads now use `bot_instances_safe` instead of the base `bot_instances` table.
- The web layer no longer requests encrypted bot token material for the bots list.

### 6. Owner metadata handling

- Bot creation now resolves `owner_telegram_id` more safely:
  - prefer the single existing `owners` row when available
  - only fall back to numeric coercion if no canonical owner row exists

### 7. Groups/channels pagination

- Groups and channels pages now drive real server pagination instead of silently paginating only the first fetched slice client-side.

### 8. Auth error handling

- React Query global auth redirects now trigger only on structured 401/auth failures instead of broad string matching for `403`, `Unauthorized`, or `jwt`.

### 9. Security headers

- Added a production CSP to `apps/web/vercel.json`.
- Set `X-XSS-Protection` to `0` instead of relying on obsolete legacy behavior.

### 10. Database-side admin gating and RLS follow-through

- Added `insforge/migrations/027_dashboard_admin_rls.sql`.
- This migration:
  - creates `dashboard_admins`
  - adds `is_dashboard_admin(text)` as a `SECURITY DEFINER` helper
  - scopes authenticated policies across dashboard tables to approved admin users

## Verification

The web quality gates were run successfully after the fixes:

- `cd apps/web && bun run type-check`
- `cd apps/web && bun run lint`
- `cd apps/web && bun x prettier src --check`
- `cd apps/web && bun knip`
- `cd apps/web && bun run build`

All of them completed successfully in the final pass.

## Deployment Prerequisites

These repo changes are complete, but production needs the corresponding environment and migration rollout:

1. Set `INSFORGE_ALLOWED_EMAILS` in the web environment.
2. Ensure `INSFORGE_SERVICE_KEY` is present for the callback route to sync `dashboard_admins`.
3. Apply `insforge/migrations/027_dashboard_admin_rls.sql` to the backend before relying on the DB-side admin policies.
4. Redeploy the web app after the environment variables are present.

## Residual Notes

- The repo now has both app-level owner enforcement and a DB migration for admin-scoped RLS.
- I did not apply the new SQL migration to the live backend from this session, so production DB policy state still depends on your rollout.
