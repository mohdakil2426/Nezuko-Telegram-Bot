## Why

The comprehensive v5 audit of the Nezuko Telegram Bot platform identified **25+ issues** across bot, web dashboard, and InsForge backend — including **5 CRITICAL** security/data-integrity bugs, **8 HIGH** priority fixes, and **12+ MEDIUM/LOW** improvements. Two web services query **non-existent database tables** (will crash in production), bot tokens added via the dashboard are stored as **plain base64 instead of AES-256-GCM**, and there is **zero authentication** on the admin dashboard. These must be fixed before production deployment.

## What Changes

### Critical Fixes (MUST fix)
- **ISSUE-SEC-1**: Enable Row-Level Security (RLS) on all 12 InsForge tables — currently all data is publicly accessible via the anon key
- **ISSUE-SEC-1a**: RLS specifically on `nezuko_secrets` — master encryption key is readable by anyone
- **ISSUE-WEB-1**: Remove or fix `audit.service.ts` — queries `admin_audit_log` + `admin_users` tables that don't exist
- **ISSUE-WEB-2**: Fix `addBot()` to pass `master_key` to the `manage-bot` edge function so tokens are encrypted with AES-256-GCM
- **ISSUE-PTB-1**: Add global error handler to bot via `Application.add_error_handler()`

### High Priority Fixes
- **ISSUE-WEB-3**: Fix `addBot()` hardcoded `owner_telegram_id: 0` — pass actual owner ID
- **ISSUE-IF-8**: Install `@insforge/nextjs` for real authentication — middleware, provider, hooks, route protection
- **ISSUE-PTB-2**: Cache `getChatMember` results instead of calling API per message (rate limit risk)
- **ISSUE-IF-1**: Fix N+1 queries in `get_group_channels()` and `get_groups_for_channel()` using batch `in.()` filter
- **ISSUE-API-1**: Handle `RESTRICTED` ChatMember status in verification flow
- **ISSUE-PTB-3**: Use PTB `Defaults` class for `parse_mode=HTML` across all handlers
- **ISSUE-IF-5**: Fix SSRF vulnerability in `test-webhook` edge function — add URL validation
- **ISSUE-DEP-1**: Remove 4-5 unused production deps (asyncpg, alembic, aiohttp, pyjwt)

### Medium Priority Fixes
- **ISSUE-WEB-4**: Fix `logs.service.ts` to map actual `admin_logs` columns instead of non-existent `extra`
- **ISSUE-WEB-5**: Verify all 13 RPC functions exist in DB, create missing ones
- **ISSUE-PTB-4**: Move `query.answer()` to top of verify handler before processing
- **ISSUE-PTB-5**: Set up `post_init`/`post_shutdown` hooks in dashboard bot mode
- **ISSUE-IF-6**: Add missing foreign keys: `bot_status`→`bot_instances`, `admin_commands`→`bot_instances`
- **ISSUE-IF-7**: Add `bot_id` column to `admin_logs` and `api_call_log` for per-bot filtering
- **ISSUE-IF-9**: Address Tailwind v4 vs InsForge-recommended v3.4 compatibility
- **ISSUE-ERR-1**: Add generic catch in leave handler
- **ISSUE-SEC-2**: Replace bare `except Exception` in encryption with specific exception types
- **ISSUE-API-2**: Set `use_independent_chat_permissions` in restrictChatMember calls
- **ISSUE-ARCH-2**: Standardize all handlers to HTML parse mode (remove mixed Markdown)
- **ISSUE-ARCH-1**: Show all missing channels in verify UI, not just the first

### Low Priority / Enhancements
- **ISSUE-PTB-6**: Install `[webhooks]` PTB extra for webhook mode support
- **ISSUE-PTB-7**: Install `[callback-data]` PTB extra for arbitrary callback data
- **ISSUE-PERF-3**: Install HTTP/2 support for Telegram API calls
- **ISSUE-IF-10**: Enable realtime RLS on channels/messages tables
- **ISSUE-API-3**: Handle RESTRICTED→LEFT transition in leave handler
- **ISSUE-API-4**: Add `ChatJoinRequest` handler for auto-approve
- **ISSUE-QA-1**: DRY refactor for welcome/help message duplication

## Capabilities

### New Capabilities
- `insforge-rls-security`: Enable RLS policies on all 12 database tables with appropriate access rules
- `dashboard-auth`: Install and configure `@insforge/nextjs` for real authentication with middleware and route protection
- `bot-global-error-handler`: Add PTB global error handler with logging and admin notification
- `bot-ptb-defaults`: Configure PTB `Defaults` class for consistent parse_mode and other defaults
- `bot-chat-member-cache`: Cache getChatMember results to reduce API calls
- `web-phantom-table-fix`: Remove audit service for non-existent tables and fix logs mapping
- `webhook-ssrf-fix`: Add URL validation and allowlist to test-webhook edge function
- `bot-verification-improvements`: Handle RESTRICTED status, show all missing channels, add ChatJoinRequest
- `db-schema-fixes`: Add missing FKs, bot_id columns, and verify RPC functions exist

### Modified Capabilities
- `bot-token-encryption`: Fix addBot() to fetch master_key from vault and pass to manage-bot edge function, fix hardcoded owner_telegram_id
- `bot-dependency-cleanup`: Remove unused deps, add missing PTB extras ([webhooks], [callback-data], [http2])

## Impact

- **Files affected**: ~30+ files across `apps/bot/`, `apps/web/src/`, `insforge/migrations/`, `insforge/functions/`
- **Database**: New RLS policies on all 12 tables, new migration for FKs + bot_id columns, verify/create RPC functions
- **Dependencies**: `@insforge/nextjs` added to web, PTB extras added to bot, unused deps removed
- **Breaking**: RLS enablement may break existing anonymous queries — must coordinate with bot API key usage
- **Security**: Critical — fixes expose master encryption key, SSRF vulnerability, and unauthenticated dashboard access
- **Edge Functions**: `test-webhook` needs URL validation patch, `manage-bot` calling pattern fixed on web side
