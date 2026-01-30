"""
Shared fixtures for Nezuko tests.

This file provides common fixtures like database sessions that can be used
across different test modules without duplication.
"""

import os

import pytest

# Override database URL for tests to use in-memory SQLite
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def db_session():
    """Fixture to provide a fresh database session for each test."""
    from apps.bot.core.database import close_db, get_session, init_db

    await init_db()

    async with get_session() as session:
        yield session

    await close_db()
