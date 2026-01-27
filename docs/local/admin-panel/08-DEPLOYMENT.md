# 🚀 Deployment Guide

> **Nezuko Admin Panel - Production Deployment**

---

## 1. Infrastructure Overview

### 1.1 Recommended Setup (GitHub Student Pack)

| Component    | Resource                 | Cost          |
| ------------ | ------------------------ | ------------- |
| **VPS**      | DigitalOcean Droplet 2GB | $12/mo → FREE |
| **Domain**   | Namecheap .me            | FREE (1 year) |
| **SSL**      | Caddy Auto-SSL           | FREE          |
| **Database** | Self-hosted PostgreSQL   | Included      |
| **Cache**    | Self-hosted Redis        | Included      |

### 1.2 Service Ports

| Service       | Internal Port | External Access |
| ------------- | ------------- | --------------- |
| Caddy         | 80, 443       | Public          |
| Next.js (web) | 3000          | Via Caddy       |
| FastAPI (api) | 8080          | Via Caddy       |
| Telegram Bot  | 8000, 8443    | Via Caddy       |
| PostgreSQL    | 5432          | Internal only   |
| Redis         | 6379          | Internal only   |

---

## 2. Domain Configuration

### 2.1 DNS Records (Namecheap/Cloudflare)

| Type  | Host  | Value          | TTL |
| ----- | ----- | -------------- | --- |
| A     | @     | `<droplet-ip>` | 300 |
| A     | admin | `<droplet-ip>` | 300 |
| A     | api   | `<droplet-ip>` | 300 |
| CNAME | www   | yourdomain.me  | 300 |

### 2.2 Subdomain Structure

```
yourdomain.me          → Bot webhook
admin.yourdomain.me    → Admin panel (Next.js)
api.yourdomain.me      → Admin API (FastAPI)
```

---

## 3. Server Setup

### 3.1 Initial Setup

```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
apt install docker-compose-plugin -y

# Create non-root user (optional but recommended)
adduser nezuko
usermod -aG docker nezuko
```

### 3.2 Clone Repository

```bash
# Switch to deploy user
su - nezuko

# Clone repository
git clone https://github.com/YOUR_USERNAME/GMBot.git
cd GMBot
```

---

## 4. Environment Configuration

### 4.1 Create Production .env

```bash
cat > .env << 'EOF'
# ===========================================
# NEZUKO PRODUCTION CONFIGURATION
# ===========================================

# Bot Configuration
BOT_TOKEN=your_telegram_bot_token_here
ENVIRONMENT=production

# Database
POSTGRES_PASSWORD=super_secure_database_password_here
DATABASE_URL=postgresql+asyncpg://nezuko:${POSTGRES_PASSWORD}@postgres:5432/nezuko

# Redis
REDIS_PASSWORD=super_secure_redis_password_here
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0

# Admin Panel
ADMIN_JWT_SECRET=generate_with_openssl_rand_hex_32
ADMIN_EMAIL=admin@yourdomain.me
ADMIN_PASSWORD=initial_admin_password_change_me

# Webhook
WEBHOOK_URL=https://yourdomain.me/webhook
WEBHOOK_SECRET=generate_another_random_string

# Optional: Error Tracking
SENTRY_DSN=https://your-sentry-dsn-here

# Domain
DOMAIN=yourdomain.me
EOF

# Secure the file
chmod 600 .env
```

### 4.2 Generate Secrets

```bash
# Generate JWT secret
openssl rand -hex 32

# Generate webhook secret
openssl rand -hex 16

# Generate database password
openssl rand -base64 24
```

---

## 5. Docker Compose (Full Stack)

### 5.1 docker-compose.full.yml

```yaml
version: '3.8'

services:
  # ===========================================
  # Reverse Proxy (Caddy)
  # ===========================================
  caddy:
    image: caddy:2-alpine
    container_name: nezuko-caddy
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    networks:
      - nezuko-network
    depends_on:
      - web
      - api
      - bot

  # ===========================================
  # Admin Dashboard (Next.js)
  # ===========================================
  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
    container_name: nezuko-web
    restart: always
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.${DOMAIN}
    networks:
      - nezuko-network

  # ===========================================
  # Admin API (FastAPI)
  # ===========================================
  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    container_name: nezuko-api
    restart: always
    env_file:
      - .env
    networks:
      - nezuko-network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  # ===========================================
  # Telegram Bot
  # ===========================================
  bot:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: nezuko-bot
    restart: always
    env_file:
      - .env
    networks:
      - nezuko-network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  # ===========================================
  # PostgreSQL Database
  # ===========================================
  postgres:
    image: postgres:16-alpine
    container_name: nezuko-postgres
    restart: always
    environment:
      POSTGRES_USER: nezuko
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: nezuko
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - nezuko-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nezuko"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ===========================================
  # Redis Cache
  # ===========================================
  redis:
    image: redis:7-alpine
    container_name: nezuko-redis
    restart: always
    command: >
      redis-server
      --appendonly yes
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - nezuko-network
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  nezuko-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
  caddy-data:
  caddy-config:
```

