# Production Implementation Plan: GMBot v2.0 (SaaS Edition)

## 1. Executive Summary
This document outlines the architectural transformation of GMBot from a single-instance script to a **High-Performance Multi-Tenant SaaS Platform**. The target capacity is to support groups with 100k+ members with <100ms enforcement latency.

**Total Timeline**: 4-6 weeks  
**Deployment**: Runs locally for development, deploys anywhere with Docker

---

## 2. Architecture Overview

### 2.1 Core Stack (Production-Ready)
*   **Runtime**: Python 3.13+ (AsyncIO)
*   **Framework**: `python-telegram-bot` (v20+) with `concurrent_updates=True`
*   **Database**: `PostgreSQL` (Production) via `SQLAlchemy Async` + `Alembic` migrations
*   **Caching**: `Redis (Async)` for distributed state, rate limiting, and verification cache
*   **Rate Limiting**: `AIORateLimiter` (30msg/sec with priority queuing)
*   **Update Mode**: **Webhooks** (mandatory for 100k+ scale)
*   **Monitoring**: Prometheus + Grafana + Sentry

### 2.2 High-Throughput Design Principles

#### Connection Pool Configuration (CRITICAL)
```python
Application.builder()\\
    .token(TOKEN)\\
    .concurrent_updates(True)\\
    .connection_pool_size(64)  # NOT 1024! Balanced for async ops
    .pool_timeout(10.0)\\
    .read_timeout(10.0)\\
    .write_timeout(10.0)\\
    .rate_limiter(rate_limiter)\\
    .build()
```

**Why 64 connections?**
- Telegram rate limit: 30 messages/second
- With concurrent_updates, 64 connections handles ~500 simultaneous operations
- Oversized pools (1024) cause memory exhaustion and TCP overhead

#### Smart Caching Strategy
*   **Positive Cache**: Verified user → 10 minutes (reduces API calls by 90%)
*   **Negative Cache**: Unverified user → 1 minute (allows retry after quick join)
*   **Jitter**: Random ±15% TTL variance prevents Thundering Herd
*   **Cache Key**: `verify:{user_id}:{channel_id}` (Redis Hash)

#### Batch Operations for 100k Groups
*   **Problem**: Checking 100k members sequentially = 55 minutes (@ 30msg/sec)
*   **Solution**: 
    1. Check only active users (sent message in last 30 days)
    2. Batch verify during off-peak hours
    3. Use cached results as "warm start"

#### Rate Limiting Architecture
```python
rate_limiter = AIORateLimiter(
    max_retries=3,
    overall_max_rate=25,      # Leave 5msg/sec buffer
    overall_time_period=1.0,
    group_max_rate=20,        # Per-chat limit
    group_time_period=60.0,
)
```

**Priority Queue**:
1. **P0**: User interactions (verify button, commands) - immediate
2. **P1**: Join/leave events - <500ms
3. **P2**: Broadcast messages - queued, 5msg/sec

---

## 3. Database Schema (Optimized)

### Table: `owners`
```sql
CREATE TABLE owners (
    user_id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_owners_created ON owners(created_at);
```

### Table: `protected_groups`
```sql
CREATE TABLE protected_groups (
    group_id BIGINT PRIMARY KEY,
    owner_id BIGINT REFERENCES owners(user_id) ON DELETE CASCADE,
    group_title VARCHAR(255),
    enabled BOOLEAN DEFAULT TRUE,
    params JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_groups_owner ON protected_groups(owner_id);
CREATE INDEX idx_groups_enabled ON protected_groups(enabled) WHERE enabled = TRUE;
```

