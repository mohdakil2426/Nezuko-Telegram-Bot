# ⚡ Nezuko Tech Stack (v1.1.0)

This document serves as the single source of truth for the complete technology stack used in the Nezuko Telegram Bot platform.

## 🟢 Frontend (`apps/web`)

**Core Framework**

- **Next.js**: `v16.1.4` (App Router)
- **React**: `v19.2.3` (with React 19.2 Compiler)
- **TypeScript**: `v5.9.3`
- **Build Tool**: `Turborepo` / `Bun v1.3.6`

**UI & Styling**

- **Tailwind CSS**: `v4.1.18` (using `@theme` inline pattern)
- **Component Library**: `Shadcn/UI` (Radix Primitives)
- **Design System**: Atomic Design with CSS Variables architecture
- **Icons**: `Lucide React` (`v0.563`)
- **Animations**: `Motion` (Framer Motion `v12.29.0`)
- **Charts**: `Recharts` (`v3.7.0`), `React Sparklines` (`v1.7.0`)
- **Toasts**: `Sonner` (`v2.0.7`)

**State Management & Data**

- **Server State**: `TanStack Query` (`v5.90.20`)
- **Global State**: `Zustand` (`v5.0.10`)
- **Forms**: `React Hook Form` (`v7.71.1`) + `Zod` (`v4.3.6`) for validation
- **Data Table**: `TanStack Table` (`v8.21.3`)

**Integration**

- **Auth & Backend**: `Supabase JS SDK` (`v2.93.1`) + `@supabase/ssr` (`v0.8.0`)
- **API Fetching**: `httpx` (API side), `Native Fetch` / `TanStack Query` (Web side)
- **Date Handling**: `date-fns` (`v4.1.0`)

**Testing**

- **Unit/Integration**: `Vitest` (`v3.0.4`)
- **E2E/Browser**: `Playwright`

---

## 🔵 Backend API (`apps/api`)

**Runtime**

- **Language**: `Python 3.13.1`
- **Framework**: `FastAPI` (`v0.128.0+`)
- **Server**: `Uvicorn` (`v0.40.0`) [Standard]

**Data & Storage**

- **ORM**: `SQLAlchemy` (`v2.0.46`) [AsyncIO]
- **Database Driver (Prod)**: `AsyncPG` (`v0.31.0`)
- **Database Driver (Dev)**: `AIOSQLite` (`v0.22.1`)
- **Migrations**: `Alembic` (`v1.18.1`)
- **Cache**: `Redis` (`v7.1.0+`) via `redis-py` async

**Security & Validation**

- **Data Validation**: `Pydantic V2` (`v2.12.5`)
- **Configuration**: `Pydantic Settings` (`v2.12.0`)
- **Authentication**: `Supabase Auth` (JWT Verification)
- **Encryption**: `PyJWT` (`v2.10.1`), `Passlib` (Argon2)
- **Rate Limiting**: `SlowAPI` (`v0.1.9`)

**Observability**

- **Logging**: `Structlog` (`v25.5.0`)
- **Error Tracking**: `Sentry SDK` (`v2.50.0`) [FastAPI Integration]
- **Metrics**: `Prometheus Client` (`v0.24.1`)

---

## 🤖 Bot Core (`bot`)

**Runtime**

- **Language**: `Python 3.13.1`
- **Library**: `python-telegram-bot` (`v22.6+`) [AsyncIO, Rate-Limiter]

**Infrastructure**

- **Job Queue**: `PTB JobQueue`
- **HTTP Client**: `AIOHTTP` (`v3.13.3`), `HTTPX` (`v0.28.1`)
- **Database**: Shared `SQLAlchemy` models with API
- **Task Scheduling**: `APScheduler` (via PTB JobQueue)

---

## 🛠️ Infrastructure & DevOps

**Monorepo**

- **Orchestration**: `Turborepo` (`v2.7.0`)
- **Package Manager**: `Bun` (Frontend), `Pip` (Backend)

**Containers & Services**

- **Containerization**: `Docker`
- **Primary Database**: `PostgreSQL 15+` (Hosted on Supabase)
- **Key-Value Store**: `Redis 7.1.0`
- **Reverse Proxy**: `Caddy Web Server` (TLS 1.3)

**Development Tools**

- **Linting (Python)**: `Ruff`, `Pylint`
- **Type Checking (Python)**: `MyPy`, `Pyrefly` (`v0.49.0`)
- **Linting (JS/TS)**: `ESLint` (`v9.18.0`)
- **Formatting**: `Prettier` (`v3.4.2`) / `Ruff Format`

---

## 🔒 Security Standards

- **Hashing**: `HS256` (Supabase JWT)
- **Secrets**: `Dotenv` (Local) / Docker Secrets & Environment Variables (Prod)
- **Tenant Isolation**: `projectId` filtering across all queries
- **RLS**: Row-Level Security enforced at Supabase Postgres level
