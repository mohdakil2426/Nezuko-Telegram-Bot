# 🛠️ Technology Stack

> **Nezuko Admin Panel - Technology Choices & Justifications**

---

## 1. Stack Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NEZUKO ADMIN PANEL STACK                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FRONTEND                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Next.js 15      │  React 19       │  TypeScript 5.4+              │   │
│  │  shadcn/ui       │  Tailwind CSS   │  TanStack Query               │   │
│  │  Recharts        │  Zustand        │  React Hook Form              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  BACKEND                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  FastAPI 0.115+  │  Python 3.13+   │  Pydantic v2                  │   │
│  │  SQLAlchemy 2.0  │  Alembic        │  python-jose (JWT)            │   │
│  │  Structlog       │  aiohttp        │  websockets                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  INFRASTRUCTURE                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL 16   │  Redis 7        │  Docker                       │   │
│  │  Caddy           │  GitHub Actions │  DigitalOcean                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Technologies

### 2.1 Next.js 15 (App Router)

| Aspect | Details |
|--------|---------|
| **Version** | 15.x (Latest Stable) |
| **Router** | App Router (not Pages Router) |
| **Rendering** | Server Components + Client Components |

#### Why Next.js 15?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS 15 ADVANTAGES                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ SERVER COMPONENTS                                                       │
│     • Reduce client-side JavaScript bundle                                  │
│     • Components render on server → faster initial load                    │
│     • Direct database access without API (if needed)                       │
│                                                                             │
│  ✅ REACT 19 SUPPORT                                                        │
│     • Latest React features (use, Actions, etc.)                           │
│     • Improved concurrent rendering                                         │
│     • Better Suspense handling                                              │
│                                                                             │
│  ✅ TURBOPACK                                                               │
│     • 10x faster dev server than Webpack                                   │
│     • Instant hot module replacement                                        │
│     • Faster production builds                                              │
│                                                                             │
│  ✅ APP ROUTER FEATURES                                                     │
│     • Nested layouts (shared dashboard shell)                              │
│     • Loading states (loading.tsx)                                         │
│     • Error boundaries (error.tsx)                                         │
│     • Parallel routes                                                       │
│                                                                             │
│  ✅ VERCEL ECOSYSTEM                                                        │
│     • Excellent documentation                                               │
│     • Large community                                                       │
│     • Easy migration path                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Next.js vs Alternatives

| Feature | Next.js 15 | Vite + React | Remix | SvelteKit |
|---------|-----------|--------------|-------|-----------|
| **SSR/SSG** | ✅ Built-in | ❌ Manual | ✅ Built-in | ✅ Built-in |
| **App Router** | ✅ Nested layouts | ❌ React Router | ✅ Similar | ✅ Similar |
| **Ecosystem** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Learning Curve** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **TypeScript** | ✅ First-class | ✅ Good | ✅ Good | ✅ Good |
| **Bundle Size** | Medium | Small | Medium | Small |
| **Admin Templates** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ |

**Verdict**: Next.js 15 wins for admin dashboards due to nested layouts (perfect for sidebars), excellent TypeScript support, and vast ecosystem of admin templates.

---

### 2.2 shadcn/ui

| Aspect | Details |
|--------|---------|
| **Type** | Component collection (not library) |
| **Styling** | Tailwind CSS |
| **Accessibility** | Radix UI primitives |

#### Why shadcn/ui?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SHADCN/UI ADVANTAGES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ COPY-PASTE COMPONENTS                                                   │
│     • You own the code (not node_modules)                                  │
│     • Full customization freedom                                            │
│     • No dependency lock-in                                                 │
│                                                                             │
│  ✅ TAILWIND-NATIVE                                                         │
│     • Consistent with Tailwind philosophy                                  │
│     • Easy theming via CSS variables                                       │
│     • Dark mode built-in                                                   │
│                                                                             │
│  ✅ ACCESSIBILITY                                                           │
│     • Built on Radix UI (ARIA compliant)                                   │
│     • Keyboard navigation                                                   │
│     • Screen reader support                                                 │
│                                                                             │
│  ✅ ADMIN-READY COMPONENTS                                                  │
│     • Data Table (tanstack/table)                                          │
│     • Forms (react-hook-form + zod)                                        │
│     • Charts (recharts)                                                    │
│     • Dialogs, Dropdowns, Sheets                                           │
│                                                                             │
│  ✅ ACTIVE DEVELOPMENT                                                      │
│     • Regular updates                                                       │
│     • Growing component library                                             │
│     • Strong community                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### shadcn/ui vs Alternatives

