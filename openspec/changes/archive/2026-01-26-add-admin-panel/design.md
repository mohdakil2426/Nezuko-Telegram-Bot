# Design: Nezuko Admin Panel

> **Technical Architecture & Design Decisions**
>
> **Primary References**:
> - `docs/admin-panel/02-ARCHITECTURE.md` - System architecture
> - `docs/admin-panel/02a-FOLDER-STRUCTURE.md` - Folder structure
> - `docs/admin-panel/03-TECH-STACK.md` - Technology stack (January 2026)
> - `docs/admin-panel/07-SECURITY.md` - Security framework

---

## Context

Nezuko v1.0.0 is a production-ready Telegram bot with:
- Python 3.13+ async architecture
- PostgreSQL + Redis infrastructure
- Prometheus observability
- Multi-tenant design

The Admin Panel extends this by adding a **decoupled full-stack web application** that shares the same database and cache infrastructure but operates independently.

### Stakeholders
- **Bot Owners**: Primary users (full access)
- **Co-Admins**: Trusted helpers (configurable permissions)
- **Viewers**: Read-only monitoring access
- **Developers**: Code maintainability and extensibility

### Constraints
- Must share PostgreSQL with bot (same database)
- Must share Redis with bot (same cache)
- Must run on single VPS ($0-30/month budget)
- Must support horizontal scaling in future

---

## Goals / Non-Goals

### Goals
1. **Zero SSH Dashboard**: Complete bot management without terminal access
2. **Real-time Monitoring**: Live logs, metrics, and alerts via WebSocket
3. **Self-Service Configuration**: Visual editors for all bot settings
4. **Enterprise Security**: OWASP 2025 compliant, JWT ES256, Argon2id
5. **Developer Experience**: Type-safe, well-documented, testable code

### Non-Goals (Out of Scope for v1.0)
- Mobile native apps (responsive web is sufficient)
- White-label SaaS (single-tenant only for now)
- End-user portal (admin-only access)
- GraphQL API (REST is sufficient)
- Kubernetes orchestration (Docker Compose is sufficient)

---

## Architecture Decisions

### AD-1: Decoupled Full-Stack Architecture

**Decision**: Separate Next.js frontend and FastAPI backend as independent services.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Next.js 16     │────▶│  FastAPI        │────▶│  PostgreSQL     │
│  (Frontend)     │ REST│  (API)          │     │  + Redis        │
│  Port: 3000     │  +  │  Port: 8080     │     │                 │
└─────────────────┘  WS └─────────────────┘     └─────────────────┘
```

**Rationale**:
- ✅ Independent scaling (frontend CDN, API horizontal)
- ✅ Technology flexibility (can replace frontend without touching API)
- ✅ Security isolation (frontend has no direct DB access)
- ✅ Team parallelization (frontend/backend can work independently)

**Alternatives Considered**:
- **Monolithic Next.js (API routes)**: Simpler but limits backend scalability
- **Django Admin**: Quick but poor UX and limited customization
- **Reflex/Streamlit**: Python-only but performance concerns

**Reference**: `docs/admin-panel/02-ARCHITECTURE.md` Section 1

---

### AD-2: Monorepo with Turborepo

**Decision**: Single repository with Turborepo for multi-package management.

```
nezuko-admin-panel/
├── apps/
│   ├── web/          # Next.js 16 frontend
│   └── api/          # FastAPI backend
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── config/       # Shared ESLint/TS configs
│   └── utils/        # Cross-platform utilities
└── turbo.json        # Task orchestration
```

**Rationale**:
- ✅ Atomic commits (frontend + API changes together)
- ✅ Shared dependencies (no version drift)
- ✅ Parallel builds (Turborepo caching)
- ✅ Consistent tooling (single ESLint/Prettier config)

**Reference**: `docs/admin-panel/02a-FOLDER-STRUCTURE.md` Section 1

---

### AD-3: JWT ES256 with Refresh Token Rotation

**Decision**: Asymmetric JWT (ES256) with short-lived access tokens and rotated refresh tokens.

```python
JWT_CONFIG = {
    "ALGORITHM": "ES256",              # ECDSA asymmetric
    "ACCESS_TOKEN_EXPIRE": 15min,      # Short-lived
    "REFRESH_TOKEN_EXPIRE": 7days,     # Longer-lived
    "REQUIRED_CLAIMS": ["iss", "aud", "exp", "nbf", "iat", "sub"],
}
```

**Rationale**:
- ✅ ES256 is recommended over HS256 (RFC 8725bis)
- ✅ Short access tokens limit exposure window
- ✅ Refresh rotation detects token theft
- ✅ Asymmetric keys allow public verification

**Alternatives Considered**:
- **HS256 (symmetric)**: Simpler but less secure
- **Session-based**: Requires session storage, not stateless
- **OAuth2 with external IdP**: Overkill for single-tenant

**Reference**: `docs/admin-panel/07-SECURITY.md` Section 2.2

---

### AD-4: Argon2id Password Hashing

**Decision**: Argon2id with OWASP 2026 recommended parameters.

```python
pwd_context = CryptContext(
    schemes=["argon2"],
    argon2__memory_cost=65536,      # 64 MiB
    argon2__time_cost=3,            # 3 iterations
    argon2__parallelism=4,          # 4 threads
    argon2__type="id",              # Hybrid mode
)
```

**Rationale**:
- ✅ Winner of Password Hashing Competition (2015)
- ✅ Memory-hard (resists GPU/ASIC attacks)
- ✅ Side-channel resistant (Argon2id hybrid)
- ✅ OWASP 2026 and NIST recommended

**Reference**: `docs/admin-panel/07-SECURITY.md` Section 2.1

---

### AD-5: RFC 9457 Problem Details for Errors

**Decision**: Standardized error format following RFC 9457.

```json
{
  "type": "https://api.nezuko.bot/errors/auth/invalid-credentials",
  "title": "Invalid Credentials",
  "status": 401,
  "detail": "The provided email or password is incorrect.",
  "code": "AUTH_001",
  "trace_id": "abc123-def456"
}
```

**Rationale**:
- ✅ Industry standard (IETF RFC)
- ✅ Machine-readable (structured parsing)
- ✅ Human-readable (title + detail)
- ✅ Traceable (trace_id for debugging)

**Reference**: `docs/admin-panel/04a-ERROR-HANDLING.md` Section 2

---

### AD-6: Structlog for Logging

**Decision**: Structlog with JSON output in production.

```python
logger.info(
    "user_login_success",
    user_id="uuid-123",
    email="user@example.com",
    trace_id=get_trace_id(),
)

