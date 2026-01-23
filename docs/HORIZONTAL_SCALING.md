# Horizontal Scaling Guide

## Overview

GMBot v2.0 is designed for horizontal scaling - running multiple bot instances simultaneously to handle higher load. This document covers architecture, deployment patterns, and validation procedures.

---

## Architecture for Multi-Instance Deployment

### Stateless Design ✅

**Requirement**: All state must be stored in **shared** external systems:
1. **PostgreSQL**: Group configurations, channel links, owner data
2. **Redis**: Verification cache, distributed locks (future)
3. **Telegram API**: Bot receives updates via webhooks (load balanced)

**No Local State**:
- ❌ In-memory dictionaries (removed in v2.0)
- ❌ Local file storage (SQLite for dev only)
- ❌ Global variables holding user/group data

### Shared State Validation

```python
# ✅ Good: Reads from shared database
async with get_session() as session:
    channels = await get_group_channels(session, group_id)

# ✅ Good: Uses shared Redis cache
cached = await cache_get(f"verify:{user_id}:{channel_id}")

# ❌ Bad: Local state (not used in v2.0)
membership_cache = {}  # This would NOT sync between instances
```

---

## Deployment Patterns

### Pattern 1: Webhook + Load Balancer (Recommended for Production)

```
Internet
  ↓
Load Balancer (Nginx/HAProxy)
  ├─→ Bot Instance 1 (Webhook on :8443)
  ├─→ Bot Instance 2 (Webhook on :8444)
  └─→ Bot Instance 3 (Webhook on :8445)
       ↓
 Shared PostgreSQL + Redis
```