| Feature | shadcn/ui | Material UI | Chakra UI | Ant Design |
|---------|-----------|-------------|-----------|------------|
| **Bundle Size** | 0 (copy) | ~300KB | ~200KB | ~500KB |
| **Customization** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Tailwind** | ✅ Native | ❌ Emotion | ❌ Emotion | ❌ Less |
| **Accessibility** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Look & Feel** | Modern/Minimal | Material | Modern | Enterprise |
| **Learning Curve** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |

**Verdict**: shadcn/ui provides the perfect balance of power and simplicity for a custom admin dashboard.

---

### 2.3 TanStack Query (React Query)

| Aspect | Details |
|--------|---------|
| **Version** | v5.x |
| **Purpose** | Server state management |

#### Why TanStack Query?

```typescript
// Without TanStack Query
const [groups, setGroups] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  setLoading(true);
  fetch('/api/groups')
    .then(res => res.json())
    .then(data => setGroups(data))
    .catch(err => setError(err))
    .finally(() => setLoading(false));
}, []);

// Refresh? Handle manually...
// Caching? Build your own...
// Background updates? Good luck...

// With TanStack Query ✨
const { data: groups, isLoading, error, refetch } = useQuery({
  queryKey: ['groups'],
  queryFn: () => api.getGroups(),
  staleTime: 5 * 60 * 1000, // Fresh for 5 min
  refetchOnWindowFocus: true, // Auto-refresh
});
// Caching ✅ Background refresh ✅ Error handling ✅ DevTools ✅
```

**Key Benefits**:
- **Automatic caching**: No duplicate requests
- **Background refetching**: Data stays fresh
- **Optimistic updates**: Instant UI feedback
- **DevTools**: Debug queries easily
- **Infinite queries**: For pagination
- **Mutations with invalidation**: Auto-refresh after changes

---

### 2.4 Other Frontend Dependencies

| Package | Purpose | Why This Choice |
|---------|---------|-----------------|
| **TypeScript** | Type safety | Catch errors at compile time |
| **Zustand** | Client state | Simpler than Redux, smaller than Jotai |
| **React Hook Form** | Forms | Best performance, minimal re-renders |
| **Zod** | Validation | TypeScript-first schema validation |
| **Recharts** | Charts | React-native, composable, customizable |
| **date-fns** | Dates | Modular, tree-shakeable date lib |
| **Lucide React** | Icons | Open source, consistent, tree-shakeable |

---

## 3. Backend Technologies

### 3.1 FastAPI

| Aspect | Details |
|--------|---------|
| **Version** | 0.115+ |
| **Python** | 3.13+ |

#### Why FastAPI?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FASTAPI ADVANTAGES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ CONSISTENCY WITH BOT CODEBASE                                           │
│     • Same language (Python)                                                │
│     • Shared database models                                                │
│     • Unified deployment                                                    │
│     • Single developer experience                                           │
│                                                                             │
│  ✅ ASYNC-NATIVE                                                            │
│     • Built on Starlette (async framework)                                 │
│     • Perfect for WebSocket support                                        │
│     • Matches bot's async architecture                                     │
│                                                                             │
│  ✅ AUTOMATIC DOCUMENTATION                                                 │
│     • OpenAPI (Swagger) auto-generated                                     │
│     • ReDoc alternative view                                               │
│     • TypeScript client generation                                         │
│                                                                             │
│  ✅ TYPE SAFETY                                                             │
│     • Pydantic models for request/response                                 │
│     • Runtime validation                                                    │
│     • IDE autocomplete                                                      │
│                                                                             │
│  ✅ PERFORMANCE                                                             │
│     • One of fastest Python frameworks                                     │
│     • On par with NodeJS/Go for I/O bound tasks                           │
│                                                                             │
│  ✅ MATURE ECOSYSTEM                                                        │
│     • OAuth2/JWT built-in                                                  │
│     • Dependency injection                                                  │
│     • Background tasks                                                      │
│     • WebSocket support                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### FastAPI vs Alternatives

| Feature | FastAPI | Django REST | Flask | Express.js |
|---------|---------|-------------|-------|------------|
| **Async** | ✅ Native | ⚠️ Partial | ❌ WSGI | ✅ Native |
| **Type Safety** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ | ⭐⭐ (TS) |
| **Auto Docs** | ✅ OpenAPI | ⚠️ DRF docs | ❌ Manual | ❌ Manual |
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Learning Curve** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Bot Compatibility** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ Different lang |

