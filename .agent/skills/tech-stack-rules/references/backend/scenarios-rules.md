## XIV. CORRECT VS. WRONG SCENARIOS

### Scenario 1: Database Interaction in Async Handler

**✅ CORRECT**

```python
async def handle_update(update: Update, context: CallbackContext) -> None:
    """Async database fetch."""
    user_id = update.effective_user.id

    async with async_session_factory() as session:
        # 1. Correct await
        # 2. Correct select() API
        stmt = select(User).where(User.id == user_id)
        result = await session.execute(stmt)
        user = result.scalars().first()

        if user:
            # 3. Correct await for reply
            await update.message.reply_text(f"Hello {user.name}")
```

**❌ WRONG**

```python
async def handle_update(update: Update, context: CallbackContext) -> None:
    # 1. WRONG: Using sync session/engine in async app
    session = SessionLocal()

    # 2. WRONG: Legacy Query API (blocking)
    user = session.query(User).filter(User.id == 1).first()

    # 3. WRONG: Missing await for async call
    update.message.reply_text(f"Hello {user.name}")
```

---

### Scenario 2: External API Call with Retries

**✅ CORRECT**

```python
import aiohttp
import asyncio

async def fetch_data(url: str, max_retries: int = 3) -> dict:
    """Correct async retry with backoff."""
    async with aiohttp.ClientSession() as session:
        for i in range(max_retries):
            try:
                # 1. Correct non-blocking fetch
                async with session.get(url, timeout=5) as resp:
                    return await resp.json()
            except (aiohttp.ClientError, asyncio.TimeoutError):
                if i == max_retries - 1:
                    raise
                # 2. Correct non-blocking sleep
                await asyncio.sleep(2 ** i)
```

**❌ WRONG**

```python
import requests
import time

def fetch_data(url):
    # 1. WRONG: Blocking requests call freezes bot
    resp = requests.get(url)

    # 2. WRONG: Blocking sleep freezes bot
    time.sleep(1)
    return resp.json()
```

---

### Scenario 3: Bulk Message Sending

**✅ CORRECT**

```python
async def broadcast(user_ids: list[int], text: str):
    """Broadcasting with TaskGroup and Semaphore."""
    sem = asyncio.Semaphore(25)  # Limit concurrency

    async def send_one(uid):
        async with sem:
            await bot.send_message(chat_id=uid, text=text)

    async with asyncio.TaskGroup() as tg:
        for uid in user_ids:
            # 1. Correct structured concurrency
            tg.create_task(send_one(uid))
```

**❌ WRONG**

```python
async def broadcast(user_ids, text):
    # 1. WRONG: Unbounded gather for huge lists
    tasks = [bot.send_message(id, text) for id in user_ids]
    await asyncio.gather(*tasks) # Potential memory exhaustion
```
