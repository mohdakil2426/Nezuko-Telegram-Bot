## VII. MULTI-TENANCY & SECURITY

### 7.1 Tenant Identification & Isolation

**MUST**

- Extract tenant ID from JWT token, session, or user entity (never trust user input)
- Verify tenant ID matches authenticated user's tenant before database operations
- Use database-level isolation (RLS, separate schema) as primary defense; application-level filtering as secondary
- Never rely on application WHERE clauses alone

**DO**

```python
import jwt
from functools import wraps

def extract_tenant_from_update(update: Update) -> int:
    """Extract tenant ID from Telegram user or context."""
    # Assume user_id → tenant mapping stored in DB
    user_id = update.effective_user.id

    # Lookup in cache or DB
    tenant_id = tenant_cache.get(user_id)
    if not tenant_id:
        raise ValueError(f"User {user_id} has no tenant")

    return tenant_id

async def handler(update: Update, context: CallbackContext) -> None:
    """Handler with tenant isolation."""
    tenant_id = extract_tenant_from_update(update)

    async with async_session_factory() as session:
        session.tenant_id = tenant_id
        async with session.begin():
            # RLS policy ensures only tenant's rows visible
            stmt = select(User).where(User.id == update.effective_user.id)
            result = await session.execute(stmt)
            user = result.scalars().first()

            if not user or user.tenant_id != tenant_id:
                raise PermissionError("User not in tenant")
```

**DO NOT**

```python
# ❌ Trust user-supplied tenant_id
tenant_id = context.user_data.get("tenant_id")  # User can modify

# ❌ Rely only on WHERE clause
stmt = select(User).where(User.tenant_id == tenant_id)
# If developer forgets WHERE, all tenants' data leaked

# ❌ No verification of JWT
tenant_id = jwt.decode(token)["tenant_id"]
# What if JWT is stale or tampered?
```

---

### 7.2 Secrets Management

**MUST**

- Store secrets (tokens, API keys, database passwords) in **environment variables**, NOT code
- Use `python-dotenv` for local development (.env file, excluded from git)
- Use cloud secrets manager in production (AWS Secrets Manager, Azure Key Vault, etc.)
- Never log secrets; use `MASK_PASSWORD` or similar

**DO**

```python
import os
from dotenv import load_dotenv

# Load .env in development
if os.environ.get("ENV") != "production":
    load_dotenv()

# Access secrets
BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
DATABASE_URL = os.environ["DATABASE_URL"]
SENTRY_DSN = os.environ.get("SENTRY_DSN", "")

# .env file (local dev only)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
DATABASE_URL=postgresql+asyncpg://user:password@localhost/db
```

**DO NOT**

```python
# ❌ Hardcoded secrets
BOT_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"

# ❌ Secrets in .env committed to git
git add .env && git commit  # Revoke token immediately

# ❌ Logging secrets
logger.info("Connecting", password=password)
```

---

## XIII. DEPLOYMENT CHECKLIST

### Pre-Flight

- [ ] **Linting**: No errors in `pyright --strict` or `ruff check .`
- **Secrets**: All secrets moved from code to Environment Variables
- **Async Safety**: Checked for `time.sleep`, `requests.get` (replaces with `aiohttp`)
- **Database**: `pool_pre_ping=True` enabled
- **Migrations**: `alembic upgrade head` executed
- **Logging**: JSON logging enabled for Production

### Infrastructure

- **Process Manager**: Docker or Systemd (Auto-restart enabled)
- **Reverse Proxy**: Nginx/Caddy with TLS 1.3
- **Webhook**: Secret Token configured and verified
- **Limits**: `ulimit -n` increased (min 65535 for high concurrency)

### Monitoring

- **Sentry**: DSN active, Sampling rate set (e.g., 0.1)
- **Health**: `/health` endpoint responding 200 OK
- **Metrics**: Prometheus/Grafana (optional but recommended)
