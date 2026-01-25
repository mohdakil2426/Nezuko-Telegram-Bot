# ⚡ Nezuko Tech Stack (v1.0.0)

This document serves as the single source of truth for the complete technology stack used in the Nezuko Telegram Bot platform.

## 🟢 Frontend (`apps/web`)

**Core Framework**

- **Next.js**: `v16.1.4` (App Router)
- **React**: `v19.2.3`
- **TypeScript**: `v5.9.3`
- **Build Tool**: `Turbo` / `Bun`

**UI & Styling**

- **Tailwind CSS**: `v4.1.18`
- **Component Library**: `Shadcn/UI` (Radix Primitives)
- **Icons**: `Lucide React`
- **Animations**: `Motion` (Framer Motion)
- **Charts**: `Recharts` (`v3.7.0`), `React Sparklines`

**State Management & Data**

- **Server State**: `TanStack Query` (`v5.90`)
- **Global State**: `Zustand` (`v5.0`)
- **Forms**: `React Hook Form` (`v7.71`) + `Zod` (`v4.3`) for validation

**Integration**

- **Auth & Backend**: `Firebase JS SDK` (`v12.8.0`)
- **Date Handling**: `date-fns`

**Testing**

- **Unit/Integration**: `Vitest` (`v3.0`)

---

## 🔵 Backend API (`apps/api`)

**Runtime**

- **Language**: `Python 3.13+`
- **Framework**: `FastAPI` (`v0.124.4`)
- **Server**: `Uvicorn` (`v0.40.0`)

**Data & Storage**

- **ORM**: `SQLAlchemy` (`v2.0.46`) [AsyncIO]
- **Database Driver (Prod)**: `AsyncPG` (`v0.31.0`)
- **Database Driver (Dev)**: `AIOSQLite`
- **Migrations**: `Alembic`
- **Cache**: `Redis` (`v5.2.1`)

**Security & Validation**

- **Data Validation**: `Pydantic V2` (`v2.12.5`)
- **Configuration**: `Pydantic Settings`
- **Authentication**: `Firebase Admin SDK` (`v6.5.0`)
- **Rate Limiting**: `SlowAPI`

**Observability**

- **Logging**: `Structlog`
- **Error Tracking**: `Sentry SDK`
- **Metrics**: `Prometheus Client`

---

## 🤖 Bot Core (`bot`)

**Runtime**

- **Language**: `Python 3.13+`
- **Library**: `python-telegram-bot` (`v22.5.0`) [AsyncIO]

**Infrastructure**

- **Job Queue**: `PTB JobQueue`
- **HTTP Client**: `AIOHTTP` (`v3.13.3`)
- **Database**: Shared `SQLAlchemy` models with API

---

## 🛠️ Infrastructure & DevOps

**Monorepo**

- **Orchestration**: `Turborepo`
- **Package Manager**: `Bun` (Frontend), `Pip` (Backend)

**Containers & Services**

- **Containerization**: `Docker`
- **Primary Database**: `PostgreSQL 18.2`
- **Key-Value Store**: `Redis 8.0`
- **Reverse Proxy**: `Caddy Web Server`

**Development Tools**

- **Linting (Python)**: `Ruff`, `Pylint`
- **Type Checking (Python)**: `MyPy`, `Pyrefly`
- **Linting (JS/TS)**: `ESLint`
- **Formatting**: `Prettier` / `Ruff Format`

---

## 🔒 Security Standards

- **Hashing**: `RS256` (Firebase Auth)
- **Encryption**: TLS 1.3 (Caddy)
- **Secret Management**: `.env` (Local) / Docker Secrets (Prod)
