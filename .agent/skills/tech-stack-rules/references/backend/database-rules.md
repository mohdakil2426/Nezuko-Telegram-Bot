## IV. DATABASE: SQLALCHEMY 2.0 ASYNC PATTERNS

### 4.1 Engine & Session Configuration

**MUST**

- Use `create_async_engine()` with asyncpg (PostgreSQL) or aiosqlite (SQLite)
- Set `pool_pre_ping=True` to detect stale connections; `pool_recycle=3600` to recycle old connections
- Use `expire_on_commit=False` to keep ORM objects alive after commit
- Never share a single `AsyncSession` across multiple concurrent tasks; always create new session per task

**DO**

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL logging in dev
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_nullpool=False,  # Use connection pool in production
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

async def get_session() -> AsyncSession:
    """Dependency: yields fresh session per request."""
    async with async_session_factory() as session:
        yield session
```

**DO NOT**

```python
# ❌ Sync engine
engine = create_engine("postgresql://...")  # Blocking

# ❌ Shared session across tasks
session = async_session_factory()
await task1_using_session(session)
await task2_using_session(session)  # Concurrent access error

# ❌ Missing pool configuration
engine = create_async_engine(DATABASE_URL)  # Uses defaults; may leak connections
```

---

### 4.2 Transaction Management & Session Lifecycle

**MUST**

- Use `async with session.begin():` for automatic commit on success, rollback on exception
- Explicitly call `await session.commit()` only if NOT using `.begin()` context manager
- Always close session (automatic via `async with session_factory()`)
- For multi-tenant: set `app.current_tenant_id` at session start via SQLAlchemy event listener

**DO**

```python
async def create_user(name: str, tenant_id: int) -> User:
    """Create user within a transaction."""
    async with async_session_factory() as session:
        async with session.begin():
            # Set tenant ID for RLS enforcement
            await session.execute(
                text("SELECT set_config('app.current_tenant_id', :tenant_id, false)"),
                {"tenant_id": str(tenant_id)}
            )

            user = User(name=name, tenant_id=tenant_id)
            session.add(user)
            # Auto-commit on exit, auto-rollback on exception

        return user  # Object detached but data persisted (expire_on_commit=False)

async def batch_update(user_ids: list[int], new_status: str) -> None:
    """Batch update with explicit error handling."""
    async with async_session_factory() as session:
        try:
            async with session.begin():
                stmt = update(User).where(User.id.in_(user_ids)).values(status=new_status)
                await session.execute(stmt)
        except IntegrityError as e:
            await logger.aerror("batch_update_failed", error=str(e))
            raise
```

**DO NOT**

```python
# ❌ Nested transactions without savepoints
async with session.begin():
    ...
    async with session.begin():  # Error: can't nest without SAVEPOINT
        ...

# ❌ Accessing session after context exit
async with session_factory() as session:
    user = User(name="Alice")
    session.add(user)

# Session closed; user is detached
user.name = "Bob"  # This won't persist

# ❌ Manual commit with .begin()
async with session.begin():
    session.add(user)
    await session.commit()  # Double-commit error
```

---

### 4.3 Querying & ORM Patterns

**MUST**

- Use `select()` from sqlalchemy (SQLAlchemy 2.0 style), NOT legacy Query API
- Always `await session.execute()` for async queries
- Use `scalars()` to extract single column or model instances

**DO**

```python
from sqlalchemy import select, update, delete

async def get_user_by_id(user_id: int) -> Optional[User]:
    """Fetch single user."""
    async with async_session_factory() as session:
        stmt = select(User).where(User.id == user_id)
        result = await session.execute(stmt)
        return result.scalars().first()

async def list_users_by_tenant(tenant_id: int, limit: int = 100) -> list[User]:
    """Fetch multiple users."""
    async with async_session_factory() as session:
        stmt = select(User).where(User.tenant_id == tenant_id).limit(limit)
        result = await session.execute(stmt)
        return result.scalars().all()

async def update_user_status(user_id: int, status: str) -> None:
    """Update user."""
    async with async_session_factory() as session:
        async with session.begin():
            stmt = update(User).where(User.id == user_id).values(status=status)
            await session.execute(stmt)
```

**DO NOT**

```python
# ❌ Legacy Query API (removed in SQLAlchemy 2.0)
user = await session.query(User).filter(User.id == 1).first()

# ❌ Forgot await
result = session.execute(stmt)  # Returns coroutine, not result

# ❌ Forgot scalars() for single column
result = await session.execute(select(User.name))
names = result.all()  # Returns [(name,)]; use result.scalars().all()
```

---

### 4.4 Connection Pooling & Multi-Tenancy with Row-Level Security

**MUST**

- Use connection pooling (default `AsyncAdaptedQueuePool`)
- For multi-tenant (shared schema), enforce tenant isolation via PostgreSQL Row-Level Security (RLS)
- Set tenant ID at session start via SQLAlchemy event listener
- Create separate database roles per tenant OR use RLS + pool model

**DO**

```python
from sqlalchemy import event, text
from sqlalchemy.engine.strategies import DefaultExecutionContext

@event.listens_for(AsyncSession, "begin")
async def set_tenant_id(session, transaction, connection):
    """Set tenant ID for RLS on every session.begin()."""
    tenant_id = getattr(session, "tenant_id", None)
    if tenant_id:
        await connection.execute(
            text("SELECT set_config('app.current_tenant_id', :tenant_id, false)"),
            {"tenant_id": str(tenant_id)}
        )

# Usage
async def handler(update: Update, context: CallbackContext) -> None:
    tenant_id = extract_tenant_id(update)  # From JWT, session, etc.

    async with async_session_factory() as session:
        session.tenant_id = tenant_id  # Store on session object
        async with session.begin():
            # RLS policy ensures only tenant_id rows are visible
            stmt = select(User).where(User.tenant_id == tenant_id)
            result = await session.execute(stmt)
            users = result.scalars().all()
```

---

## XII. ALEMBIC MIGRATION BEST PRACTICES

### 12.1 Async Template Setup

**MUST**

- Initialize with `alembic init -t async migrations`.
- Configure `env.py` to use `create_async_engine`.

**DO (env.py snippet)**

```python
async def run_async_migrations():
    connectable = create_async_engine(DATABASE_URL, poolclass=pool.NullPool)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()
```

### 12.2 Sync/Async Methods

**MUST**

- Do NOT perform async operations inside migration `upgrade()` scripts.
- Use `op.execute()` or SQLAlchemy Core (sync-compatible) for structure changes.

```

```
