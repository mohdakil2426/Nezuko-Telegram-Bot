# 🚀 Nezuko Project Setup & Run Process

> **Internal Development Reference** - Complete guide for setting up and running the Nezuko platform.

---

## 📋 Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Python** | 3.13+ | Bot and API |
| **Node.js** | 20+ | Required by Next.js 16 |
| **Bun** | 1.3.6+ | Frontend package manager |
| **PostgreSQL** | 15+ | Database (or Supabase) |
| **Redis** | 7+ | Caching (optional for dev) |

---

## 🔧 Environment Setup Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    1. CLONE REPOSITORY                        │
│         git clone https://github.com/.../Nezuko.git           │
└────────────────────────┬─────────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────────┐
│               2. SETUP SUPABASE PROJECT                       │
│   • Create project at supabase.com                            │
│   • Get: URL, ANON_KEY, SERVICE_ROLE_KEY, JWT_SECRET          │
│   • Run migrations (or create tables via dashboard)           │
└────────────────────────┬─────────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────────┐
│            3. CONFIGURE ENVIRONMENT FILES                     │
│                                                               │
│   Each app has its own .env file:                             │
│   ├── apps/web/.env.local    (copy from .env.example)         │
│   ├── apps/api/.env          (copy from .env.example)         │
│   └── apps/bot/.env          (copy from .env.example)         │
└────────────────────────┬─────────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────────┐
│               4. INSTALL DEPENDENCIES                         │
│                                                               │
│   Frontend:  cd apps/web && bun install                       │
│   Backend:   pip install -r requirements.txt                  │
│   Monorepo:  bun install (from root)                          │
└────────────────────────┬─────────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                 5. RUN SERVICES                               │
│                                                               │
│   Terminal 1 (API):                                           │
│   cd apps/api && uvicorn src.main:app --port 8080 --reload    │
│                                                               │
│   Terminal 2 (Web):                                           │
│   cd apps/web && bun dev                                      │
│                                                               │
│   Terminal 3 (Bot):                                           │
│   python -m apps.bot.main            # From project root!     │
└──────────────────────────────────────────────────────────────┘
```

---

## 📁 Environment Variables Structure

### `apps/web/.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

### `apps/api/.env`

```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret
DATABASE_URL=sqlite+aiosqlite:///./nezuko.db  # Dev only
MOCK_AUTH=true  # Enables mock auth for local dev
```

### `apps/bot/.env`

```bash
TELEGRAM_BOT_TOKEN=123456:ABC...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 🔄 Two Modes of Operation

| Mode | Auth | Database | Use Case |
|------|------|----------|----------|
| **Local Dev** | `MOCK_AUTH=true` | SQLite | Fast development, no Supabase needed |
| **Production** | Supabase JWT | PostgreSQL (Supabase) | Real authentication |

---

## 🏃 Quick Start (TL;DR)

```bash
# 1. Clone & enter
git clone <repo> && cd Nezuko-Telegram-Bot

# 2. Copy environment files
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp apps/bot/.env.example apps/bot/.env

# 3. Install dependencies
bun install
pip install -r requirements.txt

# 4. Run all services (3 terminals)
cd apps/api && uvicorn src.main:app --port 8080 --reload
cd apps/web && bun dev
python -m apps.bot.main   # Run from project ROOT, not apps/bot/

# 5. Access
# Web: http://localhost:3000
# API: http://localhost:8080
# Login: admin@nezuko.bot / Admin@123
```

---

## 🐳 Docker Alternative

For a container-based setup:

```bash
cd config/docker
docker-compose -f docker-compose.dev.yml up
```

This spins up all services with proper networking.

---

## 🔐 Test Credentials

> ⚠️ **IMPORTANT: Use these credentials to login to the dashboard**

| Field | Value |
|-------|-------|
| **URL** | http://localhost:3000/login |
| **Email** | `admin@nezuko.bot` |
| **Password** | `Admin@123` |
| **Role** | super_admin |

```
📧 Email:    admin@nezuko.bot
🔑 Password: Admin@123
```

---

## 📊 Service Ports

| Service | Port | URL |
|---------|------|-----|
| Web Dashboard | 3000 | http://localhost:3000 |
| API Backend | 8080 | http://localhost:8080 |
| PostgreSQL | 5432 | (Supabase managed) |
| Redis | 6379 | (optional) |

---

## 🔧 Turborepo Commands

```bash
# Run all services at once (from root)
npx turbo dev

# Build all
npx turbo build

# Lint all
npx turbo lint
```

---

## ⚠️ Common Issues

### 1. Authentication Not Working

- Ensure `@supabase/ssr` is version `0.8.0+`
- Check that `.env.local` has correct Supabase keys

### 2. API Returns 401

- For local dev, set `MOCK_AUTH=true` in `apps/api/.env`
- For production, ensure JWT secret matches Supabase

### 3. Bot Not Responding

- Verify `TELEGRAM_BOT_TOKEN` is correct
- Check bot is added as admin to the group

---

*Last Updated: 2026-01-28*
