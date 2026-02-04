# Technical Context: Nezuko - Stack, Infrastructure & Ecosystem

## 🚀 Technology Stack Overview

Nezuko is built on a "Precision First" philosophy, selecting the most stable yet advanced versions of every library in the ecosystem.

> **Full Reference**: See `docs/architecture/tech-stack.md` for complete version matrix and feature details.

---

## 📦 Core Stack Summary

| Layer              | Technologies                                                               |
| ------------------ | -------------------------------------------------------------------------- |
| **Frontend**       | Next.js 16, React 19, TypeScript 5.8+, Tailwind v4, shadcn/ui (web + web1) |
| **Backend API**    | FastAPI 0.128+, Python 3.13, SQLAlchemy 2.0, Pydantic V2                   |
| **Bot Engine**     | python-telegram-bot v22.6, AsyncIO                                         |
| **Database**       | SQLite (Local Dev), PostgreSQL (Production)                                |
| **Infrastructure** | Docker, Turborepo, Caddy                                                   |

---

## 🟢 Frontend Stack

Nezuko has two frontend applications:

### apps/web (Premium Custom Dashboard)

The original dashboard with custom premium UI components, animations, and effects.

| Technology   | Version | Purpose                                     |
| ------------ | ------- | ------------------------------------------- |
| Next.js      | 16.1.4  | React meta-framework with App Router        |
| React        | 19.2.3  | UI component library with Compiler          |
| TypeScript   | 5.9.3   | Type-safe JavaScript                        |
| Bun          | 1.3.6+  | Package manager and runtime                 |
| Tailwind CSS | 4.1.x   | Utility-first CSS (`@theme` inline pattern) |
| shadcn/ui    | Latest  | Base primitives (~40%)                      |
| Motion       | 12.29+  | Animation library (Framer Motion ~65%)      |
| Lucide React | 0.563+  | Icon library                                |
| Recharts     | 3.7+    | Charting library                            |
| Sonner       | 2.0+    | Toast notifications                         |

### apps/web1 (Pure shadcn/ui Dashboard) ✨ NEW

A pure shadcn/ui dashboard with minimal custom code. Uses standard shadcn patterns for maintainability.

| Technology     | Version | Purpose                                         |
| -------------- | ------- | ----------------------------------------------- |
| Next.js        | 16.1.6  | React meta-framework with App Router            |
| React          | 19.2.3  | UI component library with Compiler              |
| TypeScript     | 5.8.3   | Type-safe JavaScript                            |
| Bun            | 1.3.6+  | Package manager and runtime                     |
| Tailwind CSS   | 4.1.11  | Utility-first CSS                               |
| shadcn/ui      | Latest  | **100% shadcn components** (New York style)     |
| TanStack Query | 5.76.2  | Server state management                         |
| TanStack Table | 8.21.3  | Data tables with sorting, filtering, pagination |
| Recharts       | 2.15.3  | Charting (via shadcn chart component)           |
| Lucide React   | 0.513.0 | Icon library                                    |
| next-themes    | 0.4.6   | Dark/light mode                                 |

**Key Differences from apps/web:**

- 100% shadcn/ui components (no custom TiltCard, MagneticButton, etc.)
- Uses shadcn sidebar-07 pattern (collapsible icon sidebar)
- Mock data layer with service abstraction (`NEXT_PUBLIC_USE_MOCK=true`)
- Centralized query keys pattern for React Query
- No Supabase auth (standalone mock-first development)

### Technology Usage Estimates (as of 2026-02-03)

| Technology            | apps/web | apps/web1 |
| :-------------------- | :------: | :-------: |
| **Tailwind CSS**      |   100%   |   100%    |
| **Lucide React**      |   100%   |   100%    |
| **shadcn/ui**         |   ~40%   | **100%**  |
| **Custom Premium UI** |   ~60%   |    0%     |
| **Framer Motion**     |   ~65%   |    0%     |

### State & Data Management (Both Dashboards)

| Technology      | Version | Purpose                 |
| --------------- | ------- | ----------------------- |
| TanStack Query  | 5.90+   | Server state management |
| Zustand         | 5.0+    | Client state management |
| React Hook Form | 7.71+   | Form handling           |
| Zod             | 4.3+    | Schema validation       |

### Key Patterns (Next.js 16)

