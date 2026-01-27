# 🔒 Security Framework

> **Nezuko Admin Panel - Production-Grade Security (2026 Standards)**
> 
> **Last Updated**: January 24, 2026  
> **Compliance**: OWASP Top 10:2025, NIST SP 800-207, JWT RFC 8725bis

---

## 📋 Table of Contents

| Section                                                            | Focus Area                |
| ------------------------------------------------------------------ | ------------------------- |
| [1. OWASP Top 10:2025 Mitigation](#1-owasp-top-10-2025-mitigation) | Latest web security risks |
| [2. Authentication Security](#2-authentication-security)           | JWT, Argon2id, MFA        |
| [3. Authorization (RBAC)](#3-authorization-rbac)                   | Role-based access control |
| [4. API Security](#4-api-security)                                 | Rate limiting, validation |
| [5. Transport Security (TLS)](#5-transport-security-tls)           | HTTPS, certificates       |
| [6. Data Security](#6-data-security)                               | Encryption, masking       |
| [7. Session Management](#7-session-management)                     | Tokens, cookies           |
| [8. Security Headers](#8-security-headers)                         | CSP, HSTS, etc.           |

---

## 1. OWASP Top 10:2025 Mitigation

### 1.1 Risk Overview

```
┌───────────────────────────────────────────────────────────────────────────┐
│                    OWASP TOP 10:2025 (NOVEMBER 2025)                      │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  🔴 A01:2025 - Broken Access Control                                     │
│     └─ Our Mitigation: RBAC + per-endpoint authorization checks          │
│                                                                           │
│  🟠 A02:2025 - Security Misconfiguration                                 │
│     └─ Our Mitigation: Hardened defaults, automated config validation    │
│                                                                           │
│  🟡 A03:2025 - Software Supply Chain Failures ⚠️ NEW                     │
│     └─ Our Mitigation: Dependency scanning, SBOM, pinned versions        │
│                                                                           │
│  🟢 A04:2025 - Cryptographic Failures                                    │
│     └─ Our Mitigation: TLS 1.3, Argon2id, AES-256                        │
│                                                                           │
│  🔵 A05:2025 - Injection                                                 │
│     └─ Our Mitigation: Pydantic validation, parameterized queries        │
│                                                                           │
│  🟣 A06:2025 - Insecure Design                                           │
│     └─ Our Mitigation: Security-first architecture, threat modeling      │
│                                                                           │
│  🟤 A07:2025 - Authentication Failures                                   │
│     └─ Our Mitigation: JWT + refresh tokens, MFA ready                   │
│                                                                           │
│  ⚫ A08:2025 - Software/Data Integrity Failures                          │
│     └─ Our Mitigation: Signed releases, integrity checks                 │
│                                                                           │
│  ⚪ A09:2025 - Security Logging/Alerting Failures                        │
│     └─ Our Mitigation: Structured logging, audit trail                   │
│                                                                           │
│  🔶 A10:2025 - Mishandling Exceptional Conditions ⚠️ NEW                 │
│     └─ Our Mitigation: Proper error handling, fail-secure design         │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Implementation Checklist

- [x] **A01 (Access Control)**: Deny by default, explicit grants
- [x] **A02 (Misconfig)**: Environment-based config, no hardcoded secrets
- [x] **A03 (Supply Chain)**: Dependabot, `pip-audit`, Docker image scanning
- [x] **A04 (Crypto)**: TLS 1.3 min, Argon2id for passwords
- [x] **A05 (Injection)**: Pydantic for all inputs, SQLAlchemy ORM
- [x] **A06 (Design)**: Threat model reviewed, security requirements doc
- [x] **A07 (Auth)**: Short-lived JWT (15min), refresh rotation
- [x] **A08 (Integrity)**: Git tag signing, container image signing
- [x] **A09 (Logging)**: Structlog with Sentry integration
- [x] **A10 (Errors)**: Exception handlers, no sensitive data in errors

---

## 2. Authentication Security

### 2.1 Password Security (Argon2id)

```python
# ============================================
# ARGON2ID CONFIGURATION (2026 STANDARDS)
# ============================================
from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__memory_cost=65536,      # 64 MiB (OWASP recommended: 46-64 MiB)
    argon2__time_cost=3,            # Iterations (OWASP min: 2)
    argon2__parallelism=4,          # Threads (OWASP min: 1)
    argon2__hash_len=32,            # Output length
    argon2__salt_len=16,            # Salt length (OWASP min: 16)
    argon2__type="id",              # Argon2id (hybrid mode)
)

# Hash password
hashed = pwd_context.hash("user_password")

# Verify password
is_valid = pwd_context.verify("user_password", hashed)
```

| Parameter       | Value        | Rationale                                       |
| --------------- | ------------ | ----------------------------------------------- |
| **Memory Cost** | 64 MiB       | Prevents GPU attacks, OWASP 2026 recommendation |
| **Time Cost**   | 3 iterations | Balances security vs UX (~250ms hash time)      |
| **Parallelism** | 4 threads    | Matches typical server CPU cores                |
| **Hash Type**   | Argon2id     | Resistant to both GPU and side-channel attacks  |

**Why Argon2id over bcrypt/PBKDF2?**
- ✅ Winner of 2015 Password Hashing Competition
- ✅ Memory-hard (resists ASICs/GPUs)
- ✅ Side-channel resistant (hybrid of Argon2d + Argon2i)
- ✅ NIST & OWASP recommended (2026)

### 2.2 JWT Configuration (RFC 8725bis Compliant)

```python
# ============================================
# JWT SECURITY CONFIGURATION
# ============================================
from datetime import timedelta

JWT_CONFIG = {
    # Algorithm Security
    "ALGORITHM": "ES256",  # ✅ ECDSA (preferred over HS256)
    "ALLOWED_ALGORITHMS": ["ES256", "RS256"],  # Whitelist only
    "REJECT_NONE_ALGORITHM": True,  # ❌ Never allow "none"
    
    # Token Lifetimes
    "ACCESS_TOKEN_EXPIRE": timedelta(minutes=15),   # Short-lived
    "REFRESH_TOKEN_EXPIRE": timedelta(days=7),      # Longer-lived
    
    # Security Claims (Required)
    "REQUIRED_CLAIMS": ["iss", "aud", "exp", "nbf", "iat", "sub"],
    "ISSUER": "nezuko-admin-api",
    "AUDIENCE": "nezuko-admin-web",
    
    # Key Management
    "PRIVATE_KEY_PATH": "/secrets/jwt-private.pem",  # ES256 private key
    "PUBLIC_KEY_PATH": "/secrets/jwt-public.pem",    # ES256 public key
    "KEY_ROTATION_DAYS": 90,  # Rotate every 90 days
}
```

#### 2.2.1 Token Structure

```json
{
  "header": {
    "alg": "ES256",
    "typ": "JWT",
    "kid": "2026-01-key-v1"
  },
  "payload": {
    "sub": "uuid-of-admin-user",
    "iss": "nezuko-admin-api",
    "aud": "nezuko-admin-web",
    "exp": 1706123456,
    "nbf": 1706122556,
    "iat": 1706122556,
    "email": "admin@nezuko.bot",
    "role": "owner",
    "session_id": "random-uuid"
  }
}
```

#### 2.2.2 JWT Security Best Practices (2026)

| Threat                   | Mitigation                                             |
| ------------------------ | ------------------------------------------------------ |
| **Algorithm Confusion**  | Whitelist `ES256`/`RS256`, reject `none`               |
| **Weak Secrets (HS256)** | Use asymmetric (ES256) with 256-bit ECDSA keys         |
| **Token Replay**         | Include `jti` (JWT ID), track used tokens              |
| **Long-lived Tokens**    | 15min access, 7-day refresh with rotation              |
| **Payload Exposure**     | Never store PII/secrets (JWT is base64, not encrypted) |
| **Missing Validation**   | Validate ALL claims: `iss`, `aud`, `exp`, `nbf`        |

```python
# ============================================
# SECURE JWT VALIDATION (FastAPI)
# ============================================
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from jose import JWTError, jwt

security = HTTPBearer()

async def get_current_user(token: str = Depends(security)):
    try:
        payload = jwt.decode(
            token.credentials,
            PUBLIC_KEY,
            algorithms=["ES256"],  # Whitelist only
            issuer="nezuko-admin-api",
            audience="nezuko-admin-web",
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_nbf": True,
                "verify_iat": True,
                "require": ["iss", "aud", "exp", "sub"],
            }
        )
        
        # Additional validation
        if not payload.get("sub"):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED)
            
        # Check token revocation (Redis blacklist)
        if await is_token_revoked(payload["jti"]):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED)
            
        return payload
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
```

### 2.3 Refresh Token Strategy

```python
# ============================================
# REFRESH TOKEN WITH ROTATION
# ============================================
from uuid import uuid4

async def refresh_access_token(refresh_token: str):
    """
    Refresh token rotation (one-time use)
    """
    # 1. Validate refresh token
    payload = jwt.decode(refresh_token, PUBLIC_KEY, ...)
    
    # 2. Check if already used (prevent replay)
    if await redis.exists(f"used_refresh:{payload['jti']}"):
        # Token reuse detected - revoke all user sessions
        await revoke_all_user_sessions(payload["sub"])
        raise HTTPException(status.HTTP_401_UNAUTHORIZED)
    
    # 3. Mark as used
    await redis.setex(
        f"used_refresh:{payload['jti']}",
        604800,  # 7 days
        "1"
    )
    
    # 4. Issue new tokens
    new_access = create_access_token(payload["sub"])
    new_refresh = create_refresh_token(payload["sub"])
    
    return {
        "access_token": new_access,
        "refresh_token": new_refresh,  # New refresh token
        "token_type": "bearer"
    }
```

### 2.4 Multi-Factor Authentication (MFA) - Ready

```python
# ============================================
# MFA CONFIGURATION (TOTP)
# ============================================
from pyotp import TOTP

class MFAService:
    @staticmethod
    def generate_secret() -> str:
        """Generate TOTP secret for user"""
        return pyotp.random_base32()
    
    @staticmethod
    def get_qr_code_uri(username: str, secret: str) -> str:
        """Generate QR code URI for authenticator apps"""
        totp = TOTP(secret)
        return totp.provisioning_uri(
            name=username,
            issuer_name="Nezuko Admin"
        )
    
    @staticmethod
    def verify_code(secret: str, code: str) -> bool:
        """Verify TOTP code (6 digits)"""
        totp = TOTP(secret)
        return totp.verify(code, valid_window=1)  # ±30 seconds
```

**MFA Policy (Optional but Recommended)**:
- Owner role: **Required**
- Admin role: Recommended
- Viewer role: Optional

---

## 3. Authorization (RBAC)

### 3.1 Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ROLE HIERARCHY (RBAC)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   OWNER (Super Admin)                                                   │
│   ├── Full system access                                                │
│   ├── Manage admins (create, delete, promote)                          │
│   ├── View/modify all configuration                                    │
│   ├── Access database management                                       │
│   └── View audit logs                                                   │
│       │                                                                 │
│       └── ADMIN (Moderator)                                             │
│           ├── Manage groups and channels                               │
│           ├── View configuration (read-only)                           │
│           ├── View logs (filtered)                                     │
│           └── Cannot: modify config, manage admins, access DB          │
│               │                                                         │
│               └── VIEWER (Read-Only)                                    │
│                   ├── View dashboard statistics                        │
│                   ├── View groups/channels (read-only)                 │
│                   └── Cannot: modify anything, view logs               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Permission Matrix (Granular)

| Resource          | Action | Owner | Admin            | Viewer    |
| ----------------- | ------ | ----- | ---------------- | --------- |
| **Dashboard**     | View   | ✅     | ✅                | ✅         |
| **Groups**        | List   | ✅     | ✅                | ✅         |
| **Groups**        | Create | ✅     | ✅                | ❌         |
| **Groups**        | Update | ✅     | ✅                | ❌         |
| **Groups**        | Delete | ✅     | ✅                | ❌         |
| **Channels**      | List   | ✅     | ✅                | ✅         |
| **Channels**      | Create | ✅     | ✅                | ❌         |
| **Channels**      | Update | ✅     | ✅                | ❌         |
| **Channels**      | Delete | ✅     | ✅                | ❌         |
| **Configuration** | View   | ✅     | ✅ (limited)      | ❌         |
| **Configuration** | Modify | ✅     | ❌                | ❌         |
| **Database**      | View   | ✅     | ❌                | ❌         |
| **Database**      | Modify | ✅     | ❌                | ❌         |
| **Logs**          | View   | ✅     | ✅ (no sensitive) | ❌         |
| **Analytics**     | View   | ✅     | ✅                | ✅ (basic) |
| **Admins**        | Manage | ✅     | ❌                | ❌         |
| **Audit Log**     | View   | ✅     | ✅ (own actions)  | ❌         |

### 3.3 Implementation (FastAPI Dependency)

```python
# ============================================
# RBAC PERMISSION CHECKING
# ============================================
from enum import Enum
from fastapi import Depends, HTTPException, status

class Role(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    VIEWER = "viewer"

class Permission(str, Enum):
    VIEW_DASHBOARD = "view:dashboard"
    MANAGE_GROUPS = "manage:groups"
    MANAGE_CHANNELS = "manage:channels"
    VIEW_CONFIG = "view:config"
    MODIFY_CONFIG = "modify:config"
    VIEW_DATABASE = "view:database"
    MODIFY_DATABASE = "modify:database"
    VIEW_LOGS = "view:logs"
    MANAGE_ADMINS = "manage:admins"
    VIEW_AUDIT_LOG = "view:audit_log"

# Permission mapping
ROLE_PERMISSIONS = {
    Role.OWNER: [p for p in Permission],  # All permissions
    Role.ADMIN: [
        Permission.VIEW_DASHBOARD,
        Permission.MANAGE_GROUPS,
        Permission.MANAGE_CHANNELS,
        Permission.VIEW_CONFIG,
        Permission.VIEW_LOGS,
        Permission.VIEW_AUDIT_LOG,
    ],
    Role.VIEWER: [
        Permission.VIEW_DASHBOARD,
    ],
}

def require_permission(permission: Permission):
    """Dependency to check if user has required permission"""
    async def permission_checker(
        current_user: dict = Depends(get_current_user)
    ):
        user_role = Role(current_user["role"])
        
        if permission not in ROLE_PERMISSIONS[user_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission}"
            )
        
        return current_user
    
    return permission_checker

# Usage in endpoint
@router.delete("/groups/{group_id}")
async def delete_group(
    group_id: int,
    user: dict = Depends(require_permission(Permission.MANAGE_GROUPS))
):
    """Delete a protected group (requires MANAGE_GROUPS permission)"""
    # Only OWNER and ADMIN can reach here
    ...
```

---

## 4. API Security

### 4.1 Rate Limiting (Adaptive)

```python
# ============================================
# RATE LIMITING CONFIGURATION (2026)
# ============================================
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="redis://redis:6379/1",
    strategy="sliding-window",  # More accurate than fixed-window
)

# Tiered Rate Limits
RATE_LIMITS = {
    "auth_login": "5/15minutes",      # Brute-force protection
    "auth_refresh": "10/hour",        # Token refresh
    "api_general": "100/minute",      # General API calls
    "api_read": "200/minute",         # Read-only endpoints
    "api_write": "50/minute",         # State-changing endpoints
    "database_query": "20/minute",    # Expensive database queries
    "websocket_connect": "10/hour",   # WebSocket connections per user
}
```

#### 4.1.1 Application (Per-Endpoint)

```python
from fastapi import APIRouter
from slowapi import Limiter

router = APIRouter()

@router.post("/auth/login")
@limiter.limit("5/15minutes")  # Strict limit for login
async def login(request: Request, credentials: LoginRequest):
    ...

@router.get("/groups")
@limiter.limit("200/minute")  # Higher limit for reads
async def list_groups(request: Request):
    ...

@router.post("/groups")
@limiter.limit("50/minute")  # Lower limit for writes
async def create_group(request: Request, group: GroupCreate):
    ...
```

#### 4.1.2 Response Headers

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 73
X-RateLimit-Reset: 1706123456
Retry-After: 38
```

### 4.2 Input Validation (Pydantic V2)

```python
# ============================================
# STRICT INPUT VALIDATION
# ============================================
from pydantic import BaseModel, EmailStr, Field, validator
from pydantic import constr, conint

class CreateAdminRequest(BaseModel):
    """
    Strict validation for admin creation
    """
    email: EmailStr = Field(..., description="Valid email address")
    
    password: constr(
        min_length=12,
        max_length=128,
        pattern=r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$"
    ) = Field(..., description="12+ chars, upper, lower, number")
    
    full_name: constr(
        min_length=2,
        max_length=100,
        pattern=r"^[a-zA-Z\s\-']+$"
    ) = Field(..., description="Only letters, spaces, hyphens")
    
    role: Role = Field(default=Role.VIEWER)
    
    @validator("email")
    def validate_email_domain(cls, v):
        """Only allow specific domains (optional)"""
        if not v.endswith(("@nezuko.bot", "@example.com")):
            raise ValueError("Email domain not allowed")
        return v
    
    class Config:
        # Reject extra fields (prevent mass assignment)
        extra = "forbid"
        # Use strict types
        strict = True
```

**Validation Principles**:
- ✅ Whitelist allowed characters (not blacklist)
- ✅ Reject extra fields (`extra="forbid"`)
- ✅ Use strict types (`strict=True`)
- ✅ Validate on **both** client and server
- ✅ Never trust client-side validation alone

### 4.3 CORS Configuration (Strict)

```python
# ============================================
# CORS SECURITY (Production)
# ============================================
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://admin.nezuko.bot",  # Production frontend
        # "http://localhost:3000",  # Dev only (remove in production)
    ],
    allow_credentials=True,  # Allow cookies
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # Explicit methods
    allow_headers=["Authorization", "Content-Type"],  # Explicit headers
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining"],
    max_age=3600,  # Cache preflight for 1 hour
)
```

**CORS Security Rules**:
- ❌ Never use `allow_origins=["*"]` with `allow_credentials=True`
- ✅ Always whitelist specific domains
- ✅ Use HTTPS-only origins in production
- ✅ Explicitly list allowed methods/headers

---

## 5. Transport Security (TLS)

### 5.1 TLS Configuration (Caddy)

```caddyfile
# ============================================
# CADDY REVERSE PROXY - TLS/SSL
# ============================================

admin.nezuko.bot {
    # Automatic HTTPS via Let's Encrypt
    tls {
        protocols tls1.2 tls1.3  # TLS 1.3 preferred, 1.2 minimum
        ciphers TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384 \
                TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384 \
                TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256 \
                TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256
        curves x25519 secp384r1 secp256r1
    }
    
    # Security headers
    header {
        # HSTS (1 year, include subdomains)
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        
        # Prevent clickjacking
        X-Frame-Options "DENY"
        
        # XSS protection
        X-Content-Type-Options "nosniff"
        
        # Referrer policy
        Referrer-Policy "strict-origin-when-cross-origin"
        
        # Remove server header
        -Server
    }
    
    # Reverse proxy to Next.js
    reverse_proxy web:3000
}

api.nezuko.bot {
    tls {
        protocols tls1.2 tls1.3
    }
    
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        -Server
    }
    
    # Reverse proxy to FastAPI
    reverse_proxy api:8080
}
```

### 5.2 HTTPS Enforcement

```python
# ============================================
# FORCE HTTPS REDIRECT (FastAPI Middleware)
# ============================================
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware

if not DEBUG:
    app.add_middleware(HTTPSRedirectMiddleware)
```

### 5.3 Certificate Management

| Aspect            | Configuration                       |
| ----------------- | ----------------------------------- |
| **Provider**      | Let's Encrypt (ACME)                |
| **Renewal**       | Automatic (Caddy handles)           |
| **Algorithm**     | ECDSA P-256 (preferred) or RSA 2048 |
| **Validity**      | 90 days (auto-renewed at 30 days)   |
| **OCSP Stapling** | Enabled (Caddy default)             |
| **Transparency**  | Certificate Transparency required   |

---

## 6. Data Security

### 6.1 Sensitive Data Handling

| Data Type      | Storage         | Display                   | Encryption     |
| -------------- | --------------- | ------------------------- | -------------- |
| **Bot Token**  | Encrypted in DB | Masked `************`     | AES-256-GCM    |
| **Passwords**  | Argon2id hash   | Never shown               | N/A (hashed)   |
| **JWT Secret** | Environment var | Never shown               | N/A            |
| **User IDs**   | Plain           | Partially masked `123***` | N/A            |
| **API Keys**   | Encrypted in DB | Masked                    | AES-256-GCM    |
| **Email**      | Plain           | Full (admin context)      | TLS in transit |
| **Audit Logs** | Plain           | Filtered by role          | N/A            |

### 6.2 Encryption at Rest (Fernet)

```python
# ============================================
# FIELD-LEVEL ENCRYPTION (Fernet)
# ============================================
from cryptography.fernet import Fernet
import os

# Key management (store in secret manager, not in code!)
ENCRYPTION_KEY = os.environ["FIELD_ENCRYPTION_KEY"]  # 32-byte base64
fernet = Fernet(ENCRYPTION_KEY)

def encrypt_field(plaintext: str) -> str:
    """Encrypt sensitive field before storing in DB"""
    return fernet.encrypt(plaintext.encode()).decode()

def decrypt_field(ciphertext: str) -> str:
    """Decrypt sensitive field when reading from DB"""
    return fernet.decrypt(ciphertext.encode()).decode()

# Usage in model
class BotConfiguration(Base):
    __tablename__ = "bot_configuration"
    
    id = Column(Integer, primary_key=True)
    bot_token_encrypted = Column(String(500), nullable=False)
    
    @property
    def bot_token(self) -> str:
        return decrypt_field(self.bot_token_encrypted)
    
    @bot_token.setter
    def bot_token(self, value: str):
        self.bot_token_encrypted = encrypt_field(value)
```

### 6.3 Database Query Security

```python
# ============================================
# SQL INJECTION PREVENTION
# ============================================

# ✅ CORRECT - Parameterized query (SQLAlchemy ORM)
stmt = select(User).where(User.email == user_email)
result = await session.execute(stmt)
user = result.scalar_one_or_none()

# ✅ CORRECT - Parameterized raw query (if needed)
stmt = text("SELECT * FROM users WHERE email = :email")
result = await session.execute(stmt, {"email": user_email})

# ❌ WRONG - String concatenation (SQL Injection!)
query = f"SELECT * FROM users WHERE email = '{user_email}'"  # NEVER DO THIS
```

### 6.4 Secrets Management (Environment Variables)

```bash
# ============================================
# PRODUCTION SECRETS (.env)
# ============================================

# Never commit this file to Git (.gitignore it!)

# JWT Keys (ES256 - ECDSA)
JWT_PRIVATE_KEY_PATH=/secrets/jwt-private.pem
JWT_PUBLIC_KEY_PATH=/secrets/jwt-public.pem

# Database
DATABASE_URL=postgresql+asyncpg://user:STRONG_PASSWORD@postgres:5432/nezuko

# Redis
REDIS_URL=redis://redis:6379/0
REDIS_PASSWORD=ANOTHER_STRONG_PASSWORD

# Field Encryption
FIELD_ENCRYPTION_KEY=<base64-encoded-32-byte-key>

# Bot Token (encrypted in DB, but needed for bot startup)
BOT_TOKEN=<telegram-bot-token>

# Sentry (Error Tracking)
SENTRY_DSN=https://...@sentry.io/...

# Generate secure secrets:
# openssl rand -base64 32
```

**Production Secret Management**:
- ✅ Use secret managers: HashiCorp Vault, AWS Secrets Manager, Azure Key Vault
- ✅ Rotate secrets every 90 days
- ✅ Never hardcode secrets in code
- ✅ Never commit `.env` to Git
- ✅ Use different secrets for dev/staging/prod

---

## 7. Session Management

### 7.1 Cookie Configuration

```python
# ============================================
# SECURE COOKIE SETTINGS (FastAPI)
# ============================================
from fastapi.responses import Response

def set_refresh_token_cookie(response: Response, refresh_token: str):
    """Set secure refresh token cookie"""
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=604800,  # 7 days
        httponly=True,   # ❌ JavaScript cannot access
        secure=True,     # ✅ HTTPS only
        samesite="strict",  # ✅ CSRF protection
        domain="nezuko.bot",
        path="/api/auth/refresh",  # Only sent to refresh endpoint
    )
```

| Attribute  | Value               | Purpose                            |
| ---------- | ------------------- | ---------------------------------- |
| `httponly` | `True`              | Prevent XSS attacks (no JS access) |
| `secure`   | `True`              | HTTPS only                         |
| `samesite` | `strict`            | CSRF protection                    |
| `path`     | `/api/auth/refresh` | Minimize cookie exposure           |
| `max_age`  | 7 days              | Match refresh token lifetime       |

### 7.2 Session Invalidation

```python
# ============================================
# SESSION REVOCATION (Redis)
# ============================================

async def logout_user(user_id: str, session_id: str):
    """Logout user and invalidate session"""
    # 1. Add token to blacklist
    await redis.setex(
        f"blacklist:session:{session_id}",
        604800,  # 7 days (match refresh token expiry)
        "revoked"
    )
    
    # 2. Remove active session
    await redis.delete(f"session:{user_id}:{session_id}")
    
    # 3. Log audit event
    await log_audit_event(
        user_id=user_id,
        action="LOGOUT",
        resource_type="session",
        resource_id=session_id,
    )

async def logout_all_user_sessions(user_id: str):
    """Logout user from all devices (password change, security breach)"""
    # Get all active sessions
    session_keys = await redis.keys(f"session:{user_id}:*")
    
    for key in session_keys:
        session_id = key.split(":")[-1]
        await logout_user(user_id, session_id)
```

---

## 8. Security Headers

### 8.1 Content Security Policy (CSP)

```python
# ============================================
# CSP CONFIGURATION (Next.js Middleware)
# ============================================

# For production (strict)
CSP_POLICY = ";".join([
    "default-src 'self'",
    "script-src 'self' 'nonce-{NONCE}'",  # Dynamic nonce per request
    "style-src 'self' 'nonce-{NONCE}' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.nezuko.bot wss://api.nezuko.bot",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
])

# For development (permissive)
CSP_POLICY_DEV = ";".join([
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  # For HMR
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.nezuko.bot wss://api.nezuko.bot ws://localhost:3000",
])
```

### 8.2 Complete Header Set (Caddy + Next.js)

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: CSP_POLICY.replace(/\s+/g, ' ')
          }
        ]
      }
    ]
  }
}
```

### 8.3 Security Headers Scorecard

| Header                        | Value                                          | Score |
| ----------------------------- | ---------------------------------------------- | ----- |
| **Strict-Transport-Security** | `max-age=31536000; includeSubDomains; preload` | A+    |
| **Content-Security-Policy**   | Strict nonce-based                             | A     |
| **X-Content-Type-Options**    | `nosniff`                                      | A+    |
| **X-Frame-Options**           | `DENY`                                         | A+    |
| **Referrer-Policy**           | `strict-origin-when-cross-origin`              | A     |
| **Permissions-Policy**        | Restrictive                                    | A     |

**Test your headers**: https://securityheaders.com

---

## 9. Security Checklist (Pre-Deployment)

### 9.1 Authentication & Authorization

- [ ] Argon2id for password hashing (64 MiB memory, 3 iterations)
- [ ] JWT with ES256 algorithm (not HS256)
- [ ] Access tokens expire in 15 minutes
- [ ] Refresh tokens rotate on use
- [ ] Token blacklist implemented (Redis)
- [ ] RBAC enforced on all endpoints
- [ ] MFA option available for Owner role

### 9.2 API Security

- [ ] Rate limiting configured (5/15min for login)
- [ ] Pydantic validation on all inputs
- [ ] CORS restricted to admin domain only
- [ ] No `allow_origins=["*"]` with credentials
- [ ] All endpoints require authentication (except /health)

### 9.3 Transport & Data

- [ ] TLS 1.3 enabled, TLS 1.2 minimum
- [ ] HTTPS redirect enabled (`HTTPSRedirectMiddleware`)
- [ ] HSTS header with 1-year max-age
- [ ] Bot tokens encrypted in database (Fernet)
- [ ] All secrets in environment variables
- [ ] No hardcoded secrets in code

### 9.4 Headers & Frontend

- [ ] CSP header with nonce-based script policy
- [ ] `X-Frame-Options: DENY`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] Cookies: `httponly`, `secure`, `samesite=strict`
- [ ] Next.js security headers configured

### 9.5 Database & Infrastructure

- [ ] PostgreSQL: `listen_addresses` restricted
- [ ] PostgreSQL: SCRAM-SHA-256 authentication
- [ ] PostgreSQL: TLS connections enforced
- [ ] Redis: `requirepass` set
- [ ] Redis: `bind` restricted to private network
- [ ] Docker: non-root user
- [ ] Docker: read-only filesystem where possible

### 9.6 Monitoring & Logging

- [ ] Structlog configured with JSON output
- [ ] Sentry integrated for error tracking
- [ ] Audit log captures: login, logout, config changes
- [ ] Failed login attempts logged
- [ ] Rate limit violations logged
- [ ] No sensitive data in logs (passwords, tokens)

---

## 10. Security Testing

### 10.1 Automated Security Scanning

```bash
# ============================================
# SECURITY TESTING TOOLS
# ============================================

