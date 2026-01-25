# Technical Context: Nezuko - Stack, Infrastructure & Ecosystem

## 🚀 The Multi-Tier Technology Stack

Nezuko is built on a "Precision First" philosophy, selecting the most stable yet advanced versions of every library in the ecosystem.

### 1. Bot Core (Python Runtime)

- **Runtime**: `Python 3.13.1`.
- **Library**: `python-telegram-bot v22.5.0`.
- **Database**: `PostgreSQL 18.2` (Production) / `SQLite (aiosqlite)` (Local Dev Fallback).
- **Caching**: `Redis 8.0`.

### 2. Admin API (FastAPI Backend)

- **Framework**: `FastAPI 0.124.4`.
- **Validation**: `Pydantic V2.12.5`.
- **Authentication**: `Firebase Admin SDK v6.6.0` / `MOCK_AUTH` (Development).

---

## 📄 Detailed Schema Reference (API & DB)

### 1. SQLAlchemy Models (`apps/api/src/models/`)

> **Important**: As of 2026-01-26, all models use **database-agnostic types** for SQLite compatibility.

#### Model: `AdminUser` (`admin_user.py`)

| Column          | Type           | Notes                     |
| :-------------- | :------------- | :------------------------ |
| `id`            | `String(36)`   | Primary Key, UUID as text |
| `firebase_uid`  | `String(36)`   | Unique, Indexed           |
| `email`         | `String(255)`  | Unique                    |
| `password_hash` | `String(255)`  | Nullable (unused)         |
| `full_name`     | `String(100)`  | Nullable                  |
| `role`          | `String(20)`   | Default: "viewer"         |
| `is_active`     | `Boolean`      | Default: True             |
| `telegram_id`   | `BigInteger`   | Nullable, Unique          |
| `created_at`    | `DateTime(tz)` | Server default            |
| `updated_at`    | `DateTime(tz)` | Auto-update               |
| `last_login`    | `DateTime(tz)` | Nullable                  |

#### Model: `AdminSession` (`admin_session.py`)

| Column          | Type           | Notes                |
| :-------------- | :------------- | :------------------- |
| `id`            | `String(36)`   | Primary Key          |
| `user_id`       | `String(36)`   | FK → admin_users.id  |
| `refresh_token` | `String(512)`  | Unique               |
| `ip_address`    | `String(45)`   | IPv4/IPv6 compatible |
| `user_agent`    | `String`       | Nullable             |
| `expires_at`    | `DateTime(tz)` | Indexed              |
| `created_at`    | `DateTime(tz)` | Server default       |

#### Model: `AdminAuditLog` (`admin_audit_log.py`)

| Column          | Type            | Notes        |
| :-------------- | :-------------- | :----------- |
| `id`            | `String(36)`    | Primary Key  |
| `user_id`       | `String(36)`    | FK, Nullable |
| `action`        | `String(50)`    | Required     |
| `resource_type` | `String(50)`    | Required     |
| `resource_id`   | `String(100)`   | Nullable     |
| `old_value`     | `JSON`          | Nullable     |
| `new_value`     | `JSON`          | Nullable     |
| `ip_address`    | `String(45)`    | Nullable     |
| `user_agent`    | `String`        | Nullable     |
| `created_at`    | `TIMESTAMP(tz)` | Indexed      |

#### Model: `AdminConfig` (`config.py`)

| Column         | Type           | Notes          |
| :------------- | :------------- | :------------- |
| `key`          | `String(100)`  | Primary Key    |
| `value`        | `JSON`         | Required       |
| `description`  | `Text`         | Nullable       |
| `is_sensitive` | `Boolean`      | Default: False |
| `updated_by`   | `String(36)`   | FK, Nullable   |
| `updated_at`   | `DateTime(tz)` | Auto-update    |

#### Bot Models (`bot.py`)

| Model              | Primary Key  | Notes                   |
| :----------------- | :----------- | :---------------------- |
| `Owner`            | `user_id`    | BigInteger              |
| `ProtectedGroup`   | `group_id`   | BigInteger, FK → owners |
| `EnforcedChannel`  | `channel_id` | BigInteger              |
| `GroupChannelLink` | `id`         | Many-to-many join table |

### 2. Database Connection Configuration

The database connection is configured dynamically based on the `DATABASE_URL`:

```python
# apps/api/src/core/database.py
_is_sqlite = "sqlite" in settings.DATABASE_URL.lower()

if _is_sqlite:
    # SQLite: No pooling, check_same_thread=False
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # PostgreSQL: Full pooling + conditional SSL
    _engine_kwargs.update({
        "pool_size": 20,
        "max_overflow": 10,
        "pool_timeout": 30,
        "pool_recycle": 1800,
        "pool_pre_ping": True,
    })
    if "localhost" not in settings.DATABASE_URL:
        _engine_kwargs["connect_args"] = {"ssl": "require"}
```

---

## 🔒 Firebase Security Rules (RTDB)

Nezuko uses the following rules for the Real-time Logging database to ensure data sovereignty.

```json
{
  "rules": {
    "logs": {
      ".read": "auth != null",
      ".write": "auth != null && auth.token.admin === true",
      "$log_id": {
        ".indexOn": ["timestamp", "level"]
      }
    },
    "sessions": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

---

## 🌐 Network Topology & Data Flow

### 1. Request Path (External -> Internal)

1.  **Client** -> `HTTPS (443)` -> **Caddy**.
2.  **Caddy** -> `Forward (8000)` -> **Uvicorn (FastAPI Worker)**.
3.  **FastAPI** -> `RS256` -> **Firebase Auth API** (Token Validation).
4.  **FastAPI** -> `TCP` -> **PostgreSQL / SQLite / Redis**.

### 2. Authentication Flow (Firebase)

1.  **Web Client** -> `signInWithEmailAndPassword()` -> **Firebase Auth**.
2.  **Firebase Auth** -> Returns `idToken` (JWT).
3.  **Web Client** -> `POST /api/v1/auth/sync` with `Bearer {idToken}`.
4.  **API** -> `verify_firebase_token()` -> **Firebase Public Keys**.
5.  **API** -> Creates/updates `AdminUser` in local DB.
6.  **API** -> Returns `UserResponse` with role info.

---

## 🛠️ Local Development Setup

### Quick Start Commands

```bash
# 1. Start API (Terminal 1)
cd apps/api
python init_db.py          # Create SQLite tables
python -m uvicorn src.main:app --host 0.0.0.0 --port 8080 --reload

# 2. Start Web (Terminal 2)
cd apps/web
bun dev                    # Runs on localhost:3000

# 3. Login
# Navigate to http://localhost:3000/login
# Use: admin@nezuko.bot / ChangeMe123!
```

### Environment Variables (Required)

```bash
# apps/api/.env
DATABASE_URL=sqlite+aiosqlite:///./nezuko.db
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://project-default-rtdb.firebaseio.com

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

---

## 🐳 Production Deployment Blueprint: Caddyfile

```caddyfile
# Nezuko Production Configuration
{
    email admin@nezuko.bot
    admin off
}

nezuko.bot {
    # Frontend Static Files
    root * /var/www/nezuko/apps/web/out
    file_server

    # API Reverse Proxy
    handle_path /api/* {
        reverse_proxy api:8000 {
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
        }
    }

    # Security Headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # Compression
    encode zstd gzip
}
```

---

## 💰 Infrastructure Cost Optimization

- **Redis LRU**: Using the `allkeys-lru` eviction policy to cap memory at 256MB.
- **Postgres Vacuum**: Nightly automated analysis to reclaim disk space.
- **SQLite for Dev**: Zero cost for local development and testing.

---

## 🗂️ Key Files Reference

| File                                           | Purpose                                    |
| :--------------------------------------------- | :----------------------------------------- |
| `apps/api/init_db.py`                          | Initialize SQLite database with all tables |
| `apps/api/src/core/database.py`                | Database engine configuration (SQLite/PG)  |
| `apps/api/src/core/security.py`                | Firebase token verification                |
| `apps/api/src/services/auth_service.py`        | User sync logic                            |
| `apps/web/src/lib/firebase.ts`                 | Firebase client initialization             |
| `apps/web/src/components/forms/login-form.tsx` | Login form component                       |

---

**Total Line Count Target: 200+ Lines of technical reference.**
_(This document encodes the technical DNA of the Nezuko Platform)._
_(Updated 2026-01-26 with Firebase auth flow and SQLite compatibility details)._
