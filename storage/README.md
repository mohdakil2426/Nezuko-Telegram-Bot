# Storage Directory

This directory contains all runtime files for the Nezuko application. 
**All contents (except `.gitkeep` files) are gitignored.**

## Directory Structure

```
storage/
├── cache/          # Redis fallback cache files
├── data/           # SQLite database files
│   └── nezuko.db   # Main application database
├── logs/           # Application log files
│   ├── bot.log     # Telegram bot logs
│   └── api.log     # FastAPI backend logs
└── uploads/        # User-uploaded files
```

## Logging Architecture

Nezuko uses a multi-destination structured logging system across all applications:

### Log Destinations

| Destination | Bot | API | Web | Purpose |
|:------------|:----|:----|:----|:--------|
| **Console** | ✅ | ✅ | ✅ | Development output |
| **File** | `bot.log` | `api.log` | N/A | Local log storage |
| **PostgreSQL** | ✅ | ✅ | N/A | `admin_logs` table |
| **Redis** | ✅ | ✅ | N/A | Real-time pub/sub |

### Log Files

- **bot.log**: Telegram bot structured logs (JSON in production, pretty in dev)
- **api.log**: FastAPI backend structured logs (JSON in production, pretty in dev)

### Production Features

In production (`ENVIRONMENT=production`):

1. **PostgreSQL Logging**: INFO+ level logs stored in `admin_logs` table
2. **Redis Pub/Sub**: Real-time streaming to `nezuko:bot:logs` and `nezuko:api:logs`
3. **JSON Format**: All logs serialized as JSON for log aggregation (Loki, ELK)

### Log Format

```json
{
  "timestamp": "2026-02-04T15:00:00Z",
  "level": "INFO",
  "message": "User verified",
  "app": "nezuko-bot",
  "environment": "production",
  "logger": "verification",
  "user_id": "123456789",
  "group_id": "-1001234567890"
}
```

## Database Setup

For local development with SQLite, set your DATABASE_URL to:

```bash
# In apps/bot/.env or apps/api/.env
DATABASE_URL=sqlite+aiosqlite:///./storage/data/nezuko.db
```

For production, use PostgreSQL:

```bash
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/nezuko
```

## Notes

- The `.gitkeep` files ensure these directories exist after cloning
- All runtime data is stored here to keep the codebase clean
- Never commit actual database or log files to version control
- Logs are rotated automatically by the underlying logging framework

