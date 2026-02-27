## 1. Database Schema & Security (InsForge Migrations)

- [x] 1.1 Create migration `012_enable_rls.sql` — enable RLS on all 12 `public` tables and add `authenticated` role policies (SELECT/INSERT/UPDATE/DELETE as appropriate per table)
- [x] 1.2 Create RLS policy for `nezuko_secrets` — block anon SELECT, allow only service-role/admin access
- [x] 1.3 Create migration `013_add_missing_fks.sql` — add FK `bot_status.bot_instance_id → bot_instances.id` and FK `admin_commands.bot_id → bot_instances.bot_id`
- [x] 1.4 Create migration `014_add_bot_id_columns.sql` — add nullable `bot_id BIGINT` column to `admin_logs` and `api_call_log` tables
- [ ] 1.5 Verify all 13 RPC functions exist — run `SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace` and cross-reference with dashboard calls. Create any missing functions.
- [ ] 1.6 (Optional) Create migration for realtime RLS — enable RLS on `realtime.channels` and `realtime.messages` with subscribe/publish policies

> **Applied live** via InsForge MCP SQL tool:
> - All 12 tables have RLS enabled ✅
> - 38 RLS policies created ✅
> - bot_status FK added ✅
> - admin_commands FK added ✅
> - bot_id columns added to admin_logs + api_call_log ✅

## 2. Edge Function Fixes

- [x] 2.1 Fix `test-webhook` SSRF vulnerability — add URL validation: HTTPS-only, block private IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x, ::1), reject non-HTTPS schemes
- [x] 2.2 Update and deploy `test-webhook` edge function via `update-function` MCP tool

> **Deployed live** — SSRF guard includes: HTTPS-only, private IP blocks (RFC1918), localhost/loopback, link-local, cloud metadata endpoints, redirect=error ✅

## 3. Web Dashboard — Phantom Table & Logs Fix

- [x] 3.1 Delete `apps/web/src/lib/services/audit.service.ts` — queries non-existent `admin_audit_log` + `admin_users` tables
- [x] 3.2 Remove `auditService` export from `apps/web/src/lib/services/index.ts`
- [x] 3.3 Remove `audit` query keys from `apps/web/src/lib/query-keys.ts` (none existed)
- [x] 3.4 Remove or redirect any audit-log page/route in `apps/web/src/app/dashboard/` that imports the deleted service (none imported)
- [x] 3.5 Fix `logs.service.ts` — replace phantom `extra` column mapping with actual `admin_logs` columns: `logger`, `module`, `function`, `line_no`, `path`
- [x] 3.6 Update `LogEntry` interface — removed `extra`, added actual columns

## 4. Web Dashboard — Bot Token Encryption Fix

- [x] 4.1 Modify `addBot()` in `bots.service.ts` to fetch master key from `nezuko_secrets` before calling edge function
- [x] 4.2 Pass `master_key` in the body of `insforge.functions.invoke("manage-bot", { body: { action: "add", token, master_key, owner_telegram_id } })`
- [x] 4.3 Add error handling — if no master key exists, throw descriptive error prompting user to configure Security Vault first
- [x] 4.4 Fix hardcoded `owner_telegram_id: 0` — changed to required parameter `ownerTelegramId` (placeholder 0 until auth integrated)

## 5. Web Dashboard — Authentication (`@insforge/nextjs`)

- [ ] 5.1 Install `@insforge/nextjs` package: `cd apps/web && bun add @insforge/nextjs@latest`
- [ ] 5.2 Create `middleware.ts` in `apps/web/src/` with `InsforgeMiddleware({ baseUrl, publicRoutes: ['/'] })`
- [ ] 5.3 Create `app/api/auth/route.ts` with `createAuthRouteHandlers()`
- [ ] 5.4 Create `app/providers.tsx` with `InsforgeBrowserProvider` wrapping the app
- [ ] 5.5 Update `app/layout.tsx` to wrap children in `InsforgeProvider` and add `<SignedIn>/<SignedOut>` components
- [ ] 5.6 Replace stub `use-auth.ts` — re-export `useAuth` and `useUser` from `@insforge/nextjs`, update any components using `isAuthenticated` to use `isSignedIn`
- [ ] 5.7 Update `.env.local` to ensure `NEXT_PUBLIC_INSFORGE_BASE_URL` and `NEXT_PUBLIC_INSFORGE_ANON_KEY` are set

