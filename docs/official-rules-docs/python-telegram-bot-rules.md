# Python Best Practices & Coding Rules for AI-Assisted Telegram Bot Development

## Context

This comprehensive rule document governs the creation and modification of production-grade Telegram bot code using AI coding assistants. These rules enforce **async-first architecture, security by design, observability-as-default, and production reliability**.

- **Target Language:** Python 3.13+
- **Target Framework:** python-telegram-bot v20+ (async-only)
- **Database:** PostgreSQL 16+ (production), SQLite (dev)
- **Architecture:** Async-first, service-oriented, multi-tenant
- **Deployment:** Webhook-based (async HTTP), not polling

**Authority:** Official Python docs, official library docs, official blog posts. No third-party opinions or outdated patterns.

---

## I. ASYNC-FIRST PROGRAMMING FUNDAMENTALS

### Core Rule: Pure Async, No Sync Fallbacks

All code must be async by default. Synchronous calls are forbidden except in explicitly justified, isolated contexts (e.g., CPU-bound work via `run_in_executor`).

#### DO:
```python
# Async database fetch
result = await session.execute(select(User).where(User.id == user_id))
user = result.scalars().first()
```

#### DO NOT:
```python
# This blocks the event loop silently - FORBIDDEN
user = session.query(User).filter(User.id == user_id).first()
```

### Event Loop Lifecycle Rules

1. **Start with `asyncio.run()`** - Always use `asyncio.run()` as the single entry point. It creates an event loop, runs the main coroutine, and handles cleanup automatically.

2. **Never create multiple event loops** - Do not call `asyncio.new_event_loop()` or `loop.run_until_complete()` in async code. This breaks task context propagation and causes subtle bugs.

3. **Use `asyncio.TaskGroup` for concurrency** (Python 3.11+) - TaskGroup provides structured concurrency with proper exception handling and cancellation semantics.

   #### DO:
   ```python
   async def fetch_multiple():
       async with asyncio.TaskGroup() as tg:
           task1 = tg.create_task(fetch_user(1))
           task2 = tg.create_task(fetch_user(2))
       # All tasks complete here, or exception raised
       return task1.result(), task2.result()
   ```

   #### DO NOT:
   ```python
   # asyncio.gather lacks proper exception handling
   results = await asyncio.gather(fetch_user(1), fetch_user(2))
   ```

4. **Await all coroutines** - Unawaited coroutines are silently discarded and cause memory leaks.

   #### DO:
   ```python
   task = asyncio.create_task(background_work())
   # Keep reference to prevent garbage collection
   asyncio.current_task().add_done_callback(lambda t: tasks.remove(t))
   ```

   #### DO NOT:
   ```python
   asyncio.create_task(background_work())  # Task is immediately dropped
   ```

### Context Variables for Task-Local Storage

Use `contextvars.ContextVar` for request-scoped state that must propagate to child tasks. Never use module-level globals for request context.

#### DO:
```python
from contextvars import ContextVar

tenant_id: ContextVar[str] = ContextVar('tenant_id')
request_id: ContextVar[str] = ContextVar('request_id')

async def handle_update(update: Update):
    tenant_id.set(update.message.chat.id)
    request_id.set(str(uuid.uuid4()))
    # All child tasks see these values
    await process_update(update)
```

#### DO NOT:
```python
# Global state is shared across all requests - DANGEROUS
current_tenant = None

async def handle_update(update: Update):
    global current_tenant
    current_tenant = update.message.chat.id  # Race condition!
```

### Timeout and Cancellation Patterns

1. **Always use `asyncio.wait_for()` for time limits** on external operations.

2. **Handle `asyncio.CancelledError` in finally blocks** - This ensures cleanup runs even if the task is cancelled.

   #### DO:
   ```python
   async def long_operation():
       try:
           result = await some_work()
           return result
       except asyncio.CancelledError:
           # Cleanup code - this propagates normally
           await close_resources()
           raise  # Re-raise to maintain cancellation state
       finally:
           # Alternative: use finally for guaranteed cleanup
           await close_resources()
   ```

   #### DO NOT:
   ```python
   async def long_operation():
       try:
           result = await some_work()
       except asyncio.CancelledError:
           pass  # Consumes the exception - cancellation is lost!
   ```

3. **Cancellation must include a message** - Use `task.cancel(msg)` to explain why.

   #### DO:
   ```python
   task.cancel('Update timeout exceeded')
   ```

4. **Always await cancelled tasks** to see their `CancelledError`.

   #### DO:
   ```python
   try:
       await task
   except asyncio.CancelledError:
       log.info('Task was cancelled', extra={'msg': task.get_name()})
   ```

---

## II. PYTHON-TELEGRAM-BOT V20+ HANDLER RULES

### Application Initialization

