# Active Context: Phase 44 - PostgreSQL Migration ✅ COMPLETE

## Current Status

**Phase 44 COMPLETE** - PostgreSQL Migration & Schema Fix
**Date**: 2026-02-05

### Work Completed This Session

1. **PostgreSQL Docker Setup** - Running on port 5432 (`nezuko-postgres` container)
2. **DateTime Timezone Fix** - Changed all timestamp columns to `DateTime(timezone=True)`
3. **BotInstance Schema Fix** - Updated migration to match model (bot_id, bot_username, etc.)
4. **Database Reset & Migrate** - Full schema recreated with Alembic migrations
5. **API Service Verified** - All endpoints tested and working with PostgreSQL
6. **Web Dashboard Running** - Serving pages correctly on port 3000

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    NEZUKO ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📱 LOGIN BOT (apps/api/.env)                                    │
│  └── Purpose: Telegram Login Widget authentication only         │
│  └── Token: LOGIN_BOT_TOKEN                                      │
│                                                                  │
│  🖥️  DASHBOARD (Web UI)                                          │
│  └── Real-time updates via TanStack Query polling               │
│  └── SSE events trigger cache invalidation for instant sync     │
│  └── Bot uptime from API /dashboard/stats                       │
│                                                                  │
│  🤖 WORKING BOTS (from Database)                                 │
│  └── BotManager reads active bots from DB                        │
│  └── Decrypts tokens with ENCRYPTION_KEY                         │
│  └── Publishes verification events to dashboard                  │
│  └── HeartbeatService for uptime tracking                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## New Files Created This Session

| File                                           | Purpose                                   |
| ---------------------------------------------- | ----------------------------------------- |
| `apps/bot/services/event_publisher.py`         | Publishes events to API for SSE broadcast |
| `apps/bot/services/heartbeat.py`               | Periodic heartbeats for uptime tracking   |
| `apps/api/src/services/uptime_service.py`      | Redis-backed uptime tracking              |
| `apps/web/src/lib/hooks/use-realtime-chart.ts` | SSE + TanStack Query combo hook           |
| `scripts/seed_test_data.py`                    | Standalone SQLite test data seeder        |

---

## Files Modified This Session

| File                                         | Change                                              |
| -------------------------------------------- | --------------------------------------------------- |
| `apps/web/src/lib/hooks/use-dashboard.ts`    | Added refetchInterval (15-60s)                      |
| `apps/web/src/lib/hooks/use-charts.ts`       | Added 60s polling to all chart hooks                |
| `apps/web/src/lib/hooks/use-analytics.ts`    | Added 30-60s polling                                |
| `apps/bot/services/verification.py`          | Integrated EventPublisher for SSE                   |
| `apps/bot/main.py`                           | Initialize event publisher and heartbeat at startup |
| `apps/api/src/api/v1/endpoints/events.py`    | Added bot heartbeat/start/stop/status endpoints     |
| `apps/api/src/api/v1/endpoints/dashboard.py` | Uses async UptimeTracker for real bot uptime        |
| `apps/api/src/services/log_service.py`       | Redis + database fallback                           |
| `apps/api/src/core/logging.py`               | Fixed log path to project root                      |

---

## Files Deleted This Session

- ~~`apps/api/requirements.txt`~~ (deprecated redirect)
- ~~`apps/api/requirements-dev.txt`~~ (deprecated redirect)
- ~~`apps/bot/requirements.txt`~~ (deprecated redirect)

---

## Configuration Files

### Dashboard Mode (Bot from Database)

**apps/bot/.env:**

```bash
BOT_TOKEN=                    # Leave empty for dashboard mode
ENCRYPTION_KEY=<same-as-api>  # Required for token decryption
DATABASE_URL=sqlite+aiosqlite:///../../storage/data/nezuko.db
```

### Standalone Mode (Single Bot)

**apps/bot/.env:**

```bash
BOT_TOKEN=<your-bot-token>    # Set for standalone mode
DATABASE_URL=sqlite+aiosqlite:///../../storage/data/nezuko.db
```

---

## Requirements Structure (Cleaned)

```
requirements/
├── base.txt       ← Shared (SQLAlchemy, Redis, Pydantic, cryptography)
├── api.txt        ← API-only (FastAPI, Uvicorn, httpx)
├── bot.txt        ← Bot-only (python-telegram-bot)
├── dev.txt        ← Dev tools (pytest, ruff, mypy)
├── prod-api.txt   ← Production API: base + api
└── prod-bot.txt   ← Production Bot: base + bot
```

---

## Running the Application

### Start Services

```bash
# Terminal 1 - API (port 8080)
cd apps/api && python -m uvicorn src.main:app --reload --port 8080

# Terminal 2 - Web (port 3000)
cd apps/web && bun dev

# Terminal 3 - Bot (dashboard mode)
python -m apps.bot.main
```

---

## Verified Working

| Component       | Status     | Notes                     |
| --------------- | ---------- | ------------------------- |
| PostgreSQL      | ✅ Running | Docker `nezuko-postgres`  |
| API Server      | ✅ Running | Port 8080                 |
| Web Dashboard   | ✅ Running | Port 3000                 |
| Bot Instances   | ✅ Fixed   | Schema matches model      |
| Verification    | ✅ Fixed   | Timezone-aware timestamps |
| Analytics       | ✅ Working | All chart endpoints       |
| Dashboard Stats | ✅ Working | Real-time metrics         |

---

## PostgreSQL Configuration

```bash
# Start PostgreSQL container
docker run --name nezuko-postgres -e POSTGRES_USER=nezuko -e POSTGRES_PASSWORD=nezuko123 -e POSTGRES_DB=nezuko -p 5432:5432 -d postgres:17

# Connection string (apps/api/.env)
DATABASE_URL=postgresql+asyncpg://nezuko:nezuko123@localhost:5432/nezuko
```

---

_Last Updated: 2026-02-05 15:36 IST_
