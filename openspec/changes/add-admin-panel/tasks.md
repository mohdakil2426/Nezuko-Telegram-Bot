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

- [x] 0.1.1 Create root `package.json` with workspaces configuration
- [x] 0.1.2 Create `pnpm-workspace.yaml` defining `apps/*` and `packages/*`
- [x] 0.1.3 Create `turbo.json` with build/dev/lint/test pipelines
- [x] 0.1.4 Create root `.gitignore` with node_modules, .next, __pycache__, .env
- [x] 0.1.5 Create root `.env.example` with all required variables
- [x] 0.1.6 Create root `.editorconfig` for consistent formatting
- [x] 0.1.7 Create root `.prettierrc` with project settings

### 0.2 Next.js Frontend Initialization
> 📖 **Read First**: `docs/admin-panel/03-TECH-STACK.md` Section 2.1

- [x] 0.2.1 Run `npx create-next-app@16 apps/web --typescript --tailwind --eslint --app --src-dir`
- [x] 0.2.2 Configure `next.config.ts` with Turbopack
- [x] 0.2.3 Update `tsconfig.json` with path aliases (`@/*`)
- [x] 0.2.4 Create `apps/web/src/app/globals.css` with Tailwind imports
- [x] 0.2.5 Install core dependencies: react-hook-form, zod, @hookform/resolvers
- [x] 0.2.6 Install UI dependencies: @radix-ui/react-*, lucide-react, class-variance-authority
- [x] 0.2.7 Install state dependencies: zustand, @tanstack/react-query
- [x] 0.2.8 Install chart dependency: recharts
- [x] 0.2.9 Initialize shadcn/ui with `npx shadcn@latest init`

### 0.3 FastAPI Backend Initialization
> 📖 **Read First**: `docs/admin-panel/03-TECH-STACK.md` Section 3.1

- [x] 0.3.1 Create `apps/api/` directory structure per `02a-FOLDER-STRUCTURE.md`
- [x] 0.3.2 Create `apps/api/pyproject.toml` with project configuration
- [x] 0.3.3 Create `apps/api/requirements.txt` with pinned dependencies
- [x] 0.3.4 Create `apps/api/requirements-dev.txt` with test/lint deps
- [x] 0.3.5 Create `apps/api/src/__init__.py`
- [x] 0.3.6 Create `apps/api/src/main.py` with FastAPI app initialization
- [x] 0.3.7 Create `apps/api/src/core/__init__.py`
- [x] 0.3.8 Create `apps/api/src/core/config.py` with Pydantic BaseSettings
- [x] 0.3.9 Create `apps/api/ruff.toml` with linting configuration (via pyproject.toml)
- [x] 0.3.10 Create `apps/api/pytest.ini` with test configuration

### 0.4 Shared Packages Setup
> 📖 **Read First**: `docs/admin-panel/02a-FOLDER-STRUCTURE.md` Section 4

- [x] 0.4.1 Create `packages/types/package.json`
- [x] 0.4.2 Create `packages/types/tsconfig.json`
- [x] 0.4.3 Create `packages/types/src/index.ts` with base exports
- [x] 0.4.4 Create `packages/types/src/api.ts` with API response types
- [x] 0.4.5 Create `packages/types/src/models/` directory (group, channel, user types)
- [x] 0.4.6 Create `packages/config/package.json`
- [x] 0.4.7 Create `packages/config/eslint/base.js`
- [x] 0.4.8 Create `packages/config/typescript/base.json`

### 0.5 Docker Development Environment
> 📖 **Read First**: `docs/admin-panel/08-DEPLOYMENT.md`

- [x] 0.5.1 Create `docker/development/` directory
- [x] 0.5.2 Create `docker/development/Dockerfile.web` for Next.js dev
- [x] 0.5.3 Create `docker/development/Dockerfile.api` for FastAPI dev
- [x] 0.5.4 Create `docker/compose/docker-compose.dev.yml` with all services
- [x] 0.5.5 Configure PostgreSQL service with volume persistence
- [x] 0.5.6 Configure Redis service with volume persistence
- [x] 0.5.7 Configure hot-reload volumes for web and api
- [x] 0.5.8 Create `docker/compose/.env.example` for Docker secrets
- [x] 0.5.9 Test `docker compose up` starts all services successfully
- [x] 0.5.10 Verify hot-reload works for both frontend and backend

### 0.6 CI/CD Pipeline
- [x] 0.6.1 Create `.github/workflows/admin-panel-ci.yml`
- [x] 0.6.2 Add job: Install dependencies (pnpm + pip)
- [x] 0.6.3 Add job: Lint frontend (ESLint)
- [x] 0.6.4 Add job: Lint backend (Ruff)
- [x] 0.6.5 Add job: Type check frontend (tsc --noEmit)
- [x] 0.6.6 Add job: Type check backend (mypy)
- [x] 0.6.7 Add job: Test frontend (vitest)
- [x] 0.6.8 Add job: Test backend (pytest)
- [x] 0.6.9 Add job: Build frontend (next build)
- [x] 0.6.10 Configure caching for pnpm and pip

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

