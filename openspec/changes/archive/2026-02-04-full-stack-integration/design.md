# Design: Full-Stack Integration

## Context

### Current State

The Nezuko platform consists of three independently developed components:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CURRENT STATE (Disconnected)                     │
├─────────────────┬─────────────────┬─────────────────────────────────┤
│   apps/web      │    apps/api     │       apps/bot/                 │
│   (Next.js 16)  │   (FastAPI)     │    (python-telegram-bot)        │
│                 │                 │                                 │
│   Mock Data     │   Partial APIs  │   Independent DB                │
│   ✗ Not Real    │   ✗ No Charts   │   ✗ No API Logging              │
└─────────────────┴─────────────────┴─────────────────────────────────┘
```

**Key Issues:**

1. **Web**: Uses `NEXT_PUBLIC_USE_MOCK=true`, displays fake data
2. **API**: Missing 10 `/api/v1/charts/*` endpoints expected by web
3. **Bot**: Logs verifications but not API calls; no member count sync
4. **Database**: Bot and API use same schema but not synchronized
5. **Auth**: API has `MOCK_AUTH=true`, no real Supabase verification

### Target State

```
┌─────────────────────────────────────────────────────────────────────┐
│                      TARGET STATE (Integrated)                      │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Telegram    │      │   Supabase   │      │    Admin     │
│  Users/Bots  │      │   (Postgres) │      │   Browser    │
└──────┬───────┘      └──────┬───────┘      └──────┬───────┘
       │                     │                     │
       ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│              │      │              │      │              │
│     BOT      │═════▶│   SHARED     │◀═════│     WEB     │
│   (Python)   │      │   DATABASE   │      │  (Next.js)   │
│              │      │              │      │              │
│ • Verify     │      │ verified_log │      │ • Dashboard  │
│ • Restrict   │      │ api_call_log │      │ • Charts     │
│ • Log APIs   │      │ groups       │      │ • Analytics  │
│ • Sync Counts│      │ channels     │      │              │
│              │      │              │      │              │
└──────┬───────┘      └──────────────┘      └──────┬───────┘
       │                     ▲                     │
       │                     │                     │
       │              ┌──────┴───────┐             │
       │              │              │             │
       └─────────────▶│     API      │◀────────────┘
                      │  (FastAPI)   │
                      │              │
                      │ • Auth       │
                      │ • Groups     │
                      │ • Channels   │
                      │ • Charts ✨  │
                      │ • Analytics  │
                      │              │
                      └──────────────┘
```

## Approach

### Implementation Strategy

We will implement this integration in **5 phases**, each independently testable:

| Phase | Name                       | Description                     | Effort |
| ----- | -------------------------- | ------------------------------- | ------ |
| **1** | Database Schema Updates    | Add tables, columns, migrations | 2h     |
| **2** | Bot Analytics Enhancement  | API call logging, member sync   | 6h     |
| **3** | API Charts Implementation  | All 10 chart endpoints          | 8h     |
| **4** | Authentication Integration | Supabase JWT verification       | 4h     |
| **5** | Web Connection & Testing   | Switch to real API, E2E tests   | 3h     |

### Phase 1: Database Schema Updates

**Goal**: Extend database schema to support all analytics requirements

**Changes**:

1. **New Table: `api_call_log`**

```python
# apps/bot/database/models.py (and apps/api/src/models/)
class ApiCallLog(Base):
    __tablename__ = "api_call_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    method: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    chat_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    user_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC), index=True)

    __table_args__ = (
        Index("idx_api_call_log_method_timestamp", "method", "timestamp"),
    )
```

2. **Schema Extensions**:

```python
# Add to ProtectedGroup
member_count: Mapped[int] = mapped_column(Integer, default=0)
last_sync_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

# Add to EnforcedChannel
subscriber_count: Mapped[int] = mapped_column(Integer, default=0)
last_sync_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

# Add to VerificationLog
error_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
```

3. **Alembic Migration**:

```bash
# apps/api/
alembic revision --autogenerate -m "add_charts_analytics_tables"
alembic upgrade head
```

### Phase 2: Bot Analytics Enhancement

**Goal**: Ensure bot logs all data needed for dashboard charts

**2.1 API Call Logger**

Create non-blocking async logger for all Telegram API calls:

```python
# apps/bot/database/api_call_logger.py
import asyncio
from apps.bot.core.database import get_session
from apps.bot.database.models import ApiCallLog

_background_tasks: set[asyncio.Task] = set()

async def log_api_call(
    method: str,
    chat_id: int | None = None,
    user_id: int | None = None,
    success: bool = True,
    latency_ms: int | None = None,
    error_type: str | None = None,
) -> None:
    """Fire-and-forget API call logging."""
    try:
        async with get_session() as session:
            entry = ApiCallLog(
                method=method,
                chat_id=chat_id,
                user_id=user_id,
                success=success,
                latency_ms=latency_ms,
                error_type=error_type,
            )
            session.add(entry)
    except Exception as e:
        logger.error("Failed to log API call: %s", e)

def log_api_call_async(method: str, **kwargs) -> asyncio.Task:
    """Create background task for non-blocking logging."""
    task = asyncio.create_task(log_api_call(method, **kwargs))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    return task
```

**2.2 Instrument Verification Service**

Wrap existing API calls with logging:

```python
# apps/bot/services/verification.py
async def _verify_via_api(...) -> bool | None:
    start_time = time.perf_counter()
    try:
        record_api_call("getChatMember")
        member = await context.bot.get_chat_member(chat_id=channel_id, user_id=user_id)
        latency_ms = int((time.perf_counter() - start_time) * 1000)

        # NEW: Log to database
        log_api_call_async(
            method="getChatMember",
            chat_id=channel_id,
            user_id=user_id,
            success=True,
            latency_ms=latency_ms,
        )

        is_member = member.status in [...]
        return is_member
    except TelegramError as e:
        latency_ms = int((time.perf_counter() - start_time) * 1000)
        log_api_call_async(
            method="getChatMember",
            chat_id=channel_id,
            user_id=user_id,
            success=False,
            latency_ms=latency_ms,
            error_type=type(e).__name__,
        )
        ...
```

**2.3 Member Count Sync Service**

Periodic background job to sync counts from Telegram:

```python
# apps/bot/services/member_sync.py
import asyncio
from telegram.ext import ContextTypes
from apps.bot.core.database import get_session
from apps.bot.database.crud import get_all_protected_groups, get_all_enforced_channels

SYNC_INTERVAL_SECONDS = 900  # 15 minutes

async def sync_member_counts(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Sync member/subscriber counts from Telegram API."""
    async with get_session() as session:
        groups = await get_all_protected_groups(session)
        for group in groups:
            try:
                count = await context.bot.get_chat_member_count(group.group_id)
                group.member_count = count
                group.last_sync_at = datetime.now(UTC)
                log_api_call_async("getChatMemberCount", chat_id=group.group_id, success=True)
            except TelegramError:
                log_api_call_async("getChatMemberCount", chat_id=group.group_id, success=False)

        channels = await get_all_enforced_channels(session)
        for channel in channels:
            try:
                count = await context.bot.get_chat_member_count(channel.channel_id)
                channel.subscriber_count = count
                channel.last_sync_at = datetime.now(UTC)
                log_api_call_async("getChatMemberCount", chat_id=channel.channel_id, success=True)
            except TelegramError:
                log_api_call_async("getChatMemberCount", chat_id=channel.channel_id, success=False)

        await session.commit()

def schedule_member_sync(application: Application) -> None:
    """Register periodic sync job."""
    application.job_queue.run_repeating(
        sync_member_counts,
        interval=SYNC_INTERVAL_SECONDS,
        first=60,  # First run after 1 minute
        name="member_sync",
    )
```

### Phase 3: API Charts Implementation

**Goal**: Implement all 10 chart endpoints with real database queries

**3.1 Chart Schemas** (`apps/api/src/schemas/charts.py`):

```python
from pydantic import BaseModel

class VerificationDistribution(BaseModel):
    verified: int
    restricted: int
    error: int
    total: int

class CacheBreakdown(BaseModel):
    cached: int
    api: int
    total: int
    hit_rate: float

class GroupsStatusDistribution(BaseModel):
    active: int
    inactive: int
    total: int

class ApiCallsDistribution(BaseModel):
    method: str
    count: int
    percentage: float

class HourlyActivity(BaseModel):
    hour: int
    label: str
    verifications: int
    restrictions: int

class LatencyBucket(BaseModel):
    bucket: str
    count: int
    percentage: float

class TopGroupPerformance(BaseModel):
    group_id: int
    title: str
    verifications: int
    success_rate: float

class TimeSeriesPoint(BaseModel):
    date: str
    value: float

class CacheHitRateTrend(BaseModel):
    period: str
    series: list[TimeSeriesPoint]
    current_rate: float
    average_rate: float

class LatencyTrendPoint(BaseModel):
    date: str
    avg_latency: float
    p95_latency: float

class LatencyTrend(BaseModel):
    period: str
    series: list[LatencyTrendPoint]
    current_avg: float

class BotHealthMetrics(BaseModel):
    uptime_percent: float
    cache_efficiency: float
    success_rate: float
    avg_latency_score: float
    error_rate: float
    overall_score: float
```

**3.2 Charts Service** (`apps/api/src/services/charts_service.py`):

```python
# Key query patterns:

# Verification Distribution
stmt = select(
    func.count().filter(VerificationLog.status == "verified").label("verified"),
    func.count().filter(VerificationLog.status == "restricted").label("restricted"),
    func.count().filter(VerificationLog.status == "error").label("error"),
    func.count().label("total"),
).where(VerificationLog.timestamp >= week_start)

# Hourly Activity
stmt = select(
    func.extract("hour", VerificationLog.timestamp).label("hour"),
    func.count().label("verifications"),
    func.sum(case((VerificationLog.status == "restricted", 1), else_=0)).label("restrictions"),
).where(VerificationLog.timestamp >= today_start).group_by("hour")

# Latency Distribution
stmt = select(
    case(
        (VerificationLog.latency_ms < 50, "<50ms"),
        (VerificationLog.latency_ms < 100, "50-100ms"),
        (VerificationLog.latency_ms < 200, "100-200ms"),
        (VerificationLog.latency_ms < 500, "200-500ms"),
        else_=">500ms",
    ).label("bucket"),
    func.count().label("count"),
).where(VerificationLog.timestamp >= week_start).group_by("bucket")

# Top Groups
stmt = (
    select(
        VerificationLog.group_id,
        ProtectedGroup.title,
        func.count().label("verifications"),
        (func.sum(case((VerificationLog.status == "verified", 1), else_=0)) * 100.0 / func.count()).label("success_rate"),
    )
    .join(ProtectedGroup, VerificationLog.group_id == ProtectedGroup.group_id)
    .where(VerificationLog.timestamp >= week_start)
    .group_by(VerificationLog.group_id, ProtectedGroup.title)
    .order_by(desc("verifications"))
    .limit(10)
)
```

**3.3 Charts Endpoints** (`apps/api/src/api/v1/endpoints/charts.py`):

```python
router = APIRouter()

@router.get("/verification-distribution", response_model=SuccessResponse[VerificationDistribution])
async def get_verification_distribution(
    current_user: AdminUser = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> Any:
    data = await charts_service.get_verification_distribution(session)
    return SuccessResponse(data=data)

# ... similar for all 10 endpoints
```

### Phase 4: Authentication Integration

**Goal**: Real Supabase JWT authentication for web → API flow

**4.1 Web Supabase Client Setup**

```typescript
// apps/web/src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**4.2 API Auth Dependency**

```python
# apps/api/src/api/v1/dependencies/auth.py
async def get_current_active_user(
    authorization: str = Header(...),
    session: AsyncSession = Depends(get_session),
) -> AdminUser:
    if settings.MOCK_AUTH:
        return await get_mock_user(session)

    # Extract JWT
    token = authorization.replace("Bearer ", "")

    # Verify with Supabase JWT secret
    payload = jwt.decode(
        token,
        settings.SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        audience="authenticated",
    )

    # Get or create admin user
    user = await get_admin_by_supabase_id(session, payload["sub"])
    if not user:
        raise HTTPException(401, "User not found")

    return user
```

### Phase 5: Web Connection & Testing

**5.1 Environment Configuration**

```bash
# apps/web/.env.local
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

**5.2 API Client with Auth**

```typescript
// apps/web/src/lib/api/client.ts
import { createClient } from "@/lib/supabase/client";

export const apiClient = {
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
        ...options?.headers,
      },
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  },
  // ... post, put, delete
};
```

## Risks / Trade-offs

### Risks

| Risk                                        | Impact | Mitigation                                                  |
| ------------------------------------------- | ------ | ----------------------------------------------------------- |
| **Database Migration Breaks Existing Data** | High   | Run migration on staging first; backup before prod          |
| **API Logging Impacts Bot Performance**     | Medium | Async fire-and-forget logging; batch buffer for high volume |
| **Member Sync Hits Telegram Rate Limits**   | Medium | Use rate limiter; sync only active groups                   |
| **Supabase Free Tier Limits**               | Low    | Monitor usage; easy upgrade path                            |
| **Chart Queries Slow on Large Dataset**     | Medium | Add indexes; implement query caching                        |

### Trade-offs

| Decision                   | Trade-off               | Rationale                                                 |
| -------------------------- | ----------------------- | --------------------------------------------------------- |
| **Log ALL API calls**      | Storage vs Completeness | Full visibility is worth storage cost; can prune old data |
| **15-min sync interval**   | Freshness vs API calls  | Balance between real-time data and rate limits            |
| **Single shared database** | Coupling vs Simplicity  | Simpler than separate DBs; use read replicas if needed    |
| **JWT in all requests**    | Overhead vs Security    | Security is paramount for admin dashboard                 |

### Alternatives Considered

1. **Separate analytics database**: Rejected - adds complexity without benefit at current scale
2. **Real-time WebSocket for charts**: Deferred - polling is sufficient for v1
3. **Telegram webhook for member changes**: Complex - periodic sync is simpler and reliable
4. **Redis for chart caching**: Deferred - DB queries are fast enough initially
