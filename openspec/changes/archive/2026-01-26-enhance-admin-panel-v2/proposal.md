# Proposal: Enhance Admin Panel Analytics & Real-time Features

**Change ID**: `enhance-admin-panel-v2`
**Status**: `DRAFT`
**Author**: AI Assistant
**Created**: 2026-01-27
**Target Version**: v1.1.0

---

## Summary

This proposal enhances the Nezuko Admin Panel with **real analytics data**, **real-time log streaming**, **interactive dashboard charts**, and **database CRUD operations**. These features transform the admin panel from a read-only view into a fully functional management interface.

---

## Motivation

### Current State
The Admin Panel (v1.0.0) is functional but has limitations:
1. **Analytics uses mock data** - The `analytics_service.py` generates synthetic data instead of querying real verification events
2. **Dashboard chart placeholder** - "Chart Component Coming Soon" instead of actual verification trends
3. **Logs are not real-time** - No WebSocket connection for live log streaming
4. **Database is read-only** - Users can browse tables but cannot edit/delete rows

### Desired State
After implementing this change:
1. **Real Analytics** - Query actual verification data from `verification_log` table
2. **Interactive Charts** - Recharts-powered line/bar charts on Dashboard
3. **Live Logs** - WebSocket-based real-time log streaming
4. **Full Database CRUD** - Edit and delete database rows with audit logging

---

## Scope

### In Scope
1. Create `verification_log` table to track all verifications
2. Bot integration to log verifications to database
3. Real analytics queries replacing mock data
4. Dashboard verification trends chart using Recharts
5. WebSocket endpoint for live logs
6. Frontend WebSocket client for Logs page
7. Database row edit/delete API endpoints
8. Database row edit/delete UI components

### Out of Scope
- User management (create/delete admin users)
- Role-based access control enhancements
- Telegram webhook integration for logs
- Export to CSV/PDF functionality
- Dark/light theme toggle (already exists)

---

## Technical Approach

### 1. Real Analytics Data

**Database Schema** (new table):
```sql
CREATE TABLE verification_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id BIGINT NOT NULL,
    group_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    status TEXT NOT NULL,  -- 'verified', 'restricted', 'error'
    latency_ms INTEGER,
    cached BOOLEAN DEFAULT FALSE,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp),
    INDEX idx_group_id (group_id),
    INDEX idx_status (status)
);
```

**Bot Integration**:
- Modify `bot/services/verification.py` to call `log_verification()` after each check
- Use async insert to avoid blocking the verification flow

**Analytics Service Update**:
- Replace mock data generation with real SQL queries:
  - `SELECT DATE(timestamp), COUNT(*) ... GROUP BY DATE(timestamp)`
  - `SELECT status, COUNT(*) ... GROUP BY status`

### 2. Dashboard Charts

**Technology**: Recharts (already in dependencies)

**Components**:
- `VerificationTrendChart` - Line chart showing daily verifications
- Integration with existing `useDashboardStats` hook

**Data Flow**:
- API returns 30-day verification data
- Frontend renders interactive line chart
- Hover shows daily values

### 3. Real-time Logs (WebSocket)

**Backend**:
- FastAPI WebSocket endpoint: `/api/v1/ws/logs`
- Authentication via query param token
- Filter by log level, source system
- Heartbeat every 30 seconds

**Frontend**:
- WebSocket hook: `useRealtimeLogs()`
- Auto-reconnect with exponential backoff
- Log buffer (max 1000 entries)
- Filter controls (level, source)

### 4. Database CRUD Operations

**API Endpoints**:
- `PUT /api/v1/database/{table}/{id}` - Update row
- `DELETE /api/v1/database/{table}/{id}` - Delete row (soft/hard configurable)

**Security**:
- Whitelist editable tables (exclude `admin_users`, `admin_sessions`)
- Audit log all changes
- Require confirmation for deletes

**Frontend**:
- Edit modal with form validation
- Delete confirmation dialog
- Optimistic updates with rollback

---

## Dependencies

### New Dependencies
- None (Recharts already installed)

### Internal Dependencies
- Bot verification service (for logging)
- Admin Panel API (for new endpoints)
- Admin Panel Frontend (for UI)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Verification logging slows bot | High | Async insert, batch writes if needed |
| WebSocket connection drops | Medium | Auto-reconnect, connection status indicator |
| Database deletes cause data loss | High | Soft delete by default, confirmation dialog |
| Large log volume fills database | Medium | Log rotation, max 7-day retention |

---

## Success Criteria

1. Analytics shows real verification counts (0 if no data)
2. Dashboard chart renders verification trends
3. Logs page shows live entries as bot processes verifications
4. Database rows can be edited and deleted with audit trail
5. All features work with SQLite (dev) and PostgreSQL (prod)

---

## Estimated Effort

| Component | Effort | Priority |
|-----------|--------|----------|
| Verification logging | 2 hours | P0 |
| Real analytics queries | 2 hours | P0 |
| Dashboard chart | 2 hours | P1 |
| WebSocket logs backend | 3 hours | P1 |
| WebSocket logs frontend | 2 hours | P1 |
| Database CRUD API | 2 hours | P2 |
| Database CRUD UI | 3 hours | P2 |
| **Total** | **16 hours** | |

---

## Approval

- [ ] Technical Review
- [ ] User Acceptance
