# Python 3.13+ Best Practices, Principles & Strict Coding Rules
## For AI Assistance & LLM Coding Tools

**Version:** 1.0  
**Python:** 3.13+ (canonical reference for all async, typing, and stdlib patterns)  
**Last Updated:** January 2026  
**Scope:** Production-grade, async-first, multi-tenant backend systems with FastAPI, Firebase, and python-telegram-bot

---

## TABLE OF CONTENTS

1. [Core Philosophy & Principles](./02-core-philosophy.md)
2. [Async Programming Rules (asyncio, Python 3.13+)](./03-async-programming.md)
3. [FastAPI Async-First Architecture](./04-fastapi-architecture.md)
4. [python-telegram-bot (PTB) Async Handlers & JobQueue](./05-telegram-bot.md)
5. [Firebase Admin SDK Integration](./06-firebase-integration.md)
6. [Error Handling & Retry Strategies](./07-error-handling.md)
7. [Security & Authorization](./08-security.md)
8. [Multi-Tenant Isolation & Data Safety](./09-multi-tenancy.md)
9. [Performance Optimization & Latency](./10-performance.md)
10. [Memory Management & Leak Prevention](./11-memory-management.md)
11. [Observability (Logging, Metrics, Tracing)](./12-observability.md)
12. [Testing Strategy (pytest-asyncio, Isolation)](./13-testing.md)
13. [Type System & Modern Typing (Python 3.13+)](./14-type-system.md)
14. [Configuration & Environment Management](./15-configuration.md)
15. [Code Quality & Linting (Ruff, Pylint)](./16-code-quality.md)
16. [Scalability & Horizontal Scaling](./17-scalability.md)
17. [Clean Architecture & Separation of Concerns](./18-clean-architecture.md)
18. [Forbidden Patterns & Anti-Patterns](./19-forbidden-patterns.md)

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

---

**This guide is authoritative for AI coding tools. Follow every principle. When in doubt, prioritize correctness over speed.**