```typescript
// ✅ Async route params (Next.js 16)
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}

// ✅ TanStack Query v5
const { data, isPending } = useQuery({
  queryKey: ["groups"],
  queryFn: fetchGroups,
});

// ✅ Theme System (See System Patterns)
const { resolvedTheme } = useTheme(); // Mode
const { accentHex } = useThemeConfig(); // Config
```

---

## 🔵 Backend API Stack (apps/api)

### Core Framework

| Technology | Version | Purpose                      |
| ---------- | ------- | ---------------------------- |
| Python     | 3.13+   | Programming language         |
| FastAPI    | 0.128+  | Modern async web framework   |
| Uvicorn    | 0.40+   | ASGI server                  |
| Pydantic   | 2.12+   | Data validation and settings |

### Database & ORM

| Technology | Version | Purpose                   |
| ---------- | ------- | ------------------------- |
| SQLAlchemy | 2.0+    | Async ORM                 |
| AsyncPG    | 0.31+   | PostgreSQL async driver   |
| AIOSQLite  | 0.22+   | SQLite async driver (dev) |
| Alembic    | 1.18.3+ | Database migrations       |
| Redis      | 7.1+    | Caching and pub/sub       |

### Key Patterns (SQLAlchemy 2.0)

```python
# ✅ Use select() style queries (SQLAlchemy 2.0)
from sqlalchemy import select

async def get_groups(session: AsyncSession):
    result = await session.execute(
        select(ProtectedGroup).where(ProtectedGroup.is_active == True)
    )
    return result.scalars().all()

# ✅ Pydantic V2 model_validator
@model_validator(mode='after')
def validate_channel(self) -> 'GroupCreate':
    return self
```

---

## 🤖 Bot Engine Stack (apps/bot)

### Core

| Technology          | Version | Purpose                  |
| ------------------- | ------- | ------------------------ |
| Python              | 3.13+   | Programming language     |
| python-telegram-bot | 22.6+   | Telegram Bot API wrapper |
| AIOHTTP             | 3.13+   | Async HTTP client        |
| HTTPX               | 0.28+   | Modern HTTP client       |

### Infrastructure

- Shared SQLAlchemy models with API
- Shared Redis cache layer
- Prometheus metrics integration
- Unified SQLite database (`storage/data/nezuko.db`)

---

## 🔑 Authentication Architecture

### Telegram Login Widget Flow (Phase 41+)

1. **Web Client** → Loads Telegram Login Widget (`telegram-login.tsx`)
2. **Telegram** → User authenticates with Telegram, returns signed data
3. **Web Client** → Sends auth data `POST /api/v1/auth/telegram`
4. **API** → Verifies HMAC-SHA256 hash using `LOGIN_BOT_TOKEN`
5. **API** → Checks `telegram_id == BOT_OWNER_TELEGRAM_ID`
6. **API** → Creates session, sets HTTP-only `nezuko_session` cookie
7. **Proxy (proxy.ts)** → Checks for `nezuko_session` cookie
8. **API Requests** → Cookie sent automatically with `credentials: 'include'`

### Authentication Packages

| Package           | Purpose                            |
| ----------------- | ---------------------------------- |
| `cryptography`    | Fernet encryption for bot tokens   |
| `hmac` + `sha256` | HMAC verification of Telegram data |

### Session Model (`apps/api/src/models/session.py`)

| Column               | Type          | Notes                |
| :------------------- | :------------ | :------------------- |
| `id`                 | `String(36)`  | Primary Key, UUID    |
| `telegram_id`        | `BigInteger`  | Indexed (owner ID)   |
| `telegram_username`  | `String(255)` | Nullable             |
| `telegram_name`      | `String(255)` | Required             |
| `telegram_photo_url` | `Text`        | Nullable             |
| `expires_at`         | `DateTime`    | Indexed (expiration) |
| `created_at`         | `DateTime`    | Auto-set             |

### Bot Instance Model (`apps/api/src/models/bot_instance.py`)

| Column              | Type          | Notes                  |
| :------------------ | :------------ | :--------------------- |
| `id`                | `Integer`     | Primary Key, Auto-inc  |
| `owner_telegram_id` | `BigInteger`  | Indexed                |
| `bot_id`            | `BigInteger`  | Unique, Indexed        |
| `bot_username`      | `String(255)` | Required               |
| `bot_name`          | `String(255)` | Nullable               |
| `token_encrypted`   | `Text`        | Fernet-encrypted token |
| `is_active`         | `Boolean`     | Default: True          |
| `created_at`        | `DateTime`    | Auto-set               |
| `updated_at`        | `DateTime`    | Auto-update            |

