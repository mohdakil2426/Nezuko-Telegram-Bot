# Nezuko Full Codebase Audit

Date: 2026-03-13
Scope: Entire repository, with primary focus on `apps/grammy`, `apps/web`, `insforge/`, `tests/grammy`, and runtime-affecting project configuration
Method: Memory bank review, project rule review, skill/reference review, source inspection, targeted tool-assisted verification, and quality-gate execution

## Skills Used For This Audit

This audit was grounded in the following project skills and their referenced materials:

- `memory-bank/projectbrief.md`
- `memory-bank/productContext.md`
- `memory-bank/activeContext.md`
- `memory-bank/systemPatterns.md`
- `memory-bank/techContext.md`
- `memory-bank/progress.md`
- `.agents/workflows/memorybank.md`
- `.agents/skills/code-review-excellence/SKILL.md`
- `.agents/skills/grammy/SKILL.md` and its reference set
- `.agents/skills/next-best-practices/SKILL.md` and its reference set
- `.agents/skills/next-cache-components/SKILL.md`
- `.agents/skills/shadcn-ui/SKILL.md` and its references/examples
- `.agents/skills/tanstack-query/SKILL.md` and its references/templates
- `.agents/skills/typescript-expert/SKILL.md` and references
- `.agents/skills/typescript-advanced-types/SKILL.md`
- `.agents/skills/insforge/SKILL.md` and module references
- `.agents/skills/postgres-pro/SKILL.md` and references
- `.agents/skills/react-doctor/SKILL.md`
- `.agents/skills/vercel-react-best-practices/SKILL.md`
- `.agents/skills/vercel-react-best-practices/AGENTS.md`
- `.agents/skills/vercel-composition-patterns/SKILL.md`
- `.agents/skills/vercel-composition-patterns/AGENTS.md`
- `.agents/skills/web-design-guidelines/SKILL.md`
- live Web Interface Guidelines source fetched from `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
- `.agents/skills/ui-ux-pro-max/SKILL.md`

Skill-to-scope mapping used in practice:

- `grammy`, `typescript-expert`, and `postgres-pro` for bot runtime, DB contract, and control-plane correctness.
- `insforge` for RLS, edge-function, anon-key, and vault exposure review.
- `next-best-practices`, `next-cache-components`, `vercel-react-best-practices`, `react-doctor`, `web-design-guidelines`, and `ui-ux-pro-max` for the web/dashboard pass.
- `tanstack-query`, `shadcn-ui`, and `vercel-composition-patterns` for component/data-flow review in the dashboard.

## Validation Performed

### Repository inventory

- `apps/grammy/src`: 53 files
- `apps/web/src`: 150 files
- `tests/grammy`: 32 files

### Quality gates executed

- `cd apps/grammy && bun run type-check` ✅
- `cd apps/grammy && bun run lint` ✅
- `cd apps/grammy && bun run test` ✅ 163/163
- `cd apps/grammy && bun run build` ✅
- `cd apps/web && bun run type-check` ✅
- `cd apps/web && bun run lint` ✅
- `cd apps/web && bun run build` ❌
- `cd apps/web && npx -y react-doctor@latest . --verbose --diff` ✅ executed for additional React-specific verification

### Build failure observed

`apps/web` fails production build because Next.js 16 cache components reject `export const dynamic = "force-dynamic"` in `src/app/api/auth/route.ts`.

### Additional second-pass coverage

The follow-up pass explicitly re-read and confirmed behavior in:

- `apps/web/src/lib/actions/vault.ts`
- `apps/web/src/app/dashboard/layout.tsx`
- `apps/web/src/components/settings/vault-section.tsx`
- `apps/web/src/components/settings/security-vault-card.tsx`
- `apps/web/src/proxy.ts`
- `apps/web/src/components/login-form.tsx`
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/forgot-password/page.tsx`
- `apps/web/src/app/verify-email/page.tsx`
- `apps/web/src/app/reset-password/page.tsx`
- `apps/web/src/components/analytics/analytics-page-content.tsx`
- `apps/web/src/app/dashboard/analytics/page.tsx`

This second pass was used to separate confirmed defects from tool-only warnings. In particular, the `useSearchParams` warnings reported by `react-doctor` for login, verify-email, reset-password, and analytics were checked manually against the actual page wrappers and were not promoted to findings because the required `Suspense` boundaries are already present.

## Executive Summary

The repository is structurally disciplined and most local quality gates are green, especially on the grammY runtime. However, the audit found several high-severity security defects in the InsForge policy/function layer that undermine the project's stated security model, plus one confirmed web build blocker and a handful of runtime integrity issues in the bot control plane.

