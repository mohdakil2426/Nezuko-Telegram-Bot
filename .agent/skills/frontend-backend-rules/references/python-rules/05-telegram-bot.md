# python-telegram-bot (PTB) Async Handlers & JobQueue

## Async Handlers (Required for v21+)

**RULE: All handlers are async-first. PTB v21+ expects `async def` handlers exclusively.**

```python
# ✅ CORRECT: Async handler for /start command
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    user_id = update.effective_user.id
    logger.info("User started bot", extra={"user_id": user_id})
    
    # Async database operation
    user = await db.get_user(user_id)
    if not user:
        user = await db.create_user(user_id)
    
    await update.message.reply_text(
        f"Welcome, {user.name}!",
        reply_markup=ReplyKeyboardMarkup([["Send Location"]])
    )
    return LOCATION_STATE

# ❌ WRONG: Sync handler (v21+ does not support this)
def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    user_id = update.effective_user.id
    # Old style—incompatible with v21+

# ❌ WRONG: Blocking operations in async handler
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    time.sleep(2)  # BLOCKS EVENT LOOP
    user = db.get_user(update.effective_user.id)  # Blocking DB call
    await update.message.reply_text("Hi!")
```

## Error Handling in Handlers

**RULE: Wrap handler code in try-except. Unhandled exceptions crash the handler but not the dispatcher.**

```python
# ✅ CORRECT: Error handling with fallback
async def message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    try:
        user_id = update.effective_user.id
        text = update.message.text
        
        # Process message
        response = await process_user_message(user_id, text)
        await update.message.reply_text(response)
    except ValueError as e:
        logger.warning("Invalid message", exc_info=e, extra={"user_id": update.effective_user.id})
        await update.message.reply_text("Sorry, I didn't understand that.")
    except Exception as e:
        logger.error("Handler error", exc_info=e, extra={"user_id": update.effective_user.id})
        await update.message.reply_text("An error occurred. Please try again later.")

# ❌ WRONG: No error handling
async def message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    response = await process_user_message(update.effective_user.id, update.message.text)
    await update.message.reply_text(response)
    # Exception crashes handler

# ❌ WRONG: Catching all exceptions silently
async def message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    try:
        response = await process_user_message(...)
        await update.message.reply_text(response)
    except Exception:
        pass  # Silent failure—no observability
```

## JobQueue for Scheduled Tasks

**RULE: Use `JobQueue` for repeating or delayed tasks. Proper async callback signature is mandatory.**

```python
# ✅ CORRECT: Async job callback with proper signature
async def send_reminder(context: ContextTypes.DEFAULT_TYPE) -> None:
    job = context.job
    user_id = job.chat_id  # Store context in job metadata
    logger.info("Sending reminder", extra={"user_id": user_id})
    
    try:
        await context.bot.send_message(
            chat_id=user_id,
            text="This is your reminder!"
        )
    except Exception as e:
        logger.error("Reminder send failed", exc_info=e, extra={"user_id": user_id})

# Register repeating job
@app.post("/schedule-reminder")
async def schedule_reminder(request: ScheduleRequest, context_data: ContextData):
    job_queue = context_data.job_queue
    user_id = request.user_id
    
    # Schedule job with proper metadata
    job = job_queue.run_repeating(
        send_reminder,
        interval=3600,  # Every hour
        first=60,  # Start after 60 seconds
        chat_id=user_id,
        name=f"reminder_{user_id}"
    )
    logger.info("Reminder scheduled", extra={"user_id": user_id, "job_id": job.id})
    return {"status": "scheduled"}

# ✅ CORRECT: One-time job with delay
async def send_verification_email(context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = context.job.chat_id
    await email_service.send_verification(user_id)

job_queue.run_once(
    send_verification_email,
    when=5.0,  # Seconds from now
    chat_id=user_id
)

# ❌ WRONG: Missing async in callback
def send_reminder(context: ContextTypes.DEFAULT_TYPE) -> None:  # Not async
    context.bot.send_message(...)  # Can't await

# ❌ WRONG: Blocking operations in job callback
async def send_reminder(context: ContextTypes.DEFAULT_TYPE) -> None:
    time.sleep(5)  # BLOCKS EVENT LOOP
    await context.bot.send_message(...)

# ❌ WRONG: Job without metadata for context
job_queue.run_repeating(send_reminder, interval=3600)
# In callback: How do you know which user this is for?
```

## Conversation Handler States

**RULE: Always use `return` statements to indicate state transitions. Handle cancellation explicitly.**

```python
# ✅ CORRECT: State machine with proper cancellation
LOCATION_STATE, CONFIRMATION_STATE = range(2)

async def location_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    user_location = update.message.location
    context.user_data["location"] = {
        "latitude": user_location.latitude,
        "longitude": user_location.longitude,
    }
    await update.message.reply_text("Confirm this location?", reply_markup=confirm_keyboard)
    return CONFIRMATION_STATE

async def confirmation_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    if update.message.text == "Yes":
        user_id = update.effective_user.id
        location = context.user_data["location"]
        await db.update_user_location(user_id, location)
        await update.message.reply_text("Location saved!")
        return ConversationHandler.END
    else:
        await update.message.reply_text("Cancelled.")
        return ConversationHandler.END

async def cancel_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    logger.info("Conversation cancelled", extra={"user_id": update.effective_user.id})
    await update.message.reply_text("Cancelled.")
    return ConversationHandler.END

conv_handler = ConversationHandler(
    entry_points=[CommandHandler("start", start)],
    states={
        LOCATION_STATE: [MessageHandler(filters.LOCATION, location_handler)],
        CONFIRMATION_STATE: [MessageHandler(filters.TEXT, confirmation_handler)],
    },
    fallbacks=[CommandHandler("cancel", cancel_handler)],
)

# ❌ WRONG: No state transition return
async def location_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["location"] = update.message.location
    await update.message.reply_text("Confirm?")
    # Forgot return—state doesn't advance

# ❌ WRONG: No cancellation handler
conv_handler = ConversationHandler(
    entry_points=[CommandHandler("start", start)],
    states={...},
    fallbacks=[],  # No fallback to handle /cancel
)
```

---

[← Back to FastAPI Architecture](./04-fastapi-architecture.md) | [Next: Firebase Integration →](./06-firebase-integration.md)
