"""
Async SQLAlchemy database session factory and connection management.
"""

from typing import AsyncGenerator
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
    AsyncEngine
)
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool, QueuePool

from bot.config import config

# Base class for ORM models
Base = declarative_base()

# Global engine instance
_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """Get or create the async database engine."""
    global _engine
    
    if _engine is None:
        # Determine if this is SQLite or PostgreSQL
        is_sqlite = config.DATABASE_URL.startswith("sqlite")
        
        # Configure pooling based on database type
        if is_sqlite:
            # SQLite doesn't support connection pooling well
            _engine = create_async_engine(
                config.DATABASE_URL,
                echo=config.is_development,  # Log SQL in development
                poolclass=NullPool,
                connect_args={"check_same_thread": False}
            )
        else:
            # PostgreSQL with connection pooling
            _engine = create_async_engine(
                config.DATABASE_URL,
                echo=config.is_development,
                poolclass=QueuePool,
                pool_size=20,  # Max connections in pool
                max_overflow=10,  # Max connections beyond pool_size
                pool_pre_ping=True,  # Verify connections before use
                pool_recycle=3600,  # Recycle connections after 1 hour
            )
    
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Get or create the async session factory."""
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
async def get_session() -> AsyncGenerator[AsyncSession, None]:
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
        except Exception:
            await session.rollback()
            raise


async def init_db():
    """Initialize database (create tables if needed)."""
    from bot.database import models  # Import models to register them
    
    engine = get_engine()
    async with engine.begin() as conn:
        # Create all tables (only if they don't exist)
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Close database connections gracefully."""
    global _engine, _session_factory
    
    if _engine:
        await _engine.dispose()
        _engine = None
        _session_factory = None
