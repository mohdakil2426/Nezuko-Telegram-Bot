# I. PYTHON 3.13+ FUNDAMENTALS

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
