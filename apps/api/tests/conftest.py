import pytest
from typing import AsyncGenerator
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from src.main import app
from src.core.database import get_session
from src.models import Base
from src.core.config import get_settings

settings = get_settings()

# Use SQLite for testing to avoid messing with real DB or needing running Postgres
# Or override settings to use a test DB.
# For simplicity in this environment, using sqlite+aiosqlite in memory
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
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    # In SQLite memory, dropping isn't strictly needed as it dies with process, but good practice
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
async def session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        yield session
        # Rollback is important for isolation
        await session.rollback()


@pytest.fixture(scope="function")
async def client(session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Client fixture that overrides the DB dependency."""

    async def override_get_session():
        yield session

    app.dependency_overrides[get_session] = override_get_session

    # Using ASGITransport for newer httpx
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()
