# 🚀 Getting Started

> **Everything you need to get Nezuko running in minutes**

This guide will walk you through setting up the complete Nezuko platform, including the Telegram bot, REST API, and Admin Dashboard.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (5 Minutes)](#quick-start-5-minutes)
3. [Detailed Installation](#detailed-installation)
4. [Configuration](#configuration)
5. [Running the Services](#running-the-services)
6. [Verifying Installation](#verifying-installation)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| **Python** | 3.13+ | Bot & API backend |
| **Node.js** | 20+ | Web dashboard build |
| **Bun** | 1.3+ | Package manager (recommended) |
| **Git** | Latest | Version control |

### Optional (Recommended for Production)

| Software | Version | Purpose |
|----------|---------|---------|
| **PostgreSQL** | 16+ | Production database |
| **Redis** | 7+ | Distributed caching |
| **Docker** | Latest | Containerized deployment |

### Accounts Required

| Service | Purpose | Link |
|---------|---------|------|
| **Telegram Bot** | Bot token from @BotFather | [Create Bot](https://t.me/BotFather) |
| **Supabase** | Auth & Database | [supabase.com](https://supabase.com) |

---

## Quick Start (5 Minutes)

```bash
# 1. Clone the repository
git clone https://github.com/mohdakil2426/Nezuko-Telegram-Bot.git
cd Nezuko-Telegram-Bot

# 2. Create Python virtual environment
python -m venv .venv

# 3. Activate virtual environment
# Windows:
.\.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# 4. Install JavaScript dependencies
bun install

# 5. Install Python dependencies
pip install -r requirements.txt
pip install -r apps/api/requirements.txt
pip install -r apps/bot/requirements.txt

# 6. Copy environment files
cp apps/bot/.env.example apps/bot/.env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 7. Edit environment files with your credentials
# (See Configuration section below)

# 8. Run the bot
python -m apps.bot.main   # From project root
```

---

## Detailed Installation

### Step 1: Clone Repository

```bash
git clone https://github.com/mohdakil2426/Nezuko-Telegram-Bot.git
cd Nezuko-Telegram-Bot
```

### Step 2: Python Environment

```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows)
.\.venv\Scripts\activate

# Activate (Linux/Mac)
source .venv/bin/activate

# Upgrade pip
pip install --upgrade pip
```

### Step 3: Install Dependencies

```bash
# JavaScript/TypeScript (web dashboard)
bun install

# Python (API & Bot)
pip install -r requirements.txt
pip install -r apps/api/requirements.txt
pip install -r apps/bot/requirements.txt
```

### Step 4: Database Setup

#### Option A: SQLite (Development)
No setup required - SQLite database will be created automatically.

#### Option B: PostgreSQL (Production)

```bash
# Using Supabase (Recommended)
# 1. Create project at supabase.com
# 2. Get connection string from Settings > Database

# Or using local PostgreSQL
createdb nezuko
```

### Step 5: Apply Migrations

```bash
# Bot database migrations
cd apps/bot
python -m alembic upgrade head
cd ..

# API database migrations
cd apps/api
python -m alembic upgrade head
cd ..
```

---

## Configuration

### Bot Configuration (`apps/bot/.env`)

```bash
# Required
BOT_TOKEN=your_telegram_bot_token_from_botfather

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/nezuko
# Or for SQLite (development):
# DATABASE_URL=sqlite+aiosqlite:///./storage/data/nezuko.db

# Optional
REDIS_URL=redis://localhost:6379/0
SENTRY_DSN=your_sentry_dsn
ENVIRONMENT=development
LOG_LEVEL=INFO
```

### API Configuration (`apps/api/.env`)

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/nezuko

# Supabase Auth
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret

# Optional
REDIS_URL=redis://localhost:6379/0
SENTRY_DSN=your_sentry_dsn
ENVIRONMENT=development
MOCK_AUTH=true  # For local development without Supabase
```

### Web Configuration (`apps/web/.env.local`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# API
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

---

## Running the Services

### Development Mode (All Services)

```bash
# Terminal 1: Bot
cd apps/bot
python main.py

# Terminal 2: API
cd apps/api
python -m uvicorn src.main:app --host 0.0.0.0 --port 8080 --reload

# Terminal 3: Web Dashboard
cd apps/web
bun run dev
```

### Using Turborepo

```bash
# Run all services
npx turbo dev

# Run specific service
npx turbo dev --filter=@nezuko/web
```

### Access Points

| Service | URL | Description |
|---------|-----|-------------|
| Web Dashboard | http://localhost:3000 | Admin panel |
| API | http://localhost:8080 | REST API |
| API Docs | http://localhost:8080/docs | Swagger UI |
| Bot | (Telegram) | @YourBotUsername |

---

## Verifying Installation

### 1. Check Bot

```bash
# Bot should show "Starting bot..." message
python -m apps.bot.main   # From project root
```

Send `/start` to your bot on Telegram - you should receive a welcome message.

### 2. Check API

```bash
# Start API server
cd apps/api && python -m uvicorn src.main:app --host 0.0.0.0 --port 8080

# In another terminal, test health endpoint
curl http://localhost:8080/health
# Expected: {"status":"healthy","version":"0.1.0"}
```

### 3. Check Web Dashboard

```bash
# Start web server
cd apps/web && bun run dev

# Open http://localhost:3000 in browser
# You should see the login page
```

### 4. Run Type Checks

```bash
# TypeScript
cd apps/web && bun run type-check

# Python
ruff check apps/bot apps/api
python -m pyrefly check apps/bot apps/api
```

---

## Next Steps

- [**Architecture Overview**](../architecture/README.md) - Understand the system design
- [**Bot Reference**](../bot/README.md) - Learn about bot commands and handlers
- [**API Reference**](../api/README.md) - Explore API endpoints
- [**Web Dashboard**](../web/README.md) - Admin panel guide
- [**Deployment Guide**](../deployment/README.md) - Deploy to production

---

## Troubleshooting

### Bot not responding?

1. Verify `BOT_TOKEN` is correct in `apps/bot/.env`
2. Check bot is admin in both group and channel
3. Review logs: `tail -f storage/logs/bot.log`

### API returning 500?

1. Check database connection: `DATABASE_URL`
2. Run migrations: `alembic upgrade head`
3. Check logs in terminal output

### Web dashboard blank?

1. Verify Supabase credentials in `.env.local`
2. Check browser console for errors
3. Ensure API is running on port 8080

---

*Need more help? [Open an issue](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/issues)*
