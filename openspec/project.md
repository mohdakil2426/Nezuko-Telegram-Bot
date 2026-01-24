# Project Context

## Purpose

**Nezuko - The Ultimate All-In-One Bot** is a Telegram bot designed to enforce channel membership as a prerequisite for participating in linked discussion groups. The bot automatically restricts non-subscribers from sending messages until they join the required channel(s).

**Current State (v2.0)**: Production-ready multi-tenant platform with database-driven configuration, distributed caching, and production-grade observability.

**Core Goals**:
1. Automate channel membership enforcement at scale
2. Provide self-service setup via Telegram commands (`/protect`, `/status`, `/unprotect`)
3. Achieve <100ms verification latency with 1000+ verifications/min throughput
4. Enable group administrators to grow their channels by requiring membership

## Tech Stack

### Current (v1.1)
- **Language**: Python 3.13+
- **Framework**: `python-telegram-bot` v20.8+ (async)
- **Configuration**: `.env` files with `python-dotenv`
- **Caching**: In-memory dictionary
- **Update Mode**: Polling

### Planned (v2.0)
- **Language**: Python 3.13+
- **Framework**: `python-telegram-bot` v20.8+ (async with concurrent updates)
- **Database**: PostgreSQL 16+ (production), SQLite (development)
- **ORM**: SQLAlchemy 2.0+ (async) with Alembic migrations
- **Cache**: Redis 7+ (async client with graceful degradation)
- **Rate Limiting**: `telegram-ext-rate-limiter` (AIORateLimiter)
- **Monitoring**: Prometheus (`prometheus-client`), Sentry (`sentry-sdk`)
- **Logging**: `structlog` (structured JSON logs)
- **Web Server**: `aiohttp` (webhook mode)
- **Testing**: `pytest`, `pytest-asyncio`, `pytest-mock`

## Project Conventions

### Code Style

**Language**: Python 3.13+ with type hints

