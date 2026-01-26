# Tasks: Migrate Full Stack to Firebase Firestore

## Phase 1: Foundation (Firebase Setup)

### 1.1 Firebase Configuration
- [ ] 1.1.1 Create Firestore database in Firebase Console (Native mode)
- [ ] 1.1.2 Configure security rules for development (permissive)
- [ ] 1.1.3 Verify `firebase-admin` is installed in Bot and API requirements.txt
- [ ] 1.1.4 Create shared Firebase initialization module (`packages/firebase-config/`)
- [ ] 1.1.5 Update `.env.example` with all required Firebase variables
- [ ] 1.1.6 Test Firebase connection from Bot
- [ ] 1.1.7 Test Firebase connection from API

### 1.2 Firestore Collections Setup
- [ ] 1.2.1 Create `owners` collection with schema validation
- [ ] 1.2.2 Create `protected_groups` collection with indexes
- [ ] 1.2.3 Create `enforced_channels` collection with indexes
- [ ] 1.2.4 Create `verifications` collection with composite indexes
- [ ] 1.2.5 Create `admin_users` collection (existing data from SQL)
- [ ] 1.2.6 Create `admin_audit_log` collection
- [ ] 1.2.7 Create `admin_config` collection
- [ ] 1.2.8 Create `_metadata/stats` document
- [ ] 1.2.9 Create `_metadata/config` document (global bot config)

---

## Phase 2: Bot Migration (Python)

### 2.1 Firestore Service Layer
- [ ] 2.1.1 Create `bot/core/firebase.py` - Firebase initialization
- [ ] 2.1.2 Create `bot/services/firestore_service.py` - CRUD operations
- [ ] 2.1.3 Implement `get_owner(user_id)` method
- [ ] 2.1.4 Implement `create_owner(user_id, username)` method
- [ ] 2.1.5 Implement `get_protected_group(group_id)` method
- [ ] 2.1.6 Implement `create_protected_group(group_id, owner_id, title)` method
- [ ] 2.1.7 Implement `update_protected_group(group_id, data)` method
- [ ] 2.1.8 Implement `delete_protected_group(group_id)` method
- [ ] 2.1.9 Implement `get_enforced_channel(channel_id)` method
- [ ] 2.1.10 Implement `create_enforced_channel(channel_id, title, username)` method
- [ ] 2.1.11 Implement `link_channel_to_group(group_id, channel_id)` method
- [ ] 2.1.12 Implement `unlink_channel_from_group(group_id, channel_id)` method
- [ ] 2.1.13 Implement `log_verification(user_id, group_id, channel_id, status)` method
- [ ] 2.1.14 Implement `get_user_verifications(user_id, limit)` method

### 2.2 Update Bot Handlers
- [ ] 2.2.1 Update `/protect` command to use Firestore
- [ ] 2.2.2 Update `/unprotect` command to use Firestore
- [ ] 2.2.3 Update `/status` command to use Firestore
- [ ] 2.2.4 Update `/addchannel` command to use Firestore
- [ ] 2.2.5 Update `/removechannel` command to use Firestore
- [ ] 2.2.6 Update `/channels` command to use Firestore
- [ ] 2.2.7 Update `ChatMemberHandler` to log verifications
- [ ] 2.2.8 Update verification service to read from Firestore
- [ ] 2.2.9 Add real-time listener for group config changes

### 2.3 Remove SQL Dependencies (Bot)
- [ ] 2.3.1 Comment out SQLAlchemy imports in bot (for testing)
- [ ] 2.3.2 Update `bot/config.py` to remove DATABASE_URL requirement
- [ ] 2.3.3 Delete `bot/database/crud.py`
- [ ] 2.3.4 Delete `bot/database/models.py`
- [ ] 2.3.5 Delete `bot/database/migrations/` directory
- [ ] 2.3.6 Delete `bot/core/database.py`
- [ ] 2.3.7 Update `bot/__init__.py` exports
- [ ] 2.3.8 Remove `sqlalchemy`, `asyncpg`, `aiosqlite` from requirements.txt
- [ ] 2.3.9 Test bot starts without SQL dependencies

---

## Phase 3: API Migration (FastAPI)

### 3.1 Firestore Service Layer (API)
- [ ] 3.1.1 Create `apps/api/src/core/firebase.py` - Firebase initialization
- [ ] 3.1.2 Create `apps/api/src/services/firestore/base.py` - Base Firestore service
- [ ] 3.1.3 Refactor `group_service.py` to use Firestore
- [ ] 3.1.4 Refactor `channel_service.py` to use Firestore
- [ ] 3.1.5 Refactor `analytics_service.py` to use Firestore (real data!)
- [ ] 3.1.6 Refactor `audit_service.py` to use Firestore
- [ ] 3.1.7 Refactor `config_service.py` to use Firestore
- [ ] 3.1.8 Refactor `admin_service.py` to use Firestore
- [ ] 3.1.9 Update `auth_service.py` to sync with Firestore admin_users
- [ ] 3.1.10 Remove `db_service.py` (database browser will use Firestore)

