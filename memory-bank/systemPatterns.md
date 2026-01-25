# System Patterns: Nezuko - Architectural Integrity & Quality Standards

## 🏢 Monorepo Orchestration: The Turborepo Standard

Nezuko is built as a highly-efficient monorepo to ensure tight integration between the Enforcement Engine (Bot), the Management Layer (API), and the Control Center (Web).

### 1. Workspace Organization

- **Root Context**: Orchestrated by `pnpm-workspace.yaml` and `turbo.json`.
- **Logical Domains**:
  - `apps/web`: Next.js 16 frontend.
  - `apps/api`: FastAPI backend.
  - `bot/`: Python-native enforcement core.
  - `packages/types`: Shared TypeScript interfaces.
  - `packages/config`: Centralized environment schemas.

### 2. Project Folder Structure

```bash
.
├── apps/                    # Application Layer
│   ├── web/                 # Next.js 16 Admin Panel
│   │   ├── src/app/         # Next.js App Router (Dashboard)
│   │   ├── src/components/  # shadcn/ui & custom UI widgets
│   │   └── src/lib/api/     # Typed API clients & hooks
│   └── api/                 # FastAPI Logic Layer
│       ├── src/api/v1/      # REST Endpoints (RBAC enforced)
│       ├── src/core/        # Auth, DB, and Security singletons
│       ├── src/models/      # SQLAlchemy models (database-agnostic)
│       └── src/services/    # Pure business logic (Action Layer)
├── bot/                     # Enforcement Layer (Python)
│   ├── core/                # MTProto initializers & caching
│   ├── database/            # Bot-side SQLAlchemy models
│   ├── handlers/            # Command & Event logic (Join/Leave)
│   └── services/            # Verification & Enforcement logic
├── packages/                # Shared Cross-Domain Library
│   ├── types/               # Unified Zod & TypeScript interfaces
│   └── config/              # Centralized environment validation
├── docker/                  # Infrastructure (Caddy, Postgres, Redis)
├── memory-bank/             # AI Memory & Engineering Rules
│   ├── projectbrief.md      # Goal & Vision (150+ lines)
│   ├── systemPatterns.md    # Architectural Blueprint (200+ lines)
│   ├── techContext.md       # Stack & Ecosystem (200+ lines)
│   ├── activeContext.md     # Current work focus
│   └── progress.md          # Implementation Roadmap
├── openspec/                # Proposed architectural changes
├── tests/                   # Unified Test Suite (Pytest)
├── AGENTS.md                # Agent instruction & coding rules
└── GEMINI.md                # AI Coding Assistant Instructions
```

### 3. Dependency Management

- **Package Manager**: **Bun** is the strictly enforced authority for JS/TS packages.
- **Shared Pipelines**: `turbo dev` and `turbo build` ensure automatic invalidation.

---

## 🗄️ Database Patterns: Multi-Database Compatibility

### 1. Database-Agnostic Model Design

As of 2026-01-26, all SQLAlchemy models are **database-agnostic** to support both SQLite (development) and PostgreSQL (production).

| PostgreSQL Type | Agnostic Alternative | Rationale                            |
| :-------------- | :------------------- | :----------------------------------- |
| `UUID`          | `String(36)`         | SQLite doesn't support UUID natively |
| `JSONB`         | `JSON`               | SQLite uses TEXT-based JSON          |
| `INET`          | `String(45)`         | SQLite doesn't have network types    |

### 2. Connection Configuration Pattern

```python
# Conditional engine configuration based on database type
_is_sqlite = "sqlite" in settings.DATABASE_URL.lower()

if _is_sqlite:
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    _engine_kwargs.update({
        "pool_size": 20,
        "max_overflow": 10,
        "pool_pre_ping": True,
    })
    if "localhost" not in settings.DATABASE_URL:
        _engine_kwargs["connect_args"] = {"ssl": "require"}
```

### 3. Table Initialization Script

The `init_db.py` script creates all required tables for local development:

