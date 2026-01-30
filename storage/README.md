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
│   └── bot.log     # Telegram bot logs
└── uploads/        # User-uploaded files
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
