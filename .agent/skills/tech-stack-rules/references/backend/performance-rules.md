## IX. PERFORMANCE & SCALABILITY

### 9.1 Connection Pool Tuning

**MUST**

- Use connection pooling for Database and Redis
- Set `pool_size` (baseline) and `max_overflow` (burst capacity) based on server RAM/CPU
- Set `pool_recycle` to prevent "gone away" errors on stale connections
- Use `NullPool` only for short-lived scripts or migrations that don't benefit from pooling

**DO**

```python
engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,  # Maintain 10 connections always
    max_overflow=20,  # Allow 20 more during burst (total 30)
    pool_recycle=3600,
    pool_pre_ping=True,
)
```

**DO NOT**

```python
# ❌ Default pooling in high-concurrency app
# Default pool_size=5, max_overflow=10; may lock up under 100 req/s

# ❌ Missing nullpool for migrations
# Migration script might keep connection open, blocking database restarts
```

---

### 11.1 Task Holding to Prevent GC

**MUST**

- Keep strong references to background tasks created via `asyncio.create_task()`
- If a task is not referenced, the Python garbage collector may destroy it mid-execution
- Use a `set` to store tasks; remove on completion via `.add_done_callback()`

**DO**

```python
background_tasks = set()

async def schedule_background_job(coro):
    """Safely schedule background task with ref-counting."""
    task = asyncio.create_task(coro)

    # Add to set to keep reference
    background_tasks.add(task)

    # Remove from set when done
    task.add_done_callback(background_tasks.discard)

# In handler
async def handler(update: Update, context: CallbackContext) -> None:
    # Safe: task won't be GC'd even if handler finishes
    await schedule_background_job(long_running_io())
```

**DO NOT**

```python
# ❌ Unreferenced task
async def handler(update, context):
    asyncio.create_task(cleanup())  # Risk of being GC'd!
    return
```

---

### 9.2 Async Bottlenecks & Blocking Calls

**MUST**

- Never call synchronous methods of the Telegram Bot API (`bot.send_message` instead of `await bot.send_message_async`)
- Monitor for slow callbacks using `PYTHONASYNCDEBUG=1`
- Use `asyncio.Semaphore` to limit concurrent outgoing requests to external APIs (prevent OS file descriptor exhaustion)

**DO**

```python
sem = asyncio.Semaphore(10)  # Limit to 10 concurrent requests

async def call_external_api(url):
    async with sem:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as resp:
                return await resp.json()

async def batch_send(messages):
    """Process in parallel but limited."""
    async with asyncio.TaskGroup() as tg:
        for m in messages:
            tg.create_task(call_external_api(m.url))
```

**DO NOT**

```python
# ❌ Unbounded TaskGroup/Gather
# Sending 100,000 HTTP requests in parallel crashes OS (too many open sockets)
await asyncio.gather(*[call_no_limit(url) for url in list_100k])
```
