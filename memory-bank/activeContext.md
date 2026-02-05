# Active Context: Phase 43 - Real-time Dashboard Infrastructure ✅ COMPLETE

## Current Status

**Phase 43 COMPLETE** - Real-time Dashboard Infrastructure
**Date**: 2026-02-05

### Work Completed This Session

1. **Auto-refresh Polling** - All TanStack Query hooks now have refetchInterval (15-60s)
2. **SSE Event Integration** - Added `useRealtimeChart` hook combining polling + SSE
3. **Bot Event Publishing** - Bot publishes verification events to API for SSE broadcast
4. **Redis Uptime Tracking** - Persistent bot uptime across API restarts
5. **Heartbeat Service** - Bot sends periodic heartbeats (30s) to prove it's alive
6. **Code Quality Fixes** - Replaced global statements, fixed exception handling

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

| Component     | Status       | Notes                |
| ------------- | ------------ | -------------------- |
| API Server    | ✅ Running   | Port 8080            |
| Web Dashboard | ✅ Running   | Port 3000            |
| Activity Feed | ✅ Real Data | From VerificationLog |
| Logs Page     | ✅ Fallback  | Works without Redis  |
| Bot Manager   | ✅ Ready     | Multi-bot from DB    |
| API Logs      | ✅ Fixed     | Now in storage/logs/ |

---

_Last Updated: 2026-02-05 04:28 IST_
