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
