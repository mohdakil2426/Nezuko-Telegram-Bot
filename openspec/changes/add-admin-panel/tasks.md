# Tasks: Add Admin Panel

> **Ultra-Detailed Implementation Checklist**
>
> Each task is small, atomic, and includes doc references.
> Tasks are organized into granular phases with clear dependencies.

---

## 📚 Documentation Reference Map

| Phase           | Primary Docs                                                               | Secondary Docs           |
| --------------- | -------------------------------------------------------------------------- | ------------------------ |
| **Phase 0**     | `02a-FOLDER-STRUCTURE.md`, `03-TECH-STACK.md`, `08-DEPLOYMENT.md`          | `README.md`              |
| **Phase 1**     | `07-SECURITY.md`, `02-ARCHITECTURE.md`, `04-API-DESIGN.md`                 | `04a-ERROR-HANDLING.md`  |
| **Phase 2**     | `05-UI-WIREFRAMES.md`, `05a-PAGE-WIREFRAMES.md`, `02a-FOLDER-STRUCTURE.md` | `03-TECH-STACK.md`       |
| **Phase 3**     | `04-API-DESIGN.md`, `05a-PAGE-WIREFRAMES.md`                               | `01-REQUIREMENTS.md`     |
| **Phase 4-6**   | `04-API-DESIGN.md`, `01-REQUIREMENTS.md`                                   | `05a-PAGE-WIREFRAMES.md` |
| **Phase 7**     | `04-API-DESIGN.md` Section 7, `05a-PAGE-WIREFRAMES.md`                     | `02-ARCHITECTURE.md`     |
| **Phase 8-9**   | `04-API-DESIGN.md` Sections 8-9, `05a-PAGE-WIREFRAMES.md`                  | `01-REQUIREMENTS.md`     |
| **Phase 10-11** | `07-SECURITY.md`, `02-ARCHITECTURE.md`                                     | `01-REQUIREMENTS.md`     |
| **Phase 12**    | `04a-ERROR-HANDLING.md`, `07a-SECURITY-ADVANCED.md`, `08-DEPLOYMENT.md`    | All docs                 |

**All docs located at**: `docs/admin-panel/`

---

## Phase 0: Foundation - Monorepo Setup (Week 1)

> 📖 **Phase Docs**: Read these docs before starting Phase 0:
> - `docs/admin-panel/README.md` - Overview and vision
> - `docs/admin-panel/02a-FOLDER-STRUCTURE.md` - Complete folder structure
> - `docs/admin-panel/03-TECH-STACK.md` - All technology versions (January 2026)
> - `docs/admin-panel/08-DEPLOYMENT.md` - Docker configuration

### 0.1 Project Initialization
> 📖 **Read First**: `docs/admin-panel/02a-FOLDER-STRUCTURE.md` Section 1

- [ ] 0.1.1 Create root `package.json` with workspaces configuration
- [ ] 0.1.2 Create `pnpm-workspace.yaml` defining `apps/*` and `packages/*`
- [ ] 0.1.3 Create `turbo.json` with build/dev/lint/test pipelines
- [ ] 0.1.4 Create root `.gitignore` with node_modules, .next, __pycache__, .env
- [ ] 0.1.5 Create root `.env.example` with all required variables
- [ ] 0.1.6 Create root `.editorconfig` for consistent formatting
- [ ] 0.1.7 Create root `.prettierrc` with project settings

### 0.2 Next.js Frontend Initialization
> 📖 **Read First**: `docs/admin-panel/03-TECH-STACK.md` Section 2.1

- [ ] 0.2.1 Run `npx create-next-app@16 apps/web --typescript --tailwind --eslint --app --src-dir`
- [ ] 0.2.2 Configure `next.config.ts` with Turbopack
- [ ] 0.2.3 Update `tsconfig.json` with path aliases (`@/*`)
- [ ] 0.2.4 Create `apps/web/src/app/globals.css` with Tailwind imports
- [ ] 0.2.5 Install core dependencies: react-hook-form, zod, @hookform/resolvers
- [ ] 0.2.6 Install UI dependencies: @radix-ui/react-*, lucide-react, class-variance-authority
- [ ] 0.2.7 Install state dependencies: zustand, @tanstack/react-query
- [ ] 0.2.8 Install chart dependency: recharts
- [ ] 0.2.9 Initialize shadcn/ui with `npx shadcn@latest init`

### 0.3 FastAPI Backend Initialization
> 📖 **Read First**: `docs/admin-panel/03-TECH-STACK.md` Section 3.1

- [ ] 0.3.1 Create `apps/api/` directory structure per `02a-FOLDER-STRUCTURE.md`
- [ ] 0.3.2 Create `apps/api/pyproject.toml` with project configuration
- [ ] 0.3.3 Create `apps/api/requirements.txt` with pinned dependencies
- [ ] 0.3.4 Create `apps/api/requirements-dev.txt` with test/lint deps
- [ ] 0.3.5 Create `apps/api/src/__init__.py`
- [ ] 0.3.6 Create `apps/api/src/main.py` with FastAPI app initialization
- [ ] 0.3.7 Create `apps/api/src/core/__init__.py`
- [ ] 0.3.8 Create `apps/api/src/core/config.py` with Pydantic BaseSettings
- [ ] 0.3.9 Create `apps/api/ruff.toml` with linting configuration
- [ ] 0.3.10 Create `apps/api/pytest.ini` with test configuration

### 0.4 Shared Packages Setup
> 📖 **Read First**: `docs/admin-panel/02a-FOLDER-STRUCTURE.md` Section 4

- [ ] 0.4.1 Create `packages/types/package.json`
- [ ] 0.4.2 Create `packages/types/tsconfig.json`
- [ ] 0.4.3 Create `packages/types/src/index.ts` with base exports
- [ ] 0.4.4 Create `packages/types/src/api.ts` with API response types
- [ ] 0.4.5 Create `packages/types/src/models/` directory
- [ ] 0.4.6 Create `packages/config/package.json`
- [ ] 0.4.7 Create `packages/config/eslint/base.js`
- [ ] 0.4.8 Create `packages/config/typescript/base.json`

### 0.5 Docker Development Environment
> 📖 **Read First**: `docs/admin-panel/08-DEPLOYMENT.md`

- [ ] 0.5.1 Create `docker/development/` directory
- [ ] 0.5.2 Create `docker/development/Dockerfile.web` for Next.js dev
- [ ] 0.5.3 Create `docker/development/Dockerfile.api` for FastAPI dev
- [ ] 0.5.4 Create `docker/compose/docker-compose.dev.yml` with all services
- [ ] 0.5.5 Configure PostgreSQL service with volume persistence
- [ ] 0.5.6 Configure Redis service with volume persistence
- [ ] 0.5.7 Configure hot-reload volumes for web and api
- [ ] 0.5.8 Create `docker/compose/.env.example` for Docker secrets
- [ ] 0.5.9 Test `docker compose up` starts all services successfully
- [ ] 0.5.10 Verify hot-reload works for both frontend and backend

