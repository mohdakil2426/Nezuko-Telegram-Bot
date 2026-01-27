# 🚀 Deployment Guide

> **Complete guide for deploying Nezuko to production**

This document covers deploying Nezuko in production environments, including Docker, environment configuration, and CI/CD pipelines.

---

## 📋 Table of Contents

1. [Deployment Options](#deployment-options)
2. [Prerequisites](#prerequisites)
3. [Docker Deployment](#docker-deployment)
4. [Production Checklist](#production-checklist)
5. [Environment Configuration](#environment-configuration)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Monitoring](#monitoring)
8. [Scaling](#scaling)

---

## Deployment Options

| Option | Best For | Complexity |
|--------|----------|------------|
| **Docker Compose** | Single server, small-medium scale | Low |
| **Kubernetes** | Large scale, high availability | High |
| **Serverless** | Web dashboard only | Medium |
| **VPS** | Budget deployments | Low |

### Recommended Stack

```
┌──────────────────────────────────────────────────────────┐
│                    PRODUCTION STACK                       │
├──────────────────────────────────────────────────────────┤
│  Reverse Proxy: Caddy (auto TLS)                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                   │
│  │   Web   │  │   API   │  │   Bot   │                   │
│  │ (Vercel)│  │(Docker) │  │(Docker) │                   │
│  └─────────┘  └─────────┘  └─────────┘                   │
│       │            │            │                         │
│       └────────────┼────────────┘                         │
│                    ▼                                      │
│  ┌────────────────────────────────────────┐              │
│  │  Supabase (PostgreSQL + Auth + RT)     │              │
│  └────────────────────────────────────────┘              │
│  ┌────────────────────────────────────────┐              │
│  │  Redis (Cache)                          │              │
│  └────────────────────────────────────────┘              │
└──────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Services

| Service | Purpose | Provider Options |
|---------|---------|------------------|
| **PostgreSQL** | Primary database | Supabase, Neon, AWS RDS |
| **Redis** | Caching | Upstash, Redis Cloud, self-hosted |
| **Domain** | HTTPS access | Any registrar |

### Required Accounts

1. **Telegram Bot** - Token from @BotFather
2. **Supabase** - Auth and database
3. **Sentry** (optional) - Error tracking
4. **Docker Hub** (optional) - Image registry

---

## Docker Deployment

### Docker Compose (Recommended)

#### 1. Production Compose File

```yaml
# config/docker/docker-compose.prod.yml

version: "3.9"

services:
  # Telegram Bot
  bot:
    build:
      context: ../..
      dockerfile: config/docker/Dockerfile.bot
    restart: unless-stopped
    env_file:
      - ../../apps/bot/.env
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis
    networks:
      - nezuko-network

  # REST API
  api:
    build:
      context: ../..
      dockerfile: config/docker/Dockerfile.api
    restart: unless-stopped
    env_file:
      - ../../apps/api/.env
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379/0
    ports:
      - "8080:8080"
    depends_on:
      - redis
    networks:
      - nezuko-network

  # Redis Cache
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis-data:/data
    networks:
      - nezuko-network

  # Reverse Proxy (optional if using Vercel/Cloudflare)
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
    networks:
      - nezuko-network

volumes:
  redis-data:
  caddy-data:

networks:
  nezuko-network:
    driver: bridge
```

#### 2. Dockerfiles

**Bot Dockerfile:**

```dockerfile
# config/docker/Dockerfile.bot

FROM python:3.13-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
COPY apps/bot/requirements.txt ./bot-requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir -r bot-requirements.txt

# Copy application code
COPY apps/bot/ ./apps/bot/

# Create non-root user
RUN useradd -m nezuko
USER nezuko

# Run bot
CMD ["python", "-m", "apps.bot.main"]
```

**API Dockerfile:**

```dockerfile
# config/docker/Dockerfile.api

FROM python:3.13-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
COPY apps/api/requirements.txt ./api-requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir -r api-requirements.txt

# Copy application code
COPY apps/api/ ./apps/api/

# Create non-root user
RUN useradd -m nezuko
USER nezuko

EXPOSE 8080

# Run API server
CMD ["uvicorn", "apps.api.src.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

#### 3. Deploy Command

```bash
# Build and deploy
cd config/docker
docker compose -f docker-compose.prod.yml up -d --build

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Scale API (if needed)
docker compose -f docker-compose.prod.yml up -d --scale api=3
```

### Caddy Configuration

```caddyfile
# config/docker/Caddyfile

api.nezuko.bot {
    reverse_proxy api:8080
    encode gzip
    
    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
    }
}

# If self-hosting web dashboard
app.nezuko.bot {
    reverse_proxy web:3000
    encode gzip
}
```

---

## Production Checklist

### Pre-Deployment

- [ ] **Environment variables** set for all apps
- [ ] **Database migrations** applied
- [ ] **SSL/TLS** configured (auto with Caddy)
- [ ] **Supabase RLS** policies enabled
- [ ] **Redis** connection tested
- [ ] **Sentry** project created

### Security

- [ ] **Non-root user** in Docker containers
- [ ] **Secrets management** (no `.env` files in images)
- [ ] **Rate limiting** configured
- [ ] **CORS origins** restricted
- [ ] **JWT secret** is strong and rotated

### Performance

- [ ] **Connection pooling** configured (20 connections)
- [ ] **Redis caching** enabled
- [ ] **Gzip compression** enabled
- [ ] **Static assets** cached

### Monitoring

- [ ] **Health endpoints** accessible
- [ ] **Prometheus metrics** scraped
- [ ] **Sentry** receiving errors
- [ ] **Log aggregation** configured

---

## Environment Configuration

### Production Environment Variables

#### Bot (`apps/bot/.env`)

```bash
# Required
BOT_TOKEN=your_production_bot_token
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/nezuko?sslmode=require
ENVIRONMENT=production

# Optional but recommended
REDIS_URL=redis://redis:6379/0
SENTRY_DSN=https://xxx@sentry.io/yyy
LOG_LEVEL=INFO

# Webhook mode (recommended for production)
WEBHOOK_URL=https://api.nezuko.bot/webhook
WEBHOOK_SECRET=very_long_random_secret_32_chars
PORT=8000
```

#### API (`apps/api/.env`)

```bash
# Required
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/nezuko?sslmode=require
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret
ENVIRONMENT=production

# Optional
REDIS_URL=redis://redis:6379/0
SENTRY_DSN=https://xxx@sentry.io/yyy
CORS_ORIGINS=https://app.nezuko.bot
```

#### Web (`apps/web/.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=https://api.nezuko.bot/api/v1
```

### Secret Management

**Do NOT commit secrets to Git!**

Options for secret management:

| Solution | Complexity | Best For |
|----------|------------|----------|
| **Docker Secrets** | Low | Docker Swarm |
| **Environment Variables** | Low | Any deployment |
| **Vault** | High | Enterprise |
| **AWS Secrets Manager** | Medium | AWS deployments |

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml

name: Deploy Nezuko

on:
  push:
    branches: [main]
  release:
    types: [published]

env:
  REGISTRY: ghcr.io
  BOT_IMAGE: ghcr.io/${{ github.repository }}/bot
  API_IMAGE: ghcr.io/${{ github.repository }}/api

jobs:
  # Quality checks
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.13'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install ruff pylint pytest
      
      - name: Lint
        run: |
          ruff check .
          pylint apps/bot --exit-zero
      
      - name: Type check
        run: python -m pyrefly check
      
      - name: Test
        run: pytest --tb=short

  # Build and push Docker images
  build:
    needs: lint-and-test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push Bot image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: config/docker/Dockerfile.bot
          push: true
          tags: ${{ env.BOT_IMAGE }}:${{ github.sha }}
      
      - name: Build and push API image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: config/docker/Dockerfile.api
          push: true
          tags: ${{ env.API_IMAGE }}:${{ github.sha }}

  # Deploy to production
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'release'
    
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd /opt/nezuko
            docker compose pull
            docker compose up -d
```

### Deployment Flow

```mermaid
graph LR
    A[Push to main] --> B[Lint & Test]
    B --> C{Tests Pass?}
    C -->|No| D[Fail]
    C -->|Yes| E[Build Images]
    E --> F[Push to Registry]
    
    G[Create Release] --> H[Trigger Deploy]
    H --> I[Pull Images]
    I --> J[Rolling Update]
    J --> K[Health Check]
    K -->|Fail| L[Rollback]
    K -->|Pass| M[✅ Complete]
```

---

## Monitoring

### Health Endpoints

```bash
# Bot health
curl https://api.nezuko.bot/health
# {"status": "healthy", "database": "ok", "redis": "ok"}

# Kubernetes probes
curl https://api.nezuko.bot/live   # Liveness
curl https://api.nezuko.bot/ready  # Readiness
```

### Prometheus Metrics

```yaml
# prometheus.yml

scrape_configs:
  - job_name: 'nezuko-bot'
    static_configs:
      - targets: ['bot:8000']
    
  - job_name: 'nezuko-api'
    static_configs:
      - targets: ['api:8080']
```

### Key Metrics to Monitor

| Metric | Alert Threshold | Description |
|--------|-----------------|-------------|
| `bot_verifications_total{status="failed"}` | > 10/min | Failed verifications |
| `bot_verification_latency_seconds{quantile="0.95"}` | > 500ms | p95 latency |
| `bot_telegram_api_errors_total` | > 5/min | Telegram API errors |
| `http_requests_total{status="5xx"}` | > 1/min | Server errors |

### Alerting Rules

```yaml
# alertmanager rules

groups:
  - name: nezuko
    rules:
      - alert: HighErrorRate
        expr: rate(bot_verifications_total{status="failed"}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High verification failure rate"

      - alert: HighLatency
        expr: histogram_quantile(0.95, bot_verification_latency_seconds) > 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High verification latency"
```

---

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.prod.yml

services:
  api:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

### Load Balancing

With multiple API instances, use round-robin load balancing:

```caddyfile
api.nezuko.bot {
    reverse_proxy api:8080 {
        lb_policy round_robin
        health_path /health
        health_interval 30s
    }
}
```

### Database Connection Pooling

```python
# Adjust pool size based on instances
# Rule: total_connections = pool_size * num_instances

engine_kwargs = {
    "pool_size": 10,       # 10 per instance
    "max_overflow": 5,     # Extra during spikes
}

# With 3 instances: 3 * 10 = 30 connections
# PostgreSQL default: 100 connections
```

### Redis Caching Strategy

```python
# Cache hot paths aggressively
CACHE_TTL = {
    "group_config": 300,      # 5 minutes
    "user_verified": 300,     # 5 minutes
    "channel_info": 3600,     # 1 hour
    "rate_limit": 60,         # 1 minute
}
```

---

## Rollback Procedure

If deployment fails:

```bash
# 1. Check container logs
docker compose logs bot api

# 2. Rollback to previous image
docker compose down
docker compose -f docker-compose.prod.yml up -d --no-build

# 3. If using specific versions, rollback to known good
export TAG=v1.0.0
docker compose up -d
```

---

## Related Documentation

- [**Architecture**](../architecture/README.md) - System design overview
- [**Getting Started**](../getting-started/README.md) - Development setup
- [**Contributing**](../contributing/README.md) - Development workflow
- [**Horizontal Scaling**](../architecture/horizontal-scaling.md) - Scaling strategies

---

*See also: [Architecture](../architecture/README.md) | [Monitoring](#monitoring)*
