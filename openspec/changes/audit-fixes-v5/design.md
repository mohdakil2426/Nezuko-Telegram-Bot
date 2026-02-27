## Context

The Nezuko Telegram Bot platform consists of three interconnected codebases:
- **Bot** (`apps/bot/`): Python 3.13.1, python-telegram-bot v22.6, httpx REST client for InsForge
- **Web Dashboard** (`apps/web/`): Next.js 16, React 19, @insforge/sdk, TanStack Query
- **InsForge Backend**: Managed PostgreSQL (12 tables), 2 edge functions, realtime WebSocket, 2 storage buckets

A comprehensive v5 audit identified 25+ issues. This design addresses all of them in a phased, safe rollout.

**Current critical state**:
1. All 12 DB tables have RLS disabled — any anonymous user can read/write everything including encryption keys
2. Dashboard has zero authentication — stub `useAuth()` always returns `true`
3. Bot tokens added via dashboard stored as plain base64 (master_key not passed to edge function)
4. Two web services query non-existent tables (will crash on page load)
5. Bot lacks a global error handler — unhandled exceptions silently kill the bot

## Goals / Non-Goals

**Goals:**
- Fix all 5 CRITICAL issues before any production deploy
- Fix all 8 HIGH priority issues for security and reliability
- Address MEDIUM priority issues for correctness and data integrity
- Implement LOW priority enhancements where effort is minimal
- All fixes must pass existing test suite + add tests for new code
- Zero breaking changes to existing bot functionality for end-users

**Non-Goals:**
- Full Tailwind v4 → v3.4 downgrade (ISSUE-IF-9) — too risky for a fix batch; document as known deviation
- Complete rewrite of any module — surgical fixes only
- New features beyond what's needed to fix identified issues
- Mobile app or additional platform support

## Decisions

### Decision 1: RLS Strategy — Service-Role Key for Bot, Anon Key Stays for Web (with auth)

**Choice**: Enable RLS on all 12 tables. Create policies granting `authenticated` role full CRUD. The bot will use the **admin API key** (service-role equivalent) which bypasses RLS. The web dashboard will use `@insforge/nextjs` auth so SDK calls carry a user JWT.

**Why not anon key + permissive policies?** That defeats the purpose of RLS. The anon key should only access public data.

**Why not service-role for web too?** Exposing a service-role key in a Next.js client bundle is a security anti-pattern.

**Risk**: Bot's existing API key already bypasses RLS (it's the admin key), so bot code changes are zero.

### Decision 2: Auth Implementation — `@insforge/nextjs` (Official Package)

**Choice**: Use `@insforge/nextjs` per the official InsForge docs. This gives us middleware route protection, `useAuth()`/`useUser()` hooks, `<SignedIn>/<SignedOut>` components, and server-side `auth()`.

**Why not custom auth?** InsForge already provides a complete auth system. Rolling our own would be duplicating work and introducing security risks.

**Migration**: Replace stub `use-auth.ts` with real `@insforge/nextjs` hooks. Existing components that import `useAuth` will work with the new hook after type adjustment (`isAuthenticated` → `isSignedIn`).

### Decision 3: Phantom Table Fix — Remove `audit.service.ts` + Fix `logs.service.ts`

**Choice**: Delete `audit.service.ts` entirely (tables don't exist, no plans to create them). Fix `logs.service.ts` to map real `admin_logs` columns (`logger`, `module`, `function`, `line_no`, `path`) instead of phantom `extra`.

**Why not create the missing tables?** The `admin_audit_log` was a planned feature that was cleaned up in migration 009. The existing `admin_logs` table serves the audit purpose.

### Decision 4: Bot Token Encryption Fix — Server Action Fetches Master Key

**Choice**: Modify `addBot()` to be a Next.js Server Action (or call existing `getMasterKey()` server action) to securely fetch the master key, then pass it to the `manage-bot` edge function.

**Why server action?** The master key must never be exposed to the client. Server Actions run on the server and can securely access InsForge.

### Decision 5: PTB Improvements — Defaults Class + Global Error Handler

**Choice**: Add `Defaults(parse_mode=ParseMode.HTML)` to `ApplicationBuilder`. Add `Application.add_error_handler()` that logs errors and notifies admins.

**Why HTML parse mode?** Most handlers already use HTML. The few using Markdown will be converted.

### Decision 6: getChatMember Caching — Redis TTL Cache

**Choice**: Cache `getChatMember` results in Redis with a 5-minute TTL per (user_id, chat_id) pair. This eliminates redundant API calls for active users.

**Why 5 minutes?** Balances freshness (user joins/leaves within 5 min would be stale) vs API rate limit safety. The verification flow will always do a live check.

### Decision 7: Migration Phases — Database First, Then Code

**Choice**: Apply database migrations (RLS, FKs, bot_id columns) first, then deploy code changes. This ensures the database is ready before code expects it.

**Rollback**: RLS policies can be dropped with a single migration. FK additions are additive and non-breaking.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| RLS enablement breaks bot operations | Bot uses admin API key that bypasses RLS — verify this first |
| `@insforge/nextjs` version incompatibility with Next.js 16 | Test locally before deploying; InsForge docs confirm Next.js support |
| Removing `audit.service.ts` breaks audit log UI page | Remove the page/route too, or replace with `admin_logs` based view |
| getChatMember cache returns stale data | Verification flow always does live check; cache only for message handler |
| Tailwind v4 stays (not downgrading) | Document as known deviation; test that InsForge SDK components render correctly |
| Large changeset across 30+ files | Phase deployment: DB migrations → bot fixes → web fixes |
