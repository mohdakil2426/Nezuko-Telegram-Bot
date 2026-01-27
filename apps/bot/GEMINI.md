# Telegram Bot Context

## Overview

Telegram bot for automated channel membership enforcement using python-telegram-bot v22.6+.

## Tech Stack

- **Library**: python-telegram-bot v22.6+ (AsyncIO)
- **Python**: 3.13+
- **Database**: SQLAlchemy 2.0 async
- **Cache**: Redis 7+
- **Metrics**: Prometheus

## Key Patterns

### Project Structure

```
apps/bot/
├── main.py           # Entry point
├── config.py         # Environment configuration
├── core/             # Database, cache, rate limiter
├── database/         # Models, CRUD, migrations
├── handlers/         # Telegram update handlers
│   ├── admin/        # Admin commands (/protect, /settings)
│   └── events/       # Event handlers (join, leave)
├── services/         # Business logic
└── utils/            # Metrics, health, logging
```

### Handler Patterns

```python
from telegram import Update
from telegram.ext import ContextTypes

# ✅ Use type hints
async def protect_command(
    update: Update, 
    context: ContextTypes.DEFAULT_TYPE
) -> None:
    """Handle /protect command."""
    if not update.effective_chat or not update.effective_user:
        return
    
    # Always check permissions
    chat_member = await update.effective_chat.get_member(
        update.effective_user.id
    )
    if chat_member.status not in ["administrator", "creator"]:
        await update.message.reply_text("Admin only!")
        return
```

### Async Database Access

```python
# ✅ Use async context manager
async with get_session() as session:
    group = await crud.get_protected_group(session, chat_id)

# ❌ Don't block the event loop
# result = sync_db_call()  # BAD
```

### Redis Caching

```python
from core.cache import cache

# ✅ Use cache with TTL
@cache.cached(ttl=300, key_prefix="membership")
async def check_membership(user_id: int, channel_id: int) -> bool:
    ...

# ✅ Invalidate on changes
await cache.delete(f"membership:{user_id}:{channel_id}")
```

### Error Handling

```python
from telegram.error import TelegramError

try:
    await bot.send_message(chat_id, text)
except TelegramError as e:
    logger.error(f"Telegram API error: {e}")
    # Graceful degradation
```

### Rate Limiting

```python
from core.rate_limiter import rate_limiter

# ✅ Respect Telegram limits (30 msg/sec)
@rate_limiter.limit("25/second")
async def send_notification(chat_id: int, text: str):
    ...
```

## Commands

```bash
python main.py                    # Run bot (polling mode)
python main.py --webhook          # Run bot (webhook mode)
alembic upgrade head              # Apply migrations
pytest tests/bot/ -v              # Run tests
```

## Bot Commands Reference

| Command | Permission | Description |
|---------|------------|-------------|
| `/start` | Anyone | Welcome message |
| `/help` | Anyone | Command help |
| `/protect @channel` | Admin | Enable protection |
| `/unprotect` | Admin | Disable protection |
| `/status` | Anyone | View status |
| `/settings` | Admin | Manage settings |