# Output (JSON):
{"event": "user_login_success", "user_id": "uuid-123", ...}
```

**Rationale**:
- ✅ Structured (key-value pairs, not string interpolation)
- ✅ Parseable (JSON for log aggregation)
- ✅ Contextual (automatic trace_id propagation)
- ✅ Performance (lazy evaluation)

**Reference**: `docs/admin-panel/04a-ERROR-HANDLING.md` Section 5

---

### AD-7: shadcn/ui for Components

**Decision**: shadcn/ui (copy-paste) over component libraries.

**Rationale**:
- ✅ Full ownership (code in repo, not node_modules)
- ✅ Tailwind-native (consistent styling)
- ✅ Accessible (Radix UI primitives)
- ✅ Zero lock-in (can modify freely)

**Reference**: `docs/admin-panel/03-TECH-STACK.md` Section 2.2

---

### AD-8: RBAC Permission Hierarchy

**Decision**: Three-tier role system with granular permissions.

```
OWNER (Super Admin)
├── Full system access
├── Manage admins
├── Access database
└── View audit logs
    │
    └── ADMIN (Moderator)
        ├── Manage groups/channels
        ├── View configuration (read-only)
        ├── View logs (filtered)
            │
            └── VIEWER (Read-Only)
                ├── View dashboard
                └── View groups/channels
```

**Reference**: `docs/admin-panel/07-SECURITY.md` Section 3

---

## Data Model

### New Database Tables

```sql
-- Admin Users (separate from bot users)
CREATE TABLE admin_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100),
    role            VARCHAR(20) DEFAULT 'viewer',
    is_active       BOOLEAN DEFAULT true,
    telegram_id     BIGINT UNIQUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    last_login      TIMESTAMPTZ
);

-- Admin Sessions
CREATE TABLE admin_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    refresh_token   VARCHAR(512) UNIQUE NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE admin_audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    action          VARCHAR(50) NOT NULL,
    resource_type   VARCHAR(50) NOT NULL,
    resource_id     VARCHAR(100),
    old_value       JSONB,
    new_value       JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Configuration Storage