### 0.6 CI/CD Pipeline
- [ ] 0.6.1 Create `.github/workflows/ci.yml`
- [ ] 0.6.2 Add job: Install dependencies (pnpm + pip)
- [ ] 0.6.3 Add job: Lint frontend (ESLint)
- [ ] 0.6.4 Add job: Lint backend (Ruff)
- [ ] 0.6.5 Add job: Type check frontend (tsc --noEmit)
- [ ] 0.6.6 Add job: Type check backend (pyrefly check)
- [ ] 0.6.7 Add job: Test frontend (vitest)
- [ ] 0.6.8 Add job: Test backend (pytest)
- [ ] 0.6.9 Add job: Build frontend (next build)
- [ ] 0.6.10 Configure caching for pnpm and pip

---

## Phase 1: Authentication System (Week 2)

> 📖 **Phase Docs**: Read these docs before starting Phase 1:
> - `docs/admin-panel/07-SECURITY.md` - **CRITICAL**: JWT ES256, Argon2id, OWASP compliance
> - `docs/admin-panel/02-ARCHITECTURE.md` Section 3.1 - Database schema for admin tables
> - `docs/admin-panel/04-API-DESIGN.md` Section 2 - Auth endpoints specification
> - `docs/admin-panel/04a-ERROR-HANDLING.md` - RFC 9457 error format
> - `docs/admin-panel/01-REQUIREMENTS.md` Section 2.1 - FR-AUTH-001 to FR-AUTH-004

### 1.1 Database - Admin User Tables
> 📖 **Read First**: `docs/admin-panel/02-ARCHITECTURE.md` Section 3.1

- [ ] 1.1.1 Create `apps/api/src/models/__init__.py`
- [ ] 1.1.2 Create `apps/api/src/models/base.py` with DeclarativeBase
- [ ] 1.1.3 Create `apps/api/src/models/admin_user.py` with AdminUser model
- [ ] 1.1.4 Define columns: id (UUID), email, password_hash, full_name, role
- [ ] 1.1.5 Define columns: is_active, telegram_id, created_at, updated_at, last_login
- [ ] 1.1.6 Add email unique constraint
- [ ] 1.1.7 Add telegram_id unique constraint
- [ ] 1.1.8 Create `apps/api/src/models/admin_session.py` with AdminSession model
- [ ] 1.1.9 Define columns: id, user_id (FK), refresh_token, ip_address, user_agent
- [ ] 1.1.10 Define columns: expires_at, created_at
- [ ] 1.1.11 Add refresh_token unique constraint
- [ ] 1.1.12 Add foreign key to admin_users with CASCADE delete

### 1.2 Database - Connection & Migrations
> 📖 **Read First**: `docs/admin-panel/03-TECH-STACK.md` Section 3.2

- [ ] 1.2.1 Create `apps/api/src/core/database.py`
- [ ] 1.2.2 Configure async engine with asyncpg driver
- [ ] 1.2.3 Configure connection pool (20 connections, 10 overflow)
- [ ] 1.2.4 Create async session factory
- [ ] 1.2.5 Create `get_session` dependency for FastAPI
- [ ] 1.2.6 Create `apps/api/alembic.ini`
- [ ] 1.2.7 Create `apps/api/alembic/env.py` with async support
- [ ] 1.2.8 Create `apps/api/alembic/script.py.mako` template
- [ ] 1.2.9 Run `alembic revision --autogenerate -m "add_admin_users"`
- [ ] 1.2.10 Verify migration script is correct
- [ ] 1.2.11 Run `alembic upgrade head` to apply migration

### 1.3 Password Security
> 📖 **Read First**: `docs/admin-panel/07-SECURITY.md` Section 2.1

- [ ] 1.3.1 Create `apps/api/src/core/security.py`
- [ ] 1.3.2 Configure passlib CryptContext with argon2
- [ ] 1.3.3 Set argon2__memory_cost=65536 (64 MiB)
- [ ] 1.3.4 Set argon2__time_cost=3 (iterations)
- [ ] 1.3.5 Set argon2__parallelism=4 (threads)
- [ ] 1.3.6 Create `hash_password(password: str) -> str` function
- [ ] 1.3.7 Create `verify_password(plain: str, hashed: str) -> bool` function
- [ ] 1.3.8 Write unit test for password hashing
- [ ] 1.3.9 Write unit test for password verification
- [ ] 1.3.10 Verify Argon2id is used (not Argon2i or Argon2d)

### 1.4 JWT Token Management
> 📖 **Read First**: `docs/admin-panel/07-SECURITY.md` Section 2.2

- [ ] 1.4.1 Generate ES256 key pair: `openssl ecparam -genkey -name prime256v1 -out jwt-private.pem`
- [ ] 1.4.2 Extract public key: `openssl ec -in jwt-private.pem -pubout -out jwt-public.pem`
- [ ] 1.4.3 Add JWT_PRIVATE_KEY_PATH to config
- [ ] 1.4.4 Add JWT_PUBLIC_KEY_PATH to config
- [ ] 1.4.5 Create `create_access_token(user_id: str, role: str) -> str` function
- [ ] 1.4.6 Set access token expiry to 15 minutes
- [ ] 1.4.7 Include claims: sub, iss, aud, exp, nbf, iat, role, session_id
- [ ] 1.4.8 Create `create_refresh_token(user_id: str) -> str` function
- [ ] 1.4.9 Set refresh token expiry to 7 days
- [ ] 1.4.10 Create `decode_token(token: str) -> dict` function
- [ ] 1.4.11 Validate algorithm is ES256 only (reject none, HS256)
- [ ] 1.4.12 Validate issuer and audience claims
- [ ] 1.4.13 Write unit tests for token creation
- [ ] 1.4.14 Write unit tests for token validation
- [ ] 1.4.15 Write unit test for expired token rejection

### 1.5 Auth Schemas (Pydantic)
> 📖 **Read First**: `docs/admin-panel/04-API-DESIGN.md` Section 2

