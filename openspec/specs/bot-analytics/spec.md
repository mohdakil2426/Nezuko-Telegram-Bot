# Spec: Bot Analytics Enhancement

## Overview

Extend the Telegram bot to log all data required for dashboard analytics, including API calls, error categorization, and member/subscriber count synchronization.

## ADDED Features

### Feature: API Call Logging

**Purpose**: Log all Telegram API calls to database for the API Calls Distribution chart

**Requirements**:

- WHEN bot makes any Telegram API call
- THEN log method, chat_id, user_id, success, latency_ms, error_type to `api_call_log` table
- AND logging MUST be non-blocking (async fire-and-forget)
- AND failed logging MUST NOT impact bot operation

**API Methods to Log**:
| Method | Location | Priority |
|--------|----------|----------|
| `getChatMember` | `services/verification.py` | High |
| `restrictChatMember` | `services/protection.py` | High |
| `promoteChatMember` | `services/protection.py` | High |
| `sendMessage` | Various handlers | Medium |
| `deleteMessage` | `utils/auto_delete.py` | Medium |
| `getChat` | `handlers/admin/setup.py` | Medium |
| `getChatMemberCount` | `services/member_sync.py` | Low |

**New Files**:

- `apps/bot/database/api_call_logger.py` - Logger module with async functions

---

### Feature: Enhanced Error Logging

**Purpose**: Categorize errors for error breakdown chart

**Requirements**:

- WHEN verification fails with error
- THEN set `error_type` in verification_log
- VALUES: `TelegramError`, `NetworkError`, `RateLimitError`, `ChatNotFoundError`, `UserBannedError`, `UnknownError`

**Implementation**:

```python
# apps/bot/services/verification.py
except TelegramError as e:
    error_type = type(e).__name__  # e.g., "BadRequest", "ChatNotFound"
    log_verification(
        user_id=user_id,
        group_id=group_id,
        channel_id=channel_id,
        status="error",
        error_type=error_type,  # NEW field
        latency_ms=latency_ms,
    )
```

---

### Feature: Member Count Sync

**Purpose**: Keep member/subscriber counts updated for dashboard stats

**Requirements**:

- WHEN bot starts
- THEN schedule periodic sync job
- EVERY 15 minutes
- FOR each protected group: call `getChatMemberCount`, update `member_count` column
- FOR each enforced channel: call `getChatMemberCount`, update `subscriber_count` column
- AND log each API call
- AND handle rate limits using PTB's built-in `AIORateLimiter`

**Rate Limit Handling (Verified from python-telegram-bot v22 docs)**:

> **Source**: [python-telegram-bot Wiki - Avoiding flood limits](https://github.com/python-telegram-bot/python-telegram-bot/wiki/Avoiding-flood-limits)

PTB v20+ includes a built-in rate limiting mechanism via `AIORateLimiter`. When a bot exceeds Telegram's rate limits, it receives `RetryAfter` errors. The `AIORateLimiter` automatically handles retries with exponential backoff.

```python
# apps/bot/main.py - Application setup with rate limiter
from telegram.ext import AIORateLimiter, ApplicationBuilder

rate_limiter = AIORateLimiter(max_retries=5)

application = (
    ApplicationBuilder()
    .token(settings.BOT_TOKEN)
    .rate_limiter(rate_limiter)  # Handles RetryAfter automatically
    .build()
)
```

For the member sync, the rate limiter is automatically applied to all API calls. For additional safety with batch operations:

```python
# apps/bot/services/member_sync.py
from telegram.error import RetryAfter
import asyncio

async def sync_member_counts(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Sync member/subscriber counts from Telegram API with rate limit handling."""
    async with get_session() as session:
        groups = await get_all_protected_groups(session)
        for group in groups:
            try:
                count = await context.bot.get_chat_member_count(group.group_id)
                group.member_count = count
                group.last_sync_at = datetime.now(UTC)
                log_api_call_async("getChatMemberCount", chat_id=group.group_id, success=True)
            except RetryAfter as e:
                # Telegram rate limit - wait and skip this iteration
                logger.warning("Rate limited, waiting %s seconds", e.retry_after)
                await asyncio.sleep(e.retry_after + 1)
                continue
            except TelegramError as e:
                log_api_call_async("getChatMemberCount", chat_id=group.group_id,
                                  success=False, error_type=type(e).__name__)
                continue

        await session.commit()
```

**New Files**:

- `apps/bot/services/member_sync.py` - Sync service with job scheduling

**Integration Point**:

```python
# apps/bot/main.py
from apps.bot.services.member_sync import schedule_member_sync

async def post_init(application: Application) -> None:
    ...
    # Schedule member count sync
    schedule_member_sync(application)
```

---

### Feature: Bot Uptime Tracking

**Purpose**: Calculate uptime percentage for bot health gauge

**Requirements**:

- WHEN bot starts
- THEN store start timestamp in Redis key `nezuko:bot:start_time`
- WHEN `/api/v1/charts/bot-health` called
- THEN calculate uptime = (now - start_time) / expected_uptime \* 100

**Implementation**:

```python
# apps/bot/core/uptime.py
import time
from apps.bot.core.cache import cache_set, cache_get

BOT_START_TIME_KEY = "nezuko:bot:start_time"

async def record_bot_start() -> None:
    """Record bot start time in Redis."""
    await cache_set(BOT_START_TIME_KEY, str(time.time()), ttl=604800)  # 7 days

async def get_bot_uptime_seconds() -> float:
    """Get seconds since bot started."""
    start_str = await cache_get(BOT_START_TIME_KEY)
    if not start_str:
        return 0.0
    return time.time() - float(start_str)
```

## MODIFIED Files

### File: apps/bot/database/models.py

**Add Column to VerificationLog**:

```python
error_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
```

**Add Columns to ProtectedGroup**:

```python
member_count: Mapped[int] = mapped_column(Integer, default=0)
last_sync_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
```

**Add Columns to EnforcedChannel**:

```python
subscriber_count: Mapped[int] = mapped_column(Integer, default=0)
last_sync_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
```

**Add New Model**:

```python
class ApiCallLog(Base):
    __tablename__ = "api_call_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    method: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    chat_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    user_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC), index=True)
```

---

### File: apps/bot/services/verification.py

**Add API Call Logging**:

```python
from apps.bot.database.api_call_logger import log_api_call_async

async def _verify_via_api(...):
    start_time = time.perf_counter()
    try:
        record_api_call("getChatMember")
        member = await context.bot.get_chat_member(...)
        latency_ms = int((time.perf_counter() - start_time) * 1000)

        # NEW: Log to database
        log_api_call_async("getChatMember", chat_id=channel_id, user_id=user_id,
                          success=True, latency_ms=latency_ms)
        ...
    except TelegramError as e:
        error_type = type(e).__name__
        log_api_call_async("getChatMember", chat_id=channel_id, user_id=user_id,
                          success=False, error_type=error_type)
        ...
```

---

### File: apps/bot/services/protection.py

**Add API Call Logging for restrict/unrestrict**:

```python
from apps.bot.database.api_call_logger import log_api_call_async

async def restrict_user(chat_id: int, user_id: int, context: ContextTypes.DEFAULT_TYPE) -> bool:
    start_time = time.perf_counter()
    try:
        await context.bot.restrict_chat_member(...)
        latency_ms = int((time.perf_counter() - start_time) * 1000)
        log_api_call_async("restrictChatMember", chat_id=chat_id, user_id=user_id,
                          success=True, latency_ms=latency_ms)
        return True
    except TelegramError as e:
        log_api_call_async("restrictChatMember", chat_id=chat_id, user_id=user_id,
                          success=False, error_type=type(e).__name__)
        return False
```

---

### File: apps/bot/main.py

**Add Member Sync Scheduling**:

```python
from apps.bot.services.member_sync import schedule_member_sync
from apps.bot.core.uptime import record_bot_start

async def post_init(application: Application) -> None:
    ...
    # Record bot start time
    await record_bot_start()

    # Schedule member count sync (every 15 minutes)
    schedule_member_sync(application)
```

## Files to Create

| File                                   | Purpose                               |
| -------------------------------------- | ------------------------------------- |
| `apps/bot/database/api_call_logger.py` | Async API call logging                |
| `apps/bot/services/member_sync.py`     | Periodic member/subscriber count sync |
| `apps/bot/core/uptime.py`              | Bot uptime tracking utilities         |

## Database Migration Notes

Need to create migration for:

1. New `api_call_log` table
2. New columns in `protected_groups`: `member_count`, `last_sync_at`
3. New columns in `enforced_channels`: `subscriber_count`, `last_sync_at`
4. New column in `verification_log`: `error_type`
