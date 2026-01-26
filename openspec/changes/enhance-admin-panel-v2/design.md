# Design: Enhance Admin Panel v2

**Change ID**: `enhance-admin-panel-v2`
**Author**: AI Assistant
**Date**: 2026-01-27

---

## Overview

This document captures architectural decisions for enhancing the Admin Panel with real-time features, real analytics, and database CRUD operations.

---

## Architecture Diagrams

### 1. Verification Logging Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Telegram User                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼ Message
┌─────────────────────────────────────────────────────────────────┐
│                     Bot (python-telegram-bot)                    │
│  ┌─────────────────┐    ┌────────────────┐    ┌──────────────┐  │
│  │  Message Handler │───▶│ Verification   │───▶│ Verification │  │
│  │                 │    │ Service        │    │ Logger       │  │
│  └─────────────────┘    └────────────────┘    └──────────────┘  │
│                                                       │          │
└───────────────────────────────────────────────────────┼──────────┘
                                                        │
                                                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SQLite/PostgreSQL                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  verification_log                                           │ │
│  │  - id, user_id, group_id, channel_id, status, latency_ms   │ │
│  │  - cached, timestamp                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Admin API (FastAPI)                          │
│  ┌─────────────────┐    ┌────────────────┐                      │
│  │ Analytics       │───▶│ Real Queries   │                      │
│  │ Endpoints       │    │ (not mocks)    │                      │
│  └─────────────────┘    └────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Admin Panel (Next.js)                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │ Dashboard   │    │ Analytics   │    │ Recharts           │  │
│  │ Stats       │    │ Charts      │    │ Components         │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. WebSocket Real-time Logs

```
┌─────────────────────────────────────────────────────────────────┐
│                           Bot                                    │
│  ┌──────────────┐                                               │
│  │ Structlog    │──────────────────┐                            │
│  │ Handler      │                  │                            │
│  └──────────────┘                  │                            │
└────────────────────────────────────┼────────────────────────────┘
                                     │ Publisher
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Admin API (FastAPI)                          │
│  ┌──────────────┐    ┌─────────────────┐    ┌────────────────┐  │
│  │ Log Queue    │───▶│ WebSocket       │◀───│ Auth           │  │
│  │ (asyncio)    │    │ Manager         │    │ Middleware     │  │
│  └──────────────┘    └─────────────────┘    └────────────────┘  │
│                              │                                   │
│                              │ Broadcast                         │
│                              ▼                                   │
│                    ┌─────────────────┐                          │
│                    │ Connected       │                          │
│                    │ Clients         │                          │
│                    │ [C1, C2, C3]    │                          │
│                    └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Admin Panel (Next.js)                          │
│  ┌──────────────┐    ┌─────────────────┐    ┌────────────────┐  │
│  │ useWebSocket │───▶│ Log Buffer      │───▶│ LogViewer      │  │
│  │ Hook         │    │ (1000 entries)  │    │ Component      │  │
│  └──────────────┘    └─────────────────┘    └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### Decision 1: Verification Logger Location

**Options**:
1. Log in `verification.py` service (bot)
2. Log via HTTP to Admin API
3. Log via shared message queue (Redis Pub/Sub)

**Chosen**: Option 1 - Log in `verification.py` service

**Rationale**:
- Simplest implementation
- No network hop required
- Both bot and API share the same database
- Async insert won't block verification

**Trade-offs**:
- Bot needs database write access (already has it)
- If bot down, no logs (acceptable - nothing to log anyway)

---

### Decision 2: Analytics Query Strategy

**Options**:
1. Real-time queries on each request
2. Pre-aggregated daily summaries in separate table
3. Materialized views (PostgreSQL only)

**Chosen**: Option 1 - Real-time queries with indexes

**Rationale**:
- Simpler to implement initially
- Verification volume in development is low
- Proper indexes make queries fast enough
- Can evolve to Option 2 if needed

**Indexes Required**:
```sql
CREATE INDEX idx_verification_log_timestamp ON verification_log(timestamp);
CREATE INDEX idx_verification_log_status ON verification_log(status);
CREATE INDEX idx_verification_log_group ON verification_log(group_id);
```

**Future Optimization** (if >1M verifications/day):
- Create `verification_daily_summary` table
- Cron job to aggregate previous day
- Query summary for historical, real-time for today

---

### Decision 3: WebSocket vs Server-Sent Events (SSE)

**Options**:
1. WebSocket (bidirectional)
2. Server-Sent Events (server → client only)
3. Long polling

**Chosen**: Option 1 - WebSocket

**Rationale**:
- Bidirectional allows filter commands from client
- FastAPI has excellent WebSocket support
- Better reconnection handling
- Future: could add interactive features (pause, clear)

**Implementation**:
```python
@router.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket, token: str = Query(...)):
    await manager.connect(websocket, token)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle filter/pause commands
    except WebSocketDisconnect:
        manager.disconnect(websocket)
