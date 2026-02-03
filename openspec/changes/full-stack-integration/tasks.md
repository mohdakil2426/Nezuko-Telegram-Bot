# Tasks: Full-Stack Integration

This document contains all implementation tasks organized by phase. Each task includes detailed subtasks for comprehensive execution.

---

## Phase 1: Database Schema Updates

**Duration**: 2-3 hours  
**Dependencies**: None  
**Validation**: Run migration, verify tables exist

### Task 1.1: Create API Call Log Model (Bot)

**File**: `apps/bot/database/models.py`

- [ ] **1.1.1** Add import for `Index` from `sqlalchemy`
- [ ] **1.1.2** Create `ApiCallLog` model class
  - Add `id` primary key (Integer, autoincrement)
  - Add `method` column (String(50), nullable=False, index=True)
  - Add `chat_id` column (BigInteger, nullable=True)
  - Add `user_id` column (BigInteger, nullable=True)
  - Add `success` column (Boolean, default=True)
  - Add `latency_ms` column (Integer, nullable=True)
  - Add `error_type` column (String(50), nullable=True)
  - Add `timestamp` column (DateTime, default=now, index=True)
- [ ] **1.1.3** Add composite index `idx_api_call_log_method_timestamp`
- [ ] **1.1.4** Export `ApiCallLog` from `__init__.py`

---

### Task 1.2: Add Member Count Columns to Protected Groups

**File**: `apps/bot/database/models.py`

- [ ] **1.2.1** Add `member_count` column to `ProtectedGroup`
  - Type: Integer, default=0
- [ ] **1.2.2** Add `last_sync_at` column to `ProtectedGroup`
  - Type: DateTime, nullable=True

---

### Task 1.3: Add Subscriber Count Columns to Enforced Channels

**File**: `apps/bot/database/models.py`

- [ ] **1.3.1** Add `subscriber_count` column to `EnforcedChannel`
  - Type: Integer, default=0
- [ ] **1.3.2** Add `last_sync_at` column to `EnforcedChannel`
  - Type: DateTime, nullable=True

---

### Task 1.4: Add Error Type Column to Verification Log

**File**: `apps/bot/database/verification_logger.py`

- [ ] **1.4.1** Add `error_type` column to `VerificationLog` model
  - Type: String(50), nullable=True
- [ ] **1.4.2** Update `log_verification` function signature to accept `error_type` param
- [ ] **1.4.3** Update `log_verification_async` function signature to accept `error_type` param

---

### Task 1.5: Mirror Models in API

**File**: `apps/api/src/models/bot.py`

- [ ] **1.5.1** Add `member_count` column to `ProtectedGroup` model
- [ ] **1.5.2** Add `last_sync_at` column to `ProtectedGroup` model
- [ ] **1.5.3** Add `subscriber_count` column to `EnforcedChannel` model
- [ ] **1.5.4** Add `last_sync_at` column to `EnforcedChannel` model

**File**: `apps/api/src/models/verification_log.py`

- [ ] **1.5.5** Add `error_type` column to `VerificationLog` model

**File**: `apps/api/src/models/api_call_log.py` (NEW)

- [ ] **1.5.6** Create new file with `ApiCallLog` model matching bot model

**File**: `apps/api/src/models/__init__.py`

- [ ] **1.5.7** Export `ApiCallLog` from models init

---

### Task 1.6: Create Alembic Migration

**Directory**: `apps/api/alembic/versions/`

- [ ] **1.6.1** Generate migration with autogenerate
  ```bash
  cd apps/api && alembic revision --autogenerate -m "add_charts_analytics_tables"
  ```
- [ ] **1.6.2** Review generated migration file
- [ ] **1.6.3** Verify `api_call_log` table creation
- [ ] **1.6.4** Verify column additions to existing tables
- [ ] **1.6.5** Add index creation statements if missing
- [ ] **1.6.6** Test migration on SQLite
  ```bash
  alembic upgrade head
  ```
- [ ] **1.6.7** Verify tables exist
  ```bash
  python -c "from src.models import *; print('OK')"
  ```

---

## Phase 2: Bot Analytics Enhancement