### Table: `enforced_channels`
```sql
CREATE TABLE enforced_channels (
    channel_id BIGINT PRIMARY KEY,
    channel_title VARCHAR(255),
    invite_link TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Table: `group_channel_links` (Many-to-Many)
```sql
CREATE TABLE group_channel_links (
    id SERIAL PRIMARY KEY,
    group_id BIGINT REFERENCES protected_groups(group_id) ON DELETE CASCADE,
    channel_id BIGINT REFERENCES enforced_channels(channel_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(group_id, channel_id)
);
CREATE INDEX idx_links_group ON group_channel_links(group_id);
CREATE INDEX idx_links_channel ON group_channel_links(channel_id);
```

### Table: `verification_cache` (Optional)
```sql
CREATE TABLE verification_cache (
    user_id BIGINT,
    channel_id BIGINT,
    is_member BOOLEAN,
    cached_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, channel_id)
);
CREATE INDEX idx_cache_expiry ON verification_cache(cached_at);
-- Auto-delete old entries with PostgreSQL job or TTL
```

**Migration Strategy**:
- Use `Alembic` for all schema changes
- Phase 1: SQLite (development) → Phase 3: PostgreSQL (production)
- Data migration script for existing `.env` configurations

---

## 4. Folder Structure (Modular Monolith)

```text
/bot
├── __init__.py
├── main.py                 # Entry point + Webhook setup
├── config.py               # Environment variables + validation
│
├── core/
│   ├── database.py         # Async SQLAlchemy session manager
│   ├── cache.py            # Redis client + caching decorators
│   ├── rate_limiter.py     # Custom priority rate limiter
│   └── loader.py           # Dynamic handler registration
│
├── database/
│   ├── models.py           # SQLAlchemy ORM models
│   ├── crud.py             # CRUD operations (get_group, create_link, etc.)
│   └── migrations/         # Alembic migration files
│       └── versions/
│
├── handlers/
│   ├── admin/
│   │   ├── setup.py        # /setup, /protect commands
│   │   ├── settings.py     # /settings, /unprotect, /status
│   │   └── help.py         # /help, /start (DM)
│   ├── events/
│   │   ├── join.py         # NEW_CHAT_MEMBERS handler
│   │   ├── leave.py        # ChatMemberHandler (channel leave)
│   │   └── message.py      # Message filter + verification
│   └── verify.py           # Callback query (verify button)
│
├── services/
│   ├── protection.py       # Core mute/unmute logic
│   ├── verification.py     # Check membership with cache
│   └── telegram.py         # Safe API wrappers with retry
│
└── utils/
    ├── metrics.py          # Prometheus metrics
    └── logging.py          # Structured logging
```

---

## 5. User Experience (Enhanced)

### Setup Wizard (Zero-Friction)

**1. Private Chat (DM)**
```
User: /start
Bot: 👋 Welcome to GroupGuard!

I protect Telegram groups by enforcing channel membership.

📋 Quick Setup:
1. Add me as Admin in your Group
2. Add me as Admin in your Channel
3. Run /protect @YourChannel in the group

Need help? → /help
```

**2. Group Setup**
```
User (in group): /protect @MyChannel
Bot: 
🔍 Verifying permissions...
✅ I'm admin in this group
✅ I'm admin in @MyChannel
✅ You're authorized to set this up

🛡️ Protection Activated!
Anyone joining this group must now be subscribed to @MyChannel.

Commands:
• /status - Check protection status
• /unprotect - Disable protection
• /settings - Customize warnings
```

### Additional Commands

- **`/status`**: Shows active protection, verified/restricted stats
- **`/unprotect`**: Removes channel requirement (admin only)
- **`/settings`**: Customize warning message, verification button text
- **`/help`**: Full command reference
- **`/stats`** (future): Dashboard with charts (verified rate, API usage)

### Error Handling UX

**If bot loses admin rights:**
```
⚠️ WARNING: I lost admin rights in @MyChannel!
Protection is temporarily disabled.