1. **Always use `concurrent_updates=True`** if your handlers are async-safe and idempotent. This allows parallel request handling.

   #### DO:
   ```python
   app = ApplicationBuilder() \
       .token(os.getenv('BOT_TOKEN')) \
       .concurrent_updates(True) \
       .build()
   ```

2. **Never use `block=False`** - It bypasses handler group sequencing and is harder to reason about. Use `concurrent_updates` instead.

3. **Initialize all resources in lifespan context manager** - Use `app.add_handlers()` and lifecycle hooks only.

   #### DO:
   ```python
   async def lifespan(app):
       # Startup
       await app.bot.set_my_commands([...])
       logger.info('Bot started')
       yield
       # Shutdown
       logger.info('Bot stopping')
       # Cleanup happens in finally
   
   app = ApplicationBuilder().token(TOKEN).build()
   # Use post_init or lifespan patterns
   ```

### Handler Ordering and Groups

1. **Handler groups determine execution order** - Lower group numbers execute first. Handlers within a group execute sequentially unless `concurrent_updates=True`.

2. **Use groups intentionally**:
   - Group 0: Authentication, rate limiting, authorization
   - Group 1: Command handlers
   - Group 2: Message processors
   - Group 3: Fallback handlers

   #### DO:
   ```python
   # Ensure auth runs first
   app.add_handler(TypeErrorHandler(auth_middleware, group=0))
   # Then business logic
   app.add_handler(CommandHandler('start', start), group=1)
   app.add_handler(MessageHandler(filters.TEXT, echo), group=2)
   ```

3. **Handler stop propagation** - Return `True` or `ConversationHandler.END` to stop processing in that group. Returning `None` continues.

### Forbidden PTB APIs

- ❌ `Updater` (deprecated in v20)
- ❌ `run_async=True` parameter (removed in v20)
- ❌ `JobQueue` with sync callbacks (use async callbacks only)
- ❌ `BaseFilter.update()` methods that use `filter.result` instead of return values

### Error Handling in Handlers

1. **Always define an application-wide error handler** - Unhandled exceptions in handlers crash the bot.

   #### DO:
   ```python
   async def error_handler(update, context):
       logger.exception('Update %s caused error %s', update, context.error)
       sentry_sdk.capture_exception(context.error)
       if update and update.effective_message:
           await context.bot.send_message(
               chat_id=update.effective_user.id,
               text='An error occurred. Please try again later.'
           )
   
   app.add_error_handler(error_handler)
   ```

2. **Never let exceptions propagate from handlers** - Catch and log them.

3. **Use `context.user_data` and `context.chat_data` for session storage** - These are persistent across updates for the same user/chat.

---

## III. DATABASE ACCESS PATTERNS (SQLALCHEMY 2.0 ASYNC)

### Engine and Session Configuration

1. **Always use async engine with connection pooling**:

   #### DO:
   ```python
   from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
   
   engine = create_async_engine(
       DATABASE_URL,
       echo=settings.sql_echo,
       pool_size=5,
       max_overflow=10,
       pool_timeout=30,
       pool_recycle=1800,
       pool_pre_ping=True,
   )
   
   AsyncSessionFactory = async_sessionmaker(
       engine,
       class_=AsyncSession,
       expire_on_commit=False,
   )
   ```

2. **`expire_on_commit=False` is mandatory** - Async ORM relationships become unusable after commit if expiration is enabled.

3. **`pool_recycle=1800`** - Refresh connections every 30 minutes to survive database restarts.

4. **`pool_pre_ping=True`** - Validate connections before use to avoid stale connection errors.

### Query Patterns (SQLAlchemy 2.0 Core)

1. **Always use `select()` instead of legacy query API**:

   #### DO:
   ```python
   from sqlalchemy import select, and_, or_
   
   stmt = select(User).where(
       and_(User.tenant_id == tenant_id, User.is_active == True)
   )
   result = await session.execute(stmt)
   user = result.scalars().first()
   ```

   #### DO NOT:
   ```python
   # Legacy query API - FORBIDDEN
   user = session.query(User).filter_by(tenant_id=tenant_id).first()
   ```

2. **Eager loading with `selectinload()`** - Prevent N+1 queries:

   #### DO:
   ```python
   from sqlalchemy.orm import selectinload
   
   stmt = select(User).options(
       selectinload(User.posts),
       selectinload(User.profile)
   )
   ```

3. **No lazy loading after session close** - All relationships must be loaded before session exits.

### Transaction Boundaries

1. **Use explicit transaction boundaries** - Never rely on implicit SQLAlchemy transactions.

   #### DO:
   ```python
   async def create_user_with_profile(email):
       async with AsyncSessionFactory() as session:
           async with session.begin():
               user = User(email=email)
               session.add(user)
               await session.flush()  # Get the ID without committing
               
               profile = Profile(user_id=user.id)
               session.add(profile)
               # Commit on exit
           return user
   ```

