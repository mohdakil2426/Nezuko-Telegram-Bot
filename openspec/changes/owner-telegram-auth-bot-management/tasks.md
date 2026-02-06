# Tasks: Owner-Only Telegram Authentication & Multi-Bot Management

## Overview

This document contains all implementation tasks for the Telegram Login and Multi-Bot Management feature. Tasks are organized by phase and should be completed in order.

**Estimated Total Time**: 10-15 hours

**Migration Guide**: See `migration-guide.md` for complete details on what's removed and .env configuration.

---

## Phase 0: Supabase Removal & Cleanup

### 0.1 Remove Supabase Dependencies (Web)

- [x] Run `npm uninstall @supabase/ssr @supabase/supabase-js` in `apps/web`
- [x] Delete `apps/web/src/lib/supabase/` directory entirely
- [x] Remove Supabase imports from any remaining files

### 0.2 Clean Environment Variables

- [x] Remove `NEXT_PUBLIC_SUPABASE_URL` from `apps/web/.env.local`
- [x] Remove `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `apps/web/.env.local`
- [x] Remove `SUPABASE_URL` from `apps/api/.env`
- [x] Remove `SUPABASE_JWT_SECRET` from `apps/api/.env`
- [x] Remove `SUPABASE_SERVICE_ROLE_KEY` from `apps/api/.env`
- [x] Remove `SUPABASE_ANON_KEY` from `apps/api/.env`

### 0.3 Archive Old Auth Code (Keep for Reference)

- [x] Rename `apps/api/src/api/v1/dependencies/auth.py` to `auth_supabase_deprecated.py`
- [x] Rename `apps/api/src/services/auth_service.py` to `auth_service_supabase_deprecated.py`
- [x] Comment out old auth routes in router (don't delete yet)

### 0.4 Add New Dependencies

- [x] Add `cryptography` to `requirements/api.txt`
- [x] Run `pip install -r requirements/api.txt`

---

## Phase 1: Configuration & Environment Setup

### 1.1 Environment Variables

- [x] Add `LOGIN_BOT_TOKEN` to `apps/api/src/core/config.py` Settings class
- [x] Add `BOT_OWNER_TELEGRAM_ID` to `apps/api/src/core/config.py` Settings class
- [x] Add `ENCRYPTION_KEY` to `apps/api/src/core/config.py` for Fernet encryption
- [x] Add `SESSION_EXPIRY_HOURS` to config (default: 24)
- [x] Update `apps/api/.env.example` with new variables
- [x] Update root `.env.example` documentation
- [x] Add validation at startup - fail with clear error if LOGIN_BOT_TOKEN missing

### 1.2 BotFather Configuration (Manual)

- [ ] Use @BotFather `/setdomain` command to link dashboard domain to login bot
- [x] Document the setup process in README or docs

---

## Phase 2: Database Schema

### 2.1 Sessions Table

- [x] Create `apps/api/src/models/session.py` model with fields:
  - `id` (UUID, primary key)
  - `telegram_id` (BigInteger)
  - `telegram_username` (String, nullable)
  - `telegram_name` (String)
  - `telegram_photo_url` (Text, nullable)
  - `expires_at` (DateTime)
  - `created_at` (DateTime)
- [x] Add indexes on `telegram_id` and `expires_at`

### 2.2 Bot Instances Table

- [x] Create `apps/api/src/models/bot_instance.py` model with fields:
  - `id` (Integer, primary key, auto-increment)
  - `owner_telegram_id` (BigInteger)
  - `bot_id` (BigInteger, unique)
  - `bot_username` (String)
  - `bot_name` (String)
  - `token_encrypted` (Text)
  - `is_active` (Boolean, default True)
  - `created_at`, `updated_at` (DateTime)
- [x] Add indexes on `owner_telegram_id` and `bot_id`

### 2.3 Database Migration

- [x] Create Alembic migration for `sessions` table
- [x] Create Alembic migration for `bot_instances` table
- [x] Run migrations and verify schema
- [x] Update `apps/api/src/models/__init__.py` to export new models

---

## Phase 3: Token Encryption Service

### 3.1 Encryption Utilities

- [x] Create `apps/api/src/core/encryption.py` with:
  - `get_fernet()` - Returns Fernet instance using ENCRYPTION_KEY
  - `encrypt_token(plaintext: str) -> str` - Encrypt bot token
  - `decrypt_token(ciphertext: str) -> str` - Decrypt bot token
- [x] Add error handling for invalid keys
- [x] Add unit tests for encryption/decryption round-trip

---

## Phase 4: Telegram Auth API

### 4.1 Auth Schemas

- [x] Create `apps/api/src/schemas/telegram_auth.py` with:
  - `TelegramAuthRequest` - id, first_name, last_name, username, photo_url, auth_date, hash
  - `TelegramAuthResponse` - success, user data
  - `SessionUser` - telegram_id, username, name, photo_url

### 4.2 Auth Service

- [x] Create `apps/api/src/services/telegram_auth_service.py` with:
  - `verify_telegram_hash(data, bot_token)` - HMAC-SHA256 verification
  - `is_auth_fresh(auth_date, max_age=300)` - Check timestamp freshness
  - `is_owner(telegram_id)` - Compare with BOT_OWNER_TELEGRAM_ID
  - `create_session(telegram_user)` - Create session in database
  - `get_session(session_id)` - Retrieve session
  - `delete_session(session_id)` - Delete session
  - `cleanup_expired_sessions()` - Remove expired sessions

### 4.3 Auth Endpoints

- [x] Create `apps/api/src/api/v1/endpoints/telegram_auth.py` router
- [x] Implement `POST /auth/telegram` - Verify login/create session
- [x] Implement `POST /auth/logout` - Clear session
- [x] Implement `GET /auth/me` - Get current user from session
- [x] Register router in `apps/api/src/api/v1/router.py`

### 4.4 Session Dependency

- [x] Create `apps/api/src/api/v1/dependencies/session.py`
- [x] Implement `get_current_session()` dependency - validates session cookie
- [x] Return 401 if no valid session

---

## Phase 5: Bot Management API

### 5.1 Bot Schemas

- [x] Create `apps/api/src/schemas/bot_instance.py` with:
  - `BotCreate` - token only (for adding)
  - `BotResponse` - id, bot_id, bot_username, bot_name, is_active, created_at (NO token!)
  - `BotUpdate` - is_active toggle
  - `BotListResponse` - list of BotResponse

### 5.2 Telegram API Integration

- [x] Create `apps/api/src/services/telegram_api.py` with:
  - `get_bot_info(token)` - Call Telegram getMe API
  - Return bot_id, username, first_name
  - Handle invalid token errors

### 5.3 Bot Service

- [x] Create `apps/api/src/services/bot_instance_service.py` with:
  - `add_bot(owner_id, token)` - Verify, encrypt, save
  - `list_bots(owner_id)` - Get all bots for owner
  - `get_bot(owner_id, bot_id)` - Get single bot
  - `update_bot(owner_id, bot_id, data)` - Update bot
  - `delete_bot(owner_id, bot_id)` - Delete bot and unlink groups

### 5.4 Bot Endpoints

- [x] Create `apps/api/src/api/v1/endpoints/bots.py` router
- [x] Implement `GET /bots` - List all bots
- [x] Implement `POST /bots` - Add new bot
- [x] Implement `GET /bots/{id}` - Get bot details
- [x] Implement `PATCH /bots/{id}` - Update bot (toggle active)
- [x] Implement `DELETE /bots/{id}` - Delete bot
- [x] Register router in `apps/api/src/api/v1/router.py`

---

## Phase 6: Web - Telegram Login Component

### 6.1 Login Component

- [x] Create `apps/web/src/components/auth/telegram-login.tsx`
- [x] Implement script loading for Telegram widget
- [x] Handle `onAuth` callback with typed TelegramUser
- [x] Support botName, buttonSize, cornerRadius props
- [x] Clean up on unmount

### 6.2 Auth API Client

- [x] Create `apps/web/src/lib/api/auth.ts` with:
  - `verifyTelegramLogin(data)` - POST to /auth/telegram
  - `logout()` - POST to /auth/logout
  - `getCurrentUser()` - GET /auth/me

### 6.3 Auth Hooks

- [x] Create `apps/web/src/lib/hooks/use-auth.ts`
- [x] Implement useCurrentUser() - TanStack Query for get current user
- [x] Implement useLogout() - Mutation for logout
- [x] Handle loading and error states

---

## Phase 7: Web - Login Page Redesign

### 7.1 Login Page

- [x] Update `apps/web/src/app/login/page.tsx`
- [x] Remove Supabase login form
- [x] Add TelegramLogin component
- [x] Add loading state during verification
- [x] Add error handling with toast
- [x] Style with shadcn/ui Card component
- [x] Maintain glass effect background
- [x] Add "Only project owner can access" text

### 7.2 Proxy/Middleware Update

- [x] Update `apps/web/src/proxy.ts`
- [x] Remove Supabase auth check
- [x] Add session cookie validation
- [x] Call API to validate session
- [x] Redirect to /login if invalid

---

## Phase 8: Web - Bot Management UI

### 8.1 API Client for Bots

- [x] Create `apps/web/src/lib/api/bots.ts` with:
  - `listBots()` - GET /bots
  - `addBot(token)` - POST /bots
  - `getBot(id)` - GET /bots/{id}
  - `updateBot(id, data)` - PATCH /bots/{id}
  - `deleteBot(id)` - DELETE /bots/{id}

### 8.2 Bot Hooks

- [x] Create `apps/web/src/lib/hooks/use-bots.ts`
- [x] Implement useBots() - List all bots
- [x] Implement useBot(id) - Get single bot
- [x] Implement useAddBot() - Mutation
- [x] Implement useUpdateBot() - Mutation
- [x] Implement useDeleteBot() - Mutation

### 8.3 Bot List Page

- [x] Create `apps/web/src/app/dashboard/bots/page.tsx`
- [x] Implement page header with "My Bots" title
- [x] Add "Add Bot" button (shadcn/ui Button)
- [x] Implement bot cards using shadcn/ui Card
- [x] Show empty state when no bots
- [x] Add loading skeleton
- [x] Implement responsive grid layout

### 8.4 Add Bot Dialog

- [x] Create `apps/web/src/components/bots/add-bot-dialog.tsx` (inline in page)
- [x] Use shadcn/ui Dialog, Input, Button
- [x] Implement token input (password type)
- [x] Show loading state during verification
- [x] Display bot info for confirmation
- [x] Handle errors with form feedback
- [x] Close and refresh list on success

### 8.5 Bot Card Component

- [x] Create `apps/web/src/components/bots/bot-card.tsx` (inline as BotRow)
- [x] Display bot avatar, name, username
- [x] Show status badge (Active/Paused)
- [x] Show group count
- [x] Add dropdown menu for actions
- [x] Handle click to navigate to details

### 8.6 Bot Detail Page

- [x] Create `apps/web/src/app/dashboard/bots/[id]/page.tsx`
- [x] Show bot info header
- [x] Implement status toggle (shadcn/ui Switch)
- [x] Show linked groups list
- [x] Add "Delete Bot" button with confirmation
- [x] Add back navigation

### 8.7 Delete Confirmation Dialog

- [x] Create `apps/web/src/components/bots/delete-bot-dialog.tsx` (inline)
- [x] Use shadcn/ui AlertDialog
- [x] Show warning if bot has linked groups
- [x] List affected groups
- [x] Handle delete and redirect

---

## Phase 9: Navigation Update

### 9.1 Sidebar

- [x] Update `apps/web/src/components/app-sidebar.tsx`
- [x] Add "Bots" nav item with Bot icon
- [x] Position appropriately in nav structure
- [x] Ensure active state works correctly

### 9.2 User Menu

- [x] Update user menu in sidebar/header
- [x] Show Telegram username and avatar (from session)
- [x] Add Logout option
- [x] Handle logout with redirect to /login

---

## Phase 10: Testing & Documentation

### 10.1 Backend Tests

- [x] Write tests for `telegram_auth_service.py`
  - [x] Test hash verification (valid/invalid)
  - [x] Test timestamp freshness check
  - [x] Test owner ID check
  - [x] Test session CRUD
- [x] Write tests for `bot_instance_service.py`
  - [x] Test add bot (valid/invalid token)
  - [x] Test list/get bots
  - [x] Test update/delete bots
- [x] Write tests for encryption utilities

### 10.2 Frontend Tests (MANUAL - Skipped)

- [ ] Test login flow manually (Telegram widget)
- [ ] Test bot management CRUD operations
- [ ] Test error states
- [ ] Test mobile responsiveness

### 10.3 Documentation

- [x] Update README with new auth flow
- [x] Document BotFather setup for local development
- [x] Document environment variables
- [x] Update memory-bank files

---

## Phase 11: Cleanup & Polish

### 11.1 Remove Old Auth

- [x] Remove or deprecate old Supabase login components
- [x] Clean up unused auth dependencies in proxy.ts
- [x] Remove unused admin_user role checks (keep model for future)

### 11.2 Security Review

- [x] Verify tokens never exposed in API responses
- [x] Verify session cookies have correct flags
- [x] Verify HMAC uses timing-safe comparison
- [x] Verify encrypted tokens can't be decrypted without key

### 11.3 Final Polish (MANUAL - Skipped)

- [ ] Check all UI for shadcn/ui consistency
- [ ] Verify glass effects and theming
- [ ] Test accent color theming on new components
- [ ] Mobile responsiveness final check

---

## Phase 12: Real-Time Updates (SSE)

### 12.1 Event System Backend

- [x] Create `apps/api/src/core/events.py` with:
  - `EventBus` singleton for managing event subscribers
  - `publish_event(event_type, data)` - Push event to all subscribers
  - `subscribe()` / `unsubscribe()` methods
- [x] Define event types enum: `activity`, `analytics`, `log`, `stats`

### 12.2 SSE Endpoint

- [x] Create `apps/api/src/api/v1/endpoints/events.py` router
- [x] Implement `GET /events/stream` - SSE endpoint
  - Validate session
  - Stream events with `text/event-stream` content type
  - Include heartbeat every 30 seconds
  - Handle client disconnect gracefully
- [x] Register router in `apps/api/src/api/v1/router.py`

### 12.3 Event Publishing

- [x] Add event publishing to bot activity log service
- [x] Add event publishing when verification occurs
- [x] Add event publishing when members join/leave
- [x] Add event publishing when bot status changes
- [x] Create `apps/api/src/services/event_publisher.py` helper (in events.py)

### 12.4 Frontend SSE Client

- [x] Create `apps/web/src/lib/sse/event-source.ts`
  - `createEventSource()` - Create SSE connection
  - Handle reconnection with exponential backoff
  - Parse event data to typed objects
- [x] Create `apps/web/src/lib/hooks/use-realtime.ts`
  - `useRealtimeEvents()` - Subscribe to SSE stream
  - Return connection status (connected/reconnecting/disconnected)
  - Emit events to React state

### 12.5 Real-Time Activity Feed

- [x] Update `apps/web/src/components/dashboard/activity-feed.tsx`
- [x] Subscribe to `activity` events
- [x] Prepend new activities to list in real-time
- [x] Add smooth animation for new items
- [x] Add connection status indicator (🟢/🟡/🔴)

### 12.6 Real-Time Analytics

- [x] Update analytics components to subscribe to `analytics` events
- [x] Animate counter updates with smooth transitions
- [x] Update charts with new data points
- [x] Use React state for real-time values

### 12.7 Real-Time Logs Page

- [x] Create `apps/web/src/app/dashboard/logs/page.tsx` (if not exists)
- [x] Subscribe to `log` events
- [x] Implement virtualized log list (for performance with 1000+ logs)
- [x] Add pause/resume live streaming toggle
- [x] Add log level filter (info/warning/error)
- [x] Color-code logs by level

### 12.8 Connection Status Component

- [x] Create `apps/web/src/components/realtime/connection-status.tsx`
- [x] Show connection state badge in header/sidebar
- [x] 🟢 Connected: "Live"
- [x] 🟡 Reconnecting: "Reconnecting..."
- [x] 🔴 Disconnected: "Offline (click to retry)"

### 12.9 Fallback Polling

- [x] Implement fallback to TanStack Query polling if SSE fails
- [x] Show "Real-time unavailable" message
- [x] Poll every 30 seconds as fallback

---

## Summary

| Phase                       | Tasks         | Estimated Time |
| :-------------------------- | :------------ | :------------- |
| 0. Supabase Removal         | 12            | 1 hour         |
| 1. Environment Setup        | 7             | 30 min         |
| 2. Database Schema          | 7             | 1 hour         |
| 3. Encryption Service       | 3             | 30 min         |
| 4. Telegram Auth API        | 9             | 2 hours        |
| 5. Bot Management API       | 10            | 2 hours        |
| 6. Login Component          | 6             | 1 hour         |
| 7. Login Page Redesign      | 5             | 1 hour         |
| 8. Bot Management UI        | 16            | 3 hours        |
| 9. Navigation Update        | 4             | 30 min         |
| 10. Testing & Docs          | 8             | 1.5 hours      |
| 11. Cleanup & Polish        | 7             | 1 hour         |
| 12. Real-Time Updates (SSE) | 18            | 4 hours        |
| **Total**                   | **112 tasks** | **~19 hours**  |

---

## Ready for Implementation

Run `/opsx:apply` to start implementing these tasks.