- [ ] 1.5.1 Create `apps/api/src/schemas/__init__.py`
- [ ] 1.5.2 Create `apps/api/src/schemas/base.py` with SuccessResponse, ErrorResponse
- [ ] 1.5.3 Create `apps/api/src/schemas/auth.py`
- [ ] 1.5.4 Define `LoginRequest` schema (email: EmailStr, password: str)
- [ ] 1.5.5 Add password validation: min 12 chars, upper, lower, number
- [ ] 1.5.6 Define `LoginResponse` schema (access_token, refresh_token, expires_in, user)
- [ ] 1.5.7 Define `RefreshRequest` schema (refresh_token: str)
- [ ] 1.5.8 Define `RefreshResponse` schema (access_token, expires_in)
- [ ] 1.5.9 Define `UserResponse` schema (id, email, full_name, role, created_at, last_login)
- [ ] 1.5.10 Add `extra = "forbid"` to reject unknown fields

### 1.6 Auth Service Layer
- [ ] 1.6.1 Create `apps/api/src/services/__init__.py`
- [ ] 1.6.2 Create `apps/api/src/services/auth_service.py`
- [ ] 1.6.3 Create `authenticate_user(email: str, password: str) -> AdminUser | None`
- [ ] 1.6.4 Query user by email
- [ ] 1.6.5 Verify password with Argon2id
- [ ] 1.6.6 Update last_login timestamp on success
- [ ] 1.6.7 Create `create_session(user_id: str, ip: str, user_agent: str) -> AdminSession`
- [ ] 1.6.8 Store refresh token hash in database
- [ ] 1.6.9 Create `revoke_session(refresh_token: str) -> bool`
- [ ] 1.6.10 Create `refresh_session(refresh_token: str) -> tuple[str, str]`
- [ ] 1.6.11 Implement token rotation (invalidate old, create new)
- [ ] 1.6.12 Detect token reuse (security: revoke all user sessions)

### 1.7 Auth API Endpoints
> 📖 **Read First**: `docs/admin-panel/04-API-DESIGN.md` Section 2

- [ ] 1.7.1 Create `apps/api/src/api/__init__.py`
- [ ] 1.7.2 Create `apps/api/src/api/v1/__init__.py`
- [ ] 1.7.3 Create `apps/api/src/api/v1/router.py` (main v1 router)
- [ ] 1.7.4 Create `apps/api/src/api/v1/endpoints/__init__.py`
- [ ] 1.7.5 Create `apps/api/src/api/v1/endpoints/auth.py`
- [ ] 1.7.6 Implement `POST /auth/login` endpoint
- [ ] 1.7.7 Return JWT tokens on success
- [ ] 1.7.8 Return 401 on invalid credentials
- [ ] 1.7.9 Implement `POST /auth/refresh` endpoint
- [ ] 1.7.10 Validate refresh token
- [ ] 1.7.11 Return new access + refresh tokens
- [ ] 1.7.12 Implement `POST /auth/logout` endpoint
- [ ] 1.7.13 Revoke session in database
- [ ] 1.7.14 Return 204 No Content
- [ ] 1.7.15 Implement `GET /auth/me` endpoint
- [ ] 1.7.16 Return current user info
- [ ] 1.7.17 Register auth router in main v1 router

### 1.8 Auth Middleware & Dependencies
> 📖 **Read First**: `docs/admin-panel/07-SECURITY.md` Section 2.2

- [ ] 1.8.1 Create `apps/api/src/api/v1/dependencies/__init__.py`
- [ ] 1.8.2 Create `apps/api/src/api/v1/dependencies/auth.py`
- [ ] 1.8.3 Create `get_current_user` dependency
- [ ] 1.8.4 Extract Bearer token from Authorization header
- [ ] 1.8.5 Decode and validate JWT
- [ ] 1.8.6 Check session is not revoked
- [ ] 1.8.7 Return user payload
- [ ] 1.8.8 Raise 401 if token invalid/expired
- [ ] 1.8.9 Create `get_current_active_user` dependency
- [ ] 1.8.10 Check user.is_active == True
- [ ] 1.8.11 Raise 403 if user disabled

### 1.9 Rate Limiting for Auth
> 📖 **Read First**: `docs/admin-panel/07-SECURITY.md` Section 4.1

- [ ] 1.9.1 Install slowapi: `pip install slowapi`
- [ ] 1.9.2 Create `apps/api/src/middleware/__init__.py`
- [ ] 1.9.3 Create `apps/api/src/middleware/rate_limit.py`
- [ ] 1.9.4 Configure Redis-backed rate limiter
- [ ] 1.9.5 Set login endpoint limit: 5 requests per 15 minutes
- [ ] 1.9.6 Set refresh endpoint limit: 10 requests per hour
- [ ] 1.9.7 Apply rate limit decorators to auth endpoints
- [ ] 1.9.8 Add X-RateLimit-* response headers
- [ ] 1.9.9 Return 429 with Retry-After header when exceeded

### 1.10 Auth Integration Tests
- [ ] 1.10.1 Create `apps/api/tests/__init__.py`
- [ ] 1.10.2 Create `apps/api/tests/conftest.py` with test fixtures
- [ ] 1.10.3 Create test database fixture
- [ ] 1.10.4 Create test client fixture
- [ ] 1.10.5 Create `apps/api/tests/integration/test_auth.py`
- [ ] 1.10.6 Test: Login with valid credentials returns tokens
- [ ] 1.10.7 Test: Login with invalid email returns 401
- [ ] 1.10.8 Test: Login with wrong password returns 401
- [ ] 1.10.9 Test: Refresh with valid token returns new tokens
- [ ] 1.10.10 Test: Refresh with expired token returns 401
- [ ] 1.10.11 Test: Logout invalidates session
- [ ] 1.10.12 Test: /me returns current user
- [ ] 1.10.13 Test: Rate limiting blocks excessive login attempts

---

## Phase 2: Frontend Auth & Layout (Week 2-3)

> 📖 **Phase Docs**: Read these docs before starting Phase 2:
> - `docs/admin-panel/05-UI-WIREFRAMES.md` - Design system, colors, typography
> - `docs/admin-panel/05a-PAGE-WIREFRAMES.md` - Page component layouts
> - `docs/admin-panel/02a-FOLDER-STRUCTURE.md` Section 2 - Frontend folder structure
> - `docs/admin-panel/03-TECH-STACK.md` Section 2 - shadcn/ui, Tailwind CSS 4, TanStack Query

### 2.1 Base Layout Components
> 📖 **Read First**: `docs/admin-panel/05-UI-WIREFRAMES.md`

- [ ] 2.1.1 Create `apps/web/src/components/layout/sidebar.tsx`
- [ ] 2.1.2 Create sidebar navigation items array
- [ ] 2.1.3 Add Dashboard, Groups, Channels, Config, Logs, Database, Analytics links
- [ ] 2.1.4 Add active state styling
- [ ] 2.1.5 Add collapsed/expanded toggle
- [ ] 2.1.6 Create `apps/web/src/components/layout/header.tsx`
- [ ] 2.1.7 Add user avatar dropdown
- [ ] 2.1.8 Add theme toggle (dark/light)
- [ ] 2.1.9 Add logout button
- [ ] 2.1.10 Create `apps/web/src/components/layout/footer.tsx`
- [ ] 2.1.11 Add version and copyright

