# Proposal: Owner-Only Telegram Authentication & Multi-Bot Management

## Summary

Replace email/password login with **Telegram Login Widget** for owner-only dashboard access, and add a **Bot Management** page where the owner can add/manage multiple Telegram bots for channel enforcement.

## Motivation

### Current Problems

1. **Identity Mismatch**: Dashboard uses Supabase email/password auth, but this is a Telegram bot project. The owner's identity should be their Telegram account.

2. **Security Gap**: Current system allows any Supabase user to potentially access the dashboard. We need strict owner-only access.

3. **Single Bot Limitation**: Current architecture assumes one bot. Owner wants to manage multiple bots from a single dashboard.

4. **Multi-User Design**: Current RBAC (Owner/Admin/Viewer) is designed for multiple users, but requirement is single-owner only.

### Why This Change

- **Natural Authentication**: Bot owners should login with Telegram, not email/password
- **Cryptographic Security**: Telegram signs login data with bot token - impossible to forge
- **Single Identity**: Telegram ID is permanent and links bot ownership to dashboard access
- **Scalability**: Owner can manage unlimited bots from one dashboard
- **Better UX**: One-click Telegram login vs. remembering passwords

## Proposed Solution

### Part 1: Telegram Login Widget

Replace Supabase login page with Telegram Login Widget:

1. Configure a "Login Bot" (can be existing Nezuko bot or new dedicated bot)
2. Link dashboard domain to bot via @BotFather `/setdomain`
3. Embed Telegram Login Widget on login page
4. Server verifies login data using bot token + HMAC-SHA256
5. Check Telegram ID matches `BOT_OWNER_TELEGRAM_ID` environment variable
6. Create session (HTTP-only cookie) for authenticated owner

### Part 2: Multi-Bot Management

Add new dashboard page `/dashboard/bots` using 100% shadcn/ui:

1. **Bot List**: Display all added bots with status, group count, actions
2. **Add Bot Modal**: Enter bot token, auto-fetch bot info from Telegram API
3. **Bot Details**: View/edit bot settings, linked groups/channels
4. **Bot Actions**: Activate, deactivate, delete bots
5. **Store tokens securely**: Encrypted in database, linked to owner's Telegram ID

### Part 3: Session Management

1. Create session on successful Telegram login
2. Store session in Redis or database
3. Session contains: Telegram ID, username, name, photo, expiry
4. Middleware validates session on all protected routes
5. Logout clears session

## Impact

### Files to Create

| File                                             | Purpose                         |
| :----------------------------------------------- | :------------------------------ |
| `apps/web/src/components/telegram-login.tsx`     | Telegram Login Widget component |
| `apps/web/src/app/dashboard/bots/page.tsx`       | Bot management page             |
| `apps/web/src/app/dashboard/bots/[id]/page.tsx`  | Individual bot detail page      |
| `apps/api/src/api/v1/endpoints/telegram_auth.py` | Telegram login verification     |
| `apps/api/src/api/v1/endpoints/bots.py`          | CRUD for bot management         |
| `apps/api/src/models/bot_instance.py`            | New model for stored bots       |
| `apps/api/src/services/telegram_service.py`      | Telegram API integration        |

### Files to Modify

| File                                      | Change                                         |
| :---------------------------------------- | :--------------------------------------------- |
| `apps/web/src/app/login/page.tsx`         | Replace Supabase form with Telegram widget     |
| `apps/web/src/proxy.ts`                   | Check session instead of Supabase auth         |
| `apps/api/src/core/config.py`             | Add `LOGIN_BOT_TOKEN`, `BOT_OWNER_TELEGRAM_ID` |
| `apps/web/src/components/app-sidebar.tsx` | Update nav with "Bots" link                    |
| `.env.example`                            | Document new environment variables             |

### Database Changes

New table: `bot_instances`

- `id`: Primary key
- `owner_telegram_id`: BigInteger (links to owner)
- `bot_token`: Encrypted string
- `bot_id`: BigInteger (Telegram bot ID)
- `bot_username`: String
- `bot_name`: String
- `is_active`: Boolean
- `created_at`, `updated_at`: Timestamps

### Dependencies

| Package                     | Purpose                                    |
| :-------------------------- | :----------------------------------------- |
| `crypto` (Node.js built-in) | HMAC-SHA256 for Telegram hash verification |
| `cryptography` (Python)     | Encrypt bot tokens in database             |

## Risks & Mitigations

| Risk                      | Mitigation                                                            |
| :------------------------ | :-------------------------------------------------------------------- |
| Telegram service downtime | Display clear error message, no alternative login needed (owner-only) |
| Local development         | Use ngrok for HTTPS + register temp domain with BotFather             |
| Token security            | Encrypt tokens at rest, never expose in API responses                 |
| Session hijacking         | HTTP-only secure cookies, short expiry, HTTPS only                    |

## Success Criteria

1. ✅ Owner can login via Telegram widget (no email/password)
2. ✅ Non-owner Telegram users are rejected with clear message
3. ✅ Owner can add multiple bots via dashboard
4. ✅ Bot tokens are stored encrypted in database
5. ✅ All UI uses 100% shadcn/ui components
6. ✅ Existing bot functionality (Nezuko) continues working
7. ✅ Mobile-responsive design maintained

## Timeline Estimate

| Phase     | Description                          | Estimate       |
| :-------- | :----------------------------------- | :------------- |
| 1         | Telegram Login Widget + verification | 2-3 hours      |
| 2         | Session management + middleware      | 1-2 hours      |
| 3         | Bot management API endpoints         | 2-3 hours      |
| 4         | Bot management UI (shadcn/ui)        | 3-4 hours      |
| 5         | Testing + polish                     | 1-2 hours      |
| **Total** |                                      | **9-14 hours** |

## Open Questions

1. **Login Bot**: Use existing Nezuko bot or create dedicated login bot?
   - **Recommendation**: Use Nezuko bot for simplicity

2. **Session Storage**: Redis or database?
   - **Recommendation**: Database (already have SQLite/Postgres), Redis optional for performance

3. **Token Encryption**: Fernet (Python) or AES-256?
   - **Recommendation**: Fernet (simpler, secure enough for this use case)
