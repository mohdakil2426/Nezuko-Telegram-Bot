# Technical Context: Nezuko - The Ultimate All-In-One Bot

## Production Technology Stack

### Bot Core (Python)
Nezuko is optimized for Python 3.13+ and leverages a modern, async-first stack:

*   **Core**: `python-telegram-bot` v22.5+ (Stable AsyncIO wrapper).
*   **Database**: PostgreSQL 18+ (Production) / SQLite (Development) via `SQLAlchemy 2.0+` & `aiosqlite`/`asyncpg`.
*   **Migrations**: `Alembic` for version-controlled schema evolution.
*   **Caching**: `Redis 8+` for distributed verification state (with TTL jitter).
*   **Observability**: 
    *   `Prometheus` for real-time performance metrics.
    *   `Sentry` for centralized error tracking.
    *   `Structlog` for high-performance structured JSON logging.
*   **Verification**: Custom `AIORateLimiter` capped at 25 requests/second.

### Admin Panel (Phase 4 Complete ✅)
Full-stack web application for bot management - **Foundation & Features Implemented**:

**Implemented Phases Status**:
- ✅ Phase 0: Foundation (Monorepo, Docker, CI/CD)
- ✅ Phase 1: Backend Authentication
- ✅ Phase 2: Frontend Auth & Layout
- ✅ Phase 3: Dashboard Stats
- ✅ Phase 4: Groups Management

#### Frontend Stack (Next.js 16) - ✅ Implemented
| Technology      | Version | Purpose                                 |
| --------------- | ------- | --------------------------------------- |
| Next.js         | 16.1.4  | React SSR framework (Turbopack default) |
| React           | 19.2.3  | UI components                           |
| TypeScript      | 5.9.3   | Type safety                             |
| Tailwind CSS    | 4.1.18  | Utility-first styling (CSS 4)           |
| shadcn/ui       | 3.7.0   | Component library (Radix primitives)    |
| TanStack Query  | 5.90.20 | Server state management                 |
| TanStack Table  | 8.21.0+ | Headless data tables (sorting/paging)   |
| Zustand         | 5.0.10  | Client state management                 |
| Recharts        | 3.7.0   | Data visualization                      |
| Zod             | 4.3.6   | Runtime validation                      |
| react-hook-form | 7.x     | Form management                         |

#### Backend Stack (FastAPI) - ✅ Implemented
| Technology      | Version | Purpose                     |
| --------------- | ------- | --------------------------- |
| FastAPI         | 0.124.4 | Async REST API framework    |
| Python          | 3.13+   | Runtime                     |
| Pydantic        | 2.12.5  | Request/response validation |
| SQLAlchemy      | 2.0.46  | Async ORM                   |
| Alembic         | 1.18.1  | Database migrations         |
| python-jose     | 3.5.0   | JWT (ES256)                 |
| passlib[argon2] | 1.7.4   | Password hashing (Argon2id) |
| Structlog       | 25.1+   | Structured logging          |
| Uvicorn         | 0.40.0  | ASGI server                 |

#### Infrastructure - ✅ Implemented
| Technology | Version | Purpose                  |
| ---------- | ------- | ------------------------ |
| PostgreSQL | 18      | Primary database         |
| Redis      | 8       | Cache & sessions         |
| Docker     | 27+     | Containerization         |
| Caddy      | 2.10.2  | Reverse proxy (auto TLS) |
| Turborepo  | 2.7.0   | Monorepo orchestration   |
| pnpm       | 9.15.0  | Package management       |

## Application Structure

### Bot Core Structure
```
bot/
├── core/          # Singleton initializers (DB, Cache, Rate Limiter)
├── database/      # Models, CRUD operations, and Migrations
├── handlers/      # Command, Event, and Callback logic
├── services/      # Business logic (Verification, Protection, Batch)
└── utils/         # Cross-cutting concerns (Metrics, Health, Logging)
```

### Admin Panel Structure
```
apps/
├── web/src/       # Next.js 16 frontend
│   ├── app/       # App Router (route groups)
│   ├── components/# UI components (shadcn/ui, tables, forms)
│   ├── lib/       # Hooks, utils, API client
│   ├── stores/    # Zustand stores
│   └── types/     # TypeScript definitions
│
└── api/src/       # FastAPI backend
    ├── core/      # Config, database, security
    ├── api/v1/    # REST endpoints
    ├── schemas/   # Pydantic models
    ├── models/    # SQLAlchemy ORM
    ├── services/  # Business logic
    └── middleware/# Request middleware
```

## Configuration Interface
The bot is configured via environment variables with strict validation:
*   `BOT_TOKEN`: Telegram bot API key.
*   `ENVIRONMENT`: `development` or `production`.
*   `DATABASE_URL`: Async-compliant connection string.
*   `REDIS_URL`: Cache connection (optional fallback enabled).
*   `SENTRY_DSN`: Error tracking endpoint (optional).
*   `WEBHOOK_URL` / `WEBHOOK_SECRET`: Production deployment parameters.

## Operational Constraints
*   **Rate Limits**: System enforces a maximum of 30 messages/second globally across all groups.
*   **Database Performance**: Optimized with composite indexes and connection pooling (20 connections).
*   **Resilience**: Circuit breakers monitor Redis and API health to prevent cascading failures.

## Testing & Quality
*   **Pylint Score**: 10.00/10 (optimized for readability and performance).
*   **Test Coverage**: Comprehensive suite including Unit, Integration, Edge Case, and Load tests (37+ tests).
*   **Benchmarking**: Standardized performance reports (p95, p99 latency) included.

## Security Standards (Admin Panel)
*   **Authentication**: Argon2id (64 MiB, 3 iterations) + JWT ES256
*   **Session**: 15-minute access tokens, 7-day refresh tokens with rotation
*   **RBAC**: Owner → Admin → Viewer permission hierarchy
*   **API Security**: Rate limiting, Pydantic V2 validation, strict CORS
*   **Error Handling**: RFC 9457 Problem Details format
*   **Logging**: Structlog with JSON output, request correlation IDs
*   **Infrastructure**: Docker non-root, PostgreSQL SCRAM-SHA-256, Redis ACLs