- [x] 1.1.1 Create `apps/api/src/models/__init__.py`
- [x] 1.1.2 Create `apps/api/src/models/base.py` with DeclarativeBase
- [x] 1.1.3 Create `apps/api/src/models/admin_user.py` with AdminUser model
- [x] 1.1.4 Define columns: id (UUID), email, password_hash, full_name, role
- [x] 1.1.5 Define columns: is_active, telegram_id, created_at, updated_at, last_login
- [x] 1.1.6 Add email unique constraint
- [x] 1.1.7 Add telegram_id unique constraint
- [x] 1.1.8 Create `apps/api/src/models/admin_session.py` with AdminSession model
- [x] 1.1.9 Define columns: id, user_id (FK), refresh_token, ip_address, user_agent
- [x] 1.1.10 Define columns: expires_at, created_at
- [x] 1.1.11 Add refresh_token unique constraint
- [x] 1.1.12 Add foreign key to admin_users with CASCADE delete

### 1.2 Database - Connection & Migrations
> 📖 **Read First**: `docs/admin-panel/03-TECH-STACK.md` Section 3.2

- [x] 1.2.1 Create `apps/api/src/core/database.py`
- [x] 1.2.2 Configure async engine with asyncpg driver
- [x] 1.2.3 Configure connection pool (20 connections, 10 overflow)
- [x] 1.2.4 Create async session factory
- [x] 1.2.5 Create `get_session` dependency for FastAPI
- [x] 1.2.6 Create `apps/api/alembic.ini`
- [x] 1.2.7 Create `apps/api/alembic/env.py` with async support
- [x] 1.2.8 Create `apps/api/alembic/script.py.mako` template
- [x] 1.2.9 Run `alembic revision --autogenerate -m "add_admin_users"`
- [x] 1.2.10 Verify migration script is correct
- [x] 1.2.11 Run `alembic upgrade head` to apply migration

### 1.3 Password Security
> 📖 **Read First**: `docs/admin-panel/07-SECURITY.md` Section 2.1

- [x] 1.3.1 Create `apps/api/src/core/security.py`
- [x] 1.3.2 Configure passlib CryptContext with argon2
- [x] 1.3.3 Set argon2__memory_cost=65536 (64 MiB)
- [x] 1.3.4 Set argon2__time_cost=3 (iterations)
- [x] 1.3.5 Set argon2__parallelism=4 (threads)
- [x] 1.3.6 Create `hash_password(password: str) -> str` function
- [x] 1.3.7 Create `verify_password(plain: str, hashed: str) -> bool` function
- [x] 1.3.8 Write unit test for password hashing
- [x] 1.3.9 Write unit test for password verification
- [x] 1.3.10 Verify Argon2id is used (not Argon2i or Argon2d)

### 1.4 JWT Token Management
> 📖 **Read First**: `docs/admin-panel/07-SECURITY.md` Section 2.2

- [x] 1.4.1 Generate ES256 key pair: `openssl ecparam -genkey -name prime256v1 -out jwt-private.pem`
- [x] 1.4.2 Extract public key: `openssl ec -in jwt-private.pem -pubout -out jwt-public.pem`
- [x] 1.4.3 Add JWT_PRIVATE_KEY_PATH to config
- [x] 1.4.4 Add JWT_PUBLIC_KEY_PATH to config
- [x] 1.4.5 Create `create_access_token(user_id: str, role: str) -> str` function
- [x] 1.4.6 Set access token expiry to 15 minutes
- [x] 1.4.7 Include claims: sub, iss, aud, exp, nbf, iat, role, session_id
- [x] 1.4.8 Create `create_refresh_token(user_id: str) -> str` function
- [x] 1.4.9 Set refresh token expiry to 7 days
- [x] 1.4.10 Create `decode_token(token: str) -> dict` function
- [x] 1.4.11 Validate algorithm is ES256 only (reject none, HS256)
- [x] 1.4.12 Validate issuer and audience claims
- [x] 1.4.13 Write unit tests for token creation
- [x] 1.4.14 Write unit tests for token validation
- [x] 1.4.15 Write unit test for expired token rejection

### 1.5 Auth Schemas (Pydantic)
> 📖 **Read First**: `docs/admin-panel/04-API-DESIGN.md` Section 2

- [x] 1.5.1 Create `apps/api/src/schemas/__init__.py`
- [x] 1.5.2 Create `apps/api/src/schemas/base.py` with SuccessResponse, ErrorResponse
- [x] 1.5.3 Create `apps/api/src/schemas/auth.py`
- [x] 1.5.4 Define `LoginRequest` schema (email: EmailStr, password: str)
- [x] 1.5.5 Add password validation: min 12 chars, upper, lower, number
- [x] 1.5.6 Define `LoginResponse` schema (access_token, refresh_token, expires_in, user)
- [x] 1.5.7 Define `RefreshRequest` schema (refresh_token: str)
- [x] 1.5.8 Define `RefreshResponse` schema (access_token, expires_in)
- [x] 1.5.9 Define `UserResponse` schema (id, email, full_name, role, created_at, last_login)
- [x] 1.5.10 Add `extra = "forbid"` to reject unknown fields

### 1.6 Auth Service Layer
- [x] 1.6.1 Create `apps/api/src/services/__init__.py`
- [x] 1.6.2 Create `apps/api/src/services/auth_service.py`
- [x] 1.6.3 Create `authenticate_user(email: str, password: str) -> AdminUser | None`
- [x] 1.6.4 Query user by email
- [x] 1.6.5 Verify password with Argon2id
- [x] 1.6.6 Update last_login timestamp on success
- [x] 1.6.7 Create `create_session(user_id: str, ip: str, user_agent: str) -> AdminSession`
- [x] 1.6.8 Store refresh token hash in database
- [x] 1.6.9 Create `revoke_session(refresh_token: str) -> bool`
- [x] 1.6.10 Create `refresh_session(refresh_token: str) -> tuple[str, str]`
- [x] 1.6.11 Implement token rotation (invalidate old, create new)
- [x] 1.6.12 Detect token reuse (security: revoke all user sessions)