Please re-add me as admin, then run:
/reactivate
```

---

## 6. Implementation Roadmap

### **Phase 1: Foundation** (Week 1-2)
**Goal**: Working single-tenant bot with proper architecture

- [ ] Refactor `main.py` into modular structure
- [ ] Set up SQLAlchemy + Alembic
- [ ] Implement PostgreSQL schema with indexes
- [ ] **Add webhook setup** (for Railway deployment)
- [ ] **Implement AIORateLimiter** (30msg/sec, priority queue)
- [ ] Configure connection pool (64 connections, 10s timeout)
- [ ] Basic handlers: `/start`, `/help`, `/protect`
- [ ] Deploy to **Railway** for testing

**Deliverable**: Bot runs on Railway with webhooks, responds to commands

---

### **Phase 2: Multi-Tenancy** (Week 2-3)
**Goal**: Support multiple groups with database-driven config

- [ ] Implement full CRUD operations (`crud.py`)
- [ ] Update handlers to query DB instead of `.env`
- [ ] Add `/setup` wizard with permission verification
- [ ] Implement Redis caching layer (10min positive, 1min negative)
- [ ] Add `/status`, `/unprotect`, `/settings` commands
- [ ] Write unit tests for verification logic

**Deliverable**: Multi-tenant bot with 5-10 test groups

---

### **Phase 3: Scale & Performance** (Week 3-4)
**Goal**: Optimize for 100k+ member groups

- [ ] Implement batch verification strategy
- [ ] Add cache jitter (±15% TTL variance)
- [ ] Optimize database queries (EXPLAIN ANALYZE)
- [ ] Implement ChatMemberHandler for channel leave detection
- [ ] Add horizontal scaling support (multiple bot instances)
- [ ] Load testing with 1000+ concurrent requests

**Deliverable**: Bot handles 1000 users/min with <100ms latency

---

### **Phase 4: Monitoring & Reliability** (Week 4-5)
**Goal**: Production-grade observability

- [ ] Integrate Prometheus metrics:
  - `bot_verifications_total{status="verified|restricted"}`
  - `bot_api_calls_total{method="getChatMember|restrictChatMember"}`
  - `bot_cache_hits_total` / `bot_cache_misses_total`
  - `bot_rate_limit_delays_total`
- [ ] Set up Grafana dashboards
- [ ] Add Sentry for error tracking
- [ ] Implement health check endpoint (`/health`)
- [ ] Create alerting rules (error rate >1%, latency >500ms)

**Deliverable**: Full observability stack

---

### **Phase 5: Production Deployment** (Week 5-6)
**Goal**: Migrate to VPS for cost-effective scaling

- [ ] Provision Hetzner VPS (CPX31: 4 vCPU, 8GB RAM)
- [ ] Set up Docker + Docker Compose
- [ ] Configure Nginx reverse proxy with SSL (Let's Encrypt)
- [ ] Migrate PostgreSQL data from Railway to VPS
- [ ] Set up Redis on VPS
- [ ] Configure GitHub Actions for CI/CD
- [ ] Performance benchmarking (100k member simulation)

**Deliverable**: Production bot on VPS, <$30/month cost

---

## 7. Local Development & Deployment

### Local Development Setup

**Prerequisites**:
- Python 3.13+
- PostgreSQL 16+ (or SQLite for quick start)
- Redis (optional for Phase 1)
- Git

**Quick Start**:
```bash
# Clone repository
git clone <repo-url>
cd GMBot

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your BOT_TOKEN

# Run database migrations
alembic upgrade head

# Start bot (uses polling for local dev)
python bot/main.py
```

**Environment Variables** (`.env`):
```bash
# Required
BOT_TOKEN=your_bot_token_here
ENVIRONMENT=development  # Use 'production' for deployments

# Database (defaults to SQLite for local dev)
DATABASE_URL=sqlite:///./gmbot.db
# For PostgreSQL: postgresql://user:pass@localhost:5432/gmbot

# Redis (optional, uses in-memory cache if not set)
REDIS_URL=redis://localhost:6379

# Webhook (only for production)
WEBHOOK_URL=https://yourdomain.com
WEBHOOK_SECRET=your_secret_token
PORT=8443
```

---

### Docker Setup (Recommended)

**For Local Development**:
```yaml
# docker-compose.dev.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: bot
      POSTGRES_PASSWORD: devpassword
      POSTGRES_DB: gmbot
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

```bash
# Start dependencies only
docker-compose -f docker-compose.dev.yml up -d

# Run bot on host machine for easy debugging
python bot/main.py
```

---

**For Production Deployment**:
```yaml
# docker-compose.yml
services:
  bot:
    build: .
    restart: unless-stopped
    env_file: .env
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=postgresql://bot:${DB_PASSWORD}@postgres:5432/gmbot
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    ports:
      - "8443:8443"

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: bot
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: gmbot
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

**Dockerfile**:
```dockerfile
FROM python:3.13-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY bot/ ./bot/
COPY alembic.ini .
COPY alembic/ ./alembic/

# Run migrations and start bot
CMD ["sh", "-c", "alembic upgrade head && python bot/main.py"]
```

---

### Deployment to Any Platform

The bot is designed to deploy anywhere that supports:
- Python applications
- Docker containers
- Environment variables

**Compatible Platforms**:
- Any VPS (DigitalOcean, Linode, Hetzner, AWS EC2, etc.)
- Container platforms (Render, Railway, Fly.io, etc.)
- Kubernetes clusters
- Self-hosted servers

**Deployment Steps** (Generic):
1. Ensure PostgreSQL and Redis are available (self-hosted or managed)
2. Set environment variables (especially `ENVIRONMENT=production`, `WEBHOOK_URL`)
3. Deploy using Docker Compose or container registry
4. Run database migrations: `alembic upgrade head`
5. Start the bot application

**Health Check Endpoint**:
```python
# The bot exposes /health for monitoring
# Useful for load balancers and uptime monitors
GET http://your-bot-domain:8443/health
# Returns: {"status": "healthy", "uptime": 3600}
```

---

## 8. Runtime Configuration (Polling vs Webhooks)

```python
# bot/main.py
import os
import logging
from telegram.ext import Application

logger = logging.getLogger(__name__)

