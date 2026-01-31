# FastAPI Async-First Architecture

## Async Route Handlers (Mandatory)

**RULE: Every route handler must be `async def`. No sync handlers in production.**

FastAPI can technically accept sync handlers (it runs them in a thread pool), but:
- Thread pool exhaustion is a real risk.
- Debugging blocking code in thread pools is painful.
- You lose the performance benefits of async concurrency.

```python
# ✅ CORRECT: Async handler
@app.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await db.execute(select(User).where(User.id == user_id))
    return user.scalar_one_or_none()

# ❌ WRONG: Sync handler (thread pool overhead)
@app.get("/users/{user_id}")
def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = db.execute(select(User).where(User.id == user_id))
    return user.scalar_one_or_none()

# ❌ WRONG: Mixing sync and async in same handler
@app.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    cache_value = redis.get(f"user:{user_id}")  # Blocking (unless using aioredis)
    user = await db.execute(select(User).where(User.id == user_id))
    return user
```

## Async Dependencies

**RULE: All dependencies must be `async def`. Use `@app.dependency()` or `Depends()` correctly.**

```python
# ✅ CORRECT: Async dependency
async def get_current_user(
    token: str = Depends(oauth2_scheme)
) -> User:
    user = await auth_service.verify_token(token)
    if not user:
        raise HTTPException(status_code=401)
    return user

@app.get("/profile")
async def get_profile(user: User = Depends(get_current_user)):
    return user

# ❌ WRONG: Sync dependency (thread pool overhead)
def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    user = auth_service.verify_token(token)  # Blocking
    if not user:
        raise HTTPException(status_code=401)
    return user

# ❌ WRONG: Not properly awaiting in dependency
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    # Forgot to await!
    user = auth_service.verify_token(token)
    return user
```

## Background Tasks

**RULE: Use `BackgroundTasks` or `asyncio.create_task()` with proper error handling. Never fire-and-forget without tracking.**

```python
# ✅ CORRECT: BackgroundTasks with tracking
@app.post("/send-email")
async def send_email(email_request: EmailRequest, background_tasks: BackgroundTasks):
    # Validate request first
    if not validate_email(email_request.to):
        raise HTTPException(status_code=400, detail="Invalid email")
    
    # Add to background tasks
    background_tasks.add_task(send_email_async, email_request.to, email_request.body)
    return {"status": "queued"}

async def send_email_async(to: str, body: str):
    try:
        await email_service.send(to, body)
        logger.info("Email sent", extra={"to": to})
    except Exception as e:
        logger.error("Email send failed", exc_info=e, extra={"to": to})
        # Consider retry logic here

# ✅ CORRECT: asyncio.create_task() with proper cleanup
async def process_request(request: Request):
    result = await process_core(request)
    # Fire background task but track it for shutdown
    task = asyncio.create_task(send_analytics(request))
    # Store in app state for cleanup on shutdown
    if not hasattr(app.state, "background_tasks"):
        app.state.background_tasks = set()
    app.state.background_tasks.add(task)
    task.add_done_callback(app.state.background_tasks.discard)
    return result

# ❌ WRONG: Fire-and-forget without error handling
@app.post("/send-email")
async def send_email(email_request: EmailRequest):
    asyncio.create_task(send_email_async(email_request.to, email_request.body))
    return {"status": "sent"}
    # Task may fail silently; no observability

# ❌ WRONG: Sync background task
@app.post("/process")
async def process(data: dict, background_tasks: BackgroundTasks):
    background_tasks.add_task(slow_blocking_operation, data)  # Blocks thread pool
    return {"status": "processing"}
```

## Startup & Shutdown Events

**RULE: Use lifespan context manager (FastAPI 0.93+) instead of deprecated events.**

```python
# ✅ CORRECT: Lifespan context manager (FastAPI 0.93+)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up")
    redis = await init_redis()
    firebase = init_firebase()
    app.state.redis = redis
    app.state.firebase = firebase
    
    yield
    
    # Shutdown
    logger.info("Shutting down")
    await redis.close()
    # Allow pending tasks to complete gracefully
    await asyncio.sleep(0.1)

app = FastAPI(lifespan=lifespan)

# ❌ WRONG: Deprecated @app.on_event()
@app.on_event("startup")
async def startup():
    app.state.redis = await init_redis()

@app.on_event("shutdown")
async def shutdown():
    await app.state.redis.close()
```

## Error Handling in Routes

**RULE: Use `HTTPException` for client errors. Use exception handlers for server errors with proper logging.**

```python
# ✅ CORRECT: Proper error handling with context
@app.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    if user_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    try:
        user = await db.execute(select(User).where(User.id == user_id))
        if not user.scalar():
            raise HTTPException(status_code=404, detail="User not found")
        return user.scalar()
    except asyncio.TimeoutError:
        logger.error("Database query timeout", extra={"user_id": user_id})
        raise HTTPException(status_code=503, detail="Service unavailable")
    except Exception as e:
        logger.error("Unexpected error", exc_info=e, extra={"user_id": user_id})
        raise HTTPException(status_code=500, detail="Internal server error")

# ✅ CORRECT: Global exception handler
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    logger.error("Validation error", exc_info=exc)
    return JSONResponse(
        status_code=400,
        content={"detail": "Invalid request"},
    )

# ❌ WRONG: Unhandled exceptions
@app.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await db.execute(select(User).where(User.id == user_id))
    return user.scalar()  # May return None without error; no logging

# ❌ WRONG: Generic exception handler
@app.exception_handler(Exception)
async def generic_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": "Error"})
    # No logging; no context
```

## Request Context & Isolation

**RULE: Every request must be isolated. Use request-scoped dependencies for databases, auth, and tenants.**

```python
# ✅ CORRECT: Request-scoped dependency
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

@app.get("/users")
async def list_users(db: AsyncSession = Depends(get_db_session)):
    # Each request gets a unique session
    users = await db.execute(select(User))
    return users.scalars().all()

# ❌ WRONG: Global session (not request-scoped)
global_session = AsyncSessionLocal()

@app.get("/users")
async def list_users():
    users = await global_session.execute(select(User))
    return users.scalars().all()
    # All requests share the same session—concurrency issues
```

## FastAPI with Multiple Workers

**RULE: Every worker must independently initialize services. Shared state across workers is dangerous.**

```python
# ✅ CORRECT: Each Uvicorn worker initializes independently
@asynccontextmanager
async def lifespan(app: FastAPI):
    # This runs once per worker
    logger.info(f"Worker starting")
    app.state.firebase = init_firebase()  # Fresh instance per worker
    yield
    logger.info(f"Worker shutting down")

app = FastAPI(lifespan=lifespan)

# ❌ WRONG: Shared service across workers
firebase = init_firebase()  # Runs once at module import

@app.get("/data")
async def get_data():
    return await firebase.db.get()  # All workers share same Firebase instance
```

---

[← Back to Async Programming](./03-async-programming.md) | [Next: Telegram Bot →](./05-telegram-bot.md)
