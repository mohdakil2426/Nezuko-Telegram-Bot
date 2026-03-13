# 2026-03-13 Fix Summary

## Scope

This pass moved from audit into implementation. The goals were:

- fix the confirmed security and runtime issues from the audit
- validate the full web analytics/chart stack against live InsForge RPCs
- verify local web and grammY quality gates
- apply safe live backend changes through InsForge MCP

## Skills Used

- `insforge`
- `grammy`
- `next-best-practices`
- `next-cache-components`
- `tanstack-query`
- `typescript-expert`
- `typescript-advanced-types`
- `postgres-pro`
- `react-doctor`
- `vercel-react-best-practices`
- `vercel-composition-patterns`
- `web-design-guidelines`
- `ui-ux-pro-max`

## Major Code Changes

### 1. Security Vault and Bot Onboarding Hardening

Files:

- `apps/web/src/lib/actions/vault.ts`
- `apps/web/src/components/settings/vault-section.tsx`
- `apps/web/src/components/settings/security-vault-card.tsx`
- `apps/web/src/lib/services/bots.service.ts`

What changed:

- Replaced browser-visible master-key access with metadata-only vault status reads.
- Added `getVaultStatus()` so the UI knows whether the vault is configured without exposing `key_value`.
- Moved secure bot onboarding/update/delete to authenticated server actions.
- Added server-side Telegram token verification.
- Added server-side AES-256-GCM encryption before persistence.
- Added PATCH-then-POST behavior for `nezuko_secrets` and `bot_instances`.
- Ensured the browser no longer receives the stored master key.

Result:

- plaintext vault material is no longer exposed to the client
- bot token encryption remains server-side
- bot CRUD no longer depends on an unauthenticated public path

### 2. Edge Function Hardening

Files:

- `insforge/functions/manage-bot.js`

What changed:

- `verify` remains available for token validation only
- `add`, `update`, and `delete` now require `Authorization: Bearer <user token>`
- the function now authenticates the caller with InsForge before privileged actions
- the function fetches the vault key itself instead of accepting `master_key` from the request body
- token encryption now happens inside the function using AES-GCM

Live status:

- deployed live via InsForge MCP on 2026-03-13

### 3. Bot Runtime Hardening

Files:

- `apps/grammy/src/config.ts`
- `apps/grammy/src/main.ts`
- `apps/grammy/.env.example`
- `apps/web/.env.example`

What changed:

- introduced `INSFORGE_SERVICE_KEY` support
- dashboard-mode bot runtime now prefers a server-side key via `insforgeServerKey`
- startup messaging and examples were updated to reflect the new contract
- removed token-prefix logging from startup output

Result:

- production can move off anon-writable control-plane access
- token leakage risk in startup logs is reduced

### 4. Multi-Bot Command and Sync Correctness

Files:

- `apps/grammy/src/services/command-worker.ts`
- `apps/grammy/src/services/member-sync.ts`
- `apps/grammy/src/database/group.repo.ts`
- `apps/grammy/src/services/channel-linker.ts`
- `apps/grammy/src/multi-bot/bot-registry.ts`
- `apps/grammy/src/multi-bot/bot-lifecycle.ts`
- `apps/grammy/src/core/shutdown.ts`

What changed:

- command claims are now atomic by filtering on both `id` and `status = pending`
- workers now stop if they lose the claim race
- member sync now returns a cancellable handle instead of a raw interval
- sync ownership is recorded in `protected_groups.params.controller_bot_id`
- groups are synced only by the claiming bot after ownership is established
- sync shutdown now correctly clears both delayed start and recurring loop timers

Result:

- no duplicate command execution from concurrent workers
- reduced multi-bot sync collisions and timer leaks

### 5. Next.js and Web Runtime Fixes

Files:

- `apps/web/src/app/api/auth/route.ts`
- `apps/web/src/app/dashboard/layout.tsx`
- `apps/web/src/providers/insforge-provider-wrapper.tsx`
- `apps/web/src/lib/hooks/use-auth.ts`
- `apps/web/src/components/login-form.tsx`
- `apps/web/src/components/nav-user.tsx`
- `apps/web/src/components/settings/account-info-card.tsx`
- `apps/web/src/lib/api/config.ts`

What changed:

- removed the Next.js 16 cache-components build blocker from `/api/auth`
- unified `DEV_LOGIN` handling so it is disabled in production
- changed local dev-bypass mode so the InsForge browser provider is not mounted
- added a synthetic dev auth/user hook state for local bypass mode
- removed the noisy client-side `401 /api/auth/refresh` behavior during local testing

Result:

- web build passes cleanly under Next.js 16
- dev-mode local QA is clean and no longer polluted by auth refresh errors

### 6. Analytics and Chart Fixes

Files:

- `apps/web/src/lib/hooks/use-charts.ts`
- `apps/web/src/lib/services/dashboard.service.ts`
- `apps/web/src/components/analytics/overview-cards.tsx`
- `apps/web/src/components/ui/chart.tsx`
- `apps/web/src/components/dashboard/verification-chart.tsx`
- `apps/web/src/components/charts/api-calls-chart.tsx`
- `apps/web/src/components/charts/cache-breakdown-chart.tsx`
- `apps/web/src/components/charts/hourly-activity-chart.tsx`
- `apps/web/src/components/charts/top-groups-chart.tsx`
- `apps/web/src/components/charts/verification-distribution-chart.tsx`

What changed:

- removed dead overview-card highlight logic that depended on a no-op realtime event buffer
- switched overview highlighting to data-diff detection
- restored periodic refresh for API Calls distribution because realtime does not invalidate `api_call_log`
- fixed zero-value tooltip rendering
- corrected label/copy mismatches where charts said `All time` or `Last 24 hours` while the RPCs actually return `Last 7 days`
- changed misleading dashboard trend labeling from `Restricted` to `Not Verified`
- fixed bar coloring in Top Groups chart

Result:

- chart text now matches backend truth
- API calls chart no longer goes stale indefinitely
- tooltip/data rendering is more accurate

### 7. Test Fixes

Files:

- `tests/grammy/unit/services/command-worker.test.ts`
- `tests/grammy/unit/multi-bot/bot-lifecycle.test.ts`

What changed:

- updated command-worker tests for atomic claim semantics
- updated bot-lifecycle tests for the new cancellable member-sync handle

Result:

- grammY test suite is green again after the runtime changes

## Live InsForge Validation

Used InsForge MCP to verify live analytics/chart RPCs:

- `get_verification_distribution()`
- `get_cache_breakdown()`
- `get_groups_status()`
- `get_api_calls_distribution()`
- `get_hourly_activity()`
- `get_latency_distribution('7d')`
- `get_top_groups(10)`
- `get_cache_hit_rate_trend('30d')`
- `get_latency_trend('30d')`
- `get_bot_health()`
- `get_members_chart_data()`
- `get_analytics_overview('30d')`
- `get_verification_trends('30d', 'day')`
- `get_user_growth('30d', 'day')`

Findings:

- all of the above returned valid live payloads
- the earlier assumption that `get_user_growth` was still broken is no longer correct
- chart copy mismatches were frontend issues, not live RPC failures

## Browser Verification

Local runtime verification was performed with Playwright against `/dashboard/analytics` in dev mode using real backend data.

Confirmed:

- analytics page loads successfully
- all three tabs render
- live RPC requests return `200`
- no console errors remain in the final local pass
- the previous dev-mode InsForge refresh `401` error is gone

## Quality Gates Run

### Web

- `cd apps/web && bun run lint` ✅
- `cd apps/web && bun run type-check` ✅
- `cd apps/web && bun run build` ✅

### grammY

- `cd apps/grammy && bun run lint` ✅
- `cd apps/grammy && bun run type-check` ✅
- `cd apps/grammy && bun run test` ✅
- `cd apps/grammy && bun run build` ✅

## Live Change Applied

Applied live:

- updated InsForge edge function `manage-bot`

Confirmed live after update:

- the stored function code now matches the authenticated implementation

## Deliberately Not Applied Live

File:

- `insforge/migrations/026_lock_down_anon_policies.sql`

Reason:

- this migration removes anon access from secrets/control-plane/runtime tables
- applying it before production bot/web deployments fully use the new service-key/authenticated write paths could break the running system

Status:

- prepared in repo
- intentionally deferred pending deployment parity confirmation

## Memory Bank Updates

Updated:

- `memory-bank/activeContext.md`
- `memory-bank/progress.md`
- `memory-bank/systemPatterns.md`
- `memory-bank/techContext.md`

Added project-state notes for:

- service-key migration path
- dev-bypass auth/provider pattern
- completed analytics validation
- deferred live anon-policy lock-down

## Net Result

Completed:

- security vault exposure fix
- privileged bot management authentication fix
- server-side encryption path hardening
- multi-bot command-claim fix
- multi-bot member-sync ownership fix
- Next.js 16 web build fix
- web analytics/chart correctness fixes
- local browser verification with real backend data
- live edge-function update for `manage-bot`

Still pending:

- deploy production bot/web environments with the new secure access contract
- then apply `026_lock_down_anon_policies.sql` live
