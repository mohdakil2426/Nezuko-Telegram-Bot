# Security & Authorization

## Authentication Patterns

**RULE: Verify authentication on every operation. Never trust client-side state.**

```python
from fastapi import Security, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

# ✅ CORRECT: Token verification with proper error handling
async def verify_token(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> TokenPayload:
    """Verify JWT token and return payload."""
    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET_KEY,
            algorithms=["HS256"],
            audience=JWT_AUDIENCE,
            issuer=JWT_ISSUER,
        )
        
        # Validate required claims
        if "sub" not in payload or "exp" not in payload:
            raise HTTPException(status_code=401, detail="Invalid token claims")
        
        # Check expiration explicitly (jwt.decode does this, but be explicit)
        if datetime.utcnow().timestamp() > payload["exp"]:
            raise HTTPException(status_code=401, detail="Token expired")
        
        return TokenPayload(**payload)
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        logger.warning("Invalid token attempt", extra={"error": str(e)})
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/protected")
async def protected_route(token: TokenPayload = Depends(verify_token)):
    return {"user_id": token.sub}

# ❌ WRONG: Trusting token without verification
async def insecure_verify(credentials: HTTPAuthorizationCredentials = Security(security)):
    # Just decodes without signature verification!
    payload = jwt.decode(credentials.credentials, options={"verify_signature": False})
    return payload
```

## Role-Based Access Control (RBAC)

**RULE: Implement RBAC with explicit permission checks. Never hardcode role checks in routes.**

```python
from enum import Enum
from functools import wraps

class Permission(Enum):
    USER_READ = "user:read"
    USER_WRITE = "user:write"
    USER_DELETE = "user:delete"
    ADMIN_READ = "admin:read"
    ADMIN_WRITE = "admin:write"

# Role to permission mapping
ROLE_PERMISSIONS = {
    "user": [Permission.USER_READ, Permission.USER_WRITE],
    "admin": [Permission.USER_READ, Permission.USER_WRITE, Permission.USER_DELETE, 
              Permission.ADMIN_READ, Permission.ADMIN_WRITE],
    "viewer": [Permission.USER_READ],
}

# ✅ CORRECT: Permission-based dependency
def require_permissions(*required_permissions: Permission):
    """Dependency factory for permission checking."""
    async def permission_checker(token: TokenPayload = Depends(verify_token)):
        user_permissions = ROLE_PERMISSIONS.get(token.role, [])
        
        for permission in required_permissions:
            if permission not in user_permissions:
                logger.warning(
                    "Permission denied",
                    extra={
                        "user_id": token.sub,
                        "required": permission.value,
                        "has": [p.value for p in user_permissions],
                    }
                )
                raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        return token
    return permission_checker

# Usage
@app.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    token: TokenPayload = Depends(require_permissions(Permission.USER_DELETE))
):
    await user_service.delete(user_id)
    return {"status": "deleted"}

@app.get("/admin/dashboard")
async def admin_dashboard(
    token: TokenPayload = Depends(require_permissions(Permission.ADMIN_READ))
):
    return await get_admin_stats()

# ❌ WRONG: Hardcoded role checks
@app.delete("/users/{user_id}")
async def delete_user(user_id: str, token: TokenPayload = Depends(verify_token)):
    if token.role != "admin":  # Hardcoded role—inflexible
        raise HTTPException(status_code=403, detail="Admin only")
    await user_service.delete(user_id)
```

## Resource-Level Authorization

**RULE: Check resource ownership on every data access. Never assume ownership from URL parameters.**

```python
# ✅ CORRECT: Resource ownership verification
async def get_user_document(
    user_id: str,
    document_id: str,
    token: TokenPayload = Depends(verify_token)
) -> Document:
    """Get document with ownership verification."""
    
    # Fetch document
    doc = await db.documents.find_one({"_id": document_id})
    if not doc:
        raise NotFoundError("Document", document_id)
    
    # Check ownership or admin
    if doc["owner_id"] != token.sub and token.role != "admin":
        logger.warning(
            "Unauthorized document access attempt",
            extra={
                "attempted_by": token.sub,
                "document_owner": doc["owner_id"],
                "document_id": document_id,
            }
        )
        raise HTTPException(status_code=403, detail="Access denied")
    
    return Document(**doc)

@app.get("/documents/{document_id}")
async def get_document(
    document: Document = Depends(get_user_document)
):
    return document

# ❌ WRONG: No ownership check
@app.get("/documents/{document_id}")
async def get_document(document_id: str):
    doc = await db.documents.find_one({"_id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return doc  # Anyone can access any document!
```

## Input Sanitization

**RULE: Sanitize all user inputs. Never pass raw user input to databases or external services.**

