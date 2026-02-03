# Spec: Database Schema Updates

## Overview

Database schema additions to support full analytics functionality across Bot, API, and Web.

## ADDED Tables

### Table: api_call_log

**Purpose**: Track all Telegram API calls for API Calls Distribution chart

**Schema**:

```sql
CREATE TABLE api_call_log (
    id SERIAL PRIMARY KEY,
    method VARCHAR(50) NOT NULL,
    chat_id BIGINT,
    user_id BIGINT,
    success BOOLEAN DEFAULT TRUE,
    latency_ms INTEGER,
    error_type VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_api_call_log_method ON api_call_log(method);
CREATE INDEX idx_api_call_log_timestamp ON api_call_log(timestamp);
CREATE INDEX idx_api_call_log_method_timestamp ON api_call_log(method, timestamp);
CREATE INDEX idx_api_call_log_success ON api_call_log(success);
```

**Expected Volume**: ~10,000 rows/day for active bot

**Retention Policy**: Keep 90 days, auto-prune older records

---

## MODIFIED Tables

### Table: protected_groups

**Add Columns**:

```sql
ALTER TABLE protected_groups
ADD COLUMN member_count INTEGER DEFAULT 0;

ALTER TABLE protected_groups
ADD COLUMN last_sync_at TIMESTAMP WITH TIME ZONE;
```

**Column Details**:
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `member_count` | INTEGER | 0 | Current group member count from Telegram |
| `last_sync_at` | TIMESTAMP | NULL | Last successful sync timestamp |

---

### Table: enforced_channels

**Add Columns**:

```sql
ALTER TABLE enforced_channels
ADD COLUMN subscriber_count INTEGER DEFAULT 0;

ALTER TABLE enforced_channels
ADD COLUMN last_sync_at TIMESTAMP WITH TIME ZONE;
```

**Column Details**:
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `subscriber_count` | INTEGER | 0 | Current channel subscriber count from Telegram |
| `last_sync_at` | TIMESTAMP | NULL | Last successful sync timestamp |

---

### Table: verification_log

**Add Column**:

```sql
ALTER TABLE verification_log
ADD COLUMN error_type VARCHAR(50);

CREATE INDEX idx_verification_log_error_type ON verification_log(error_type);
```

**Column Details**:
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `error_type` | VARCHAR(50) | NULL | Error class name (e.g., 'BadRequest', 'ChatNotFound') |

**Error Type Values**:

- `TelegramError` - Generic Telegram API error
- `BadRequest` - Invalid request parameters
- `ChatNotFound` - Chat/User not found
- `Forbidden` - No permission to perform action
- `NetworkError` - Connection timeout/issue
- `RetryAfter` - Rate limit hit
- `NULL` - Success (no error)

---

## Alembic Migration

**Migration File**: `apps/api/alembic/versions/xxx_add_charts_analytics_tables.py`

```python
"""Add charts and analytics tables

Revision ID: xxx
Revises: previous_revision
Create Date: 2026-02-04
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'add_charts_analytics'
down_revision = 'previous_revision'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create api_call_log table
    op.create_table(
        'api_call_log',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('method', sa.String(50), nullable=False),
        sa.Column('chat_id', sa.BigInteger(), nullable=True),
        sa.Column('user_id', sa.BigInteger(), nullable=True),
        sa.Column('success', sa.Boolean(), default=True),
        sa.Column('latency_ms', sa.Integer(), nullable=True),
        sa.Column('error_type', sa.String(50), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_api_call_log_method', 'api_call_log', ['method'])
    op.create_index('idx_api_call_log_timestamp', 'api_call_log', ['timestamp'])
    op.create_index('idx_api_call_log_method_timestamp', 'api_call_log', ['method', 'timestamp'])

    # Add columns to protected_groups
    op.add_column('protected_groups', sa.Column('member_count', sa.Integer(), default=0))
    op.add_column('protected_groups', sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True))

    # Add columns to enforced_channels
    op.add_column('enforced_channels', sa.Column('subscriber_count', sa.Integer(), default=0))
    op.add_column('enforced_channels', sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True))

    # Add error_type to verification_log
    op.add_column('verification_log', sa.Column('error_type', sa.String(50), nullable=True))
    op.create_index('idx_verification_log_error_type', 'verification_log', ['error_type'])


def downgrade() -> None:
    op.drop_index('idx_verification_log_error_type', 'verification_log')
    op.drop_column('verification_log', 'error_type')

    op.drop_column('enforced_channels', 'last_sync_at')
    op.drop_column('enforced_channels', 'subscriber_count')

    op.drop_column('protected_groups', 'last_sync_at')
    op.drop_column('protected_groups', 'member_count')

    op.drop_index('idx_api_call_log_method_timestamp', 'api_call_log')
    op.drop_index('idx_api_call_log_timestamp', 'api_call_log')
    op.drop_index('idx_api_call_log_method', 'api_call_log')
    op.drop_table('api_call_log')
```

