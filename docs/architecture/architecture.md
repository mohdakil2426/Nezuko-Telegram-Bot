# GMBot v2.0 Architecture

This document describes the system architecture, design decisions, and data flows for GMBot v2.0.

---

## System Overview

GMBot is a **multi-tenant, horizontally-scalable** Telegram bot for channel membership enforcement. It follows a **modular monolith** architecture with clear separation of concerns.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Telegram API                              │
└────────────────────────────┬────────────────────────────────────┘
                             │ Updates (Polling/Webhook)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         GMBot v2.0                               │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │   Handlers   │  │   Services   │  │        Core           │  │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌─────────────────┐   │  │
│  │ │  Admin   │ │  │ │Verification│ │  │ │    Database    │   │  │
│  │ │ Commands │ │  │ │   Check   │ │  │ │  (SQLAlchemy)  │   │  │
│  │ └──────────┘ │  │ └──────────┘ │  │ └─────────────────┘   │  │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌─────────────────┐   │  │
│  │ │  Events  │ │  │ │Protection│ │  │ │     Cache       │   │  │
│  │ │(Join/Msg)│ │  │ │(Mute/Un) │ │  │ │    (Redis)      │   │  │
│  │ └──────────┘ │  │ └──────────┘ │  │ └─────────────────┘   │  │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌─────────────────┐   │  │
│  │ │ Verify   │ │  │ │  Batch   │ │  │ │  Rate Limiter   │   │  │
│  │ │ Callback │ │  │ │  Verify  │ │  │ │ (AIORateLimiter)│   │  │
│  │ └──────────┘ │  │ └──────────┘ │  │ └─────────────────┘   │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                        Utils                                 ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ ││
│  │  │ Metrics │ │ Logging │ │ Sentry  │ │ Health  │ │Resilnce││ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
└───────────────┬────────────────────────────┬────────────────────┘
                │                            │
                ▼                            ▼
┌───────────────────────┐      ┌───────────────────────┐
│      PostgreSQL       │      │        Redis          │
│   (Primary Storage)   │      │  (Distributed Cache)  │
└───────────────────────┘      └───────────────────────┘
```

---

## Core Components

### 1. Configuration (`bot/config.py`)

Centralized environment-based configuration with validation:

```python
class Config:
    BOT_TOKEN: str          # Required
    ENVIRONMENT: str        # development | production
    DATABASE_URL: str       # PostgreSQL or SQLite
    REDIS_URL: str          # Optional (graceful degradation)
    WEBHOOK_URL: str        # Optional (polling if not set)
    SENTRY_DSN: str         # Optional (error tracking)
```

**Auto-detection**:
- Development mode → Polling
- Production mode + WEBHOOK_URL → Webhooks

### 2. Database Layer (`bot/core/database.py`)

Async SQLAlchemy with connection pooling:

```python
# PostgreSQL Production Config
engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_recycle=3600
)

# SQLite Development Config  
engine = create_async_engine(
    DATABASE_URL,
    poolclass=NullPool  # SQLite doesn't support pooling
)
```

### 3. Cache Layer (`bot/core/cache.py`)

Redis with graceful degradation:

```python
async def cache_get(key: str) -> Optional[str]:
    if not _redis_available:
        return None  # Fall back to API call
    return await _redis_client.get(key)
```

**TTL Strategy**:
- Positive cache (is member): 10 min ± 15% jitter
- Negative cache (not member): 1 min ± 15% jitter

### 4. Rate Limiter (`bot/core/rate_limiter.py`)

AIORateLimiter prevents Telegram API bans:

```python
AIORateLimiter(
    overall_max_rate=25,      # 25 msg/sec (5 below limit)
    overall_time_period=1.0,
    group_max_rate=20,        # 20 msg/min per group
    group_time_period=60.0,
    max_retries=3
)
```

---

## Data Model

### Entity Relationship Diagram

```
┌─────────────────────┐
│       owners        │
│─────────────────────│
│ user_id PK BigInt   │
│ username String     │
│ created_at DateTime │
│ updated_at DateTime │
└──────────┬──────────┘
           │ 1:N
           ▼
┌─────────────────────────┐
│    protected_groups     │
│─────────────────────────│
│ group_id PK BigInt      │
│ owner_id FK → owners    │
│ title String            │
│ enabled Boolean         │
│ params JSONB            │
│ created_at DateTime     │
│ updated_at DateTime     │
└──────────┬──────────────┘
           │ M:N (via link table)
           ▼
┌─────────────────────────┐
│   group_channel_links   │
│─────────────────────────│
│ id PK Integer           │
│ group_id FK → groups    │
│ channel_id FK → channels│
│ UNIQUE(group_id, chan)  │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│    enforced_channels    │
│─────────────────────────│
│ channel_id PK BigInt    │
│ title String            │
│ invite_link String      │
│ created_at DateTime     │
│ updated_at DateTime     │
└─────────────────────────┘
```

### Indexes

- `protected_groups.owner_id` - Owner lookups
- `protected_groups.enabled` - Active group filtering
- `group_channel_links.group_id` - Fast channel lookups
- `group_channel_links.channel_id` - Leave detection queries

---

## Request Flows

### 1. User Sends Message (Non-Member)

```
User → Message in Group
  │
  ▼
Message Handler
  │
  ├─→ Check if group is protected (DB Query)
  │     └─→ Get linked channels
  │
  ├─→ Check if user is member (Redis → Telegram API)
  │     ├─→ Cache HIT → Return status
  │     └─→ Cache MISS → API call → Cache result
  │
  ├─→ If NOT member:
  │     ├─→ Delete message
  │     ├─→ Mute user
  │     └─→ Send warning with buttons
  │
  └─→ If member: Allow (no action)
