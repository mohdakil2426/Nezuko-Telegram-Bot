# Environment Configuration Guide

## Architecture Overview

Nezuko uses a **separated bot architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    NEZUKO ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📱 LOGIN BOT (configured in API .env)                           │
│  └── Purpose: Only for Telegram Login Widget authentication     │
│                                                                  │
│  🖥️  DASHBOARD (Web UI)                                          │
│  └── Add working bots via "Add Bot" button                       │
│  └── Tokens encrypted and stored in database                    │
│                                                                  │
│  🤖 WORKING BOTS (from Database)                                 │
│  └── Read from DB and run enforcement tasks                      │
│  └── Multiple bots supported                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuration Files

### 1. API Configuration: `apps/api/.env`

This is the main configuration file for the dashboard API.

| Variable                | Required | Description                                |
| :---------------------- | :------- | :----------------------------------------- |
| `LOGIN_BOT_TOKEN`       | ✅       | Bot token for Telegram Login Widget        |
| `BOT_OWNER_TELEGRAM_ID` | ✅       | Your Telegram user ID (only you can login) |
| `ENCRYPTION_KEY`        | ✅       | Fernet key for encrypting bot tokens       |
| `DATABASE_URL`          | ✅       | Database connection (SQLite/PostgreSQL)    |
| `SESSION_EXPIRY_HOURS`  | ❌       | Login session duration (default: 24)       |
| `SECRET_KEY`            | ❌       | Cookie signing key (change in production)  |

**How to get values:**

- `LOGIN_BOT_TOKEN`: Create a bot with @BotFather
- `BOT_OWNER_TELEGRAM_ID`: Message @userinfobot
- `ENCRYPTION_KEY`: Run `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`

### 2. Web Configuration: `apps/web/.env.local`

Frontend dashboard configuration.

| Variable                         | Required | Description                                     |
| :------------------------------- | :------- | :---------------------------------------------- |
| `NEXT_PUBLIC_API_URL`            | ✅       | API server URL (default: http://localhost:8080) |
| `NEXT_PUBLIC_LOGIN_BOT_USERNAME` | ✅       | Bot username for login widget (without @)       |
| `NEXT_PUBLIC_USE_MOCK`           | ❌       | Use mock data instead of API (default: false)   |

### 3. Bot Configuration: `apps/bot/.env`

Bot worker process configuration.

| Variable       | Required | Description                                             |
| :------------- | :------- | :------------------------------------------------------ |
| `BOT_TOKEN`    | ❌       | If set, runs this single bot (standalone mode)          |
| `DATABASE_URL` | ✅       | Database connection (must match API for dashboard mode) |
| `ENVIRONMENT`  | ❌       | development or production                               |
| `REDIS_URL`    | ❌       | Redis for caching (recommended for production)          |

**Two modes:**

1. **Standalone Mode**: Set `BOT_TOKEN` - bot runs independently
2. **Dashboard Mode**: Leave `BOT_TOKEN` empty - bot reads from database

---

## Quick Setup

### Step 1: Create a Login Bot

1. Message @BotFather on Telegram
2. Send `/newbot`
3. Name it something like "Nezuko Dashboard Login"
4. Copy the token

### Step 2: Get Your Telegram ID

1. Message @userinfobot on Telegram
2. Copy the ID number

### Step 3: Configure API

Edit `apps/api/.env`:

```bash
LOGIN_BOT_TOKEN=<your-bot-token>
BOT_OWNER_TELEGRAM_ID=<your-id>
ENCRYPTION_KEY=<run-the-command-above>
```

### Step 4: Configure Web

Edit `apps/web/.env.local`:

```bash
NEXT_PUBLIC_LOGIN_BOT_USERNAME=<your-bot-username>
```

### Step 5: Start Services

```bash
# Terminal 1 - API
cd apps/api && python -m uvicorn src.main:app --reload --port 8080

# Terminal 2 - Web
cd apps/web && bun dev
```

### Step 6: Login & Add Bots

1. Open http://localhost:3000
2. Click "Log in with Telegram"
3. Go to "Bots" page
4. Click "Add Bot" and paste your enforcement bot token

---

## Files Reference

| File                    | Purpose                                       |
| :---------------------- | :-------------------------------------------- |
| `apps/api/.env`         | API configuration (login, security, database) |
| `apps/api/.env.example` | Template with documentation                   |
| `apps/web/.env.local`   | Web dashboard configuration                   |
| `apps/web/.env.example` | Template with documentation                   |
| `apps/bot/.env`         | Bot worker configuration                      |
| `apps/bot/.env.example` | Template with documentation                   |

---

_Last Updated: 2026-02-05_