2. **Commit only at end of business transaction** - Avoid multiple commits in a single handler.

3. **Use savepoints for complex operations**:

   #### DO:
   ```python
   async with session.begin_nested():
       # This can be rolled back independently
       user = User(email=email)
       session.add(user)
   ```

### Connection Leak Prevention

1. **Always use `async with` for session lifecycle**:

   #### DO:
   ```python
   async with AsyncSessionFactory() as session:
       # session is automatically closed
   ```

   #### DO NOT:
   ```python
   session = AsyncSessionFactory()
   user = await session.execute(...)
   # session is NEVER closed - connection leak!
   ```

2. **Close engine on shutdown**:

   #### DO:
   ```python
   await engine.dispose()
   ```

### Row-Level Security (Multi-Tenant)

1. **Set tenant context in PostgreSQL session** - Use `SET LOCAL` to enforce at database level:

   #### DO:
   ```python
   async def with_tenant_context(session, tenant_id):
       await session.execute(
           text("SET LOCAL app.current_tenant_id = :tenant_id"),
           {"tenant_id": tenant_id}
       )
   ```

2. **Create RLS policies on all tenant-scoped tables**:

   ```sql
   CREATE POLICY tenant_isolation ON users
   USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
   WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
   ```

3. **Always query with tenant filter in application** - RLS is defense-in-depth, not primary security:

   #### DO:
   ```python
   stmt = select(User).where(
       and_(
           User.id == user_id,
           User.tenant_id == tenant_id  # Always filter
       )
   )
   ```

### Idempotency and Retry Safety

1. **Use `ON CONFLICT DO UPDATE` for insert-or-update operations**:

   #### DO:
   ```python
   from sqlalchemy.dialects.postgresql import insert
   
   stmt = insert(User).values(email=email, tenant_id=tenant_id)
   stmt = stmt.on_conflict_do_update(
       index_elements=['email', 'tenant_id'],
       set_=dict(updated_at=datetime.utcnow())
   )
   await session.execute(stmt)
   ```

2. **Generate idempotency keys for critical operations**:

   #### DO:
   ```python
   idempotency_key = hashlib.sha256(
       f"{user_id}:{operation}:{timestamp}".encode()
   ).hexdigest()
   ```

---

## IV. REDIS ASYNC PATTERNS

### Connection Pool Configuration

1. **Use `BlockingConnectionPool` for production**:

   #### DO:
   ```python
   from redis.asyncio import ConnectionPool, Redis, BlockingConnectionPool
   
   pool = BlockingConnectionPool.from_url(
       REDIS_URL,
       max_connections=20,
       socket_connect_timeout=5,
       socket_keepalive=True,
   )
   redis_client = Redis.from_pool(pool)
   ```

2. **Set appropriate `max_connections`** based on concurrency:
   - Low concurrency (< 100 requests/sec): 10-15
   - Medium (100-1000 req/s): 20-50
   - High (> 1000 req/s): 50-100

3. **Enable socket keepalive** to survive idle connections.

### Cache-Aside Pattern (Graceful Degradation)

1. **Never let Redis failures block operations** - Cache is optional:

   #### DO:
   ```python
   async def get_user_with_cache(user_id):
       try:
           # Try cache first
           cached = await redis_client.get(f"user:{user_id}")
           if cached:
               return json.loads(cached)
       except (ConnectionError, TimeoutError):
           logger.warning('Redis unavailable', extra={'user_id': user_id})
       
       # Fallback to database
       async with AsyncSessionFactory() as session:
           user = await session.get(User, user_id)
       
       # Try to cache (fire-and-forget)
       try:
           await redis_client.setex(
               f"user:{user_id}",
               3600,
               json.dumps(user.to_dict())
           )
       except ConnectionError:
           pass  # Cache failure is not a business failure
       
       return user.to_dict()
   ```

2. **Use `asyncio.wait_for()` with short timeout**:

   #### DO:
   ```python
   try:
       result = await asyncio.wait_for(
           redis_client.get(f"key:{key}"),
           timeout=0.1  # 100ms max
       )
   except asyncio.TimeoutError:
       # Fall through to database
       pass
   ```

### Connection Lifecycle

1. **Reuse single Redis instance** - Do not create new instances per request:

   #### DO:
   ```python
   # Global singleton
   redis_pool = BlockingConnectionPool.from_url(REDIS_URL)
   redis_client = Redis.from_pool(redis_pool)
   
   # In startup handler
   await redis_client.ping()
   
   # In shutdown handler
   await redis_client.aclose()
   await redis_pool.aclose()
   ```

---

## V. RATE LIMITING & TELEGRAM API SAFETY

### Using `AIORateLimiter`

