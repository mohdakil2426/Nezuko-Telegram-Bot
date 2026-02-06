# Spec: API Charts Endpoints

## Overview

Implementation of 10 chart endpoints in the FastAPI backend to provide real analytics data to the web dashboard.

## ADDED Endpoints

### Endpoint: GET /api/v1/charts/verification-distribution

**Purpose**: Return count of verification outcomes (verified, restricted, error) for the past 7 days

**Request**:

- Method: `GET`
- Auth: Required (Bearer JWT)
- Query Params: None

**Response**:

```json
{
  "status": "success",
  "data": {
    "verified": 8542,
    "restricted": 623,
    "error": 87,
    "total": 9252
  }
}
```

**Database Query**:

- Source: `verification_log` table
- Filter: `timestamp >= NOW() - INTERVAL '7 days'`
- Aggregation: COUNT(\*) GROUP BY status

---

### Endpoint: GET /api/v1/charts/cache-breakdown

**Purpose**: Return cache hit vs API call breakdown

**Response**:

```json
{
  "status": "success",
  "data": {
    "cached": 8120,
    "api": 1132,
    "total": 9252,
    "hit_rate": 87.77
  }
}
```

**Database Query**:

- Source: `verification_log` table
- Aggregation: COUNT(\*) WHERE cached = true/false

---

### Endpoint: GET /api/v1/charts/groups-status

**Purpose**: Return active vs inactive protected groups count

**Response**:

```json
{
  "status": "success",
  "data": {
    "active": 22,
    "inactive": 3,
    "total": 25
  }
}
```

**Database Query**:

- Source: `protected_groups` table
- Aggregation: COUNT(\*) WHERE enabled = true/false

---

### Endpoint: GET /api/v1/charts/api-calls

**Purpose**: Return Telegram API call distribution by method

**Response**:

```json
{
  "status": "success",
  "data": [
    { "method": "getChatMember", "count": 6234, "percentage": 67.3 },
    { "method": "restrictChatMember", "count": 823, "percentage": 8.9 },
    { "method": "sendMessage", "count": 1456, "percentage": 15.7 },
    { "method": "deleteMessage", "count": 412, "percentage": 4.5 },
    { "method": "getChat", "count": 334, "percentage": 3.6 }
  ]
}
```

**Database Query**:

- Source: `api_call_log` table (NEW)
- Filter: `timestamp >= NOW() - INTERVAL '7 days'`
- Aggregation: COUNT(\*) GROUP BY method ORDER BY count DESC

---

### Endpoint: GET /api/v1/charts/hourly-activity

**Purpose**: Return 24-hour activity distribution

**Response**:

```json
{
  "status": "success",
  "data": [
    { "hour": 0, "label": "00:00", "verifications": 45, "restrictions": 3 },
    { "hour": 1, "label": "01:00", "verifications": 32, "restrictions": 2 },
    ...
    { "hour": 23, "label": "23:00", "verifications": 78, "restrictions": 5 }
  ]
}
```

**Database Query**:

- Source: `verification_log` table
- Filter: `timestamp >= NOW() - INTERVAL '24 hours'`
- Aggregation: GROUP BY EXTRACT(hour FROM timestamp)

---

### Endpoint: GET /api/v1/charts/latency-distribution

**Purpose**: Return latency bucket distribution

**Response**:

```json
{
  "status": "success",
  "data": [
    { "bucket": "<50ms", "count": 4521, "percentage": 48.9 },
    { "bucket": "50-100ms", "count": 2834, "percentage": 30.6 },
    { "bucket": "100-200ms", "count": 1245, "percentage": 13.5 },
    { "bucket": "200-500ms", "count": 523, "percentage": 5.7 },
    { "bucket": ">500ms", "count": 129, "percentage": 1.4 }
  ]
}
```

**Database Query**:

- Source: `verification_log` table
- Aggregation: CASE WHEN latency_ms < 50 THEN '<50ms' ... GROUP BY bucket

---

### Endpoint: GET /api/v1/charts/top-groups

**Purpose**: Return top 10 groups by verification count

**Query Params**:

- `limit`: int (default: 10, max: 20)

**Response**:

```json
{
  "status": "success",
  "data": [
    { "group_id": 1001234567, "title": "Crypto Signals VIP", "verifications": 1823, "success_rate": 94.2 },
    { "group_id": 1002345678, "title": "Trading Masters", "verifications": 1456, "success_rate": 91.8 },
    ...
  ]
}
```

**Database Query**:

- Source: `verification_log` JOIN `protected_groups`
- Aggregation: GROUP BY group_id, ORDER BY COUNT(\*) DESC LIMIT 10

---

### Endpoint: GET /api/v1/charts/cache-hit-rate-trend

**Purpose**: Return cache hit rate over time

**Query Params**:

- `period`: "7d" | "30d" | "90d" (default: "30d")

**Response**:

```json
{
  "status": "success",
  "data": {
    "period": "30d",
    "series": [
      { "date": "2026-01-05", "value": 87.3 },
      { "date": "2026-01-06", "value": 89.1 },
      ...
    ],
    "current_rate": 88.5,
    "average_rate": 87.9
  }
}
```

**Database Query**:

- Source: `verification_log` table
- Aggregation: Daily cache hit rate = SUM(cached) / COUNT(_) _ 100

---

### Endpoint: GET /api/v1/charts/latency-trend

**Purpose**: Return average and p95 latency over time

**Query Params**:

- `period`: "7d" | "30d" | "90d" (default: "30d")

**Response**:

```json
{
  "status": "success",
  "data": {
    "period": "30d",
    "series": [
      { "date": "2026-01-05", "avg_latency": 67, "p95_latency": 142 },
      { "date": "2026-01-06", "avg_latency": 72, "p95_latency": 156 },
      ...
    ],
    "current_avg": 69
  }
}
```

**Database Query**:

- Source: `verification_log` table
- Aggregation: AVG(latency_ms), PERCENTILE_CONT(0.95) GROUP BY date

---

### Endpoint: GET /api/v1/charts/bot-health

**Purpose**: Return composite bot health score

**Response**:

```json
{
  "status": "success",
  "data": {
    "uptime_percent": 99.8,
    "cache_efficiency": 88.5,
    "success_rate": 94.2,
    "avg_latency_score": 78.5,
    "error_rate": 1.2,
    "overall_score": 91.3
  }
}
```

**Calculation**:

- uptime_percent: From Redis/in-memory (bot start time vs now)
- cache_efficiency: From verification_log cached stats
- success_rate: From verification_log status stats
- avg_latency_score: 100 - (avg_latency / 2), clamped 0-100
- error_rate: error_count / total_count \* 100
- overall_score: Weighted average of above metrics

## Files to Create

| File                                      | Purpose                  |
| ----------------------------------------- | ------------------------ |
| `apps/api/src/schemas/charts.py`          | Pydantic response models |
| `apps/api/src/services/charts_service.py` | Database query logic     |
| `apps/api/src/api/v1/endpoints/charts.py` | FastAPI endpoints        |

## Files to Modify

| File                                | Change                |
| ----------------------------------- | --------------------- |
| `apps/api/src/api/v1/router.py`     | Add charts router     |
| `apps/api/src/services/__init__.py` | Export charts_service |
| `apps/api/src/schemas/__init__.py`  | Export chart schemas  |
