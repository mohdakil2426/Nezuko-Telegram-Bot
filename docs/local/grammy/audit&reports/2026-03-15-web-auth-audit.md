# Web Dashboard Audit Report

Date: 2026-03-15
Scope: `apps/web/`, shared `insforge/` migrations relevant to web auth/data access, deployment config
Excluded: `apps/grammy/`
Reviewer basis: code review, local package inspection, official InsForge auth docs fetched via MCP, official Next.js docs, official Vercel docs
Overall assessment: `REQUEST_CHANGES`

## Executive Summary

The web dashboard does not currently follow the safest official auth shape end to end. The biggest issues are:

- session cookies can be minted from URL parameters in the proxy without token verification
- the dashboard reads privileged base tables directly from the browser-facing layer
- authenticated RLS policies are effectively global allow rules, so tenant isolation is not enforced
- the login flow is inconsistent with the redirect and cookie-sync behavior documented by InsForge

The production login problem is not just one bug. It is a stack of auth contract mismatches:

- redirect param mismatch (`redirect` vs `redirectTo`)
- custom OTP verification bypassing the normal cookie sync path
- proxy-level manual cookie bootstrapping that trusts unverified URL parameters
- brittle client-side forced logout behavior masking real backend/auth errors

## Auth Best-Practice Conformance

### What official docs require

InsForge official Next.js guidance requires:

- `InsforgeMiddleware(...)` for route protection
- `app/api/auth/route.ts` using `createAuthRouteHandlers(...)`
- `InsforgeBrowserProvider` for browser auth state
- cookie-based SSR auth via `/api/auth`

InsForge official SDK guidance also states:

- `verifyEmail()` returns a session token on success
- `signInWithOAuth()` callback handling is automatic in the SDK
- `getCurrentSession()` restores sessions from the httpOnly cookie

Next.js official guidance shows:

- auth callbacks should set cookies in a server handler and then redirect
- route protection should rely on verified session cookies, not raw callback query params
- `NEXT_PUBLIC_*` values are inlined into the browser bundle at build time

Vercel official guidance recommends:

- explicit security headers
- a real `Content-Security-Policy`

### Where this codebase diverges

1. Session establishment is partially reimplemented in [`apps/web/src/proxy.ts`](../../apps/web/src/proxy.ts) instead of relying only on the documented `/api/auth` cookie-sync flow.
2. The proxy trusts auth query params and writes cookies before any token verification step.
3. The OTP verification page gets an access token back from `verifyEmail()` but does not persist that into the SSR cookie channel before navigating.
4. Redirect naming is inconsistent across middleware, login page, and query error handling.
5. The app trusts cookie presence as authenticated state, but local inspection of `@insforge/nextjs` shows `auth()` only parses cookies and does not validate JWTs server-side.

Conclusion: the auth system does not fully follow official best practices yet.

## Findings

### P0 - Critical

