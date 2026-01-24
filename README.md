# Nezuko - The Ultimate All-In-One Bot

A **production-ready, multi-tenant** Telegram bot that enforces channel membership for group participants. Designed to scale to **hundreds of groups simultaneously** with **<100ms latency**.

## 🚀 Features

### Core Features
- **Multi-Tenant Architecture**: Protect unlimited groups with different channels via `/protect` command
- **Instant Join Check**: Verifies users the moment they join the group
- **Strict Leave Detection**: Instantly restricts users who leave your channel
- **Smart Verification**: Users self-unmute with a single button click
- **Database-Driven**: All configuration stored in PostgreSQL (SQLite for development)

### Performance & Scale
- **< 100ms Verification Latency** (p95)
- **Redis Distributed Cache** with 90%+ hit rate
- **Horizontal Scaling**: Multiple bot instances with shared state
- **Rate Limiting**: AIORateLimiter prevents API bans
- **Batch Verification**: Cache warming for large groups

### Production-Grade Observability
- **Prometheus Metrics** at `/metrics`
- **Health Check Endpoint** at `/health`
- **Structured Logging** (JSON format for production)
- **Sentry Error Tracking** with full context
- **Alerting Rules** for Prometheus/Alertmanager

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Language | Python 3.13+ |
| Framework | python-telegram-bot v20+ (Async) |
| Database | PostgreSQL 16+ (prod) / SQLite (dev) |
| ORM | SQLAlchemy 2.0 (async) |
| Cache | Redis 7+ (optional, graceful degradation) |
| Migrations | Alembic |
| Metrics | Prometheus |
| Error Tracking | Sentry |
| Logging | structlog |

---

## 📦 Installation

### Prerequisites
- Python 3.13+
- PostgreSQL 16+ (production) or SQLite (development)
- Redis 7+ (optional but recommended)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/mohdakil2426/Telegram-Channel-Verification-Bot.git
cd Telegram-Channel-Verification-Bot

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Initialize database
python -m alembic upgrade head

# Run the bot
python -m bot.main
```

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BOT_TOKEN` | Telegram Bot API token from @BotFather | `123456:ABC...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENVIRONMENT` | `development` or `production` | `development` |
| `DATABASE_URL` | Database connection string | `sqlite+aiosqlite:///./gmbot.db` |
| `REDIS_URL` | Redis connection string | None (graceful degradation) |
| `WEBHOOK_URL` | Public HTTPS URL for webhooks | None (uses polling) |
| `WEBHOOK_SECRET` | Secret token for webhook validation | None |
| `PORT` | Webhook server port | `8443` |
| `SENTRY_DSN` | Sentry error tracking endpoint | None |

### Production Example

```bash
BOT_TOKEN=your_bot_token
ENVIRONMENT=production
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/gmbot
REDIS_URL=redis://localhost:6379/0
WEBHOOK_URL=https://your-domain.com
WEBHOOK_SECRET=your_webhook_secret
SENTRY_DSN=https://your-sentry-dsn
```

---

## 🎮 Admin Commands

| Command | Description | Where |
|---------|-------------|-------|
| `/start` | Welcome message with setup instructions | Private chat |
| `/help` | Command reference and troubleshooting | Anywhere |
| `/protect @Channel` | Link a channel for enforcement | Group chat (admin only) |
| `/status` | View protection status and linked channels | Group chat |
| `/unprotect` | Disable protection (preserves config) | Group chat (admin only) |
| `/settings` | View current configuration | Group chat |

### Setup Flow

1. Add bot to your **Group** as Administrator (needs "Ban/Restrict Users" and "Delete Messages")
2. Add bot to your **Channel** as Administrator (needs access to member list)
3. In the group, run: `/protect @YourChannel`
4. Bot confirms: "🛡️ Protection Activated!"

