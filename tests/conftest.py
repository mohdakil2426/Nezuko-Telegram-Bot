"""
Shared fixtures for Nezuko tests.

This file provides common fixtures like database sessions, sample data,
and test clients that can be used across different test modules.

Following Python Testing Patterns skill best practices:
- Use fixtures for setup/teardown
- Proper fixture scopes (function, module, session)
- Parametrized fixtures for multi-database testing
"""

import os
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio

# Override database URL for tests to use in-memory SQLite
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["ENVIRONMENT"] = "development"  # Valid: development, staging, production
os.environ["MOCK_AUTH"] = "true"


# Configure pytest-asyncio
def pytest_configure(config: pytest.Config) -> None:
    """Register custom markers."""
    config.addinivalue_line("markers", "slow: marks tests as slow")
    config.addinivalue_line("markers", "integration: marks integration tests")
    config.addinivalue_line("markers", "unit: marks unit tests")


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator:
    """Fixture to provide a fresh database session for each test.

    Creates tables before test, yields session, then cleans up.
    Uses function scope for test isolation.
    """
    from apps.bot.core.database import close_db, get_session, init_db

    await init_db()

    async with get_session() as session:
        yield session

    await close_db()


@pytest.fixture
def sample_user_data() -> dict:
    """Provide sample user data for testing."""
    return {
        "id": 1,
        "email": "test@example.com",
        "full_name": "Test User",
        "role": "viewer",
        "is_active": True,
    }


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


@pytest.fixture
def mock_telegram_context(mocker):
    """Provide a mock Telegram context for testing handlers."""
    context = mocker.MagicMock()
    context.bot = mocker.AsyncMock()
    context.bot.get_chat_member = mocker.AsyncMock()
    return context


@pytest.fixture
def mock_update(mocker):
    """Provide a mock Telegram update for testing handlers."""
    update = mocker.MagicMock()
    update.effective_user = mocker.MagicMock()
    update.effective_user.id = 12345
    update.effective_user.username = "testuser"
    update.effective_chat = mocker.MagicMock()
    update.effective_chat.id = -1001234567890
    update.callback_query = mocker.AsyncMock()
    return update