1. **Always configure rate limiter on application startup**:

   #### DO:
   ```python
   from telegram.ext import AIORateLimiter
   
   rate_limiter = AIORateLimiter(
       overall_max_rate=25,  # Token bucket for all requests
       overall_time_period=1,
       group_max_rate=20,    # Per chat rate limit
       group_time_period=60,
   )
   
   app = ApplicationBuilder() \
       .token(TOKEN) \
       .rate_limiter(rate_limiter) \
       .build()
   ```

2. **Telegram Bot API 7.0+ uses token bucket** - `retry_after` header is authoritative:

   #### DO:
   ```python
   try:
       await context.bot.send_message(chat_id, text)
   except telegram.error.TimedOut:
       # Telegram returned 429 Too Many Requests
       # AIORateLimiter handles retry automatically
       pass
   ```

### Handling Rate Limit Responses

1. **Respect `retry_after` header** - Never retry before this delay:

   #### DO:
   ```python
   except telegram.error.RetryAfter as e:
       logger.info('Rate limited', extra={'retry_after': e.retry_after})
       # AIORateLimiter handles this automatically
       await asyncio.sleep(e.retry_after + 0.1)
   ```

2. **Log all rate limit events** for capacity planning:

   #### DO:
   ```python
   logger.info(
       'Rate limit hit',
       extra={
           'method': 'sendMessage',
           'chat_id': chat_id,
           'retry_after': e.retry_after
       }
   )
   ```

---

## VI. STRUCTURED LOGGING (STRUCTLOG)

### Configuration

1. **Always use JSON logging in production**:

   #### DO:
   ```python
   import structlog
   from pythonjsonlogger import jsonlogger
   
   structlog.configure(
       processors=[
           structlog.stdlib.filter_by_level,
           structlog.stdlib.add_logger_name,
           structlog.stdlib.add_log_level,
           structlog.stdlib.PositionalArgumentsFormatter(),
           structlog.processors.TimeStamper(fmt="iso"),
           structlog.processors.StackInfoRenderer(),
           structlog.processors.format_exc_info,
           structlog.processors.UnicodeDecoder(),
           structlog.processors.JSONRenderer()
       ],
       context_class=dict,
       logger_factory=structlog.stdlib.LoggerFactory(),
       cache_logger_on_first_use=True,
   )
   ```

2. **Every log must have context** - Never log bare strings:

   #### DO:
   ```python
   logger = structlog.get_logger()
   
   logger.info(
       'user_created',
       user_id=user.id,
       email=user.email,
       tenant_id=tenant_id
   )
   ```

   #### DO NOT:
   ```python
   logger.info(f'User created: {user.id}')  # Loses structure
   ```

### Context Propagation

1. **Bind request context at handler entry**:

   #### DO:
   ```python
   async def handle_update(update, context):
       structlog.contextvars.clear_contextvars()
       structlog.contextvars.bind_contextvars(
           update_id=update.update_id,
           user_id=update.effective_user.id,
           chat_id=update.effective_chat.id,
           request_id=context.bot_data.get('request_id')
       )
       
       logger.info('Update received')
       # All subsequent logs inherit this context
   ```

2. **Use contextvars to avoid passing logger through call stacks**:

   #### DO:
   ```python
   import structlog
   
   @structlog.contextvars.as_immutable
   async def business_logic():
       # Context is automatically available
       logger = structlog.get_logger()
       logger.info('Processing')  # Has bound user_id, chat_id, etc.
   ```

### Log Levels

- `debug`: Development-only diagnostics (disabled in prod)
- `info`: Normal operations (user created, message sent)
- `warning`: Recoverable errors (rate limited, timeout, retry)
- `error`: Non-fatal failures (handler exception, API error)
- `critical`: Application-level failures (database offline, bot offline)

---

## VII. ERROR HANDLING & OBSERVABILITY WITH SENTRY

### Initialization

1. **Initialize Sentry at startup** with proper environment and release:

   #### DO:
   ```python
   import sentry_sdk
   
   sentry_sdk.init(
       dsn=os.getenv('SENTRY_DSN'),
       environment=os.getenv('ENV', 'development'),
       release=os.getenv('APP_VERSION', 'unknown'),
       traces_sample_rate=0.1 if prod else 1.0,
       profiles_sample_rate=0.01 if prod else 1.0,
   )
   ```

### Exception Handling

1. **Capture exceptions in error handlers** - Do not swallow them:

   #### DO:
   ```python
   async def error_handler(update, context):
       logger.exception('Unhandled exception', exc_info=context.error)
       sentry_sdk.capture_exception(context.error)
   ```

2. **Tag errors with context** for filtering:

   #### DO:
   ```python
   sentry_sdk.get_current_scope().set_context(
       'telegram_update',
       {
           'update_id': update.update_id,
           'user_id': update.effective_user.id,
           'chat_id': update.effective_chat.id,
       }
   )
   ```

### Graceful Degradation