**Formatting**:
- **Line Length**: 100 characters (not PEP 8's 79)
- **Indentation**: 4 spaces (Python standard)
- **Imports**: Absolute imports preferred, grouped (stdlib → third-party → local)
- **Strings**: Double quotes `"` for strings, single quotes `'` for string literals in code

**Naming Conventions**:
- **Files**: `snake_case.py` (e.g., `verification.py`, `rate_limiter.py`)
- **Classes**: `PascalCase` (e.g., `ProtectedGroup`, `VerificationService`)
- **Functions/Variables**: `snake_case` (e.g., `check_membership`, `user_id`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `CACHE_TTL`, `MAX_RETRIES`)
- **Private**: Prefix with `_` (e.g., `_internal_helper`)

**Type Hints**: Required for all function signatures
```python
async def check_membership(user_id: int, channel_id: int, context: ContextTypes.DEFAULT_TYPE) -> bool:
    ...
```

**Docstrings**: Google style for public APIs
```python
def get_group_channels(group_id: int) -> List[EnforcedChannel]:
    """Retrieves all channels linked to a protected group.
    
    Args:
        group_id: Telegram group ID (negative integer for supergroups)
        
    Returns:
        List of EnforcedChannel objects, empty if group not protected
    """
```

### Architecture Patterns

**Modular Monolith**: Single deployable application with clear module boundaries
```
bot/
├── core/          # Shared infrastructure (DB, cache, rate limiter)
├── database/      # Data layer (models, CRUD, migrations)
├── handlers/      # Telegram update handlers
├── services/      # Business logic (verification, protection)
└── utils/         # Cross-cutting concerns (metrics, logging)
```

**Key Patterns**:
1. **Async-First**: All I/O operations use `async/await` (database, cache, Telegram API)
2. **Dependency Injection**: Pass dependencies (DB session, cache client) to functions, not globals
3. **Graceful Degradation**: Essential features work even if Redis/Sentry unavailable
4. **Database-Driven**: Configuration stored in PostgreSQL, queried at runtime (not `.env`)
5. **Event-Driven**: Handlers react to Telegram events (messages, joins, leaves)
6. **Cache-Aside Pattern**: Check cache → on miss, query API → cache result
7. **Circuit Breaker**: Fail fast on repeated errors (e.g., database unavailable)

**Anti-Patterns to Avoid**:
- ❌ Global state (use dependency injection)
- ❌ Blocking I/O in async context (use async libraries)
- ❌ Hardcoded configuration (use environment variables + database)
- ❌ Direct API calls without rate limiting (use AIORateLimiter)

### Testing Strategy

**Approach**: Test Pyramid (many unit tests, fewer integration tests, minimal e2e)

**Unit Tests** (Target: >80% coverage):
- **Location**: `tests/unit/`
- **Scope**: Pure functions, business logic, CRUD operations
- **Mocking**: Mock external dependencies (Telegram API, Redis, PostgreSQL)
- **Tools**: `pytest`, `pytest-asyncio`, `pytest-mock`

**Integration Tests**:
- **Location**: `tests/integration/`
- **Scope**: Database operations (with test DB), Redis caching (with test Redis)
- **Setup**: Use Docker Compose for test dependencies

**Load Tests**:
- **Location**: `tests/load/`
- **Scope**: Rate limiter behavior, database query performance, cache hit rates
- **Tools**: `pytest-benchmark` or `locust`
- **Targets**: 1000 verifications/min, <100ms p95 latency

**Testing Commands**:
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=bot --cov-report=html

# Run specific test file
pytest tests/unit/test_verification.py

# Run load tests
pytest tests/load/ -v
```

### Git Workflow

**Branching Strategy**:
- `main` - Production-ready code, always deployable
- `develop` - Integration branch for features (optional, can work directly on `main` for small projects)
- `feature/[name]` - Feature branches (e.g., `feature/add-redis-cache`)
- `fix/[name]` - Bug fix branches (e.g., `fix/cache-ttl-jitter`)

**Commit Conventions** (Conventional Commits):
```
<type>(<scope>): <subject>

[optional body]
[optional footer]
```

**Types**:
- `feat`: New feature (e.g., `feat(admin): add /protect command`)
- `fix`: Bug fix (e.g., `fix(cache): add TTL jitter to prevent thundering herd`)
- `refactor`: Code refactoring (e.g., `refactor(handlers): extract verification logic to service`)
- `perf`: Performance improvement (e.g., `perf(db): add index on group_id`)
- `docs`: Documentation changes (e.g., `docs(readme): update setup instructions`)
- `test`: Test additions/changes (e.g., `test(verification): add cache hit test`)
- `chore`: Maintenance (e.g., `chore(deps): update python-telegram-bot to v20.9`)

**Scope**: Module name (`admin`, `cache`, `db`, `handlers`, `services`, `metrics`)

**Examples**:
```
feat(persistence): implement PostgreSQL schema with Alembic migrations
fix(rate-limiter): cap at 25msg/sec to prevent Telegram API bans
refactor(verification): extract check_membership to VerificationService
perf(cache): increase positive TTL to 10min with 15% jitter
docs(openspec): add transform-to-production-saas proposal
```

## Domain Context

### Telegram Bot API Fundamentals

**Bot Types**:
- **Regular Bot**: One-to-one interactions with users
- **Group Bot**: Operates in group chats (Nezuko's primary use case)
- **Channel Bot**: Posts to channels (Nezuko needs admin access to monitor channels)

**Update Types** (Nezuko uses all three):
1. **Message**: User sends text/media in group (trigger verification)
2. **CallbackQuery**: User clicks inline button (verify button)
3. **ChatMember**: User joins/leaves group/channel (instant enforcement)

**Key Concepts**:
- **Chat ID**: Negative integer for groups/channels, positive for users
- **User ID**: Unique Telegram user identifier (positive integer)
- **Chat Member Status**: `member`, `administrator`, `creator`, `left`, `kicked`, `restricted`
- **Permissions**: Granular controls (`can_send_messages`, `can_send_photos`, etc.)
- **Admin Rights**: Bot needs `restrict_members` permission in groups, `administrator` in channels

### Channel Membership Verification

**Verification Flow**:
1. User sends message in protected group
2. Bot queries database: "Which channels enforce this group?"
3. For each channel: Check if user is member (cache → API)
4. If ANY channel missing: Delete message, restrict user, send warning with buttons
5. User clicks "I have joined" → Bot re-verifies → Unmutes if all channels verified

**Edge Cases**:
- User is group admin → Always allowed (no verification)
- User leaves channel after verification → ChatMemberHandler detects, re-restricts
- User joins multiple channels → Must be member of ALL linked channels (AND logic)
- Bot loses admin rights → Cannot verify, should alert group owner

### Telegram Rate Limits (Critical!)

**Global Limits**:
- 30 messages/second across all chats
- 20 messages/minute per chat

**Consequences of Exceeding**:
- 429 Too Many Requests error (with `Retry-After` header)
- Temporary ban (minutes to hours)
- Permanent ban (repeated violations)

**Nezuko's Solution**:
- AIORateLimiter caps at 25 msg/sec (5 msg/sec safety buffer)
- Priority queue: User interactions (P0) > Enforcement (P1) > Bulk operations (P2)
- Exponential backoff on retries (1s, 2s, 4s)

## Important Constraints

### Technical Constraints

1. **Telegram Rate Limits**: 30 msg/sec global, 20 msg/min per chat
   - **Impact**: Limits throughput for large groups
   - **Mitigation**: Rate limiter + caching (70%+ hit rate reduces API calls)

2. **Admin Rights Required**:
   - Bot must be admin in **both** group and channel
   - Needs `restrict_members` permission in group
   - Needs `administrator` status in channel (for ChatMemberHandler)
   - **Impact**: Setup friction for users
   - **Mitigation**: Clear setup instructions, permission validation in `/protect` command

3. **Telegram API Latency**:
   - `getChatMember` API call: ~100-300ms
   - **Impact**: Direct API calls too slow for real-time verification
   - **Mitigation**: Redis caching (10min TTL for positive, 1min for negative)

4. **Database Query Performance**:
   - Must support 1000+ verifications/min
   - **Impact**: Database can become bottleneck
   - **Mitigation**: Connection pooling (20 connections), indexes, caching

5. **Python GIL**:
   - Global Interpreter Lock limits CPU parallelism
   - **Impact**: Single bot instance limited to ~1 CPU core
   - **Mitigation**: Async I/O (not CPU-bound), horizontal scaling (multiple instances)

### Business Constraints

1. **Self-Service Model**: No manual configuration files (everything via Telegram commands)
2. **Zero Downtime**: Target 99.9% uptime (8.76 hours/year max downtime)
3. **Graceful Degradation**: Bot must work without Redis (degraded performance OK)
4. **User Privacy**: No storage of message content, only metadata (user_id, timestamps)

### Operational Constraints

1. **Development Environment**: Windows (primary), must work on Linux (production)
2. **Database**: SQLite for dev (ease of setup), PostgreSQL for production (reliability)
3. **Deployment** (Phase 5, deferred): Docker-based, platform-agnostic
4. **Cost**: Target <$30/month (VPS + managed DB/Redis if needed)

## External Dependencies

### Primary Dependencies

**Telegram Bot API** (Critical):
- **Purpose**: Core bot functionality (send/receive messages, manage permissions)
- **Endpoints Used**: `getUpdates` (polling), `getChatMember`, `restrictChatMember`, `sendMessage`, `deleteMessage`, `answerCallbackQuery`
- **Rate Limits**: 30 msg/sec global, 20 msg/min per chat
- **Availability**: 99.9%+ (Telegram's SLA)
- **Failure Mode**: Bot cannot operate without Telegram API
- **Documentation**: https://core.telegram.org/bots/api

**PostgreSQL** (Critical for v2.0):
- **Purpose**: Persistent storage for multi-tenant configuration
- **Schema**: 4 tables (owners, protected_groups, enforced_channels, group_channel_links)
- **Version**: 16+ (requires JSONB support)
- **Failure Mode**: Bot cannot determine which groups to protect (critical failure)
- **Mitigation**: Use managed PostgreSQL (e.g., Railway, Supabase) or VPS with backups

**Redis** (Important, not critical):
- **Purpose**: Distributed cache for verification results
- **Version**: 7+ (async support)
- **Failure Mode**: Graceful degradation (bot works, but slower + more API calls)
- **Mitigation**: Monitor cache hit rate, fall back to API calls

### Secondary Dependencies

**Prometheus** (Monitoring):
- **Purpose**: Metrics collection (verification counts, latencies, cache hit rates)
- **Failure Mode**: No metrics, but bot continues operating
- **Mitigation**: Optional dependency, log warning if unavailable

**Sentry** (Error Tracking):
- **Purpose**: Automatic error capture and alerting
- **Failure Mode**: Errors not tracked externally, but bot continues
- **Mitigation**: Optional dependency, errors still logged locally

**Alembic** (Database Migrations):
- **Purpose**: Versioned schema changes
- **Critical For**: Initial setup (`alembic upgrade head`), schema updates
- **Failure Mode**: Cannot initialize or update database schema
- **Mitigation**: Manual SQL scripts as fallback

### Development Dependencies

**pytest** (Testing):
- **Purpose**: Unit, integration, and load testing
- **Not Required**: For production runtime (dev/CI only)

**Docker** (Containerization):
- **Purpose**: Reproducible development environment (PostgreSQL, Redis)
- **Not Required**: Can run dependencies natively

### API Versioning

**Telegram Bot API**:
- **Current**: Bot API 7.x (follows Telegram app updates)
- **Stability**: Breaking changes rare, announced months in advance
- **Monitoring**: Subscribe to https://core.telegram.org/bots/api#recent-changes

**python-telegram-bot**:
- **Current**: v20.8+
- **Pinning**: Pin to minor version (e.g., `>=20.8,<21.0`) to avoid breaking changes
- **Update Strategy**: Review changelog, test in development, update in phases

### Connection Pooling & Timeouts

**PostgreSQL**:
- Pool size: 20 connections
- Max overflow: 10 connections
- Pool timeout: 30 seconds
- Query timeout: 10 seconds

**Redis**:
- Connection timeout: 5 seconds
- Socket timeout: 3 seconds
- Retry on timeout: 2 retries

**Telegram API** (via python-telegram-bot):
- Connect timeout: 10 seconds
- Read timeout: 10 seconds
- Write timeout: 10 seconds
- Retries: 3 (via AIORateLimiter)
