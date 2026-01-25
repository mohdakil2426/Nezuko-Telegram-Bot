# GEMINI.md - AI Coding Assistant Instructions

<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

## Project Overview

**Nezuko - The Ultimate All-In-One Bot** is a production-ready, multi-tenant Telegram bot for automated channel membership enforcement. Python 3.13+, async-first architecture using python-telegram-bot v22.5+.

## Build, Lint & Test Commands

```bash
# Install dependencies (Python)
pip install -r requirements.txt

# Install dependencies (Node.js/Bun)
bun install

# Run the bot
python -m bot.main

# Run Admin Panel
cd apps/web && bun dev

# Linting & Formatting
ruff check .                          # Check for lint errors
ruff check . --fix                    # Auto-fix lint errors
ruff format .                         # Format code
pylint bot/                           # Run pylint (target: 10.00/10)

# Type Checking
python -m pyrefly check               # Static type analysis (target: 0 errors)
mypy bot/                             # Alternative type checker

# Testing
pytest                                # Run all tests
pytest -v                             # Verbose output
pytest tests/unit/                    # Run unit tests only
pytest tests/integration/             # Run integration tests only
pytest tests/load/                    # Run load/performance tests

# Run a SINGLE test file
pytest tests/unit/test_verification.py -v

# Run a SINGLE test function
pytest tests/unit/test_verification.py::test_check_membership -v

# Run tests matching a pattern
pytest -k "cache" -v                  # All tests with "cache" in name

# Coverage
pytest --cov=bot --cov-report=html    # Generate coverage report

# Database migrations
alembic upgrade head                  # Apply all migrations
alembic revision --autogenerate -m "description"  # Create migration
alembic downgrade -1                  # Rollback last migration
```

## Code Style Guidelines

### Line Length & Formatting

- **Line length**: 100 characters (not PEP 8's 79)
- **Indentation**: 4 spaces
- **Formatter**: Ruff (`ruff format .`)

## Browser Automation

- use playwright mcp for browser automation, testing, debugging.

## Skills

### Always use the following skills:

- **tech-stack-rules** - Authoritative coding standards for Nezuko. Use for code review, refactoring, debugging, architecture decisions, best practices. Backend: Python 3.13+, AsyncIO, SQLAlchemy 2.0, PTB v22, Sentry, Structlog. Frontend: Next.js 16, React 19, TypeScript strict, TanStack Query, Zustand, Tailwind v4, Shadcn/UI. Triggers: `best practices`, `code review`, `refactor`, `async pattern`, `type safety`, `performance`.

- **firebase** - Firebase/Firestore patterns for authentication, real-time data, security rules. Covers Firestore data modeling, Authentication (Email/OAuth), Cloud Functions, Storage, batch operations, transactions, offline persistence. Use for Firebase integration, security rules, Auth implementation, real-time listeners, Firestore CRUD. Triggers: `firebase`, `firestore`, `auth`, `security rules`, `real-time`.

- **ui-ux-pro-max** - UI/UX design intelligence with 50+ styles, 97 color palettes, 57 font pairings across 9 stacks. Use for designing components, choosing colors/fonts, accessibility reviews, landing pages, dashboards. Includes searchable CLI tool for design system generation. Triggers: `design`, `ui`, `ux`, `color palette`, `typography`, `accessibility`, `glassmorphism`, `tailwind`, `shadcn`.