1. **Sentry errors must not crash the bot** - Wrap all Sentry calls:

   #### DO:
   ```python
   try:
       sentry_sdk.capture_exception(e)
   except Exception:
       logger.exception('Sentry failure')
       # Continue without Sentry
   ```

---

## VIII. TESTING STRATEGY (PYTEST-ASYNCIO)

### Test Configuration

1. **Set explicit asyncio mode** in `pytest.ini`:

   #### DO:
   ```ini
   [tool:pytest]
   asyncio_mode = auto
   asyncio_default_fixture_scope = function
   ```

2. **Never mix sync and async tests** - Use separate test files.

### Fixtures

1. **Always scope fixtures appropriately**:

   #### DO:
   ```python
   @pytest.fixture
   async def db_session():
       async with AsyncSessionFactory() as session:
           async with session.begin():
               yield session
           await session.rollback()
   
   @pytest.fixture
   async def app():
       app = ApplicationBuilder().token('TEST_TOKEN').build()
       async with app:
           yield app
   ```

2. **Never return awaitables from fixtures** - Always await:

   #### DO NOT:
   ```python
   @pytest.fixture
   def redis():
       return redis_pool.from_url(REDIS_URL)  # WRONG - async not awaited
   ```

### Mocking Async Code

1. **Use `AsyncMock` from `unittest.mock`**:

   #### DO:
   ```python
   from unittest.mock import AsyncMock, patch
   
   @pytest.mark.asyncio
   async def test_handler():
       with patch('telegram.ext.Application.send_message', new_callable=AsyncMock):
           await handle_update(...)
   ```

### Test Isolation

1. **Always rollback database changes**:

   #### DO:
   ```python
   @pytest.mark.asyncio
   async def test_create_user(db_session):
       user = User(email='test@example.com')
       db_session.add(user)
       await db_session.flush()
       
       assert user.id is not None
       # Automatic rollback after test
   ```

2. **Never mock timestamp functions** - Use `freezegun` for time control:

   #### DO:
   ```python
   from freezegun import freeze_time
   
   @freeze_time('2024-01-15 10:00:00')
   @pytest.mark.asyncio
   async def test_timestamp():
       assert datetime.utcnow() == datetime(2024, 1, 15, 10, 0, 0)
   ```

---

## IX. WEBHOOK DEPLOYMENT PATTERN

### Setup

1. **Use FastAPI or aiohttp for webhook server** - Not Flask or sync frameworks:

   #### DO:
   ```python
   from fastapi import FastAPI, Request
   
   web_app = FastAPI()
   
   @web_app.post('/telegram')
   async def telegram_webhook(request: Request):
       update = Update.de_json(await request.json(), bot)
       await application.process_update(update)
       return {'ok': True}
   
   @web_app.on_event('startup')
   async def startup():
       await application.initialize()
       # Set webhook URL
       await application.bot.set_webhook(
           url=f'{WEBHOOK_URL}/telegram',
           allowed_updates=Update.ALL_TYPES,
           max_connections=100
       )
   
   @web_app.on_event('shutdown')
   async def shutdown():
       await application.stop()
   ```

2. **Always return 200 immediately** - Process updates in background:

   #### DO:
   ```python
   @web_app.post('/telegram')
   async def webhook(request: Request):
       update = Update.de_json(await request.json(), bot)
       # Fire-and-forget, don't await
       asyncio.create_task(application.process_update(update))
       return {'ok': True}  # Return immediately
   ```

### Webhook Health Checks

1. **Provide health check endpoint**:

   #### DO:
   ```python
   @web_app.get('/health')
   async def health():
       try:
           await application.bot.get_me()
           return {'status': 'ok'}
       except Exception as e:
           return {'status': 'error', 'error': str(e)}, 503
   ```

---

## X. GRACEFUL SHUTDOWN

### Signal Handling

1. **Catch SIGTERM and SIGINT for graceful shutdown**:

   #### DO:
   ```python
   import signal
   
   async def main():
       loop = asyncio.get_running_loop()
       
       for sig in (signal.SIGTERM, signal.SIGINT):
           loop.add_signal_handler(
               sig,
               lambda: asyncio.create_task(shutdown())
           )
       
       await application.run_polling()
   
   async def shutdown():
       logger.info('Shutdown signal received')
       await application.stop()
   ```

2. **Cancel all pending tasks**:

   #### DO:
   ```python
   async def shutdown():
       tasks = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
       for task in tasks:
           task.cancel('Application shutdown')
       
       await asyncio.gather(*tasks, return_exceptions=True)
       logger.info('All tasks cancelled')
   ```

3. **Use finally blocks for cleanup**:

   #### DO:
   ```python
   try:
       await application.run_polling()
   finally:
       logger.info('Closing resources')
       await engine.dispose()
       await redis_client.aclose()
   ```

---

## XI. MEMORY MANAGEMENT & LEAK PREVENTION

### Task Lifecycle