### 2.2 shadcn/ui Component Installation
> 📖 **Read First**: `docs/admin-panel/03-TECH-STACK.md` Section 2.2

- [ ] 2.2.1 Install button: `npx shadcn add button`
- [ ] 2.2.2 Install card: `npx shadcn add card`
- [ ] 2.2.3 Install input: `npx shadcn add input`
- [ ] 2.2.4 Install label: `npx shadcn add label`
- [ ] 2.2.5 Install form: `npx shadcn add form`
- [ ] 2.2.6 Install toast: `npx shadcn add toast`
- [ ] 2.2.7 Install dropdown-menu: `npx shadcn add dropdown-menu`
- [ ] 2.2.8 Install avatar: `npx shadcn add avatar`
- [ ] 2.2.9 Install table: `npx shadcn add table`
- [ ] 2.2.10 Install dialog: `npx shadcn add dialog`
- [ ] 2.2.11 Install sheet: `npx shadcn add sheet`
- [ ] 2.2.12 Install skeleton: `npx shadcn add skeleton`

### 2.3 Auth Store (Zustand)
> 📖 **Read First**: `docs/admin-panel/02a-FOLDER-STRUCTURE.md` Section 2

- [ ] 2.3.1 Create `apps/web/src/stores/auth-store.ts`
- [ ] 2.3.2 Define AuthState interface: user, accessToken, isAuthenticated, isLoading
- [ ] 2.3.3 Create `login(email, password)` action
- [ ] 2.3.4 Create `logout()` action
- [ ] 2.3.5 Create `refreshToken()` action
- [ ] 2.3.6 Store tokens in httpOnly cookie (via API response)
- [ ] 2.3.7 Create `apps/web/src/stores/ui-store.ts`
- [ ] 2.3.8 Define UIState: sidebarCollapsed, theme

### 2.4 API Client Setup
> 📖 **Read First**: `docs/admin-panel/04-API-DESIGN.md` Section 1

- [ ] 2.4.1 Create `apps/web/src/lib/api/client.ts`
- [ ] 2.4.2 Configure base URL from environment variable
- [ ] 2.4.3 Add Authorization header interceptor
- [ ] 2.4.4 Add 401 response interceptor for token refresh
- [ ] 2.4.5 Create `apps/web/src/lib/api/endpoints/auth.ts`
- [ ] 2.4.6 Implement `login(email, password)` API call
- [ ] 2.4.7 Implement `refresh(refreshToken)` API call
- [ ] 2.4.8 Implement `logout()` API call
- [ ] 2.4.9 Implement `getMe()` API call

### 2.5 Login Page UI
> 📖 **Read First**: `docs/admin-panel/05a-PAGE-WIREFRAMES.md`

- [ ] 2.5.1 Create `apps/web/src/app/(auth)/layout.tsx` (minimal layout)
- [ ] 2.5.2 Create `apps/web/src/app/(auth)/login/page.tsx`
- [ ] 2.5.3 Create centered card layout
- [ ] 2.5.4 Add Nezuko logo/branding
- [ ] 2.5.5 Create `apps/web/src/components/forms/login-form.tsx`
- [ ] 2.5.6 Add email input with validation
- [ ] 2.5.7 Add password input with show/hide toggle
- [ ] 2.5.8 Add "Remember me" checkbox
- [ ] 2.5.9 Add submit button with loading state
- [ ] 2.5.10 Add "Forgot password?" link (placeholder)
- [ ] 2.5.11 Integrate with react-hook-form
- [ ] 2.5.12 Add zod schema validation
- [ ] 2.5.13 Connect to auth store login action
- [ ] 2.5.14 Show error toast on failed login
- [ ] 2.5.15 Redirect to dashboard on success

### 2.6 Auth Provider & Protection
- [ ] 2.6.1 Create `apps/web/src/providers/auth-provider.tsx`
- [ ] 2.6.2 Check auth state on mount
- [ ] 2.6.3 Auto-refresh token if expired
- [ ] 2.6.4 Create `apps/web/src/lib/hooks/use-auth.ts`
- [ ] 2.6.5 Return user, isAuthenticated, login, logout functions
- [ ] 2.6.6 Create `apps/web/src/app/(dashboard)/layout.tsx`
- [ ] 2.6.7 Wrap with AuthProvider
- [ ] 2.6.8 Redirect to /login if not authenticated
- [ ] 2.6.9 Show loading spinner while checking auth
- [ ] 2.6.10 Include Sidebar and Header components

### 2.7 Theme Provider
- [ ] 2.7.1 Create `apps/web/src/providers/theme-provider.tsx`
- [ ] 2.7.2 Use next-themes for dark/light mode
- [ ] 2.7.3 Persist theme preference in localStorage
- [ ] 2.7.4 Add system preference detection
- [ ] 2.7.5 Configure Tailwind dark mode classes

### 2.8 Query Provider (TanStack Query)
- [ ] 2.8.1 Create `apps/web/src/providers/query-provider.tsx`
- [ ] 2.8.2 Configure QueryClient with defaults
- [ ] 2.8.3 Set staleTime to 5 minutes
- [ ] 2.8.4 Set refetchOnWindowFocus to true
- [ ] 2.8.5 Add to root layout providers

---

## Phase 3: Dashboard Page (Week 3)

> 📖 **Phase Docs**: Read these docs before starting Phase 3:
> - `docs/admin-panel/04-API-DESIGN.md` Section 3 - Dashboard endpoints
> - `docs/admin-panel/05a-PAGE-WIREFRAMES.md` - Dashboard layout
> - `docs/admin-panel/01-REQUIREMENTS.md` Section 2.2 - FR-DASH-001 to FR-DASH-004

### 3.1 Dashboard API Endpoints
> 📖 **Read First**: `docs/admin-panel/04-API-DESIGN.md` Section 3

- [ ] 3.1.1 Create `apps/api/src/api/v1/endpoints/dashboard.py`
- [ ] 3.1.2 Create `apps/api/src/schemas/dashboard.py`
- [ ] 3.1.3 Define `DashboardStatsResponse` schema
- [ ] 3.1.4 Implement `GET /dashboard/stats` endpoint
- [ ] 3.1.5 Query total protected groups count
- [ ] 3.1.6 Query total enforced channels count
- [ ] 3.1.7 Calculate verification counts (today, week, month, all_time)
- [ ] 3.1.8 Get bot uptime from metrics
- [ ] 3.1.9 Get cache hit rate from Redis stats
- [ ] 3.1.10 Define `ActivityResponse` schema
- [ ] 3.1.11 Implement `GET /dashboard/activity` endpoint
- [ ] 3.1.12 Query recent verification events
- [ ] 3.1.13 Query recent group protection events
- [ ] 3.1.14 Limit to 20 most recent
- [ ] 3.1.15 Register dashboard router

