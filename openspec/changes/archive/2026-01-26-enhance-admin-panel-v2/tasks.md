# Tasks: Enhance Admin Panel v2

**Change ID**: `enhance-admin-panel-v2`
**Total Tasks**: 45
**Completed**: 45

---

## Phase 1: Verification Logging Infrastructure (P0) ✅

### 1.1 Database Schema

- [x] **1.1.1** Create `verification_log` table in `setup_db.py`
  - Columns: id, user_id, group_id, channel_id, status, latency_ms, cached, timestamp
  - Indexes: timestamp, group_id, status
  - **Verify**: Run `setup_db.py`, check table exists via `.tables`

- [x] **1.1.2** Create SQLAlchemy model `VerificationLog` in `apps/api/src/models/`
  - Map all columns with proper types
  - Add relationship to protected_groups if needed
  - **Verify**: Import model without errors

- [x] **1.1.3** Add alembic migration for PostgreSQL compatibility
  - Create migration file in `apps/api/alembic/versions/`
  - Handle both SQLite and PostgreSQL dialects
  - **Verify**: `alembic upgrade head` succeeds

### 1.2 Bot Integration

- [x] **1.2.1** Create `bot/database/verification_logger.py`
  - Async function `log_verification(user_id, group_id, channel_id, status, latency_ms, cached)`
  - Use connection pool, handle errors gracefully
  - **Verify**: Unit test for insert

- [x] **1.2.2** Integrate logging into `bot/services/verification.py`
  - Call `log_verification()` after `record_verification_end()`
  - Pass all relevant data (user_id, group_id, channel_id, status, latency)
  - Wrap in try/except to not break verification flow
  - **Verify**: Trigger verification via Telegram, check database for entry

- [x] **1.2.3** Add batch logging option for high-volume scenarios
  - Buffer verifications in memory
  - Flush every N seconds or M entries
  - **Verify**: Load test with 100 verifications, check all logged

---

## Phase 2: Real Analytics Queries (P0) ✅

### 2.1 Analytics Service Refactor

- [x] **2.1.1** Update `apps/api/src/services/analytics_service.py` - User Growth
  - Replace mock data with real query on `verification_log`
  - Calculate unique users per day
  - Handle empty data gracefully (return zeros, not errors)
  - **Verify**: API returns real counts (or 0 if no data)

- [x] **2.1.2** Update `apps/api/src/services/analytics_service.py` - Verification Trends
  - Query `verification_log` grouped by date and status
  - Calculate success rate from actual data
  - Support period filters: 24h, 7d, 30d, 90d
  - **Verify**: API returns verification breakdown

- [x] **2.1.3** Add hourly granularity for 24h period
  - Group by hour when period=24h
  - Format timestamps correctly for frontend
  - **Verify**: 24h period returns 24 data points

- [x] **2.1.4** Update Dashboard stats endpoint
  - `verifications_today`: COUNT from verification_log WHERE date=today
  - `verifications_week`: COUNT from last 7 days
  - `success_rate`: Calculate from actual data
  - **Verify**: Dashboard shows real numbers

### 2.2 Frontend Integration

- [x] **2.2.1** Update Analytics page to handle empty data
  - Show "No data yet" message instead of empty charts
  - Display helpful guidance for new installations
  - **Verify**: New install shows informative empty state

- [x] **2.2.2** Update Dashboard stats cards with real values
  - Remove hardcoded `change` and `trend` placeholders
  - Calculate actual change from previous period (or hide if insufficient data)
  - **Verify**: Dashboard shows real changes or "N/A"

---

## Phase 3: Dashboard Verification Chart (P1) ✅

### 3.1 Backend

- [x] **3.1.1** Create `/api/v1/dashboard/chart-data` endpoint
  - Return 30-day verification trend data
  - Format: `[{ date: "2026-01-01", verified: 45, restricted: 5 }, ...]`
  - Include summary stats
  - **Verify**: API returns chart-ready data

### 3.2 Frontend

- [x] **3.2.1** Create `apps/web/src/components/charts/dashboard-chart.tsx`
  - Use Recharts AreaChart or LineChart
  - Show verified (green) and restricted (red) lines
  - Responsive design
  - **Verify**: Component renders with mock data

- [x] **3.2.2** Create `useDashboardChartData` hook
  - Fetch from `/api/v1/dashboard/chart-data`
  - Handle loading and error states
  - Auto-refresh every 5 minutes
  - **Verify**: Hook fetches and returns data

- [x] **3.2.3** Replace "Chart Component Coming Soon" placeholder
  - Import DashboardChart into dashboard page
  - Pass data from hook
  - Add loading skeleton
  - **Verify**: Dashboard shows real chart

- [x] **3.2.4** Add chart interactivity
  - Hover tooltip with exact values
  - Click to filter by date - N/A (deferred)
  - Zoom/pan for date range selection - N/A (deferred)
  - **Verify**: Chart interactions work smoothly

---

## Phase 4: WebSocket Real-time Logs (P1) ✅

### 4.1 Backend WebSocket

- [x] **4.1.1** Create WebSocket manager `apps/api/src/core/websocket.py`
  - Connection manager class
  - Handle connect/disconnect
  - Broadcast to all clients
  - Authentication via token query param
  - **Verify**: WebSocket accepts connections

- [x] **4.1.2** Create WebSocket endpoint `/api/v1/ws/logs`
  - Authenticate connection on open
  - Send heartbeat every 30 seconds
  - Accept filter messages (level, source)
  - **Verify**: Connect with wscat, receive heartbeat