**Verdict**: FastAPI is the clear winner given the existing Python bot codebase and async requirements.

---

### 3.2 SQLAlchemy 2.0 + Alembic

| Aspect | Details |
|--------|---------|
| **SQLAlchemy** | 2.0+ (async mode) |
| **Alembic** | Latest |

#### Why SQLAlchemy 2.0?

```python
# Already used in bot codebase ✅
# Async-native with asyncpg ✅
# Type-safe with mypy plugin ✅

# Example: Shared model between bot and admin
from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.ext.asyncio import AsyncSession

class ProtectedGroup(Base):
    __tablename__ = "protected_groups"
    
    id = Column(Integer, primary_key=True)
    group_id = Column(BigInteger, unique=True, nullable=False)
    title = Column(String(255))
    is_active = Column(Boolean, default=True)

# Bot uses it for verification
# Admin API uses it for management
# Same source of truth
```

**Benefits**:
- **Shared models**: Bot and admin use same ORM models
- **Async support**: Native async with asyncpg
- **Migration support**: Alembic for schema evolution
- **Type safety**: mypy plugin for static analysis

---

### 3.3 JWT Authentication (python-jose)

| Aspect | Details |
|--------|---------|
| **Library** | python-jose[cryptography] |
| **Algorithm** | HS256 (symmetric) |

#### Why JWT?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           JWT FLOW                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. User logs in with email/password                                        │
│                                                                             │
│  2. Server validates credentials against database                           │
│                                                                             │
│  3. Server creates JWT:                                                     │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │  Header: { "alg": "HS256", "typ": "JWT" }                       │    │
│     │  Payload: {                                                      │    │
│     │    "sub": "user_id",                                            │    │
│     │    "email": "admin@nezuko.bot",                                 │    │
│     │    "role": "owner",                                              │    │
│     │    "exp": 1706123456                                             │    │
│     │  }                                                               │    │
│     │  Signature: HMACSHA256(header + payload, SECRET_KEY)            │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  4. Client stores token in httpOnly cookie                                  │
│                                                                             │
│  5. Client sends token with every request:                                  │
│     Authorization: Bearer <token>                                           │
│                                                                             │
│  6. Server validates token signature and expiration                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why JWT over Sessions?**
- Stateless (no session storage needed)
- Works across services
- Contains user info (no DB lookup per request)
- Standard (works with any frontend)

---

## 4. Infrastructure Technologies

### 4.1 PostgreSQL 16

| Aspect | Details |
|--------|---------|
| **Version** | 16 (Alpine image) |
| **Driver** | asyncpg |

**Why PostgreSQL?**
- ✅ Already used by bot (shared database)
- ✅ ACID compliant
- ✅ JSON support for flexible config storage
- ✅ Excellent async driver (asyncpg)
- ✅ Battle-tested at scale

---

### 4.2 Redis 7

| Aspect | Details |
|--------|---------|
| **Version** | 7 (Alpine image) |
| **Driver** | redis-py (async) |

**Why Redis?**
- ✅ Session storage (JWT refresh tokens)
- ✅ Caching (dashboard stats, user data)
- ✅ Pub/Sub (real-time log streaming)
- ✅ Rate limiting (token bucket)
- ✅ Already used by bot

---

### 4.3 Caddy (Reverse Proxy)

| Aspect | Details |
|--------|---------|
| **Version** | 2.x |
| **Purpose** | Reverse proxy, SSL |

#### Why Caddy?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CADDY ADVANTAGES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ AUTOMATIC HTTPS                                                         │
│     • Let's Encrypt integration built-in                                   │
│     • Zero configuration for SSL                                           │
│     • Auto-renewal of certificates                                         │
│                                                                             │
│  ✅ SIMPLE CONFIGURATION                                                    │
│     • Human-readable Caddyfile                                             │
│     • No complex nginx syntax                                              │
│     • Easy to maintain                                                      │
│                                                                             │
│  ✅ MODERN FEATURES                                                         │
│     • HTTP/2 and HTTP/3 support                                            │
│     • WebSocket proxying                                                   │
│     • Automatic OCSP stapling                                              │
│                                                                             │
│  ✅ SINGLE BINARY                                                           │
│     • No dependencies                                                       │
│     • Easy Docker deployment                                                │
│     • Minimal attack surface                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Caddy vs Nginx