**Duration**: 4-6 hours  
**Dependencies**: Phase 1 complete  
**Validation**: Bot logs API calls and syncs member counts

### Task 2.1: Create API Call Logger Module

**File**: `apps/bot/database/api_call_logger.py` (NEW)

- [ ] **2.1.1** Create new file with module docstring
- [ ] **2.1.2** Add imports: `asyncio`, `logging`, `time`, `datetime`
- [ ] **2.1.3** Add import for `get_session` from `apps.bot.core.database`
- [ ] **2.1.4** Add import for `ApiCallLog` from models
- [ ] **2.1.5** Create `_background_tasks: set[asyncio.Task]` for task tracking
- [ ] **2.1.6** Implement `log_api_call` async function
  - Accept: method, chat_id, user_id, success, latency_ms, error_type
  - Create `ApiCallLog` record
  - Commit to database
  - Handle exceptions gracefully (log errors, don't re-raise)
- [ ] **2.1.7** Implement `log_api_call_async` function
  - Create background task for `log_api_call`
  - Add task to `_background_tasks` set
  - Add done callback to discard
  - Return the task
- [ ] **2.1.8** Add module exports to `__init__.py`

---

### Task 2.2: Instrument Verification Service

**File**: `apps/bot/services/verification.py`

- [ ] **2.2.1** Add import for `log_api_call_async`
- [ ] **2.2.2** In `_verify_via_api` function:
  - [ ] Calculate latency before returning
  - [ ] On success: call `log_api_call_async("getChatMember", chat_id, user_id, True, latency)`
  - [ ] On error: call `log_api_call_async("getChatMember", chat_id, user_id, False, latency, error_type)`
- [ ] **2.2.3** Update `_log_result` function:
  - [ ] Accept `error_type` parameter
  - [ ] Pass `error_type` to `log_verification` call
- [ ] **2.2.4** In catch block, extract `error_type = type(e).__name__`

---

### Task 2.3: Instrument Protection Service

**File**: `apps/bot/services/protection.py`

- [ ] **2.3.1** Add import for `log_api_call_async` and `time`
- [ ] **2.3.2** In `restrict_user` function:
  - [ ] Add `start_time = time.perf_counter()` at start
  - [ ] Calculate `latency_ms` after API call
  - [ ] On success: `log_api_call_async("restrictChatMember", chat_id, user_id, True, latency)`
  - [ ] On error: `log_api_call_async("restrictChatMember", chat_id, user_id, False, latency, error_type)`
- [ ] **2.3.3** In `unrestrict_user` function (if exists):
  - [ ] Add similar logging for `promoteChatMember` or `unbanChatMember`

---

### Task 2.4: Create Member Sync Service

**File**: `apps/bot/services/member_sync.py` (NEW)

- [ ] **2.4.1** Create new file with module docstring
- [ ] **2.4.2** Add imports: `asyncio`, `logging`, `datetime`
- [ ] **2.4.3** Add imports for Telegram types and database session
- [ ] **2.4.4** Define `SYNC_INTERVAL_SECONDS = 900` (15 minutes)
- [ ] **2.4.5** Implement `sync_member_counts` async function:
  - [ ] Get database session
  - [ ] Query all protected groups
  - [ ] For each group, call `bot.get_chat_member_count()`
  - [ ] Update `member_count` and `last_sync_at` columns
  - [ ] Log API call to `api_call_log`
  - [ ] Handle exceptions per-group (don't fail entire sync)
  - [ ] Query all enforced channels
  - [ ] For each channel, call `bot.get_chat_member_count()`
  - [ ] Update `subscriber_count` and `last_sync_at` columns
  - [ ] Log API call
  - [ ] Commit all changes
- [ ] **2.4.6** Implement `schedule_member_sync` function:
  - [ ] Accept `application: Application` parameter
  - [ ] Use `application.job_queue.run_repeating()`
  - [ ] Set interval to `SYNC_INTERVAL_SECONDS`
  - [ ] Set `first=60` (first run after 1 minute)
  - [ ] Set job name to `"member_sync"`
- [ ] **2.4.7** Add rate limiting (max 30 calls/second to respect Telegram limits)
- [ ] **2.4.8** Add module exports to services `__init__.py`

---

### Task 2.5: Create Uptime Tracker

**File**: `apps/bot/core/uptime.py` (NEW)

- [ ] **2.5.1** Create new file with module docstring
- [ ] **2.5.2** Add imports: `time`, logging
- [ ] **2.5.3** Add import for `cache_set`, `cache_get` from cache module
- [ ] **2.5.4** Define `BOT_START_TIME_KEY = "nezuko:bot:start_time"`
- [ ] **2.5.5** Implement `record_bot_start` async function:
  - [ ] Store current timestamp in Redis
  - [ ] Set TTL to 604800 (7 days)
- [ ] **2.5.6** Implement `get_bot_uptime_seconds` async function:
  - [ ] Get start time from Redis
  - [ ] Calculate and return seconds since start
  - [ ] Handle missing key (return 0)
- [ ] **2.5.7** Add module exports to core `__init__.py`

---

### Task 2.6: Integrate Analytics into Bot Main

**File**: `apps/bot/main.py`

- [ ] **2.6.1** Add import for `schedule_member_sync`
- [ ] **2.6.2** Add import for `record_bot_start`
- [ ] **2.6.3** In `post_init` function:
  - [ ] Add `await record_bot_start()`
  - [ ] Add `schedule_member_sync(application)`
- [ ] **2.6.4** Verify imports work without errors
- [ ] **2.6.5** Test bot starts with new features

---

### Task 2.7: Add CRUD Functions for Member Sync

**File**: `apps/bot/database/crud.py`

- [ ] **2.7.1** Implement `get_all_protected_groups` function
  - [ ] Query all groups (optionally filter by enabled=True)
- [ ] **2.7.2** Implement `get_all_enforced_channels` function
  - [ ] Query all channels
- [ ] **2.7.3** Add proper async session handling

---

## Phase 3: API Charts Implementation

**Duration**: 6-8 hours  
**Dependencies**: Phase 1 complete  
**Validation**: All 10 chart endpoints return valid responses

### Task 3.1: Create Chart Schemas

**File**: `apps/api/src/schemas/charts.py` (NEW)

- [ ] **3.1.1** Create new file with module docstring
- [ ] **3.1.2** Add Pydantic imports
- [ ] **3.1.3** Create `VerificationDistribution` schema:
  - Fields: verified, restricted, error, total (all int)
- [ ] **3.1.4** Create `CacheBreakdown` schema:
  - Fields: cached, api, total (int), hit_rate (float)
- [ ] **3.1.5** Create `GroupsStatusDistribution` schema:
  - Fields: active, inactive, total (all int)
- [ ] **3.1.6** Create `ApiCallsDistribution` schema:
  - Fields: method (str), count (int), percentage (float)
- [ ] **3.1.7** Create `HourlyActivity` schema:
  - Fields: hour (int), label (str), verifications (int), restrictions (int)
- [ ] **3.1.8** Create `LatencyBucket` schema:
  - Fields: bucket (str), count (int), percentage (float)
- [ ] **3.1.9** Create `TopGroupPerformance` schema:
  - Fields: group_id (int), title (str), verifications (int), success_rate (float)
- [ ] **3.1.10** Create `TimeSeriesPoint` schema:
  - Fields: date (str), value (float)
- [ ] **3.1.11** Create `CacheHitRateTrend` schema:
  - Fields: period (str), series (list[TimeSeriesPoint]), current_rate, average_rate
- [ ] **3.1.12** Create `LatencyTrendPoint` schema:
  - Fields: date (str), avg_latency (float), p95_latency (float)
- [ ] **3.1.13** Create `LatencyTrend` schema:
  - Fields: period (str), series (list[LatencyTrendPoint]), current_avg (float)
- [ ] **3.1.14** Create `BotHealthMetrics` schema:
  - Fields: uptime_percent, cache_efficiency, success_rate, avg_latency_score, error_rate, overall_score
- [ ] **3.1.15** Export all schemas from `src/schemas/__init__.py`

---

### Task 3.2: Create Charts Service

**File**: `apps/api/src/services/charts_service.py` (NEW)

- [ ] **3.2.1** Create new file with module docstring
- [ ] **3.2.2** Add imports: datetime, timedelta, sqlalchemy functions
- [ ] **3.2.3** Add model imports: VerificationLog, ProtectedGroup, ApiCallLog
- [ ] **3.2.4** Create `ChartsService` class with async session parameter pattern
- [ ] **3.2.5** Implement `get_verification_distribution`:
  - [ ] Query verification_log for last 7 days
  - [ ] Count by status: verified, restricted, error
  - [ ] Return VerificationDistribution
- [ ] **3.2.6** Implement `get_cache_breakdown`:
  - [ ] Query verification_log for last 7 days
  - [ ] Count WHERE cached=True and cached=False
  - [ ] Calculate hit_rate percentage
  - [ ] Return CacheBreakdown
- [ ] **3.2.7** Implement `get_groups_status`:
  - [ ] Query protected_groups
  - [ ] Count WHERE enabled=True and enabled=False
  - [ ] Return GroupsStatusDistribution
- [ ] **3.2.8** Implement `get_api_calls_distribution`:
  - [ ] Query api_call_log for last 7 days
  - [ ] Group by method, count
  - [ ] Calculate percentages
  - [ ] Return list[ApiCallsDistribution]
- [ ] **3.2.9** Implement `get_hourly_activity`:
  - [ ] Query verification_log for last 24 hours
  - [ ] Group by hour of timestamp
  - [ ] Count total and restricted
  - [ ] Fill missing hours with zeros
  - [ ] Return list[HourlyActivity] for all 24 hours
- [ ] **3.2.10** Implement `get_latency_distribution`:
  - [ ] Query verification_log for last 7 days
  - [ ] Use CASE for bucket classification
  - [ ] Count per bucket
  - [ ] Calculate percentages
  - [ ] Return list[LatencyBucket]
- [ ] **3.2.11** Implement `get_top_groups`:
  - [ ] Query verification_log JOIN protected_groups
  - [ ] Group by group_id
  - [ ] Calculate success_rate per group
  - [ ] Order by count DESC, limit 10
  - [ ] Return list[TopGroupPerformance]
- [ ] **3.2.12** Implement `get_cache_hit_rate_trend`:
  - [ ] Accept period parameter (7d, 30d, 90d)
  - [ ] Query verification_log grouped by date
  - [ ] Calculate daily hit rate
  - [ ] Return CacheHitRateTrend
- [ ] **3.2.13** Implement `get_latency_trend`:
  - [ ] Accept period parameter
  - [ ] Query verification_log grouped by date
  - [ ] Calculate AVG(latency_ms) and PERCENTILE_CONT(0.95)
  - [ ] Return LatencyTrend
- [ ] **3.2.14** Implement `get_bot_health`:
  - [ ] Calculate uptime_percent (from Redis or default 99.9)
  - [ ] Calculate cache_efficiency (from cache breakdown)
  - [ ] Calculate success_rate (from verification distribution)
  - [ ] Calculate avg_latency_score (100 - avg_latency/2)
  - [ ] Calculate error_rate
  - [ ] Calculate overall_score (weighted average)
  - [ ] Return BotHealthMetrics
- [ ] **3.2.15** Create singleton `charts_service` instance
- [ ] **3.2.16** Export from `src/services/__init__.py`

---

### Task 3.3: Create Charts API Endpoints

**File**: `apps/api/src/api/v1/endpoints/charts.py` (NEW)

- [ ] **3.3.1** Create new file with module docstring
- [ ] **3.3.2** Add FastAPI imports: APIRouter, Depends, Query
- [ ] **3.3.3** Add dependency imports: get_current_active_user, get_session
- [ ] **3.3.4** Add service import: charts_service
- [ ] **3.3.5** Add schema imports: all chart schemas
- [ ] **3.3.6** Create `router = APIRouter()`
- [ ] **3.3.7** Implement `GET /verification-distribution` endpoint:
  - [ ] Add auth dependency
  - [ ] Add session dependency
  - [ ] Call service method
  - [ ] Return SuccessResponse wrapped data
- [ ] **3.3.8** Implement `GET /cache-breakdown` endpoint
- [ ] **3.3.9** Implement `GET /groups-status` endpoint
- [ ] **3.3.10** Implement `GET /api-calls` endpoint
- [ ] **3.3.11** Implement `GET /hourly-activity` endpoint
- [ ] **3.3.12** Implement `GET /latency-distribution` endpoint
- [ ] **3.3.13** Implement `GET /top-groups` endpoint:
  - [ ] Add `limit` query param (default=10, max=20)
- [ ] **3.3.14** Implement `GET /cache-hit-rate-trend` endpoint:
  - [ ] Add `period` query param (7d, 30d, 90d)
- [ ] **3.3.15** Implement `GET /latency-trend` endpoint:
  - [ ] Add `period` query param
- [ ] **3.3.16** Implement `GET /bot-health` endpoint
- [ ] **3.3.17** Verify all endpoints have proper response models

---

### Task 3.4: Register Charts Router

**File**: `apps/api/src/api/v1/router.py`

- [ ] **3.4.1** Add import: `from .endpoints import charts`
- [ ] **3.4.2** Add router registration:
  ```python
  api_router.include_router(charts.router, prefix="/charts", tags=["charts"])
  ```
- [ ] **3.4.3** Verify import order follows alphabetical convention

**File**: `apps/api/src/api/v1/endpoints/__init__.py`

- [ ] **3.4.4** Add `from . import charts` to exports

---

### Task 3.5: Test Charts Endpoints

- [ ] **3.5.1** Start API server: `uvicorn src.main:app --reload`
- [ ] **3.5.2** Open API docs: `http://localhost:8080/docs`
- [ ] **3.5.3** Test each endpoint:
  - [ ] `/api/v1/charts/verification-distribution`
  - [ ] `/api/v1/charts/cache-breakdown`
  - [ ] `/api/v1/charts/groups-status`
  - [ ] `/api/v1/charts/api-calls`
  - [ ] `/api/v1/charts/hourly-activity`
  - [ ] `/api/v1/charts/latency-distribution`
  - [ ] `/api/v1/charts/top-groups`
  - [ ] `/api/v1/charts/cache-hit-rate-trend`
  - [ ] `/api/v1/charts/latency-trend`
  - [ ] `/api/v1/charts/bot-health`
- [ ] **3.5.4** Verify response schemas match TypeScript types
- [ ] **3.5.5** Test with empty database (should return zeros, not errors)

---

## Phase 4: Authentication Integration

**Duration**: 3-4 hours  
**Dependencies**: Supabase project created  
**Validation**: Web can login and access API with real JWT

### Task 4.1: Create Supabase Project

- [ ] **4.1.1** Go to https://supabase.com/dashboard
- [ ] **4.1.2** Create new project (name: "nezuko-bot")
- [ ] **4.1.3** Wait for project creation
- [ ] **4.1.4** Copy Project URL from Settings > API
- [ ] **4.1.5** Copy Anon Key from Settings > API
- [ ] **4.1.6** Copy Service Role Key from Settings > API
- [ ] **4.1.7** Copy JWT Secret from Settings > API > JWT Settings
- [ ] **4.1.8** Store all credentials securely

---

### Task 4.2: Create Admin User in Supabase

- [ ] **4.2.1** Go to Authentication > Users
- [ ] **4.2.2** Click "Add User" > "Create New User"
- [ ] **4.2.3** Enter email: `admin@nezuko.bot`
- [ ] **4.2.4** Enter password: `Admin@123` (or secure password)
- [ ] **4.2.5** Check "Auto Confirm User"
- [ ] **4.2.6** Click "Create User"
- [ ] **4.2.7** Note the User ID (UUID)

---

### Task 4.3: Configure Web Supabase Client

**Install Dependencies**:

- [ ] **4.3.1** Run: `cd apps/web && bun add @supabase/ssr @supabase/supabase-js`

**File**: `apps/web/src/lib/supabase/client.ts` (NEW)

- [ ] **4.3.2** Create directory: `apps/web/src/lib/supabase/`
- [ ] **4.3.3** Create browser client file with `createBrowserClient`
- [ ] **4.3.4** Export `createClient` function

**File**: `apps/web/src/lib/supabase/server.ts` (NEW)

- [ ] **4.3.5** Create server client file with `createServerClient`
- [ ] **4.3.6** Handle cookies using Next.js `cookies()` API
- [ ] **4.3.7** Export `createServerSupabaseClient` function

---

### Task 4.4: Update Web Proxy/Middleware

**File**: `apps/web/src/proxy.ts` (MODIFY or CREATE)

- [ ] **4.4.1** Add Supabase session refreshing logic
- [ ] **4.4.2** Add route protection for dashboard routes
- [ ] **4.4.3** Add redirect to `/login` for unauthenticated users
- [ ] **4.4.4** Exclude public routes from protection
- [ ] **4.4.5** Configure matcher to exclude static assets

---

### Task 4.5: Update Web API Client

**File**: `apps/web/src/lib/api/client.ts`

- [ ] **4.5.1** Add import for Supabase client
- [ ] **4.5.2** Create `getAuthHeader` async function:
  - [ ] Get session from Supabase
  - [ ] Return Authorization header with access_token
- [ ] **4.5.3** Update `apiClient.get` to include auth header
- [ ] **4.5.4** Update `apiClient.post` to include auth header
- [ ] **4.5.5** Update `apiClient.put` to include auth header
- [ ] **4.5.6** Update `apiClient.delete` to include auth header
- [ ] **4.5.7** Add 401 handling - redirect to login

---

### Task 4.6: Update Login Page

**File**: `apps/web/src/app/login/page.tsx`

- [ ] **4.6.1** Add Supabase client import
- [ ] **4.6.2** Update login handler to use `supabase.auth.signInWithPassword`
- [ ] **4.6.3** On success, redirect to `/dashboard`
- [ ] **4.6.4** On error, display error message
- [ ] **4.6.5** Keep dev bypass button for development mode

---

### Task 4.7: Configure API JWT Verification

**File**: `apps/api/src/core/config.py`

- [ ] **4.7.1** Add `SUPABASE_JWT_SECRET` setting
- [ ] **4.7.2** Add `MOCK_AUTH` boolean setting (default=True for dev)

**File**: `apps/api/src/api/v1/dependencies/auth.py`

- [ ] **4.7.3** Add `import jwt`
- [ ] **4.7.4** Update `get_current_active_user` function:
  - [ ] Check `MOCK_AUTH` setting first
  - [ ] If False, extract token from Authorization header
  - [ ] Decode JWT with Supabase secret
  - [ ] Get or create admin user from Supabase UID
- [ ] **4.7.5** Implement `get_admin_by_supabase_id` service function
- [ ] **4.7.6** Implement `create_admin_from_supabase` service function

---

### Task 4.8: Update Environment Files

**File**: `apps/web/.env.local`

- [ ] **4.8.1** Add `NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co`
- [ ] **4.8.2** Add `NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx`
- [ ] **4.8.3** Update `NEXT_PUBLIC_USE_MOCK=false`
- [ ] **4.8.4** Update `NEXT_PUBLIC_API_URL=http://localhost:8080`

**File**: `apps/api/.env`

- [ ] **4.8.5** Add `SUPABASE_URL=https://xxx.supabase.co`
- [ ] **4.8.6** Add `SUPABASE_JWT_SECRET=xxx`
- [ ] **4.8.7** Update `MOCK_AUTH=false`

---

## Phase 5: Web Connection & End-to-End Testing

**Duration**: 2-3 hours  
**Dependencies**: Phases 1-4 complete  
**Validation**: Dashboard shows real data from bot activities

### Task 5.1: Configure Web for Real API Mode

**File**: `apps/web/.env.local`

- [ ] **5.1.1** Set `NEXT_PUBLIC_USE_MOCK=false`
- [ ] **5.1.2** Set `NEXT_PUBLIC_API_URL=http://localhost:8080`
- [ ] **5.1.3** Verify Supabase variables are set

---

### Task 5.2: Test Dashboard with Real Data

- [ ] **5.2.1** Start all services:

  ```bash
  # Terminal 1
  cd apps/api && uvicorn src.main:app --reload --port 8080

  # Terminal 2
  cd apps/web && bun dev

  # Terminal 3
  python -m apps.bot.main
  ```

- [ ] **5.2.2** Open `http://localhost:3000/login`
- [ ] **5.2.3** Login with Supabase credentials
- [ ] **5.2.4** Navigate to Dashboard
- [ ] **5.2.5** Verify stat cards show real numbers
- [ ] **5.2.6** Navigate to Analytics
- [ ] **5.2.7** Verify all charts render without errors
- [ ] **5.2.8** Navigate to Groups
- [ ] **5.2.9** Verify groups table shows database records
- [ ] **5.2.10** Navigate to Channels
- [ ] **5.2.11** Verify channels table shows database records

---

### Task 5.3: Generate Test Data with Bot

- [ ] **5.3.1** Add bot to test Telegram group
- [ ] **5.3.2** Make bot admin in the group
- [ ] **5.3.3** Add bot admin in a test channel
- [ ] **5.3.4** Run `/protect @test_channel` command
- [ ] **5.3.5** Verify group appears in web dashboard
- [ ] **5.3.6** Have test user join group
- [ ] **5.3.7** Verify verification log entry appears
- [ ] **5.3.8** Wait 15 minutes for member sync
- [ ] **5.3.9** Verify member_count updates in database

---

### Task 5.4: Test Chart Data Accuracy

- [ ] **5.4.1** Verify Verification Distribution chart:
  - [ ] Numbers match database verification_log counts
- [ ] **5.4.2** Verify Cache Breakdown chart:
  - [ ] Cached + API = Total
  - [ ] Hit rate percentage is accurate
- [ ] **5.4.3** Verify Groups Status chart:
  - [ ] Active + Inactive = Total groups
- [ ] **5.4.4** Verify Hourly Activity chart:
  - [ ] 24 hours displayed
  - [ ] Recent hours have data
- [ ] **5.4.5** Verify Latency Distribution chart:
  - [ ] All buckets present
  - [ ] Percentages sum to ~100%
- [ ] **5.4.6** Verify Top Groups chart:
  - [ ] Groups ordered by count
  - [ ] Success rates are percentages

---

### Task 5.5: Test Error Handling

- [ ] **5.5.1** Stop API server
- [ ] **5.5.2** Verify web shows error states gracefully
- [ ] **5.5.3** Restart API server
- [ ] **5.5.4** Verify data reloads automatically
- [ ] **5.5.5** Test with empty database
- [ ] **5.5.6** Verify charts show "No data" states

---

### Task 5.6: Run Linters and Tests

- [ ] **5.6.1** Run bot linter: `cd apps/bot && ruff check .`
- [ ] **5.6.2** Run API linter: `cd apps/api && ruff check .`
- [ ] **5.6.3** Run web linter: `cd apps/web && bun run lint`
- [ ] **5.6.4** Run bot tests: `pytest tests/bot/ -v`
- [ ] **5.6.5** Run API tests: `pytest tests/api/ -v`
- [ ] **5.6.6** Fix any failing tests
- [ ] **5.6.7** Verify all checks pass

---

## Summary

| Phase                    | Tasks                      | Estimated Time  |
| ------------------------ | -------------------------- | --------------- |
| Phase 1: Database Schema | 6 tasks, 18 subtasks       | 2-3 hours       |
| Phase 2: Bot Analytics   | 7 tasks, 35 subtasks       | 4-6 hours       |
| Phase 3: API Charts      | 5 tasks, 48 subtasks       | 6-8 hours       |
| Phase 4: Authentication  | 8 tasks, 32 subtasks       | 3-4 hours       |
| Phase 5: E2E Testing     | 6 tasks, 25 subtasks       | 2-3 hours       |
| **Total**                | **32 tasks, 158 subtasks** | **17-24 hours** |

---

## Completion Checklist

Before marking this change as complete:

- [ ] All 10 chart API endpoints implemented and tested
- [ ] Bot logs all API calls to database
- [ ] Member/subscriber counts sync every 15 minutes
- [ ] Supabase authentication working end-to-end
- [ ] Web dashboard displays real data from API
- [ ] All linters pass with zero errors
- [ ] All tests pass
- [ ] Documentation updated (if needed)