### Environment Variables (Separated Bot Architecture)

The system uses a **separated bot architecture**:

- **Login Bot**: Only for Telegram Login Widget (in .env)
- **Working Bots**: Added via Dashboard, encrypted in database

```bash
# ===========================================
# apps/api/.env (Required)
# ===========================================
# Login bot - only for dashboard authentication
LOGIN_BOT_TOKEN=1234567890:ABCdefGHIjklmnopQRSTuvwxyz
BOT_OWNER_TELEGRAM_ID=123456789
ENCRYPTION_KEY=<Fernet.generate_key()>
SESSION_EXPIRY_HOURS=24

# Database
DATABASE_URL=sqlite+aiosqlite:///../../storage/data/nezuko.db

# ===========================================
# apps/web/.env.local (Required)
# ===========================================
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_LOGIN_BOT_USERNAME=YourBotUsername

# ===========================================
# apps/bot/.env (Optional BOT_TOKEN)
# ===========================================
# If set: Standalone mode (runs this single bot)
# If empty: Dashboard mode (reads bots from database)
BOT_TOKEN=
DATABASE_URL=sqlite+aiosqlite:///../../storage/data/nezuko.db
```

### Configuration Files

| File                                      | Purpose                |
| :---------------------------------------- | :--------------------- |
| `apps/api/.env`                           | API + login bot config |
| `apps/api/.env.example`                   | Template with docs     |
| `apps/web/.env.local`                     | Web dashboard config   |
| `apps/web/.env.example`                   | Template with docs     |
| `apps/bot/.env`                           | Bot worker config      |
| `apps/bot/.env.example`                   | Template with docs     |
| `docs/setup/environment-configuration.md` | Full guide             |

---

## 📄 Database Schema Reference

### Model: `Session` (Telegram Auth)

| Column               | Type          | Notes                |
| :------------------- | :------------ | :------------------- |
| `id`                 | `String(36)`  | Primary Key, UUID    |
| `telegram_id`        | `BigInteger`  | Indexed (owner ID)   |
| `telegram_username`  | `String(255)` | Nullable             |
| `telegram_name`      | `String(255)` | Required             |
| `telegram_photo_url` | `Text`        | Nullable             |
| `expires_at`         | `DateTime`    | Indexed (expiration) |
| `created_at`         | `DateTime`    | Auto-set             |

### Model: `BotInstance` (Encrypted Bot Tokens)

| Column              | Type          | Notes                  |
| :------------------ | :------------ | :--------------------- |
| `id`                | `Integer`     | Primary Key, Auto-inc  |
| `owner_telegram_id` | `BigInteger`  | Indexed                |
| `bot_id`            | `BigInteger`  | Unique, Indexed        |
| `bot_username`      | `String(255)` | Required               |
| `bot_name`          | `String(255)` | Nullable               |
| `token_encrypted`   | `Text`        | Fernet-encrypted token |
| `is_active`         | `Boolean`     | Default: True          |
| `created_at`        | `DateTime`    | Auto-set               |
| `updated_at`        | `DateTime`    | Auto-update            |

### Model: `AdminAuditLog`

| Column          | Type         | Notes        |
| :-------------- | :----------- | :----------- |
| `id`            | `String(36)` | Primary Key  |
| `user_id`       | `String(36)` | FK, Nullable |
| `action`        | `String(50)` | Required     |
| `resource_type` | `String(50)` | Required     |
| `old_value`     | `JSON`       | Nullable     |
| `new_value`     | `JSON`       | Nullable     |

### Real-time Logging: `admin_logs`

| Column      | Type        | Notes             |
| :---------- | :---------- | :---------------- |
| `id`        | `UUID`      | PK                |
| `level`     | `VARCHAR`   | INFO, ERROR, WARN |
| `message`   | `TEXT`      | Log content       |
| `metadata`  | `JSONB`     | Context data      |
| `timestamp` | `TIMESTAMP` | Event time        |

---

## 🛠️ Development Setup

### Quick Start (For Humans)

> **Note**: `nezuko.bat` CLI menu is for humans. AI agents should use direct commands below.

```bash
# Launch unified CLI menu (humans only)
.\nezuko.bat

# Direct commands (for AI agents)
.\scripts\dev\start.ps1    # Start services
.\scripts\dev\stop.ps1     # Stop services
```