1. **Keep task references to prevent premature garbage collection**:

   #### DO:
   ```python
   background_tasks = set()
   
   async def schedule_task(coro):
       task = asyncio.create_task(coro)
       background_tasks.add(task)
       task.add_done_callback(background_tasks.discard)
   ```

   #### DO NOT:
   ```python
   asyncio.create_task(background_work())  # Task is immediately garbage-collected
   ```

2. **Never return task references from functions** - This prevents garbage collection:

   #### DO NOT:
   ```python
   def start_background():
       return asyncio.ensure_future(work())  # Holds reference forever
   ```

3. **Use `asyncio.gather()` with care** - It buffers all results:

   #### DO:
   ```python
   # For streaming: use asyncio.as_completed
   for coro in asyncio.as_completed(tasks):
       result = await coro  # Process immediately, don't buffer
   ```

### Connection Management

1. **Close resources in finally blocks**:

   #### DO:
   ```python
   async def process():
       resource = await acquire_resource()
       try:
           return await use_resource(resource)
       finally:
           await resource.close()  # Always runs
   ```

### Explicit Garbage Collection (Rarely Needed)

1. **Do NOT call `gc.collect()` in hot paths** - It's expensive and usually unnecessary:

   #### DO NOT:
   ```python
   async def handler():
       # ... business logic ...
       gc.collect()  # This pauses everything - FORBIDDEN in handlers
   ```

2. **Only call in shutdown** if debugging:

   #### DO:
   ```python
   async def shutdown():
       await application.stop()
       gc.collect()  # After all async cleanup
   ```

---

## XII. SECURITY BEST PRACTICES

### SQL Injection Prevention

1. **Always use parameterized queries** - Never concatenate user input:

   #### DO:
   ```python
   from sqlalchemy import text, select, and_
   
   # Using ORM
   stmt = select(User).where(User.email == email)
   
   # Using Core with parameters
   stmt = select(users_table).where(users_table.c.email == bindparam('email'))
   result = await session.execute(stmt, {'email': email})
   ```

   #### DO NOT:
   ```python
   # String concatenation - SQL INJECTION VULNERABILITY
   stmt = f"SELECT * FROM users WHERE email = '{email}'"
   ```

2. **Use `text()` sparingly and only with bound parameters**:

   #### DO:
   ```python
   stmt = text("SELECT * FROM users WHERE email = :email")
   result = await session.execute(stmt, {'email': email})
   ```

### Input Validation

1. **Validate all user input** - Use Pydantic models:

   #### DO:
   ```python
   from pydantic import BaseModel, EmailStr, constr
   
   class UserCreate(BaseModel):
       email: EmailStr
       username: constr(min_length=3, max_length=50)
       password: constr(min_length=12)
   ```

2. **Reject oversized messages** - Telegram limits to 4096 chars:

   #### DO:
   ```python
   if len(update.message.text) > 4096:
       await update.message.reply_text('Message too long')
       return
   ```

### Authentication & Authorization

1. **Always verify user permissions** before operations:

   #### DO:
   ```python
   async def delete_user(user_id, requester_id):
       if requester_id != user_id and not is_admin(requester_id):
           raise PermissionError('Cannot delete other users')
   ```

2. **Use environment variables for secrets**:

   #### DO:
   ```python
   BOT_TOKEN = os.getenv('BOT_TOKEN')
   if not BOT_TOKEN:
       raise ValueError('BOT_TOKEN not set')
   ```

   #### DO NOT:
   ```python
   BOT_TOKEN = '123456789:ABC...'  # Hardcoded secrets
   ```

---

## XIII. ALEMBIC MIGRATION BEST PRACTICES

### Setup

1. **Use async template for Alembic**:

   ```bash
   alembic init -t async migrations
   ```

2. **Configure async engine in `env.py`**:

   #### DO:
   ```python
   from sqlalchemy.ext.asyncio import create_async_engine
   
   async def run_async_migrations():
       engine = create_async_engine(DATABASE_URL)
       async with engine.begin() as connection:
           await connection.run_sync(do_run_migrations)
   ```

### Migration Patterns

1. **Always use `batch_op` for SQLite**:

   #### DO:
   ```python
   def upgrade():
       with op.batch_alter_table('users') as batch_op:
           batch_op.add_column(sa.Column('new_col', sa.String()))
   ```

2. **Avoid complex transactions in migrations** - Keep migrations simple:

   #### DO NOT:
   ```python
   def upgrade():
       # Loading data in migrations is risky
       conn = op.get_bind()
       # This doesn't work with async!
       conn.execute(...)
   ```

3. **Use discrete migration files** for related changes:

   #### DO:
   ```
   migrations/
   ├── 001_create_users_table.py
   ├── 002_add_tenant_field.py
   └── 003_create_rls_policies.py
   ```

---

## XIV. FORBIDDEN PATTERNS & ANTI-PATTERNS