```python
# apps/api/init_db.py
from src.models import AdminUser, AdminAuditLog, AdminSession, AdminConfig
from src.models.bot import Owner, ProtectedGroup, EnforcedChannel, GroupChannelLink

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

---

## 🤖 Bot Engine Architecture: The Enforcement Core

### 1. The Concurrency Model

- **AsyncIO Everywhere**: From network layer to database driver.
- **Concurrent Updates**: Using `ApplicationBuilder().concurrent_updates(True)`.

### 2. The Verification Lifecycle

1.  **Ingestion**: Event received (Join, Message, Left).
2.  **Context Resolution**: Resolve `group_id` and `user_id`.
3.  **Action Dispatch**: Verified vs Unverified logic.

---

## 🔐 Authentication Patterns

### 1. Firebase Auth Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │────▶│ Firebase Auth │────▶│  ID Token   │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                 │
      ┌──────────────────────────────────────────┘
      ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ POST /sync  │────▶│ verify_token │────▶│ Create User │
└─────────────┘     └──────────────┘     └─────────────┘
```

### 2. Token Verification Pattern

```python
# apps/api/src/core/security.py
async def verify_firebase_token(token: str) -> dict:
    decoded = auth.verify_id_token(token)
    return {
        "uid": decoded["uid"],
        "email": decoded.get("email"),
        "name": decoded.get("name"),
    }
```

### 3. User Sync Pattern

```python
# apps/api/src/services/auth_service.py
async def sync_firebase_user(self, firebase_user: dict) -> AdminUser:
    # 1. Check by firebase_uid
    # 2. Check by email (migration case)
    # 3. Create new user if not exists
    # 4. Update last_login timestamp
    return user
```

---

## 🎨 Interaction Design & UI/UX Principles

### 1. The "Wowed" First Impression

- **Color Palette**: Using `HSL` tailored colors for dark mode gradients.
- **Typography**: `Outfit` for headings, `Inter` for UI, `JetBrains Mono` for data.
- **Micro-interactions**: Every button click triggers a `scale-95` transition.

### 2. Dashboard Information Density

- **Bento-Grid Layout**: Grouping related metrics into visual blocks.
- **Progressive Disclosure**: Details hidden behind "Expand" buttons.

---

## 🏷️ Comprehensive Error Code Reference

| Code       | HTTP Status | Domain      | Description                              |
| :--------- | :---------: | :---------- | :--------------------------------------- |
| `AUTH_001` |     401     | Auth        | Invalid or expired Firebase token.       |
| `AUTH_002` |     403     | Auth        | User not found in admin_users table.     |
| `DB_001`   |     500     | Database    | Connection pool exhaustion.              |
| `DB_002`   |     409     | Database    | Duplicate Telegram ID detected.          |
| `TG_001`   |     502     | Bot         | Telegram Bot API timeout or 429 flood.   |
| `ENF_001`  |     400     | Enforcement | Attempt to link group without bot admin. |

---

## 🛠️ Maintenance & Sustainability Patterns

### 1. Log Rotation Policy

- **Local Strategy**: Logs rotated daily with 7-day retention.
- **Firebase Strategy**: Real-time logs purged every 24 hours.

### 2. Database Backup SOP

- **Nightly snapshots**: Automated `pg_dump` to encrypted S3.
- **PITR**: WAL-G configured for production instances.

---

## 🤝 Contribution & CI/CD Pipeline Patterns

### 1. The PR Lifecycle

1.  **Draft**: Work-in-progress, NO CI triggered.
2.  **Review**: Automatic trigger of `turbo lint` and `turbo test`.
3.  **Approval**: Requires 1 Senior Reviewer sign-off.
4.  **Merge**: Squash merge to `main` with semantic tags.

### 2. Continuous Deployment

- **Staging**: Every merge to `main` deploys to staging.
- **Production**: Triggered by a new GitHub Release tag.

---

## 🛡️ Security Hardening Patterns

### Bot-Side

1.  **Strict Chat Filtering**: Ignore DMs unless `/start` help command.
2.  **Callback Validation**: Cryptographic verification against `user_id`.

### API-Side

1.  **Token Verification**: Firebase RS256 signature validation.
2.  **CORS**: Strict origin checking for localhost:3000 only.
3.  **Rate Limiting**: SlowAPI middleware for API protection.

---

**This document is the authoritative guide for all system implementations.**
**Updated 2026-01-26 with database-agnostic patterns and Firebase auth flow.**