### Logging System

All scripts write to `scripts/logs/nezuko-YYYY-MM-DD.log`:

```bash
# View recent logs
Get-Content scripts/logs/nezuko-*.log -Tail 50

# Log format
[2026-01-28 17:49:26] [INFO] [PYTHON] COMMAND: pip install -r requirements.txt
[2026-01-28 17:49:26] [SUCCESS] [PYTHON] Installed from requirements.txt
```

| Feature        | Behavior                                  |
| -------------- | ----------------------------------------- |
| **Rotation**   | Daily (new file each day)                 |
| **Mode**       | Append-only (never overwrites)            |
| **Retention**  | Logs never auto-deleted                   |
| **Categories** | INSTALL, CLEAN, DEV, PYTHON, NODE, SYSTEM |

### Manual Commands (if needed)

```bash
# Terminal 1 - Web Dashboard
cd apps/web && bun dev     # Runs on localhost:3000

# Terminal 2 - API Server
cd apps/api && uvicorn src.main:app --reload --port 8080

# Terminal 3 - Bot (IMPORTANT: Run from project root!)
python -m apps.bot.main    # ✅ Correct
# cd apps/bot && python main.py  # ❌ Wrong - breaks imports!
```

### First-Time Setup

```bash
./nezuko.bat  # Then select option 4
# Or directly:
./scripts/setup/install.ps1
```

### Python Dependencies Structure

```
requirements/
├── base.txt       # Shared dependencies (SQLAlchemy, Redis, Pydantic)
├── api.txt        # API-specific (FastAPI, Uvicorn)
├── bot.txt        # Bot-specific (python-telegram-bot)
├── dev.txt        # Development tools (pytest, ruff, mypy)
├── prod-api.txt   # Production API (base + api)
└── prod-bot.txt   # Production Bot (base + bot)
```

| Command                                    | Purpose                |
| ------------------------------------------ | ---------------------- |
| `pip install -r requirements.txt`          | Development (all deps) |
| `pip install -r requirements/prod-api.txt` | Production API         |
| `pip install -r requirements/prod-bot.txt` | Production Bot         |

### Storage Directory

```
storage/
├── cache/         # Redis fallback cache
├── data/          # SQLite databases (nezuko.db)
├── logs/          # Application logs (bot.log)
└── uploads/       # User-uploaded files
```

### Environment Variables

```bash
# apps/api/.env
LOGIN_BOT_TOKEN=<bot-token-for-login>
BOT_OWNER_TELEGRAM_ID=<your-telegram-id>
ENCRYPTION_KEY=<fernet-key>
DATABASE_URL=sqlite+aiosqlite:///../../storage/data/nezuko.db
MOCK_AUTH=true  # Enable mock auth for local dev

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_LOGIN_BOT_USERNAME=YourBotUsername

# apps/bot/.env (optional)
BOT_TOKEN=<optional-for-standalone-mode>
DATABASE_URL=sqlite+aiosqlite:///../../storage/data/nezuko.db
```

---

## 🔐 Test Credentials (Development)

| User  | Email            | Password  | Role        |
| ----- | ---------------- | --------- | ----------- |
| Admin | admin@nezuko.bot | Admin@123 | super_admin |

---

## 🔧 Code Quality Tools

### Python

| Tool            | Purpose                                            |
| --------------- | -------------------------------------------------- |
| Ruff 0.14.14+   | Fast linter and formatter (RUF, PERF, ASYNC rules) |
| Pylint 4.0.4+   | Static code analysis (target: 10.00/10)            |
| Pyrefly 0.50.1+ | Type checking (target: 0 errors)                   |
| Pytest 9.0.2+   | Testing framework                                  |

### TypeScript

| Tool            | Purpose         |
| --------------- | --------------- |
| ESLint 9.18+    | Linting         |
| Prettier 3.4+   | Code formatting |
| TypeScript 5.9+ | Type checking   |

---

## 📚 Documentation Reference

| Topic             | Location                          |
| ----------------- | --------------------------------- |
| Tech Stack (Full) | `docs/architecture/tech-stack.md` |
| Architecture      | `docs/architecture/README.md`     |
| API Reference     | `docs/api/README.md`              |
| Bot Reference     | `docs/bot/README.md`              |
| Deployment        | `docs/deployment/README.md`       |

---

_Last Updated: 2026-02-04_
