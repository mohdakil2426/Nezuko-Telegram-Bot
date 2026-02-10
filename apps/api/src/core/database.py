"""SQLAlchemy database connection and session management."""

from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from .config import get_settings

settings = get_settings()

# PostgreSQL connection pooling configuration
_engine_kwargs: dict[str, Any] = {
    "echo": settings.API_DEBUG,
    "future": True,
    "pool_size": 20,
    "max_overflow": 10,
    "pool_timeout": 30,
    "pool_recycle": 1800,
    "pool_pre_ping": True,
    "connect_args": {"timeout": 30, "command_timeout": 30},
}

# Use SSL for remote PostgreSQL (detect localhost variants)
_db_url_lower = settings.DATABASE_URL.lower()
_is_local = any(
    host in _db_url_lower for host in ["localhost", "127.0.0.1", "::1", "localhost.localdomain"]
)
if not _is_local:
    _engine_kwargs["connect_args"]["ssl"] = "require"

# Create Async Engine
engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs)

# Create Async Session Factory
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_session() -> AsyncIterator[AsyncSession]:
    """
    FastAPI dependency to get a database session.

    Usage:
        @router.get("/items")
        async def list_items(session: AsyncSession = Depends(get_session)):
            result = await session.execute(select(Item))
            return result.scalars().all()

    Note:
        - Session auto-commits on successful request completion
        - Rolls back on any exception
        - Always closes the session
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()  # Commit on success
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