### 🚫 Event Loop Violations

- ❌ Creating new event loops inside async functions
- ❌ Using `loop.run_until_complete()` inside async code
- ❌ Calling `asyncio.run()` nested (inside another `asyncio.run()`)
- ❌ Using `asyncio.get_event_loop()` and then `.run_until_complete()` (use `asyncio.run()`)

### 🚫 Blocking Operations in Handlers

- ❌ Synchronous file I/O: `open()`, `f.read()`, `f.write()`
- ❌ Synchronous network calls: `requests.get()`, `socket.connect()`
- ❌ CPU-intensive work: JSON parsing huge files, cryptography operations
- ❌ Database queries with sync ORM: `session.query().first()`
- ❌ Sleep: `time.sleep()` (use `await asyncio.sleep()`)

**Exception:** These are allowed only in `run_in_executor()` with explicit justification.

### 🚫 Memory Leaks

- ❌ Unawaited coroutines: `asyncio.create_task(coro)` without storing reference
- ❌ Returning task references: `return asyncio.create_task(...)`
- ❌ Using `global` for request state (use `contextvars.ContextVar`)
- ❌ Keeping large objects in closures of long-lived tasks
- ❌ Circular references in exception handlers

### 🚫 Connection/Resource Leaks

- ❌ Creating database sessions without `async with`
- ❌ Opening Redis connections without `aclose()`
- ❌ Not closing HTTP client sessions
- ❌ Leaving file handles open

### 🚫 Handler Mistakes

- ❌ Modifying `update` object during concurrent handler processing
- ❌ Using mutable default arguments in handlers
- ❌ Storing per-request state in handler function scope (use context vars)
- ❌ Raising exceptions instead of returning (use error_handler)

### 🚫 SQL Mistakes

- ❌ Using legacy `session.query()` API
- ❌ Lazy-loading relationships after session closes
- ❌ Committing inside a transaction context manager
- ❌ Using `expire_on_commit=True` with async sessions

### 🚫 Logging Mistakes

- ❌ Using `print()` statements (use structlog)
- ❌ Logging sensitive data (passwords, tokens, PII)
- ❌ Bare string logs without context: `logger.info(f'Value: {x}')`
- ❌ Logging without exception context: `logger.error('Error')` (use `logger.exception()`)

### 🚫 Testing Mistakes

- ❌ Sharing fixtures across test functions (set scope correctly)
- ❌ Mocking `datetime.utcnow()` directly (use `freezegun`)
- ❌ Hardcoding timeouts in tests (use fixtures)
- ❌ Testing side effects instead of return values

---

## XV. CORRECT VS. WRONG PATTERNS BY SCENARIO

### Scenario 1: Processing a User Update

#### ✅ CORRECT:
```python
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    async with AsyncSessionFactory() as session:
        async with session.begin():
            user = await session.get(User, update.effective_user.id)
            if not user:
                user = User(id=update.effective_user.id, first_name=update.effective_user.first_name)
                session.add(user)
                await session.flush()
            
            message = Message(
                user_id=user.id,
                text=update.message.text
            )
            session.add(message)
    
    await update.message.reply_text('Message saved')
```

#### ❌ WRONG:
```python
def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):  # Sync function!
    session = AsyncSessionFactory()
    user = session.query(User).filter_by(id=update.effective_user.id).first()  # Blocks!
    if not user:
        user = User(id=update.effective_user.id)
        session.add(user)
    session.commit()  # Implicit transaction
    # session never closed - CONNECTION LEAK
    
    asyncio.run(update.message.reply_text('Message saved'))  # Nested event loop!
```

### Scenario 2: Rate-Limited API Call with Retry

#### ✅ CORRECT:
```python
async def call_external_api(url, max_retries=3):
    for attempt in range(max_retries):
        try:
            return await asyncio.wait_for(
                http_client.get(url),
                timeout=5.0
            )
        except asyncio.TimeoutError:
            logger.warning('API timeout', extra={'attempt': attempt + 1})
            await asyncio.sleep(2 ** attempt)  # Exponential backoff
        except Exception as e:
            logger.exception('API call failed')
            raise
    
    raise RuntimeError('Max retries exceeded')
```

#### ❌ WRONG:
```python
def call_external_api(url):
    response = requests.get(url, timeout=5)  # Blocks event loop!
    return response.json()
```

### Scenario 3: Background Task Scheduling

#### ✅ CORRECT:
```python
background_tasks = set()

async def schedule_notification(user_id, delay_seconds):
    async def send_notification():
        await asyncio.sleep(delay_seconds)
        await context.bot.send_message(user_id, 'Your notification')
    
    task = asyncio.create_task(send_notification())
    background_tasks.add(task)
    task.add_done_callback(background_tasks.discard)
```

