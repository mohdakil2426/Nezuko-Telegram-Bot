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
