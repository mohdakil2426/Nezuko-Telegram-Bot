# ⚠️ TEST-ONLY: This module is NOT used in production. All production
# database operations use InsForge REST API via core/insforge_client.py.
# This file exists solely for pytest fixtures using SQLite in-memory.
"""
Async SQLAlchemy database session factory and connection management.

PostgreSQL with Docker is required.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from sqlalchemy.engine.url import make_url
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
    """
    Get or create the async database engine.

    Automatically detects the dialect:
    - SQLite (aiosqlite): uses StaticPool with no connect_args (tests / CI)
    - PostgreSQL (asyncpg): uses connection pool, SSL, and timeouts (production)
    """
    # pylint: disable=global-statement
    global _engine

    if _engine is not None:
        return _engine

    url_obj = make_url(config.database_url)
    is_sqlite = url_obj.get_dialect().name == "sqlite"

    if is_sqlite:
        # SQLite: pool_size / connect_args not supported — use StaticPool so
        # an in-memory DB is shared across the whole session (not per-connection).
        from sqlalchemy.pool import StaticPool  # pylint: disable=import-outside-toplevel

        _engine = create_async_engine(
            url_obj,
            echo=False,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    else:
        # PostgreSQL / asyncpg: strip sslmode from query string, pass via connect_args
        connect_args: dict[str, Any] = {"timeout": 30, "command_timeout": 30}

        if "sslmode" in url_obj.query:
            ssl_mode = url_obj.query["sslmode"]
            new_query = {k: v for k, v in url_obj.query.items() if k != "sslmode"}
            url_obj = url_obj.set(query=new_query)
            if ssl_mode in ("require", "verify-full"):
                connect_args["ssl"] = "require"

        _engine = create_async_engine(
            url_obj,
            echo=config.is_development,
            pool_size=20,
            max_overflow=10,
            pool_timeout=30,
            pool_pre_ping=True,
            pool_recycle=3600,
            connect_args=connect_args,
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