The dominant pattern across the highest-severity findings is overuse of the public anon key and anon RLS privileges for operations that are explicitly supposed to remain server-side only.

## Findings

### P0

#### 1. Secret vault exposes the master encryption key to anon clients

- File: `insforge/migrations/023_fresh_grammy_schema.sql:1505-1512`
- File: `apps/web/src/lib/actions/vault.ts:29`
- File: `apps/web/src/components/settings/vault-section.tsx:17`
- File: `apps/web/src/components/settings/security-vault-card.tsx:55`

`nezuko_secrets` currently grants `SELECT` to `anon`, and the web settings flow reads `key_value` using the public `NEXT_PUBLIC_INSFORGE_ANON_KEY` before passing the raw key into a client component. This directly violates the project rule that the master key stays server-side only.

Impact:

- Any browser session or any caller with the public anon key can read the vault secret.
- Token encryption becomes security theater because the key is distributed to untrusted clients.

Recommended fix:

- Remove anon read/write access to `nezuko_secrets`.
- Stop returning raw `key_value` to the web client.
- Replace the current UI with server-only status/actions such as configured, missing, rotate.
- Restrict encryption/decryption to trusted server actions or privileged edge/backend functions.

#### 2. Admin-state tables are writable with the public anon key

- File: `insforge/migrations/023_fresh_grammy_schema.sql:1451`
- File: `insforge/migrations/023_fresh_grammy_schema.sql:1457`
- File: `insforge/migrations/023_fresh_grammy_schema.sql:1463`
- File: `insforge/migrations/023_fresh_grammy_schema.sql:1558-1565`
- File: `apps/web/src/lib/insforge.ts:8`
- File: `apps/web/src/lib/services/groups.service.ts:70`
- File: `apps/web/src/lib/services/channels.service.ts:61`

The browser receives `NEXT_PUBLIC_INSFORGE_ANON_KEY`, while the schema grants anon mutation capability on `protected_groups`, `enforced_channels`, `group_channel_links`, and `bot_instances`. That means core admin objects are mutable outside authenticated dashboard flows.

Impact:

- Untrusted callers can mutate protected groups, enforced channels, links, and bot metadata.
- Dashboard auth becomes an interface-layer control rather than a true data-layer control.

Recommended fix:

- Remove anon write policies from admin-controlled tables.
- Re-scope anon access strictly to bot-runtime operations that genuinely require it.
- Route dashboard mutations through authenticated server actions or privileged backend functions.

#### 3. `manage-bot` edge function executes privileged mutations without authenticating callers

- File: `insforge/functions/manage-bot.js:43`
- File: `insforge/functions/manage-bot.js:152-246`
- File: `insforge/functions/manage-bot.js:253-292`
- File: `insforge/functions/manage-bot.js:299-320`
- File: `insforge/migrations/023_fresh_grammy_schema.sql:1558-1565`

The `manage-bot` edge function accepts `add`, `update`, and `delete` operations without validating session or role. It then performs database writes through env-based credentials while the underlying schema grants anon mutation capability on `bot_instances`. The `add` path also accepts `master_key` in the request body.

Impact:

- Public callers can create, activate, deactivate, or soft-delete bot instances.
- The bot control plane can be modified without trusted server authorization.

Recommended fix:

- Require authenticated server-side invocation only.
- Validate caller identity/role inside the function before executing any action.
- Remove public/anon mutation rights from `bot_instances`.
- Eliminate `master_key` as a request-body input.

### P1

#### 4. Web production build is currently broken under Next.js 16 cache components

- File: `apps/web/src/app/api/auth/route.ts:13`
- File: `apps/web/next.config.ts:16`

The repository enables `cacheComponents: true`, but `src/app/api/auth/route.ts` still exports `dynamic = "force-dynamic"`, which Next.js 16 explicitly rejects in this mode. This was reproduced by `cd apps/web && bun run build`.

Impact:

- Current web app is not in a releasable production-build state.
- Memory bank claims of green web build are stale relative to the checked source.

Recommended fix:

- Remove the route-segment `dynamic` export.
- Replace it with a cache-components-compatible auth-route pattern.
- Re-run `bun run build` and only then update memory bank/build status claims.

#### 5. Dev auth bypass is enforced inconsistently outside `proxy.ts`

- File: `apps/web/src/app/dashboard/layout.tsx:38`
- File: `apps/web/src/lib/actions/vault.ts:11`
- File: `apps/web/src/proxy.ts:53`

`proxy.ts` correctly gates dev bypass behind `NODE_ENV !== "production"`, but `DashboardLayout` and `requireAuth()` bypass auth based only on `NEXT_PUBLIC_DEV_LOGIN === "true"`. This is inconsistent with the project rule that dev bypass must never work in production.

Impact:

- Defense-in-depth is broken.
- Future route exclusions or direct server-action paths can accidentally keep bypass behavior in production.

Recommended fix:

- Centralize `isDevBypassEnabled = NEXT_PUBLIC_DEV_LOGIN === "true" && NODE_ENV !== "production"`.
- Use the same helper in every auth gate and server action.

#### 6. Standalone bot startup logs part of the bot token

- File: `apps/grammy/src/main.ts:101-107`

Standalone mode prints the first 10 characters of `BOT_TOKEN` in the startup banner.

Impact:

- Partial secret disclosure into terminals, hosted logs, recordings, or shared environments.

Recommended fix:

- Remove token preview entirely.
- Log bot username and bot ID after `getMe()` succeeds instead.

#### 7. Command claiming is not atomic in `CommandWorker`

- File: `apps/grammy/src/services/command-worker.ts:181-191`

`processCommand` patches `admin_commands` using only `id`, not `id + status=pending`, and it does not verify that exactly one row transitioned to `processing`. With realtime delivery plus polling fallback, two workers can claim and execute the same command.

Impact:

- Duplicate start/stop/restart handling.
- Broken exactly-once semantics for admin commands.

Recommended fix:

- Claim commands with a conditional patch on both `id` and `status=eq.pending`.
- Verify one row was changed before executing.
- Skip execution when the claim loses the race.

#### 8. Multi-bot member sync is globally scoped instead of bot-scoped

- File: `apps/grammy/src/services/member-sync.ts:20-23`
- File: `apps/grammy/src/services/member-sync.ts:39-64`

The code comments already acknowledge that groups are not bot-scoped, yet every running bot syncs every enabled protected group and linked channel.

Impact:

- Repeated 403s for groups not owned by the current bot.
- Unnecessary Telegram API traffic and avoidable rate-limit pressure.
- Noisy logs in multi-bot dashboard mode.

Recommended fix:

- Introduce bot ownership/scoping for protected groups.
- Or centralize member sync in one non-token-specific process.

### P2

#### 9. `startMemberSync` leaves an initial timer alive after shutdown

- File: `apps/grammy/src/services/member-sync.ts:96-104`
- File: `apps/grammy/src/main.ts:180-181`

`startMemberSync` creates both a startup `setTimeout` and a recurring interval, but only returns the interval handle. Shutdown clears the interval only, so a fast stop after boot can still allow one late sync pass.

Impact:

- Post-shutdown side effects against Telegram and InsForge.

Recommended fix:

- Return a disposable object or both timer handles.
- Clear the startup timeout during shutdown too.

#### 10. Vault UI copy no longer matches real onboarding behavior

- File: `apps/web/src/components/settings/security-vault-card.tsx:142`
- File: `insforge/functions/manage-bot.js:196`

The settings page says existing tokens are stored using insecure encoding when no master key exists, but `manage-bot` actually hard-fails onboarding if encryption cannot proceed.

Impact:

- Operators are given misleading setup guidance.

Recommended fix:

- Update the copy to state that bot onboarding is blocked until the vault is configured.

## Positive Notes

- grammY quality gates are green: type-check, lint, tests, and build all pass.
- Test coverage around bot runtime wiring and delayed verification behavior is materially useful.
- Source organization aligns well with the documented architecture and memory bank.
- Web lint and type-check still pass, so the current web issue is a targeted build/config incompatibility rather than broad source decay.

## Confirmed Non-Findings

- `react-doctor` reported `useSearchParams` bailout warnings on auth and analytics screens, but manual review confirmed those flows are wrapped in `Suspense` at the page boundary, so they are not included as audit defects.
- `react-doctor` also reported several React Compiler warnings around `try/catch`-style control flow. Those are worth keeping on the team's maintenance radar, but this audit did not elevate them because they were not confirmed to cause a runtime failure, correctness bug, or production build break in the inspected code.

## Recommended Remediation Order

1. Lock down `nezuko_secrets`, `bot_instances`, and other admin tables at the RLS/policy layer.
2. Add real authentication/authorization to `insforge/functions/manage-bot.js`.
3. Remove all client-side master-key reads from the web dashboard.
4. Fix the `apps/web` build blocker in `src/app/api/auth/route.ts`.
5. Make `CommandWorker` command claims atomic.
6. Rework member-sync ownership/scoping and timer cleanup.
7. Clean up misleading vault copy and token logging.

## Audit Conclusion

The project is still close to operationally solid on the bot runtime path, and the second pass did not overturn the core findings. It did, however, tighten the evidence: the highest-risk issues remain concentrated in the InsForge security boundary, not in speculative frontend lint noise. The most urgent work is still removing anon-key reachability from vault and control-plane operations, then restoring the web production build.
