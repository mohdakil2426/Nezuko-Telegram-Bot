# 📊 Charts API Reference

> **Complete documentation for Nezuko Admin API chart endpoints**

All chart endpoints provide analytics data for the admin dashboard visualizations.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
4. [Rate Limiting](#rate-limiting)
5. [Error Handling](#error-handling)

---

## Overview

The Charts API provides 10 endpoints for different analytics visualizations:

| Category         | Endpoints                                      | Use Case         |
| ---------------- | ---------------------------------------------- | ---------------- |
| **Distribution** | verification, cache, groups, api-calls, hourly | Pie/bar charts   |
| **Histogram**    | latency-distribution                           | Latency buckets  |
| **Ranking**      | top-groups                                     | Leaderboard      |
| **Trends**       | cache-hit-rate-trend, latency-trend            | Time series      |
| **Health**       | bot-health                                     | Dashboard gauges |

### Base URL

```
https://api.nezuko.bot/api/v1/charts
```

### Response Format

All endpoints return JSON in this structure:

```json
{
  "data": { ... },
  "success": true
}
```

---

## Authentication

All chart endpoints require Bearer token authentication.

### Request Header

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Unauthorized Response

```json
{
  "detail": "Could not validate credentials"
}
```

---

## Endpoints

### 1. Verification Distribution

**GET** `/verification-distribution`

Returns verification outcome distribution for the last 7 days.

**Response:**

```json
{
  "data": {
    "verified": 1250,
    "restricted": 45,
    "error": 12,
    "total": 1307
  }
}
```

| Field        | Type | Description                 |
| ------------ | ---- | --------------------------- |
| `verified`   | int  | Successful verifications    |
| `restricted` | int  | Users restricted            |
| `error`      | int  | Verification errors         |
| `total`      | int  | Total verification attempts |

---

### 2. Cache Breakdown

**GET** `/cache-breakdown`

Returns cache hit vs API call breakdown for the last 7 days.

**Response:**

```json
{
  "data": {
    "cached": 850,
    "api": 457,
    "total": 1307,
    "hit_rate": 65.0
  }
}
```

| Field      | Type  | Description                  |
| ---------- | ----- | ---------------------------- |
| `cached`   | int   | Cache hits count             |
| `api`      | int   | Direct API calls             |
| `total`    | int   | Total requests               |
| `hit_rate` | float | Cache hit percentage (0-100) |

---

### 3. Groups Status Distribution

**GET** `/groups-status`

Returns active vs inactive protected groups count.

**Response:**

```json
{
  "data": {
    "active": 42,
    "inactive": 8,
    "total": 50
  }
}
```

---

### 4. API Calls Distribution

**GET** `/api-calls`

Returns Telegram API call distribution by method for the last 7 days.

**Response:**

```json
{
  "data": [
    { "method": "getChatMember", "count": 1250, "success_rate": 98.5 },
    { "method": "restrictChatMember", "count": 45, "success_rate": 100.0 },
    { "method": "banChatMember", "count": 12, "success_rate": 100.0 }
  ]
}
```

---

### 5. Hourly Activity

**GET** `/hourly-activity`

Returns 24-hour activity distribution.

**Response:**

```json
{
  "data": [
    { "hour": 0, "label": "12 AM", "verifications": 45, "restrictions": 2 },
    { "hour": 1, "label": "1 AM", "verifications": 32, "restrictions": 1 },
    ...
    { "hour": 23, "label": "11 PM", "verifications": 67, "restrictions": 3 }
  ]
}
```

Returns exactly 24 entries (hours 0-23).

---

### 6. Latency Distribution

**GET** `/latency-distribution`

Returns latency bucket histogram for the last 7 days.

**Response:**

```json
{
  "data": [
    { "bucket": "<50ms", "count": 450, "percentage": 45.0 },
    { "bucket": "50-100ms", "count": 320, "percentage": 32.0 },
    { "bucket": "100-200ms", "count": 150, "percentage": 15.0 },
    { "bucket": "200-500ms", "count": 60, "percentage": 6.0 },
    { "bucket": ">500ms", "count": 20, "percentage": 2.0 }
  ]
}
```

---

### 7. Top Groups

**GET** `/top-groups`

Returns top groups by verification count for the last 7 days.

**Query Parameters:**

| Parameter | Type | Default | Range | Description                |
| --------- | ---- | ------- | ----- | -------------------------- |
| `limit`   | int  | 10      | 1-20  | Number of groups to return |

**Example Request:**

```bash
GET /api/v1/charts/top-groups?limit=5
```

**Response:**

```json
{
  "data": [
    {
      "group_id": -1001234567890,
      "group_name": "Crypto Trading",
      "verification_count": 456,
      "avg_latency_ms": 85.5,
      "success_rate": 98.2
    },
    {
      "group_id": -1009876543210,
      "group_name": "NFT Collectors",
      "verification_count": 234,
      "avg_latency_ms": 92.1,
      "success_rate": 99.1
    }
  ]
}
```

---

### 8. Cache Hit Rate Trend

**GET** `/cache-hit-rate-trend`

Returns cache hit rate trend over time.

**Query Parameters:**

| Parameter | Type   | Default | Options            | Description |
| --------- | ------ | ------- | ------------------ | ----------- |
| `period`  | string | "30d"   | "7d", "30d", "90d" | Time period |

**Example Request:**

```bash
GET /api/v1/charts/cache-hit-rate-trend?period=7d
```

**Response:**

```json
{
  "data": {
    "period": "7d",
    "points": [
      { "date": "2026-01-28", "hit_rate": 62.5 },
      { "date": "2026-01-29", "hit_rate": 64.2 },
      { "date": "2026-01-30", "hit_rate": 65.8 },
      { "date": "2026-01-31", "hit_rate": 67.1 },
      { "date": "2026-02-01", "hit_rate": 68.5 },
      { "date": "2026-02-02", "hit_rate": 66.2 },
      { "date": "2026-02-03", "hit_rate": 69.0 }
    ],
    "current_rate": 69.0,
    "average_rate": 66.2
  }
}
```

---

### 9. Latency Trend

**GET** `/latency-trend`

Returns average and p95 latency trend over time.

**Query Parameters:**

| Parameter | Type   | Default | Options            | Description |
| --------- | ------ | ------- | ------------------ | ----------- |
| `period`  | string | "30d"   | "7d", "30d", "90d" | Time period |

**Example Request:**

```bash
GET /api/v1/charts/latency-trend?period=30d
```

**Response:**

```json
{
  "data": {
    "period": "30d",
    "points": [
      { "date": "2026-01-05", "avg_ms": 85.2, "p95_ms": 145.8 },
      { "date": "2026-01-06", "avg_ms": 82.1, "p95_ms": 138.2 },
      ...
    ],
    "current_avg": 78.5,
    "current_p95": 125.3
  }
}
```

---

### 10. Bot Health Metrics

**GET** `/bot-health`

Returns composite bot health metrics for dashboard gauges.

**Response:**

```json
{
  "data": {
    "uptime_percent": 99.95,
    "cache_efficiency": 68.5,
    "success_rate": 98.7,
    "avg_latency_score": 85.0,
    "error_rate": 1.3,
    "overall_score": 88.4
  }
}
```

| Field               | Type  | Range | Description               |
| ------------------- | ----- | ----- | ------------------------- |
| `uptime_percent`    | float | 0-100 | Bot uptime percentage     |
| `cache_efficiency`  | float | 0-100 | Cache hit rate            |
| `success_rate`      | float | 0-100 | Verification success rate |
| `avg_latency_score` | float | 0-100 | Latency quality score     |
| `error_rate`        | float | 0-100 | Error percentage          |
| `overall_score`     | float | 0-100 | Composite health score    |

---

## Rate Limiting

Chart endpoints have the following rate limits:

| Tier           | Limit        | Window   |
| -------------- | ------------ | -------- |
| Standard       | 100 requests | 1 minute |
| Heavy (trends) | 20 requests  | 1 minute |

**Rate Limit Headers:**

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706821200
```

**Rate Limited Response (429):**

```json
{
  "detail": "Rate limit exceeded. Try again in 45 seconds."
}
```

---

## Error Handling

### Common Error Responses

| Status | Reason                   | Response                                                    |
| ------ | ------------------------ | ----------------------------------------------------------- |
| 401    | Invalid/missing token    | `{"detail": "Could not validate credentials"}`              |
| 403    | Insufficient permissions | `{"detail": "Not authorized"}`                              |
| 422    | Invalid parameters       | `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}` |
| 429    | Rate limited             | `{"detail": "Rate limit exceeded"}`                         |
| 500    | Server error             | `{"detail": "Internal server error"}`                       |

### Parameter Validation Errors

```json
{
  "detail": [
    {
      "loc": ["query", "limit"],
      "msg": "ensure this value is less than or equal to 20",
      "type": "value_error.number.not_le"
    }
  ]
}
```

---

## Related Documentation

- [**Deployment Guide**](../deployment/README.md) - Production setup
- [**API Overview**](./README.md) - General API reference
- [**Authentication**](./README.md#authentication) - JWT authentication flow

---

_Last updated: 2026-02-04_
