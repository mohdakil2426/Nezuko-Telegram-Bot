# Project: Nezuko Telegram Bot Platform

## Project Overview

Nezuko is a production-ready, multi-tenant Telegram bot platform for automated channel membership enforcement. Built with Python 3.13+ and async-first architecture using python-telegram-bot v22.6+.

**Memory Bank**: The `memory-bank/` directory contains the source of truth for project context, patterns, and progress tracking. Read these files for deep project understanding.

## General Instructions

- Follow the existing coding patterns in the codebase
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

```bash
# Install dependencies
pip install -r requirements.txt    # Python
bun install                        # Node.js

# Run services
cd apps/bot && python main.py      # Bot
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

## Browser Automation

Use Playwright MCP for browser automation, testing, and debugging.

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
| **playwright** | Browser automation, testing, screenshots, form filling |
| **supabase-mcp-server** | Database operations, migrations, edge functions |

### Usage Examples

- **Context7**: Use `resolve-library-id` then `query-docs` to get current library documentation
- **Playwright**: Use `browser_navigate`, `browser_click`, `browser_type` for browser automation
- **Supabase**: Use `execute_sql`, `apply_migration`, `list_tables` for database operations
