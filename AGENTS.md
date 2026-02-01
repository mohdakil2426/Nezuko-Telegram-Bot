# Project: Nezuko Telegram Bot Platform

<!-- NEXT-AGENTS-MD-START -->[Next.js Docs Index]|root: ./.next-docs|STOP. What you remember about Next.js is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: npx @next/codemod agents-md --output AGENTS.md
<!-- NEXT-AGENTS-MD-END -->

## Project Overview

Nezuko is a production-ready, multi-tenant Telegram bot platform for automated channel membership enforcement. Built with Python 3.13+ and async-first architecture using python-telegram-bot v22.6+.

**Memory Bank**: The `memory-bank/` directory contains the source of truth for project context, patterns, and progress tracking. Read these files for deep project understanding.

---

## ⚠️ AI Agent Rules (MUST FOLLOW)

### 🏗️ Architecture Rules

1. **Respect Project Structure**
   - Apps go in `apps/` (web, api, bot)
   - Tests go in `tests/` (NOT in app directories)
   - Shared packages in `packages/`
   - Runtime files in `storage/` (gitignored)
   - Docker configs in `config/docker/`

2. **Never Create Files In Wrong Locations**
   - ❌ Don't create `apps/api/tests/` - use `tests/api/`
   - ❌ Don't create `apps/bot/tests/` - use `tests/bot/`
   - ❌ Don't put .db files in app dirs - use `storage/data/`
   - ❌ Don't put logs in app dirs - use `storage/logs/`

3. **Import Patterns**
   - Bot: Run from root with `python -m apps.bot.main`
   - API: Use relative imports within `src/`
   - Tests: Import from `apps.api.src` or `apps.bot`

### 🧪 Testing Rules

1. **Test Location**: ALL tests go in `tests/` directory
   ```
   tests/
   ├── conftest.py       # Shared fixtures
   ├── api/              # API tests
   │   ├── conftest.py   # API-specific fixtures
   │   ├── unit/
   │   └── integration/
   └── bot/              # Bot tests
       ├── conftest.py   # Bot-specific fixtures
       ├── unit/
       └── integration/
   ```

2. **Test Requirements**
   - Use pytest with async support (`pytest-asyncio`)
   - Use fixtures from `conftest.py`
   - Mock external services (Telegram API, Supabase)
   - Achieve meaningful coverage, not just line count

3. **Run Tests Before Committing**
   ```bash
   pytest                    # All tests must pass
   pytest tests/api/ -v      # API tests
   pytest tests/bot/ -v      # Bot tests
   ```

### 📝 Code Quality Rules

1. **Linting (ZERO TOLERANCE)**
   - Ruff: `ruff check .` must pass with NO errors
   - Pylint: Target 10.00/10 score
   - Pyrefly: Target 0 errors
   - Run linters BEFORE suggesting code is complete

2. **Ruff Rules Enabled** (Do NOT violate):
   - `RUF006`: Store `asyncio.create_task()` references
   - `PERF401`: Use list comprehensions, not loop+append
   - `RUF005`: Use `*iterable` unpacking, not `+` concatenation
   - `ASYNC`: Proper async patterns

3. **Type Hints Required**
   ```python
   # ✅ Correct
   async def get_user(user_id: int) -> User | None:
       ...
   
   # ❌ Wrong - missing types
   async def get_user(user_id):
       ...
   ```

4. **Docstrings Required** for all public functions/classes

### 🔒 Security Rules

1. **Never Commit Secrets**
   - `.env` files are gitignored
   - Use `.env.example` for templates
   - Check `git status` before commits

2. **Environment Files**
   - Each app has its own `.env` file
   - `apps/web/.env.local`
   - `apps/api/.env`
   - `apps/bot/.env`

### 📦 Dependency Rules

1. **Python Dependencies**
   - Add to appropriate file in `requirements/`
   - `base.txt` for shared deps
   - `api.txt` for API-only
   - `bot.txt` for Bot-only
   - `dev.txt` for dev tools

2. **Node Dependencies**
   - Use `bun add` in `apps/web/`
   - Shared types in `packages/types/`

### 🔄 Async Patterns (CRITICAL)

1. **Always Use Async** for I/O operations
   ```python
   # ✅ Correct
   async with get_session() as session:
       result = await session.execute(query)
   
   # ❌ Wrong - blocks event loop
   result = session.execute(query)
   ```

2. **Store Task References** (RUF006)
   ```python
   # ✅ Correct
   _background_tasks: set[asyncio.Task] = set()
   task = asyncio.create_task(coro())
   _background_tasks.add(task)
   task.add_done_callback(_background_tasks.discard)
   
   # ❌ Wrong - task may be garbage collected
   asyncio.create_task(coro())
   ```

