import asyncio

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import QueuePool

from bot.config import config

print(f"DEBUG: Configured DATABASE_URL: '{config.database_url}'")
print(f"DEBUG: Configured Environment: '{config.environment}'")


async def test_engine():
    try:
        engine = create_async_engine(
            config.database_url,
            echo=config.is_development,
            poolclass=QueuePool,
            pool_size=20,
            max_overflow=10,
            pool_pre_ping=True,
            pool_recycle=3600,
        )
        async with engine.connect():
            print("Successfully connected!")
    except Exception as e:
        print(f"Error creating engine: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_engine())