### 1.7 Auth API Endpoints
> 📖 **Read First**: `docs/admin-panel/04-API-DESIGN.md` Section 2

- [x] 1.7.1 Create `apps/api/src/api/__init__.py`
- [x] 1.7.2 Create `apps/api/src/api/v1/__init__.py`
- [x] 1.7.3 Create `apps/api/src/api/v1/router.py` (main v1 router)
- [x] 1.7.4 Create `apps/api/src/api/v1/endpoints/__init__.py`
- [x] 1.7.5 Create `apps/api/src/api/v1/endpoints/auth.py`
- [x] 1.7.6 Implement `POST /auth/login` endpoint
- [x] 1.7.7 Return JWT tokens on success
- [x] 1.7.8 Return 401 on invalid credentials
- [x] 1.7.9 Implement `POST /auth/refresh` endpoint
- [x] 1.7.10 Validate refresh token
- [x] 1.7.11 Return new access + refresh tokens
- [x] 1.7.12 Implement `POST /auth/logout` endpoint
- [x] 1.7.13 Revoke session in database
- [x] 1.7.14 Return 204 No Content
- [x] 1.7.15 Implement `GET /auth/me` endpoint
- [x] 1.7.16 Return current user info
- [x] 1.7.17 Register auth router in main v1 router

### 1.8 Auth Middleware & Dependencies
> 📖 **Read First**: `docs/admin-panel/07-SECURITY.md` Section 2.2

- [x] 1.8.1 Create `apps/api/src/api/v1/dependencies/__init__.py`
- [x] 1.8.2 Create `apps/api/src/api/v1/dependencies/auth.py`
- [x] 1.8.3 Create `get_current_user` dependency
- [x] 1.8.4 Extract Bearer token from Authorization header
- [x] 1.8.5 Decode and validate JWT
- [x] 1.8.6 Check session is not revoked
- [x] 1.8.7 Return user payload
- [x] 1.8.8 Raise 401 if token invalid/expired
- [x] 1.8.9 Create `get_current_active_user` dependency
- [x] 1.8.10 Check user.is_active == True
- [x] 1.8.11 Raise 403 if user disabled

### 1.9 Rate Limiting for Auth
> 📖 **Read First**: `docs/admin-panel/07-SECURITY.md` Section 4.1

- [x] 1.9.1 Install slowapi: `pip install slowapi`
- [x] 1.9.2 Create `apps/api/src/middleware/__init__.py`
- [x] 1.9.3 Create `apps/api/src/middleware/rate_limit.py`
- [x] 1.9.4 Configure Redis-backed rate limiter
- [x] 1.9.5 Set login endpoint limit: 5 requests per 15 minutes
- [x] 1.9.6 Set refresh endpoint limit: 10 requests per hour
- [x] 1.9.7 Apply rate limit decorators to auth endpoints
- [x] 1.9.8 Add X-RateLimit-* response headers
- [x] 1.9.9 Return 429 with Retry-After header when exceeded

### 1.10 Auth Integration Tests
- [x] 1.10.1 Create `apps/api/tests/__init__.py`
- [x] 1.10.2 Create `apps/api/tests/conftest.py` with test fixtures
- [x] 1.10.3 Create test database fixture
- [x] 1.10.4 Create test client fixture
- [x] 1.10.5 Create `apps/api/tests/integration/test_auth.py`
- [x] 1.10.6 Test: Login with valid credentials returns tokens
- [x] 1.10.7 Test: Login with invalid email returns 401
- [x] 1.10.8 Test: Login with wrong password returns 401
- [x] 1.10.9 Test: Refresh with valid token returns new tokens
- [x] 1.10.10 Test: Refresh with expired token returns 401
- [x] 1.10.11 Test: Logout invalidates session
- [x] 1.10.12 Test: /me returns current user
- [x] 1.10.13 Test: Rate limiting blocks excessive login attempts

---

## Phase 2: Frontend Auth & Layout (Week 2-3)

> 📖 **Phase Docs**: Read these docs before starting Phase 2:
> - `docs/admin-panel/05-UI-WIREFRAMES.md` - Design system, colors, typography
> - `docs/admin-panel/05a-PAGE-WIREFRAMES.md` - Page component layouts
> - `docs/admin-panel/02a-FOLDER-STRUCTURE.md` Section 2 - Frontend folder structure
> - `docs/admin-panel/03-TECH-STACK.md` Section 2 - shadcn/ui, Tailwind CSS 4, TanStack Query

### 2.1 Base Layout Components
> 📖 **Read First**: `docs/admin-panel/05-UI-WIREFRAMES.md`

- [x] 2.1.1 Create `apps/web/src/components/layout/sidebar.tsx`
- [x] 2.1.2 Create sidebar navigation items array
- [x] 2.1.3 Add Dashboard, Groups, Channels, Config, Logs, Database, Analytics links
- [x] 2.1.4 Add active state styling
- [x] 2.1.5 Add collapsed/expanded toggle
- [x] 2.1.6 Create `apps/web/src/components/layout/header.tsx`
- [x] 2.1.7 Add user avatar dropdown
- [x] 2.1.8 Add theme toggle (dark/light)
- [x] 2.1.9 Add logout button
- [x] 2.1.10 Create `apps/web/src/components/layout/footer.tsx`
- [x] 2.1.11 Add version and copyright

