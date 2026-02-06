# Migration Guide: Supabase to Telegram Auth

## Overview

This document explains what changes after implementing Telegram Login, what gets removed, what stays, and how to configure everything.

---

## 🗑️ What Gets REMOVED (No Longer Needed)

### Files to DELETE

| File                                      | Reason                                      |
| :---------------------------------------- | :------------------------------------------ |
| `apps/web/src/lib/supabase/client.ts`     | Supabase Auth client no longer used         |
| `apps/web/src/lib/supabase/server.ts`     | Supabase Auth server helpers no longer used |
| `apps/web/src/lib/supabase/middleware.ts` | Replaced by session middleware              |

### Code to REMOVE

| Location                                   | What to Remove                                 |
| :----------------------------------------- | :--------------------------------------------- |
| `apps/web/src/app/login/page.tsx`          | Supabase login form, email/password inputs     |
| `apps/web/src/proxy.ts`                    | Supabase auth checks, cookie refresh logic     |
| `apps/api/src/api/v1/dependencies/auth.py` | Supabase JWT verification (keep for reference) |
| `apps/api/src/services/auth_service.py`    | Supabase user sync logic                       |

### Database Tables NO LONGER USED

| Table                 | Status                                                     |
| :-------------------- | :--------------------------------------------------------- |
| `admin_users`         | **KEEP for now** - May repurpose for bot-specific settings |
| Supabase `auth.users` | **NOT USED** - Telegram is the identity provider           |

### NPM Packages to CONSIDER REMOVING

| Package                 | Status                                             |
| :---------------------- | :------------------------------------------------- |
| `@supabase/ssr`         | **REMOVE** - No longer needed for auth             |
| `@supabase/supabase-js` | **KEEP IF** using Supabase PostgreSQL for database |

---

## ✅ What STAYS (Still Needed)

### Supabase Role After Migration

| Supabase Feature             | Status      | Explanation                              |
| :--------------------------- | :---------- | :--------------------------------------- |
| **Authentication**           | ❌ NOT USED | Replaced by Telegram Login               |
| **PostgreSQL Database**      | ✅ OPTIONAL | Can still use Supabase-hosted PostgreSQL |
| **Row Level Security (RLS)** | ❌ NOT USED | Session-based auth, not Supabase JWT     |
| **Realtime**                 | ❌ NOT USED | Not required for this project            |
| **Storage**                  | ❌ NOT USED | Not used currently                       |
| **Edge Functions**           | ❌ NOT USED | Not used currently                       |

### Decision: Keep or Remove Supabase?

**Option A: Remove Supabase Completely** (Recommended for simplicity)

```
✓ Use local SQLite (dev) or self-hosted PostgreSQL (prod)
✓ No Supabase dependency
✓ Simpler architecture
✓ No Supabase billing concerns
```

**Option B: Keep Supabase for Database Only**

```
✓ Continue using Supabase-hosted PostgreSQL
✓ No auth features used
✓ Just a managed database
✗ Still need Supabase account/project
```

### Recommendation: **Option A - Remove Supabase Completely**

Since you're using Telegram Login, there's no reason to keep Supabase. Your current SQLite (dev) and PostgreSQL (prod) setup is sufficient.

---

## ⚙️ Environment Configuration Guide

### BEFORE (Current .env files)

```bash
# apps/web/.env.local (CURRENT)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1

# apps/api/.env (CURRENT)
DATABASE_URL=sqlite+aiosqlite:///./storage/data/nezuko.db
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
MOCK_AUTH=true
CORS_ORIGINS=http://localhost:3000
```

### AFTER (New .env files)

```bash
# ═══════════════════════════════════════════════════════════════════════════
#                         apps/web/.env.local (NEW)
# ═══════════════════════════════════════════════════════════════════════════

# API Backend
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1

# Login Bot (for Telegram widget display)
NEXT_PUBLIC_LOGIN_BOT_USERNAME=NezukoBot

# ─── REMOVED ───
# NEXT_PUBLIC_SUPABASE_URL        ← No longer needed
# NEXT_PUBLIC_SUPABASE_ANON_KEY   ← No longer needed
```