### 5.2 Caddyfile

```caddyfile
# Main domain - Telegram webhook
{$DOMAIN} {
    reverse_proxy /webhook bot:8443
    reverse_proxy /health bot:8000
    
    header {
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
    }
}

# Admin dashboard
admin.{$DOMAIN} {
    reverse_proxy web:3000
    
    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
    }
}

# Admin API
api.{$DOMAIN} {
    reverse_proxy api:8080
    
    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options "nosniff"
        Access-Control-Allow-Origin "https://admin.{$DOMAIN}"
    }
}
```

---

## 6. Deployment Commands

### 6.1 First Deployment

```bash
# Build all images
docker compose -f docker-compose.full.yml build

# Start services
docker compose -f docker-compose.full.yml up -d

# Run database migrations
docker compose -f docker-compose.full.yml exec api alembic upgrade head

# Create initial admin user
docker compose -f docker-compose.full.yml exec api python -m scripts.create_admin

# Check logs
docker compose -f docker-compose.full.yml logs -f
```

### 6.2 Update Deployment

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.full.yml build
docker compose -f docker-compose.full.yml up -d

# Run any new migrations
docker compose -f docker-compose.full.yml exec api alembic upgrade head
```

### 6.3 Monitoring Commands

```bash
# View all logs
docker compose -f docker-compose.full.yml logs -f

# View specific service
docker compose -f docker-compose.full.yml logs -f bot

# Check service status
docker compose -f docker-compose.full.yml ps

# Resource usage
docker stats
```

---

## 7. Backup Strategy

### 7.1 Database Backup Script

```bash
#!/bin/bash
# /home/nezuko/backup.sh

BACKUP_DIR="/home/nezuko/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker compose -f docker-compose.full.yml exec -T postgres \
  pg_dump -U nezuko nezuko | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: db_$DATE.sql.gz"
```

### 7.2 Automated Backup (Cron)

```bash
# Edit crontab
crontab -e

# Add daily backup at 3 AM
0 3 * * * /home/nezuko/backup.sh >> /home/nezuko/backup.log 2>&1
```

---

## 8. Health Checks

### 8.1 Endpoints

| Endpoint                              | Expected Response       |
| ------------------------------------- | ----------------------- |
| `https://yourdomain.me/health`        | `{"status": "healthy"}` |
| `https://api.yourdomain.me/v1/health` | `{"status": "healthy"}` |
| `https://admin.yourdomain.me`         | HTML page               |

### 8.2 External Monitoring (Free)

- **UptimeRobot**: Free tier (50 monitors)
- **Healthchecks.io**: For cron jobs
- **Better Uptime**: Alternative

---

## 9. Troubleshooting

### 9.1 Common Issues

| Issue                       | Solution                            |
| --------------------------- | ----------------------------------- |
| SSL not working             | Wait 5 min for Caddy to obtain cert |
| Database connection refused | Check postgres container health     |
| 502 Bad Gateway             | Service not started, check logs     |
| Permission denied           | Check file ownership                |

### 9.2 Debug Commands

```bash
# Check container health
docker compose -f docker-compose.full.yml ps

# Enter container shell
docker compose -f docker-compose.full.yml exec api bash

# View Caddy logs
docker compose -f docker-compose.full.yml logs caddy

# Test database connection
docker compose -f docker-compose.full.yml exec postgres psql -U nezuko -d nezuko
```

---

## 10. Cost Summary

| Resource         | Monthly | With Student Pack     |
| ---------------- | ------- | --------------------- |
| DigitalOcean 2GB | $12     | **FREE** (16+ months) |
| Namecheap .me    | ~$1     | **FREE** (1 year)     |
| Total Year 1     | ~$156   | **$0**                |

---

[← Back to Advanced Security](./07a-SECURITY-ADVANCED.md) | [Back to Index](./README.md)