### 2.2 shadcn/ui Component Installation
> 📖 **Read First**: `docs/admin-panel/03-TECH-STACK.md` Section 2.2

- [x] 2.2.1 Install button: `npx shadcn add button`
- [x] 2.2.2 Install card: `npx shadcn add card`
- [x] 2.2.3 Install input: `npx shadcn add input`
- [x] 2.2.4 Install label: `npx shadcn add label`
- [x] 2.2.5 Install form: `npx shadcn add form`
- [x] 2.2.6 Install toast: `npx shadcn add toast`
- [x] 2.2.7 Install dropdown-menu: `npx shadcn add dropdown-menu`
- [x] 2.2.8 Install avatar: `npx shadcn add avatar`
- [x] 2.2.9 Install table: `npx shadcn add table`
- [x] 2.2.10 Install dialog: `npx shadcn add dialog`
- [x] 2.2.11 Install sheet: `npx shadcn add sheet`
- [x] 2.2.12 Install skeleton: `npx shadcn add skeleton`
- [x] 2.2.1 Install button: `npx shadcn add button`
- [x] 2.2.2 Install card: `npx shadcn add card`
- [x] 2.2.3 Install input: `npx shadcn add input`
- [x] 2.2.4 Install label: `npx shadcn add label`
- [x] 2.2.5 Install form: `npx shadcn add form`
- [x] 2.2.6 Install toast: `npx shadcn add toast`
- [x] 2.2.7 Install dropdown-menu: `npx shadcn add dropdown-menu`
- [x] 2.2.8 Install avatar: `npx shadcn add avatar`
- [x] 2.2.9 Install table: `npx shadcn add table`
- [x] 2.2.10 Install dialog: `npx shadcn add dialog`
- [x] 2.2.11 Install sheet: `npx shadcn add sheet`
- [x] 2.2.12 Install skeleton: `npx shadcn add skeleton`

### 2.3 Auth Store (Zustand)
> 📖 **Read First**: `docs/admin-panel/02a-FOLDER-STRUCTURE.md` Section 2

- [x] 2.1.1 Create `apps/web/src/stores/auth-store.ts` (Zustand)
- [x] 2.1.2 Define `AuthState`: user, token, isAuthenticated
- [x] 2.1.3 Implement `persist` middleware for session survival
- [x] 2.1.4 Create `login` action to set state
- [x] 2.1.5 Create `logout` action to clear state
- [x] 2.1.6 Create `api/client.ts` with interceptors
- [x] 2.1.7 Inject Bearer token from store into requests
- [x] 2.1.8 Handle 401 Unauthorized (auto-logout/refresh)
- [x] 2.1.9 Create `AuthProvider` for session verification on mount
- [x] 2.1.10 Create `useAuth` hook for componentsed, theme

### 2.4 API Client Setup
> 📖 **Read First**: `docs/admin-panel/04-API-DESIGN.md` Section 1

- [x] 2.4.1 Create `apps/web/src/lib/api/client.ts`
- [x] 2.4.2 Configure base URL from environment variable
- [x] 2.4.3 Add Authorization header interceptor
- [x] 2.4.4 Add 401 response interceptor for token refresh
- [x] 2.4.5 Create `apps/web/src/lib/api/endpoints/auth.ts`
- [x] 2.4.6 Implement `login(email, password)` API call
- [x] 2.4.7 Implement `refresh(refreshToken)` API call
- [x] 2.4.8 Implement `logout()` API call
- [x] 2.4.9 Implement `getMe()` API call

### 2.5 Login Page UI
> 📖 **Read First**: `docs/admin-panel/05a-PAGE-WIREFRAMES.md`

- [x] 2.5.1 Create `apps/web/src/app/(auth)/layout.tsx` (minimal layout)
- [x] 2.5.2 Create `apps/web/src/app/(auth)/login/page.tsx`
- [x] 2.5.3 Create centered card layout
- [x] 2.5.4 Add Nezuko logo/branding
- [x] 2.5.5 Create `apps/web/src/components/forms/login-form.tsx`
- [x] 2.5.6 Add email input with validation
- [x] 2.5.7 Add password input with show/hide toggle
- [x] 2.5.8 Add "Remember me" checkbox
- [x] 2.5.9 Add submit button with loading state
- [x] 2.5.10 Add "Forgot password?" link (placeholder)
- [x] 2.5.11 Integrate with react-hook-form
- [x] 2.5.12 Add zod schema validation
- [x] 2.5.13 Connect to auth store login action
- [x] 2.5.14 Show error toast on failed login
- [x] 2.5.15 Redirect to dashboard on success

### 2.6 Auth Provider & Protection
- [x] 2.3.1 Install shadcn/ui components: sidebar, button, card, input
- [x] 2.3.2 Create `apps/web/src/components/layout/sidebar.tsx`
- [x] 2.3.3 Implement collapsible navigation menu
- [x] 2.3.4 Create `apps/web/src/components/layout/header.tsx`
- [x] 2.3.5 Add user profile dropdown with Logout button
- [x] 2.3.6 Create `apps/web/src/components/layout/dashboard-layout.tsx`
- [x] 2.3.7 Setup route groups: `(dashboard)` vs `(auth)`
- [x] 2.3.8 Add Theme Toggle (Dark/Light mode)
- [x] 2.3.9 Ensure responsive design (mobile hamburger menu)th