#### ❌ WRONG:
```python
async def schedule_notification(user_id, delay_seconds):
    asyncio.create_task(
        asyncio.sleep(delay_seconds)
    )  # Task is immediately garbage-collected!
```

### Scenario 4: Multi-Tenant Isolation

#### ✅ CORRECT:
```python
async def get_tenant_users(tenant_id):
    async with AsyncSessionFactory() as session:
        stmt = select(User).where(User.tenant_id == tenant_id)
        result = await session.execute(stmt)
        return result.scalars().all()
```

#### ❌ WRONG:
```python
def get_tenant_users(tenant_id):
    users = session.query(User).filter_by(tenant_id=tenant_id).all()  # Sync query
    return users  # What if user is from different tenant? No RLS!
```

### Scenario 5: Error Handling in Handler

#### ✅ CORRECT:
```python
async def risky_handler(update: Update, context):
    try:
        result = await some_operation()
        await update.message.reply_text(f'Success: {result}')
    except ValueError as e:
        logger.warning('Invalid input', extra={'error': str(e)})
        await update.message.reply_text('Invalid input')
    except Exception as e:
        logger.exception('Unexpected error', exc_info=e)
        sentry_sdk.capture_exception(e)
        await update.message.reply_text('An error occurred')
```

#### ❌ WRONG:
```python
async def risky_handler(update: Update, context):
    result = await some_operation()  # Unhandled exception crashes bot!
    await update.message.reply_text(f'Success: {result}')
```

---

## XVI. CONFIGURATION & ENVIRONMENT MANAGEMENT

### Settings

1. **Use environment variables for all config**:

   #### DO:
   ```python
   import os
   from pydantic_settings import BaseSettings
   
   class Settings(BaseSettings):
       bot_token: str
       database_url: str
       redis_url: str
       environment: str = 'development'
       log_level: str = 'INFO'
       sentry_dsn: str = ''
       
       class Config:
           env_file = '.env'
   
   settings = Settings()
   ```

2. **Validate required config at startup**:

   #### DO:
   ```python
   async def startup():
       if not settings.bot_token:
           raise ValueError('BOT_TOKEN is required')
       if not settings.database_url:
           raise ValueError('DATABASE_URL is required')
   ```

---

## XVII. PERFORMANCE TARGETS & OBSERVABILITY

### Latency SLOs

- Message handler response: < 100ms (p95)
- Database query: < 50ms (p95)
- Redis cache hit: < 10ms (p95)
- External API call: < 5s (p95, with timeout)

### Throughput Targets

- Single bot instance: 100+ updates/second (with concurrent_updates=True)
- Database connections: 5-20 pooled (tune based on load)
- Redis connections: 10-50 pooled

### Metrics to Track

1. **Application metrics**:
   - `bot.handler.duration_ms` - Handler execution time
   - `bot.handler.errors_total` - Errors by handler type
   - `bot.message_sent` - Outbound message count
   - `bot.message_received` - Inbound message count

2. **Database metrics**:
   - `db.query.duration_ms` - Query execution time
   - `db.pool.connections_active` - Active connections
   - `db.pool.connections_available` - Available connections
   - `db.transaction.duration_ms` - Transaction duration

3. **External service metrics**:
   - `api.call.duration_ms` - External API latency
   - `api.call.errors_total` - API errors
   - `redis.command.duration_ms` - Redis command latency
   - `redis.connection.errors_total` - Redis connection errors

---

## XVIII. DEPLOYMENT CHECKLIST

- [ ] All handlers are async (`async def`)
- [ ] No `time.sleep()`, use `await asyncio.sleep()`
- [ ] No sync database queries, use async ORM
- [ ] Database pool configured with `pool_pre_ping=True`
- [ ] All resources closed in shutdown handler
- [ ] Error handler registered on application
- [ ] Rate limiter configured
- [ ] Sentry DSN set and verified
- [ ] Structured logging configured for JSON output
- [ ] Health check endpoint responds 200
- [ ] Signal handlers for SIGTERM/SIGINT
- [ ] All migrations applied to production
- [ ] Tests pass with `pytest -v`
- [ ] No hardcoded secrets in code
- [ ] Environment variables documented in `.env.example`
- [ ] Multi-tenant isolation enforced with RLS policies
- [ ] Connection pool sizes tuned for expected load
- [ ] Graceful shutdown tested (kill -TERM process)

---

## REFERENCES

**Official Sources:**
- Python 3.13 Documentation: https://docs.python.org/3.13/
- asyncio: https://docs.python.org/3.13/library/asyncio.html
- SQLAlchemy 2.0 Documentation: https://docs.sqlalchemy.org/
- python-telegram-bot v20+ Documentation: https://python-telegram-bot.readthedocs.io/
- PostgreSQL Row Level Security: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- structlog: https://www.structlog.org/
- redis-py asyncio: https://github.com/redis/redis-py

**No third-party opinions or deprecated patterns are included in this document.**