async def main():
    """Main entry point - automatically selects polling or webhook based on environment"""
    application = (
        Application.builder()
        .token(os.getenv("BOT_TOKEN"))
        .concurrent_updates(True)
        .connection_pool_size(64)
        .pool_timeout(10.0)
        .rate_limiter(create_rate_limiter())
        .build()
    )

    # Register handlers
    register_handlers(application)

    # Auto-detect mode based on environment
    environment = os.getenv("ENVIRONMENT", "development")
    
    if environment == "production" and os.getenv("WEBHOOK_URL"):
        # Production mode: Use webhooks for better performance
        logger.info("Starting in WEBHOOK mode (production)")
        await application.run_webhook(
            listen="0.0.0.0",
            port=int(os.getenv("PORT", 8443)),
            url_path="webhook",
            webhook_url=f"{os.getenv('WEBHOOK_URL')}/webhook",
            secret_token=os.getenv("WEBHOOK_SECRET", ""),
        )
    else:
        # Development mode: Use polling for easy local testing
        logger.info("Starting in POLLING mode (development)")
        await application.run_polling(
            allowed_updates=["message", "callback_query", "chat_member"]
        )

if __name__ == "__main__":
    import asyncio
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
```

**Polling vs Webhooks**:

| Mode | When to Use | Pros | Cons |
|------|-------------|------|------|
| **Polling** | Local development, testing | Easy setup, no domain needed | Higher latency, more network calls |
| **Webhooks** | Production deployment | Instant updates, efficient | Requires public URL, SSL certificate |

**The bot automatically selects the correct mode based on environment variables**, making it easy to develop locally and deploy to production without code changes.

---

## 9. Monitoring Metrics (Phase 4)

### Key Performance Indicators

```python
# utils/metrics.py
from prometheus_client import Counter, Histogram, Gauge

# Verification metrics
verifications_total = Counter(
    'bot_verifications_total',
    'Total verification attempts',
    ['status']  # verified, restricted, error
)

verification_latency = Histogram(
    'bot_verification_latency_seconds',
    'Time to verify a user',
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 2.0]
)

# Cache metrics
cache_hits = Counter('bot_cache_hits_total', 'Cache hits')
cache_misses = Counter('bot_cache_misses_total', 'Cache misses')

# Rate limiting
rate_limit_delays = Counter('bot_rate_limit_delays_total', 'Rate limit triggers')

# Active groups
active_groups = Gauge('bot_active_groups', 'Number of protected groups')
```

### Grafana Dashboard Panels
1. **Verification Rate** (verifications/min)
2. **Success Rate** (verified / total * 100)
3. **API Latency** (p50, p95, p99)
4. **Cache Hit Rate** (hits / (hits + misses) * 100)
5. **Active Groups** (gauge)
6. **Error Rate** (errors/min)

---

## 10. Success Criteria

### Phase 1 (Foundation)
- ✅ Bot responds to `/start` in <500ms
- ✅ Webhook receives updates successfully
- ✅ Database queries complete in <50ms

### Phase 2 (Multi-Tenancy)
- ✅ 10 groups configured successfully
- ✅ Verification flow works end-to-end
- ✅ Cache hit rate >70%

### Phase 3 (Scale)
- ✅ Handle 1000 verifications/min
- ✅ Latency <100ms (p95)
- ✅ Zero downtime during deploys

### Phase 4 (Monitoring)
- ✅ All metrics visible in Grafana
- ✅ Alerts trigger on error spike
- ✅ 99.9% uptime over 30 days

### Phase 5 (Production)
- ✅ Bot running on VPS
- ✅ Cost <$20/month
- ✅ Support 100+ active groups

---

## 11. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Telegram rate limits hit | High | Implement priority queue, batch operations |
| Database slowdown at scale | High | Add indexes, use connection pooling, cache aggressively |
| Bot loses admin rights | Medium | Monitor via health checks, alert owner |
| Webhook endpoint down | High | Implement retry logic, fallback to polling |
| Redis failure | Medium | Graceful degradation (skip cache, query API) |
| VPS outage | Medium | Automated backups, disaster recovery plan |

---

## 12. Next Steps

1. **Review this plan** with team/stakeholders
2. **Set up development environment** (Python 3.13, PostgreSQL, Redis)
3. **Create GitHub repository** with folder structure
4. **Initialize Alembic** for migrations
5. **Start Phase 1** implementation

**First Sprint (Week 1)**:
- Day 1-2: Set up project structure, dependencies
- Day 3-4: Implement database models + migrations
- Day 5-6: Basic handlers + webhook setup
- Day 7: Deploy to Railway, test end-to-end

---

**Document Version**: 2.0  
**Last Updated**: 2026-01-23  
**Status**: Ready for Implementation