### 2.7 Theme Provider
- [x] 2.7.1 Create `apps/web/src/providers/theme-provider.tsx`
- [x] 2.7.2 Use next-themes for dark/light mode
- [x] 2.7.3 Persist theme preference in localStorage
- [x] 2.7.4 Add system preference detection
- [x] 2.7.5 Configure Tailwind dark mode classes

### 2.8 Query Provider (TanStack Query)
- [x] 2.8.1 Create `apps/web/src/providers/query-provider.tsx`
- [x] 2.8.2 Configure QueryClient with defaults
- [x] 2.8.3 Set staleTime to 5 minutes
- [x] 2.8.4 Set refetchOnWindowFocus to true
- [x] 2.8.5 Add to root layout providers

---

## Phase 3: Dashboard Page (Week 3)

> 📖 **Phase Docs**: Read these docs before starting Phase 3:
> - `docs/admin-panel/04-API-DESIGN.md` Section 3 - Dashboard endpoints
> - `docs/admin-panel/05a-PAGE-WIREFRAMES.md` - Dashboard layout
> - `docs/admin-panel/01-REQUIREMENTS.md` Section 2.2 - FR-DASH-001 to FR-DASH-004

### 3.1 Dashboard API Endpoints
> 📖 **Read First**: `docs/admin-panel/04-API-DESIGN.md` Section 3

- [x] 3.1.1 Create `apps/api/src/api/v1/endpoints/dashboard.py`
- [x] 3.1.2 Create `apps/api/src/schemas/dashboard.py`
- [x] 3.1.3 Define `DashboardStatsResponse` schema
- [x] 3.1.4 Implement `GET /dashboard/stats` endpoint
- [x] 3.1.5 Query total protected groups count
- [x] 3.1.6 Query total enforced channels count
- [x] 3.1.7 Calculate verification counts (today, week, month, all_time)
- [x] 3.1.8 Get bot uptime from metrics
- [x] 3.1.9 Get cache hit rate from Redis stats
- [x] 3.1.10 Define `ActivityResponse` schema
- [x] 3.1.11 Implement `GET /dashboard/activity` endpoint
- [x] 3.1.12 Query recent verification events
- [x] 3.1.13 Query recent group protection events
- [x] 3.1.14 Limit to 20 most recent
- [x] 3.1.15 Register dashboard router

### 3.2 Dashboard Stats Cards
> 📖 **Read First**: `docs/admin-panel/05a-PAGE-WIREFRAMES.md`

- [x] 3.2.1 Create `apps/web/src/components/dashboard/stats-card.tsx`
- [x] 3.2.2 Props: title, value, icon, trend, description
- [x] 3.2.3 Add trend indicator (up/down arrow with color)
- [x] 3.2.4 Add loading skeleton variant
- [x] 3.2.5 Create `apps/web/src/lib/api/endpoints/dashboard.ts`
- [x] 3.2.6 Implement `getStats()` API call
- [x] 3.2.7 Create `apps/web/src/lib/hooks/use-dashboard-stats.ts`
- [x] 3.2.8 Use TanStack Query with 1-minute stale time

### 3.3 Activity Feed Component
- [x] 3.3.1 Create `apps/web/src/components/dashboard/activity-feed.tsx`
- [x] 3.3.2 Display event type icon
- [x] 3.3.3 Display event description
- [x] 3.3.4 Display relative timestamp (e.g., "5 minutes ago")
- [x] 3.3.5 Add click handler to view details
- [x] 3.3.6 Add loading skeleton
- [x] 3.3.7 Implement `getActivity()` API call
- [x] 3.3.8 Create `use-activity-feed` hook

### 3.4 Dashboard Page Assembly
- [x] 3.4.1 Create `apps/web/src/app/(dashboard)/page.tsx`
- [x] 3.4.2 Add page title and welcome message
- [x] 3.4.3 Create 4-column stats grid
- [x] 3.4.4 Add "Protected Groups" stat card
- [x] 3.4.5 Add "Enforced Channels" stat card
- [x] 3.4.6 Add "Verifications Today" stat card
- [x] 3.4.7 Add "Success Rate" stat card
- [x] 3.4.8 Add activity feed in 2-column layout
- [x] 3.4.9 Add quick actions panel
- [x] 3.4.10 Add loading states for all components
- [x] 3.4.11 Add error boundary

---

## Phase 4: Groups CRUD (Week 3-4)

> 📖 **Phase Docs**: Read these docs before starting Phase 4:
> - `docs/admin-panel/04-API-DESIGN.md` Section 4 - Groups API endpoints
> - `docs/admin-panel/05a-PAGE-WIREFRAMES.md` - Groups page layout
> - `docs/admin-panel/01-REQUIREMENTS.md` Section 2.3 - FR-GROUP-001 to FR-GROUP-004

### 4.1 Groups API Endpoints
> 📖 **Read First**: `docs/admin-panel/04-API-DESIGN.md` Section 4

