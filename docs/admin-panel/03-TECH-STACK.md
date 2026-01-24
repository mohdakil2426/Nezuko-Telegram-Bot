# 🛠️ Technology Stack

> **Nezuko Admin Panel - Technology Choices & Justifications**
> 
> **Last Updated**: January 24, 2026  
> **All versions verified against npm, PyPI, and official sources**

---

## 1. Stack Overview (Latest Versions - January 2026)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NEZUKO ADMIN PANEL STACK (JAN 2026)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FRONTEND                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Next.js 16.1     │  React 19.2.3    │  TypeScript 5.9.3           │   │
│  │  shadcn@3.7.0     │  Tailwind 4.1.18 │  TanStack Query 5.90.20     │   │
│  │  Recharts 3.7.0   │  Zustand 5.0.10  │  React Hook Form 7.71.1     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  BACKEND                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  FastAPI 0.124.4  │  Python 3.13+    │  Pydantic 2.12.5            │   │
│  │  SQLAlchemy 2.0.46│  Alembic 1.18.1  │  python-jose 3.5.0          │   │
│  │  Uvicorn 0.40.0   │  asyncpg 0.31.0  │  Structlog 25.1+            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  INFRASTRUCTURE                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL 18    │  Redis 8         │  Docker 27+                 │   │
│  │  Caddy 2.10.2     │  Turborepo 2.7   │  DigitalOcean               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Technologies

### 2.1 Next.js 16 (App Router)

| Aspect | Details |
|--------|---------|
| **Version** | 16.1.4 (Latest Stable - Jan 2026) |
| **Router** | App Router (not Pages Router) |
| **Rendering** | Server Components + Client Components |
| **Bundler** | Turbopack (now default in v16!) |

#### Why Next.js 16?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS 16 ADVANTAGES                                │
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
│  ✅ TURBOPACK (NOW DEFAULT!)                                                │
│     • 10x faster dev server than Webpack                                   │
│     • Turbopack File System Caching (stable in 16.1)                       │
│     • Instant hot module replacement                                        │
│     • Faster production builds                                              │
│                                                                             │
│  ✅ CACHE COMPONENTS (NEW IN V16)                                           │
│     • New caching primitives for data                                      │
│     • Fine-grained cache control                                           │
│                                                                             │
│  ✅ REACT COMPILER SUPPORT (STABLE)                                         │
│     • Automatic memoization                                                 │
│     • Better performance out of the box                                    │
│                                                                             │
│  ✅ APP ROUTER FEATURES                                                     │
│     • Nested layouts (shared dashboard shell)                              │
│     • Loading states (loading.tsx)                                         │
│     • Error boundaries (error.tsx)                                         │
│     • Parallel routes                                                       │
│                                                                             │
│  ✅ EASIER DEBUGGING                                                        │
│     • next dev --inspect support                                           │
│     • New Bundle Analyzer (experimental)                                   │
│                                                                             │
│  ✅ VERCEL ECOSYSTEM                                                        │
│     • Excellent documentation                                               │
│     • Large community                                                       │
│     • Easy migration path                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Next.js vs Alternatives

| Feature | Next.js 16 | Vite + React | Remix | SvelteKit |
|---------|-----------|--------------|-------|-----------|
| **SSR/SSG** | ✅ Built-in | ❌ Manual | ✅ Built-in | ✅ Built-in |
| **App Router** | ✅ Nested layouts | ❌ React Router | ✅ Similar | ✅ Similar |
| **Turbopack** | ✅ Default now | ❌ Vite (fast) | ❌ Vite | ❌ Vite |
| **React Compiler** | ✅ Stable | ⚠️ Manual | ⚠️ Manual | N/A |
| **Ecosystem** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Learning Curve** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **TypeScript** | ✅ First-class | ✅ Good | ✅ Good | ✅ Good |
| **Bundle Size** | Medium | Small | Medium | Small |
| **Admin Templates** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ |

**Verdict**: Next.js 16 wins for admin dashboards due to nested layouts (perfect for sidebars), Turbopack speed, React Compiler support, and vast ecosystem of admin templates.

---

### 2.2 shadcn/ui (v3.7.0)

| Aspect | Details |
|--------|---------|
| **Type** | Component collection (not library) |
| **Version** | 3.7.0 (Latest - Jan 2026) |
| **Styling** | Tailwind CSS 4 |
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
│  ✅ NEW IN V3.7.0 (JAN 2026)                                                │
│     • npx shadcn create for customization                                  │
│     • 5 new visual styles: Vega, Nova, Maia, Lyra, Mira                   │
│     • Base UI component documentation                                       │
│     • inline-start/inline-end support                                      │
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

