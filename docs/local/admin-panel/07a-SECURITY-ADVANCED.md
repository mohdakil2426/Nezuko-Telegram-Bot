# 🛡️ Advanced Security Topics

> **Nezuko Admin Panel - Infrastructure Security & Zero Trust (2026)**
> 
> **Last Updated**: January 24, 2026  
> **Standards**: Zero Trust Architecture, Container Security, Supply Chain Security

---

## 📋 Table of Contents

| Section                                                  | Focus Area                |
| -------------------------------------------------------- | ------------------------- |
| [1. Infrastructure Security](#1-infrastructure-security) | Docker, PostgreSQL, Redis |
| [2. WebSocket Security](#2-websocket-security)           | Real-time communication   |
| [3. Zero Trust Architecture](#3-zero-trust-architecture) | Modern security model     |
| [4. CSRF & XSS Protection](#4-csrf--xss-protection)      | Web vulnerabilities       |
| [5. Supply Chain Security](#5-supply-chain-security)     | Dependencies, SBOM        |
| [6. Monitoring & Alerting](#6-monitoring--alerting)      | Threat detection          |
| [7. Security Testing](#7-security-testing)               | Automated & manual        |
| [8. Compliance](#8-compliance)                           | GDPR, SOC 2 readiness     |

---

## 1. Infrastructure Security

### 1.1 Docker Container Security

#### 1.1.1 Secure Base Images

```dockerfile
# ============================================
# PRODUCTION DOCKERFILE (BEST PRACTICES)
# ============================================

# Stage 1: Builder (multi-stage build)
FROM python:3.13-slim as builder

# Run as non-root during build
RUN useradd -m -u 1000 builder
USER builder

WORKDIR /app

# Install dependencies to wheels
COPY --chown=builder:builder requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Runtime (minimal)
FROM python:3.13-slim

# Security: Create non-root user
RUN useradd -m -u 1000 -s /bin/bash appuser && \
    mkdir -p /app /logs && \
    chown -R appuser:appuser /app /logs

# Copy only necessary files from builder
COPY --from=builder --chown=appuser:appuser /home/builder/.local /home/appuser/.local
COPY --chown=appuser:appuser . /app

WORKDIR /app

# Switch to non-root user
USER appuser

# Security: Read-only filesystem
# Mount writable volumes for /logs and /tmp only
VOLUME ["/logs"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD python -c "import requests; requests.get('http://localhost:8080/health', timeout=2)"

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

#### 1.1.2 Docker Compose Security

```yaml
# ============================================
# DOCKER-COMPOSE.YML (PRODUCTION)
# ============================================
version: '3.9'

services:
  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    image: nezuko-api:${VERSION:-latest}
    container_name: nezuko-api
    
    # Security: Run as non-root
    user: "1000:1000"
    
    # Security: Drop all capabilities, add only needed
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE  # Only if binding to port 80/443
    
    # Security: Read-only root filesystem
    read_only: true
    tmpfs:
      - /tmp:mode=1777,size=100M
      - /var/run:mode=755,size=10M
    
    # Security: Resource limits (prevent DoS)
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    
    # Security: Disable privileged mode
    privileged: false
    
    # Security: No new privileges
    security_opt:
      - no-new-privileges:true
    
    # Security: AppArmor/SELinux profile
    security_opt:
      - apparmor=docker-default
    
    # Networking
    networks:
      - internal
    
    # Environment variables from secrets
    env_file:
      - .env.production
    
    # Logging
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    
    # Health check
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:18-alpine
    container_name: nezuko-postgres
    
    # Security: Run as postgres user
    user: postgres
    
    # Security: Read-only except data directory
    read_only: true
    tmpfs:
      - /tmp
      - /var/run/postgresql
    
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init-db.sh:/docker-entrypoint-initdb.d/init.sh:ro
    
    environment:
      POSTGRES_DB: nezuko
      POSTGRES_USER: nezuko_user
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    
    # Security: Secrets management
    secrets:
      - postgres_password
    
    # Security: No external exposure
    networks:
      - internal
    
    # Security: Resource limits
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G

  redis:
    image: redis:8-alpine
    container_name: nezuko-redis
    
    # Security: Run as redis user
    user: redis
    
    # Security: Read-only filesystem
    read_only: true
    tmpfs:
      - /tmp
    
    volumes:
      - redis-data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf:ro
    
    # Security: Custom config with auth
    command: redis-server /usr/local/etc/redis/redis.conf
    
    # Security: Internal network only
    networks:
      - internal
    
    # Security: Resource limits
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M

  caddy:
    image: caddy:2.10-alpine
    container_name: nezuko-caddy
    
    ports:
      - "80:80"
      - "443:443"
    
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    
    networks:
      - internal
      - external
    
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M

networks:
  internal:
    driver: bridge
    internal: true  # No internet access
  external:
    driver: bridge

volumes:
  postgres-data:
    driver: local
  redis-data:
    driver: local
  caddy-data:
    driver: local
  caddy-config:
    driver: local

secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt
```

#### 1.1.3 Container Security Checklist

- [ ] Use minimal base images (Alpine, Distroless)
- [ ] Multi-stage builds to reduce image size
- [ ] Run as non-root user (UID 1000+)
- [ ] Read-only root filesystem
- [ ] Drop all capabilities, add only needed
- [ ] Set resource limits (CPU, memory)
- [ ] Use `no-new-privileges` security option
- [ ] Enable AppArmor/SELinux profiles
- [ ] Scan images for vulnerabilities (Trivy, Snyk)
- [ ] Pin image versions (no `:latest` tag)
- [ ] Sign and verify images (Docker Content Trust)

### 1.2 PostgreSQL Security

```sql
-- ============================================
-- POSTGRESQL HARDENING (2026)
-- ============================================

-- 1. Create dedicated users (not superuser)
CREATE USER nezuko_admin WITH
  CREATEDB
  CREATEROLE
  PASSWORD 'STRONG_PASSWORD_FROM_SECRET';

CREATE USER nezuko_app WITH
  PASSWORD 'DIFFERENT_STRONG_PASSWORD';

-- 2. Grant minimal privileges
GRANT CONNECT ON DATABASE nezuko TO nezuko_app;
GRANT USAGE ON SCHEMA public TO nezuko_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nezuko_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nezuko_app;

-- 3. Revoke dangerous privileges
REVOKE ALL ON SCHEMA public FROM public;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- 4. Enable Row-Level Security (RLS) for multi-tenancy
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_users_isolation ON admin_users
  USING (id = current_setting('app.current_user_id')::UUID);

-- 5. Audit logging
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_disconnections = 'on';
ALTER SYSTEM SET log_statement = 'ddl';  -- Log schema changes
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log slow queries (>1s)

SELECT pg_reload_conf();
```

#### 1.2.1 postgresql.conf Security

```ini
# ============================================
# POSTGRESQL.CONF (SECURITY HARDENING)
# ============================================

# Network Security
listen_addresses = 'localhost'  # Or specific private IP
port = 5432
max_connections = 100

# SSL/TLS (Required in production)
ssl = on
ssl_cert_file = '/etc/ssl/certs/server.crt'
ssl_key_file = '/etc/ssl/private/server.key'
ssl_ca_file = '/etc/ssl/certs/ca.crt'
ssl_min_protocol_version = 'TLSv1.2'
ssl_prefer_server_ciphers = on

# Authentication Security
password_encryption = scram-sha-256  # Not MD5!

# Logging (Security Events)
logging_collector = on
log_destination = 'stderr'
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB

log_connections = on
log_disconnections = on
log_duration = off
log_line_prefix = '%t [%p]: user=%u,db=%d,app=%a,client=%h '
log_statement = 'ddl'
log_min_duration_statement = 1000  # Log queries >1s

# Performance & DoS Prevention
shared_buffers = 512MB
effective_cache_size = 2GB
statement_timeout = 30000  # 30 seconds (prevent long-running queries)
idle_in_transaction_session_timeout = 60000  # 60 seconds
```

#### 1.2.2 pg_hba.conf Security

```
# ============================================
# PG_HBA.CONF (CLIENT AUTHENTICATION)
# ============================================

# TYPE  DATABASE        USER            ADDRESS         METHOD

# Local connections (Unix sockets)
local   all             postgres                        peer
local   all             all                             scram-sha-256

# Remote connections (require SSL)
hostssl all             all             10.0.0.0/8      scram-sha-256
hostssl all             all             172.16.0.0/12   scram-sha-256

# Reject everything else
host    all             all             0.0.0.0/0       reject
host    all             all             ::/0            reject
```

### 1.3 Redis Security

```conf
# ============================================
# REDIS.CONF (SECURITY HARDENING)
# ============================================

# Network Security
bind 127.0.0.1 ::1  # Localhost only (or specific private IP)
protected-mode yes
port 6379

# SSL/TLS (Redis 6+)
tls-port 6380
port 0  # Disable non-TLS port
tls-cert-file /etc/ssl/certs/redis.crt
tls-key-file /etc/ssl/private/redis.key
tls-ca-cert-file /etc/ssl/certs/ca.crt
tls-protocols "TLSv1.2 TLSv1.3"
tls-prefer-server-ciphers yes

# Authentication (ACL - Redis 6+)
aclfile /etc/redis/users.acl

# Legacy auth (if ACL not used)
requirepass YOUR_VERY_STRONG_REDIS_PASSWORD

# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""
rename-command SHUTDOWN ""
rename-command DEBUG ""

# Resource limits (DoS prevention)
maxmemory 512mb
maxmemory-policy allkeys-lru
maxclients 10000
timeout 300  # Close idle clients after 5 min

# Persistence (with security)
appendonly yes
appendfsync everysec
dir /var/lib/redis
dbfilename dump.rdb

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Disable Lua scripts (if not needed)
# lua-time-limit 5000
```

#### 1.3.1 Redis ACL (users.acl)

```
# ============================================
# REDIS ACL (ACCESS CONTROL LIST)
# ============================================

# Default user (disabled)
user default off

# Application user (read/write on specific keys)
user nezuko_app on >STRONG_PASSWORD_HERE ~session:* ~cache:* ~ratelimit:* +@all -@dangerous

# Admin user (full access for maintenance)
user nezuko_admin on >DIFFERENT_PASSWORD ~* +@all

# Read-only analytics user
user analytics_readonly on >READONLY_PASSWORD ~* +@read -@write -@dangerous
```

---

## 2. WebSocket Security

### 2.1 Authentication & Authorization

```python
# ============================================
# WEBSOCKET AUTHENTICATION (FastAPI)
# ============================================
from fastapi import WebSocket, WebSocketDisconnect, status
from jose import JWTError, jwt

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket):
        """Authenticate WebSocket connection"""
        # 1. Accept connection
        await websocket.accept()
        
        try:
            # 2. Wait for authentication message (5 second timeout)
            auth_message = await asyncio.wait_for(
                websocket.receive_json(),
                timeout=5.0
            )
            
            # 3. Validate JWT token
            token = auth_message.get("token")
            if not token:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return None
            
            payload = jwt.decode(
                token,
                PUBLIC_KEY,
                algorithms=["ES256"],
                issuer="nezuko-admin-api",
                audience="nezuko-admin-web",
            )
            
            user_id = payload["sub"]
            
            # 4. Verify origin (CSWSH protection)
            origin = websocket.headers.get("origin")
            if origin not in ALLOWED_ORIGINS:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return None
            
            # 5. Rate limit connections (max 10 per user)
            user_connections = [
                conn for uid, conn in self.active_connections.items()
                if uid.startswith(f"{user_id}:")
            ]
            if len(user_connections) >= 10:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return None
            
            # 6. Store connection
            connection_id = f"{user_id}:{uuid4()}"
            self.active_connections[connection_id] = websocket
            
            return connection_id
            
        except asyncio.TimeoutError:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return None
        except JWTError:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return None

manager = ConnectionManager()

@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    """
    WebSocket endpoint for real-time log streaming
    """
    connection_id = await manager.connect(websocket)
    
    if not connection_id:
        return  # Authentication failed
    
    try:
        while True:
            # Message validation
            data = await websocket.receive_json()
            
            # Rate limit messages (10/sec per connection)
            if not await check_websocket_rate_limit(connection_id):
                await websocket.send_json({
                    "error": "Rate limit exceeded"
                })
                continue
            
            # Validate message schema
            try:
                message = WebSocketMessage(**data)
            except ValidationError as e:
                await websocket.send_json({
                    "error": "Invalid message schema",
                    "details": e.errors()
                })
                continue
            
            # Process message...
            
    except WebSocketDisconnect:
        manager.disconnect(connection_id)
```

### 2.2 WebSocket Security Checklist

- [ ] **Use WSS (TLS)**: Always encrypt WebSocket connections
- [ ] **Authenticate immediately**: Require JWT within 5 seconds of connection
- [ ] **Validate Origin header**: Prevent Cross-Site WebSocket Hijacking (CSWSH)
- [ ] **Rate limit connections**: Max 10 concurrent per user
- [ ] **Rate limit messages**: Max 10 messages/sec per connection
- [ ] **Validate all messages**: Use Pydantic schema validation
- [ ] **Size limits**: Max 64KB per message
- [ ] **Session re-validation**: Every 30 minutes
- [ ] **Logout invalidation**: Close WebSocket on user logout
- [ ] **Logging**: Log all connection attempts and errors

---

## 3. Zero Trust Architecture

### 3.1 Zero Trust Principles

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     ZERO TRUST ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   🔐 NEVER TRUST, ALWAYS VERIFY                                         │
│   ├── No implicit trust based on network location                      │
│   ├── Verify EVERY request, regardless of source                       │
│   └── Assume breach: limit blast radius                                │
│                                                                         │
│   🎯 LEAST PRIVILEGE ACCESS                                             │
│   ├── Grant minimum permissions needed                                 │
│   ├── Time-bound access (expire unused permissions)                    │
│   └── Context-aware decisions (location, device, time)                 │
│                                                                         │
│   🔍 CONTINUOUS MONITORING                                              │
│   ├── Log every access attempt                                         │
│   ├── Detect anomalies (unusual IP, time, behavior)                    │
│   └── Automated response (block, alert, MFA challenge)                 │
│                                                                         │
│   🏗️ MICROSEGMENTATION                                                  │
│   ├── Isolate services (network policies)                              │
│   ├── Separate dev/staging/prod                                        │
│   └── Container-level isolation                                        │
│                                                                         │
│   🔑 IDENTITY-CENTRIC SECURITY                                          │
│   ├── Identity is the new perimeter                                    │
│   ├── MFA for all admin access                                         │
│   └── Service-to-service authentication (mTLS)                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Implementation Checklist

- [ ] **Network Segmentation**: Internal network for backend services
- [ ] **Service Authentication**: mTLS between API and database
- [ ] **Per-Request Authorization**: Check permissions on EVERY API call
- [ ] **No Admin Backdoors**: Owner account subject to same controls
- [ ] **Audit Everything**: Log all access (success and failure)
- [ ] **Behavioral Analysis**: Detect unusual access patterns
- [ ] **Automated Revocation**: Remove inactive accounts after 90 days
- [ ] **Device Trust**: Verify client TLS certificates (future)

---

## 4. CSRF & XSS Protection

### 4.1 CSRF Protection

```python
# ============================================
# CSRF TOKEN IMPLEMENTATION (FastAPI)
# ============================================
from fastapi import Request, HTTPException, Depends
from itsdangerous import URLSafeTimedSerializer

CSRF_SECRET = os.environ["CSRF_SECRET_KEY"]
csrf_serializer = URLSafeTimedSerializer(CSRF_SECRET)

def generate_csrf_token() -> str:
    """Generate CSRF token (tied to session)"""
    return csrf_serializer.dumps({"timestamp": time.time()})

def verify_csrf_token(token: str, max_age: int = 3600) -> bool:
    """Verify CSRF token (1 hour validity)"""
    try:
        data = csrf_serializer.loads(token, max_age=max_age)
        return True
    except:
        return False

# Middleware
async def csrf_protect(request: Request):
    """Require CSRF token for state-changing requests"""
    if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
        # Get token from header
        csrf_token = request.headers.get("X-CSRF-Token")
        
        if not csrf_token or not verify_csrf_token(csrf_token):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token missing or invalid"
            )

# Usage
@router.post("/groups")
async def create_group(
    group: GroupCreate,
    _: None = Depends(csrf_protect)
):
    ...
```

#### 4.1.1 Cookie-Based CSRF (SameSite)

```python
# ============================================
# SAMESITE COOKIE CSRF PROTECTION
# ============================================

def set_session_cookie(response: Response, session_id: str):
    """
    SameSite=Strict provides CSRF protection
    """
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=True,
        samesite="strict",  # ✅ CSRF protection (no cross-site requests)
        max_age=604800,
    )
```

| SameSite Value | CSRF Protection | Use Case                      |
| -------------- | --------------- | ----------------------------- |
| `Strict`       | ✅ Strong        | Best for sensitive operations |
| `Lax`          | ⚠️ Partial       | Balance security vs UX        |
| `None`         | ❌ None          | Third-party cookies (avoid)   |

### 4.2 XSS Protection

```typescript
// ============================================
// XSS PROTECTION (DOMPURIFY - CLIENT SIDE)
// ============================================
import DOMPurify from 'dompurify';

// Sanitize HTML before rendering
function renderUserContent(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
    ALLOW_DATA_ATTR: false,
  });
}

// Never use dangerouslySetInnerHTML without sanitization
function MessageComponent({ content }: { content: string }) {
  const sanitized = renderUserContent(content);
  
  return (
    <div dangerouslySetInnerHTML={{ __html: sanitized }} />
  );
}
```

```python
# ============================================
# XSS PROTECTION (SERVER SIDE)
# ============================================
from markupsafe import escape

def sanitize_output(text: str) -> str:
    """Escape HTML entities"""
    return escape(text)

# FastAPI automatically escapes JSON responses
# But for HTML responses:
@app.get("/preview", response_class=HTMLResponse)
async def preview_message(message: str):
    safe_message = sanitize_output(message)
    return f"<p>{safe_message}</p>"
```

#### 4.2.1 Content Security Policy (CSP) for XSS

```javascript
// next.config.js
const cspHeader = `
  default-src 'self';
  script-src 'self' 'nonce-{NONCE}';
  style-src 'self' 'nonce-{NONCE}' https://fonts.googleapis.com;
  img-src 'self' data: https:;
  font-src 'self' https://fonts.gstatic.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`

module.exports = {
  async headers() {
    return [{
      source: '/:path*',
      headers: [{
        key: 'Content-Security-Policy',
        value: cspHeader.replace(/\s{2,}/g, ' ').trim()
      }]
    }]
  }
}
```

---

## 5. Supply Chain Security

### 5.1 Dependency Management

```python
# ============================================
# REQUIREMENTS.TXT (PINNED VERSIONS)
# ============================================

# Core Framework
fastapi==0.124.4  # Exact version, not >=
uvicorn[standard]==0.40.0
pydantic==2.12.5

# Security
python-jose[cryptography]==3.5.0
passlib[argon2]==1.7.4

# Database
sqlalchemy[asyncio]==2.0.46
asyncpg==0.31.0
alembic==1.18.1

# Hashes for integrity verification (use pip-compile)
# fastapi==0.124.4 --hash=sha256:abc123...
```

#### 5.1.1 Automated Vulnerability Scanning

```yaml
# ============================================
# .GITHUB/WORKFLOWS/SECURITY.YML
# ============================================
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 0 * * *'  # Daily

jobs:
  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Python dependencies
      - name: Scan Python dependencies
        run: |
          pip install pip-audit
          pip-audit --require-hashes --strict
      
      # NPM dependencies
      - name: Scan NPM dependencies
        run: |
          npm audit --production --audit-level=high
      
      # Docker image scan
      - name: Scan Docker image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'nezuko-api:latest'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'  # Fail on vulnerabilities

  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Bandit (Python SAST)
        run: |
          pip install bandit
          bandit -r apps/api/ -ll --exit-zero --format json -o bandit-report.json
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: sast-results
          path: bandit-report.json

  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history
      
      - name: Scan for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
```

### 5.2 SBOM (Software Bill of Materials)

```bash
# ============================================
# GENERATE SBOM (CYCLONEDX FORMAT)
# ============================================

# Python SBOM
pip install cyclonedx-bom
cyclonedx-py -o sbom-api.json --format json

# NPM SBOM
npx @cyclonedx/cyclonedx-npm --output-file sbom-web.json

# Docker SBOM
syft nezuko-api:latest -o cyclonedx-json > sbom-docker.json
```

### 5.3 Image Signing (Docker Content Trust)

```bash
# ============================================
# SIGN DOCKER IMAGES
# ============================================

# Enable Docker Content Trust
export DOCKER_CONTENT_TRUST=1

# Generate signing key
docker trust key generate security-team

# Sign and push image
docker trust sign nezuko-api:v1.0.0

# Verify signature on pull
docker pull nezuko-api:v1.0.0
# (Will fail if signature invalid)
```

---

## 6. Monitoring & Alerting

### 6.1 Security Events to Monitor

| Event                           | Severity | Alert Threshold      |
| ------------------------------- | -------- | -------------------- |
| **Failed login attempts**       | Medium   | 5 failures / 15 min  |
| **Password change**             | High     | Immediate            |
| **Admin user created**          | High     | Immediate            |
| **Configuration modified**      | High     | Immediate            |
| **Database accessed**           | Medium   | Unusual IP           |
| **Rate limit exceeded**         | Low      | 50 violations / hour |
| **JWT validation failure**      | High     | 10 failures / 5 min  |
| **Unauthorized access attempt** | Critical | Immediate            |
| **Docker container restarted**  | Medium   | 3 restarts / hour    |
| **Disk space >90%**             | Critical | Immediate            |

### 6.2 Structured Logging (Structlog)

```python
# ============================================
# SECURITY EVENT LOGGING
# ============================================
import structlog

logger = structlog.get_logger()

# Good: Structured security log
logger.info(
    "authentication_success",
    user_id=user.id,
    user_email=user.email,
    ip_address=request.client.host,
    user_agent=request.headers.get("user-agent"),
    session_id=session_id,
    timestamp=datetime.now(timezone.utc).isoformat(),
)

# Good: Failed login attempt
logger.warning(
    "authentication_failure",
    email=credentials.email,  # OK to log (not successful auth)
    ip_address=request.client.host,
    reason="invalid_password",
    attempt_count=await get_failed_attempts(credentials.email),
)

# Bad: Unstructured log
logger.info(f"User {user.email} logged in")  # Hard to parse
```

### 6.3 Sentry Integration (Error Tracking)

```python
# ============================================
# SENTRY CONFIGURATION
# ============================================
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn=os.environ["SENTRY_DSN"],
    environment=os.environ.get("ENVIRONMENT", "production"),
    release=f"nezuko-admin@{VERSION}",
    
    # Performance monitoring
    traces_sample_rate=0.1,  # 10% of transactions
    
    # Integrations
    integrations=[
        FastApiIntegration(),
        SqlalchemyIntegration(),
    ],
    
    # Security: Scrub sensitive data
    before_send=scrub_sensitive_data,
)

def scrub_sensitive_data(event, hint):
    """Remove sensitive data from Sentry events"""
    # Remove Authorization header
    if "request" in event and "headers" in event["request"]:
        event["request"]["headers"].pop("Authorization", None)
        event["request"]["headers"].pop("Cookie", None)
    
    # Remove environment variables
    if "server_name" in event:
        event.pop("server_name", None)
    
    return event
```

### 6.4 Prometheus Metrics (Optional)

```python
# ============================================
# SECURITY METRICS (PROMETHEUS)
# ============================================
from prometheus_client import Counter, Histogram

# Track authentication attempts
auth_attempts = Counter(
    'auth_attempts_total',
    'Total authentication attempts',
    ['status']  # Labels: success, invalid_password, account_locked
)

# Track API latency
api_latency = Histogram(
    'api_request_duration_seconds',
    'API request latency',
    ['endpoint', 'method']
)

# Usage
@router.post("/auth/login")
async def login(credentials: LoginRequest):
    try:
        user = await authenticate_user(credentials)
        auth_attempts.labels(status='success').inc()
        return {"access_token": ...}
    except InvalidPasswordError:
        auth_attempts.labels(status='invalid_password').inc()
        raise HTTPException(...)
```

---

## 7. Security Testing

### 7.1 Pre-Deployment Security Tests

```bash
#!/bin/bash
# ============================================
# SECURITY TEST SUITE (Run before deployment)
# ============================================

echo "🔒 Running security tests..."

# 1. Dependency vulnerabilities
echo "📦 Scanning dependencies..."
pip-audit --require-hashes || exit 1
npm audit --production --audit-level=high || exit 1

# 2. Docker image vulnerabilities
echo "🐳 Scanning Docker images..."
trivy image --severity CRITICAL,HIGH nezuko-api:latest || exit 1

# 3. Static analysis (SAST)
echo "🔍 Running static analysis..."
bandit -r apps/api/ -ll || exit 1

# 4. Secret scanning
echo "🔑 Scanning for exposed secrets..."
trufflehog filesystem . --json || exit 1

# 5. Infrastructure security
echo "⚙️ Checking Docker Compose config..."
docker-compose config --quiet || exit 1

# 6. TLS/SSL verification
echo "🔐 Verifying TLS configuration..."
testssl.sh --severity HIGH https://api.nezuko.bot || exit 1

# 7. Security headers
echo "📋 Checking security headers..."
curl -I https://admin.nezuko.bot | grep -E "(Strict-Transport-Security|Content-Security-Policy|X-Frame-Options)" || exit 1

echo "✅ All security tests passed!"
```

### 7.2 Penetration Testing Checklist

| Category           | Tests                                           | Tools                 |
| ------------------ | ----------------------------------------------- | --------------------- |
| **Authentication** | JWT manipulation, brute force, session fixation | Burp Suite, OWASP ZAP |
| **Authorization**  | Privilege escalation, IDOR                      | Manual testing        |
| **Injection**      | SQL, XSS, command injection                     | SQLMap, XSStrike      |
| **CSRF**           | State-changing requests                         | Manual testing        |
| **Rate Limiting**  | Bypass attempts                                 | Custom scripts        |
| **API Security**   | Fuzzing, schema validation                      | Postman, Burp Suite   |
| **WebSocket**      | Message manipulation, auth bypass               | wscat, Burp Suite     |
| **Headers**        | CSP bypasses, missing headers                   | securityheaders.com   |

---

## 8. Compliance

### 8.1 GDPR Compliance Checklist

- [ ] **Data Minimization**: Collect only necessary data
- [ ] **User Consent**: Explicit opt-in for data collection
- [ ] **Right to Access**: API endpoint for user data export
- [ ] **Right to Deletion**: API endpoint to delete user account
- [ ] **Data Portability**: Export user data in JSON format
- [ ] **Breach Notification**: Incident response plan (72-hour reporting)
- [ ] **Data Encryption**: TLS for transit, AES-256 for rest
- [ ] **Privacy Policy**: Clear documentation of data usage
- [ ] **DPO (if applicable)**: Data Protection Officer appointed
- [ ] **Data Processing Agreement**: With third-party services (Sentry, etc.)

### 8.2 SOC 2 Readiness

| Control                     | Implementation                     |
| --------------------------- | ---------------------------------- |
| **CC6.1 Logical Access**    | RBAC, MFA, session management      |
| **CC6.2 Authentication**    | Argon2id, JWT, password policy     |
| **CC6.3 Authorization**     | Per-endpoint permission checks     |
| **CC6.6 Encryption**        | TLS 1.3, AES-256-GCM               |
| **CC6.7 Transmission**      | HTTPS only, HSTS                   |
| **CC7.2 Monitoring**        | Structlog, Sentry, audit logs      |
| **CC7.3 Alarms**            | Automated alerting (Sentry, email) |
| **CC7.4 Response**          | Incident response plan documented  |
| **CC8.1 Change Management** | Git, PR reviews, CI/CD             |

---

## 9. Production Deployment Checklist

### 9.1 Final Security Verification

```bash
# ============================================
# PRODUCTION READINESS CHECK
# ============================================

# Environment
[ ] All secrets in environment variables (not .env file)
[ ] DEBUG=false
[ ] HTTPS enforced
[ ] Domain names configured (admin.nezuko.bot, api.nezuko.bot)

# Authentication
[ ] JWT private key generated (ES256, not HS256)
[ ] Refresh token rotation enabled
[ ] Session timeout: 15 minutes (access), 7 days (refresh)
[ ] Password policy: 12+ chars, Argon2id
[ ] Rate limiting: 5 login attempts / 15 minutes

# Authorization
[ ] RBAC enforced on all endpoints
[ ] Default role: VIEWER
[ ] Owner account created with strong password

# API Security
[ ] CORS restricted to admin domain only
[ ] Rate limiting: 100 req/min general, 50 req/min write
[ ] Pydantic validation on all inputs
[ ] No sensitive data in error messages

# Infrastructure
[ ] Docker containers run as non-root
[ ] PostgreSQL: SCRAM-SHA-256 auth, TLS enabled
[ ] Redis: requirepass set, TLS enabled
[ ] All services on internal network (no public exposure)

# Headers
[ ] CSP header with nonce-based scripts
[ ] HSTS header (1 year)
[ ] X-Frame-Options: DENY
[ ] Security headers tested (securityheaders.com)

# Monitoring
[ ] Sentry configured
[ ] Structlog outputting JSON
[ ] Audit log capturing: login, logout, config changes
[ ] Prometheus metrics (optional)

# Testing
[ ] Security tests passing (./scripts/security-test.sh)
[ ] Dependency vulnerabilities: 0 critical/high
[ ] Docker image scan: 0 critical/high
[ ] Manual penetration testing completed

# Compliance
[ ] GDPR: Privacy policy published
[ ] GDPR: Data export/deletion endpoints
[ ] SOC 2: Controls documented
[ ] Incident response plan documented

# Backup
[ ] Database backups automated (daily)
[ ] Backup encryption enabled
[ ] Backup restoration tested

# Documentation
[ ] Security documentation reviewed
[ ] Incident response plan reviewed
[ ] Team trained on security procedures
```

---

## 10. Emergency Contacts

| Role                      | Contact               | Purpose                  |
| ------------------------- | --------------------- | ------------------------ |
| **Security Lead**         | security@nezuko.bot   | Primary security contact |
| **On-Call Engineer**      | oncall@nezuko.bot     | After-hours incidents    |
| **Certificate Authority** | Let's Encrypt support | Certificate issues       |
| **Hosting Provider**      | DigitalOcean support  | Infrastructure issues    |

---

**Security is not a feature, it's a foundation.**

[← Back to Core Security](./07-SECURITY.md) | [Back to Index](./README.md) | [Next: Deployment →](./08-DEPLOYMENT.md)