| Feature | Caddy | Nginx |
|---------|-------|-------|
| **Auto SSL** | ✅ Built-in | ❌ Certbot required |
| **Config** | Simple Caddyfile | Complex nginx.conf |
| **HTTP/3** | ✅ Built-in | ⚠️ Experimental |
| **WebSocket** | ✅ Automatic | ⚠️ Manual config |
| **Resource Usage** | Low | Low |
| **Learning Curve** | ⭐⭐⭐⭐⭐ | ⭐⭐ |

**Verdict**: Caddy is much simpler for small/medium deployments with automatic SSL.

---

### 4.4 Docker + Docker Compose

| Aspect | Details |
|--------|---------|
| **Docker** | 24.x |
| **Compose** | v2.x |

**Why Docker?**
- ✅ Consistent environments (dev = prod)
- ✅ Easy deployment (single command)
- ✅ Service isolation
- ✅ Already used by bot
- ✅ Works with GitHub Student Pack hosting

---

## 5. Development Tools

### 5.1 Type Safety Chain

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      END-TO-END TYPE SAFETY                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BACKEND (Python)                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Pydantic Models  ──►  FastAPI Endpoints  ──►  OpenAPI Schema       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                        │                                    │
│                                        │ Auto-generate                      │
│                                        ▼                                    │
│  FRONTEND (TypeScript)                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TypeScript Types  ◄──  API Client (@hey-api/openapi-ts)            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  RESULT: Change a Pydantic model → TypeScript types update automatically  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Linting & Formatting

| Tool | Purpose | Configuration |
|------|---------|---------------|
| **Ruff** (Python) | Linting + Formatting | `ruff.toml` |
| **Pylint** (Python) | Additional linting | `.pylintrc` |
| **ESLint** (TS/JS) | Linting | `eslint.config.mjs` |
| **Prettier** (TS/JS) | Formatting | `.prettierrc` |

### 5.3 Testing Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| **Python Unit** | pytest + pytest-asyncio | API testing |
| **Python Coverage** | pytest-cov | Code coverage |
| **TypeScript Unit** | Vitest | Component testing |
| **E2E** | Playwright | Full flow testing |

---

## 6. Package Versions Summary

### 6.1 Frontend (package.json)

```json
{
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@tanstack/react-query": "^5.62.0",
    "zustand": "^5.0.0",
    "react-hook-form": "^7.54.0",
    "zod": "^3.24.0",
    "@hookform/resolvers": "^3.9.0",
    "recharts": "^2.15.0",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.469.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/react": "^19.0.0",
    "@types/node": "^22.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "eslint": "^9.17.0",
    "@hey-api/openapi-ts": "^0.61.0",
    "vitest": "^2.1.0",
    "@playwright/test": "^1.49.0"
  }
}
```

### 6.2 Backend (requirements-admin.txt)

```
# Core
fastapi>=0.115.0
uvicorn[standard]>=0.34.0
python-jose[cryptography]>=3.3.0
passlib[argon2]>=1.7.4
python-multipart>=0.0.18

# Database (shared with bot)
sqlalchemy>=2.0.0
asyncpg>=0.30.0
alembic>=1.14.0

# Cache (shared with bot)
redis>=5.0.0

# Validation
pydantic>=2.10.0
email-validator>=2.2.0

# WebSocket
websockets>=14.0

# Utilities
structlog>=24.0.0
httpx>=0.28.0

# Development
pytest>=8.0.0
pytest-asyncio>=0.24.0
pytest-cov>=6.0.0
ruff>=0.8.0
```

---

## 7. Decision Matrix

| Decision | Options Considered | Choice | Rationale |
|----------|-------------------|--------|-----------|
| **Frontend Framework** | Next.js, Vite+React, Remix, SvelteKit | Next.js 15 | App Router, ecosystem, templates |
| **Component Library** | shadcn/ui, MUI, Chakra, Ant | shadcn/ui | Ownership, Tailwind, customization |
| **State Management** | Redux, Zustand, Jotai | Zustand | Simplicity, bundle size |
| **Backend Framework** | FastAPI, Django, Flask | FastAPI | Async, Python, OpenAPI |
| **Database** | PostgreSQL, MySQL, SQLite | PostgreSQL | Already in use, JSON support |
| **Cache** | Redis, Memcached | Redis | Already in use, Pub/Sub |
| **Reverse Proxy** | Caddy, Nginx, Traefik | Caddy | Auto-SSL, simplicity |
| **Auth** | JWT, Sessions, OAuth | JWT | Stateless, cross-service |

---

[← Back to Architecture](./02-ARCHITECTURE.md) | [Back to Index](./README.md) | [Next: API Design →](./04-API-DESIGN.md)