## 6. Bot — Global Error Handler

- [x] 6.1 Create `apps/bot/handlers/error.py` with `async def error_handler(update, context)` that logs full traceback via `logger.error()`
- [ ] 6.2 Add admin notification — send error summary to configured admin chat via `context.bot.send_message()`
- [x] 6.3 Register error handler in `apps/bot/core/loader.py` via `application.add_error_handler(error_handler)` (registered LAST after all handlers)

## 7. Bot — PTB Defaults & Parse Mode

- [x] 7.1 Add `Defaults(parse_mode=ParseMode.HTML)` via `create_application()` factory in `loader.py` — both standalone and dashboard bots use it
- [x] 7.2 Remove explicit `parse_mode="HTML"` from `ui.py` and `leave.py` (now redundant — rely on Defaults)
- [ ] 7.3 Convert any remaining Markdown formatting in handlers to HTML
- [ ] 7.4 DRY refactor: Extract shared welcome/help message template to `apps/bot/utils/messages.py`

## 8. Bot — getChatMember Cache

- [ ] 8.1 Create `apps/bot/services/membership_cache.py` with Redis-backed cache for `getChatMember` results (key: `member:{user_id}:{chat_id}`, TTL: 300s)
- [ ] 8.2 Modify `apps/bot/handlers/message.py` to check cache before calling `getChatMember`
- [ ] 8.3 Ensure verification handler (`verify.py`) bypasses cache and always calls live API
- [ ] 8.4 Add cache invalidation on member leave/join events

## 9. Bot — Verification Improvements

- [x] 9.1 Handle `ChatMemberRestricted` status in `apps/bot/services/verification.py` — check `.is_member` field to determine if restricted user is actually a member
- [x] 9.2 Fix `apps/bot/utils/ui.py` to show ALL missing channels (not just the first) in the verify response with join links
- [ ] 9.3 Add `ChatJoinRequest` handler in `apps/bot/handlers/` — auto-approve verified users, decline and DM instructions for unverified
- [x] 9.4 Move `query.answer()` to the first line of the verify callback handler (immediate acknowledgement)
- [x] 9.5 Add `use_independent_chat_permissions=True` to all `restrictChatMember` calls in `apps/bot/services/protection.py`
- [x] 9.6 Handle RESTRICTED → LEFT transition in `apps/bot/handlers/leave.py`

## 10. Bot — Encryption & Error Handling Fixes

- [x] 10.1 Replace bare `except Exception` in `apps/bot/core/encryption.py` with specific exceptions: `ValueError`, `OverflowError`, `UnicodeDecodeError`, `InvalidTag` check by type name
- [x] 10.2 Add generic catch in `apps/bot/handlers/leave.py` outermost level (`RuntimeError, ValueError, OSError, KeyError`)
- [x] 10.3 `create_application()` factory in loader.py used by bot_manager.py — consistent PTB configuration

## 11. Bot — Dependency Cleanup

- [x] 11.1 Remove unused production deps from `pyproject.toml`: `asyncpg`, `alembic`, `aiohttp`, `pyjwt`
- [x] 11.2 Add PTB extras: `python-telegram-bot[webhooks,callback-data,http2]` + pin `httpx<0.29`
- [x] 11.3 Run `uv sync` — 13 packages removed, 8 new packages installed (hiredis, orjson, tenacity, tornado, h2, etc.)
- [x] 11.4 Fix N+1 queries in `insforge_client.py` — both `get_group_channels()` and `get_groups_for_channel()` now use single batch `in.()` PostgREST filter

## 12. Verification & Testing

- [x] 12.1 `ruff check apps/bot` — **0 errors** ✅
- [x] 12.2 `ruff format --check .` — **75 files already formatted** ✅
- [x] 12.3 `pylint apps/bot --rcfile=pyproject.toml` — **10.00/10** ✅
- [x] 12.4 `pytest tests/bot/ -v` — **58 passed** ✅
- [x] 12.5 `cd apps/web && bun run lint` — **0 warnings** ✅
- [x] 12.6 `cd apps/web && bun run build` — **0 TypeScript errors** ✅
- [x] 12.7 `pyrefly check apps/bot` — **0 errors** ✅
- [ ] 12.8 Verify bot starts and operates correctly with all changes applied
