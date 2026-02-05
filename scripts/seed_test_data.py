"""Generate sample verification data for testing charts.

This is a STANDALONE script that directly creates SQLite records
without importing from the project to avoid circular import issues.

Usage from project root:
    python scripts/seed_test_data.py
"""

import asyncio
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

try:
    import aiosqlite
except ImportError:
    print("❌ aiosqlite not installed. Run: pip install aiosqlite")
    exit(1)


# Use UTC timezone
UTC = timezone.utc


async def seed_verification_data(db_path: Path, days: int = 30) -> int:
    """Seed verification log data for the past N days.

    Args:
        db_path: Path to SQLite database
        days: Number of days of data to generate

    Returns:
        Number of records created
    """
    async with aiosqlite.connect(db_path) as db:
        # Check if verification_log table exists
        cursor = await db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='verification_log'"
        )
        if not await cursor.fetchone():
            print("❌ Table 'verification_log' doesn't exist. Run the API first to create tables.")
            return 0

        # Get existing groups
        cursor = await db.execute("SELECT group_id FROM protected_groups LIMIT 10")
        rows = await cursor.fetchall()
        group_ids = [row[0] for row in rows] if rows else [-1001234567890]

        records_created = 0
        now = datetime.now(UTC)

        # Generate data for each day
        for day_offset in range(days):
            day = now - timedelta(days=day_offset)

            # Generate 10-50 verifications per day (less on older days)
            num_verifications = random.randint(10, 50) if day_offset < 7 else random.randint(5, 20)

            for _ in range(num_verifications):
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
                username = f"user_{random.randint(1000, 9999)}" if random.random() > 0.3 else None

                # Cache hit: 60% of verifications are cached
                cached = 1 if random.random() < 0.60 else 0

                # Latency: faster for cached, slower for API calls
                if cached:
                    latency_ms = random.randint(5, 50)
                else:
                    latency_ms = random.randint(100, 500)

                # Get a channel_id from the database or use a default
                cursor = await db.execute("SELECT channel_id FROM enforced_channels LIMIT 1")
                channel_row = await cursor.fetchone()
                channel_id = channel_row[0] if channel_row else -1001111111111

                await db.execute(
                    """
                    INSERT INTO verification_log 
                    (user_id, group_id, channel_id, status, cached, latency_ms, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (user_id, random.choice(group_ids), channel_id, status, cached, latency_ms, timestamp.isoformat()),
                )
                records_created += 1

        await db.commit()
        return records_created


async def main() -> None:
    """Main entry point."""
    # Find the database
    script_dir = Path(__file__).parent
    project_root = script_dir.parent if script_dir.name == "scripts" else script_dir

    db_path = project_root / "storage" / "data" / "nezuko.db"

    if not db_path.exists():
        print(f"❌ Database not found at: {db_path}")
        print("   Run the API server first to create the database.")
        return

    print("🌱 Seeding verification data...")
    print(f"   Database: {db_path}")

    count = await seed_verification_data(db_path, days=30)

    if count > 0:
        print(f"✅ Created {count} verification log entries")
        print("📊 Charts should now display data!")
        print("")
        print("Next steps:")
        print("  1. Start the API: cd apps/api && uvicorn src.main:app --reload --port 8080")
        print("  2. Start the web: cd apps/web && bun dev")
        print("  3. Open http://localhost:3000/dashboard")


if __name__ == "__main__":
    asyncio.run(main())