### 3.2 Dashboard Stats Cards
> 📖 **Read First**: `docs/admin-panel/05a-PAGE-WIREFRAMES.md`

- [ ] 3.2.1 Create `apps/web/src/components/dashboard/stats-card.tsx`
- [ ] 3.2.2 Props: title, value, icon, trend, description
- [ ] 3.2.3 Add trend indicator (up/down arrow with color)
- [ ] 3.2.4 Add loading skeleton variant
- [ ] 3.2.5 Create `apps/web/src/lib/api/endpoints/dashboard.ts`
- [ ] 3.2.6 Implement `getStats()` API call
- [ ] 3.2.7 Create `apps/web/src/lib/hooks/use-dashboard-stats.ts`
- [ ] 3.2.8 Use TanStack Query with 1-minute stale time

### 3.3 Activity Feed Component
- [ ] 3.3.1 Create `apps/web/src/components/dashboard/activity-feed.tsx`
- [ ] 3.3.2 Display event type icon
- [ ] 3.3.3 Display event description
- [ ] 3.3.4 Display relative timestamp (e.g., "5 minutes ago")
- [ ] 3.3.5 Add click handler to view details
- [ ] 3.3.6 Add loading skeleton
- [ ] 3.3.7 Implement `getActivity()` API call
- [ ] 3.3.8 Create `use-activity-feed` hook

### 3.4 Dashboard Page Assembly
- [ ] 3.4.1 Create `apps/web/src/app/(dashboard)/page.tsx`
- [ ] 3.4.2 Add page title and welcome message
- [ ] 3.4.3 Create 4-column stats grid
- [ ] 3.4.4 Add "Protected Groups" stat card
- [ ] 3.4.5 Add "Enforced Channels" stat card
- [ ] 3.4.6 Add "Verifications Today" stat card
- [ ] 3.4.7 Add "Success Rate" stat card
- [ ] 3.4.8 Add activity feed in 2-column layout
- [ ] 3.4.9 Add quick actions panel
- [ ] 3.4.10 Add loading states for all components
- [ ] 3.4.11 Add error boundary

---

## Phase 4: Groups CRUD (Week 3-4)

> 📖 **Phase Docs**: Read these docs before starting Phase 4:
> - `docs/admin-panel/04-API-DESIGN.md` Section 4 - Groups API endpoints
> - `docs/admin-panel/05a-PAGE-WIREFRAMES.md` - Groups page layout
> - `docs/admin-panel/01-REQUIREMENTS.md` Section 2.3 - FR-GROUP-001 to FR-GROUP-004

### 4.1 Groups API Endpoints
> 📖 **Read First**: `docs/admin-panel/04-API-DESIGN.md` Section 4

- [ ] 4.1.1 Create `apps/api/src/schemas/group.py`
- [ ] 4.1.2 Define `GroupListResponse` with pagination
- [ ] 4.1.3 Define `GroupDetailResponse` with linked channels
- [ ] 4.1.4 Define `GroupUpdateRequest` schema
- [ ] 4.1.5 Create `apps/api/src/services/group_service.py`
- [ ] 4.1.6 Implement `get_groups(page, per_page, search, status)` method
- [ ] 4.1.7 Implement `get_group(group_id)` method
- [ ] 4.1.8 Implement `update_group(group_id, data)` method
- [ ] 4.1.9 Create `apps/api/src/api/v1/endpoints/groups.py`
- [ ] 4.1.10 Implement `GET /groups` with pagination
- [ ] 4.1.11 Add search query parameter
- [ ] 4.1.12 Add status filter (active/inactive/all)
- [ ] 4.1.13 Add sort parameter
- [ ] 4.1.14 Implement `GET /groups/{id}` for details
- [ ] 4.1.15 Implement `PUT /groups/{id}` for updates
- [ ] 4.1.16 Implement `POST /groups/{id}/channels` for linking
- [ ] 4.1.17 Implement `DELETE /groups/{id}/channels/{channel_id}` for unlinking
- [ ] 4.1.18 Register groups router

### 4.2 Groups List Page
> 📖 **Read First**: `docs/admin-panel/05a-PAGE-WIREFRAMES.md`

- [ ] 4.2.1 Create `apps/web/src/components/tables/data-table.tsx` (generic)
- [ ] 4.2.2 Add column headers with sort indicators
- [ ] 4.2.3 Add pagination controls
- [ ] 4.2.4 Add search input
- [ ] 4.2.5 Add loading skeleton
- [ ] 4.2.6 Create `apps/web/src/components/tables/groups-table.tsx`
- [ ] 4.2.7 Define columns: Name, ID, Members, Channels, Status, Actions
- [ ] 4.2.8 Add row click handler for navigation
- [ ] 4.2.9 Add edit/delete action buttons
- [ ] 4.2.10 Create `apps/web/src/app/(dashboard)/groups/page.tsx`
- [ ] 4.2.11 Add page header with title
- [ ] 4.2.12 Add search bar
- [ ] 4.2.13 Add status filter dropdown
- [ ] 4.2.14 Integrate GroupsTable component

### 4.3 Group Details Page
- [ ] 4.3.1 Create `apps/web/src/app/(dashboard)/groups/[id]/page.tsx`
- [ ] 4.3.2 Fetch group details with linked channels
- [ ] 4.3.3 Display group metadata card
- [ ] 4.3.4 Display linked channels list
- [ ] 4.3.5 Add "Link Channel" button
- [ ] 4.3.6 Add "Unlink" action per channel
- [ ] 4.3.7 Display verification statistics
- [ ] 4.3.8 Create `apps/web/src/app/(dashboard)/groups/[id]/not-found.tsx`
- [ ] 4.3.9 Add loading state with skeleton
- [ ] 4.3.10 Add error state with retry button

### 4.4 Group Settings Form
- [ ] 4.4.1 Create `apps/web/src/components/forms/group-settings-form.tsx`
- [ ] 4.4.2 Add is_active toggle switch
- [ ] 4.4.3 Add welcome_message textarea
- [ ] 4.4.4 Add restriction_type select (mute/kick)
- [ ] 4.4.5 Add auto_kick_after_hours input
- [ ] 4.4.6 Add save button with loading state
- [ ] 4.4.7 Add cancel button
- [ ] 4.4.8 Integrate with react-hook-form
- [ ] 4.4.9 Add zod validation schema
- [ ] 4.4.10 Show success toast on save
- [ ] 4.4.11 Show error toast on failure

---