# 1. Dependency vulnerability scanning
pip install pip-audit
pip-audit --require-hashes

# 2. Docker image scanning
docker scan nezuko-api:latest

# 3. SAST (Static Analysis)
bandit -r apps/api/

# 4. Secret scanning
trufflehog filesystem . --json

# 5. Next.js security audit
npm audit --production
npm outdated
```

### 10.2 Manual Penetration Testing

| Test Category      | Tools                 | Frequency                 |
| ------------------ | --------------------- | ------------------------- |
| **OWASP Top 10**   | OWASP ZAP, Burp Suite | Before each major release |
| **API Security**   | Postman, Insomnia     | Weekly (in CI/CD)         |
| **Authentication** | Manual testing        | Before each release       |
| **Authorization**  | Custom scripts        | Weekly                    |
| **Headers**        | securityheaders.com   | Before deployment         |

---

## 11. Incident Response Plan

### 11.1 If Credentials Compromised

```bash
# ===================================
# EMERGENCY RESPONSE PROCEDURE
# ===================================

# 1. Rotate ALL secrets immediately
./scripts/rotate-secrets.sh

# 2. Invalidate all active sessions
redis-cli KEYS "session:*" | xargs redis-cli DEL

# 3. Force all users to re-login
# (Automatic after session invalidation)

# 4. Review audit logs for unauthorized access
python -m scripts.audit_review \
  --start-date "2026-01-24T00:00:00Z" \
  --suspicious-ips

# 5. Notify affected users (if applicable)
python -m scripts.notify_users \
  --template security-incident

# 6. Update firewall rules if needed
# 7. Document incident in security log
# 8. Conduct post-mortem
```

### 11.2 Contact

**Security Issues**: Do **NOT** open public GitHub issues. Email: security@nezuko.bot

---

[← Back to Implementation](./06-IMPLEMENTATION.md) | [Back to Index](./README.md) | [Next: Advanced Security →](./07a-SECURITY-ADVANCED.md)
