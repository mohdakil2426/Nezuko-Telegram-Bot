"""
API-specific test fixtures.

These fixtures are for testing the FastAPI application endpoints.
They provide test clients and database sessions for API integration tests.

IMPORTANT: This file sets DATABASE_URL BEFORE importing the app to ensure
the app uses the test database.
"""

import os
import sys
from collections.abc import AsyncGenerator
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Add apps/api to path FIRST
_project_root = Path(__file__).resolve().parent.parent.parent
_api_path = _project_root / "apps" / "api"
if str(_api_path) not in sys.path:
    sys.path.insert(0, str(_api_path))

# Set test database URL BEFORE importing the app
# This ensures the app's database module uses the test database
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["ENVIRONMENT"] = "development"
os.environ["MOCK_AUTH"] = "true"

# Now import app modules (after environment is set)
from src.main import app  # noqa: E402
from src.models import Base  # noqa: E402

# Create dedicated test engine and session factory
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test session."""
    import asyncio

    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def db_engine():
    """Create database tables for the test session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield test_engine
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def api_session(db_engine) -> AsyncGenerator[AsyncSession]:
    """Provide a database session for API tests."""
    async with TestingSessionLocal() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def client(db_engine) -> AsyncGenerator[AsyncClient]:
    """
    Provide a test client with database dependency override.

    Uses db_engine to ensure tables are created before making requests.
    Overrides the app's database engine to use the test database.
    """
    # Import the database module and override its engine
    from src.core import database as db_module

    # Save original values
    original_engine = db_module.engine
    original_factory = db_module.async_session_factory

    # Override with test values
    db_module.engine = test_engine
    db_module.async_session_factory = TestingSessionLocal

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

    # Restore original values
    db_module.engine = original_engine
    db_module.async_session_factory = original_factory