**Configuration**:
- Each instance listens on a different port
- Load balancer distributes incoming webhooks
- Telegram sends updates to load balancer URL
- No duplicate processing (Telegram's update IDs handled automatically)

**Docker Compose Example**:
```yaml
version: '3.8'
services:
  bot1:
    build: .
    environment:
      - WEBHOOK_URL=https://bot.example.com
      - PORT=8443
      - DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/gmbot
      - REDIS_URL=redis://redis:6379/0
    ports:
      - "8443:8443"
  
  bot2:
    build: .
    environment:
      - WEBHOOK_URL=https://bot.example.com
      - PORT=8444
      - DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/gmbot
      - REDIS_URL=redis://redis:6379/0
    ports:
      - "8444:8444"
  
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - bot1
      - bot2
```

**Nginx Config (`nginx.conf`)**:
```nginx
upstream bot_backends {
    least_conn;  # Route to instance with fewest connections
    server bot1:8443;
    server bot2:8444;
}

server {
    listen 443 ssl;
    server_name bot.example.com;
    
    ssl_certificate /etc/ssl/certs/bot.crt;
    ssl_certificate_key /etc/ssl/private/bot.key;
    
    location / {
        proxy_pass http://bot_backends;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

### Pattern 2: Polling Mode (Development/Testing Only)

⚠️ **Not recommended for production** - Each instance polls independently and may process duplicate updates.

```bash
# Terminal 1
export BOT_TOKEN=...
export DATABASE_URL=postgresql+asyncpg://...
export REDIS_URL=redis://...
python -m bot.main

# Terminal 2 (same env vars)
python -m bot.main
```

**Issue**: Both instances poll the same update queue, leading to:
- Duplicate processing
- Race conditions
- Increased Telegram API load

**Use Case**: Local development with single instance only

---

## Validation Procedures

### Test 1: No Duplicate Message Processing

**Requirement**: Same update should NOT be processed by multiple instances

**Test Procedure**:
1. Start 2 bot instances with webhooks
2. Send test message in protected group
3. Check logs - only ONE instance should process it

**Expected Logs**:
```
# Instance 1
[INFO] Message from user 123456 in group -1001234567890
[INFO] Verifying membership...

# Instance 2
(No logs for this update - not received)
```

**Validation**: ✅ Telegram's webhook system ensures each update goes to exactly one instance

---

### Test 2: Shared Cache Coherence

**Requirement**: Cache updates from one instance visible to others

**Test Procedure**:
```python
# Instance 1: Cache a verification
await cache_set("verify:123456:-1001234567890", "1", 600)

# Instance 2: Read the cache
cached = await cache_get("verify:123456:-1001234567890")
assert cached == "1"  # Should succeed
```

**Validation**: ✅ Redis shared across instances

---

### Test 3: Database Consistency

**Requirement**: `/protect` command from one instance visible to all

**Test Procedure**:
1. Instance 1: Admin runs `/protect @Channel` in Group A
2. Instance 2: User sends message in Group A
3. Instance 2 should enforce protection (reads from shared DB)

**Expected Behavior**:
- Instance 1 writes to `protected_groups` table
- Instance 2 queries database, finds protection active
- Verification triggered correctly

**Validation**: ✅ PostgreSQL provides ACID consistency

---

### Test 4: Connection Pool Limits

**Requirement**: Total DB connections should not exceed pool size

**Configuration**:
```python
# bot/core/database.py
pool_size = 20  # Per instance
max_overflow = 10

# With 3 instances: 3 × 20 = 60 base connections
```

**Test Procedure**:
1. Run 3 instances
2. Check PostgreSQL connections:
   ```sql
   SELECT count(*) FROM pg_stat_activity 
   WHERE datname = 'gmbot';
   ```
3. Should see ~60 active connections

**Validation**: Monitor with `pg_stat_activity`

---

## Known Limitations

### ❌ Polling Mode Not Safe
- Multiple pollers will duplicate updates
- **Mitigation**: Use webhooks in production

### ⚠️  Cache Stampede Risk
- Multiple instances may cache miss simultaneously
- **Mitigation**: TTL jitter (±15%) already implemented

### ⚠️  Database Connection Limits
- Each instance uses 20 connections
- **Mitigation**: Monitor `pg_stat_activity`, adjust pool size if needed

---

## Monitoring Multi-Instance Setup

### Metrics to Track (Phase 4)

When Prometheus is integrated (Phase 4), monitor:

1. **Per-Instance Metrics**:
   - `bot_verifications_total{instance="bot1"}`
   - `bot_verifications_total{instance="bot2"}`
   - Load should be balanced ~50/50

2. **Shared Resource Metrics**:
   - `redis_connections_total` (should be stable)
   - `db_pool_size` (should not exceed limits)

3. **Duplicate Detection**:
   - `bot_duplicate_updates_total` (should be 0)
   - Track update IDs processed

---

## Checklist: Production Multi-Instance Deployment

- [ ] **Stateless Verification**: No global state variables
- [ ] **Shared Database**: PostgreSQL with connection pooling
- [ ] **Shared Cache**: Redis configured with `REDIS_URL`
- [ ] **Webhook Mode**: `ENVIRONMENT=production` and `WEBHOOK_URL` set
- [ ] **Load Balancer**: Nginx or HAProxy distributing webhooks
- [ ] **SSL Certificate**: HTTPS required for webhooks
- [ ] **Health Checks**: `/health` endpoint (Phase 4, deferred)
- [ ] **Monitoring**: Prometheus scraping all instances (Phase 4)

---

## Testing Commands

### Start Multiple Instances Locally (Webhook Mode)

**Requirements**:
- Ngrok or equivalent for public HTTPS URL
- PostgreSQL running
- Redis running

```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start PostgreSQL
pg_ctl start

# Terminal 3: Start ngrok
ngrok http 8443

# Terminal 4: Instance 1
export WEBHOOK_URL=https://abc123.ngrok.io
export PORT=8443
export DATABASE_URL=postgresql+asyncpg://localhost/gmbot
export REDIS_URL=redis://localhost:6379/0
python -m bot.main

# Terminal 5: Instance 2 (different port)
export WEBHOOK_URL=https://abc123.ngrok.io
export PORT=8444  # Different port
export DATABASE_URL=postgresql+asyncpg://localhost/gmbot
export REDIS_URL=redis://localhost:6379/0
python -m bot.main
```

**Note**: For true multi-instance testing with ngrok, you'll need a load balancer (nginx) in front.

---

##Status: Ready for Horizontal Scaling ✅

**Phase 2 Implementation**:
- ✅ Stateless architecture (no in-memory state)
- ✅ Shared PostgreSQL for configuration
- ✅ Shared Redis for caching
- ✅ Webhook support (mode auto-detection)

**Phase 3 Validation**:
- ✅ Documented deployment patterns
- ✅ Validation procedures defined
- ⏳ Automated multi-instance testing (requires infrastructure setup)

**Phase 4 Enhancement** (Future):
- Health check endpoint (`/health`)
- Prometheus metrics per instance
- Distributed tracing (optional)

---

**Conclusion**: GMBot v2.0 architecture supports horizontal scaling out of the box. No code changes required - just deploy multiple instances with shared database and Redis.