## Phase 5: Channels CRUD (Week 4)

> 📖 **Phase Docs**: Read these docs before starting Phase 5:
> - `docs/admin-panel/04-API-DESIGN.md` Section 5 - Channels API endpoints
> - `docs/admin-panel/05a-PAGE-WIREFRAMES.md` - Channels page layout
> - `docs/admin-panel/01-REQUIREMENTS.md` Section 2.4 - FR-CHAN-001 to FR-CHAN-003

### 5.1 Channels API Endpoints
> 📖 **Read First**: `docs/admin-panel/04-API-DESIGN.md` Section 5

- [ ] 5.1.1 Create `apps/api/src/schemas/channel.py`
- [ ] 5.1.2 Define `ChannelListResponse` with pagination
- [ ] 5.1.3 Define `ChannelDetailResponse` with linked groups
- [ ] 5.1.4 Define `ChannelCreateRequest` schema
- [ ] 5.1.5 Create `apps/api/src/services/channel_service.py`
- [ ] 5.1.6 Implement `get_channels(page, per_page, search)`
- [ ] 5.1.7 Implement `get_channel(channel_id)`
- [ ] 5.1.8 Implement `create_channel(data)`
- [ ] 5.1.9 Create `apps/api/src/api/v1/endpoints/channels.py`
- [ ] 5.1.10 Implement `GET /channels`
- [ ] 5.1.11 Implement `GET /channels/{id}`
- [ ] 5.1.12 Implement `POST /channels`
- [ ] 5.1.13 Register channels router

### 5.2 Channels List Page
- [ ] 5.2.1 Create `apps/web/src/components/tables/channels-table.tsx`
- [ ] 5.2.2 Define columns: Name, Username, Subscribers, Groups, Actions
- [ ] 5.2.3 Create `apps/web/src/app/(dashboard)/channels/page.tsx`
- [ ] 5.2.4 Add page header
- [ ] 5.2.5 Add "Add Channel" button
- [ ] 5.2.6 Integrate ChannelsTable component
- [ ] 5.2.7 Add search functionality

### 5.3 Channel Details Page
- [ ] 5.3.1 Create `apps/web/src/app/(dashboard)/channels/[id]/page.tsx`
- [ ] 5.3.2 Display channel metadata
- [ ] 5.3.3 Display linked groups list
- [ ] 5.3.4 Display verification statistics

### 5.4 Add Channel Dialog
- [ ] 5.4.1 Create `apps/web/src/components/forms/channel-form.tsx`
- [ ] 5.4.2 Add channel_id input or @username input
- [ ] 5.4.3 Validate bot has admin access
- [ ] 5.4.4 Show confirmation dialog
- [ ] 5.4.5 Handle success/error states

---

## Phase 6: Configuration Management (Week 4)

> 📖 **Phase Docs**: Read these docs before starting Phase 6:
> - `docs/admin-panel/04-API-DESIGN.md` Section 6 - Config API endpoints
> - `docs/admin-panel/05a-PAGE-WIREFRAMES.md` - Config page layout
> - `docs/admin-panel/01-REQUIREMENTS.md` Section 2.5 - FR-CONF-001 to FR-CONF-004

### 6.1 Config API Endpoints
> 📖 **Read First**: `docs/admin-panel/04-API-DESIGN.md` Section 6

- [ ] 6.1.1 Create `apps/api/src/schemas/config.py`
- [ ] 6.1.2 Define `ConfigResponse` schema
- [ ] 6.1.3 Define `ConfigUpdateRequest` schema
- [ ] 6.1.4 Create `apps/api/src/services/config_service.py`
- [ ] 6.1.5 Implement `get_config()` method
- [ ] 6.1.6 Mask sensitive values (tokens, passwords)
- [ ] 6.1.7 Implement `update_config(data)` method
- [ ] 6.1.8 Validate config values
- [ ] 6.1.9 Create `apps/api/src/api/v1/endpoints/config.py`
- [ ] 6.1.10 Implement `GET /config`
- [ ] 6.1.11 Implement `PUT /config`
- [ ] 6.1.12 Implement `POST /config/webhook/test`
- [ ] 6.1.13 Register config router

### 6.2 Config Page UI
- [ ] 6.2.1 Create `apps/web/src/app/(dashboard)/config/page.tsx`
- [ ] 6.2.2 Create tabbed interface (General, Messages, Webhook)
- [ ] 6.2.3 Create `apps/web/src/app/(dashboard)/config/general/page.tsx`
- [ ] 6.2.4 Add rate limit settings
- [ ] 6.2.5 Create `apps/web/src/app/(dashboard)/config/messages/page.tsx`
- [ ] 6.2.6 Add welcome message template editor
- [ ] 6.2.7 Add verification prompt template editor
- [ ] 6.2.8 Add template variable hints
- [ ] 6.2.9 Create `apps/web/src/app/(dashboard)/config/webhook/page.tsx`
- [ ] 6.2.10 Add webhook URL display
- [ ] 6.2.11 Add "Test Webhook" button
- [ ] 6.2.12 Show SSL certificate status

---

## Phase 7: Real-Time Logs (Week 5)

> 📖 **Phase Docs**: Read these docs before starting Phase 7:
> - `docs/admin-panel/04-API-DESIGN.md` Section 7 - WebSocket log streaming specification
> - `docs/admin-panel/05a-PAGE-WIREFRAMES.md` - Log viewer layout
> - `docs/admin-panel/02-ARCHITECTURE.md` Section 2 - WebSocket architecture
> - `docs/admin-panel/01-REQUIREMENTS.md` Section 2.6 - FR-LOG-001 to FR-LOG-004
> 📖 **Read First**: `docs/admin-panel/04-API-DESIGN.md` Section 7

- [ ] 7.1.1 Create `apps/api/src/api/websocket/__init__.py`
- [ ] 7.1.2 Create `apps/api/src/api/websocket/manager.py`
- [ ] 7.1.3 Implement ConnectionManager class
- [ ] 7.1.4 Handle connection registration
- [ ] 7.1.5 Handle connection removal
- [ ] 7.1.6 Implement broadcast to all connections
- [ ] 7.1.7 Implement broadcast to channel subscribers
- [ ] 7.1.8 Add authentication for WebSocket connections

### 7.2 Log Streaming Backend
- [ ] 7.2.1 Create `apps/api/src/api/websocket/handlers/logs.py`
- [ ] 7.2.2 Subscribe to Redis log pub/sub channel
- [ ] 7.2.3 Forward log entries to WebSocket clients
- [ ] 7.2.4 Handle filter subscriptions (level, group_id)
- [ ] 7.2.5 Create `apps/api/src/services/log_service.py`
- [ ] 7.2.6 Implement `get_historical_logs(filters)` method
- [ ] 7.2.7 Create `apps/api/src/api/v1/endpoints/logs.py`
- [ ] 7.2.8 Implement `GET /logs` REST endpoint
- [ ] 7.2.9 Add level filter parameter
- [ ] 7.2.10 Add time range parameters
- [ ] 7.2.11 Add search parameter
- [ ] 7.2.12 Register logs WebSocket route