### 2.3 Tailwind CSS 4 (MAJOR UPDATE!)

| Aspect | Details |
|--------|---------|
| **Version** | 4.1.18 (Latest - Dec 2025) |
| **Config** | CSS-first (@theme directive) |
| **Performance** | 5x faster builds |

#### What's New in Tailwind CSS 4?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TAILWIND CSS 4 NEW FEATURES                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ HIGH-PERFORMANCE ENGINE                                                 │
│     • 5x faster full builds                                                │
│     • 100x+ faster incremental builds                                      │
│     • Near-instant HMR                                                     │
│                                                                             │
│  ✅ CSS-FIRST CONFIGURATION                                                 │
│     • Configure via CSS instead of tailwind.config.js                      │
│     • @theme directive for customization                                   │
│     • More intuitive for CSS developers                                    │
│                                                                             │
│  ✅ MODERN CSS FEATURES                                                     │
│     • Cascade layers (@layer)                                              │
│     • color-mix() for dynamic colors                                       │
│     • Container queries built-in                                           │
│                                                                             │
│  ✅ P3 WIDE-GAMUT COLOR PALETTE                                             │
│     • Modernized color system                                              │
│     • More vibrant colors on supported displays                            │
│     • oklch() color space support                                          │
│                                                                             │
│  ✅ SIMPLIFIED SETUP                                                        │
│     • Automatic content detection                                          │
│     • Built-in import support                                              │
│     • No PostCSS config needed                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Tailwind 4 CSS-First Configuration Example

```css
/* app/globals.css - New Tailwind 4 approach */
@import "tailwindcss";

/* Custom theme using @theme directive (replaces tailwind.config.js) */
@theme {
  /* Colors using oklch for P3 wide gamut */
  --color-primary-50: oklch(0.97 0.02 265);
  --color-primary-500: oklch(0.55 0.25 265);
  --color-primary-900: oklch(0.30 0.15 265);
  
  /* Semantic colors */
  --color-success: oklch(0.65 0.20 145);
  --color-warning: oklch(0.75 0.18 70);
  --color-error: oklch(0.60 0.25 25);
  
  /* Dark mode backgrounds */
  --color-background: oklch(0.10 0.01 265);
  --color-surface: oklch(0.15 0.01 265);
  
  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
}
```

---

### 2.4 TanStack Query (React Query) v5.90

| Aspect | Details |
|--------|---------|
| **Version** | 5.90.20 (Latest - Jan 2026) |
| **Purpose** | Server state management |

#### Why TanStack Query?

