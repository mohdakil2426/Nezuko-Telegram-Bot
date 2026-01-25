# Python 3.13+ Telegram Bot Coding Rules
## The Definitive Source of Truth for Nezuko Development

### Version Information
- **Status**: **AUTHORITATIVE**
- **Last Updated**: January 2026
- **Architecture**: Async-first, Multi-tenant (RLS), Service-oriented
- **Framework**: python-telegram-bot v22.6+ (Async-Only)
- **Database**: SQLAlchemy 2.0.46+ & PostgreSQL 18+ (Async)

---

## Table of Contents

- [Python 3.13+ Telegram Bot Coding Rules](#python-313-telegram-bot-coding-rules)
  - [The Definitive Source of Truth for Nezuko Development](#the-definitive-source-of-truth-for-nezuko-development)
    - [Version Information](#version-information)
  - [Table of Contents](#table-of-contents)
  - [I. PYTHON 3.13+ FUNDAMENTALS](#i-python-313-fundamentals)
    - [1.1 Language Features \& Breaking Changes](#11-language-features--breaking-changes)
    - [1.2 Type Hints \& Type Checking (Pyright Strict Mode)](#12-type-hints--type-checking-pyright-strict-mode)
  - [II. ASYNCIO \& TASK LIFECYCLE (Python 3.13+)](#ii-asyncio--task-lifecycle-python-313)
    - [2.1 Entry Point \& Event Loop Management](#21-entry-point--event-loop-management)
    - [2.2 Task Groups \& Structured Concurrency](#22-task-groups--structured-concurrency)
    - [2.3 Cancellation \& Resource Cleanup](#23-cancellation--resource-cleanup)
    - [2.4 Debugging \& Observability for Async Code](#24-debugging--observability-for-async-code)
  - [III. PYTHON-TELEGRAM-BOT V22.6 HANDLER ARCHITECTURE](#iii-python-telegram-bot-v226-handler-architecture)
    - [3.1 Handler Lifecycle \& Registration](#31-handler-lifecycle--registration)
    - [3.2 Handler Groups, Ordering \& Blocking](#32-handler-groups-ordering--blocking)
    - [3.3 Error Handling \& Application-Level Errors](#33-error-handling--application-level-errors)
  - [IV. DATABASE: SQLALCHEMY 2.0 ASYNC PATTERNS](#iv-database-sqlalchemy-20-async-patterns)
    - [4.1 Engine \& Session Configuration](#41-engine--session-configuration)
    - [4.2 Transaction Management \& Session Lifecycle](#42-transaction-management--session-lifecycle)
    - [4.3 Querying \& ORM Patterns](#43-querying--orm-patterns)
    - [4.4 Connection Pooling \& Multi-Tenancy with Row-Level Security](#44-connection-pooling--multi-tenancy-with-row-level-security)
  - [V. TELEGRAM API RATE LIMITING](#v-telegram-api-rate-limiting)
    - [5.1 Official Limits \& Retry Strategy](#51-official-limits--retry-strategy)
    - [5.2 Webhook vs Polling for Telegram](#52-webhook-vs-polling-for-telegram)
  - [VI. STRUCTURED LOGGING \& OBSERVABILITY](#vi-structured-logging--observability)
    - [6.1 Structlog Configuration \& Context Binding](#61-structlog-configuration--context-binding)
    - [6.2 Sentry Integration](#62-sentry-integration)
  - [VII. MULTI-TENANCY \& SECURITY](#vii-multi-tenancy--security)
    - [7.1 Tenant Identification \& Isolation](#71-tenant-identification--isolation)
    - [7.2 Secrets Management](#72-secrets-management)
  - [VIII. TESTING \& QUALITY ASSURANCE](#viii-testing--quality-assurance)
    - [8.1 Async Testing with pytest-asyncio](#81-async-testing-with-pytest-asyncio)
    - [8.2 Type Checking \& Linting](#82-type-checking--linting)
  - [IX. PERFORMANCE \& SCALABILITY](#ix-performance--scalability)
    - [9.1 Preventing Memory Leaks in Async Code](#91-preventing-memory-leaks-in-async-code)
    - [9.2 Connection Pool Tuning](#92-connection-pool-tuning)
  - [X. ADVANCED WEBHOOK PATERNS (FastAPI Integration)](#x-advanced-webhook-paterns-fastapi-integration)
    - [10.1 FastAPI Webhook Server](#101-fastapi-webhook-server)
    - [10.2 Health Checks](#102-health-checks)
  - [XI. MEMORY MANAGEMENT DEEP DIVE](#xi-memory-management-deep-dive)
    - [11.1 Task Holding to Prevent GC](#111-task-holding-to-prevent-gc)
    - [11.2 Explicit Cleanup](#112-explicit-cleanup)
  - [XII. ALEMBIC MIGRATION BEST PRACTICES](#xii-alembic-migration-best-practices)
    - [12.1 Async Template Setup](#121-async-template-setup)
    - [12.2 Sync/Async Methods](#122-syncasync-methods)
  - [XIII. DEPLOYMENT CHECKLIST](#xiii-deployment-checklist)
    - [Pre-Flight](#pre-flight)
    - [Infrastructure](#infrastructure)
    - [Monitoring](#monitoring)
  - [XIV. CORRECT VS. WRONG SCENARIOS](#xiv-correct-vs-wrong-scenarios)
    - [Scenario 1: Processing a User Update](#scenario-1-processing-a-user-update)
    - [Scenario 2: Rate-Limited API Call with Retry](#scenario-2-rate-limited-api-call-with-retry)
  - [XV. REFERENCES \& OFFICIAL DOCUMENTATION](#xv-references--official-documentation)

---

## I. PYTHON 3.13+ FUNDAMENTALS

### 1.1 Language Features & Breaking Changes

**MUST ENFORCE**
- Use Python 3.13+ as baseline; leverage type parameters with defaults (`TypeVar("T", default=str)`)
- Adopt `ReadOnly` and `TypeIs` from `typing` for strict type narrowing
- Understand that `locals()` in optimized scopes (functions, generators, comprehensions) now returns **independent snapshots**, not mutable dicts
- Know that 19 "dead battery" modules are **permanently removed**: `aifc, audioop, cgi, cgitb, chunk, crypt, imghdr, mailcap, msilib, nis, nntplib, ossaudiodev, pipes, sndhdr, spwd, sunau, telnetlib, uu, xdrlib`. **No fallback to PyPI versions; explicitly install replacements.**
- `f_locals()` now returns a write-through proxy (not a mutable dict) in optimized scopes

**DO**
- Use colorized tracebacks (default in 3.13) for better error visibility; document `PYTHON_COLORS=0` for automation
- Adopt `asyncio.timeout()` (3.11+) instead of manual timeout wrappers
- Use `TaskGroup` (3.11+) for structured concurrency; it preserves cancellation counts correctly as of 3.13
- Use `@deprecated` decorator from `typing` to mark deprecated functions (enforced at runtime + type-check time)

**DO NOT**
- Do NOT hardcode dependencies on removed stdlib modules; audit your imports
- Do NOT use `locals()` for mutable state in optimized scopes (use function parameters or class attributes)
- Do NOT rely on `locals()` returning a mutable dict after calling code-execution functions (`exec`, `eval`)

---

### 1.2 Type Hints & Type Checking (Pyright Strict Mode)

**MUST ENFORCE** 
All functions must have full type annotations. Run with `Pyright --strict`.

- **Function signatures**: `async def handler(update: Update, context: CallbackContext) -> None:`
- **Return type**: Always explicit, including `None` (not omitted)
- **Parameters**: No `Any` without justification (document with `# type: ignore[arg-type]` if unavoidable)
- **Optional types**: Use `Optional[T]` or `T | None` (3.10+); never bare `T`
- **Union types**: Use `Union[A, B]` or `A | B`; avoid bare strings or type inference
- **Callback types**: `Callable[[Update, CallbackContext], Coroutine[Any, Any, None]]` for async handlers

**DO**
```python
from typing import Optional, Callable, Coroutine, Any
from telegram import Update
from telegram.ext import CallbackContext

async def my_handler(update: Update, context: CallbackContext) -> None:
    """Type-annotated async handler."""
    user_id: int = update.effective_user.id if update.effective_user else 0
    message: Optional[str] = context.user_data.get("memo")
    
async def delayed_job(context: CallbackContext) -> None:
    """Job callback with explicit None return."""
    pass
```

**DO NOT**
```python
# ❌ Missing return type
async def my_handler(update, context):
    pass

# ❌ Bare Optional without type arg
callback: Optional = None

# ❌ Untyped callback
callback = lambda x: x

# ❌ Any as catch-all
result: Any = await some_function()
```

---

## II. ASYNCIO & TASK LIFECYCLE (Python 3.13+)

### 2.1 Entry Point & Event Loop Management

**MUST**
- Use `asyncio.run(main())` as the sole entry point (sets up loop, runs, cleans up)
- Call `sentry_sdk.init()` **inside** the first `async` function (before any await)
- Enable debug mode for development: `PYTHONASYNCDEBUG=1` or `asyncio.run(main(), debug=True)`

**DO**
```python
import asyncio
import sentry_sdk

async def main() -> None:
    """Entry point: initialize Sentry, start bot."""
    sentry_sdk.init(
        dsn=os.environ["SENTRY_DSN"],
        integrations=[AsyncioIntegration()],
        traces_sample_rate=0.1,
    )
    
    app = Application.builder().token(os.environ["BOT_TOKEN"]).build()
    async with app:
        await app.start()
        await asyncio.sleep(1)  # Keep running
        await app.stop()

if __name__ == "__main__":
    asyncio.run(main())
```

**DO NOT**
```python
# ❌ Manual loop creation (deprecated)
loop = asyncio.get_event_loop()
loop.run_until_complete(main())

# ❌ Sentry init at module level
sentry_sdk.init(...)  # Wrong: event loop not running

# ❌ Multiple asyncio.run() calls
asyncio.run(setup())
asyncio.run(main())  # Error: new event loop created
```

---

### 2.2 Task Groups & Structured Concurrency

**MUST**
- Use `asyncio.TaskGroup` (3.11+) for concurrent operations; it enforces cancellation safety and exception grouping
- Never use scatter-gather (`asyncio.create_task()` + `asyncio.gather()`) for unbounded task creation; it can exhaust memory

**DO**
```python
async def handle_multiple_users(user_ids: list[int]) -> None:
    """Process multiple users concurrently with TaskGroup."""
    async with asyncio.TaskGroup() as tg:
        for user_id in user_ids:
            tg.create_task(process_user(user_id))
    # All tasks complete; exceptions combined in ExceptionGroup if any

async def controlled_batch_processing(items: list[Any], batch_size: int = 10) -> list[str]:
    """Process items in controlled batches using asyncio.wait()."""
    results = []
    pending = {asyncio.create_task(process(item)): item for item in items[:batch_size]}
    
    while pending or items:
        done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            results.append(task.result())
        
        if items:
            pending.add(asyncio.create_task(process(items.pop(0))))
    
    return results
```

**DO NOT**
```python
# ❌ Unbounded task creation (memory leak)
tasks = [asyncio.create_task(process(item)) for item in million_items]
results = await asyncio.gather(*tasks)  # All in memory at once

# ❌ Ignoring exceptions in TaskGroup
try:
    async with asyncio.TaskGroup() as tg:
        tg.create_task(failing_task())
except ExceptionGroup:
    pass  # OK, but log each exception

# ❌ Manual task tracking instead of TaskGroup
tasks = []
for item in items:
    task = asyncio.create_task(process(item))
    tasks.append(task)
```

---

### 2.3 Cancellation & Resource Cleanup

**MUST**
- Use `async with` context managers for resource cleanup (connections, files, semaphores)
- Handle `asyncio.CancelledError` explicitly if cleanup is required; re-raise after cleanup
- Use `asyncio.timeout()` (3.11+) for operation-level deadlines, NOT task-level `timeout` parameters

**DO**
```python
async def bounded_operation() -> str:
    """Protect against long operations."""
    async with asyncio.timeout(5):  # 5-second timeout
        result = await external_api_call()
    return result

async def safe_resource_usage(session_factory: Callable) -> None:
    """Acquire, use, clean up resources safely."""
    async with session_factory() as session:
        try:
            async with session.begin():
                await session.execute(select(User))
        except asyncio.CancelledError:
            await session.rollback()  # Explicit cleanup
            raise

async def semaphore_protected_calls(sem: asyncio.Semaphore, urls: list[str]) -> None:
    """Rate-limit concurrent operations."""
    async def fetch(url: str) -> str:
        async with sem:
            return await http_client.get(url)
    
    async with asyncio.TaskGroup() as tg:
        for url in urls:
            tg.create_task(fetch(url))
```

**DO NOT**
```python
# ❌ Ignoring CancelledError
async def unsafe() -> None:
    try:
        await something()
    except asyncio.CancelledError:
        pass  # Swallowed; task cleanup skipped

# ❌ timeout parameter in handler signature
async def handler(update: Update, context: CallbackContext, timeout: int = 5) -> None:
    # DON'T: Telegram doesn't pass timeout
    pass

# ❌ Missing context manager
session = session_factory()
await session.execute(query)
# Missing: await session.close()
```

---

### 2.4 Debugging & Observability for Async Code

**MUST**
- Enable `PYTHONASYNCDEBUG=1` in development; logs slow callbacks (>100ms by default, tunable via `loop.slow_callback_duration`)
- Use `structlog.contextvars` to bind request ID, tenant ID, user ID to all logs
- Use `asyncio.current_task()` and `asyncio.all_tasks()` for debugging task leaks

**DO**
```python
import logging
import structlog

# Setup
logging.basicConfig(level=logging.DEBUG)
logger = structlog.get_logger()

# In handler
async def handler(update: Update, context: CallbackContext) -> None:
    user_id = update.effective_user.id if update.effective_user else None
    request_id = context.user_data.get("request_id")
    
    structlog.contextvars.bind_contextvars(
        user_id=user_id,
        request_id=request_id,
        task=asyncio.current_task().get_name(),
    )
    
    await logger.ainfo("handler_start", user_id=user_id)
    # Task is automatically included in logs via contextvars
```

**DO NOT**
```python
# ❌ Logging without context
print("Processing update for user", user_id)  # Lost on concurrent calls

# ❌ No task tracking
asyncio.create_task(background_job())  # No reference → may be GC'd
```

---

## III. PYTHON-TELEGRAM-BOT V22.6 HANDLER ARCHITECTURE

### 3.1 Handler Lifecycle & Registration

**MUST**
- All handler callbacks are `async def`; no sync fallbacks (v22.6 is async-only)
- Return value from handler determines if subsequent handlers are called
- Return `ConversationHandler.END` to exit conversation state machine
- Return numeric state (int) to move to new conversation state
- Return `True` or nothing to continue to next handler; return `True` to **block** subsequent handlers (only if `block=True`)

**DO**
```python
from telegram import Update
from telegram.ext import (
    Application, CommandHandler, MessageHandler, 
    ConversationHandler, CallbackContext, filters
)

async def start(update: Update, context: CallbackContext) -> int:
    """Start conversation."""
    await update.message.reply_text("Hello!")
    return 1  # Move to state 1

async def handle_state_1(update: Update, context: CallbackContext) -> int:
    """Handle state 1."""
    await update.message.reply_text("You're in state 1")
    return 2  # Transition to state 2

async def cancel(update: Update, context: CallbackContext) -> int:
    """Cancel conversation."""
    await update.message.reply_text("Cancelled")
    return ConversationHandler.END

def build_app() -> Application:
    app = Application.builder().token(TOKEN).build()
    
    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            1: [MessageHandler(filters.TEXT, handle_state_1)],
            2: [MessageHandler(filters.TEXT, handle_state_1)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )
    
    app.add_handler(conv_handler)
    return app
```

**DO NOT**
```python
# ❌ Sync handler (not supported)
def start(update: Update, context: CallbackContext) -> None:
    update.message.reply_text("Hello")  # Blocking, blocks event loop

# ❌ Returning non-state value
async def handler(update: Update, context: CallbackContext) -> str:
    return "done"  # Wrong: should return int or ConversationHandler.END

# ❌ Missing async/await
async def handler(update: Update, context: CallbackContext) -> None:
    context.bot.send_message(chat_id=update.effective_chat.id, text="Hi")
    # Missing: await; will fail
```

---

### 3.2 Handler Groups, Ordering & Blocking

**MUST**
- Handlers are organized into **groups** (default 0); within a group, only 0 or 1 handler processes each update
- Handlers in different groups all have a chance to process the same update
- `block=True` (default): handler callback is awaited before next handler in group; `block=False`: callback is scheduled as background task

**DO**
```python
app = Application.builder().token(TOKEN).build()

# Group 0: command handlers (highest priority, blocking)
app.add_handler(CommandHandler("start", start), group=0)

# Group 1: conversation handlers (blocking)
conv_handler = ConversationHandler(...)
app.add_handler(conv_handler, group=1)

# Group 2: message handlers (blocking, only if previous groups didn't match)
app.add_handler(MessageHandler(filters.TEXT, echo), group=2)

# Fallback handlers in higher group (last resort)
app.add_handler(MessageHandler(filters.ALL, fallback), group=999)
```

**DO NOT**
```python
# ❌ Duplicate handlers in same group (only first matches)
app.add_handler(MessageHandler(filters.TEXT, handler1), group=0)
app.add_handler(MessageHandler(filters.TEXT, handler2), group=0)  # Never called

# ❌ Assuming both handlers in same group run
# Only one handler per group processes the update
```

---

### 3.3 Error Handling & Application-Level Errors

**MUST**
- Register error handler via `app.add_error_handler()`
- Error handler signature: `async def error_handler(update: Optional[Update], context: CallbackContext) -> None:`
- `context.error` contains the exception; `context.error.__traceback__` available for inspection
- Log all errors via structured logging (structlog); send critical errors to Sentry
- Raise `telegram.error.DispatcherHandlerStop` to prevent other error handlers from running

**DO**
```python
import structlog
from telegram.error import DispatcherHandlerStop

logger = structlog.get_logger()

async def error_handler(update: Optional[Update], context: CallbackContext) -> None:
    """Log errors and notify user."""
    error = context.error
    user_id = update.effective_user.id if update and update.effective_user else None
    
    await logger.aerror(
        "handler_error",
        user_id=user_id,
        error=str(error),
        error_type=type(error).__name__,
        exc_info=True,
    )
    
    # Notify user
    if update and update.effective_message:
        try:
            await update.effective_message.reply_text(
                "An error occurred. Please try again later."
            )
        except Exception as e:
            await logger.aerror("error_notification_failed", error=str(e))
    
    # Send to Sentry
    sentry_sdk.capture_exception(error)

app.add_error_handler(error_handler)
```

**DO NOT**
```python
# ❌ Silently ignoring errors
async def bad_error_handler(update: Optional[Update], context: CallbackContext) -> None:
    pass  # Lost error; no logging

# ❌ Blocking I/O in error handler
async def bad_error_handler(update: Optional[Update], context: CallbackContext) -> None:
    requests.post("http://logging.example.com", json={...})  # Blocking!
```

---

## IV. DATABASE: SQLALCHEMY 2.0 ASYNC PATTERNS

### 4.1 Engine & Session Configuration

**MUST**
- Use `create_async_engine()` with asyncpg (PostgreSQL) or aiosqlite (SQLite)
- Set `pool_pre_ping=True` to detect stale connections; `pool_recycle=3600` to recycle old connections
- Use `expire_on_commit=False` to keep ORM objects alive after commit
- Never share a single `AsyncSession` across multiple concurrent tasks; always create new session per task

**DO**
```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL logging in dev
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_nullpool=False,  # Use connection pool in production
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

async def get_session() -> AsyncSession:
    """Dependency: yields fresh session per request."""
    async with async_session_factory() as session:
        yield session
```

**DO NOT**
```python
# ❌ Sync engine
engine = create_engine("postgresql://...")  # Blocking

# ❌ Shared session across tasks
session = async_session_factory()
await task1_using_session(session)
await task2_using_session(session)  # Concurrent access error

# ❌ Missing pool configuration
engine = create_async_engine(DATABASE_URL)  # Uses defaults; may leak connections
```

---

### 4.2 Transaction Management & Session Lifecycle

**MUST**
- Use `async with session.begin():` for automatic commit on success, rollback on exception
- Explicitly call `await session.commit()` only if NOT using `.begin()` context manager
- Always close session (automatic via `async with session_factory()`)
- For multi-tenant: set `app.current_tenant_id` at session start via SQLAlchemy event listener

**DO**
```python
async def create_user(name: str, tenant_id: int) -> User:
    """Create user within a transaction."""
    async with async_session_factory() as session:
        async with session.begin():
            # Set tenant ID for RLS enforcement
            await session.execute(
                text("SELECT set_config('app.current_tenant_id', :tenant_id, false)"),
                {"tenant_id": str(tenant_id)}
            )
            
            user = User(name=name, tenant_id=tenant_id)
            session.add(user)
            # Auto-commit on exit, auto-rollback on exception
        
        return user  # Object detached but data persisted (expire_on_commit=False)

async def batch_update(user_ids: list[int], new_status: str) -> None:
    """Batch update with explicit error handling."""
    async with async_session_factory() as session:
        try:
            async with session.begin():
                stmt = update(User).where(User.id.in_(user_ids)).values(status=new_status)
                await session.execute(stmt)
        except IntegrityError as e:
            await logger.aerror("batch_update_failed", error=str(e))
            raise
```

**DO NOT**
```python
# ❌ Nested transactions without savepoints
async with session.begin():
    ...
    async with session.begin():  # Error: can't nest without SAVEPOINT
        ...

# ❌ Accessing session after context exit
async with session_factory() as session:
    user = User(name="Alice")
    session.add(user)

# Session closed; user is detached
user.name = "Bob"  # This won't persist

# ❌ Manual commit with .begin()
async with session.begin():
    session.add(user)
    await session.commit()  # Double-commit error
```

---

### 4.3 Querying & ORM Patterns

**MUST**
- Use `select()` from sqlalchemy (SQLAlchemy 2.0 style), NOT legacy Query API
- Always `await session.execute()` for async queries
- Use `scalars()` to extract single column or model instances

**DO**
```python
from sqlalchemy import select, update, delete

async def get_user_by_id(user_id: int) -> Optional[User]:
    """Fetch single user."""
    async with async_session_factory() as session:
        stmt = select(User).where(User.id == user_id)
        result = await session.execute(stmt)
        return result.scalars().first()

async def list_users_by_tenant(tenant_id: int, limit: int = 100) -> list[User]:
    """Fetch multiple users."""
    async with async_session_factory() as session:
        stmt = select(User).where(User.tenant_id == tenant_id).limit(limit)
        result = await session.execute(stmt)
        return result.scalars().all()

async def update_user_status(user_id: int, status: str) -> None:
    """Update user."""
    async with async_session_factory() as session:
        async with session.begin():
            stmt = update(User).where(User.id == user_id).values(status=status)
            await session.execute(stmt)
```

**DO NOT**
```python
# ❌ Legacy Query API (removed in SQLAlchemy 2.0)
user = await session.query(User).filter(User.id == 1).first()

# ❌ Forgot await
result = session.execute(stmt)  # Returns coroutine, not result

# ❌ Forgot scalars() for single column
result = await session.execute(select(User.name))
names = result.all()  # Returns [(name,)]; use result.scalars().all()
```

---

### 4.4 Connection Pooling & Multi-Tenancy with Row-Level Security

**MUST**
- Use connection pooling (default `AsyncAdaptedQueuePool`)
- For multi-tenant (shared schema), enforce tenant isolation via PostgreSQL Row-Level Security (RLS)
- Set tenant ID at session start via SQLAlchemy event listener
- Create separate database roles per tenant OR use RLS + pool model

**DO**
```python
from sqlalchemy import event, text
from sqlalchemy.engine.strategies import DefaultExecutionContext

@event.listens_for(AsyncSession, "begin")
async def set_tenant_id(session, transaction, connection):
    """Set tenant ID for RLS on every session.begin()."""
    tenant_id = getattr(session, "tenant_id", None)
    if tenant_id:
        await connection.execute(
            text("SELECT set_config('app.current_tenant_id', :tenant_id, false)"),
            {"tenant_id": str(tenant_id)}
        )

# Usage
async def handler(update: Update, context: CallbackContext) -> None:
    tenant_id = extract_tenant_id(update)  # From JWT, session, etc.
    
    async with async_session_factory() as session:
        session.tenant_id = tenant_id  # Store on session object
        async with session.begin():
            # RLS policy ensures only tenant_id rows are visible
            stmt = select(User).where(User.tenant_id == tenant_id)
            result = await session.execute(stmt)
            users = result.scalars().all()
```

PostgreSQL RLS schema:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON users
    USING (current_setting('app.current_tenant_id')::int = tenant_id);
```

**DO NOT**
```python
# ❌ Trust WHERE clause alone (no RLS)
stmt = select(User).where(User.tenant_id == tenant_id)
# If developer forgets WHERE, all tenants' data leaked

# ❌ Set tenant ID only at connection time
# Stale connections reused without tenant context
```

---

## V. TELEGRAM API RATE LIMITING

### 5.1 Official Limits & Retry Strategy

**MUST UNDERSTAND**
- Telegram Bot API 7.5+ uses **dynamic token-bucket** algorithm (not fixed "30 msg/s")
- Returns `retry_after` header on 429 response; **respect this exact value**, NOT fixed 5-second sleep
- Different method families have different quotas (sendMessage: 30/s, editMessage: 20/s)
- Local token bucket (burst ≤30, refill ≤25/s) is essential to avoid hitting 429

**DO**
```python
import asyncio
from telegram import error

class TelegramRateLimiter:
    """Respect dynamic Telegram rate limits."""
    
    def __init__(self, burst: int = 30, rate: float = 25.0):
        """Burst capacity, refill rate per second."""
        self.tokens = float(burst)
        self.capacity = float(burst)
        self.rate = rate
        self.last_update = asyncio.get_event_loop().time()
        self.lock = asyncio.Lock()
    
    async def acquire(self) -> None:
        """Wait until token available."""
        async with self.lock:
            while self.tokens < 1:
                now = asyncio.get_event_loop().time()
                elapsed = now - self.last_update
                self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
                self.last_update = now
                
                if self.tokens < 1:
                    await asyncio.sleep(0.01)

async def send_with_retry(
    context: CallbackContext,
    chat_id: int,
    text: str,
    max_retries: int = 5,
) -> None:
    """Send message with Telegram's dynamic rate limiting."""
    limiter: TelegramRateLimiter = context.bot_data.get("limiter")
    
    for attempt in range(max_retries):
        try:
            await limiter.acquire()
            await context.bot.send_message(chat_id=chat_id, text=text)
            return
        except error.RetryAfter as e:
            wait_time = e.retry_after
            await logger.ainfo("rate_limited", retry_after=wait_time, attempt=attempt)
            
            if attempt == max_retries - 1:
                raise
            
            await asyncio.sleep(wait_time)
        except error.TimedOut:
            # Exponential backoff for network timeouts
            await asyncio.sleep(2 ** attempt)
```

**DO NOT**
```python
# ❌ Fixed 5-second sleep on 429
except error.RetryAfter:
    time.sleep(5)  # Ignores Telegram's dynamic retry_after

# ❌ No local rate limiting
# Sends 100 messages in parallel → hits API limit immediately

# ❌ Blocking sleep in async context
await asyncio.sleep(5)  # OK, non-blocking
time.sleep(5)  # WRONG: blocks event loop
```

---

### 5.2 Webhook vs Polling for Telegram

**MUST CHOOSE**
- **Webhook**: Production (>100 msg/day, real-time critical) — ~100ms latency, scales to millions
- **Polling**: Development, testing, low traffic (<50/day) — 1-30s latency, no HTTPS needed

**DO**
```python
# Webhook in production
app = Application.builder().token(TOKEN)
app.updater = Updater.build_app_updater(
    Updater(token=TOKEN),
    telegram_server_url="https://api.telegram.org",
)
await app.bot.set_webhook(url="https://your-server.com/webhook", secret_token=TOKEN)
await app.start()

# Polling in development
app = Application.builder().token(TOKEN).build()
await app.run_polling()  # Long-polling by default
```

**DO NOT**
```python
# ❌ Webhook without HTTPS certificate
await app.bot.set_webhook(url="http://your-server.com")  # Rejected by Telegram

# ❌ Polling with 1-second interval on production server
# Hammers Telegram servers; invite rate limits
```

---

## VI. STRUCTURED LOGGING & OBSERVABILITY

### 6.1 Structlog Configuration & Context Binding

**MUST**
- Configure structlog for JSON output in production, console in development
- Use `structlog.contextvars` for request-scoped context (task-safe, thread-safe)
- Bind at middleware/handler entry; clear at exit
- Use async logging: `await logger.ainfo()`, `await logger.aerror()` (methods prefixed with 'a')
- Never block event loop: use non-blocking I/O or delegate to thread pool

**DO**
```python
import structlog
import logging

# Configure structlog
def configure_logging(is_production: bool = False) -> None:
    """Setup structured logging."""
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
    ]
    
    if is_production:
        processors.append(structlog.processors.JSONRenderer())
        logger_factory = structlog.PrintLoggerFactory()
    else:
        processors.append(structlog.dev.ConsoleRenderer())
        logger_factory = structlog.PrintLoggerFactory()
    
    structlog.configure(
        processors=processors,
        context_class=dict,
        logger_factory=logger_factory,
        cache_logger_on_first_use=True,
    )

# Usage
logger = structlog.get_logger()

async def handler(update: Update, context: CallbackContext) -> None:
    """Handler with structured logging."""
    user_id = update.effective_user.id if update.effective_user else None
    request_id = str(uuid.uuid4())
    
    # Bind context
    structlog.contextvars.bind_contextvars(
        request_id=request_id,
        user_id=user_id,
        chat_id=update.effective_chat.id if update.effective_chat else None,
    )
    
    try:
        await logger.ainfo("handler_start")
        result = await process_update(update)
        await logger.ainfo("handler_success", result=result)
    except Exception as e:
        await logger.aerror("handler_error", error=str(e), exc_info=True)
        raise
    finally:
        # Clear context
        structlog.contextvars.clear_contextvars()
```

**DO NOT**
```python
# ❌ Print statements (unstructured, lost on concurrency)
print(f"User {user_id} sent message: {text}")

# ❌ Blocking I/O in async context
logger.info("event", metadata=requests.get("http://...").json())

# ❌ Synchronous logging methods
await logger.info("event")  # Wrong: no 'await' for async logger
```

---

### 6.2 Sentry Integration

**MUST**
- Call `sentry_sdk.init()` **inside** first `async` function with `AsyncioIntegration()`
- Set `traces_sample_rate` (e.g., 0.1 for 10% sampling) and `profile_session_sample_rate` for profiling
- Use `sentry_sdk.isolate_scope()` for request isolation
- Use `sentry_sdk.start_span()` for custom tracing
- Never call blocking Sentry methods; use `context.bot_data["event_loop"].call_soon_threadsafe()`

**DO**
```python
import sentry_sdk
from sentry_sdk.integrations.asyncio import AsyncioIntegration

async def main() -> None:
    """Initialize Sentry inside async context."""
    sentry_sdk.init(
        dsn=os.environ["SENTRY_DSN"],
        integrations=[AsyncioIntegration()],
        traces_sample_rate=0.1,
        profile_session_sample_rate=0.1,
        environment=os.environ.get("ENV", "development"),
    )
    
    # App runs here; all exceptions auto-captured by AsyncioIntegration
    app = Application.builder().token(TOKEN).build()
    await app.run_polling()

async def handler(update: Update, context: CallbackContext) -> None:
    """Handler with Sentry instrumentation."""
    with sentry_sdk.isolate_scope() as scope:
        scope.set_tag("user_id", update.effective_user.id)
        scope.set_context("telegram", {
            "chat_id": update.effective_chat.id,
            "message_id": update.effective_message.message_id,
        })
        
        with sentry_sdk.start_span(op="handler", name="process_message"):
            await process_message(update)
```

**DO NOT**
```python
# ❌ Sentry init at module level (before event loop)
sentry_sdk.init(...)  # AsyncioIntegration not effective

# ❌ Blocking Sentry call in async context
sentry_sdk.capture_message("event")  # Blocks event loop if Sentry server slow

# ❌ Multiple event loop creations after init
sentry_sdk.init(...)
asyncio.run(main())
asyncio.run(main2())  # New loop; Sentry instrumentation lost
```

---

## VII. MULTI-TENANCY & SECURITY

### 7.1 Tenant Identification & Isolation

**MUST**
- Extract tenant ID from JWT token, session, or user entity (never trust user input)
- Verify tenant ID matches authenticated user's tenant before database operations
- Use database-level isolation (RLS, separate schema) as primary defense; application-level filtering as secondary
- Never rely on application WHERE clauses alone

**DO**
```python
import jwt
from functools import wraps

def extract_tenant_from_update(update: Update) -> int:
    """Extract tenant ID from Telegram user or context."""
    # Assume user_id → tenant mapping stored in DB
    user_id = update.effective_user.id
    
    # Lookup in cache or DB
    tenant_id = tenant_cache.get(user_id)
    if not tenant_id:
        raise ValueError(f"User {user_id} has no tenant")
    
    return tenant_id

async def handler(update: Update, context: CallbackContext) -> None:
    """Handler with tenant isolation."""
    tenant_id = extract_tenant_from_update(update)
    
    async with async_session_factory() as session:
        session.tenant_id = tenant_id
        async with session.begin():
            # RLS policy ensures only tenant's rows visible
            stmt = select(User).where(User.id == update.effective_user.id)
            result = await session.execute(stmt)
            user = result.scalars().first()
            
            if not user or user.tenant_id != tenant_id:
                raise PermissionError("User not in tenant")
```

**DO NOT**
```python
# ❌ Trust user-supplied tenant_id
tenant_id = context.user_data.get("tenant_id")  # User can modify

# ❌ Rely only on WHERE clause
stmt = select(User).where(User.tenant_id == tenant_id)
# If developer forgets WHERE, all tenants' data leaked

# ❌ No verification of JWT
tenant_id = jwt.decode(token)["tenant_id"]
# What if JWT is stale or tampered?
```

---

### 7.2 Secrets Management

**MUST**
- Store secrets (tokens, API keys, database passwords) in **environment variables**, NOT code
- Use `python-dotenv` for local development (.env file, excluded from git)
- Use cloud secrets manager in production (AWS Secrets Manager, Azure Key Vault, etc.)
- Never log secrets; use `MASK_PASSWORD` or similar

**DO**
```python
import os
from dotenv import load_dotenv

# Load .env in development
if os.environ.get("ENV") != "production":
    load_dotenv()

# Access secrets
BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
DATABASE_URL = os.environ["DATABASE_URL"]
SENTRY_DSN = os.environ.get("SENTRY_DSN", "")

# .env file (local dev only)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
DATABASE_URL=postgresql+asyncpg://user:password@localhost/db
```

**DO NOT**
```python
# ❌ Hardcoded secrets
BOT_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"

# ❌ Secrets in .env committed to git
git add .env && git commit  # Revoke token immediately

# ❌ Logging secrets
logger.info("Connecting", password=password)
```

---

## VIII. TESTING & QUALITY ASSURANCE

### 8.1 Async Testing with pytest-asyncio

**MUST**
- Mark async tests with `@pytest.mark.asyncio`
- Use `@pytest_asyncio.fixture` for async fixtures
- Create async context managers for resource setup/teardown
- Do NOT use `asyncio.gather()` for test task spawning; use `asyncio.wait()` for controlled execution

**DO**
```python
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock

@pytest_asyncio.fixture
async def mock_app():
    """Fixture: mock Application."""
    app = AsyncMock(spec=Application)
    app.bot = AsyncMock()
    app.bot.send_message = AsyncMock()
    yield app

@pytest_asyncio.fixture
async def session_factory():
    """Fixture: test database session."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    factory = async_sessionmaker(engine, class_=AsyncSession)
    yield factory
    
    await engine.dispose()

@pytest.mark.asyncio
async def test_handler(mock_app, session_factory):
    """Test async handler."""
    update = AsyncMock(spec=Update)
    update.effective_user.id = 123
    
    context = AsyncMock(spec=CallbackContext)
    context.bot = mock_app.bot
    
    await my_handler(update, context)
    
    context.bot.send_message.assert_called_once()
```

**DO NOT**
```python
# ❌ Sync test for async function
def test_handler():
    result = handler(update, context)  # Error: can't await in sync

# ❌ Unbounded task creation in test
@pytest.mark.asyncio
async def test_concurrent():
    tasks = [asyncio.create_task(process(i)) for i in range(1000)]
    results = await asyncio.gather(*tasks)  # All in memory

# ❌ Missing await for async fixture
@pytest.fixture
async def app():
    return Application.builder().build()
# Usage: test_function(app) without await
```

---

### 8.2 Type Checking & Linting

**MUST**
- Run `pyright --strict` (strict mode enforces all type annotations)
- Run `ruff check .` to catch async anti-patterns (ASYNC rules)
- Run `pylint` with custom config focusing on errors (E), not warnings (W, R, C)
- Include `pre-commit` hooks to enforce checks before commit

**DO**
```yaml
# pyproject.toml
[tool.pyright]
typeCheckingMode = "strict"
pythonVersion = "3.13"

[tool.ruff.lint]
select = ["E", "F", "W", "I", "B", "ASYNC"]
ignore = ["E501"]  # Line too long (let Black handle)

# .pre-commit-config.yaml
repos:
  - repo: https://github.com/microsoft/pyright
    rev: 1.1.x
    hooks:
      - id: pyright
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.x
    hooks:
      - id: ruff
        args: [--fix]
```

**DO NOT**
```python
# ❌ type: ignore without justification
result: Any = await function()  # type: ignore

# ❌ Ruff violations not fixed
# ASYNC210: Blocking HTTP call in async function
async def handler():
    requests.get(url)  # Blocks event loop

# ❌ Pylint disabled entirely
# [tool.pylint]
# disable = all
```

---

## IX. PERFORMANCE & SCALABILITY

### 9.1 Preventing Memory Leaks in Async Code

**MUST**
- Use `asyncio.wait()` with `FIRST_COMPLETED` for controlled batch processing (NOT `asyncio.gather()`)
- Keep references to all spawned tasks; unreferenced tasks may be GC'd before completion
- Set timeouts on long-running operations: `async with asyncio.timeout(seconds):`
- Monitor memory: use `tracemalloc`, `memory_profiler`, or DataDog profiler

**DO**
```python
import asyncio
import tracemalloc

async def controlled_batch(items: list[Any], batch_size: int = 10) -> list[Any]:
    """Process items in controlled batches."""
    results = []
    pending = set()
    item_iter = iter(items)
    
    # Fill initial batch
    for _ in range(batch_size):
        try:
            item = next(item_iter)
            pending.add(asyncio.create_task(process(item)))
        except StopIteration:
            break
    
    # Process as tasks complete
    while pending:
        done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
        
        for task in done:
            results.append(task.result())
        
        # Refill batch
        for _ in range(len(done)):
            try:
                item = next(item_iter)
                pending.add(asyncio.create_task(process(item)))
            except StopIteration:
                break
    
    return results

# Memory profiling
tracemalloc.start()
await main()
current, peak = tracemalloc.get_traced_memory()
print(f"Current: {current / 1e6:.1f} MB; Peak: {peak / 1e6:.1f} MB")
```

**DO NOT**
```python
# ❌ Unbounded task creation (memory spike)
tasks = [asyncio.create_task(process(item)) for item in million_items]
results = await asyncio.gather(*tasks)  # All pending in memory at once

# ❌ Unreferenced tasks (may be GC'd)
asyncio.create_task(background_job())  # No reference; task lost

# ❌ No timeout on external calls
await external_api.request()  # Hangs forever if API slow
```

---

### 9.2 Connection Pool Tuning

**MUST**
- Set `pool_size` to number of concurrent database operations (typically 5-10)
- Set `max_overflow` for burst capacity (e.g., 10)
- Enable `pool_pre_ping` to detect stale connections
- Set `pool_recycle=3600` (1 hour) to recycle old connections

**DO**
```python
engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,          # Base pool size
    max_overflow=10,       # Extra connections on burst
    pool_pre_ping=True,    # Ping before reuse
    pool_recycle=3600,     # Recycle after 1 hour
    echo_pool=False,       # Log pool events (debug only)
)
```

**DO NOT**
```python
# ❌ Default pool (pool_size=5) too small for high concurrency
engine = create_async_engine(DATABASE_URL)

# ❌ No pool (NullPool) — creates new connection per request
engine = create_async_engine(DATABASE_URL, poolclass=NullPool)

# ❌ Unbounded max_overflow
engine = create_async_engine(DATABASE_URL, max_overflow=1000)
```

---

## X. ADVANCED WEBHOOK PATERNS (FastAPI Integration)

### 10.1 FastAPI Webhook Server

**MUST**
- Use FastAPI (or aiohttp) for webhook handling in production
- Set `secret_token` when registering webhook and verify `X-Telegram-Bot-Api-Secret-Token` header

```python
from fastapi import FastAPI, Request, Header, HTTPException, status
from telegram import Update
from telegram.ext import Application

web_app = FastAPI()

@web_app.post('/telegram')
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str = Header(...)
):
    """Handle incoming Telegram updates."""
    if x_telegram_bot_api_secret_token != SECRET_TOKEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    data = await request.json()
    update = Update.de_json(data, application.bot)
    
    # Offload processing to avoid blocking webhook response
    asyncio.create_task(application.process_update(update))
    
    return {'ok': True}

@web_app.on_event('startup')
async def startup():
    await application.initialize()
    await application.start()
    await application.bot.set_webhook(
        url=f"{WEBHOOK_URL}/telegram",
        secret_token=SECRET_TOKEN,
        allowed_updates=Update.ALL_TYPES,
        max_connections=100
    )

@web_app.on_event('shutdown')
async def shutdown():
    await application.stop()
    await application.shutdown()
```

### 10.2 Health Checks

**MUST**
- Provide a lightweight `/health` endpoint for load balancers
- Do NOT make external calls (DB/Redis) in simple health checks unless using a deep `/ready` probe

```python
@web_app.get('/health')
async def health():
    return {'status': 'ok', 'version': '1.0.0'}

@web_app.get('/ready')
async def ready():
    try:
        await engine.connect() # Test DB
        return {'status': 'ready'}
    except Exception:
        return {'status': 'unhealthy'}, 503
```

---

## XI. MEMORY MANAGEMENT DEEP DIVE

### 11.1 Task Holding to Prevent GC

**MUST**
- Keep strong references to background tasks. `asyncio.create_task` alone is insufficient as tasks can be garbage collected mid-execution in some Python implementations if not referenced.

**DO**
```python
background_tasks = set()

async def schedule_task(coro):
    task = asyncio.create_task(coro)
    background_tasks.add(task)
    task.add_done_callback(background_tasks.discard)
```

### 11.2 Explicit Cleanup

**MUST**
- Close all connections (session, redis, http client) in `finally` blocks or lifespan events.

**DO**
```python
async def lifecyle(app):
    # Startup
    redis = Redis(...)
    yield
    # Shutdown
    await redis.aclose()
```

---

## XII. ALEMBIC MIGRATION BEST PRACTICES

### 12.1 Async Template Setup

**MUST**
- Initialize with `alembic init -t async migrations`.
- Configure `env.py` to use `create_async_engine`.

**DO (env.py snippet)**
```python
async def run_async_migrations():
    connectable = create_async_engine(DATABASE_URL, poolclass=pool.NullPool)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()
```

### 12.2 Sync/Async Methods

**MUST**
- Do NOT perform async operations inside migration `upgrade()` scripts.
- Use `op.execute()` or SQLAlchemy Core (sync-compatible) for structure changes.

---

## XIII. DEPLOYMENT CHECKLIST

### Pre-Flight
- [ ] **Linting**: No errors in `pyright --strict` or `ruff check .`
- **Secrets**: All secrets moved from code to Environment Variables
- **Async Safety**: Checked for `time.sleep`, `requests.get` (replaces with `aiohttp`)
- **Database**: `pool_pre_ping=True` enabled
- **Migrations**: `alembic upgrade head` executed
- **Logging**: JSON logging enabled for Production

### Infrastructure
- **Process Manager**: Docker or Systemd (Auto-restart enabled)
- **Reverse Proxy**: Nginx/Caddy with TLS 1.3
- **Webhook**: Secret Token configured and verified
- **Limits**: `ulimit -n` increased (min 65535 for high concurrency)

### Monitoring
- **Sentry**: DSN active, Sampling rate set (e.g., 0.1)
- **Health**: `/health` endpoint responding 200 OK
- **Metrics**: Prometheus/Grafana (optional but recommended)

---

## XIV. CORRECT VS. WRONG SCENARIOS

### Scenario 1: Processing a User Update

**✅ CORRECT**
```python
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    async with AsyncSessionFactory() as session:
        async with session.begin():
            # RLS or Tenant Check
            await set_tenant_id(session, ...)
            user = await session.get(User, update.effective_user.id)
            if not user:
                user = User(id=update.effective_user.id, first_name=update.effective_user.first_name)
                session.add(user)
    
    await update.message.reply_text('Message saved')
```

**❌ WRONG**
```python
def handle_message(update, context): # Sync Function!
    session = Session() # Sync Session!
    user = session.query(User).filter_by(id=update.effective_user.id).first()
    # Blocking I/O freezes the bot
    session.add(User(...))
    session.commit()
```

### Scenario 2: Rate-Limited API Call with Retry

**✅ CORRECT**
```python
async def call_external_api(url, max_retries=3):
    for attempt in range(max_retries):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as resp:
                    resp.raise_for_status()
                    return await resp.json()
        except Exception:
            await asyncio.sleep(2 ** attempt) # Non-blocking sleep
    raise RuntimeError("Failed")
```

**❌ WRONG**
```python
def call_external_api(url):
    import time
    time.sleep(1) # Blocking sleep!
    return requests.get(url).json() # Blocking request!
```

---

## XV. REFERENCES & OFFICIAL DOCUMENTATION

- **Python 3.13**: https://docs.python.org/3.13/
- **python-telegram-bot v22.6**: https://docs.python-telegram-bot.org/
- **SQLAlchemy 2.0 Async**: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- **Redis Asyncio**: https://redis-py.readthedocs.io/en/stable/examples/asyncio_examples.html
