# Core Philosophy & Principles

## The Async-First Mindset

**Principle:** All I/O-bound code must be async. No exceptions.

- The event loop is your most precious resource. Block it, and you block everything.
- FastAPI trusts you to only perform non-blocking I/O in `async` routes and handlers.
- If you need to call blocking code, isolate it in `asyncio.to_thread()` or `loop.run_in_executor()`.
- Async is not optional—it is the baseline for correctness at scale.

## Explicit Over Implicit

- Type every parameter and return value using `typing` module annotations.
- Every async function must clearly document what it blocks on (database, API, file, etc.).
- Every dependency must state what it requires (database session, authentication context, tenant ID).
- Cancellation safety is not a bonus—it's mandatory. Code every coroutine as if cancellation can happen at any moment.

## Safety at Scale

- Multi-tenancy requires constant vigilance. Query filters are not optional—they are contractual.
- Authentication is per-operation, not per-session. Every operation must re-verify permissions.
- Secrets are never logged, cached in memory longer than necessary, or sent in URLs.
- Timeouts are not optional. Every external call must have a timeout.

## Correctness First, Performance Second

- Use profilers, not intuition. `cProfile` and `py-spy` are your friends.
- Premature optimization creates bugs. Measure first.
- But know the asymptotic complexity of your code. O(n²) queries over million-row datasets are not acceptable.
- Redis is a cache, not a database. It must gracefully degrade if Redis is down.

---

[← Back to Overview](./01-overview.md) | [Next: Async Programming →](./03-async-programming.md)