```bash
# ═══════════════════════════════════════════════════════════════════════════
#                           apps/api/.env (NEW)
# ═══════════════════════════════════════════════════════════════════════════

# ─── DATABASE ───
DATABASE_URL=sqlite+aiosqlite:///./storage/data/nezuko.db
# For production PostgreSQL:
# DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/nezuko

# ─── TELEGRAM AUTHENTICATION ───
# Bot token for login verification (get from @BotFather)
LOGIN_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# Your personal Telegram user ID (get from @userinfobot)
BOT_OWNER_TELEGRAM_ID=123456789

# ─── SECURITY ───
# Fernet encryption key for bot tokens (generate with Python)
# python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY=your-fernet-key-here

# Session duration in hours
SESSION_EXPIRY_HOURS=24

# ─── APPLICATION ───
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000
API_HOST=0.0.0.0
API_PORT=8080

# ─── DEVELOPMENT ───
# Set to true to bypass Telegram auth in development
MOCK_AUTH=false

# ─── REMOVED ───
# SUPABASE_URL              ← No longer needed
# SUPABASE_JWT_SECRET       ← No longer needed
# SUPABASE_SERVICE_ROLE_KEY ← No longer needed
# SUPABASE_ANON_KEY         ← No longer needed
```

```bash
# ═══════════════════════════════════════════════════════════════════════════
#                           apps/bot/.env (UNCHANGED)
# ═══════════════════════════════════════════════════════════════════════════

# This file stays the same - bot doesn't use dashboard auth
BOT_TOKEN=your-bot-token
DATABASE_URL=sqlite+aiosqlite:///./storage/data/nezuko.db
ENVIRONMENT=development
```

---

## 🔧 How to Get Required Values

### 1. LOGIN_BOT_TOKEN

```
1. Open Telegram → Message @BotFather
2. Send /mybots
3. Select your bot (e.g., @NezukoBot)
4. Click "API Token"
5. Copy the token
```

### 2. BOT_OWNER_TELEGRAM_ID

```
1. Open Telegram → Message @userinfobot
2. Send /start
3. It replies with your user ID
4. Copy the number (e.g., 123456789)
```

### 3. ENCRYPTION_KEY

```bash
# Run this Python command to generate a Fernet key:
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Output example: gAAAAABk... (copy the entire string)
```

### 4. Setting Domain in BotFather

```
1. Open Telegram → Message @BotFather
2. Send /setdomain
3. Select your login bot
4. Enter your dashboard domain:
   - Production: dashboard.yourdomain.com
   - Local dev: Use ngrok URL (see below)
```

### 5. Local Development with ngrok

```bash
# Install ngrok (if not installed)
npm install -g ngrok

# Start your Next.js dev server
cd apps/web && npm run dev

# In another terminal, expose port 3000
ngrok http 3000

# ngrok gives you a URL like: https://abc123.ngrok.io
# Use this URL in @BotFather /setdomain command
```

---

## 📊 Before vs After Comparison

### Authentication Flow

| Step | BEFORE (Supabase)          | AFTER (Telegram)              |
| :--- | :------------------------- | :---------------------------- |
| 1    | Enter email + password     | Click "Login with Telegram"   |
| 2    | Supabase validates         | Telegram confirms in app      |
| 3    | JWT issued by Supabase     | Hash verified by your API     |
| 4    | JWT stored in cookie       | Session ID stored in cookie   |
| 5    | API validates Supabase JWT | API validates session from DB |

### Architecture