### 7.3 Log Viewer Frontend
> 📖 **Read First**: `docs/admin-panel/05a-PAGE-WIREFRAMES.md`

- [ ] 7.3.1 Create `apps/web/src/lib/hooks/use-websocket.ts`
- [ ] 7.3.2 Handle connection lifecycle
- [ ] 7.3.3 Handle reconnection with backoff
- [ ] 7.3.4 Create `apps/web/src/stores/websocket-store.ts`
- [ ] 7.3.5 Store connection state
- [ ] 7.3.6 Store received log entries
- [ ] 7.3.7 Create `apps/web/src/components/logs/log-viewer.tsx`
- [ ] 7.3.8 Display log entries with color coding by level
- [ ] 7.3.9 Add auto-scroll toggle
- [ ] 7.3.10 Add pause/resume button
- [ ] 7.3.11 Add level filter dropdown
- [ ] 7.3.12 Add search input
- [ ] 7.3.13 Create `apps/web/src/app/(dashboard)/logs/page.tsx`
- [ ] 7.3.14 Integrate LogViewer component
- [ ] 7.3.15 Add export button (CSV, JSON)

---

## Phase 8: Database Browser (Week 5-6)

> 📖 **Phase Docs**: Read these docs before starting Phase 8:
> - `docs/admin-panel/04-API-DESIGN.md` Section 8 - Database browser endpoints
> - `docs/admin-panel/05a-PAGE-WIREFRAMES.md` - Database browser layout
> - `docs/admin-panel/01-REQUIREMENTS.md` Section 2.7 - FR-DB-001 to FR-DB-004

### 8.1 Database API Endpoints
> 📖 **Read First**: `docs/admin-panel/04-API-DESIGN.md` Section 8

- [ ] 8.1.1 Create `apps/api/src/schemas/database.py`
- [ ] 8.1.2 Define `TableListResponse` schema
- [ ] 8.1.3 Define `TableDataResponse` schema
- [ ] 8.1.4 Create `apps/api/src/services/db_service.py`
- [ ] 8.1.5 Implement `get_tables()` method
- [ ] 8.1.6 Get table names from information_schema
- [ ] 8.1.7 Get row counts per table
- [ ] 8.1.8 Implement `get_table_data(table, page, per_page)` method
- [ ] 8.1.9 Sanitize table name to prevent SQL injection
- [ ] 8.1.10 Return column metadata with types
- [ ] 8.1.11 Create `apps/api/src/api/v1/endpoints/database.py`
- [ ] 8.1.12 Implement `GET /database/tables`
- [ ] 8.1.13 Implement `GET /database/tables/{name}`
- [ ] 8.1.14 Implement `GET /database/tables/{name}/export`
- [ ] 8.1.15 Return CSV or JSON format
- [ ] 8.1.16 Implement `GET /database/migrations`
- [ ] 8.1.17 Register database router

### 8.2 Database Browser UI
- [ ] 8.2.1 Create `apps/web/src/app/(dashboard)/database/page.tsx`
- [ ] 8.2.2 Display table list sidebar
- [ ] 8.2.3 Show row count badges
- [ ] 8.2.4 Create `apps/web/src/app/(dashboard)/database/[table]/page.tsx`
- [ ] 8.2.5 Display table schema
- [ ] 8.2.6 Display data with pagination
- [ ] 8.2.7 Add column type indicators
- [ ] 8.2.8 Add export button

---

## Phase 9: Analytics (Week 6)

> 📖 **Phase Docs**: Read these docs before starting Phase 9:
> - `docs/admin-panel/04-API-DESIGN.md` Section 9 - Analytics endpoints
> - `docs/admin-panel/05a-PAGE-WIREFRAMES.md` - Analytics page layout with Recharts
> - `docs/admin-panel/01-REQUIREMENTS.md` Section 2.8 - FR-ANALYTICS-001 to FR-ANALYTICS-003

### 9.1 Analytics API Endpoints
> 📖 **Read First**: `docs/admin-panel/04-API-DESIGN.md` Section 9

- [ ] 9.1.1 Create `apps/api/src/schemas/analytics.py`
- [ ] 9.1.2 Define `UserGrowthResponse` schema
- [ ] 9.1.3 Define `VerificationTrendResponse` schema
- [ ] 9.1.4 Create `apps/api/src/services/analytics_service.py`
- [ ] 9.1.5 Implement `get_user_growth(period, granularity)` method
- [ ] 9.1.6 Implement `get_verification_trends(period, granularity)` method
- [ ] 9.1.7 Create `apps/api/src/api/v1/endpoints/analytics.py`
- [ ] 9.1.8 Implement `GET /analytics/users`
- [ ] 9.1.9 Implement `GET /analytics/verifications`
- [ ] 9.1.10 Register analytics router

### 9.2 Charts Components
- [ ] 9.2.1 Create `apps/web/src/components/charts/area-chart.tsx`
- [ ] 9.2.2 Create `apps/web/src/components/charts/bar-chart.tsx`
- [ ] 9.2.3 Create `apps/web/src/components/charts/line-chart.tsx`
- [ ] 9.2.4 Add responsive container
- [ ] 9.2.5 Add tooltip configuration
- [ ] 9.2.6 Add legend configuration

### 9.3 Analytics Page
- [ ] 9.3.1 Create `apps/web/src/app/(dashboard)/analytics/page.tsx`
- [ ] 9.3.2 Add date range picker
- [ ] 9.3.3 Add granularity selector (day/week/month)
- [ ] 9.3.4 Display user growth chart
- [ ] 9.3.5 Display verification trends chart
- [ ] 9.3.6 Display success rate chart
- [ ] 9.3.7 Add export data button

---

## Phase 10: Audit Logging (Week 7)

> 📖 **Phase Docs**: Read these docs before starting Phase 10:
> - `docs/admin-panel/02-ARCHITECTURE.md` Section 3.1 - Audit log schema
> - `docs/admin-panel/07-SECURITY.md` Section 9 - Audit trail requirements
> - `docs/admin-panel/01-REQUIREMENTS.md` Section 2.9 - FR-AUDIT-001 to FR-AUDIT-002

### 10.1 Audit Database & Service
> 📖 **Read First**: `docs/admin-panel/02-ARCHITECTURE.md` Section 3.1

