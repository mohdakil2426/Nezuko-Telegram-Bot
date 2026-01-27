# 🔌 API Design

> **Nezuko Admin Panel - REST API Specification**

---

## 1. API Overview

### 1.1 Base Configuration

| Attribute | Value |
|-----------|-------|
| **Base URL** | `https://api.yourdomain.me/v1` |
| **Format** | JSON |
| **Authentication** | Bearer Token (JWT) |
| **Rate Limit** | 100 requests/minute per IP |

### 1.2 Standard Response Format

#### Success Response
```json
{
    "status": "success",
    "data": { ... },
    "meta": {
        "request_id": "req_abc123",
        "timestamp": "2026-01-24T18:30:00Z"
    }
}
```

#### Paginated Response
```json
{
    "status": "success",
    "data": [ ... ],
    "meta": {
        "request_id": "req_abc123",
        "timestamp": "2026-01-24T18:30:00Z",
        "pagination": {
            "page": 1,
            "per_page": 25,
            "total_items": 100,
            "total_pages": 4
        }
    }
}
```

#### Error Response
```json
{
    "status": "error",
    "error": {
        "code": "RESOURCE_NOT_FOUND",
        "message": "Group with ID 123 not found",
        "details": { "group_id": 123 }
    },
    "meta": {
        "request_id": "req_abc123",
        "timestamp": "2026-01-24T18:30:00Z"
    }
}
```

### 1.3 HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| `200` | OK | Successful GET, PUT |
| `201` | Created | Successful POST |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Invalid request body |
| `401` | Unauthorized | Missing/invalid token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Resource already exists |
| `422` | Unprocessable Entity | Validation failed |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error |

---

## 2. Authentication Endpoints

### 2.1 Login

```http
POST /v1/auth/login
Content-Type: application/json

{
    "email": "admin@nezuko.bot",
    "password": "secure_password_123"
}
```

**Response (200)**
```json
{
    "status": "success",
    "data": {
        "user": {
            "id": "uuid-here",
            "email": "admin@nezuko.bot",
            "full_name": "Admin User",
            "role": "owner"
        },
        "access_token": "eyJhbGciOiJIUzI1NiIs...",
        "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
        "expires_in": 900
    }
}
```

### 2.2 Refresh Token