1. [`apps/web/src/proxy.ts:89`](../../apps/web/src/proxy.ts#L89) allows session forgery from URL parameters.

Evidence:

- The proxy reads `access_token`, `user_id`, and `email` directly from the URL.
- It sets `insforge-session` and `insforge-user` cookies immediately at lines 98-111.
- No validation step occurs before these cookies become the source of truth for later auth checks.
- [`apps/web/src/app/dashboard/layout.tsx:47`](../../apps/web/src/app/dashboard/layout.tsx#L47) and [`apps/web/src/providers/insforge-provider-wrapper.tsx:25`](../../apps/web/src/providers/insforge-provider-wrapper.tsx#L25) trust `auth()` output derived from these cookies.

Why this violates best practice:

- Next.js official callback guidance is "set cookie in a server handler, then redirect".
- InsForge official Next.js guidance already provides `/api/auth` as the cookie sync boundary for SSR.
- Trusting raw query params at the proxy layer bypasses the documented auth exchange boundary.

Impact:

- session fixation / spoofed authenticated state
- weak trust boundary for all SSR-protected dashboard pages

Correct solution:

- remove proxy-side URL-param cookie minting entirely
- let the official InsForge callback and `/api/auth` route own cookie sync
- if a custom callback is unavoidable, move it to a dedicated server route that validates the token with the backend before setting any cookie

2. [`apps/web/src/lib/services/bots.service.ts:35`](../../apps/web/src/lib/services/bots.service.ts#L35) exposes encrypted bot-token material to the web data layer.

Evidence:

- `listBots()` queries `bot_instances` with `select("*")`.
- [`insforge/migrations/023_fresh_grammy_schema.sql:1533`](../../insforge/migrations/023_fresh_grammy_schema.sql#L1533) defines `bot_instances_safe`, a view that intentionally omits `token_encrypted`.

Why this violates best practice:

- secrets should never be available to the browser-facing read path, even if encrypted
- the schema already defines the safe projection; the application is bypassing it

Impact:

- encrypted secrets leak into client-visible network/database responses
- unnecessary exposure of vault-adjacent secret material

Correct solution:

- query `bot_instances_safe` only
- or move bot listing behind a server action that returns a minimal DTO
- never `select("*")` from privileged control-plane tables

3. [`insforge/migrations/023_fresh_grammy_schema.sql:1453`](../../insforge/migrations/023_fresh_grammy_schema.sql#L1453), [`...:1459`](../../insforge/migrations/023_fresh_grammy_schema.sql#L1459), [`...:1466`](../../insforge/migrations/023_fresh_grammy_schema.sql#L1466), and [`...:1470`](../../insforge/migrations/023_fresh_grammy_schema.sql#L1470) leave authenticated tenant isolation effectively disabled.

Evidence:

- `groups_auth_all`, `channels_auth_all`, `links_auth_all`, and `bot_instances_auth_all` all use `USING (TRUE)` and `WITH CHECK (TRUE)`.
- [`apps/web/src/lib/services/groups.service.ts:29`](../../apps/web/src/lib/services/groups.service.ts#L29), [`apps/web/src/lib/services/channels.service.ts:24`](../../apps/web/src/lib/services/channels.service.ts#L24), and [`apps/web/src/lib/actions/vault.ts:326`](../../apps/web/src/lib/actions/vault.ts#L326) do not add ownership scoping at the application layer either.
- [`insforge/migrations/026_lock_down_anon_policies.sql`](../../insforge/migrations/026_lock_down_anon_policies.sql) removes anon access, but it does not harden authenticated ownership rules.

Why this violates best practice:

- authenticated access is not the same as authorized tenant access
- InsForge RLS should enforce ownership, not just login state

Impact:

- cross-tenant read/write access risk across groups, channels, links, and bots
- broken access control / IDOR-class exposure

Correct solution:

- redesign ownership columns around real dashboard-user identity
- enforce owner-scoped RLS on all dashboard-controlled tables
- make every web query consistent with that owner model

### P1 - High

4. [`apps/web/src/app/login/page.tsx:24`](../../apps/web/src/app/login/page.tsx#L24) and [`apps/web/src/providers/query-provider.tsx:49`](../../apps/web/src/providers/query-provider.tsx#L49) use different redirect parameter names.

Evidence:

- login page reads `redirectTo`
- middleware-driven unauth redirects currently use `redirect`
- query-provider also forces `/login?redirectTo=...`
- [`apps/web/src/providers/insforge-provider.tsx:24`](../../apps/web/src/providers/insforge-provider.tsx#L24) hardcodes `/dashboard` as the post-login destination

Impact:

- users lose deep links after sign-in
- session-expiry recovery returns users to the wrong page
- auth behavior differs between middleware redirects, manual redirects, and provider redirects

Correct solution:

- standardize on one redirect param name across proxy, login, provider, and error handling
- preserve original path after login and validate it against open redirects

5. [`apps/web/src/components/auth/verify-email-form.tsx:34`](../../apps/web/src/components/auth/verify-email-form.tsx#L34) verifies OTP but does not sync SSR cookies before routing to `/dashboard`.

Evidence:

- `verifyEmail()` succeeds and returns `accessToken`
- code only calls `router.push("/dashboard")`
- InsForge official Next.js docs state `/api/auth` exists specifically to sync tokens into httpOnly cookies for server-side middleware

Impact:

- successful OTP verification can still fail server-side auth on the next SSR navigation
- users can see "verified" client success followed by dashboard bounce/loop behavior

Correct solution:

- after successful OTP verification, sync the session through the official `/api/auth` route before navigation
- or move OTP verification into the documented provider-managed auth flow

6. [`apps/web/src/providers/query-provider.tsx:36`](../../apps/web/src/providers/query-provider.tsx#L36) treats generic `403`, `Unauthorized`, and `jwt` strings as session expiry.

Impact:

- real backend bugs get misreported as auth expiry
- users are forcibly redirected to login for non-auth failures
- query state is lost and debugging becomes harder

Correct solution:

- only redirect on structured auth failures with known status/error codes
- do not substring-match arbitrary error messages for auth state

7. [`apps/web/src/lib/actions/vault.ts:49`](../../apps/web/src/lib/actions/vault.ts#L49) writes `owner_telegram_id` from `auth().userId` by coercing it to a number or `0`.

Impact:

- bot ownership metadata can become incorrect
- the ownership model is unstable if InsForge user IDs are not Telegram IDs
- this blocks any future attempt to build correct owner-scoped RLS

Correct solution:

- stop overloading `owner_telegram_id` with InsForge auth subject IDs
- introduce a separate dashboard-owner identity column or mapping table

### P2 - Medium

8. [`apps/web/src/lib/services/groups.service.ts:24`](../../apps/web/src/lib/services/groups.service.ts#L24) and [`apps/web/src/lib/services/channels.service.ts:19`](../../apps/web/src/lib/services/channels.service.ts#L19) silently truncate data to the first 10 rows by default.

Impact:

- UI looks complete while only showing the first page
- client-side table pagination can give a false sense that the full dataset is loaded

Correct solution:

- wire explicit server pagination state into the page and table
- or intentionally fetch all rows for small datasets with a documented limit

9. [`apps/web/vercel.json:21`](../../apps/web/vercel.json#L21) still sets `X-XSS-Protection` and lacks a `Content-Security-Policy`.

Impact:

- header set is incomplete for a production auth app
- CSP is the main missing browser-side mitigation for XSS and unsafe third-party script execution

Correct solution:

- add a real CSP tuned for Next.js, InsForge auth, and any external assets
- keep `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`
- drop obsolete reliance on `X-XSS-Protection`

10. [`apps/web/src/components/auth/reset-password-form.tsx`](../../apps/web/src/components/auth/reset-password-form.tsx) enforces a different password policy than the live backend.

Evidence:

- live backend metadata reports `passwordMinLength: 6`
- the UI currently enforces 8 characters

Impact:

- unnecessary user rejection in the UI
- frontend and backend auth policy drift

Correct solution:

- source password policy from shared config or backend metadata

### P3 - Low

11. Realtime hook ownership remains more complex than necessary and appears to still initialize logic redundantly under coordinator mode.

Impact:

- unnecessary listener setup and state churn
- higher maintenance cost around dashboard realtime behavior

Correct solution:

- ensure the coordinator is the only effective owner of the shared realtime lifecycle

## Recommended Remediation Order

1. Remove proxy-based auth cookie minting and restore the documented auth callback boundary.
2. Fix OTP verification so successful email verification produces a real SSR session.
3. Standardize redirect handling across middleware, login page, provider, and forced-login flows.
4. Replace direct reads from `bot_instances` with `bot_instances_safe`.
5. Redesign ownership and apply real RLS tenancy rules for authenticated users.
6. Tighten session-expiry handling to use structured auth errors only.
7. Add proper server pagination or explicit full-fetch behavior to groups/channels.
8. Add CSP and refresh the Vercel header policy.

## Auth-System Target Shape

The web app should converge on this model:

- middleware protects routes and only checks established session cookies
- `/api/auth` is the only browser-to-SSR token sync bridge
- provider-managed login/OAuth sets and refreshes the browser session
- OTP verification also feeds into that same cookie-sync path
- SSR uses `auth()` only after the session cookie has been established through the documented flow
- database access is owner-scoped by RLS, not by UI convention

## Sources

Official documentation used in this audit:

- Next.js auth guidance: https://nextjs.org/docs/app/building-your-application/authentication
- Next.js proxy file conventions and cookie handling: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- Next.js environment variables: https://nextjs.org/docs/app/guides/environment-variables
- Vercel security headers: https://vercel.com/docs/headers/security-headers
- Vercel `vercel.json` headers config: https://vercel.com/docs/project-configuration/vercel-json

Official InsForge docs fetched via MCP:

- `Next.js` auth components docs for `@insforge/nextjs`
- `Authentication SDK Reference`
- backend metadata for live auth policy (`requireEmailVerification=true`, `verifyEmailMethod=code`, `resetPasswordMethod=code`, `passwordMinLength=6`)

Local implementation references used to validate behavior:

- `apps/web/src/proxy.ts`
- `apps/web/src/app/dashboard/layout.tsx`
- `apps/web/src/providers/insforge-provider.tsx`
- `apps/web/src/providers/insforge-provider-wrapper.tsx`
- `apps/web/src/providers/query-provider.tsx`
- `apps/web/src/components/auth/verify-email-form.tsx`
- `apps/web/src/lib/services/bots.service.ts`
- `apps/web/src/lib/services/groups.service.ts`
- `apps/web/src/lib/services/channels.service.ts`
- `apps/web/src/lib/actions/vault.ts`
- `insforge/migrations/023_fresh_grammy_schema.sql`
- `insforge/migrations/026_lock_down_anon_policies.sql`