- [ ] 10.1.1 Create `apps/api/src/models/admin_audit_log.py`
- [ ] 10.1.2 Define columns per architecture spec
- [ ] 10.1.3 Create Alembic migration
- [ ] 10.1.4 Apply migration
- [ ] 10.1.5 Create `apps/api/src/middleware/audit.py`
- [ ] 10.1.6 Intercept all state-changing requests
- [ ] 10.1.7 Log action, resource, old/new values
- [ ] 10.1.8 Log IP address and user agent
- [ ] 10.1.9 Create `apps/api/src/services/audit_service.py`
- [ ] 10.1.10 Implement `get_audit_logs(filters)` method

### 10.2 Audit API & UI
- [ ] 10.2.1 Create `apps/api/src/api/v1/endpoints/audit.py`
- [ ] 10.2.2 Implement `GET /audit` endpoint
- [ ] 10.2.3 Add filters: user, action, resource, date range
- [ ] 10.2.4 Register audit router
- [ ] 10.2.5 Create `apps/web/src/app/(dashboard)/settings/audit/page.tsx`
- [ ] 10.2.6 Display audit log table
- [ ] 10.2.7 Add filter controls

---

## Phase 11: Multi-Admin RBAC (Week 7-8)

> 📖 **Phase Docs**: Read these docs before starting Phase 11:
> - `docs/admin-panel/07-SECURITY.md` Section 3 - **CRITICAL**: Role hierarchy, permission matrix
> - `docs/admin-panel/01-REQUIREMENTS.md` Section 2.1 - FR-AUTH-004
> - `docs/admin-panel/04-API-DESIGN.md` - Admin management endpoints

### 11.1 RBAC Implementation
> 📖 **Read First**: `docs/admin-panel/07-SECURITY.md` Section 3

- [ ] 11.1.1 Create `apps/api/src/core/permissions.py`
- [ ] 11.1.2 Define Role enum (OWNER, ADMIN, VIEWER)
- [ ] 11.1.3 Define Permission enum
- [ ] 11.1.4 Create ROLE_PERMISSIONS mapping
- [ ] 11.1.5 Create `apps/api/src/api/v1/dependencies/permissions.py`
- [ ] 11.1.6 Create `require_permission(permission)` dependency
- [ ] 11.1.7 Check user role has permission
- [ ] 11.1.8 Raise 403 if denied
- [ ] 11.1.9 Apply to all endpoints per permission matrix

### 11.2 Admin Management API
- [ ] 11.2.1 Create `apps/api/src/schemas/admin.py`
- [ ] 11.2.2 Define `AdminCreateRequest` schema
- [ ] 11.2.3 Define `AdminUpdateRequest` schema
- [ ] 11.2.4 Create `apps/api/src/services/admin_service.py`
- [ ] 11.2.5 Implement `create_admin(data)` method
- [ ] 11.2.6 Implement `get_admins()` method
- [ ] 11.2.7 Implement `update_admin(id, data)` method
- [ ] 11.2.8 Implement `delete_admin(id)` method
- [ ] 11.2.9 Create `apps/api/src/api/v1/endpoints/admins.py`
- [ ] 11.2.10 Implement CRUD endpoints
- [ ] 11.2.11 Restrict to OWNER role only

### 11.3 Admin Management UI
- [ ] 11.3.1 Create `apps/web/src/app/(dashboard)/settings/admins/page.tsx`
- [ ] 11.3.2 Display admin users table
- [ ] 11.3.3 Add "Invite Admin" button
- [ ] 11.3.4 Add role assignment dropdown
- [ ] 11.3.5 Add deactivate/delete actions
- [ ] 11.3.6 Hide page from non-OWNER users

---

## Phase 12: Production Polish (Week 9-10)

> 📖 **Phase Docs**: Read these docs before starting Phase 12:
> - `docs/admin-panel/04a-ERROR-HANDLING.md` - RFC 9457, Structlog integration
> - `docs/admin-panel/07a-SECURITY-ADVANCED.md` - Infrastructure hardening, CSP, HSTS
> - `docs/admin-panel/08-DEPLOYMENT.md` - Production Docker, Caddy config
> - `docs/admin-panel/06-IMPLEMENTATION.md` Section 6 - Definition of Done

### 12.1 Error Handling
> 📖 **Read First**: `docs/admin-panel/04a-ERROR-HANDLING.md`

- [ ] 12.1.1 Create global exception handler for FastAPI
- [ ] 12.1.2 Format all errors as RFC 9457 Problem Details
- [ ] 12.1.3 Add trace_id to all error responses
- [ ] 12.1.4 Hide stack traces in production
- [ ] 12.1.5 Create React error boundary components
- [ ] 12.1.6 Add error page with retry button

### 12.2 Security Hardening
> 📖 **Read First**: `docs/admin-panel/07a-SECURITY-ADVANCED.md`

- [ ] 12.2.1 Add CORS middleware with strict origins
- [ ] 12.2.2 Add security headers middleware
- [ ] 12.2.3 Configure CSP headers
- [ ] 12.2.4 Configure HSTS headers
- [ ] 12.2.5 Add request ID middleware
- [ ] 12.2.6 Add request logging middleware
- [ ] 12.2.7 Run security audit

### 12.3 Performance Optimization
- [ ] 12.3.1 Add database query caching
- [ ] 12.3.2 Add response caching headers
- [ ] 12.3.3 Optimize bundle size
- [ ] 12.3.4 Run Lighthouse audit
- [ ] 12.3.5 Fix LCP issues (target < 2.5s)

### 12.4 Production Docker
> 📖 **Read First**: `docs/admin-panel/08-DEPLOYMENT.md`

- [ ] 12.4.1 Create `docker/production/Dockerfile.web` (multi-stage)
- [ ] 12.4.2 Create `docker/production/Dockerfile.api` (multi-stage)
- [ ] 12.4.3 Create `docker/compose/docker-compose.prod.yml`
- [ ] 12.4.4 Configure Caddy reverse proxy with auto-SSL
- [ ] 12.4.5 Configure health checks
- [ ] 12.4.6 Test full production stack locally

### 12.5 Documentation & Testing
- [ ] 12.5.1 Update README with setup instructions
- [ ] 12.5.2 Create CONTRIBUTING.md
- [ ] 12.5.3 Run all backend tests
- [ ] 12.5.4 Run all frontend tests
- [ ] 12.5.5 Run E2E tests with Playwright
- [ ] 12.5.6 Achieve 80%+ code coverage
- [ ] 12.5.7 Update memory bank with completion status

---

## Validation Checklist

Before marking complete:
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Pylint score >= 10.00
- [ ] ESLint passes with no errors
- [ ] TypeScript strict mode passes
- [ ] Security audit completed
- [ ] Performance targets met
- [ ] Documentation updated
