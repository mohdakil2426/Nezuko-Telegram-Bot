"""
API-specific test fixtures.

These fixtures are for testing the FastAPI application endpoints.
They provide test clients and database sessions for API integration tests.
"""

from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Import with try/except to handle different working directories
try:
    from apps.api.src.core.database import get_session
    from apps.api.src.main import app
    from apps.api.src.models import Base
except ImportError:
    from src.core.database import get_session
    from src.main import app
    from src.models import Base


# Use SQLite for testing to avoid messing with real DB
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


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
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def api_session(db_engine) -> AsyncGenerator[AsyncSession]:
    """Provide a database session for API tests."""
    async with TestingSessionLocal() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def client(api_session: AsyncSession) -> AsyncGenerator[AsyncClient]:
    """Provide a test client with database dependency override."""

    async def override_get_session():
        yield api_session

    app.dependency_overrides[get_session] = override_get_session

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()