- [x] 4.1.1 Create `apps/api/src/schemas/group.py`
- [x] 4.1.2 Define `GroupListResponse` with pagination
- [x] 4.1.3 Define `GroupDetailResponse` with linked channels
- [x] 4.1.4 Define `GroupUpdateRequest` schema
- [x] 4.1.5 Create `apps/api/src/services/group_service.py`
- [x] 4.1.6 Implement `get_groups(page, per_page, search, status)` method
- [x] 4.1.7 Implement `get_group(group_id)` method
- [x] 4.1.8 Implement `update_group(group_id, data)` method
- [x] 4.1.9 Create `apps/api/src/api/v1/endpoints/groups.py`
- [x] 4.1.10 Implement `GET /groups` with pagination
- [x] 4.1.11 Add search query parameter
- [x] 4.1.12 Add status filter (active/inactive/all)
- [x] 4.1.13 Add sort parameter
- [x] 4.1.14 Implement `GET /groups/{id}` for details
- [x] 4.1.15 Implement `PUT /groups/{id}` for updates
- [x] 4.1.16 Implement `POST /groups/{id}/channels` for linking
- [x] 4.1.17 Implement `DELETE /groups/{id}/channels/{channel_id}` for unlinking
- [x] 4.1.18 Register groups router

### 4.2 Groups List Page
> 📖 **Read First**: `docs/admin-panel/05a-PAGE-WIREFRAMES.md`

- [x] 4.2.1 Create `apps/web/src/components/tables/data-table.tsx` (generic)
- [x] 4.2.2 Add column headers with sort indicators
- [x] 4.2.3 Add pagination controls
- [x] 4.2.4 Add search input
- [x] 4.2.5 Add loading skeleton
- [x] 4.2.6 Create `apps/web/src/components/tables/groups-table.tsx`
- [x] 4.2.7 Define columns: Name, ID, Members, Channels, Status, Actions
- [x] 4.2.8 Add row click handler for navigation
- [x] 4.2.9 Add edit/delete action buttons
- [x] 4.2.10 Create `apps/web/src/app/(dashboard)/groups/page.tsx`
- [x] 4.2.11 Add page header with title
- [x] 4.2.12 Add search bar
- [x] 4.2.13 Add status filter dropdown
- [x] 4.2.14 Integrate GroupsTable component

### 4.3 Group Details Page
- [x] 4.3.1 Create `apps/web/src/app/(dashboard)/groups/[id]/page.tsx`
- [x] 4.3.2 Fetch group details with linked channels
- [x] 4.3.3 Display group metadata card
- [x] 4.3.4 Display linked channels list
- [x] 4.3.5 Add "Link Channel" button
- [x] 4.3.6 Add "Unlink" action per channel
- [x] 4.3.7 Display verification statistics
- [x] 4.3.8 Create `apps/web/src/app/(dashboard)/groups/[id]/not-found.tsx`
- [x] 4.3.9 Add loading state with skeleton
- [x] 4.3.10 Add error state with retry button

### 4.4 Group Settings Form
- [x] 4.4.1 Create `apps/web/src/components/forms/group-settings-form.tsx`
- [x] 4.4.2 Add is_active toggle switch
- [x] 4.4.3 Add welcome_message textarea
- [x] 4.4.4 Add restriction_type select (mute/kick)
- [x] 4.4.5 Add auto_kick_after_hours input
- [x] 4.4.6 Add save button with loading state
- [x] 4.4.7 Add cancel button
- [x] 4.4.8 Integrate with react-hook-form
- [x] 4.4.9 Add zod validation schema
- [x] 4.4.10 Show success toast on save
- [x] 4.4.11 Show error toast on failure

---

## Phase 5: Channels CRUD (Week 4)

> 📖 **Phase Docs**: Read these docs before starting Phase 5:
> - `docs/admin-panel/04-API-DESIGN.md` Section 5 - Channels API endpoints
> - `docs/admin-panel/05a-PAGE-WIREFRAMES.md` - Channels page layout
> - `docs/admin-panel/01-REQUIREMENTS.md` Section 2.4 - FR-CHAN-001 to FR-CHAN-003

### 5.1 Channels API Endpoints
> 📖 **Read First**: `docs/admin-panel/04-API-DESIGN.md` Section 5

- [x] 5.1.1 Create `apps/api/src/schemas/channel.py`
- [x] 5.1.2 Define `ChannelListResponse` with pagination
- [x] 5.1.3 Define `ChannelDetailResponse` with linked groups
- [x] 5.1.4 Define `ChannelCreateRequest` schema
- [x] 5.1.5 Create `apps/api/src/services/channel_service.py`
- [x] 5.1.6 Implement `get_channels(page, per_page, search)`
- [x] 5.1.7 Implement `get_channel(channel_id)`
- [x] 5.1.8 Implement `create_channel(data)`
- [x] 5.1.9 Create `apps/api/src/api/v1/endpoints/channels.py`
- [x] 5.1.10 Implement `GET /channels`
- [x] 5.1.11 Implement `GET /channels/{id}`
- [x] 5.1.12 Implement `POST /channels`
- [x] 5.1.13 Register channels router

### 5.2 Channels List Page
- [x] 5.2.1 Create `apps/web/src/components/tables/channels-table.tsx`
- [x] 5.2.2 Define columns: Name, Username, Subscribers, Groups, Actions
- [x] 5.2.3 Create `apps/web/src/app/(dashboard)/channels/page.tsx`
- [x] 5.2.4 Add page header
- [x] 5.2.5 Add "Add Channel" button
- [x] 5.2.6 Integrate ChannelsTable component
- [x] 5.2.7 Add search functionality

### 5.3 Channel Details Page
- [x] 5.3.1 Create `apps/web/src/app/(dashboard)/channels/[id]/page.tsx`
- [x] 5.3.2 Display channel metadata
- [x] 5.3.3 Display linked groups list
- [x] 5.3.4 Display verification statistics

### 5.4 Add Channel Dialog
- [x] 5.4.1 Create `apps/web/src/components/forms/channel-form.tsx`
- [x] 5.4.2 Add channel_id input or @username input
- [x] 5.4.3 Validate bot has admin access
- [x] 5.4.4 Show confirmation dialog
- [x] 5.4.5 Handle success/error states