- [x] **4.1.3** Integrate log streaming into bot
  - On each log event, broadcast to WebSocket clients
  - Include: timestamp, level, logger, message, trace_id
  - Use asyncio.Queue for non-blocking
  - **Verify**: Bot logs appear in WebSocket

- [x] **4.1.4** Add log level filtering
  - Client sends: `{ "action": "filter", "level": "error" }`
  - Server only sends matching logs
  - Support: debug, info, warning, error
  - **Verify**: Filter messages, only matching logs received

### 4.2 Frontend WebSocket Client

- [x] **4.2.1** Create `apps/web/src/lib/hooks/use-websocket-logs.ts`
  - Connect to `/api/v1/ws/logs?token=<jwt>`
  - Auto-reconnect with exponential backoff
  - Buffer last 1000 log entries
  - **Verify**: Hook connects and receives logs

- [x] **4.2.2** Update Logs page to use WebSocket
  - Replace polling with WebSocket
  - Show connection status indicator (connected/reconnecting/disconnected)
  - Real-time log entry animation
  - **Verify**: Logs appear in real-time

- [x] **4.2.3** Add log controls
  - Pause/resume streaming
  - Clear log buffer
  - Filter by level (client-side for instant)
  - Search/highlight text
  - **Verify**: All controls work

- [x] **4.2.4** Add export functionality
  - Download current buffer as JSON
  - Copy selected entries to clipboard
  - **Verify**: Export produces valid file

---

## Phase 5: Database CRUD Operations (P2) ✅

### 5.1 Backend API

- [x] **5.1.1** Create `PUT /api/v1/database/{table}/{id}` endpoint
  - Validate table in whitelist
  - Validate payload against table schema
  - Execute UPDATE query
  - Log to audit trail
  - **Verify**: Update row via API, check database

- [x] **5.1.2** Create `DELETE /api/v1/database/{table}/{id}` endpoint
  - Validate table in whitelist
  - Support soft delete (set deleted_at) and hard delete
  - Log to audit trail
  - Return deleted row data
  - **Verify**: Delete row via API, check database

- [x] **5.1.3** Define table whitelist
  - Allow: protected_groups, enforced_channels, group_channel_links, admin_config
  - Block: admin_users, admin_sessions, admin_audit_log
  - **Verify**: Blocked tables return 403

- [x] **5.1.4** Add validation for foreign keys
  - Check referential integrity before delete
  - Return list of dependent rows if exists
  - **Verify**: Delete with FK references fails gracefully

### 5.2 Frontend UI

- [x] **5.2.1** Create `EditRowModal` component
  - Dynamic form based on column types
  - Validation (required, type, length)
  - Save/Cancel buttons
  - **Verify**: Modal opens with row data

- [x] **5.2.2** Create `DeleteConfirmDialog` component
  - Show row summary
  - Require typing table name to confirm
  - Loading state during delete
  - **Verify**: Dialog prevents accidental deletes

- [x] **5.2.3** Add edit/delete buttons to Database Browser
  - Edit icon in each row
  - Delete icon (red, with confirm)
  - Disable for protected tables
  - **Verify**: Buttons visible and functional

- [x] **5.2.4** Implement optimistic updates
  - Update UI immediately
  - Revert on error
  - Show success/error toast
  - **Verify**: UI updates feel instant

---

## Phase 6: Testing & Polish (P2) ✅

### 6.1 Testing

- [x] **6.1.1** Add unit tests for verification logger
  - Test insert, batch insert, error handling
  - Mock database connection
  - **Verify**: `pytest tests/unit/test_verification_logger.py` passes

- [x] **6.1.2** Add integration tests for analytics endpoints
  - Seed test data, query endpoints
  - Verify response format
  - **Verify**: `pytest tests/integration/test_analytics.py` passes

- [x] **6.1.3** Add e2e test for WebSocket logs
  - Connect, send filter, receive logs
  - Test reconnection
  - **Verify**: Playwright test passes

### 6.2 Documentation

- [x] **6.2.1** Update README with new features
  - Analytics section
  - Real-time logs section
  - Database management section
  - **Verify**: README is up to date

- [x] **6.2.2** Add API documentation for new endpoints
  - OpenAPI schemas
  - Example requests/responses
  - **Verify**: Swagger UI shows new endpoints

### 6.3 Final Validation

- [x] **6.3.1** Full integration test
  - Start bot, API, frontend
  - Trigger verification via Telegram
  - Verify: log appears in Logs page, analytics update, chart updates
  - **Verify**: All features work end-to-end

---

## Task Dependencies

```
1.1.1 → 1.1.2 → 1.1.3
      ↓
1.2.1 → 1.2.2 → 1.2.3
      ↓
2.1.1 → 2.1.2 → 2.1.3 → 2.1.4
      ↓
3.1.1 → 3.2.1 → 3.2.2 → 3.2.3 → 3.2.4

4.1.1 → 4.1.2 → 4.1.3 → 4.1.4
      ↓
4.2.1 → 4.2.2 → 4.2.3 → 4.2.4

5.1.1 ─┬→ 5.2.1 → 5.2.3
5.1.2 ─┘       ↓
5.1.3 ────→ 5.2.2 → 5.2.4

6.1.* (can run in parallel with implementation)
6.2.* (after all features complete)
6.3.1 (final validation)
```

---

## Parallelization Notes

**Can run in parallel**:
- Phase 3 (Charts) and Phase 4 (WebSocket) - independent features
- Phase 5 (CRUD) after Phase 1 + 2 complete - depends on same infrastructure
- Phase 6 tests can start as soon as features are implemented

**Sequential dependencies**:
- Phase 2 depends on Phase 1 (verification logging required for real analytics)
- Phase 3 depends on Phase 2 (chart needs analytics data)