```http
POST /v1/auth/refresh
Content-Type: application/json

{
    "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200)**
```json
{
    "status": "success",
    "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIs...",
        "expires_in": 900
    }
}
```

### 2.3 Logout

```http
POST /v1/auth/logout
Authorization: Bearer <access_token>
```

**Response (204)**: No content

### 2.4 Get Current User

```http
GET /v1/auth/me
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
    "status": "success",
    "data": {
        "id": "uuid-here",
        "email": "admin@nezuko.bot",
        "full_name": "Admin User",
        "role": "owner",
        "created_at": "2026-01-01T00:00:00Z",
        "last_login": "2026-01-24T18:00:00Z"
    }
}
```

---

## 3. Dashboard Endpoints

### 3.1 Get Dashboard Stats

```http
GET /v1/dashboard/stats
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
    "status": "success",
    "data": {
        "bot_status": "online",
        "uptime_seconds": 864000,
        "uptime_percentage": 99.9,
        "total_groups": 42,
        "total_channels": 15,
        "total_verifications": {
            "today": 1234,
            "week": 8765,
            "month": 35000,
            "all_time": 150000
        },
        "success_rate": 98.5,
        "cache_hit_rate": 72.3,
        "memory_usage_mb": 256,
        "cpu_usage_percent": 15.5
    }
}
```

### 3.2 Get Recent Activity

```http
GET /v1/dashboard/activity?limit=20
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
    "status": "success",
    "data": [
        {
            "id": "uuid",
            "event_type": "USER_VERIFIED",
            "group_id": -1001234567890,
            "group_name": "Test Group",
            "user_id": 123456789,
            "details": { "channels": [1, 2] },
            "timestamp": "2026-01-24T18:30:00Z"
        },
        {
            "id": "uuid",
            "event_type": "GROUP_PROTECTED",
            "group_id": -1001234567891,
            "group_name": "New Group",
            "user_id": null,
            "details": {},
            "timestamp": "2026-01-24T18:25:00Z"
        }
    ]
}
```

### 3.3 Get System Alerts

```http
GET /v1/dashboard/alerts
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
    "status": "success",
    "data": [
        {
            "id": "uuid",
            "level": "warning",
            "title": "High Memory Usage",
            "message": "Memory usage is at 85%",
            "created_at": "2026-01-24T18:00:00Z",
            "is_acknowledged": false
        }
    ]
}
```

---

## 4. Groups Endpoints

### 4.1 List Groups

```http
GET /v1/groups?page=1&per_page=25&search=test&status=active
Authorization: Bearer <access_token>
```

**Query Parameters**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `per_page` | int | 25 | Items per page (max 100) |
| `search` | string | null | Search by name or ID |
| `status` | string | all | Filter: active, inactive, all |
| `sort` | string | created_at | Sort field |
| `order` | string | desc | Sort order: asc, desc |

**Response (200)**
```json
{
    "status": "success",
    "data": [
        {
            "id": "uuid",
            "group_id": -1001234567890,
            "title": "Test Group",
            "member_count": 5000,
            "is_active": true,
            "linked_channels_count": 2,
            "verification_count_today": 150,
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-24T18:00:00Z"
        }
    ],
    "meta": {
        "pagination": {
            "page": 1,
            "per_page": 25,
            "total_items": 42,
            "total_pages": 2
        }
    }
}
```

### 4.2 Get Group Details

```http
GET /v1/groups/{group_id}
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
    "status": "success",
    "data": {
        "id": "uuid",
        "group_id": -1001234567890,
        "title": "Test Group",
        "description": "A test group for development",
        "member_count": 5000,
        "is_active": true,
        "settings": {
            "welcome_message": "Welcome to {group}! Please verify.",
            "restriction_type": "mute",
            "auto_kick_after_hours": null
        },
        "linked_channels": [
            {
                "id": "uuid",
                "channel_id": -1001234567891,
                "title": "Nezuko Channel",
                "is_required": true
            }
        ],
        "stats": {
            "verifications_today": 150,
            "verifications_week": 900,
            "success_rate": 98.5
        },
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-24T18:00:00Z"
    }
}
```

### 4.3 Update Group Settings

```http
PUT /v1/groups/{group_id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
    "is_active": true,
    "settings": {
        "welcome_message": "Welcome! Please verify your membership.",
        "restriction_type": "mute"
    }
}
```

**Response (200)**
```json
{
    "status": "success",
    "data": {
        "id": "uuid",
        "group_id": -1001234567890,
        "is_active": true,
        "settings": { ... },
        "updated_at": "2026-01-24T18:30:00Z"
    }
}
```

### 4.4 Link Channel to Group

```http
POST /v1/groups/{group_id}/channels
Authorization: Bearer <access_token>
Content-Type: application/json

{
    "channel_id": -1001234567892,
    "is_required": true
}
```

**Response (201)**
```json
{
    "status": "success",
    "data": {
        "link_id": "uuid",
        "group_id": -1001234567890,
        "channel_id": -1001234567892,
        "is_required": true,
        "created_at": "2026-01-24T18:30:00Z"
    }
}
```

### 4.5 Unlink Channel from Group

```http
DELETE /v1/groups/{group_id}/channels/{channel_id}
Authorization: Bearer <access_token>
```

**Response (204)**: No content

---

## 5. Channels Endpoints

### 5.1 List Channels

```http
GET /v1/channels?page=1&per_page=25
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
    "status": "success",
    "data": [
        {
            "id": "uuid",
            "channel_id": -1001234567891,
            "title": "Nezuko Channel",
            "username": "@nezuko_channel",
            "subscriber_count": 10000,
            "linked_groups_count": 5,
            "is_public": true,
            "created_at": "2026-01-01T00:00:00Z"
        }
    ],
    "meta": {
        "pagination": { ... }
    }
}
```

### 5.2 Get Channel Details

```http
GET /v1/channels/{channel_id}
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
    "status": "success",
    "data": {
        "id": "uuid",
        "channel_id": -1001234567891,
        "title": "Nezuko Channel",
        "username": "@nezuko_channel",
        "description": "Official Nezuko announcements",
        "subscriber_count": 10000,
        "is_public": true,
        "linked_groups": [
            {
                "id": "uuid",
                "group_id": -1001234567890,
                "title": "Test Group"
            }
        ],
        "stats": {
            "verifications_via_channel": 5000,
            "avg_daily_verifications": 150
        },
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-24T18:00:00Z"
    }
}
```

### 5.3 Add New Channel

```http
POST /v1/channels
Authorization: Bearer <access_token>
Content-Type: application/json