### 📋 Before Completing Any Task

1. ✅ Run `ruff check .` - must pass
2. ✅ Run `pytest` - tests must pass
3. ✅ Check imports work correctly
4. ✅ Verify files are in correct locations
5. ✅ Add/update tests for new code
6. ✅ Update memory-bank if significant changes

---

## General Instructions

- Follow the existing coding patterns, style, and conventions in the codebase
- Use async/await for all I/O operations
- Ensure all new functions have proper docstrings
- Write type hints for all function parameters and return types
- Prefer composition over inheritance
- Keep functions small and focused (single responsibility)

## Project Structure

```
nezuko-monorepo/
├── apps/
│   ├── web/          # Next.js 16 Admin Dashboard
│   ├── api/          # FastAPI REST Backend
│   └── bot/          # Telegram Bot (PTB v22)
├── packages/         # Shared packages (@nezuko/types, @nezuko/config)
├── config/docker/    # Docker configuration
├── scripts/          # Utility scripts
├── storage/          # Runtime files (GITIGNORED)
├── docs/             # Documentation
└── tests/            # Test suites
```

## Coding Style

### Python (Backend & Bot)

- Use 4 spaces for indentation
- Line length: 100 characters (not PEP 8's 79)
- Formatter: Ruff (`ruff format .`)
- Linter: Ruff + Pylint (target: 10.00/10)
- Type checker: Pyrefly (target: 0 errors)
- Always use `async def` for I/O bound functions
- Use `snake_case` for functions and variables
- Use `PascalCase` for classes

### TypeScript (Frontend)

- Use 2 spaces for indentation
- Formatter: Prettier
- Linter: ESLint
- Use `camelCase` for functions and variables
- Use `PascalCase` for components and interfaces
- Prefer functional components with hooks

## Build & Run Commands

> **Note**: `nezuko.bat` CLI menu is for humans. AI agents should use direct commands below.

```bash
# Install dependencies
pip install -r requirements.txt    # Python
bun install                        # Node.js

# Run services
python -m apps.bot.main           # Bot (from project root)
cd apps/api && uvicorn src.main:app --reload --port 8080  # API
cd apps/web && bun dev             # Web Dashboard

# Monorepo commands
npx turbo dev                      # Run all services
npx turbo build                    # Build all
```

## Linting & Formatting

```bash
# Python
ruff check .                       # Check for lint errors
ruff check . --fix                 # Auto-fix lint errors
ruff format .                      # Format code
pylint apps/bot apps/api           # Run pylint

# TypeScript
cd apps/web && bun run lint        # Lint
cd apps/web && bun run format      # Format
```

## Testing

```bash
# Run all tests
pytest

# Run specific tests
pytest tests/unit/test_verification.py -v
pytest -k "cache" -v               # Pattern matching

# Coverage
pytest --cov=apps --cov-report=html
```

## Database Migrations

```bash
alembic upgrade head               # Apply all migrations
alembic revision --autogenerate -m "description"  # Create migration
alembic downgrade -1               # Rollback last migration
```

## Tech Stack Quick Reference

| Layer | Technologies |
|-------|-------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui |
| Backend | FastAPI, Python 3.13, SQLAlchemy 2.0, Pydantic V2 |
| Bot | python-telegram-bot v22.6, AsyncIO |
| Database | PostgreSQL 15+ (Supabase), Redis 7+ |
| Infra | Docker, Turborepo, Caddy |

## Key Patterns

- **Per-app environment files**: Each app has its own `.env` file
- **Async-first**: All database and API operations use async
- **SQLAlchemy 2.0**: Use `select()` style queries, not legacy ORM
- **Pydantic V2**: Use `model_validator` not `root_validator`
- **TanStack Query v5**: Use `isPending` not `isLoading`

## Documentation

Full documentation is available in `docs/README.md`.

For complete tech stack with versions, see `docs/architecture/tech-stack.md`.

## Component-Specific Context

@./apps/web/GEMINI.md
@./apps/api/GEMINI.md
@./apps/bot/GEMINI.md

## MCP Tools (Model Context Protocol)

The following MCP servers are available for use:

| MCP Server | Purpose |
|------------|---------|
| **context7** | Query up-to-date documentation for any library/framework |
| **supabase-mcp-server** | Database operations, migrations, edge functions |

### Usage Examples

- **Context7**: Use `resolve-library-id` then `query-docs` to get current library documentation
- **Supabase**: Use `execute_sql`, `apply_migration`, `list_tables` for database operations