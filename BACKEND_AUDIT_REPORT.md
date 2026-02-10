# Backend Code Audit Report — Nezuko Telegram Bot Platform

> **Date:** 2026-02-10  
> **Scope:** `apps/api/` (FastAPI REST Backend) + `apps/bot/` (Telegram Bot)  
> **Skills Applied:** All 12 backend skills + frontend-backend-rules  
> **Rating:** 🟢 **7.5 / 10** — Solid foundation with several areas for improvement

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Skill 1: FastAPI Patterns](#2-skill-1-fastapi-patterns)
3. [Skill 2: Async Python Patterns](#3-skill-2-async-python-patterns)
4. [Skill 3: Python Code Style](#4-skill-3-python-code-style)
5. [Skill 4: Python Type Safety](#5-skill-4-python-type-safety)
6. [Skill 5: Python Error Handling](#6-skill-5-python-error-handling)
7. [Skill 6: Python Design Patterns](#7-skill-6-python-design-patterns)
8. [Skill 7: Python Testing Patterns](#8-skill-7-python-testing-patterns)
9. [Skill 8: Python Performance Optimization](#9-skill-8-python-performance-optimization)
10. [Skill 9: Python Anti-Patterns](#10-skill-9-python-anti-patterns)
11. [Skill 10: Python Resilience](#11-skill-10-python-resilience)
12. [Skill 11: Python Background Jobs](#12-skill-11-python-background-jobs)
13. [Skill 12: Python Observability](#13-skill-12-python-observability)
14. [Cross-Cutting Concerns](#14-cross-cutting-concerns)
15. [Priority Matrix](#15-priority-matrix)
16. [Appendix: File-by-File Index](#16-appendix-file-by-file-index)

---

## 1. Executive Summary

### Strengths ✅

| Area                    | Details                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| **Architecture**        | Clean separation: API (FastAPI) + Bot (PTB) + shared database. Monorepo with Turborepo.      |
| **Async-first**         | Consistent use of `async`/`await` across both apps. No blocking calls detected in hot paths. |
| **Security**            | Fernet encryption for tokens at rest, session-based auth, CORS, security headers middleware. |
| **Resilience (Bot)**    | Full circuit breaker implementation, exponential backoff with jitter, graceful degradation.  |
| **Observability (Bot)** | Structlog integration, Prometheus metrics, Sentry error tracking.                            |
| **Models**              | Well-typed SQLAlchemy 2.0 `Mapped[]` columns, proper indexes, soft-delete mixin.             |
| **Code Quality**        | Docstrings on all public functions, proper exception hierarchies, `RUF006` compliance.       |

### Areas for Improvement ⚠️

| Severity        | Count | Summary                                                                                                                                     |
| --------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔴 **Critical** | 3     | Authentication bypass in dev, `AdminService` raises HTTP in service layer, missing return type annotations                                  |
| 🟠 **High**     | 8     | Singleton anti-pattern, missing retry on DB operations, no session cleanup, hardcoded dev credentials, duplicate `new_members` reassignment |
| 🟡 **Medium**   | 12    | Missing `__all__` exports, incomplete test coverage, N+1 detection without prevention, global mutable state, `Cache.set` type confusion     |
| 🟢 **Low**      | 7     | Minor style inconsistencies, missing type narrowing, unused `TYPE_CHECKING` imports                                                         |

---

## 2. Skill 1: FastAPI Patterns

### 2.1 ✅ What's Done Well

- **`response_model` on all endpoints** — Every router function declares its return type via `response_model` parameter (`bots.py`, `auth.py`).
- **Proper exception-to-HTTP mapping** — Service exceptions (`BotNotFoundError`, `DuplicateBotError`) are caught in endpoint handlers and converted to appropriate HTTP status codes with `from exc` chaining.
- **Dependency injection via `Depends`** — Database sessions and authentication are injected cleanly.
- **Annotated type aliases** — `CurrentSession = Annotated[Session, Depends(...)]` provides clean DI shorthand.
- **Lifespan management** — Uses FastAPI's modern `lifespan` context manager instead of deprecated `on_event`.

### 2.2 🔴 Critical: Authentication Bypass in Development

**File:** `apps/api/src/api/v1/dependencies/session.py`

```python
# ❌ CRITICAL: Returns mock session for ALL requests
async def get_current_session(...) -> Session:
    return Session(
        id="dev-session-id",
        telegram_id=123456789,  # Hardcoded
        telegram_username="developer",
        ...
    )
```

**Problem:** The docstring says "Authentication has been removed," but the `auth.py` endpoint file has a full `telegram_login` implementation. There's a disconnect — the actual auth verification code exists but is bypassed by the session dependency.

**Risk:** If this accidentally goes to production, **every endpoint is unauthenticated**.

**Recommendation:**

```python
async def get_current_session(
    request: Request,
    db: AsyncSession = Depends(get_session),
) -> Session:
    settings = get_settings()
    if settings.MOCK_AUTH:
        return _create_mock_session()

    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = await db.get(Session, session_id)
    if not session or session.is_expired:
        raise HTTPException(status_code=401, detail="Session expired")

    return session
```

### 2.3 🟠 High: Service Layer Raises HTTPException

**File:** `apps/api/src/services/admin_service.py`

```python
# ❌ Service layer should not know about HTTP
class AdminService:
    async def create_admin(self, data: AdminCreateRequest) -> AdminUser:
        existing = await self.get_admin_by_email(data.email)
        if existing:
            raise HTTPException(  # ← Wrong layer!
                status_code=status.HTTP_409_CONFLICT,
                detail="Admin with this email already exists",
            )
```

**Problem:** The service layer is coupled to FastAPI's `HTTPException`. This violates the separation of concerns pattern — services should raise domain exceptions, not HTTP exceptions.

**Recommendation:**

```python
# In services/admin_service.py
class AdminAlreadyExistsError(Exception):
    """Raised when admin email already exists."""

class AdminNotFoundError(Exception):
    """Raised when admin is not found."""

class AdminService:
    async def create_admin(self, data: AdminCreateRequest) -> AdminUser:
        existing = await self.get_admin_by_email(data.email)
        if existing:
            raise AdminAlreadyExistsError(f"Admin with email {data.email} already exists")

# In endpoints/admin.py — map to HTTP
except AdminAlreadyExistsError as exc:
    raise HTTPException(status_code=409, detail=str(exc)) from exc
```

**Note:** The `BotInstanceService` does this correctly — it uses domain exceptions like `BotNotFoundError` and `DuplicateBotError`. The `AdminService` should follow the same pattern.

### 2.4 🟡 Medium: Missing API Versioning Strategy

The router is mounted at `/api/v1` which is good, but there's no documented strategy for when `/api/v2` is needed. Consider adding a version header or content negotiation plan.

### 2.5 🟡 Medium: `BotInstanceService` Instantiated Per-Request

**File:** `apps/api/src/api/v1/endpoints/bots.py`

```python
@router.get("", response_model=BotListResponse)
async def list_bots(session: CurrentSession, db: AsyncSession = Depends(get_session)):
    service = BotInstanceService(db)  # ← New instance every request
```

**Recommendation:** Convert to a FastAPI dependency for better testability and lifecycle management:

```python
async def get_bot_service(db: AsyncSession = Depends(get_session)) -> BotInstanceService:
    return BotInstanceService(db)

BotService = Annotated[BotInstanceService, Depends(get_bot_service)]

@router.get("")
async def list_bots(session: CurrentSession, service: BotService):
    bots = await service.list_bots(session.telegram_id)
```

---

## 3. Skill 2: Async Python Patterns

### 3.1 ✅ What's Done Well

- **`RUF006` compliance** — Background tasks are properly stored in `_background_tasks: set[asyncio.Task[None]]` sets with `add_done_callback(_tasks.discard)` in both `bot_instance_service.py` and `verification.py`.
- **Async context managers** — `get_session()` in the bot uses `async with` properly.
- **No blocking calls in async code** — No `time.sleep()`, `requests.get()`, or synchronous DB calls found in async functions.

### 3.2 🟠 High: `httpx.AsyncClient` Created Per-Request in `TelegramAPIService`

**File:** `apps/api/src/services/telegram_api.py`

```python
async def get_bot_info(self, token: str) -> TelegramBotInfo:
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:  # ← New client per call
        response = await client.get(url)
```

**Problem:** Creating a new `httpx.AsyncClient` per request creates a new connection pool each time, defeating connection reuse. This adds latency and wastes resources.

**Recommendation:**

```python
class TelegramAPIService:
    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=REQUEST_TIMEOUT)
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.close()

    @retry(...)
    async def get_bot_info(self, token: str) -> TelegramBotInfo:
        client = await self._get_client()
        response = await client.get(url)
```

### 3.3 🟡 Medium: `HeartbeatService` and `EventPublisher` Share Same Pattern — Could Be Unified

Both `HeartbeatService` and `EventPublisher` implement:

- Lazy HTTP client creation (`_get_client`)
- Session cookie management
- Singleton holder pattern

Consider a shared `HttpServiceBase` class:

```python
class HttpServiceBase:
    def __init__(self, base_url: str, timeout: float = 5.0) -> None:
        self._base_url = base_url
        self._client: httpx.AsyncClient | None = None
        self._timeout = timeout

    async def _get_client(self) -> httpx.AsyncClient: ...
    async def close(self) -> None: ...
    def set_session_cookie(self, cookie: str) -> None: ...
```

### 3.4 🟡 Medium: Missing `asyncio.Semaphore` on Concurrent Channel Checks

**File:** `apps/bot/services/verification.py`

```python
async def check_multi_membership(...) -> list[HasChannelId]:
    # Checks channels sequentially — safe but slow
    for channel in channels:
        is_member = await check_membership(...)
```

For groups with many linked channels, this is sequential. Consider bounded concurrency:

```python
async def check_multi_membership(...) -> list[HasChannelId]:
    semaphore = asyncio.Semaphore(3)  # Max 3 concurrent API calls

    async def check_one(channel):
        async with semaphore:
            return channel, await check_membership(...)

    results = await asyncio.gather(*[check_one(ch) for ch in channels])
    return [ch for ch, is_member in results if not is_member]
```

---

## 4. Skill 3: Python Code Style

### 4.1 ✅ What's Done Well

- **Consistent formatting** — Ruff-formatted code throughout.
- **Google-style docstrings** — All public functions have docstrings with Args/Returns/Raises sections.
- **Module-level docstrings** — Every Python file has a module docstring.
- **Proper import grouping** — stdlib → third-party → local, separated by blank lines.

### 4.2 🟡 Medium: Missing `__all__` Exports

**Files:** Most `__init__.py` files, `services/`, `schemas/`

No `__init__.py` files define `__all__`, making the public API surface implicit. This makes it harder for other developers to know what should be imported.

**Recommendation:** Add explicit exports:

```python
# services/__init__.py
__all__ = [
    "BotInstanceService",
    "AdminService",
    "AnalyticsService",
    "ConfigService",
]
```

### 4.3 🟢 Low: Unused `TYPE_CHECKING` Blocks

**Files:** `apps/api/src/models/bot_instance.py`, `apps/api/src/models/session.py`

```python
if TYPE_CHECKING:
    pass  # ← Empty block
```

These empty `TYPE_CHECKING` blocks should be removed unless there are planned forward references.

### 4.4 🟢 Low: Inconsistent Logger Initialization

- **API:** Mix of `structlog.get_logger(__name__)` and `logging.getLogger(__name__)`
- **Bot:** Mix of `structlog.get_logger(__name__)` and `logging.getLogger(__name__)`

**Recommendation:** Standardize on `structlog.get_logger(__name__)` everywhere, since structlog is already configured as the primary logging framework in both apps.

---

## 5. Skill 4: Python Type Safety

### 5.1 ✅ What's Done Well

- **Modern union syntax** — Uses `str | None` instead of `Optional[str]`.
- **SQLAlchemy `Mapped[]`** — All model columns use `Mapped[T]` with `mapped_column()`.
- **Pydantic models** — Schemas use proper field types with validation.
- **Protocol usage** — `HasChannelId` protocol in `verification.py` for structural typing.

### 5.2 🔴 Critical: Missing Return Type on Key Handler

**File:** `apps/bot/handlers/verify.py`

```python
async def handle_callback_verify(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # ← Missing return type annotation -> None
```

**File:** `apps/bot/handlers/events/join.py`

```python
async def handle_new_member(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # ← Missing return type annotation -> None
```

These are the core handler functions. Return type annotations (even `-> None`) should be present on all functions per the project rules.

### 5.3 🟡 Medium: `Any` Usage in Cache Layer

**File:** `apps/api/src/core/cache.py`

```python
async def get(cls, key: str) -> Any | None:  # ← Loses type info
async def set(cls, key: str, value: Any, expire: int = 300) -> bool:
```

**Recommendation:** Use generics or `TypeVar` to preserve type safety:

```python
T = TypeVar("T")

async def get(cls, key: str, type_: type[T] | None = None) -> T | None:
    ...
```

### 5.4 🟡 Medium: `dict` Without Type Parameters

**File:** `apps/bot/database/crud.py`

```python
async def update_group_params(session: AsyncSession, group_id: int, params: dict) -> None:
    # ← Should be dict[str, Any]
```

**File:** `apps/bot/database/models.py`

```python
params: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict)
# ← Should be Mapped[dict[str, Any] | None]
```

### 5.5 🟢 Low: `typing.cast` Without Narrowing Purpose

**File:** `apps/bot/handlers/verify.py`

```python
await invalidate_cache(user_id, cast(int, channel.channel_id))
```

`channel.channel_id` has type `int | str` but is cast to `int`. If it's actually a string like `"@channel3"`, this cast is a lie. Better to handle both types:

```python
channel_id_value = int(channel.channel_id) if isinstance(channel.channel_id, str) else channel.channel_id
```

---

## 6. Skill 5: Python Error Handling

### 6.1 ✅ What's Done Well

- **Exception hierarchies** — `TelegramAPIError → InvalidTokenError`, `BotServiceError → DuplicateBotError`, etc.
- **Exception chaining** — Consistent use of `raise X from exc` throughout.
- **Specific exception handling** — Handlers catch `TelegramError`, `SQLAlchemyError` separately, not bare `except Exception`.
- **Graceful degradation** — Cache layer returns `None`/`False` on Redis errors instead of crashing.

### 6.2 🟠 High: Silent Error Swallowing in Verify Handler

**File:** `apps/bot/handlers/verify.py`, lines 127-129

```python
except Exception as e:
    logger.error("Unexpected error in verify callback handler: %s", e, exc_info=True)
    # ← No re-raise, no user feedback — silently swallowed
```

While this prevents the bot from crashing, it means unexpected errors (like `MemoryError`, `SystemExit`) are silently swallowed. The outer `except Exception` should at least provide user feedback:

```python
except Exception as e:
    logger.error("Unexpected error in verify callback handler: %s", e, exc_info=True)
    with contextlib.suppress(TelegramError):
        if update.callback_query:
            await update.callback_query.answer(
                "An unexpected error occurred. Please try again.", show_alert=True
            )
```

### 6.3 🟡 Medium: `TelegramAPIService.get_bot_info` Masks Retry Exceptions

**File:** `apps/api/src/services/telegram_api.py`

```python
# The @retry decorator catches httpx.RequestError and httpx.TimeoutException
# BUT the inner try/except also catches these and re-raises as TelegramAPIError
# This means the retry never fires for timeout/request errors
except httpx.TimeoutException as exc:
    raise TelegramAPIError("Connection to Telegram timed out") from exc
except httpx.RequestError as exc:
    raise TelegramAPIError(f"Failed to connect to Telegram: {exc}") from exc
```

**Problem:** The `@retry` decorator is set to retry on `httpx.RequestError` and `httpx.TimeoutException`, but the inner `try/except` catches these and wraps them as `TelegramAPIError` — which is NOT in the retry list. **The retry logic never actually fires.**

**Recommendation:** Let transient exceptions propagate so `tenacity` can retry:

```python
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException)),
)
async def get_bot_info(self, token: str) -> TelegramBotInfo:
    url = f"{TELEGRAM_API_BASE}/bot{token}/getMe"
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        response = await client.get(url)
        data = response.json()

        if not data.get("ok"):
            error_code = data.get("error_code", 0)
            description = data.get("description", "Unknown error")
            if error_code == 401 or "Unauthorized" in description:
                raise InvalidTokenError("Invalid bot token")
            raise TelegramAPIError(f"Telegram API error: {description}")

        result = data.get("result", {})
        return TelegramBotInfo(...)
    # ← Remove the outer except blocks; let httpx exceptions propagate for retry
```

### 6.4 🟡 Medium: `except TelegramError: pass` in Verify Handler

**File:** `apps/bot/handlers/verify.py`, lines 122-125

```python
except TelegramError:
    pass  # ← Silent swallow
```

This bare `pass` after a `TelegramError` silently ignores the error. At minimum, add logging:

```python
except TelegramError as e:
    logger.debug("Failed to answer callback after error: %s", e)
```

---

## 7. Skill 6: Python Design Patterns

### 7.1 ✅ What's Done Well

- **Composition over inheritance** — Services receive dependencies (session, telegram_service) via constructor injection.
- **SoftDeleteMixin** — Clean mixin pattern for cross-cutting concerns.
- **Protocol-based polymorphism** — `HasChannelId` protocol enables structural typing.
- **Singleton holder pattern** — `_HeartbeatServiceHolder`, `_EventPublisherHolder` avoid `global` statements.
- **Data-driven CRUD** — `database/crud.py` uses clean, focused functions with single responsibility.

### 7.2 🟠 High: Module-Level Singleton Anti-Pattern

**File:** `apps/api/src/services/telegram_api.py`

```python
telegram_api = TelegramAPIService()  # Module-level singleton
```

**File:** `apps/api/src/services/analytics_service.py`

```python
analytics_service = AnalyticsService()  # Module-level singleton
```

**Problem:** Module-level singletons are created at import time, making them:

1. **Hard to test** — Can't easily mock without monkeypatching
2. **Unconfigurable** — No way to pass different dependencies
3. **Import-order sensitive** — May fail if dependencies aren't ready

**Recommendation:** Use FastAPI's dependency injection instead:

```python
def get_telegram_api() -> TelegramAPIService:
    return TelegramAPIService()

TelegramAPI = Annotated[TelegramAPIService, Depends(get_telegram_api)]
```

The bot side does this better with `_HeartbeatServiceHolder` and `configure_heartbeat_service()`.

### 7.3 🟡 Medium: `BotInstance` Model Missing Repository Layer

The API has services that directly query the database:

```
Endpoint → Service → Database (directly via SQLAlchemy)
```

The recommended pattern per the FastAPI skill is:

```
Endpoint → Service → Repository → Database
```

While the current approach works for the project's scale, adding a thin repository layer would improve testability (mock repository instead of database).

### 7.4 🟡 Medium: Duplicate Variable Assignment in Join Handler

**File:** `apps/bot/handlers/events/join.py`, lines 46 and 64

```python
new_members = update.message.new_chat_members  # Line 46 — assign
human_members = [u for u in new_members if not u.is_bot]  # Line 48 — filter
# ...
new_members = update.message.new_chat_members  # Line 64 — ❌ DUPLICATE reassignment
```

This is a dead reassignment that should be removed.

---

## 8. Skill 7: Python Testing Patterns

### 8.1 ✅ What's Done Well

- **Test structure** — Tests are in `tests/api/` and `tests/bot/` per project rules (not inside `apps/`).
- **Fixtures** — Good use of `conftest.py` with proper scope (`session`, `function`).
- **Async test support** — Uses `pytest-asyncio` with `AsyncClient` for API testing.
- **Database isolation** — In-memory SQLite for tests, engine/factory override in fixtures.
- **Mock patterns** — `mocker.AsyncMock()` for the Telegram bot correctly implements the protocol.
- **Cache clearing** — `autouse=True` fixture clears settings caches between tests.

### 8.2 🔴 Critical: Incomplete Test Coverage

**25 test files found**, which is good, but key areas lack coverage:

| Component                | Test Status                       | Gap                                                                                          |
| ------------------------ | --------------------------------- | -------------------------------------------------------------------------------------------- |
| `AdminService`           | ❌ No tests                       | Service raises HTTPException — needs tests for both the service and the HTTP exception issue |
| `ConfigService`          | ❌ No tests                       | Complex webhook testing logic untested                                                       |
| `AnalyticsService`       | ✅ `test_analytics.py`            | Integration test exists                                                                      |
| `BotInstanceService`     | ✅ `test_bot_instance_service.py` | Unit test exists                                                                             |
| `Cache` layer            | ❌ No tests                       | All Redis operations gracefully degrade but untested                                         |
| `SoftDeleteMixin`        | ❌ No tests                       | Mixin behavior untested                                                                      |
| `CircuitBreaker`         | ❌ No tests                       | Complex state machine logic untested                                                         |
| Error handler middleware | ❌ No tests                       | Exception-to-response mapping untested                                                       |
| Rate limiting middleware | ❌ No tests                       | Rate limit behavior untested                                                                 |
| Session dependency       | ❌ No tests                       | Auth logic (once restored) untested                                                          |

**Recommendation:** Priority test additions:

1. `tests/api/unit/test_admin_service.py`
2. `tests/api/unit/test_cache.py`
3. `tests/bot/unit/test_circuit_breaker.py`
4. `tests/api/unit/test_middleware.py`

### 8.3 🟡 Medium: Test Database Uses SQLite, Production Uses PostgreSQL

**File:** `tests/api/conftest.py`

```python
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"  # ← SQLite
```

But `apps/api/src/services/analytics_service.py` has:

```python
# PostgreSQL: Uses date_trunc() for efficient time bucketing
# SQLite: Uses date() for day-level grouping (hour grouping not natively supported)
```

**Problem:** The analytics service has dialect-specific SQL that behaves differently between SQLite and PostgreSQL. Tests may pass on SQLite but fail on Postgres (or vice versa).

**Recommendation:** Add a `testcontainers` or Docker-based PostgreSQL fixture for integration tests:

```python
@pytest.fixture(scope="session")
async def pg_engine():
    """Use PostgreSQL for integration tests."""
    url = "postgresql+asyncpg://test:test@localhost:5433/nezuko_test"
    engine = create_async_engine(url)
    ...
```

### 8.4 🟡 Medium: No Tests for Edge Cases in Encryption

The encryption module is security-critical but only has `test_encryption.py`. Consider adding:

- Invalid key format tests
- Empty/whitespace token tests
- Tampered ciphertext tests
- Key rotation scenario tests

---

## 9. Skill 8: Python Performance Optimization

### 9.1 ✅ What's Done Well

- **Connection pooling** — SQLAlchemy engine configured with pool sizes.
- **`selectinload`** — Used in `get_protected_group()` to eager-load relationships and prevent N+1.
- **Redis caching** — `@cached` decorator with configurable TTL.
- **Pipeline batching** — `Cache.set_many()` uses Redis pipeline for batch operations.
- **SCAN-based deletion** — `delete_pattern()` uses `SCAN` instead of `KEYS` for memory efficiency.
- **`lru_cache`** — Used for `get_settings()` and `get_fernet()` to avoid repeated computation.

### 9.2 🟡 Medium: N+1 Detection Without Prevention

**File:** `apps/api/src/middleware/db_metrics.py`

```python
if query_count > 10:
    logger.warning("n_plus_one_detected", ...)
```

The middleware DETECTS N+1 problems but doesn't PREVENT them. The counter itself (`request.state.query_count`) is initialized but never incremented anywhere — no query event listener is registered.

**Recommendation:** Register a SQLAlchemy event listener to actually count queries:

```python
from sqlalchemy import event

@event.listens_for(engine.sync_engine, "before_cursor_execute")
def _track_query(conn, cursor, statement, parameters, context, executemany):
    # Increment the counter on the current request context
    ...
```

### 9.3 🟡 Medium: `Cache.set` Has Redundant Branches

**File:** `apps/api/src/core/cache.py`

```python
if hasattr(value, "model_dump"):
    val_str = json.dumps(value.model_dump())
elif isinstance(value, (dict, list)):
    val_str = json.dumps(value)
else:
    val_str = json.dumps(value)  # ← Same as the elif branch
```

The `else` branch does the same thing as the `elif`. This is functionally correct but confusing. Simplify:

```python
if hasattr(value, "model_dump"):
    value = value.model_dump()
val_str = json.dumps(value)
```

### 9.4 🟢 Low: `ProtectedGroup.params` Default Uses `dict` Callable

```python
params: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict)
```

Using `default=dict` passes the `dict` class as a callable factory, which is correct. But consider using `default_factory` pattern or `server_default` for PostgreSQL JSON columns.

---

## 10. Skill 9: Python Anti-Patterns

### 10.1 Anti-Pattern Checklist

| Anti-Pattern                  | Status             | Details                                                      |
| ----------------------------- | ------------------ | ------------------------------------------------------------ |
| Scattered retry logic         | ✅ **Fixed**       | Bot uses `resilience.py` with centralized retry decorators   |
| Hard-coded configuration      | 🟡 **Partial**     | Mock session has hardcoded `telegram_id=123456789`           |
| Exposed internal types        | ✅ **Fixed**       | API returns schema types, not ORM models                     |
| Bare `except Exception: pass` | 🟡 **1 Instance**  | `verify.py` line 125                                         |
| Blocking calls in async code  | ✅ **Clean**       | No blocking calls detected                                   |
| Missing type hints            | 🟡 **2 Functions** | Handler functions missing `-> None`                          |
| Global mutable state          | 🟡 **Several**     | `_cache_hits`, `_cache_misses` counters in `verification.py` |
| Tight coupling to frameworks  | 🟡 **1 Instance**  | `AdminService` raises `HTTPException`                        |
| Missing input validation      | ✅ **Fixed**       | Pydantic validates all inputs                                |
| Hardcoded secrets             | ✅ **Clean**       | All secrets from environment variables                       |

### 10.2 🟠 High: Global Mutable State for Cache Statistics

**File:** `apps/bot/services/verification.py`

```python
_cache_hits = 0  # pylint: disable=invalid-name
_cache_misses = 0  # pylint: disable=invalid-name
```

These module-level mutable counters are:

1. Not thread-safe (though less of a concern with asyncio)
2. Duplicating what Prometheus metrics already track
3. Requiring `global` statements (hence the pylint disable)

**Recommendation:** Remove these counters and rely solely on Prometheus metrics:

```python
# Already tracked in metrics.py:
CACHE_HITS_TOTAL = Counter(...)
CACHE_MISSES_TOTAL = Counter(...)

# In verification.py, just use:
record_cache_hit()  # Instead of _cache_hits += 1
```

### 10.3 🟡 Medium: `create_owner` Has Check-Then-Act Race Condition

**File:** `apps/bot/database/crud.py`

```python
async def create_owner(session: AsyncSession, user_id: int, username: str | None = None) -> Owner:
    existing = await get_owner(session, user_id)
    if existing:
        return existing

    owner = Owner(user_id=user_id, username=username)
    session.add(owner)
    await session.commit()
```

Two concurrent calls could both pass the `if existing` check before either commits, causing a unique constraint violation.

**Recommendation:** Use `INSERT ... ON CONFLICT DO NOTHING`:

```python
from sqlalchemy.dialects.postgresql import insert as pg_insert

async def create_owner(...) -> Owner:
    stmt = pg_insert(Owner).values(user_id=user_id, username=username)
    stmt = stmt.on_conflict_do_nothing(index_elements=["user_id"])
    await session.execute(stmt)
    await session.commit()
    return await get_owner(session, user_id)
```

---

## 11. Skill 10: Python Resilience

### 11.1 ✅ What's Done Well — Excellent Implementation

The bot's resilience infrastructure is one of the strongest parts of the codebase:

- **Circuit breaker** — full state machine with CLOSED/OPEN/HALF_OPEN states, configurable thresholds, and recovery timeouts.
- **`@async_retry` decorator** — with exponential backoff, jitter, max delay, and configurable callback.
- **`@circuit_protected` decorator** — wraps functions with circuit breaker protection.
- **`with_fallback`** — graceful degradation pattern (try primary, fall back to secondary).
- **Health tracking** — `get_all_circuit_status()` for monitoring.
- **Bot-specific retry** — `restrict_user()` and `unmute_user()` have inline retry with rate limit handling.

### 11.2 🟠 High: API Has No Retry on Database Operations

While the bot has robust `resilience.py`, the **API has no retry logic for database operations**. If PostgreSQL has a transient connection error, the request fails immediately.

**Recommendation:** Add tenacity retries to critical database operations:

```python
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from sqlalchemy.exc import OperationalError, InterfaceError

DB_RETRY = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=5),
    retry=retry_if_exception_type((OperationalError, InterfaceError)),
)

# Apply to services or the session dependency
```

### 11.3 🟡 Medium: Circuit Breaker Not Thread-Safe

**File:** `apps/bot/utils/resilience.py`

```python
class CircuitBreaker:
    def record_failure(self):
        self._failure_count += 1  # ← Not atomic
        if self._failure_count >= self._failure_threshold:
            self._transition_to(CircuitState.OPEN)
```

While asyncio is single-threaded, if the `CircuitBreaker` is used across multiple tasks that are scheduled concurrently, the increment could be inconsistent. Consider using `asyncio.Lock`:

```python
async def record_failure(self):
    async with self._lock:
        self._failure_count += 1
        if self._failure_count >= self._failure_threshold:
            self._transition_to(CircuitState.OPEN)
```

---

## 12. Skill 11: Python Background Jobs

### 12.1 ✅ What's Done Well

- **Fire-and-forget pattern** — `_publish_event_async()` properly stores task references.
- **Heartbeat service** — Periodic background loop with clean start/stop lifecycle.
- **Event publisher** — Background event publishing for SSE dashboard updates.

### 12.2 🟡 Medium: No Job Queue for Persistent Background Work

The bot uses `asyncio.Task` for fire-and-forget operations (event publishing). This is fine for non-critical tasks, but if the bot crashes:

- Pending event publishes are lost
- No retry for failed publishes

For the current scale, this is acceptable. But if reliability becomes important, consider a lightweight task queue like `arq` (Redis-based) or `taskiq`.

### 12.3 🟡 Medium: `HeartbeatService._heartbeat_loop` Catches All Exceptions

**File:** `apps/bot/services/heartbeat.py`

The heartbeat loop catches exceptions broadly to prevent the background task from dying, but it should distinguish between:

- Expected transient errors (log at WARNING)
- Unexpected errors that indicate bugs (log at ERROR and consider stopping)

---

## 13. Skill 12: Python Observability

### 13.1 ✅ What's Done Well — Strong for Bot

- **Structured logging** — `structlog` configured with environment info, context extraction, JSON format in production.
- **Pre-configured loggers** — `log_user_verified()`, `log_user_restricted()`, etc. for consistent event logging.
- **Context binding** — `LogContext` context manager and `bind_context()` for temporary context.
- **Prometheus metrics** — Comprehensive counters, histograms, and gauges for verifications, cache, API calls, db queries.
- **Sentry integration** — `init_sentry()` for error tracking.
- **Database metrics** — Query duration histograms with `@timed_db_query` decorator.

### 13.2 🟠 High: API Observability Is Weaker Than Bot

| Feature             | Bot                        | API                                         |
| ------------------- | -------------------------- | ------------------------------------------- |
| Structured logging  | ✅ structlog               | ⚠️ Mix of structlog + stdlib                |
| Prometheus metrics  | ✅ Full suite              | ⚠️ Only `prometheus-fastapi-instrumentator` |
| Custom metrics      | ✅ Business-level counters | ❌ None                                     |
| Context propagation | ✅ `LogContext`            | ⚠️ `RequestIDMiddleware` only               |
| Error tracking      | ✅ Sentry                  | ❌ Not configured                           |
| Health checks       | ✅ `/health` endpoint      | ⚠️ Basic only                               |

**Recommendation:** The API should have custom Prometheus counters for:

- Active sessions count
- Bot instance CRUD operations
- Authentication failures
- Webhook test results

### 13.3 🟡 Medium: Missing Correlation ID End-to-End

The API has `RequestIDMiddleware` that generates trace IDs, and the bot has `LogContext`. But there's no correlation between an API request and the bot operations it triggers. When the dashboard triggers a bot action, there's no shared trace ID.

**Recommendation:** Propagate `X-Request-ID` from API to bot via SSE events or direct API calls.

---

## 14. Cross-Cutting Concerns

### 14.1 🟠 High: Session Cleanup Not Implemented

**File:** `apps/api/src/models/session.py`

Sessions have `expires_at` but no cleanup mechanism exists. Over time, expired sessions accumulate in the database.

**Recommendation:** Add a periodic cleanup task:

```python
@app.on_event("startup")  # or in lifespan
async def schedule_session_cleanup():
    async def cleanup_expired_sessions():
        while True:
            async with async_session_factory() as session:
                await session.execute(
                    delete(Session).where(Session.expires_at < datetime.now(UTC))
                )
                await session.commit()
            await asyncio.sleep(3600)  # Every hour

    asyncio.create_task(cleanup_expired_sessions())
```

### 14.2 🟡 Medium: Bot and API Use Separate Database Bases

- **API:** `from src.models.base import Base` — standalone declarative base
- **Bot:** `from apps.bot.core.database import Base` — separate declarative base

If both connect to the same PostgreSQL database, having two `DeclarativeBase` classes means Alembic migrations need to handle both model sets carefully.

### 14.3 🟡 Medium: Encryption Key Shared but Not Validated at Startup

Both API and Bot use `ENCRYPTION_KEY` for Fernet, but neither validates at startup that the key is valid. The API's `get_fernet()` in `core/encryption.py` caches the result, but if the key is invalid, the error only surfaces when encryption is first attempted.

**Recommendation:** Validate encryption key during startup in the `lifespan` function:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Validate critical config
    if settings.ENCRYPTION_KEY:
        try:
            Fernet(settings.ENCRYPTION_KEY.encode())
        except Exception:
            raise SystemExit("Invalid ENCRYPTION_KEY format")
    yield
```

---

## 15. Priority Matrix

### 🔴 Critical — Fix Before Next Deploy

| #   | Issue                                                    | File(s)                | Effort    |
| --- | -------------------------------------------------------- | ---------------------- | --------- |
| 1   | Authentication bypass in dev mode needs production guard | `session.py`           | 2-3 hours |
| 2   | `AdminService` raises HTTPException (wrong layer)        | `admin_service.py`     | 1 hour    |
| 3   | Missing `-> None` return types on handlers               | `verify.py`, `join.py` | 15 min    |

### 🟠 High — Fix This Sprint

| #   | Issue                                            | File(s)                                   | Effort  |
| --- | ------------------------------------------------ | ----------------------------------------- | ------- |
| 4   | Retry decorator doesn't fire (exception masking) | `telegram_api.py`                         | 30 min  |
| 5   | `httpx.AsyncClient` created per-request          | `telegram_api.py`                         | 1 hour  |
| 6   | Module-level singletons                          | `telegram_api.py`, `analytics_service.py` | 2 hours |
| 7   | No session cleanup for expired sessions          | API `models/session.py`                   | 2 hours |
| 8   | API has no DB retry logic                        | API services                              | 2 hours |
| 9   | API observability gaps (metrics, Sentry)         | API middleware                            | 3 hours |
| 10  | Silent error swallowing `except: pass`           | `verify.py`:125                           | 15 min  |
| 11  | Duplicate variable reassignment                  | `join.py`:64                              | 5 min   |

### 🟡 Medium — Fix This Month

| #   | Issue                                                          | File(s)                | Effort  |
| --- | -------------------------------------------------------------- | ---------------------- | ------- |
| 12  | Incomplete test coverage (AdminService, Cache, CircuitBreaker) | `tests/`               | 8 hours |
| 13  | SQLite/PostgreSQL dialect divergence in tests                  | `conftest.py`          | 3 hours |
| 14  | N+1 detection middleware doesn't count queries                 | `db_metrics.py`        | 2 hours |
| 15  | Global mutable cache counters (redundant with Prometheus)      | `verification.py`      | 1 hour  |
| 16  | Missing `__all__` exports                                      | Multiple `__init__.py` | 1 hour  |
| 17  | Check-then-act race in `create_owner`                          | `crud.py`              | 1 hour  |
| 18  | `Any` type in Cache layer                                      | `cache.py`             | 2 hours |
| 19  | Inconsistent logger type (structlog vs stdlib)                 | Multiple files         | 2 hours |
| 20  | `Cache.set` redundant branches                                 | `cache.py`             | 15 min  |
| 21  | Bounded concurrency for multi-channel checks                   | `verification.py`      | 1 hour  |
| 22  | Shared `HttpServiceBase` for HeartbeatService/EventPublisher   | Bot services           | 2 hours |
| 23  | End-to-end correlation IDs (API ↔ Bot)                         | Cross-cutting          | 3 hours |

### 🟢 Low — Backlog

| #   | Issue                                  | File(s)      | Effort  |
| --- | -------------------------------------- | ------------ | ------- |
| 24  | Empty `TYPE_CHECKING` blocks           | Models       | 5 min   |
| 25  | `cast(int, channel.channel_id)` unsafe | `verify.py`  | 15 min  |
| 26  | API versioning strategy documentation  | Docs         | 1 hour  |
| 27  | Repository layer for API services      | API refactor | 4 hours |

---

## 16. Appendix: File-by-File Index

### API Files Reviewed

| File                                   | Lines | Key Findings                                    |
| -------------------------------------- | ----- | ----------------------------------------------- |
| `src/main.py`                          | ~80   | Lifespan ✅, middleware order ✅, Prometheus ✅ |
| `src/core/config.py`                   | ~70   | Pydantic BaseSettings ✅, validators ✅         |
| `src/core/database.py`                 | ~50   | Async engine ✅, session context manager ✅     |
| `src/core/cache.py`                    | 213   | Graceful degradation ✅, redundant branches 🟡  |
| `src/core/encryption.py`               | ~50   | Fernet ✅, proper error handling ✅             |
| `src/core/exceptions.py`               | —     | Exception hierarchy ✅                          |
| `src/core/context.py`                  | —     | ContextVar for trace ID ✅                      |
| `src/models/base.py`                   | 8     | Simple DeclarativeBase ✅                       |
| `src/models/bot_instance.py`           | 94    | Well-typed columns ✅, indexes ✅               |
| `src/models/session.py`                | 87    | Expiry logic ✅, no cleanup 🟠                  |
| `src/models/mixins.py`                 | 68    | SoftDeleteMixin ✅, hybrid_property ✅          |
| `src/services/admin_service.py`        | 78    | HTTPException in service 🔴, no docstrings 🟡   |
| `src/services/bot_instance_service.py` | 298   | Domain exceptions ✅, DI ✅                     |
| `src/services/telegram_api.py`         | 111   | Retry broken 🟠, new client per req 🟠          |
| `src/services/analytics_service.py`    | 360   | Dialect-aware SQL ✅, caching ✅                |
| `src/services/config_service.py`       | 254   | Token masking ✅, upsert ✅                     |
| `src/api/v1/dependencies/session.py`   | 60    | Auth bypass 🔴                                  |
| `src/api/v1/endpoints/auth.py`         | 254   | Telegram widget auth ✅                         |
| `src/api/v1/endpoints/bots.py`         | 226   | Proper exception mapping ✅                     |
| `src/middleware/db_metrics.py`         | 44    | Counter not incremented 🟡                      |
| `src/middleware/rate_limit.py`         | —     | Reviewed outline ✅                             |
| `src/middleware/security.py`           | —     | Reviewed outline ✅                             |
| `src/middleware/audit.py`              | —     | Reviewed outline ✅                             |
| `src/middleware/request_id.py`         | —     | Reviewed outline ✅                             |
| `src/middleware/logging.py`            | —     | Reviewed outline ✅                             |

### Bot Files Reviewed

| File                          | Lines | Key Findings                                  |
| ----------------------------- | ----- | --------------------------------------------- |
| `main.py`                     | ~150  | Windows UTF-8 fix ✅, Sentry ✅               |
| `config.py`                   | ~100  | BotSettings ✅, mode detection ✅             |
| `core/database.py`            | ~80   | Async engine ✅, separate Base 🟡             |
| `core/encryption.py`          | 68    | Fernet decryption ✅, lru_cache ✅            |
| `database/models.py`          | 178   | Well-typed models ✅, indexes ✅              |
| `database/crud.py`            | 192   | Clean CRUD ✅, race condition 🟡              |
| `handlers/verify.py`          | 130   | Error swallowing 🟠, missing return type 🔴   |
| `handlers/events/join.py`     | 117   | Duplicate variable 🟠, missing return type 🔴 |
| `services/verification.py`    | 367   | Protocol ✅, caching ✅, global counters 🟡   |
| `services/protection.py`      | 262   | Retry ✅, Prometheus ✅                       |
| `services/heartbeat.py`       | 284   | Periodic loop ✅, singleton holder ✅         |
| `services/event_publisher.py` | 288   | Background publishing ✅, typed methods ✅    |
| `utils/resilience.py`         | 329   | Circuit breaker ✅, backoff ✅                |
| `utils/metrics.py`            | 418   | Comprehensive Prometheus ✅                   |
| `utils/logging.py`            | 300   | Structlog ✅, pre-configured loggers ✅       |

### Test Files Reviewed

| File                                          | Lines | Coverage                               |
| --------------------------------------------- | ----- | -------------------------------------- |
| `tests/api/conftest.py`                       | 107   | Good fixtures ✅, SQLite limitation 🟡 |
| `tests/bot/conftest.py`                       | 91    | Clean mocks ✅                         |
| `tests/api/unit/test_bot_instance_service.py` | —     | ✅ Exists                              |
| `tests/api/unit/test_encryption.py`           | —     | ✅ Exists                              |
| `tests/api/unit/test_telegram_auth.py`        | —     | ✅ Exists                              |
| `tests/api/integration/test_analytics.py`     | —     | ✅ Exists                              |
| `tests/bot/test_verification.py`              | —     | ✅ Exists                              |
| `tests/bot/test_handlers.py`                  | —     | ✅ Exists                              |
| `tests/bot/test_services.py`                  | —     | ✅ Exists                              |

---

_Report generated by comprehensive backend audit applying all 12 backend skills._  
_Total files reviewed: 40+ | Total findings: 27 | Estimated total fix effort: ~40 hours_
