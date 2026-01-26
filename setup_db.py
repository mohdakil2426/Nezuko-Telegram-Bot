#!/usr/bin/env python3
"""
Database setup script for Nezuko Admin Panel.
Creates all required tables in SQLite for development.
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

import aiosqlite


async def setup_database():
    """Create all required tables for the admin panel."""
    db_path = project_root / "nezuko.db"
    print(f"📦 Setting up database: {db_path}")

    async with aiosqlite.connect(db_path) as db:
        # Enable foreign keys
        await db.execute("PRAGMA foreign_keys = ON")

        # =============================================
        # Admin Users table
        # =============================================
        await db.execute("""
            CREATE TABLE IF NOT EXISTS admin_users (
                id TEXT PRIMARY KEY,
                supabase_uid TEXT UNIQUE,
                email TEXT UNIQUE NOT NULL,
                full_name TEXT,
                role TEXT NOT NULL DEFAULT 'viewer',
                is_active INTEGER DEFAULT 1,
                telegram_id INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                last_login TEXT
            )
        """)
        print("  ✅ admin_users table created")

        # =============================================
        # Admin Sessions table
        # =============================================
        await db.execute("""
            CREATE TABLE IF NOT EXISTS admin_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                refresh_token TEXT UNIQUE NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                expires_at TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
            )
        """)
        print("  ✅ admin_sessions table created")

        # =============================================
        # Admin Audit Log table
        # =============================================
        await db.execute("""
            CREATE TABLE IF NOT EXISTS admin_audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                action TEXT NOT NULL,
                entity_type TEXT,
                entity_id TEXT,
                diff_json TEXT,
                ip_address TEXT,
                user_agent TEXT,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE SET NULL
            )
        """)
        print("  ✅ admin_audit_log table created")

        # =============================================
        # Admin Config table
        # =============================================
        await db.execute("""
            CREATE TABLE IF NOT EXISTS admin_config (
                key TEXT PRIMARY KEY,
                value TEXT,
                description TEXT,
                is_sensitive INTEGER DEFAULT 0,
                updated_by TEXT,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✅ admin_config table created")

        # =============================================
        # Admin Logs table (for live log streaming)
        # =============================================
        await db.execute("""
            CREATE TABLE IF NOT EXISTS admin_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                level TEXT NOT NULL,
                logger TEXT,
                message TEXT NOT NULL,
                trace_id TEXT,
                user_id TEXT,
                extra_json TEXT,
                source TEXT
            )
        """)
        print("  ✅ admin_logs table created")

        # =============================================
        # Create indexes for performance
        # =============================================
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_admin_audit_log_timestamp 
            ON admin_audit_log(timestamp)
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_admin_logs_timestamp 
            ON admin_logs(timestamp)
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires 
            ON admin_sessions(expires_at)
        """)
        print("  ✅ Indexes created")

        await db.commit()
        print("\n🎉 Database setup complete!")

        # Show all tables
        cursor = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = await cursor.fetchall()
        print(f"\n📋 Tables in database: {[t[0] for t in tables]}")


if __name__ == "__main__":
    asyncio.run(setup_database())
