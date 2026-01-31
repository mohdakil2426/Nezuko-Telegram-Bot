# Async Programming Rules (asyncio, Python 3.13+)

## Task Creation & Lifecycle

**RULE: Prefer `asyncio.TaskGroup` (Python 3.11+) over manual task management.**

```python
# ✅ CORRECT (Python 3.11+): Use TaskGroup for automatic cancellation propagation
async def process_multiple_requests(request_ids: list[int]) -> list[Result]:
    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(fetch_request(rid)) for rid in request_ids]
    # All tasks are awaited here; exceptions are aggregated
    return [task.result() for task in tasks]

# ❌ WRONG: Manual gather() without structured concurrency
tasks = [asyncio.create_task(fetch_request(rid)) for rid in request_ids]
results = await asyncio.gather(*tasks, return_exceptions=True)  # Hard to cancel properly
```

**Why:** TaskGroup (PEP 492) provides **exception safety**, **automatic cancellation**, and **proper exception aggregation**. Manual task creation is error-prone—developers often forget to handle cancellation or exception propagation correctly.

## Cancellation Safety (Python 3.13 Improvements)

**RULE: Every `await` is a cancellation point. Every coroutine must be cancellation-safe.**

In Python 3.13, the asyncio cancellation model improved:

- `Task.uncancel()` now correctly rescind pending cancellation requests when `cancelling()` reaches zero.
- External cancellation collisions with internal cancellation are handled correctly in nested TaskGroups.
- You must still handle `asyncio.CancelledError` explicitly.

```python
# ✅ CORRECT: Handle cancellation explicitly
async def long_running_task():
    try:
        while True:
            await asyncio.sleep(1)
            await do_work()
    except asyncio.CancelledError:
        # Cleanup MUST happen here
        await cleanup_resources()
        raise  # Re-raise to signal cancellation to parent

# ❌ WRONG: Swallow cancellation silently
async def long_running_task():
    try:
        while True:
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        pass  # Silent swallowing—never acceptable
```

**RULE: Use context managers to guarantee cleanup, even if cancellation occurs.**

```python
# ✅ CORRECT: Use async context managers for guaranteed cleanup
async def safe_db_operation(session: AsyncSession):
    async with session.begin_nested() as savepoint:
        try:
            await session.execute(update_stmt)
        except asyncio.CancelledError:
            # Savepoint context manager handles rollback
            raise

# ❌ WRONG: Manual cleanup that may not run
async def unsafe_db_operation(session: AsyncSession):
    await session.execute(update_stmt)
    await session.commit()  # May not run if cancelled before this line
```

## Exception Aggregation in TaskGroups

**RULE: `TaskGroup` automatically collects exceptions. Handle `ExceptionGroup` explicitly.**

```python
# ✅ CORRECT: Handle ExceptionGroup from TaskGroup
async def parallel_operations():
    try:
        async with asyncio.TaskGroup() as tg:
            tg.create_task(operation_a())
            tg.create_task(operation_b())
            tg.create_task(operation_c())
    except ExceptionGroup as eg:
        for exc in eg.exceptions:
            if isinstance(exc, TimeoutError):
                logger.warning("Operation timed out")
            elif isinstance(exc, ValueError):
                logger.error("Invalid value provided", exc_info=exc)
            else:
                raise

# ❌ WRONG: Using gather with return_exceptions (less safe)
results = await asyncio.gather(
    operation_a(), operation_b(), operation_c(),
    return_exceptions=True  # Exceptions are buried in results
)
```

## Waiting for Multiple Tasks

**RULE: Use `asyncio.TaskGroup` or `asyncio.wait()` with `return_when=asyncio.FIRST_COMPLETED` only when necessary.**

```python
# ✅ CORRECT: TaskGroup when all tasks must complete
async def fetch_all_required_data():
    async with asyncio.TaskGroup() as tg:
        user_task = tg.create_task(fetch_user(user_id))
        profile_task = tg.create_task(fetch_profile(user_id))
    return user_task.result(), profile_task.result()

# ✅ CORRECT: wait() with FIRST_COMPLETED for timeout handling
async def fetch_with_timeout():
    done, pending = await asyncio.wait(
        [asyncio.create_task(fetch_user_data())],
        timeout=5.0,
        return_when=asyncio.FIRST_COMPLETED
    )
    for task in pending:
        task.cancel()  # Cancel remaining tasks
    return done.pop().result()

# ❌ WRONG: gather() without explicit timeout handling
await asyncio.gather(fetch_user_data(), timeout=5.0)  # No timeout parameter
```

