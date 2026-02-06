# 🗄️ Database Scripts

Database initialization and management scripts.

## Files

### `init.sql`

PostgreSQL initialization script that runs on first Docker container startup.

- Enables `uuid-ossp` extension
- Grants privileges to the `nezuko` user
- Sets database comment

**Note:** Tables are managed by Alembic migrations in `apps/api/alembic/`.

---

### `seed.py` 🌱

Populates the database with fake verification records for testing.

**Purpose:**

- Fill dashboard charts with sample data
- Test analytics endpoints without real users
- Create demo/screenshot data

**Usage:**

```bash
# Via CLI menu: [3] Database → [4] Seed Test Data

# Or directly:
python scripts/db/seed.py                     # Default: 30 days, 20 records/day
python scripts/db/seed.py --days 7            # Only last 7 days
python scripts/db/seed.py --count 50          # 50 records per day
python scripts/db/seed.py --db "postgresql+asyncpg://..." # Custom DB URL
```

**What gets created:**

- Verification log entries with random:
  - User IDs
  - Status (85% verified, 10% restricted, 5% error)
  - Cache hit/miss (60% cache hits)
  - Latency (5-50ms cached, 100-500ms API)
  - Timestamps spread throughout each day

---

## Database Commands

| Task             | CLI Menu  | Direct Command                        |
| ---------------- | --------- | ------------------------------------- |
| Start PostgreSQL | [3] → [1] | `docker start nezuko-postgres`        |
| Stop PostgreSQL  | [3] → [2] | `docker stop nezuko-postgres`         |
| Run Migrations   | [3] → [3] | `cd apps/api && alembic upgrade head` |
| Seed Test Data   | [3] → [4] | `python scripts/db/seed.py`           |

---

## Connection Strings

**Development (Docker):**

```
postgresql+asyncpg://nezuko:nezuko123@localhost:5432/nezuko
```

**SQLite (Fallback):**

```
sqlite+aiosqlite:///./storage/data/nezuko.db
```

---

## Legacy Notes

The following files were removed as deprecated:

- `setup.py` - Replaced by Alembic migrations
- `debug.py` - Not needed with proper .env configuration

---

_See also: `apps/api/alembic/` for migration files_
