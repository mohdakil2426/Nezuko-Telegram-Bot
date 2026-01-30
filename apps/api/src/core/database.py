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

# Determine if using SQLite
_IS_SQLITE = "sqlite" in settings.DATABASE_URL.lower()

# Build engine kwargs based on database type
_engine_kwargs: dict[str, Any] = {
    "echo": settings.API_DEBUG,
    "future": True,
}

if _IS_SQLITE:
    # SQLite-specific settings (no pooling, no SSL)
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # PostgreSQL-specific settings
    _engine_kwargs.update(
        {
            "pool_size": 20,
            "max_overflow": 10,
            "pool_timeout": 30,
            "pool_recycle": 1800,
            "pool_pre_ping": True,
        }
    )
    # Only use SSL for remote PostgreSQL (not localhost)
    if "localhost" not in settings.DATABASE_URL:
        _engine_kwargs["connect_args"] = {"ssl": "require"}

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