## Event Loop Interaction

**RULE: Never call blocking functions inside async code. Use `asyncio.to_thread()` or `loop.run_in_executor()`.**

```python
# ✅ CORRECT: Delegate blocking work to thread pool
async def fetch_and_compress(user_id: int):
    user_data = await fetch_user(user_id)
    # CPU-bound task—run in thread pool
    compressed = await asyncio.to_thread(gzip.compress, user_data.encode())
    return compressed

# ❌ WRONG: CPU-bound work blocking the event loop
async def fetch_and_compress(user_id: int):
    user_data = await fetch_user(user_id)
    compressed = gzip.compress(user_data.encode())  # BLOCKS EVENT LOOP
    return compressed

# ❌ WRONG: time.sleep() in async code
async def wait_then_process():
    time.sleep(5)  # BLOCKS EVENT LOOP
    return await process()
```

**RULE: Use `asyncio.sleep()`, never `time.sleep()`.**

```python
# ✅ CORRECT: asyncio.sleep yields control to event loop
async def retry_with_backoff():
    for attempt in range(3):
        try:
            return await fetch_api()
        except Exception:
            if attempt < 2:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff

# ❌ WRONG: time.sleep blocks event loop
async def retry_with_backoff():
    for attempt in range(3):
        try:
            return await fetch_api()
        except Exception:
            if attempt < 2:
                time.sleep(2 ** attempt)  # BLOCKS FOR ALL CONCURRENT TASKS
```

## Proper Coroutine Wrapping

**RULE: Async context managers and async iterators must be properly typed and implemented.**

```python
# ✅ CORRECT: Async context manager with proper cleanup
class AsyncDatabaseConnection:
    async def __aenter__(self):
        self.conn = await create_connection()
        return self.conn
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.conn.close()

async def query_database():
    async with AsyncDatabaseConnection() as conn:
        return await conn.execute("SELECT * FROM users")

# ❌ WRONG: Regular context manager used with async code
class SyncDatabase:
    def __enter__(self):
        self.conn = create_connection()  # Blocking
        return self.conn
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.conn.close()  # Blocking
```

## Asyncio Timeouts

**RULE: Always use `asyncio.timeout()` (Python 3.11+) or `asyncio.wait_for()`. Never retry without timeout.**

```python
# ✅ CORRECT: Explicit timeout with context manager (Python 3.11+)
async def fetch_with_timeout(user_id: int):
    try:
        async with asyncio.timeout(5.0):
            return await fetch_user(user_id)
    except asyncio.TimeoutError:
        logger.error("Fetch timed out", extra={"user_id": user_id})
        raise

# ✅ CORRECT: wait_for also acceptable
async def fetch_with_timeout(user_id: int):
    try:
        return await asyncio.wait_for(fetch_user(user_id), timeout=5.0)
    except asyncio.TimeoutError:
        logger.error("Fetch timed out")
        raise

# ❌ WRONG: No timeout
async def fetch_without_timeout(user_id: int):
    return await fetch_user(user_id)  # Can hang forever

# ❌ WRONG: Catching TimeoutError without proper logging
async def fetch_with_silent_timeout(user_id: int):
    try:
        return await asyncio.wait_for(fetch_user(user_id), timeout=5.0)
    except asyncio.TimeoutError:
        return None  # Silent failure—no observability
```

## Event Loop Policy (Python 3.13 considerations)

**RULE: Use default event loop policy. Only use custom policies in specialized scenarios (e.g., Windows, GUI frameworks).**

```python
# ✅ CORRECT: Use default asyncio.run() for main entry point
async def main():
    result = await process_request()
    return result

if __name__ == "__main__":
    result = asyncio.run(main())

# ❌ WRONG: Manually getting event loop (Python 3.10+ anti-pattern)
if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    result = loop.run_until_complete(main())
    loop.close()
```

---

[← Back to Core Philosophy](./02-core-philosophy.md) | [Next: FastAPI Architecture →](./04-fastapi-architecture.md)
