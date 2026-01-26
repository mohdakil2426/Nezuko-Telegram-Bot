import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from src.core.config import get_settings


async def test_connection():
    settings = get_settings()
    print(f"Connecting to: {settings.DATABASE_URL.split('@')[1]}")  # Hide credentials

    try:
        engine = create_async_engine(settings.DATABASE_URL)
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            print(f"Connection successful! Result: {result.scalar()}")
    except Exception as e:
        print(f"Connection failed: {e}")


if __name__ == "__main__":
    asyncio.run(test_connection())