```
BEFORE:
┌──────────┐    ┌─────────────┐    ┌──────────┐    ┌──────────┐
│  Login   │───▶│  Supabase   │───▶│   API    │───▶│ Database │
│  Page    │    │    Auth     │    │ (FastAPI)│    │(Postgres)│
└──────────┘    └─────────────┘    └──────────┘    └──────────┘

AFTER:
┌──────────┐    ┌─────────────┐    ┌──────────┐    ┌──────────┐
│  Login   │───▶│  Telegram   │───▶│   API    │───▶│ Database │
│  Page    │    │   Servers   │    │ (FastAPI)│    │ (SQLite/ │
└──────────┘    └─────────────┘    └──────────┘    │ Postgres)│
                                                    └──────────┘
       ↑                                                 ↑
       │           No Supabase in the flow!              │
       └─────────────────────────────────────────────────┘
```

### Dependencies

| Package                 | BEFORE      | AFTER                              |
| :---------------------- | :---------- | :--------------------------------- |
| `@supabase/ssr`         | ✅ Required | ❌ Remove                          |
| `@supabase/supabase-js` | ✅ Required | ❌ Remove                          |
| `cryptography` (Python) | ❌ Not used | ✅ Required (for token encryption) |

---

## 🧹 Cleanup Checklist

After implementing Telegram Login, run through this checklist:

### Environment Files

- [ ] Remove `NEXT_PUBLIC_SUPABASE_URL` from `apps/web/.env.local`
- [ ] Remove `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `apps/web/.env.local`
- [ ] Remove `SUPABASE_URL` from `apps/api/.env`
- [ ] Remove `SUPABASE_JWT_SECRET` from `apps/api/.env`
- [ ] Remove `SUPABASE_SERVICE_ROLE_KEY` from `apps/api/.env`
- [ ] Add new Telegram auth variables (see above)

### NPM Packages (apps/web)

- [ ] Run `npm uninstall @supabase/ssr @supabase/supabase-js`

### Python Packages (apps/api)

- [ ] Add `cryptography` to `requirements/api.txt`
- [ ] Optionally remove `supabase` if installed

### Code Files

- [ ] Delete `apps/web/src/lib/supabase/` directory
- [ ] Update `apps/web/src/proxy.ts` - remove Supabase logic
- [ ] Update `apps/web/src/app/login/page.tsx` - new Telegram UI
- [ ] Archive old auth code in `apps/api/src/api/v1/dependencies/auth.py`

### Supabase Project

- [ ] **Option A**: Delete Supabase project entirely
- [ ] **Option B**: Keep but disable authentication features

---

## ❓ FAQ

### Q: Can I still use Supabase for database?

**A**: Yes, but there's no advantage. You already have SQLite (dev) and can use any PostgreSQL (prod). Supabase adds unnecessary complexity if you're not using auth.

### Q: What about existing users in admin_users table?

**A**: The table can be kept for future use or removed. With Telegram Login, there's only ONE user (you), identified by Telegram ID.

### Q: Will this break existing bot functionality?

**A**: No. The bot continues to work exactly the same. Only the dashboard login changes.

### Q: Do I need to change anything in apps/bot/?

**A**: No. The bot's `apps/bot/.env` remains unchanged.

### Q: What if I want to add other admins later?

**A**: You could extend the system to allow multiple Telegram IDs in the future. But for now, single-owner is the goal.

---

## 📁 File Summary

### Files to CREATE

- Session model, Bot Instance model
- Telegram auth service, Bot service
- Telegram Login component
- Bot management pages
- Encryption utilities

### Files to MODIFY

- `apps/web/src/proxy.ts`
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/components/app-sidebar.tsx`
- `apps/api/src/core/config.py`

### Files to DELETE

- `apps/web/src/lib/supabase/` (entire directory)

### Files to ARCHIVE (keep for reference)

- `apps/api/src/api/v1/dependencies/auth.py` (rename to `auth_supabase_deprecated.py`)
- `apps/api/src/services/auth_service.py` (rename similarly)