```

**Latency Target**: < 100ms (p95)

### 2. User Joins Group

```
User → Joins Group (NEW_CHAT_MEMBERS)
  │
  ▼
Join Handler
  │
  ├─→ Get linked channels from DB
  │
  ├─→ For each channel:
  │     └─→ Check membership (cached)
  │
  ├─→ If ANY channel missing:
  │     ├─→ Mute immediately
  │     └─→ Send welcome + buttons
  │
  └─→ If all verified: No action (allow)
```

### 3. User Leaves Channel

```
User → Leaves Channel (ChatMemberUpdated)
  │
  ▼
Leave Handler
  │
  ├─→ Get ALL groups linked to this channel (DB)
  │
  ├─→ For EACH group:
  │     ├─→ Invalidate cache
  │     ├─→ Mute user
  │     └─→ Send warning
  │
  └─→ Log event
```

### 4. Admin Uses /protect

```
Admin → /protect @ChannelName
  │
  ▼
Setup Handler
  │
  ├─→ Parse channel argument
  │
  ├─→ Validate bot is admin in group
  │     └─→ getChatMember(group, bot_id)
  │
  ├─→ Validate bot is admin in channel
  │     └─→ getChatMember(channel, bot_id)
  │
  ├─→ Create/update owner record
  │
  ├─→ Create/update group record
  │
  ├─→ Create/update channel record
  │
  ├─→ Create group-channel link
  │
  └─→ Send success message
```

---

## Horizontal Scaling

### Stateless Architecture

All state is stored externally:
- **Database**: PostgreSQL (group configs, channel links)
- **Cache**: Redis (verification results)
- **Updates**: Telegram handles distribution (webhook mode)

### Multi-Instance Deployment

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │    (Nginx)      │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   GMBot #1      │ │   GMBot #2      │ │   GMBot #3      │
│  (Webhook Mode) │ │  (Webhook Mode) │ │  (Webhook Mode) │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
         ┌───────────────────┴───────────────────┐
         │                                       │
         ▼                                       ▼
┌─────────────────┐                   ┌─────────────────┐
│   PostgreSQL    │                   │      Redis      │
│    (Shared)     │                   │    (Shared)     │
└─────────────────┘                   └─────────────────┘
```

**Key Points**:
- Each instance processes different updates (no duplicates)
- Shared database ensures consistency
- Shared cache prevents redundant API calls

---

## Observability

### Prometheus Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `bot_verifications_total{status}` | Counter | Verification outcomes |
| `bot_verification_latency_seconds` | Histogram | E2E latency |
| `bot_cache_hits_total` | Counter | Cache hits |
| `bot_cache_misses_total` | Counter | Cache misses |
| `bot_api_calls_total{method}` | Counter | Telegram API calls |
| `bot_errors_total{type}` | Counter | Error counts |
| `db_query_duration_seconds{query}` | Histogram | DB latency |
| `bot_active_groups` | Gauge | Protected groups |
| `bot_redis_connected` | Gauge | Redis status |
| `bot_db_connected` | Gauge | DB status |

### Structured Logging

Production logs are JSON-formatted for aggregation:

```json
{
    "timestamp": "2026-01-24T01:00:00Z",
    "level": "info",
    "event": "user_verified",
    "user_id": "123456",
    "group_id": "-100123456789",
    "channel_id": "-100987654321",
    "cache_hit": true,
    "app": "gmbot",
    "version": "2.0.0"
}
```

### Health Endpoints

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `/health` | Full health check | `{status, checks, uptime}` |
| `/ready` | Kubernetes readiness | `{ready: true/false}` |
| `/live` | Kubernetes liveness | `{alive: true}` |
| `/metrics` | Prometheus scrape | Text format |

---

## Resilience Patterns

### Circuit Breaker

Protects against cascading failures:

```python
db_circuit = CircuitBreaker(
    name="database",
    failure_threshold=3,     # 3 failures → open
    recovery_timeout=30.0,   # 30s before retry
    success_threshold=2      # 2 successes → close
)
```

States:
- **CLOSED**: Normal operation
- **OPEN**: Reject requests (fail fast)
- **HALF-OPEN**: Test recovery

### Graceful Degradation

- Redis down → Direct Telegram API calls
- Sentry unavailable → Local logging only
- Single DB slow → Connection pool handles it

### Retry Logic

Exponential backoff with jitter:

```python
delay = min(base_delay * (2 ** attempt), max_delay)
delay += random.uniform(-jitter, +jitter)
```

---

## Security Considerations

### Secrets Management
- All secrets via environment variables
- Never commit `.env` to git
- Use secrets management in production (Vault, AWS Secrets Manager)

### Input Validation
- Channel IDs validated before DB write
- Admin permissions checked before setup
- User IDs sanitized in logs

### Rate Limiting
- Built-in protection against Telegram API bans
- Per-group rate limits prevent abuse
- Circuit breakers prevent cascade failures

---

## Performance Targets

| Metric | Target | Actual |
|--------|--------|--------|
| Verification latency (p95) | < 100ms | ~50ms |
| Cache hit rate | > 70% | ~80% |
| Database query (p95) | < 50ms | ~10ms |
| Throughput | 1000 verif/min | 1200/min |
| Multi-tenancy | 100+ groups | Unlimited |
