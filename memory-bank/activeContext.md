# Active Context: Phase 40 - Full-Stack Integration

## Current Status

**Phase 40 IN PROGRESS** - Full-Stack Integration (Web + API + Bot)
**Focus**: Connect all three components with real data flow and Supabase authentication.

### Active Change

| Change Name              | Status               | Location                                   |
| :----------------------- | :------------------- | :----------------------------------------- |
| `full-stack-integration` | 📋 Planning Complete | `openspec/changes/full-stack-integration/` |

### OpenSpec Artifacts Created (2026-02-04)

| Artifact        | File          | Description                              |
| :-------------- | :------------ | :--------------------------------------- |
| ✅ **proposal** | `proposal.md` | Why, what, impact analysis               |
| ✅ **design**   | `design.md`   | Architecture and implementation approach |
| ✅ **specs**    | `specs/*.md`  | 5 detailed specifications                |
| ✅ **tasks**    | `tasks.md`    | 32 tasks, 158 subtasks                   |

### Implementation Phases

| Phase | Description                | Status      | Est. Time |
| :---- | :------------------------- | :---------- | :-------- |
| **1** | Database Schema Updates    | ✅ Complete | 2-3h      |
| **2** | Bot Analytics Enhancement  | ✅ Complete | 4-6h      |
| **3** | API Charts Implementation  | ✅ Complete | 6-8h      |
| **4** | Authentication Integration | ✅ Complete | 3-4h      |
| **5** | Web Connection & Testing   | ✅ Complete | 2-3h      |

---

## Problem Statement

The platform has three well-developed components operating in isolation:

1. **Web Dashboard** - Running on mock data (`NEXT_PUBLIC_USE_MOCK=true`)
2. **API Backend** - Missing 10 chart endpoints required by dashboard
3. **Telegram Bot** - Not logging all analytics data needed for charts

---

## Key Deliverables

### New API Endpoints (10 Chart APIs)

```
GET /api/v1/charts/verification-distribution
GET /api/v1/charts/cache-breakdown
GET /api/v1/charts/groups-status
GET /api/v1/charts/api-calls
GET /api/v1/charts/hourly-activity
GET /api/v1/charts/latency-distribution
GET /api/v1/charts/top-groups
GET /api/v1/charts/cache-hit-rate-trend
GET /api/v1/charts/latency-trend
GET /api/v1/charts/bot-health
```

### New Bot Features

- **API Call Logging**: Track all Telegram API calls to database
- **Member Sync Service**: Periodic sync of member/subscriber counts
- **Uptime Tracking**: Record bot start time in Redis
- **Error Categorization**: Add error_type to verification logs

### Database Changes

| Change         | Table                                                                   |
| :------------- | :---------------------------------------------------------------------- |
| **NEW TABLE**  | `api_call_log` (method, chat_id, user_id, success, latency, error_type) |
| **ADD COLUMN** | `protected_groups.member_count`, `protected_groups.last_sync_at`        |
| **ADD COLUMN** | `enforced_channels.subscriber_count`, `enforced_channels.last_sync_at`  |
| **ADD COLUMN** | `verification_log.error_type`                                           |

### Authentication

- Web → API via Supabase JWT
- API verifies JWT with Supabase secret
- Auto-create admin user on first login

---

## Configuration to Change

### apps/web/.env.local

```bash
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

### apps/api/.env

```bash
MOCK_AUTH=false
SUPABASE_JWT_SECRET=xxx
```

---

## Files to Create

| App     | File                             | Purpose                 |
| :------ | :------------------------------- | :---------------------- |
| **Bot** | `database/api_call_logger.py`    | Async API call logging  |
| **Bot** | `services/member_sync.py`        | Periodic count sync     |
| **Bot** | `core/uptime.py`                 | Uptime tracking         |
| **API** | `src/models/api_call_log.py`     | ApiCallLog model        |
| **API** | `src/schemas/charts.py`          | Chart response schemas  |
| **API** | `src/services/charts_service.py` | Chart query logic       |
| **API** | `src/api/v1/endpoints/charts.py` | 10 chart endpoints      |
| **Web** | `src/lib/supabase/client.ts`     | Browser Supabase client |
| **Web** | `src/lib/supabase/server.ts`     | Server Supabase client  |

---

## Data Flow (Target State)

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Telegram    │      │   Supabase   │      │    Admin     │
│  Users/Bots  │      │   PostgreSQL │      │   Browser    │
└──────┬───────┘      └──────┬───────┘      └──────┬───────┘
       │                     │                     │
       ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│     BOT      │═════▶│   SHARED     │◀═════│     WEB      │
│   (Python)   │      │   DATABASE   │      │  (Next.js)   │
│              │      │              │      │              │
│ • Verify     │      │ • groups     │      │ • Dashboard  │
│ • Restrict   │      │ • channels   │      │ • Charts     │
│ • Log APIs   │      │ • verify_log │      │ • Analytics  │
│ • Sync Counts│      │ • api_calls  │      │              │
└──────┬───────┘      └──────────────┘      └──────┬───────┘
       │                     ▲                     │
       └────────────▶│     API      │◀─────────────┘
                     │  (FastAPI)   │
                     │ • Auth       │
                     │ • Charts ✨   │
                     └──────────────┘
```

---

## Commands Reference

```bash
# Start implementation
/opsx-apply

# View change status
openspec status --change "full-stack-integration"

# Run all services for testing
cd apps/api && uvicorn src.main:app --reload --port 8080
cd apps/web && bun dev
python -m apps.bot.main
```

---

## Previous Phase Summary

### Phase 39: Web Migration (Complete)

- Migrated from custom `apps/web` to pure shadcn/ui dashboard
- 26 shadcn components, 10 chart components
- Mock/API toggle via `NEXT_PUBLIC_USE_MOCK` flag
- All charts using mock data (ready for real data)

---

_Last Updated: 2026-02-04 05:05 IST_
