# Change: Migrate Full Stack to Firebase Firestore

## Why

The current architecture uses PostgreSQL/SQLite with SQLAlchemy ORM across the Bot, API, and Web layers. This creates:
1. **DevOps overhead**: Managing database servers, connection pools, migrations
2. **Scaling complexity**: Manual connection pool tuning, read replicas, etc.
3. **Data sync challenges**: Bot and API have separate database connections
4. **Analytics limitations**: No real-time data, mock data in dashboard

Migrating to **Firebase Firestore** provides:
- **Zero DevOps**: Fully managed, auto-scaling NoSQL database
- **Real-time sync**: Built-in listeners for live data updates
- **Unified data layer**: Bot, API, and Web share the same Firestore instance
- **Built-in analytics**: BigQuery export for advanced analytics
- **Cost-effective**: Pay-per-use model, free tier for development

## What Changes

### Phase 1: Data Layer Migration
- **Bot**: Replace SQLAlchemy with `firebase-admin` Firestore SDK
  - `bot/database/models.py` → `bot/database/firestore.py`
  - `bot/database/crud.py` → `bot/services/firestore_service.py`
- **API**: Replace SQLAlchemy with `firebase-admin` Firestore SDK
  - `apps/api/src/models/*.py` → Remove (use shared Firestore)
  - `apps/api/src/services/*_service.py` → Refactor to use Firestore
- **Web**: Add Firestore client for real-time updates
  - Use existing Firebase SDK (`firebase/firestore`)
  - Replace TanStack Query polling with Firestore listeners

### Phase 2: Real-time Dashboard
- **Dashboard stats**: Live counters from Firestore `_metadata` collection
- **Groups/Channels tables**: Real-time updates via `onSnapshot`
- **Activity feed**: Stream from Firestore with server timestamps
- **Analytics charts**: Real data from verification events

### Phase 3: Remove Legacy Dependencies
- **Remove**: `sqlalchemy`, `asyncpg`, `aiosqlite`, `alembic`
- **Remove**: `apps/api/src/models/` directory
- **Remove**: `bot/database/migrations/` directory
- **Update**: Docker Compose (remove PostgreSQL service)

## Impact

- **Affected Specs**: `persistence`, `observability`, `distributed-cache`
- **Affected Code**:
  - `bot/config.py` - Remove DATABASE_URL
  - `bot/core/database.py` - Replace with firestore.py
  - `bot/database/` - Complete rewrite
  - `apps/api/src/core/database.py` - Replace with firestore.py
  - `apps/api/src/models/` - Delete entire directory
  - `apps/api/src/services/` - Refactor all services
  - `apps/web/src/lib/api/` - Add Firestore real-time hooks
  - `apps/web/src/lib/hooks/` - Add useFirestoreCollection hooks
  - `.env` - Remove DATABASE_URL, ensure Firebase config
  - `docker-compose.yml` - Remove postgres service
  - `requirements.txt` - Remove SQLAlchemy, add firebase-admin

## Non-Goals (Out of Scope)

- Cloud Functions (keep Python API for now)
- Firebase Hosting (keep Vercel/local dev)
- Firebase Storage (not needed yet)
- Multi-region failover (future enhancement)

## Success Criteria

1. Bot starts without PostgreSQL/SQLite
2. API starts without SQLAlchemy
3. Web dashboard shows real-time data (no polling)
4. All 8 admin panel pages work with Firestore data
5. Zero mock data in production
6. Verification events logged to Firestore
7. Analytics derived from real verification data