```python
import bleach
from pydantic import validator, BaseModel

# ✅ CORRECT: Input sanitization with Pydantic
class UserInput(BaseModel):
    username: str
    bio: str
    
    @validator("username")
    def validate_username(cls, v):
        # Whitelist approach: only allow alphanumeric and underscore
        if not re.match(r"^[a-zA-Z0-9_]+$", v):
            raise ValueError("Username must be alphanumeric with underscores only")
        if len(v) < 3 or len(v) > 30:
            raise ValueError("Username must be between 3 and 30 characters")
        return v.lower().strip()
    
    @validator("bio")
    def sanitize_bio(cls, v):
        # Strip HTML, allow only specific safe tags
        allowed_tags = ["p", "br", "strong", "em"]
        return bleach.clean(v, tags=allowed_tags, strip=True)

# ✅ CORRECT: SQL injection prevention with parameterized queries
async def search_users(query: str) -> list[User]:
    """Search users with safe query construction."""
    
    # Validate and sanitize search query
    sanitized = re.sub(r"[^\w\s]", "", query)  # Remove special chars
    
    # Use parameterized query—NEVER use f-strings for SQL
    result = await db.execute(
        "SELECT * FROM users WHERE username ILIKE $1 OR email ILIKE $1",
        [f"%{sanitized}%"]
    )
    return [User(**row) for row in result]

# ❌ WRONG: SQL injection vulnerability
async def search_users_unsafe(query: str) -> list[User]:
    # DANGEROUS: Direct string interpolation
    result = await db.execute(f"SELECT * FROM users WHERE username = '{query}'")
    return [User(**row) for row in result]

# ❌ WRONG: No input validation
@app.post("/users")
async def create_user(data: dict):  # No schema validation
    await db.users.insert_one(data)  # Raw user data into DB
    return {"status": "created"}
```

## Secret Management

**RULE: Never hardcode secrets. Use environment variables or secret management services.**

```python
from pydantic_settings import BaseSettings

# ✅ CORRECT: Settings with secret validation
class Settings(BaseSettings):
    # Database
    database_url: str
    
    # JWT
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    
    # External APIs
    stripe_secret_key: str
    stripe_webhook_secret: str
    
    # Firebase
    firebase_credentials_path: str
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
    
    @validator("jwt_secret_key")
    def validate_jwt_secret(cls, v):
        if len(v) < 32:
            raise ValueError("JWT secret must be at least 32 characters")
        return v
    
    @validator("database_url")
    def mask_database_url(cls, v):
        # Don't log the full connection string
        return v

settings = Settings()

# ✅ CORRECT: Secure logging that masks secrets
class SecretFilter(logging.Filter):
    """Filter that masks sensitive data in log records."""
    
    SENSITIVE_PATTERNS = [
        (r"(Authorization:\s*Bearer\s+)\S+", r"\1[REDACTED]"),
        (r"(password['"\s:]+)\S+", r"\1[REDACTED]"),
        (r"(api[_-]?key['"\s:]+)\S+", r"\1[REDACTED]", re.IGNORECASE),
        (r"(sk-)[a-zA-Z0-9]{20,}", r"\1[REDACTED]"),  # Stripe keys
    ]
    
    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        for pattern, replacement, *flags in self.SENSITIVE_PATTERNS:
            flag = flags[0] if flags else 0
            message = re.sub(pattern, replacement, message, flags=flag)
        record.msg = message
        record.args = ()
        return True

# Add filter to handlers
handler = logging.StreamHandler()
handler.addFilter(SecretFilter())
logger.addHandler(handler)

# ❌ WRONG: Hardcoded secrets
DATABASE_URL = "postgresql://admin:secret123@localhost/db"  # NEVER do this
JWT_SECRET = "my-secret-key"  # Hardcoded!

# ❌ WRONG: Logging sensitive data
logger.info(f"Processing payment with key: {stripe_secret_key}")
```

## Rate Limiting

**RULE: Implement rate limiting on all endpoints. Use different limits for different endpoint types.**

```python
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

# ✅ CORRECT: Rate limiting with Redis backend
@app.on_event("startup")
async def startup():
    redis = aioredis.from_url("redis://localhost", encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(redis)

# Different rate limits for different endpoints
@app.post("/auth/login")
async def login(
    request: LoginRequest,
    rate: RateLimiter = Depends(RateLimiter(times=5, seconds=60))  # 5 per minute
):
    # Login logic
    pass

@app.get("/api/data")
async def get_data(
    rate: RateLimiter = Depends(RateLimiter(times=100, seconds=60))  # 100 per minute
):
    # Data retrieval
    pass

# ✅ CORRECT: Custom rate limiter with user identification
async def user_identifier(request: Request) -> str:
    """Identify user for rate limiting (token > IP)."""
    try:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth.split(" ")[1]
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
            return f"user:{payload['sub']}"
    except Exception:
        pass
    
    # Fall back to IP
    return f"ip:{request.client.host}"

@app.post("/api/expensive")
async def expensive_operation(
    request: Request,
    rate: RateLimiter = Depends(
        RateLimiter(times=10, seconds=60, identifier=user_identifier)
    )
):
    pass

# ❌ WRONG: No rate limiting
@app.post("/auth/login")
async def login(request: LoginRequest):
    # Vulnerable to brute force attacks
    pass
```

## CORS Configuration

**RULE: Configure CORS explicitly. Never use `allow_origins=["*"]` in production.**

```python
from fastapi.middleware.cors import CORSMiddleware

# ✅ CORRECT: Explicit CORS configuration
allowed_origins = [
    "https://app.example.com",
    "https://admin.example.com",
]

if settings.environment == "development":
    allowed_origins.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,  # Required for cookies/auth headers
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
    max_age=600,  # Cache preflight for 10 minutes
)

# ❌ WRONG: Permissive CORS in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # DANGEROUS in production
    allow_credentials=True,  # Cannot be used with allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

[← Back to Error Handling](./07-error-handling.md) | [Next: Multi-Tenant Isolation →](./09-multi-tenant.md)
