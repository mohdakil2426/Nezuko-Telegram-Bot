# Technical Context: Stack & Development

## Technology Stack

### Backend (Python 3.13)

| Package | Version | Purpose |
|---------|---------|---------|
| FastAPI | 0.128+ | REST API framework |
| python-telegram-bot | 22.6+ | Telegram Bot API |
| SQLAlchemy | 2.0+ | Async ORM |
| Pydantic | 2.12+ | Data validation |
| Uvicorn | 0.40+ | ASGI server |
| AsyncPG | 0.31+ | PostgreSQL driver |
| AIOSQLite | 0.22+ | SQLite driver (dev) |
| Redis | 7.1+ | Caching |
| Alembic | 1.18+ | Migrations |

### Frontend (TypeScript)

| Package | Version | Purpose |
|---------|---------|---------|
| Next.js | 16.1+ | React framework |
| React | 19.2+ | UI library |
| TypeScript | 5.9+ | Type safety |
| Tailwind CSS | 4.1+ | Styling |
| TanStack Query | 5.90+ | Data fetching |
| shadcn/ui | Latest | UI components |
| Recharts | 3.7+ | Charts |

### Infrastructure

| Tool | Purpose |
|------|---------|
| Docker | Containerization |
| Turborepo | Monorepo management |
| Caddy | Reverse proxy |
| PostgreSQL 17 | Production database |
| Bun | Package manager |

---

## Development Setup

### Quick Start
```bash
# Install dependencies
pip install -r requirements.txt
cd apps/web && bun install

# Start services
python -m apps.bot.main          # Bot (from root)
cd apps/api && uvicorn src.main:app --reload --port 8080
cd apps/web && bun dev           # Web (port 3000)
```

### Environment Files

| App | File | Template |
|-----|------|----------|
| API | `apps/api/.env` | `apps/api/.env.example` |
| Bot | `apps/bot/.env` | `apps/bot/.env.example` |
| Web | `apps/web/.env.local` | `apps/web/.env.example` |

### Required Environment Variables

```bash
# API (.env)
LOGIN_BOT_TOKEN=<telegram-bot-token>
BOT_OWNER_TELEGRAM_ID=<your-telegram-id>
ENCRYPTION_KEY=<fernet-key>
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/nezuko

# Web (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_LOGIN_BOT_USERNAME=YourBotUsername
```

---

## Code Quality Tools

### Python
```bash
ruff check apps/bot apps/api    # Linting (0 errors)
ruff format .                   # Formatting
pylint apps/bot apps/api        # Score: 10.00/10
pyrefly check                   # Type check (0 errors)
pytest                          # Tests
```

### TypeScript
```bash
cd apps/web
bun run lint                    # ESLint (0 warnings)
bun run build                   # TypeScript (0 errors)
bunx prettier --write "src/**/*"
```

---

## Database

### PostgreSQL with Docker (Required)
```bash
# Start PostgreSQL container
docker run -d --name nezuko-postgres \
  -e POSTGRES_USER=nezuko \
  -e POSTGRES_PASSWORD=nezuko123 \
  -e POSTGRES_DB=nezuko \
  -p 5432:5432 postgres:17-alpine

# Apply migrations
cd apps/api && alembic upgrade head
```

**Note**: SQLite is no longer supported. PostgreSQL with Docker is required for both development and production.

---

## File Locations

| Type | Location |
|------|----------|
| Tests | `tests/api/`, `tests/bot/` |
| Database | `storage/data/` |
| Logs | `storage/logs/` |
| Python deps | `requirements/*.txt` |
| Docker | `config/docker/` |

---

_Last Updated: 2026-02-07_
