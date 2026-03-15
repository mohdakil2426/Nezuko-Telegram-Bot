# InsForge Fresh Rebuild Plan

Date: 2026-03-15
Owner: Codex
Status: In Progress

## Goal

Rebuild the Nezuko InsForge integration from a clean slate with no legacy data, no compatibility shims, and one consistent implementation that follows the official InsForge SDK, Next.js auth, database, realtime, and edge function guidance as closely as possible.

## Scope

- Reset the live InsForge backend schema and runtime objects.
- Rewrite the web app auth flow to use the official `@insforge/nextjs` model consistently.
- Rewrite secure bot and vault operations to use the official server-side function pattern.
- Remove drift between live backend objects and repo migrations/code.
- Keep only tables, views, triggers, RPCs, and functions that are required by the current product.

## Constraints

- Previous production data will be discarded.
- The grammY bot runtime must continue to use its REST client, but its contract must match the rebuilt backend.
- The web app must use `@insforge/sdk` for application logic and `@insforge/nextjs` for auth/session handling.
- Sensitive bot token encryption must remain server-side only.

## Target Architecture

### Auth

- Use `InsforgeMiddleware` for route protection.
- Use `createAuthRouteHandlers` for cookie sync.
- Use `InsforgeBrowserProvider` with `initialState`.
- Use official SDK methods for OTP verify/reset flows.
- Keep owner access restricted through `dashboard_admins` and server-side checks.
- Remove custom cookie-minting/auth-callback drift unless still required for an allowlist gap discovered during implementation.

### Secure Operations

- Use a single `manage-bot` edge function for secure bot add/update/delete flows.
- Keep `nezuko_secrets` as the vault source of truth for the master key.
- Restrict vault writes to authenticated dashboard admins.
- Keep bot decryption server-side and runtime-only.

### Database

- Recreate a minimal canonical schema for the current product:
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
- Recreate only required indexes, triggers, realtime channels, and RPCs.
- Remove unused objects discovered during implementation.

## Execution Plan

1. Audit and freeze the current contract.
   - Confirm official docs, live backend metadata, and repo usage.
   - Confirm which tables and RPCs are actively used by web and bot code.

2. Write a new canonical migration.
   - Create a destructive reset migration that drops legacy app objects.
   - Recreate the required schema, grants, RLS, triggers, views, and RPCs.
   - Align Telegram IDs to `BIGINT` everywhere.

3. Restore backend functions with official patterns.
   - Recreate `manage-bot` locally from the deployed function contract and improve it where needed.
   - Validate `test-webhook` compatibility against the current web app.

4. Rewrite web auth.
   - Remove custom auth drift and unify on the official `@insforge/nextjs` flow.
   - Keep OTP verify/reset screens aligned with live auth settings.
   - Keep owner-only gating with `dashboard_admins` and server-side checks.

5. Rewrite secure web operations.
   - Route bot management through `insforge.functions.invoke("manage-bot")`.
   - Reduce direct server-action REST writes where official SDK/function patterns are better.
   - Keep vault management robust and admin-scoped.

6. Align bot runtime with rebuilt backend.
   - Update any table/RLS assumptions that no longer match.
   - Re-check realtime auth and retain poll fallback if official server token guidance is insufficient.

7. Apply destructive backend reset.
   - Execute SQL via InsForge MCP.
   - Update or redeploy edge functions via InsForge MCP.
   - Verify backend metadata after reset.

8. Validate code and runtime.
   - Run required quality gates for touched apps.
   - Fix regressions until type-check, lint, formatting, tests, and build pass.

9. Update project memory.
   - Record the new canonical backend/auth architecture and current state in memory-bank files.

## Success Criteria

- Login works through one consistent official auth flow.
- OTP verify and password reset flows work against live backend settings.
- Vault operations work for dashboard admins only.
- Bot add/update/delete works through the secure function path.
- Rebuilt tables all have a real runtime purpose.
- Live backend metadata matches repo expectations.
- Required quality gates pass for modified code.

## Risks

- The current bot realtime token flow may still require a documented workaround or polling fallback.
- A destructive reset can reveal hidden runtime dependencies not captured in memory or docs.
- Owner allowlist behavior may require one thin custom layer if official middleware alone cannot enforce it.