---

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:8000/health
```

Response:
```json
{
    "status": "healthy",
    "uptime_seconds": 3600.0,
    "version": "2.0.0",
    "checks": {
        "database": {"healthy": true, "latency_ms": 5.2},
        "redis": {"healthy": true, "latency_ms": 1.1}
    }
}
```

Status codes:
- `200 OK` - Healthy or degraded
- `503 Service Unavailable` - Unhealthy (database down)

### Prometheus Metrics

```bash
curl http://localhost:8000/metrics
```

Key metrics:
- `bot_verifications_total{status}` - Verification counts
- `bot_verification_latency_seconds` - Latency histogram
- `bot_cache_hits_total` / `bot_cache_misses_total` - Cache efficiency
- `bot_errors_total{error_type}` - Error counts
- `bot_active_groups` - Number of protected groups

### Sentry

When `SENTRY_DSN` is configured, errors are automatically reported with:
- User context (user_id)
- Chat context (group_id, channel_id)
- Operation breadcrumbs
- Performance traces

---

## 🏗️ Architecture

```
bot/
├── config.py           # Environment configuration
├── main.py             # Entry point (polling/webhook)
├── core/
│   ├── database.py     # Async SQLAlchemy session factory
│   ├── cache.py        # Redis with graceful degradation
│   ├── rate_limiter.py # AIORateLimiter configuration
│   └── loader.py       # Handler registration
├── database/
│   ├── models.py       # SQLAlchemy ORM models
│   ├── crud.py         # Database operations
│   └── migrations/     # Alembic migrations
├── handlers/
│   ├── admin/          # /start, /help, /protect, /status, etc.
│   ├── events/         # Message, join, leave handlers
│   └── verify.py       # "I have joined" callback
├── services/
│   ├── verification.py # Cache-aware membership checking
│   ├── protection.py   # Mute/unmute with retry logic
│   └── batch_verification.py  # Cache warming
└── utils/
    ├── metrics.py      # Prometheus metrics
    ├── logging.py      # Structured logging
    ├── sentry.py       # Error tracking
    ├── health.py       # Health check server
    └── resilience.py   # Circuit breakers, retries
```

### Data Model

```sql
owners (user_id PK, username, created_at, updated_at)
  ↓ 1:N
protected_groups (group_id PK, owner_id FK, title, enabled, params JSONB)
  ↓ M:N
group_channel_links (id PK, group_id FK, channel_id FK, UNIQUE)
  ↓
enforced_channels (channel_id PK, title, invite_link)
```

---

## 🔧 Development

### Running Tests

```bash
# All tests
pytest

# With coverage
pytest --cov=bot --cov-report=html

# Load tests only
pytest tests/test_load.py -v
```

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

### Benchmarking

```bash
# Run performance benchmarks
python -m bot.utils.benchmark
```

---

## 📚 Documentation

- [Phase 1 Complete](docs/PHASE1_COMPLETE.md) - Foundation architecture
- [Phase 2 Complete](docs/PHASE2_COMPLETE.md) - Multi-tenancy implementation
- [Phase 3 Complete](docs/PHASE3_COMPLETE.md) - Scale & performance
- [Horizontal Scaling](docs/HORIZONTAL_SCALING.md) - Multi-instance deployment
- [Alerting Rules](docs/alerting_rules.md) - Prometheus alerts

---

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

Distributed under the MIT License.

---

## 🆘 Troubleshooting

### Bot not responding to commands
- Ensure bot is admin in both Group AND Channel
- Check `BOT_TOKEN` is correct
- Run `/status` to verify protection is enabled

### "Permission denied" errors
- Bot needs "Ban/Restrict Users" in the group
- Bot needs "Read Messages" admin right in the channel

### High latency
- Check Redis is running (`redis-cli ping`)
- Review database connection pool settings
- Enable structured logging to identify bottlenecks

### Database errors
- Ensure `DATABASE_URL` is correctly formatted
- Run `alembic upgrade head` to apply migrations
- Check database server is accessible
