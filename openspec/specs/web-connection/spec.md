# Spec: Web Dashboard Connection

## Overview

Configure the web dashboard to connect to the real API and display live data from the bot's verification activities.

## MODIFIED Configuration

### Feature: Disable Mock Mode

**Purpose**: Switch from mock data to real API data

**File**: `apps/web/.env.local`

```bash
# BEFORE (Mock Mode)
NEXT_PUBLIC_USE_MOCK=true
NEXT_PUBLIC_API_URL=

# AFTER (Real API Mode)
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

### Feature: Production Environment

**File**: `apps/web/.env.production`

```bash
# Production settings
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=https://api.nezuko.bot

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

---

## MODIFIED Files

### File: apps/web/src/lib/api/config.ts

**Update Configuration Logic**:

```typescript
/**
 * API Configuration
 * Controls mock vs real API mode
 */

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export function getConfig() {
  return {
    useMock: USE_MOCK,
    apiUrl: API_URL,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  };
}

// Log configuration on app load (dev only)
if (process.env.NODE_ENV === "development") {
  console.log("[Nezuko Config]", {
    useMock: USE_MOCK,
    apiUrl: API_URL,
  });
}
```

---

### File: apps/web/src/lib/services/dashboard.service.ts

**Ensure Mock Toggle Works**:

```typescript
import { USE_MOCK, API_URL } from "@/lib/api/config";
import { apiClient } from "@/lib/api/client";
import type { DashboardStats, ActivityItem, ChartDataPoint } from "./types";
import * as mockData from "@/lib/mock";

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    if (USE_MOCK) {
      return mockData.getDashboardStats();
    }
    return apiClient.get<DashboardStats>("/api/v1/dashboard/stats");
  },

  async getActivity(limit: number = 10): Promise<ActivityItem[]> {
    if (USE_MOCK) {
      return mockData.getActivity(limit);
    }
    const response = await apiClient.get<{ items: ActivityItem[] }>("/api/v1/dashboard/activity", {
      params: { limit },
    });
    return response.items;
  },

  async getChartData(days: number = 30): Promise<ChartDataPoint[]> {
    if (USE_MOCK) {
      return mockData.getChartData(days);
    }
    const response = await apiClient.get<{ series: ChartDataPoint[] }>(
      "/api/v1/dashboard/chart-data",
      { params: { days } }
    );
    return response.series;
  },
};
```

---

### File: apps/web/src/lib/services/charts.service.ts

**Already Implemented - Verify Toggle Works**:

All chart services already check `USE_MOCK` flag:

```typescript
export async function getVerificationDistribution(): Promise<VerificationDistribution> {
  if (USE_MOCK) {
    return mockData.getVerificationDistribution();
  }
  // Real API call - this will work once API implements endpoint
  const response = await apiClient.get<SuccessResponse<VerificationDistribution>>(
    ENDPOINTS.charts.verificationDistribution
  );
  return response.data;
}
```

---

## Validation Checklist

### Before Deployment

| Check           | Command                               | Expected          |
| --------------- | ------------------------------------- | ----------------- |
| Web builds      | `cd apps/web && bun run build`        | ✓ No errors       |
| API runs        | `cd apps/api && uvicorn src.main:app` | ✓ Starts on 8080  |
| Bot runs        | `python -m apps.bot.main`             | ✓ Starts polling  |
| Mock mode works | Set `USE_MOCK=true`                   | ✓ Shows fake data |
| Real mode works | Set `USE_MOCK=false`                  | ✓ Shows real data |

### API Endpoint Validation

| Endpoint                                       | Expected Status | Notes             |
| ---------------------------------------------- | --------------- | ----------------- |
| `GET /api/v1/dashboard/stats`                  | 200             | ✅ Already exists |
| `GET /api/v1/groups`                           | 200             | ✅ Already exists |
| `GET /api/v1/channels`                         | 200             | ✅ Already exists |
| `GET /api/v1/analytics/verifications/trends`   | 200             | ✅ Already exists |
| `GET /api/v1/charts/verification-distribution` | 200             | 🆕 To implement   |
| `GET /api/v1/charts/cache-breakdown`           | 200             | 🆕 To implement   |
| `GET /api/v1/charts/groups-status`             | 200             | 🆕 To implement   |
| `GET /api/v1/charts/api-calls`                 | 200             | 🆕 To implement   |
| `GET /api/v1/charts/hourly-activity`           | 200             | 🆕 To implement   |
| `GET /api/v1/charts/latency-distribution`      | 200             | 🆕 To implement   |
| `GET /api/v1/charts/top-groups`                | 200             | 🆕 To implement   |
| `GET /api/v1/charts/cache-hit-rate-trend`      | 200             | 🆕 To implement   |
| `GET /api/v1/charts/latency-trend`             | 200             | 🆕 To implement   |
| `GET /api/v1/charts/bot-health`                | 200             | 🆕 To implement   |

---

## Error Handling

### Network Errors

Web should gracefully handle API unavailability:

```typescript
// apps/web/src/lib/hooks/use-dashboard.ts
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: dashboardService.getStats,
    staleTime: 30 * 1000, // 30 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
```

### Auth Errors

Redirect to login on 401:

```typescript
// Already in apiClient.get()
if (response.status === 401) {
  window.location.href = "/login";
  throw new Error("Unauthorized");
}
```

### Chart Data Fallback

Show empty state instead of error for charts:

```tsx
// components/charts/verification-distribution-chart.tsx
export function VerificationDistributionChart() {
  const { data, isPending, isError } = useVerificationDistribution();

  if (isPending) return <ChartSkeleton />;
  if (isError || !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No verification data available</p>
        </CardContent>
      </Card>
    );
  }

  return <DonutChart data={data} />;
}
```

---

## CORS Configuration

### API CORS Settings

**File**: `apps/api/src/main.py`

```python
from fastapi.middleware.cors import CORSMiddleware

# CORS configuration
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    # Production domains
    "https://admin.nezuko.bot",
    "https://dashboard.nezuko.bot",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Or via environment:

```bash
# apps/api/.env
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,https://admin.nezuko.bot
```

---

## Local Development Flow

### Start All Services

```bash
# Terminal 1: API
cd apps/api
uvicorn src.main:app --reload --port 8080

# Terminal 2: Web Dashboard
cd apps/web
bun dev  # Runs on localhost:3000 or 3001

# Terminal 3: Bot (optional - generates data)
python -m apps.bot.main
```

### Verify Data Flow

1. **Bot generates data**: Use `/protect @channel` in a test group
2. **API serves data**: Visit `http://localhost:8080/docs` to test endpoints
3. **Web displays data**: Navigate to `http://localhost:3000/dashboard`

---

## Production Deployment

### Environment Variables Summary

| App     | Variable                        | Example Value              |
| ------- | ------------------------------- | -------------------------- |
| **Web** | `NEXT_PUBLIC_USE_MOCK`          | `false`                    |
| **Web** | `NEXT_PUBLIC_API_URL`           | `https://api.nezuko.bot`   |
| **Web** | `NEXT_PUBLIC_SUPABASE_URL`      | `https://xxx.supabase.co`  |
| **Web** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...`                   |
| **API** | `MOCK_AUTH`                     | `false`                    |
| **API** | `DATABASE_URL`                  | `postgresql+asyncpg://...` |
| **API** | `SUPABASE_JWT_SECRET`           | `your-secret`              |
| **Bot** | `BOT_TOKEN`                     | `123456:ABC...`            |
| **Bot** | `DATABASE_URL`                  | `postgresql+asyncpg://...` |