---

## Phase 6: Configuration Management (Week 4)

> 📖 **Phase Docs**: Read these docs before starting Phase 6:
> - `docs/admin-panel/04-API-DESIGN.md` Section 6 - Config API endpoints
> - `docs/admin-panel/05a-PAGE-WIREFRAMES.md` - Config page layout
> - `docs/admin-panel/01-REQUIREMENTS.md` Section 2.5 - FR-CONF-001 to FR-CONF-004

### 6.1 Config API Endpoints
> 📖 **Read First**: `docs/admin-panel/04-API-DESIGN.md` Section 6

- [x] 6.1.1 Create `apps/api/src/schemas/config.py`
- [x] 6.1.2 Define `ConfigResponse` schema
- [x] 6.1.3 Define `ConfigUpdateRequest` schema
- [x] 6.1.4 Create `apps/api/src/services/config_service.py`
- [x] 6.1.5 Implement `get_config()` method
- [x] 6.1.6 Mask sensitive values (tokens, passwords)
- [x] 6.1.7 Implement `update_config(data)` method
- [x] 6.1.8 Validate config values
- [x] 6.1.9 Create `apps/api/src/api/v1/endpoints/config.py`
- [x] 6.1.10 Implement `GET /config`
- [x] 6.1.11 Implement `PUT /config`
- [x] 6.1.12 Implement `POST /config/webhook/test`
- [x] 6.1.13 Register config router

### 6.2 Config Page UI
- [x] 6.2.1 Create `apps/web/src/app/(dashboard)/config/page.tsx`
- [x] 6.2.2 Create tabbed interface (General, Messages, Webhook)
- [x] 6.2.3 Create `apps/web/src/app/(dashboard)/config/general/page.tsx`
- [x] 6.2.4 Add rate limit settings
- [x] 6.2.5 Create `apps/web/src/app/(dashboard)/config/messages/page.tsx`
- [x] 6.2.6 Add welcome message template editor
- [x] 6.2.7 Add verification prompt template editor
- [x] 6.2.8 Add template variable hints
- [x] 6.2.9 Create `apps/web/src/app/(dashboard)/config/webhook/page.tsx`
- [x] 6.2.10 Add webhook URL display
- [x] 6.2.11 Add "Test Webhook" button
- [x] 6.2.12 Show SSL certificate status

---

## Phase 7: Real-Time Logs (Week 5)

> 📖 **Phase Docs**: Read these docs before starting Phase 7:
> - `docs/admin-panel/04-API-DESIGN.md` Section 7 - WebSocket log streaming specification
> - `docs/admin-panel/05a-PAGE-WIREFRAMES.md` - Log viewer layout
> - `docs/admin-panel/02-ARCHITECTURE.md` Section 2 - WebSocket architecture
> - `docs/admin-panel/01-REQUIREMENTS.md` Section 2.6 - FR-LOG-001 to FR-LOG-004
> 📖 **Read First**: `docs/admin-panel/04-API-DESIGN.md` Section 7

- [x] 7.1.1 Create `apps/api/src/api/websocket/__init__.py`
- [x] 7.1.2 Create `apps/api/src/api/websocket/manager.py`
- [x] 7.1.3 Implement ConnectionManager class
- [x] 7.1.4 Handle connection registration
- [x] 7.1.5 Handle connection removal
- [x] 7.1.6 Implement broadcast to all connections
- [x] 7.1.7 Implement broadcast to channel subscribers
- [x] 7.1.8 Add authentication for WebSocket connections

### 7.2 Log Streaming Backend
- [x] 7.2.1 Create `apps/api/src/api/websocket/handlers/logs.py`
- [x] 7.2.2 Subscribe to Redis log pub/sub channel
- [x] 7.2.3 Forward log entries to WebSocket clients
- [x] 7.2.4 Handle filter subscriptions (level, group_id)
- [x] 7.2.5 Create `apps/api/src/services/log_service.py`
- [x] 7.2.6 Implement `get_historical_logs(filters)` method
- [x] 7.2.7 Create `apps/api/src/api/v1/endpoints/logs.py`
- [x] 7.2.8 Implement `GET /logs` REST endpoint
- [x] 7.2.9 Add level filter parameter
- [x] 7.2.10 Add time range parameters
- [x] 7.2.11 Add search parameter
- [x] 7.2.12 Register logs WebSocket route

### 7.3 Log Viewer Frontend
> 📖 **Read First**: `docs/admin-panel/05a-PAGE-WIREFRAMES.md`

- [x] 7.3.1 Create `apps/web/src/lib/hooks/use-websocket.ts`
- [x] 7.3.2 Handle connection lifecycle
- [x] 7.3.3 Handle reconnection with backoff
- [x] 7.3.4 Create `apps/web/src/stores/websocket-store.ts`
- [x] 7.3.5 Store connection state
- [x] 7.3.6 Store received log entries
- [x] 7.3.7 Create `apps/web/src/components/logs/log-viewer.tsx`
- [x] 7.3.8 Display log entries with color coding by level
- [x] 7.3.9 Add auto-scroll toggle
- [x] 7.3.10 Add pause/resume button
- [x] 7.3.11 Add level filter dropdown
- [x] 7.3.12 Add search input
- [x] 7.3.13 Create `apps/web/src/app/(dashboard)/logs/page.tsx`
- [x] 7.3.14 Integrate LogViewer component
- [x] 7.3.15 Add export button (CSV, JSON)

