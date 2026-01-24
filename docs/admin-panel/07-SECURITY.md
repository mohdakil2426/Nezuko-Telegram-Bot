# 🔒 Security Considerations

> **Nezuko Admin Panel - Security Best Practices**

---

## 1. Authentication Security

### 1.1 Password Policy

| Requirement | Value |
|-------------|-------|
| Minimum length | 12 characters |
| Required character types | Uppercase, lowercase, number |
| Hash algorithm | Argon2id |
| Max login attempts | 5 per 15 minutes |
| Account lockout | 30 minutes |

### 1.2 JWT Configuration

```python
# Recommended JWT settings
JWT_SECRET_KEY = os.environ["JWT_SECRET_KEY"]  # 256-bit random
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE = 15  # minutes
REFRESH_TOKEN_EXPIRE = 7  # days
```

| Token Type | Expiry | Storage | Rotation |
|------------|--------|---------|----------|
| Access Token | 15 min | Memory only | On refresh |
| Refresh Token | 7 days | httpOnly cookie | On use |

### 1.3 Session Security

```python
# Secure cookie configuration
SESSION_COOKIE_CONFIG = {
    "httponly": True,
    "secure": True,  # HTTPS only
    "samesite": "strict",
    "max_age": 7 * 24 * 60 * 60,  # 7 days
}
```

---

## 2. Authorization (RBAC)

### 2.1 Role Hierarchy

```
OWNER (full access)
  └── ADMIN (manage groups/channels)
        └── VIEWER (read-only)
```

### 2.2 Permission Matrix

| Permission | Owner | Admin | Viewer |
|------------|-------|-------|--------|
| View dashboard | ✅ | ✅ | ✅ |
| View groups | ✅ | ✅ | ✅ |
| Modify groups | ✅ | ✅ | ❌ |
| View configuration | ✅ | ✅ | ❌ |
| Modify configuration | ✅ | ❌ | ❌ |
| View database | ✅ | ❌ | ❌ |
| Manage admins | ✅ | ❌ | ❌ |
| View audit log | ✅ | ✅ | ❌ |

---

## 3. API Security

### 3.1 Rate Limiting

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 5 | 15 min |
| General API | 100 | 1 min |
| Database queries | 20 | 1 min |
| WebSocket | 10 connections | per user |

### 3.2 Input Validation

```python
# All inputs validated with Pydantic
from pydantic import BaseModel, EmailStr, constr

class LoginRequest(BaseModel):
    email: EmailStr
    password: constr(min_length=12, max_length=128)
```

### 3.3 CORS Configuration

```python
CORS_CONFIG = {
    "allow_origins": ["https://admin.yourdomain.me"],
    "allow_credentials": True,
    "allow_methods": ["GET", "POST", "PUT", "DELETE"],
    "allow_headers": ["Authorization", "Content-Type"],
}
```

### 3.4 Security Headers

```python
# Applied via middleware
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'self'",
}
```

---

## 4. Data Security

### 4.1 Sensitive Data Handling

| Data Type | Storage | Display |
|-----------|---------|---------|
| Bot Token | Encrypted | Masked (*****) |
| Passwords | Argon2 hash | Never shown |
| User IDs | Plain | Partial (123***) |
| API Keys | Encrypted | Masked |

### 4.2 Database Security

```python
# Always use parameterized queries
stmt = select(User).where(User.email == email_param)  # ✅ Safe

# NEVER concatenate user input
f"SELECT * FROM users WHERE email = '{email}'"  # ❌ SQL Injection
```

### 4.3 Secrets Management

```bash
# Environment variables (never in code)
JWT_SECRET_KEY=<random-256-bit>
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://...

# Generate secure secrets
openssl rand -hex 32
```

---

## 5. Transport Security

### 5.1 TLS Configuration

| Setting | Value |
|---------|-------|
| TLS Version | 1.3 (1.2 minimum) |
| Certificate | Let's Encrypt (auto-renewal) |
| HSTS | Enabled (1 year) |
| Certificate Transparency | Required |

### 5.2 Caddy Configuration

```caddyfile
admin.yourdomain.me {
    # Auto-SSL via Let's Encrypt
    
    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
    }
    
    # Reverse proxy to Next.js
    reverse_proxy web:3000
}

api.yourdomain.me {
    # Reverse proxy to FastAPI
    reverse_proxy api:8080
}
```

---

## 6. Audit Logging

### 6.1 Logged Events

| Event | Data Captured |
|-------|---------------|
| Login success | user_id, IP, user_agent |
| Login failure | email, IP, reason |
| Logout | user_id, IP |
| Config change | user_id, old_value, new_value |
| Group modified | user_id, group_id, changes |
| Admin created | creator_id, new_admin_id, role |

### 6.2 Audit Log Schema

```sql
CREATE TABLE admin_audit_log (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES admin_users(id),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Security Checklist

### 7.1 Before Deployment

- [ ] All secrets in environment variables
- [ ] Debug mode disabled
- [ ] HTTPS enforced
- [ ] CORS restricted to admin domain
- [ ] Rate limiting configured
- [ ] Security headers set
- [ ] Audit logging enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] Sensitive data encrypted/masked

### 7.2 Ongoing

- [ ] Weekly dependency updates
- [ ] Monthly security review
- [ ] Quarterly penetration testing (optional)
- [ ] Monitor for failed login attempts
- [ ] Review audit logs regularly

---

## 8. Incident Response

### 8.1 If Credentials Compromised

1. **Rotate all secrets immediately**
   - JWT_SECRET_KEY
   - BOT_TOKEN
   - Database passwords

2. **Invalidate all sessions**
   - Clear Redis sessions
   - Force all users to re-login

3. **Review audit logs**
   - Identify compromised actions
   - Revert unauthorized changes

### 8.2 Contact

For security issues, contact the project maintainer directly. Do not open public issues for security vulnerabilities.

---

[← Back to Implementation](./06-IMPLEMENTATION.md) | [Back to Index](./README.md) | [Next: Deployment →](./08-DEPLOYMENT.md)
