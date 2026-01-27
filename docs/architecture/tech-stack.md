# ⚡ Technology Stack

> **Complete technology reference for the Nezuko platform**

This document provides a comprehensive overview of all technologies, frameworks, and tools used in the Nezuko Telegram Bot platform.

---

## 📋 Overview

| Layer | Primary Technologies |
|-------|---------------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind v4 |
| **Backend API** | FastAPI, Python 3.13, SQLAlchemy 2.0, Pydantic V2 |
| **Bot Engine** | python-telegram-bot v22.6, AsyncIO |
| **Database** | PostgreSQL 15+ (Supabase), Redis 7+ |
| **Infrastructure** | Docker, Turborepo, Caddy |

---

## 🟢 Frontend Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.4 | React meta-framework with App Router |
| **React** | 19.2.3 | UI component library |
| **TypeScript** | 5.9.3 | Type-safe JavaScript |
| **Bun** | 1.3.6+ | Package manager and runtime |

### UI & Styling

| Technology | Version | Purpose |
|------------|---------|---------|
| **Tailwind CSS** | 4.1.x | Utility-first CSS framework |
| **shadcn/ui** | Latest | Accessible component library (Radix) |
| **Lucide React** | 0.563+ | Icon library |
| **Motion** | 12.29+ | Animation library (Framer Motion) |
| **Recharts** | 3.7+ | Charting library |
| **Sonner** | 2.0+ | Toast notifications |

### State & Data Management

| Technology | Version | Purpose |
|------------|---------|---------|
| **TanStack Query** | 5.90+ | Server state management |
| **Zustand** | 5.0+ | Client state management |
| **React Hook Form** | 7.71+ | Form handling |
| **Zod** | 4.3+ | Schema validation |
| **TanStack Table** | 8.21+ | Data tables |

### Authentication & Integration

| Technology | Version | Purpose |
|------------|---------|---------|
| **Supabase JS** | 2.93+ | Backend-as-a-Service client |
| **@supabase/ssr** | 0.8+ | Server-side auth helpers |
| **date-fns** | 4.1+ | Date manipulation |

### Testing

| Technology | Version | Purpose |
|------------|---------|---------|
| **Vitest** | 3.0+ | Unit and integration testing |
| **Playwright** | Latest | E2E browser testing |
| **Testing Library** | Latest | Component testing utilities |

---

## 🔵 Backend API Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.13+ | Programming language |
| **FastAPI** | 0.128+ | Modern async web framework |
| **Uvicorn** | 0.40+ | ASGI server |
| **Pydantic** | 2.12+ | Data validation and settings |

### Database & ORM

| Technology | Version | Purpose |
|------------|---------|---------|
| **SQLAlchemy** | 2.0+ | Async ORM |
| **AsyncPG** | 0.31+ | PostgreSQL async driver |
| **AIOSQLite** | 0.22+ | SQLite async driver (dev) |
| **Alembic** | 1.18+ | Database migrations |
| **Redis** | 7.1+ | Caching and pub/sub |

### Security

| Technology | Version | Purpose |
|------------|---------|---------|
| **PyJWT** | 2.10+ | JWT token handling |
| **Passlib** | Latest | Password hashing (Argon2) |
| **SlowAPI** | 0.1.9 | Rate limiting |

### Observability

| Technology | Version | Purpose |
|------------|---------|---------|
| **Structlog** | 25.5+ | Structured JSON logging |
| **Sentry SDK** | 2.50+ | Error tracking |
| **Prometheus Client** | 0.24+ | Metrics collection |

---

## 🤖 Bot Engine Stack

### Core

| Technology | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.13+ | Programming language |
| **python-telegram-bot** | 22.6+ | Telegram Bot API wrapper |

### Integration

| Technology | Version | Purpose |
|------------|---------|---------|
| **AIOHTTP** | 3.13+ | Async HTTP client |
| **HTTPX** | 0.28+ | Modern HTTP client |
| **APScheduler** | Via PTB | Job scheduling |

### Shared Infrastructure

- Uses same SQLAlchemy models as API
- Shared Redis cache layer
- Common Prometheus metrics

---

## 🛠️ Development Tools

### Monorepo Management

| Technology | Version | Purpose |
|------------|---------|---------|
| **Turborepo** | 2.7+ | Build orchestration |
| **Bun** | 1.3.6+ | Frontend package manager |
| **Pip** | Latest | Python package manager |

### Code Quality (Python)

| Tool | Purpose |
|------|---------|
| **Ruff** | Fast linter and formatter |
| **Pylint** | Static code analysis |
| **Pyrefly** | Type checking |
| **MyPy** | Static type checker |

### Code Quality (TypeScript)

| Tool | Version | Purpose |
|------|---------|---------|
| **ESLint** | 9.18+ | Linting |
| **Prettier** | 3.4+ | Code formatting |
| **TypeScript** | 5.9+ | Type checking |

### Git & Version Control

| Tool | Purpose |
|------|---------|
| **Pre-commit** | Git hooks for quality checks |
| **Husky** | Git hooks manager |
| **Commitizen** | Conventional commits |

---

## 🏗️ Infrastructure

### Containerization

| Technology | Purpose |
|------------|---------|
| **Docker** | Container runtime |
| **Docker Compose** | Multi-container orchestration |

### Database Services

| Service | Version | Purpose |
|---------|---------|---------|
| **PostgreSQL** | 15+ | Primary database (via Supabase) |
| **Redis** | 7.1+ | Caching and real-time |
| **Supabase** | Managed | Auth, realtime, storage |

### Reverse Proxy

| Technology | Purpose |
|------------|---------|
| **Caddy** | Automatic HTTPS, reverse proxy |

---

## 🔒 Security Standards

### Authentication

| Standard | Implementation |
|----------|---------------|
| **JWT** | HS256 signed tokens via Supabase |
| **Session** | Server-side with `@supabase/ssr` |
| **Row-Level Security** | Postgres RLS policies |

### Data Protection

| Layer | Technology |
|-------|------------|
| **Transport** | TLS 1.3 (Caddy) |
| **Secrets** | Environment variables, Docker secrets |
| **Password Hashing** | Argon2id (via Passlib) |

### Multi-Tenancy

- `projectId` filtering on all queries
- Supabase RLS policies
- API-level tenant isolation

---

## 📊 Version Matrix

### Production Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Python | 3.13 | 3.13.1+ |
| Node.js | 20 | 22+ |
| PostgreSQL | 15 | 16+ |
| Redis | 7.0 | 7.4+ |

### Development Requirements

| Component | Minimum | Purpose |
|-----------|---------|---------|
| Bun | 1.3.6 | Package management |
| Docker | 24+ | Containerization |
| Git | 2.40+ | Version control |

---

## 📚 Related Documentation

- [**Architecture Overview**](./README.md) - System design
- [**Folder Structure**](./folder-structure.md) - Project organization
- [**Deployment Guide**](../deployment/README.md) - Production setup

---

*Last Updated: 2026-01-28*