---

## Phase 8: Database Browser (Week 5-6)

> 📖 **Phase Docs**: Read these docs before starting Phase 8:
> - `docs/admin-panel/04-API-DESIGN.md` Section 8 - Database browser endpoints
> - `docs/admin-panel/05a-PAGE-WIREFRAMES.md` - Database browser layout
> - `docs/admin-panel/01-REQUIREMENTS.md` Section 2.7 - FR-DB-001 to FR-DB-004

### 8.1 Database API Endpoints
> 📖 **Read First**: `docs/admin-panel/04-API-DESIGN.md` Section 8

- [x] 8.1.1 Create `apps/api/src/schemas/database.py`
- [x] 8.1.2 Define `TableListResponse` schema
- [x] 8.1.3 Define `TableDataResponse` schema
- [x] 8.1.4 Create `apps/api/src/services/db_service.py`
- [x] 8.1.5 Implement `get_tables()` method
- [x] 8.1.6 Get table names from information_schema
- [x] 8.1.7 Get row counts per table
- [x] 8.1.8 Implement `get_table_data(table, page, per_page)` method
- [x] 8.1.9 Sanitize table name to prevent SQL injection
- [x] 8.1.10 Return column metadata with types
- [x] 8.1.11 Create `apps/api/src/api/v1/endpoints/database.py`
- [x] 8.1.12 Implement `GET /database/tables`
- [x] 8.1.13 Implement `GET /database/tables/{name}`
- [x] 8.1.14 Implement `GET /database/tables/{name}/export`
- [x] 8.1.15 Return CSV or JSON format
- [x] 8.1.16 Implement `GET /database/migrations`
- [x] 8.1.17 Register database router

### 8.2 Database Browser UI
- [x] 8.2.1 Create `apps/web/src/app/(dashboard)/database/page.tsx`
- [x] 8.2.2 Display table list sidebar
- [x] 8.2.3 Show row count badges
- [x] 8.2.4 Create `apps/web/src/app/(dashboard)/database/[table]/page.tsx`
- [x] 8.2.5 Display table schema
- [x] 8.2.6 Display data with pagination
- [x] 8.2.7 Add column type indicators
- [x] 8.2.8 Add export button

---

## Phase 9: Analytics (Week 6)

> 📖 **Phase Docs**: Read these docs before starting Phase 9:
> - `docs/admin-panel/04-API-DESIGN.md` Section 9 - Analytics endpoints
> - `docs/admin-panel/05a-PAGE-WIREFRAMES.md` - Analytics page layout with Recharts
> - `docs/admin-panel/01-REQUIREMENTS.md` Section 2.8 - FR-ANALYTICS-001 to FR-ANALYTICS-003

### 9.1 Analytics API Endpoints
> 📖 **Read First**: `docs/admin-panel/04-API-DESIGN.md` Section 9

- [x] 9.1.1 Create `apps/api/src/schemas/analytics.py`
- [x] 9.1.2 Define `UserGrowthResponse` schema
- [x] 9.1.3 Define `VerificationTrendResponse` schema
- [x] 9.1.4 Create `apps/api/src/services/analytics_service.py`
- [x] 9.1.5 Implement `get_user_growth(period, granularity)` method
- [x] 9.1.6 Implement `get_verification_trends(period, granularity)` method
- [x] 9.1.7 Create `apps/api/src/api/v1/endpoints/analytics.py`
- [x] 9.1.8 Implement `GET /analytics/users`
- [x] 9.1.9 Implement `GET /analytics/verifications`
- [x] 9.1.10 Register analytics router

### 9.2 Charts Components
- [x] 9.2.1 Create `apps/web/src/components/charts/user-growth-chart.tsx`
- [x] 9.2.2 Implement AreaChart with Recharts
- [x] 9.2.3 Add custom tooltip and gradients
- [x] 9.2.4 Create `apps/web/src/components/charts/verification-trend-chart.tsx`
- [x] 9.2.5 Implement BarChart with Recharts
- [x] 9.2.6 Create `apps/web/src/lib/api/endpoints/analytics.ts`
- [x] 9.2.7 Create `apps/web/src/lib/hooks/use-analytics.ts`
- [x] 9.2.8 Create `apps/web/src/app/(dashboard)/analytics/page.tsx`
- [x] 9.2.9 Implement dashboard layout with Tabs and Cards
- [x] 2.2.2 Create `apps/web/src/components/forms/login-form.tsx`
- [x] 2.2.3 Define `loginSchema` with Zod (email, password)
- [x] 2.2.4 Implement `react-hook-form` + `zodResolver`
- [x] 2.2.5 Add toast notifications for success/error
- [x] 2.2.6 Redirect to dashboard on success
- [x] 2.2.7 Add `AuthGuard` or `ProtectedLayout` for dashboard routes
- [x] 2.2.8 Create `apps/web/src/middleware.ts` (optional Next.js middleware)
- [x] 2.2.9 Test full login flow with backendr

### 9.3 Analytics Page
- [x] 9.3.1 Create `apps/web/src/app/(dashboard)/analytics/page.tsx`
- [x] 9.3.2 Add date range picker
- [x] 9.3.3 Add granularity selector (day/week/month)
- [x] 9.3.4 Display user growth chart
- [x] 9.3.5 Display verification trends chart
- [x] 9.3.6 Display success rate chart
- [x] 9.3.7 Add export data button

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