{
    "channel_id": -1001234567892,
    "username": "@new_channel"
}
```

**Response (201)**
```json
{
    "status": "success",
    "data": {
        "id": "uuid",
        "channel_id": -1001234567892,
        "title": "New Channel",
        "username": "@new_channel",
        "subscriber_count": 500,
        "created_at": "2026-01-24T18:30:00Z"
    }
}
```

---

## 6. Configuration Endpoints

### 6.1 Get All Configuration

```http
GET /v1/config
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
    "status": "success",
    "data": {
        "bot": {
            "token": "***MASKED***",
            "webhook_url": "https://yourdomain.me/webhook",
            "webhook_enabled": true
        },
        "database": {
            "url": "postgresql+asyncpg://***@localhost/nezuko",
            "pool_size": 20
        },
        "redis": {
            "url": "redis://localhost:6379/0",
            "connected": true
        },
        "rate_limiting": {
            "global_limit": 25,
            "per_group_limit": 10
        },
        "messages": {
            "welcome_template": "Welcome {{username}} to {{group}}!",
            "verification_prompt": "Please join our channel to continue."
        }
    }
}
```

### 6.2 Update Configuration

```http
PUT /v1/config
Authorization: Bearer <access_token>
Content-Type: application/json

{
    "rate_limiting": {
        "global_limit": 30
    },
    "messages": {
        "welcome_template": "Hello {{username}}! Welcome to {{group}}!"
    }
}
```

**Response (200)**
```json
{
    "status": "success",
    "data": {
        "updated_keys": ["rate_limiting.global_limit", "messages.welcome_template"],
        "restart_required": false
    }
}
```

### 6.3 Test Webhook

```http
POST /v1/config/webhook/test
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
    "status": "success",
    "data": {
        "webhook_url": "https://yourdomain.me/webhook",
        "status": "reachable",
        "latency_ms": 45,
        "ssl_valid": true,
        "ssl_expires_at": "2027-01-24T00:00:00Z"
    }
}
```

---

## 7. Logs Endpoints (REST + WebSocket)

### 7.1 Get Historical Logs

```http
GET /v1/logs?level=ERROR&start=2026-01-24T00:00:00Z&limit=100
Authorization: Bearer <access_token>
```

**Query Parameters**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `level` | string | all | DEBUG, INFO, WARNING, ERROR |
| `start` | datetime | 24h ago | Start timestamp |
| `end` | datetime | now | End timestamp |
| `group_id` | int | null | Filter by group |
| `search` | string | null | Full-text search |
| `limit` | int | 100 | Max logs (up to 1000) |

**Response (200)**
```json
{
    "status": "success",
    "data": [
        {
            "id": "uuid",
            "timestamp": "2026-01-24T18:30:00Z",
            "level": "ERROR",
            "logger": "bot.services.verification",
            "message": "Verification failed: user not found",
            "context": {
                "user_id": 123456789,
                "group_id": -1001234567890
            },
            "traceback": "..."
        }
    ],
    "meta": {
        "total_matching": 45,
        "returned": 45
    }
}
```

### 7.2 WebSocket Log Streaming

```
WS /v1/ws/logs
Authorization: Bearer <access_token> (as query param or header)
```

**Client → Server (Subscribe)**
```json
{
    "action": "subscribe",
    "filters": {
        "levels": ["ERROR", "WARNING"],
        "group_id": null
    }
}
```

**Server → Client (Log Entry)**
```json
{
    "type": "log",
    "data": {
        "timestamp": "2026-01-24T18:30:00.123Z",
        "level": "ERROR",
        "logger": "bot.services.verification",
        "message": "Verification failed",
        "context": { ... }
    }
}
```

**Client → Server (Unsubscribe)**
```json
{
    "action": "unsubscribe"
}
```

---

## 8. Database Endpoints

### 8.1 List Tables

```http
GET /v1/database/tables
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
    "status": "success",
    "data": [
        {
            "name": "protected_groups",
            "row_count": 42,
            "size_bytes": 102400,
            "columns": ["id", "group_id", "title", "is_active", "created_at"]
        },
        {
            "name": "enforced_channels",
            "row_count": 15,
            "size_bytes": 51200,
            "columns": ["id", "channel_id", "title", "created_at"]
        }
    ]
}
```

### 8.2 Browse Table Data

```http
GET /v1/database/tables/{table_name}?page=1&per_page=50
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
    "status": "success",
    "data": {
        "columns": [
            { "name": "id", "type": "integer", "nullable": false },
            { "name": "group_id", "type": "bigint", "nullable": false },
            { "name": "title", "type": "varchar(255)", "nullable": true }
        ],
        "rows": [
            { "id": 1, "group_id": -1001234567890, "title": "Test Group" }
        ]
    },
    "meta": {
        "pagination": { ... }
    }
}
```

### 8.3 Export Table

```http
GET /v1/database/tables/{table_name}/export?format=csv
Authorization: Bearer <access_token>
```

**Response (200)**: File download (CSV or JSON)

### 8.4 Get Migration Status

```http
GET /v1/database/migrations
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
    "status": "success",
    "data": {
        "current_revision": "abc123",
        "head_revision": "abc123",
        "pending_migrations": [],
        "history": [
            {
                "revision": "abc123",
                "description": "add_admin_tables",
                "applied_at": "2026-01-24T00:00:00Z"
            }
        ]
    }
}
```

---

## 9. Analytics Endpoints

### 9.1 Get User Growth Data

```http
GET /v1/analytics/users?period=30d&granularity=day
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
    "status": "success",
    "data": {
        "period": "30d",
        "granularity": "day",
        "series": [
            { "date": "2026-01-01", "new_users": 50, "total_users": 1000 },
            { "date": "2026-01-02", "new_users": 45, "total_users": 1045 }
        ],
        "summary": {
            "total_new_users": 1500,
            "growth_rate": 15.5
        }
    }
}
```

### 9.2 Get Verification Trends

```http
GET /v1/analytics/verifications?period=7d&granularity=hour
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
    "status": "success",
    "data": {
        "period": "7d",
        "series": [
            {
                "timestamp": "2026-01-24T00:00:00Z",
                "total": 150,
                "successful": 145,
                "failed": 5
            }
        ],
        "summary": {
            "total_verifications": 10500,
            "success_rate": 98.5,
            "peak_hour": 14,
            "peak_day": "Monday"
        }
    }
}
```

---

## 10. Health Endpoints

### 10.1 Health Check

```http
GET /v1/health
```

**Response (200)**: (No auth required)
```json
{
    "status": "healthy",
    "version": "1.0.0",
    "checks": {
        "database": { "status": "up", "latency_ms": 5 },
        "redis": { "status": "up", "latency_ms": 2 },
        "bot": { "status": "up" }
    }
}
```

### 10.2 Readiness Check

```http
GET /v1/health/ready
```

**Response (200)**: `{ "ready": true }`

### 10.3 Liveness Check

```http
GET /v1/health/live
```

**Response (200)**: `{ "alive": true }`

---

## 11. OpenAPI Schema

The full OpenAPI 3.1 schema is auto-generated and available at:

- **Swagger UI**: `https://api.yourdomain.me/docs`
- **ReDoc**: `https://api.yourdomain.me/redoc`
- **JSON Schema**: `https://api.yourdomain.me/openapi.json`

---

[← Back to Tech Stack](./03-TECH-STACK.md) | [Back to Index](./README.md) | [Next: UI Wireframes →](./05-UI-WIREFRAMES.md)
