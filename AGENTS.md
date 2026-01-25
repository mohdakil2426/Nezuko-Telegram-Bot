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
# Install dependencies
pip install -r requirements.txt

# Run the bot
python -m bot.main

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

### Import Order (enforced by ruff)
```python
# 1. Standard library
import asyncio
from datetime import datetime, timezone

# 2. Third-party packages
from telegram import Update
from telegram.ext import ContextTypes
from sqlalchemy import select

# 3. Local modules
from bot.core.database import get_session
from bot.services.verification import check_membership
```

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Files | snake_case | `rate_limiter.py` |
| Classes | PascalCase | `ProtectedGroup` |
| Functions/Variables | snake_case | `check_membership` |
| Constants | UPPER_SNAKE_CASE | `CACHE_TTL` |
| Private | underscore prefix | `_internal_helper` |

### Type Hints (Required)
```python
async def check_membership(
    user_id: int,
    channel_id: int,
    context: ContextTypes.DEFAULT_TYPE
) -> bool:
    ...
```

### Docstrings (Google style)
```python
def get_group_channels(group_id: int) -> list[EnforcedChannel]:
    """Retrieves all channels linked to a protected group.
    
    Args:
        group_id: Telegram group ID (negative integer for supergroups)
        
    Returns:
        List of EnforcedChannel objects, empty if group not protected
    """
```

## Critical Async Rules

### ALWAYS Use Async
```python
# CORRECT - Async database query
result = await session.execute(select(User).where(User.id == user_id))

# WRONG - Blocks event loop
user = session.query(User).filter(User.id == user_id).first()
```

### NEVER Block the Event Loop
- Use `await asyncio.sleep()` not `time.sleep()`
- Use async database drivers (`asyncpg`, `aiosqlite`)
- Use `aiohttp` not `requests`

### Date/Time Handling
```python
# CORRECT - Timezone-aware
from datetime import datetime, timezone
now = datetime.now(timezone.utc)

# WRONG - Deprecated
now = datetime.utcnow()  # NEVER use this
```

## Logging Standards

### Use Lazy % Formatting in Logger Calls
```python
# CORRECT - Lazy formatting (better performance)
logger.info("User %s verified in group %s", user_id, group_id)

# WRONG - Eager f-string (evaluates even if log level disabled)
logger.info(f"User {user_id} verified in group {group_id}")
```

### Use f-strings Everywhere Else
```python
message = f"Welcome {username} to {group_title}!"
```

## Error Handling

### Catch Specific Exceptions
```python
# CORRECT
from telegram.error import TelegramError
from sqlalchemy.exc import SQLAlchemyError

try:
    await some_operation()
except TelegramError as e:
    logger.exception("Telegram API error: %s", e)
except SQLAlchemyError as e:
    logger.exception("Database error: %s", e)

# WRONG - Too broad
except Exception:
    pass
```

### None Safety with Assertions
```python
# CORRECT - Assert before accessing
assert update.message is not None
await update.message.reply_text("Hello")

# Use cast() for ORM attributes
from typing import cast
channel_id = cast(int, link.channel_id)
```

## Database Patterns (SQLAlchemy 2.0 Async)

### Always Use Context Managers
```python
async with get_session() as session:
    async with session.begin():
        result = await session.execute(select(User))
        # Auto-commit on exit, auto-rollback on exception
```

### Use select() API (Not Legacy query())
```python
# CORRECT - SQLAlchemy 2.0
stmt = select(User).where(User.id == user_id)
result = await session.execute(stmt)
user = result.scalars().first()

# WRONG - Legacy API
user = session.query(User).filter_by(id=user_id).first()
```

## Key Patterns

1. **Async-First**: All I/O uses `async/await`
2. **Dependency Injection**: Pass DB session/cache to functions, no globals
3. **Graceful Degradation**: Bot works without Redis (slower, but functional)
4. **Cache-Aside**: Check cache -> on miss, query API -> cache result
5. **Rate Limiting**: AIORateLimiter at 25 msg/sec (5 below Telegram limit)

## Performance Targets

| Metric | Target |
|--------|--------|
| Verification latency (p95) | <100ms |
| Cache hit rate | >70% |
| Database query (p95) | <50ms |
| Pylint score | 10.00/10 |
| Pyrefly errors | 0 |
