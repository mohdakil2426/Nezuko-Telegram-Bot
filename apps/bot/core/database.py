"""
Async SQLAlchemy database session factory and connection management.

PostgreSQL with Docker is required.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base

from apps.bot.config import config

# Base class for ORM models
Base = declarative_base()

# Global engine instance
_engine: AsyncEngine | None = None  # pylint: disable=invalid-name
_session_factory: async_sessionmaker[AsyncSession] | None = None  # pylint: disable=invalid-name


def get_engine() -> AsyncEngine:
    """Get or create the async database engine."""
    # pylint: disable=global-statement
    global _engine

    if _engine is None:
        # PostgreSQL with connection pooling and timeouts
        _engine = create_async_engine(
            config.database_url,
            echo=config.is_development,
            pool_size=20,  # Max connections in pool
            max_overflow=10,  # Max connections beyond pool_size
            pool_timeout=30,  # Max seconds to wait for connection
            pool_pre_ping=True,  # Verify connections before use
            pool_recycle=3600,  # Recycle connections after 1 hour
            connect_args={"timeout": 30, "command_timeout": 30},
        )

    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Get or create the async session factory."""
    # pylint: disable=global-statement
    global _session_factory

    if _session_factory is None:
        engine = get_engine()
        _session_factory = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,  # Prevent lazy loading issues
            autocommit=False,
            autoflush=False,
        )

    return _session_factory


@asynccontextmanager
async def get_session() -> AsyncGenerator[AsyncSession]:
    """
    Dependency for FastAPI/handlers to get database session.

    Usage:
        async with get_session() as session:
            # Use session here
            pass
    """
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception as exc:
            await session.rollback()
            raise exc from exc


async def init_db():
    """Initialize database (create tables if needed)."""
    # Import models to register them
    import apps.bot.database.models  # noqa: F401 # pylint: disable=unused-import

    engine = get_engine()
    async with engine.begin() as conn:
        # Create all tables (only if they don't exist)
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Close database connections gracefully."""
    # pylint: disable=global-statement
    global _engine, _session_factory

    if _engine:
        await _engine.dispose()
        _engine = None
        _session_factory = None


async def check_db_connectivity() -> bool:
    """
    Check if the database is reachable.

    Returns:
        True if connected, False (or raises Exception) otherwise.
    """
    from sqlalchemy import text  # pylint: disable=import-outside-toplevel

    async with get_session() as session:
        result = await session.execute(text("SELECT 1"))
        result.scalar()
    return True