```

---

### Decision 4: Database CRUD Scope

**Options**:
1. Full CRUD on all tables
2. CRUD with table whitelist
3. Read-only (current state)

**Chosen**: Option 2 - CRUD with table whitelist

**Security Whitelist**:
| Table | Read | Edit | Delete |
|-------|------|------|--------|
| protected_groups | ✅ | ✅ | ✅ |
| enforced_channels | ✅ | ✅ | ✅ |
| group_channel_links | ✅ | ✅ | ✅ |
| admin_config | ✅ | ✅ | ❌ |
| verification_log | ✅ | ❌ | ❌ |
| admin_users | ✅ | ❌ | ❌ |
| admin_sessions | ✅ | ❌ | ❌ |
| admin_audit_log | ✅ | ❌ | ❌ |

**Rationale**:
- Allows legitimate administrative operations
- Prevents accidental damage to critical tables
- All changes logged to audit trail

---

### Decision 5: Chart Library

**Options**:
1. Recharts (already in project)
2. Chart.js via react-chartjs-2
3. Nivo
4. Raw D3

**Chosen**: Option 1 - Recharts (already installed)

**Rationale**:
- Already in `package.json` dependencies
- Excellent React integration
- Responsive by default
- Good TypeScript support
- Consistent with existing verification charts in Analytics

**Usage**:
```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="verified" stroke="#22c55e" />
    <Line type="monotone" dataKey="restricted" stroke="#ef4444" />
  </LineChart>
</ResponsiveContainer>
```

---

## Data Schemas

### verification_log Table

```python
class VerificationLog(Base):
    __tablename__ = "verification_log"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, nullable=False, index=True)
    group_id = Column(BigInteger, nullable=False, index=True)
    channel_id = Column(BigInteger, nullable=False)
    status = Column(String(20), nullable=False, index=True)  # verified, restricted, error
    latency_ms = Column(Integer, nullable=True)
    cached = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
```

### WebSocket Message Format

**Server → Client (Log Entry)**:
```json
{
  "type": "log",
  "data": {
    "id": "uuid",
    "timestamp": "2026-01-27T00:30:00.000Z",
    "level": "info",
    "logger": "verification",
    "message": "User 123456 verified for group -100123",
    "trace_id": "abc-123",
    "extra": { "latency_ms": 45 }
  }
}
```

**Server → Client (Heartbeat)**:
```json
{
  "type": "heartbeat",
  "timestamp": "2026-01-27T00:30:00.000Z"
}
```

**Client → Server (Filter)**:
```json
{
  "action": "filter",
  "level": "error",
  "logger": "verification"
}
```

---

## Performance Considerations

### 1. Verification Logging Impact

**Concern**: Adding database write to verification flow may slow it down

**Mitigation**:
- Use async insert (non-blocking)
- Create after committing verification response
- If insert fails, log error but don't fail verification
- Consider batch insert for >100 verifications/second

```python
# In verification.py
asyncio.create_task(
    log_verification(user_id, group_id, channel_id, status, latency_ms, cached)
)
```

### 2. Analytics Query Performance

**Concern**: COUNT(*) on large verification_log table

**Mitigation**:
- Proper indexes on timestamp, status
- Limit query range (max 90 days)
- Cache results for 1 minute (low TTL for freshness)
- Consider daily summary table for historical

### 3. WebSocket Scalability

**Concern**: Many concurrent WebSocket connections

**Mitigation**:
- Use asyncio with non-blocking broadcasts
- Limit to 100 concurrent connections per user
- Implement rate limiting on broadcasts (max 10/second)
- Consider Redis Pub/Sub for multi-instance deployment

---

## Error Handling

### Verification Logger Failures

```python
async def log_verification(...):
    try:
        async with get_session() as session:
            session.add(VerificationLog(...))
            await session.commit()
    except Exception as e:
        # Log error but don't propagate
        logger.error(f"Failed to log verification: {e}")
        # Verification still succeeds
```

### WebSocket Disconnections

```typescript
// Frontend reconnection logic
const useWebSocketLogs = () => {
  const [retryCount, setRetryCount] = useState(0);
  
  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    
    ws.onclose = () => {
      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      setTimeout(() => {
        setRetryCount(c => c + 1);
        connect();
      }, delay);
    };
  }, [retryCount]);
};
```

---

## Security Considerations

### 1. WebSocket Authentication

- Token passed as query parameter (required for WebSocket)
- Validate JWT on connection open
- Close connection if token expires
- Require same user permissions as API

### 2. Database CRUD Authorization

- All operations require authenticated admin user
- Check user role before allowing edit/delete
- Log all operations to audit trail
- Rate limit destructive operations (max 10 deletes/minute)

### 3. SQL Injection Prevention

- All queries use parameterized statements (SQLAlchemy ORM)
- Table names validated against whitelist
- No dynamic SQL from user input

---

## Migration Strategy

### Phase 1: Add logging infrastructure (no breaking changes)
- Add verification_log table
- Start logging verifications
- Analytics still uses mock data (fallback)

### Phase 2: Switch to real analytics
- Update analytics service to query real data
- Add fallback to mock data if table empty
- Monitor query performance

### Phase 3: Add real-time features
- Deploy WebSocket endpoint
- Update frontend to use WebSocket
- Keep polling as fallback

### Phase 4: Enable CRUD
- Deploy API endpoints (disabled by default)
- Enable via feature flag
- Monitor audit logs

---

## Testing Strategy

### Unit Tests
- Verification logger: insert, batch, error handling
- Analytics service: query building, aggregation
- WebSocket manager: connect, disconnect, broadcast

### Integration Tests
- End-to-end: Telegram message → verification log → analytics API
- WebSocket: connect, receive, filter, reconnect

### Load Tests
- 1000 verifications/minute logging
- 100 concurrent WebSocket connections
- Analytics query with 1M rows

---

## Rollback Plan

### If verification logging causes issues:
1. Comment out `log_verification()` call in verification.py
2. Redeploy bot
3. Analytics falls back to mock data

### If WebSocket causes issues:
1. Remove WebSocket endpoint from router
2. Frontend falls back to polling (existing behavior)

### If CRUD causes issues:
1. Remove endpoints from router
2. Database browser becomes read-only again