```typescript
// Without TanStack Query ❌
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

// With TanStack Query ✅
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

### 2.5 Zod 4 (MAJOR UPDATE!)

| Aspect | Details |
|--------|---------|
| **Version** | 4.3.6 (Latest - Jan 2026) |
| **Purpose** | Schema validation |

#### What's New in Zod 4?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ZOD 4 NEW FEATURES                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ PERFORMANCE                                                             │
│     • Faster parsing than Zod 3                                            │
│     • Smaller bundle size                                                   │
│     • Better TypeScript compiler (tsc) performance                         │
│                                                                             │
│  ✅ NEW FEATURES                                                            │
│     • Built-in JSON Schema conversion (z.toJSONSchema())                   │
│     • Codecs for encoding/decoding                                         │
│     • Improved error messages                                              │
│     • Better discriminated unions                                          │
│                                                                             │
│  ✅ MIGRATION FROM ZOD 3                                                    │
│     • Most schemas work unchanged                                          │
│     • Some API refinements                                                 │
│     • See zod.dev for migration guide                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.6 Other Frontend Dependencies

| Package | Version | Purpose | Why This Choice |
|---------|---------|---------|-----------------|
| **React** | 19.2.3 | UI library | Latest with Actions, use() hook |
| **TypeScript** | 5.9.3 | Type safety | Catch errors at compile time |
| **Zustand** | 5.0.10 | Client state | Simpler than Redux, smaller than Jotai |
| **React Hook Form** | 7.71.1 | Forms | Best performance, minimal re-renders |
| **Recharts** | 3.7.0 | Charts | React-native, composable, customizable |
| **date-fns** | 4.1.0 | Dates | Modular, tree-shakeable, timezone support |
| **Lucide React** | 0.563.0 | Icons | Open source, consistent, tree-shakeable |

---

## 3. Backend Technologies

### 3.1 FastAPI (v0.124.4)

| Aspect | Details |
|--------|---------|
| **Version** | 0.124.4 (Latest - Dec 2025) |
| **Python** | 3.13+ required |

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
| **SQLAlchemy** | 2.0.46 (Latest - Jan 2026) |
| **Alembic** | 1.18.1 (Latest - Jan 2026) |
| **Driver** | asyncpg 0.31.0 |

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
- **Migration support**: Alembic 1.18 with new plugin system
- **Type safety**: mypy plugin for static analysis

---

### 3.3 JWT Authentication (python-jose)

| Aspect | Details |
|--------|---------|
| **Library** | python-jose[cryptography] 3.5.0 |
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

### 4.1 PostgreSQL 18

| Aspect | Details |
|--------|---------|
| **Version** | 18.1 (Latest major - Nov 2025) |
| **Driver** | asyncpg 0.31.0 |
| **Image** | postgres:18-alpine |

**Why PostgreSQL 18?**
- ✅ Already used by bot (shared database)
- ✅ ACID compliant
- ✅ JSON support for flexible config storage
- ✅ Excellent async driver (asyncpg)
- ✅ Battle-tested at scale
- ✅ Latest performance improvements

---

### 4.2 Redis 8

| Aspect | Details |
|--------|---------|
| **Version** | 8.0 (Latest major) or 7.4.7 LTS |
| **Driver** | redis-py 5.2.1 (async) |
| **Image** | redis:8-alpine |

**Why Redis 8?**
- ✅ Session storage (JWT refresh tokens)
- ✅ Caching (dashboard stats, user data)
- ✅ Pub/Sub (real-time log streaming)
- ✅ Rate limiting (token bucket)
- ✅ Already used by bot

---

### 4.3 Caddy 2.10 (Reverse Proxy)

| Aspect | Details |
|--------|---------|
| **Version** | 2.10.2 (Latest stable) |
| **Purpose** | Reverse proxy, Auto-SSL |

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
│     • Encrypted ClientHello (ECH) in 2.10                                  │
│     • Post-quantum key exchange in 2.10                                    │
│                                                                             │
│  ✅ SINGLE BINARY                                                           │
│     • No dependencies                                                       │
│     • Easy Docker deployment                                                │
│     • Minimal attack surface                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Caddy vs Nginx

| Feature | Caddy 2.10 | Nginx |
|---------|-------|-------|
| **Auto SSL** | ✅ Built-in | ❌ Certbot required |
| **Config** | Simple Caddyfile | Complex nginx.conf |
| **HTTP/3** | ✅ Built-in | ⚠️ Experimental |
| **WebSocket** | ✅ Automatic | ⚠️ Manual config |
| **Post-Quantum** | ✅ v2.10+ | ❌ No |
| **Resource Usage** | Low | Low |
| **Learning Curve** | ⭐⭐⭐⭐⭐ | ⭐⭐ |

**Verdict**: Caddy is much simpler for small/medium deployments with automatic SSL.

---

### 4.4 Docker + Turborepo

| Aspect | Details |
|--------|---------|
| **Docker** | 27.x |
| **Compose** | v2.32+ |
| **Turborepo** | 2.7.0 (Monorepo) |

**Why Docker?**
- ✅ Consistent environments (dev = prod)
- ✅ Easy deployment (single command)
- ✅ Service isolation
- ✅ Already used by bot
- ✅ Works with GitHub Student Pack hosting

**Why Turborepo 2.7?**
- ✅ Fast monorepo builds
- ✅ Shared dependencies
- ✅ Parallel task execution
- ✅ Remote caching

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

| Tool | Version | Purpose | Configuration |
|------|---------|---------|---------------|
| **Ruff** (Python) | 0.9.3 | Linting + Formatting | `ruff.toml` |
| **Pylint** (Python) | 3.3+ | Additional linting | `.pylintrc` |
| **ESLint** (TS/JS) | 9.18+ | Linting | `eslint.config.mjs` |
| **Prettier** (TS/JS) | 3.4+ | Formatting | `.prettierrc` |

### 5.3 Testing Stack

| Layer | Tool | Version | Purpose |
|-------|------|---------|---------|
| **Python Unit** | pytest | 8.3+ | API testing |
| **Python Async** | pytest-asyncio | 0.25+ | Async support |
| **Python Coverage** | pytest-cov | 6.0+ | Code coverage |
| **TypeScript Unit** | Vitest | 3.0+ | Component testing |
| **E2E** | Playwright | 1.50+ | Full flow testing |

---

## 6. Complete Package Versions

### 6.1 Frontend (package.json)

```json
{
  "name": "nezuko-admin",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:e2e": "playwright test",
    "generate-api": "openapi-ts"
  },
  "dependencies": {
    "next": "^16.1.4",
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "@tanstack/react-query": "^5.90.20",
    "zustand": "^5.0.10",
    "react-hook-form": "^7.71.1",
    "zod": "^4.3.6",
    "@hookform/resolvers": "^4.1.0",
    "recharts": "^3.7.0",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.563.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.0.0",
    "class-variance-authority": "^0.7.1"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "@types/react": "^19.0.0",
    "@types/node": "^22.10.0",
    "tailwindcss": "^4.1.18",
    "eslint": "^9.18.0",
    "eslint-config-next": "^16.1.0",
    "prettier": "^3.4.2",
    "@hey-api/openapi-ts": "^0.66.0",
    "vitest": "^3.0.4",
    "@playwright/test": "^1.50.0"
  }
}
```

### 6.2 Backend (requirements-admin.txt)

```
# ===========================================
# NEZUKO ADMIN API - PYTHON DEPENDENCIES
# Last Updated: January 24, 2026
# ===========================================