CREATE TABLE admin_config (
    key             VARCHAR(100) PRIMARY KEY,
    value           JSONB NOT NULL,
    description     TEXT,
    is_sensitive    BOOLEAN DEFAULT false,
    updated_by      UUID REFERENCES admin_users(id),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**Reference**: `docs/admin-panel/02-ARCHITECTURE.md` Section 3.1

---

## API Design

### Base URL: `/api/v1/`

| Endpoint                   | Method         | Description          |
| -------------------------- | -------------- | -------------------- |
| `/auth/login`              | POST           | Email/password login |
| `/auth/refresh`            | POST           | Refresh access token |
| `/auth/logout`             | POST           | Revoke tokens        |
| `/auth/me`                 | GET            | Current user info    |
| `/dashboard/stats`         | GET            | Dashboard statistics |
| `/dashboard/activity`      | GET            | Recent activity feed |
| `/groups`                  | GET/POST       | List/create groups   |
| `/groups/{id}`             | GET/PUT/DELETE | Group CRUD           |
| `/channels`                | GET/POST       | List/create channels |
| `/channels/{id}`           | GET/PUT/DELETE | Channel CRUD         |
| `/config`                  | GET/PUT        | Configuration        |
| `/logs`                    | GET            | Historical logs      |
| `/database/tables`         | GET            | Table browser        |
| `/analytics/users`         | GET            | User growth data     |
| `/analytics/verifications` | GET            | Verification trends  |
| `/ws/logs`                 | WS             | Real-time log stream |

**Reference**: `docs/admin-panel/04-API-DESIGN.md`

---

## Risks / Trade-offs

### Risk 1: WebSocket Complexity
- **Risk**: Real-time log streaming may be complex to implement reliably
- **Mitigation**: Use proven libraries (websockets), connection health checks
- **Fallback**: REST polling with 5-second interval

### Risk 2: State Synchronization
- **Risk**: Bot and Admin Panel may have stale views of database
- **Mitigation**: Redis pub/sub for real-time invalidation
- **Fallback**: Manual refresh button

### Risk 3: Performance Under Load
- **Risk**: Dashboard may slow down with many groups/verifications
- **Mitigation**: Pagination, lazy loading, caching
- **Validation**: Load testing in Phase 4

---

## Migration Plan

### Phase 0 (Foundation)
1. Create monorepo structure
2. Initialize Next.js and FastAPI projects
3. Set up Docker development environment
4. Configure CI/CD pipeline

### Phase 1 (Core)
1. Implement authentication flow
2. Create base dashboard
3. Implement CRUD for groups/channels

### Phase 2 (Advanced)
1. Add real-time log streaming
2. Implement database browser
3. Create analytics charts

### Phase 3 (Enterprise)
1. Add audit logging
2. Implement multi-admin RBAC
3. Create plugin foundation

### Phase 4 (Production)
1. Security audit
2. Performance optimization
3. Production deployment

### Rollback Strategy
- Each phase is independently deployable
- Database migrations have down migrations
- Feature flags for gradual rollout
- Blue-green deployment for zero downtime

---

## Open Questions

1. **MFA Requirement**: Should MFA be mandatory for Owner role?
   - **Recommendation**: Yes, TOTP required for Owner
   
2. **Telegram OAuth**: Should we support Telegram Login Widget?
   - **Recommendation**: Phase 2 (P2 priority)
   
3. **Plugin API**: How much extensibility do we need?
   - **Recommendation**: Minimal hooks in Phase 3, expand based on demand

4. **Localization**: Should the dashboard support multiple languages?
   - **Recommendation**: English only for v1.0, i18n infrastructure added

---

## References

| Document                                    | Purpose                         | Size |
| ------------------------------------------- | ------------------------------- | ---- |
| `docs/admin-panel/01-REQUIREMENTS.md`       | All functional/NFR requirements | 15KB |
| `docs/admin-panel/02-ARCHITECTURE.md`       | System architecture diagrams    | 29KB |
| `docs/admin-panel/02a-FOLDER-STRUCTURE.md`  | Folder naming conventions       | 33KB |
| `docs/admin-panel/03-TECH-STACK.md`         | Technology justifications       | 45KB |
| `docs/admin-panel/04-API-DESIGN.md`         | Complete API specification      | 19KB |
| `docs/admin-panel/04a-ERROR-HANDLING.md`    | Error handling patterns         | 50KB |
| `docs/admin-panel/05-UI-WIREFRAMES.md`      | Design system                   | 33KB |
| `docs/admin-panel/05a-PAGE-WIREFRAMES.md`   | Component layouts               | 57KB |
| `docs/admin-panel/06-IMPLEMENTATION.md`     | Phase details                   | 9KB  |
| `docs/admin-panel/07-SECURITY.md`           | OWASP compliance                | 39KB |
| `docs/admin-panel/07a-SECURITY-ADVANCED.md` | Infrastructure hardening        | 39KB |
| `docs/admin-panel/08-DEPLOYMENT.md`         | Docker + Caddy setup            | 11KB |