### 3.2 Update API Endpoints
- [ ] 3.2.1 Update `/api/v1/groups` to return Firestore data
- [ ] 3.2.2 Update `/api/v1/channels` to return Firestore data
- [ ] 3.2.3 Update `/api/v1/dashboard/stats` to read from `_metadata/stats`
- [ ] 3.2.4 Update `/api/v1/dashboard/activity` to read from Firestore
- [ ] 3.2.5 Update `/api/v1/analytics/users` to query verifications
- [ ] 3.2.6 Update `/api/v1/analytics/verifications` to query real data
- [ ] 3.2.7 Update `/api/v1/config` to use Firestore config
- [ ] 3.2.8 Update `/api/v1/audit` to query Firestore audit_log
- [ ] 3.2.9 Update `/api/v1/database/tables` to list Firestore collections

### 3.3 Remove SQL Dependencies (API)
- [ ] 3.3.1 Comment out SQLAlchemy imports in API (for testing)
- [ ] 3.3.2 Delete `apps/api/src/models/` directory
- [ ] 3.3.3 Delete `apps/api/src/core/database.py`
- [ ] 3.3.4 Delete `apps/api/init_db.py`
- [ ] 3.3.5 Update dependency injection (remove get_session)
- [ ] 3.3.6 Remove `sqlalchemy`, `asyncpg`, `aiosqlite` from API requirements.txt
- [ ] 3.3.7 Test API starts without SQL dependencies

---

## Phase 4: Web Migration (Next.js)

### 4.1 Firestore Client Setup
- [ ] 4.1.1 Add Firestore to existing Firebase initialization
- [ ] 4.1.2 Create `apps/web/src/lib/firestore.ts` - Firestore client
- [ ] 4.1.3 Create `apps/web/src/lib/hooks/useFirestoreCollection.ts` - Generic hook
- [ ] 4.1.4 Create `apps/web/src/lib/hooks/useFirestoreDoc.ts` - Single doc hook

### 4.2 Real-time Dashboard
- [ ] 4.2.1 Create `useGroups()` hook with Firestore real-time
- [ ] 4.2.2 Create `useChannels()` hook with Firestore real-time
- [ ] 4.2.3 Create `useStats()` hook reading `_metadata/stats`
- [ ] 4.2.4 Create `useActivity()` hook for recent activity
- [ ] 4.2.5 Create `useVerifications()` hook for analytics
- [ ] 4.2.6 Update Dashboard page to use real-time hooks
- [ ] 4.2.7 Update Groups page to use real-time hooks
- [ ] 4.2.8 Update Channels page to use real-time hooks
- [ ] 4.2.9 Update Analytics page to use real data

### 4.3 Replace API Polling
- [ ] 4.3.1 Update TanStack Query hooks to use Firestore where applicable
- [ ] 4.3.2 Add loading states for Firestore initial load
- [ ] 4.3.3 Add error handling for Firestore connection issues
- [ ] 4.3.4 Add offline indicator component
- [ ] 4.3.5 Test real-time updates across browser tabs

---

## Phase 5: Testing & Validation

### 5.1 Integration Tests
- [ ] 5.1.1 Test Bot commands create data in Firestore
- [ ] 5.1.2 Test API reads data from Firestore
- [ ] 5.1.3 Test Web receives real-time updates
- [ ] 5.1.4 Test verification logging end-to-end

### 5.2 Data Validation
- [ ] 5.2.1 Verify all 8 admin panel pages work with Firestore
- [ ] 5.2.2 Verify Dashboard stats are accurate
- [ ] 5.2.3 Verify Analytics charts show real data
- [ ] 5.2.4 Verify Groups/Channels CRUD operations
- [ ] 5.2.5 Verify Audit log captures all admin actions

### 5.3 Performance Testing
- [ ] 5.3.1 Measure verification lookup latency (<100ms target)
- [ ] 5.3.2 Measure dashboard initial load time (<300ms target)
- [ ] 5.3.3 Measure real-time update latency (<500ms target)
- [ ] 5.3.4 Test with 100 groups, 1000 verifications

---

## Phase 6: Cleanup & Documentation

### 6.1 Remove Legacy Code
- [ ] 6.1.1 Delete all SQLAlchemy model files
- [ ] 6.1.2 Delete database connection modules
- [ ] 6.1.3 Delete Alembic migrations directory
- [ ] 6.1.4 Update Docker Compose (remove postgres service)
- [ ] 6.1.5 Update requirements.txt (remove SQL dependencies)
- [ ] 6.1.6 Update .env.example

### 6.2 Documentation
- [ ] 6.2.1 Update README.md with Firestore setup instructions
- [ ] 6.2.2 Update memory-bank documents
- [ ] 6.2.3 Create Firestore security rules documentation
- [ ] 6.2.4 Create data model diagram
- [ ] 6.2.5 Archive this OpenSpec change

---

## Summary

| Phase | Tasks | Estimated Effort |
|-------|-------|------------------|
| 1. Foundation | 16 tasks | 2-3 hours |
| 2. Bot Migration | 27 tasks | 4-6 hours |
| 3. API Migration | 17 tasks | 4-6 hours |
| 4. Web Migration | 14 tasks | 3-4 hours |
| 5. Testing | 10 tasks | 2-3 hours |
| 6. Cleanup | 11 tasks | 1-2 hours |
| **Total** | **95 tasks** | **16-24 hours** |
