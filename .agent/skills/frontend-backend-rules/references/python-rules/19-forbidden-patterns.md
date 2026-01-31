# 19. Forbidden Patterns & Anti-Patterns

## ❌ ASYNC ANTI-PATTERNS

| Anti-Pattern | Problem | Correct Approach |
|--------------|---------|------------------|
| `time.sleep()` in async code | Blocks event loop | Use `asyncio.sleep()` |
| Calling sync I/O in async | Blocks event loop | Use `asyncio.to_thread()` or `loop.run_in_executor()` |
| No timeout on `await` | Can hang forever | Always use `asyncio.timeout()` or `asyncio.wait_for()` |
| Catching `CancelledError` and not re-raising | Swallows cancellation | Always re-raise after cleanup |
| Using `asyncio.get_event_loop()` | Deprecated in Python 3.10+ | Use `asyncio.run()` or `asyncio.Runner()` |
| Fire-and-forget tasks without tracking | Tasks may fail silently | Use `TaskGroup` or track with callbacks |
| Mixing sync and async in same codebase | Confusing, hard to maintain | Commit to async-first architecture |

## ❌ FASTAPI ANTI-PATTERNS

| Anti-Pattern | Problem | Correct Approach |
|--------------|---------|------------------|
| Sync route handlers | Thread pool overhead | Always use `async def` |
| Global database session | Concurrency issues | Use per-request dependency |
| No error handling | Crashes go unlogged | Use exception handlers and logging |
| Trusting user input | SQL injection, XSS | Validate with Pydantic |
| No authentication check | Anyone can access | Use `Depends(get_current_user)` |
| Blocking background tasks | Tasks fail silently | Use `BackgroundTasks` or `TaskGroup` with error handling |

## ❌ FIREBASE ANTI-PATTERNS

| Anti-Pattern | Problem | Correct Approach |
|--------------|---------|------------------|
| No tenant filtering | Data leakage across tenants | Always filter by `tenant_id` in queries |
| Sync Firestore API | Blocks event loop | Use async Firestore API |
| Non-atomic multi-document writes | Race conditions | Use transactions |
| Trusting Security Rules alone | Backend bypass possible | Validate tenant in code too |
| Real-time listeners in requests | Requests return before data loads | Use for background sync only |

## ❌ TESTING ANTI-PATTERNS

| Anti-Pattern | Problem | Correct Approach |
|--------------|---------|------------------|
| Tests sharing state | Flaky tests | Use function-scoped fixtures |
| No cleanup after tests | Test pollution | Use `yield` and cleanup in finally |
| Mocking sync functions for async code | Doesn't work | Use `AsyncMock` |
| Testing only happy path | Bugs in error handling | Test error conditions too |
| Slow tests that timeout | CI failures | Use faster fixtures, mocking |

## ❌ PERFORMANCE ANTI-PATTERNS

| Anti-Pattern | Problem | Correct Approach |
|--------------|---------|------------------|
| N+1 queries | Exponential query count | Eager load with `selectinload()` |
| Unbounded cache growth | Memory leak | Set TTL and max size |
| Large file in memory | OOM crashes | Use streaming and chunking |
| No connection pooling | Connection exhaustion | Use `QueuePool` with proper size |
| Polling instead of events | CPU waste | Use JobQueue or WebSockets |
| Retrying non-idempotent operations | Duplicates, inconsistency | Ensure idempotency or use saga pattern |

## ❌ SECURITY ANTI-PATTERNS

| Anti-Pattern | Problem | Correct Approach |
|--------------|---------|------------------|
| Hardcoded secrets | Exposed in git | Load from environment |
| Trusting token without verification | Forged auth | Use `verify_id_token()` |
| No tenant verification | Cross-tenant access | Always check `user.tenant_id` |
| SQL string interpolation | SQL injection | Use parameterized queries |
| Logging secrets | Exposed in logs | Redact sensitive data |
| No rate limiting | Brute force attacks | Use `slowapi` or similar |
| Single-layer auth | Privilege escalation | Use RBAC + permission checks |

## ❌ CODE QUALITY ANTI-PATTERNS

| Anti-Pattern | Problem | Correct Approach |
|--------------|---------|------------------|
| Missing type annotations | No IDE support, runtime errors | Type all functions, parameters, returns |
| Using `Any` type | Hides type errors | Use specific types, generics |
| Ignoring linter warnings | Bugs slip through | Fix all Ruff/Pylint issues |
| No pre-commit hooks | Bad code committed | Enforce checks before commit |
| Outdated Python syntax | Missing improvements | Use Ruff UP rules for upgrades |
| Missing docstrings | Poor maintainability | Use Google/NumPy docstring style |

---

## Summary: Correctness Checklist

**Before deploying any code, verify:**

- [ ] **Async**: Every `await` point is cancellation-safe. Every long operation has timeout.
- [ ] **FastAPI**: All routes are `async def`. All dependencies are `async def`.
- [ ] **Firebase**: Every query filters by `tenant_id`. Tokens verified with `verify_id_token()`.
- [ ] **Errors**: All external calls retry with backoff. Unhandled errors logged to Sentry.
- [ ] **Multi-Tenant**: Tenant ID verified from user claims, not from request. Data isolation tested.
- [ ] **Testing**: Tests isolated, parametrized, cover error paths. No flakiness.
- [ ] **Security**: No secrets in code/logs. No SQL injection. No CSRF. Rate limited.
- [ ] **Performance**: No N+1 queries. Caching with TTL. Connection pools sized. Queries indexed.
- [ ] **Observability**: Structured logging. Metrics exposed. Errors tracked in Sentry.
- [ ] **Type Safety**: All functions typed. Pydantic models for validation. No `Any`.
- [ ] **Code Quality**: Ruff/Pylint pass. No blocking calls in async. Clean architecture.
- [ ] **Scalability**: Stateless. No in-memory state. Load-balanced friendly.
- [ ] **CI/CD**: All checks pass in GitHub Actions. Pre-commit hooks configured.
- [ ] **Type Checking**: Pyrefly/mypy pass. No type errors. All generics properly bounded.

---

## Appendix: Quick Reference

### Ruff Rule Categories

| Category | Code | Description |
|----------|------|-------------|
| pycodestyle | E, W | Style errors and warnings |
| Pyflakes | F | Undefined names, unused imports |
| isort | I | Import sorting |
| flake8-bugbear | B | Bug detection |
| flake8-async | ASYNC | Async/await issues |
| flake8-bandit | S | Security issues |
| flake8-use-pathlib | PTH | Modern path handling |
| pyupgrade | UP | Python upgrade checks |
| Ruff-specific | RUF | Modern Python features |

### Python 3.13+ Type System Features

| Feature | Syntax | Use Case |
|---------|--------|----------|
| TypeVar defaults | `TypeVar("T", default=str)` | Flexible generics |
| Deprecated decorator | `@warnings.deprecated(msg)` | API deprecation |

### Essential Dependencies for Production

```txt
# Core
fastapi>=0.115.0
pydantic>=2.0.0
sqlalchemy[asyncio]>=2.0.0

# Async
httpx>=0.27.0
aioredis>=2.0.0

# Security
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.0
slowapi>=0.1.0

# Observability
structlog>=24.0.0
prometheus-client>=0.20.0
sentry-sdk>=2.0.0

# Testing
pytest>=8.0.0
pytest-asyncio>=0.23.0
pytest-cov>=5.0.0

# Linting & Types
ruff>=0.8.0
pyrefly>=0.1.0
pylint>=3.3.0
```

---

**This guide is authoritative for AI coding tools. Follow every principle. When in doubt, prioritize correctness over speed.**