# Core Framework
fastapi>=0.124.4
uvicorn[standard]>=0.40.0
python-multipart>=0.0.20

# Authentication
python-jose[cryptography]>=3.5.0
passlib[argon2]>=1.7.4

# Validation
pydantic>=2.12.5
pydantic-settings>=2.7.0
email-validator>=2.2.0

# Database
sqlalchemy[asyncio]>=2.0.46
asyncpg>=0.31.0
alembic>=1.18.1

# Cache
redis>=5.2.1

# HTTP & WebSocket
httpx>=0.28.1
websockets>=14.1

# Logging
structlog>=25.1.0

# Monitoring (Optional)
prometheus-client>=0.21.0
sentry-sdk[fastapi]>=2.19.0

# Development
pytest>=8.3.4
pytest-asyncio>=0.25.2
pytest-cov>=6.0.0
ruff>=0.9.3
mypy>=1.14.0
```

### 6.3 Docker Image Versions

```yaml
# Recommended Docker images (January 2026)

services:
  postgres:
    image: postgres:18-alpine
    
  redis:
    image: redis:8-alpine
    # Alternative LTS: redis:7.4-alpine
    
  caddy:
    image: caddy:2.10-alpine
    
  # Node.js for Next.js
  web:
    build:
      args:
        NODE_VERSION: "22"  # LTS
        
  # Python for FastAPI
  api:
    build:
      args:
        PYTHON_VERSION: "3.13"
```

---

## 7. Decision Matrix

| Decision | Options Considered | Choice | Rationale |
|----------|-------------------|--------|-----------|
| **Frontend Framework** | Next.js, Vite+React, Remix, SvelteKit | Next.js 16 | Turbopack default, React Compiler, ecosystem |
| **Component Library** | shadcn/ui, MUI, Chakra, Ant | shadcn/ui 3.7 | Ownership, Tailwind 4, customization |
| **CSS Framework** | Tailwind, CSS Modules, Styled | Tailwind 4 | 5x faster, CSS-first config |
| **State Management** | Redux, Zustand, Jotai | Zustand 5 | Simplicity, bundle size |
| **Validation** | Zod, Yup, Joi | Zod 4 | TypeScript-first, faster |
| **Backend Framework** | FastAPI, Django, Flask | FastAPI 0.124 | Async, Python, OpenAPI |
| **Database** | PostgreSQL, MySQL, SQLite | PostgreSQL 18 | Already in use, JSON support |
| **Cache** | Redis, Memcached | Redis 8 | Already in use, Pub/Sub |
| **Reverse Proxy** | Caddy, Nginx, Traefik | Caddy 2.10 | Auto-SSL, simplicity, HTTP/3 |
| **Auth** | JWT, Sessions, OAuth | JWT | Stateless, cross-service |
| **Monorepo** | Turborepo, Nx, Lerna | Turborepo 2.7 | Simple, fast, Vercel |

---

## 8. Version Upgrade Notes & Coming Soon

### 8.1 Breaking Changes to Watch

| Package | Change | Migration Required |
|---------|--------|-------------------|
| **Tailwind 4** | CSS-first config | Convert tailwind.config.js to @theme CSS |
| **Zod 4** | API refinements | Minor schema updates |
| **Next.js 16** | Turbopack default | Usually automatic |
| **React 19** | Stricter StrictMode | Check for side effects |

### 8.2 Coming Soon (2026 Roadmap)

| Package | Version | Expected | Notes |
|---------|---------|----------|-------|
| **TypeScript** | 6.0 | Q1 2026 (Feb/Mar) | Final JS-based compiler |
| **TypeScript** | 7.0 (Corsa) | Summer 2026 | Go-based rewrite, 10x faster |
| **SQLAlchemy** | 2.1 | Q1 2026 | Beta available now |
| **Caddy** | 2.11 | Q1 2026 | In beta now |

---

[← Back to Architecture](./02-ARCHITECTURE.md) | [Back to Index](./README.md) | [Next: API Design →](./04-API-DESIGN.md)