---

## Index Strategy

### Query Patterns and Indexes

| Query Pattern                       | Index Required                                           |
| ----------------------------------- | -------------------------------------------------------- |
| Verification distribution (last 7d) | `verification_log(timestamp, status)` ✅ EXISTS          |
| Cache breakdown                     | `verification_log(timestamp, cached)` - composite needed |
| Hourly activity                     | `verification_log(timestamp)` ✅ EXISTS                  |
| Latency distribution                | `verification_log(latency_ms)` - composite needed        |
| Top groups                          | `verification_log(group_id, timestamp)` ✅ EXISTS        |
| API calls by method                 | `api_call_log(method, timestamp)` ✅ NEW                 |
| Bot health queries                  | Multiple indexes ✅ COVERED                              |

### Additional Indexes (Optional - for large scale)

```sql
-- Composite index for cache queries
CREATE INDEX idx_verification_log_timestamp_cached
ON verification_log(timestamp, cached);

-- Composite index for latency queries
CREATE INDEX idx_verification_log_timestamp_latency
ON verification_log(timestamp, latency_ms);
```

---

## Data Consistency

### Shared Schema Requirement

Both `apps/bot/` and `apps/api/` MUST have identical model definitions:

| Model            | Bot Location                      | API Location                       |
| ---------------- | --------------------------------- | ---------------------------------- |
| ProtectedGroup   | `database/models.py`              | `src/models/bot.py`                |
| EnforcedChannel  | `database/models.py`              | `src/models/bot.py`                |
| GroupChannelLink | `database/models.py`              | `src/models/bot.py`                |
| VerificationLog  | `database/verification_logger.py` | `src/models/verification_log.py`   |
| ApiCallLog       | `database/models.py` (NEW)        | `src/models/api_call_log.py` (NEW) |

### Sync Command

After migration, verify both apps can connect:

```bash
# Run from project root
cd apps/api && alembic upgrade head
python -c "from src.models import *; print('API models OK')"

cd ../bot
python -c "from apps.bot.database.models import *; print('Bot models OK')"
```

---

## Production Considerations

### Supabase vs SQLite

| Environment | Database              | Connection String                                                 |
| ----------- | --------------------- | ----------------------------------------------------------------- |
| Development | SQLite                | `sqlite+aiosqlite:///../../storage/data/nezuko.db`                |
| Production  | PostgreSQL (Supabase) | `postgresql+asyncpg://postgres:xxx@xxx.supabase.co:5432/postgres` |

### Migration Strategy

1. **Development**: Run Alembic directly on SQLite
2. **Production**:
   - Apply migration to Supabase via Alembic with PostgreSQL URL
   - Or use Supabase Dashboard SQL editor for manual execution
   - Recommend: Use Alembic for consistency

### Backup Before Migration

```bash
# SQLite
cp storage/data/nezuko.db storage/data/nezuko.db.backup

# Supabase (via pgdump)
pg_dump -h xxx.supabase.co -U postgres -d postgres > backup.sql
```
