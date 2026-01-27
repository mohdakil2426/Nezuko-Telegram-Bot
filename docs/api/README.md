# 📊 API Reference

> **Complete documentation for the Nezuko REST API**

The Nezuko API provides programmatic access to manage protected groups, channels, and monitor bot activity. Built with FastAPI, it offers automatic OpenAPI documentation, async performance, and comprehensive error handling.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [Error Handling](#error-handling)
5. [Endpoints](#endpoints)
6. [WebSocket](#websocket)
7. [Rate Limiting](#rate-limiting)

---

## Overview

The API follows RESTful conventions with:

- **JSON** request/response bodies
- **JWT Bearer** authentication
- **Versioned** endpoints (`/api/v1/`)
- **OpenAPI 3.0** documentation

### Quick Access

| Resource | Description |
|----------|-------------|
| **Swagger UI** | `http://localhost:8080/docs` |
| **ReDoc** | `http://localhost:8080/redoc` |
| **OpenAPI JSON** | `http://localhost:8080/openapi.json` |

---

## Base URL

```
Development: http://localhost:8080/api/v1
Production:  https://api.nezuko.bot/api/v1
```

---

## Authentication

### JWT Bearer Token

All protected endpoints require a valid JWT token from Supabase Auth:

```bash
curl -X GET "http://localhost:8080/api/v1/groups" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Obtaining a Token

1. **Via Supabase Auth** (Recommended):
   ```typescript
   const { data, error } = await supabase.auth.signInWithPassword({
     email: 'admin@example.com',
     password: 'your-password'
   });
   const token = data.session?.access_token;
   ```

2. **Development Mode** (`MOCK_AUTH=true`):
   - No token required
   - All requests authenticated as `dev-user`

### Token Structure

```json
{
  "aud": "authenticated",
  "exp": 1706389200,
  "iat": 1706385600,
  "sub": "user-uuid",
  "email": "admin@example.com",
  "role": "authenticated"
}
```

---

## Error Handling

### Error Response Format

```json
{
  "detail": {
    "code": "AUTH_001",
    "message": "Invalid or expired token",
    "timestamp": "2026-01-27T12:00:00Z"
  }
}
```

### HTTP Status Codes

| Code | Description | When |
|------|-------------|------|
| `200` | Success | Request completed successfully |
| `201` | Created | Resource created |
| `400` | Bad Request | Invalid input data |
| `401` | Unauthorized | Missing or invalid token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Duplicate resource |
| `422` | Validation Error | Invalid request schema |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Error | Server error |

### Error Codes

| Code | Domain | Description |
|------|--------|-------------|
| `AUTH_001` | Auth | Invalid/expired token |
| `AUTH_002` | Auth | User not in admin_users |
| `AUTH_003` | Auth | Invalid credentials |
| `DB_001` | Database | Connection pool exhausted |
| `DB_002` | Database | Duplicate Telegram ID |
| `VALIDATION_001` | Input | Missing required field |
| `NOT_FOUND_001` | Resource | Group not found |
| `NOT_FOUND_002` | Resource | Channel not found |

---

## Endpoints

### Authentication

#### POST `/auth/verify`

Verify JWT token and get user info.

**Request:**
```bash
curl -X POST "http://localhost:8080/api/v1/auth/verify" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "uid": "user-uuid",
  "email": "admin@example.com",
  "role": "authenticated"
}
```

---

### Dashboard

#### GET `/dashboard/stats`

Get dashboard statistics.

**Response:**
```json
{
  "total_groups": 150,
  "active_groups": 142,
  "total_channels": 45,
  "total_verifications": 15420,
  "verification_rate": 94.5,
  "recent_activity": [...]
}
```

#### GET `/dashboard/activity`

Get recent activity timeline.

**Response:**
```json
{
  "activities": [
    {
      "id": "act-1",
      "type": "verification",
      "user_id": 123456789,
      "group_id": -1001234567890,
      "status": "success",
      "timestamp": "2026-01-27T12:00:00Z"
    }
  ]
}
```

---

### Groups

#### GET `/groups`

List all protected groups.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page |
| `search` | string | - | Search by title |
| `enabled` | bool | - | Filter by status |

**Response:**
```json
{
  "items": [
    {
      "group_id": -1001234567890,
      "title": "My Community",
      "owner_id": 123456789,
      "enabled": true,
      "channel_count": 2,
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "pages": 8
}
```

#### GET `/groups/{group_id}`

Get single group details.

**Response:**
```json
{
  "group_id": -1001234567890,
  "title": "My Community",
  "owner_id": 123456789,
  "owner_username": "@owner",
  "enabled": true,
  "params": {
    "welcome_message": "Welcome! Please verify.",
    "kick_timeout": 300
  },
  "channels": [
    {
      "channel_id": -1009876543210,
      "title": "Official Channel",
      "username": "@officialchannel"
    }
  ],
  "stats": {
    "total_verifications": 532,
    "success_rate": 95.2
  }
}
```

#### POST `/groups`

Create a new protected group.

**Request Body:**
```json
{
  "group_id": -1001234567890,
  "owner_id": 123456789,
  "title": "My Community",
  "enabled": true,
  "params": {}
}
```

#### PUT `/groups/{group_id}`

Update group settings.

**Request Body:**
```json
{
  "enabled": true,
  "params": {
    "welcome_message": "Updated welcome!"
  }
}
```

#### DELETE `/groups/{group_id}`

Delete a protected group.

**Response:** `204 No Content`

---

### Channels

#### GET `/channels`

List all enforced channels.

**Response:**
```json
{
  "items": [
    {
      "channel_id": -1009876543210,
      "title": "Official Channel",
      "username": "@officialchannel",
      "invite_link": "https://t.me/+abc123",
      "group_count": 5
    }
  ],
  "total": 45
}
```

#### GET `/channels/{channel_id}`

Get channel details.

#### POST `/channels`

Create a new channel.

#### DELETE `/channels/{channel_id}`

Delete a channel.

---

### Analytics

#### GET `/analytics/summary`

Get analytics summary.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period` | string | 7d | Time period (1d, 7d, 30d, 90d) |

**Response:**
```json
{
  "period": "7d",
  "verifications": {
    "total": 1523,
    "success": 1456,
    "failed": 67,
    "rate": 95.6
  },
  "groups": {
    "total": 150,
    "active": 142,
    "new": 8
  },
  "timeline": [
    {
      "date": "2026-01-27",
      "verifications": 245,
      "success_rate": 96.3
    }
  ]
}
```

---

### Database

#### GET `/database/tables`

List all database tables.

**Response:**
```json
{
  "tables": [
    {
      "name": "protected_groups",
      "row_count": 150,
      "columns": [
        {"name": "group_id", "type": "bigint", "nullable": false}
      ]
    }
  ]
}
```

#### GET `/database/tables/{table_name}/data`

Get table data with pagination.

**Query Parameters:**
| Parameter | Type | Default |
|-----------|------|---------|
| `page` | int | 1 |
| `limit` | int | 50 |

---

### Logs

#### GET `/logs`

Get recent log entries.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `level` | string | Filter by level (DEBUG, INFO, WARN, ERROR) |
| `limit` | int | Max entries (default: 100) |

---

### Audit

#### GET `/audit`

Get audit log entries.

**Response:**
```json
{
  "entries": [
    {
      "id": "audit-1",
      "user_id": "admin-uuid",
      "action": "group.update",
      "resource_type": "group",
      "resource_id": "-1001234567890",
      "changes": {"enabled": [false, true]},
      "ip_address": "192.168.1.1",
      "timestamp": "2026-01-27T12:00:00Z"
    }
  ]
}
```

---

### Admin Users

#### GET `/admins`

List all admin users.

#### POST `/admins`

Add new admin user.

#### DELETE `/admins/{user_id}`

Remove admin user.

---

## WebSocket

### Real-time Logs

Connect to receive live log updates:

```javascript
const ws = new WebSocket('ws://localhost:8080/api/v1/ws/logs?token=YOUR_TOKEN');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'log') {
    console.log('New log:', message.data);
  } else if (message.type === 'heartbeat') {
    // Connection alive
  }
};

// Apply filter
ws.send(JSON.stringify({
  action: 'filter',
  level: 'ERROR'
}));
```

### Message Types

| Type | Description |
|------|-------------|
| `log` | New log entry |
| `heartbeat` | Keep-alive ping (every 30s) |
| `filter_updated` | Filter applied |
| `error` | Error message |

### WebSocket Status

```bash
# Check WebSocket status
curl http://localhost:8080/api/v1/ws/status
```

**Response:**
```json
{
  "active_connections": 3,
  "status": "healthy"
}
```

---

## Rate Limiting

API requests are rate-limited to prevent abuse:

| Endpoint | Limit |
|----------|-------|
| General | 100 req/min |
| Auth | 20 req/min |
| WebSocket | 10 connections |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706389260
```

### Handling 429 Responses

```json
{
  "detail": {
    "code": "RATE_LIMIT",
    "message": "Too many requests",
    "retry_after": 30
  }
}
```

---

## Examples

### cURL - List Groups

```bash
curl -X GET "http://localhost:8080/api/v1/groups?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Python - Create Group

```python
import httpx

async def create_group(token: str, group_data: dict):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8080/api/v1/groups",
            json=group_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        return response.json()
```

### TypeScript - Fetch Dashboard

```typescript
async function fetchDashboard(token: string) {
  const response = await fetch(
    'http://localhost:8080/api/v1/dashboard/stats',
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.json();
}
```

---

## Next Steps

- [**Authentication Details**](./authentication.md)
- [**WebSocket Guide**](./websocket.md)
- [**Error Codes**](./errors.md)

---

*Interactive API documentation available at [localhost:8080/docs](http://localhost:8080/docs)*
