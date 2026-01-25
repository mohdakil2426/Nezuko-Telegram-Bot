import asyncio

from sqlalchemy import text
from src.core.config import get_settings
from src.core.database import async_session_factory


async def test():
    settings = get_settings()
    print(f"DATABASE_URL: {settings.DATABASE_URL}")
    async with async_session_factory() as session:
        try:
            result = await session.execute(text("SELECT 1"))
            print("Database connection successful!")
            print(f"Result: {result.scalar()}")
        except Exception as e:
            print(f"Database connection failed: {e}")


if __name__ == "__main__":
    asyncio.run(test())
