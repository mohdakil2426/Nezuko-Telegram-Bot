"""Generate sample verification data for testing charts.

This script seeds the database with test verification records.
Supports both SQLite (development) and PostgreSQL (production).

Usage from project root:
    python scripts/seed_test_data.py
    python scripts/seed_test_data.py --days 7
    python scripts/seed_test_data.py --count 100
"""

import argparse
import asyncio
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Use UTC timezone
UTC = timezone.utc


async def seed_with_sqlalchemy(database_url: str, days: int, records_per_day: int) -> int:
    """Seed data using SQLAlchemy (works with PostgreSQL and SQLite)."""
    try:
        from sqlalchemy import text
        from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
    except ImportError:
        print("❌ SQLAlchemy not installed. Run: pip install sqlalchemy[asyncio]")
        return 0

    # Determine database type
    is_sqlite = "sqlite" in database_url.lower()
    
    # Create engine with appropriate settings
    if is_sqlite:
        engine = create_async_engine(
            database_url, 
            echo=False,
            connect_args={"check_same_thread": False}
        )
    else:
        engine = create_async_engine(
            database_url, 
            echo=False,
            pool_pre_ping=True
        )

    records_created = 0
    now = datetime.now(UTC)

    async with engine.begin() as conn:
        # Check if verification_log table exists
        if is_sqlite:
            result = await conn.execute(text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='verification_log'"
            ))
        else:
            result = await conn.execute(text(
                "SELECT table_name FROM information_schema.tables WHERE table_name='verification_log'"
            ))
        
        if not result.fetchone():
            print("❌ Table 'verification_log' doesn't exist.")
            print("   Run migrations first: cd apps/api && alembic upgrade head")
            return 0

        # Get existing group IDs or use defaults
        try:
            result = await conn.execute(text("SELECT id FROM protected_groups LIMIT 5"))
            rows = result.fetchall()
            group_ids = [row[0] for row in rows] if rows else [1]
        except Exception:
            group_ids = [1]  # Default group ID

        # Get existing channel IDs or use defaults
        try:
            result = await conn.execute(text("SELECT id FROM enforced_channels LIMIT 5"))
            rows = result.fetchall()
            channel_ids = [row[0] for row in rows] if rows else [1]
        except Exception:
            channel_ids = [1]  # Default channel ID

        # Generate data for each day
        print(f"   Generating {days} days of data ({records_per_day} records/day)...")
        
        for day_offset in range(days):
            day = now - timedelta(days=day_offset)

            for _ in range(records_per_day):
                # Random time within the day
                hour = random.randint(0, 23)
                minute = random.randint(0, 59)
                second = random.randint(0, 59)
                timestamp = day.replace(hour=hour, minute=minute, second=second)

                # Status distribution: 85% verified, 10% restricted, 5% error
                roll = random.random()
                if roll < 0.85:
                    status = "verified"
                elif roll < 0.95:
                    status = "restricted"
                else:
                    status = "error"

                # Random user data
                user_id = random.randint(100000000, 999999999)

                # Cache hit: 60% of verifications are cached
                cached = random.random() < 0.60

                # Latency: faster for cached, slower for API calls
                if cached:
                    latency_ms = random.randint(5, 50)
                else:
                    latency_ms = random.randint(100, 500)

                await conn.execute(
                    text("""
                        INSERT INTO verification_log 
                        (user_id, group_id, channel_id, status, cached, latency_ms, timestamp)
                        VALUES (:user_id, :group_id, :channel_id, :status, :cached, :latency_ms, :timestamp)
                    """),
                    {
                        "user_id": user_id,
                        "group_id": random.choice(group_ids),
                        "channel_id": random.choice(channel_ids),
                        "status": status,
                        "cached": cached,
                        "latency_ms": latency_ms,
                        "timestamp": timestamp,
                    }
                )
                records_created += 1

    await engine.dispose()
    return records_created


def get_database_url() -> str:
    """Get database URL from environment or .env file."""
    # Check environment first
    db_url = os.environ.get("DATABASE_URL")
    if db_url:
        return db_url

    # Try to load from apps/api/.env
    env_file = project_root / "apps" / "api" / ".env"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("DATABASE_URL=") and not line.startswith("#"):
                    db_url = line.split("=", 1)[1].strip().strip('"').strip("'")
                    return db_url

    # Default to SQLite
    return f"sqlite+aiosqlite:///{project_root}/storage/data/nezuko.db"


async def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Seed test data for verification charts")
    parser.add_argument("--days", type=int, default=30, help="Number of days to generate (default: 30)")
    parser.add_argument("--count", type=int, default=20, help="Records per day (default: 20)")
    parser.add_argument("--db", type=str, help="Database URL (default: from .env)")
    args = parser.parse_args()

    database_url = args.db or get_database_url()
    
    # Determine database type for display
    if "postgresql" in database_url:
        db_type = "PostgreSQL"
    elif "sqlite" in database_url:
        db_type = "SQLite"
    else:
        db_type = "Unknown"

    print("🌱 Seeding verification test data...")
    print(f"   Database: {db_type}")
    print(f"   Days: {args.days}")
    print(f"   Records/day: {args.count}")
    print()

    try:
        count = await seed_with_sqlalchemy(database_url, args.days, args.count)

        if count > 0:
            print()
            print(f"✅ Created {count} verification log entries")
            print("📊 Charts should now display data!")
            print()
            print("Next steps:")
            print("  1. Start the API: nezuko dev (or option [4] in menu)")
            print("  2. Open http://localhost:3000/dashboard")
        else:
            print()
            print("⚠️  No records created. Check if:")
            print("   - Database is running (PostgreSQL container)")
            print("   - Migrations have been applied (alembic upgrade head)")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
