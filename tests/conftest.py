"""
Shared test configuration for all Nezuko tests.

Sets up environment variables, pytest markers, and shared fixtures
used across both bot unit tests and integration tests.
"""

import os

import pytest
import pytest_asyncio
from collections.abc import AsyncGenerator

# ── Environment setup (must happen before any app imports) ─────────────────
# Use SQLite in-memory for tests so no real DB connection is needed
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("INSFORGE_DATABASE_URL", "")
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("BOT_TOKEN", "0000000000:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
os.environ.setdefault("ENCRYPTION_KEY", "cWYdiGbzQqgjllPskB7d55feP8dPRTVv98AJh1_sFBg=")
os.environ.setdefault("REDIS_URL", "redis://127.0.0.1:6379/0")


def pytest_configure(config: pytest.Config) -> None:
    """Register custom markers used across the test suite."""
    config.addinivalue_line("markers", "slow: marks tests as slow (use -m 'not slow' to skip)")
    config.addinivalue_line(
        "markers", "integration: marks integration tests that hit real services"
    )
    config.addinivalue_line("markers", "unit: marks pure unit tests (no I/O)")


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator:
    """
    Provide a fresh SQLite in-memory database session for each test.

    Creates all tables before the test, yields the session,
    then closes the engine after. Uses function scope for full isolation.
    """
    from apps.bot.core.database import close_db, get_session, init_db

    await init_db()

    async with get_session() as session:
        yield session

    await close_db()


@pytest.fixture
def sample_group_data() -> dict:
    """Provide sample group data for testing."""
    return {
        "group_id": -1001234567890,
        "title": "Test Group",
        "enabled": True,
        "params": {},
    }


@pytest.fixture
def sample_channel_data() -> dict:
    """Provide sample channel data for testing."""
    return {
        "channel_id": -1009876543210,
        "title": "Test Channel",
        "username": "testchannel",
        "invite_link": None,
    }
