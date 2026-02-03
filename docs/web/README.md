# 🌐 Web Dashboard Reference

> **Complete documentation for the Nezuko Admin Dashboard**

The Nezuko Admin Dashboard is a modern web application built with Next.js 16 and pure shadcn/ui components, providing a comprehensive interface for managing protected groups, monitoring bot activity, and analyzing verification metrics.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Pages & Routes](#pages--routes)
3. [Components](#components)
4. [State Management](#state-management)
5. [API Integration](#api-integration)
6. [Styling](#styling)
7. [Development](#development)

---

## Overview

### Tech Stack

| Technology         | Version | Purpose                      |
| ------------------ | ------- | ---------------------------- |
| **Next.js**        | 16.1.6  | React framework (App Router) |
| **React**          | 19.2.3  | UI library                   |
| **TypeScript**     | 5.8+    | Type safety                  |
| **Tailwind CSS**   | 4.1.x   | Styling                      |
| **shadcn/ui**      | Latest  | UI components (100%)         |
| **TanStack Query** | 5.90+   | Server state                 |
| **TanStack Table** | 8.21+   | Data tables                  |
| **Recharts**       | 2.15+   | Charts (via shadcn)          |

### Features

| Feature                 | Description                                                            |
| ----------------------- | ---------------------------------------------------------------------- |
| **Dashboard**           | Overview with key metrics and activity feed                            |
| **Groups Management**   | Data table with sorting, filtering, pagination                         |
| **Channels Management** | Data table with channel-specific columns                               |
| **Analytics**           | 10+ charts across 4 tabs (Overview, Performance, Distribution, Trends) |
| **Settings**            | Theme toggle (Light/Dark/System), account info                         |

### Key Characteristics

- **100% shadcn/ui** - No custom premium UI, uses official shadcn patterns
- **Mock-first development** - Toggle with `NEXT_PUBLIC_USE_MOCK=true`
- **sidebar-07 pattern** - Collapsible icon sidebar
- **TanStack Query v5** - `isPending` pattern, centralized query keys

---

## Pages & Routes

### Route Structure

```
apps/web/src/app/
├── layout.tsx               # Root layout with providers
├── page.tsx                 # Redirects to /dashboard
├── not-found.tsx            # Custom 404 page
│
├── login/
│   └── page.tsx             # Login page (mock auth)
│
└── dashboard/
    ├── layout.tsx           # Dashboard layout (sidebar + header)
    ├── page.tsx             # Main dashboard
    ├── analytics/
    │   └── page.tsx         # Analytics with 4 tabs
    ├── channels/
    │   └── page.tsx         # Channels data table
    ├── groups/
    │   └── page.tsx         # Groups data table
    └── settings/
        └── page.tsx         # Theme and account settings
```

### Route Details

| Route                  | Description               | Access    |
| ---------------------- | ------------------------- | --------- |
| `/`                    | Redirect to dashboard     | Public    |
| `/login`               | Authentication page       | Public    |
| `/dashboard`           | Main dashboard with stats | Protected |
| `/dashboard/groups`    | Groups data table         | Protected |
| `/dashboard/channels`  | Channels data table       | Protected |
| `/dashboard/analytics` | Charts and metrics        | Protected |
| `/dashboard/settings`  | Theme and preferences     | Protected |

---

## Components

### Component Structure

```
apps/web/src/components/
├── ui/                      # 26 shadcn/ui primitives
│   ├── button.tsx
│   ├── card.tsx
│   ├── chart.tsx
│   ├── sidebar.tsx
│   ├── table.tsx
│   └── ...
│
├── dashboard/               # Dashboard page components
│   ├── stat-cards.tsx
│   ├── verification-chart.tsx
│   ├── activity-feed.tsx
│   └── index.ts
│
├── groups/                  # Groups page components
│   ├── groups-columns.tsx
│   ├── groups-data-table.tsx
│   ├── groups-page-content.tsx
│   └── index.ts
│
├── channels/                # Channels page components
│   ├── channels-columns.tsx
│   ├── channels-data-table.tsx
│   ├── channels-page-content.tsx
│   └── index.ts
│
├── analytics/               # Analytics page components
│   ├── overview-cards.tsx
│   ├── verification-trends-chart.tsx
│   ├── user-growth-chart.tsx
│   ├── analytics-page-content.tsx
│   └── index.ts
│
├── charts/                  # Advanced chart components
│   ├── verification-distribution-chart.tsx
│   ├── cache-hit-rate-trend-chart.tsx
│   ├── latency-trend-chart.tsx
│   ├── top-groups-chart.tsx
│   └── ... (10 charts total)
│
├── settings/                # Settings page components
│   ├── appearance-card.tsx
│   ├── account-info-card.tsx
│   └── settings-page-content.tsx
│
├── app-sidebar.tsx          # Main sidebar (sidebar-07)
├── nav-main.tsx             # Navigation items
├── nav-user.tsx             # User dropdown
├── site-header.tsx          # Header with breadcrumbs
├── theme-toggle.tsx         # Light/Dark/System toggle
└── login-form.tsx           # Login form component
```

---

## State Management

### TanStack Query (Server State)

All API data fetching uses TanStack Query v5:

```typescript
// apps/web/src/lib/hooks/use-groups.ts

export function useGroups() {
  return useQuery({
    queryKey: queryKeys.groups.all,
    queryFn: groupsService.getAll,
  });
}
```

### Query Keys Pattern

Centralized query key factory:

```typescript
// apps/web/src/lib/query-keys.ts

export const queryKeys = {
  dashboard: {
    all: ["dashboard"] as const,
    stats: ["dashboard", "stats"] as const,
    chart: (days: number) => ["dashboard", "chart", days] as const,
    activity: (limit: number) => ["dashboard", "activity", limit] as const,
  },
  groups: {
    all: ["groups"] as const,
    list: (params: GroupsParams) => ["groups", "list", params] as const,
  },
  channels: {
    all: ["channels"] as const,
    list: (params: ChannelsParams) => ["channels", "list", params] as const,
  },
  analytics: {
    all: ["analytics"] as const,
    overview: ["analytics", "overview"] as const,
  },
  charts: {
    all: ["charts"] as const,
    verificationDistribution: ["charts", "verificationDistribution"] as const,
    // ... more chart keys
  },
};
```

---

## API Integration

### Service Layer Pattern

The dashboard uses a service abstraction that supports both mock and real API:

```typescript
// apps/web/src/lib/services/dashboard.service.ts

import { getConfig } from "@/lib/api/config";
import * as mockDashboard from "@/lib/mock/dashboard.mock";
import { apiClient } from "@/lib/api/client";

export const dashboardService = {
  async getStats() {
    if (getConfig().useMock) {
      return mockDashboard.getDashboardStats();
    }
    return apiClient.get("/dashboard/stats");
  },
  // ... other methods
};
```

### Mock/API Toggle

```bash
# apps/web/.env.local

# Use mock data for development
NEXT_PUBLIC_USE_MOCK=true

# Connect to real API
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### API Client (for real API integration)

```typescript
// apps/web/src/lib/api/client.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const apiClient = {
  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        // Add auth headers when implementing real auth
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  },
  // ... post, put, delete methods
};
```

---

## Styling

### Tailwind CSS v4

Using the `@theme` inline pattern:

```css
/* apps/web/src/app/globals.css */

@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* ... more theme variables */
}
```

### Dark Mode

Automatic dark mode via `next-themes`:

```tsx
// Theme toggle
import { useTheme } from "next-themes";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
    </DropdownMenu>
  );
}
```

---

## Development

### Running Locally

```bash
cd apps/web

# Install dependencies
bun install

# Start dev server
bun run dev

# Type checking
bun run type-check

# Linting
bun run lint

# Build
bun run build
```

### Environment Variables

```bash
# apps/web/.env.local

# Required
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_USE_MOCK=true

# Optional (for future Supabase auth)
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Adding shadcn Components

```bash
cd apps/web
bunx shadcn@latest add <component-name>
```

---

## Future: Real API Integration

The dashboard is designed for easy transition from mock to real API:

1. **Set environment variable**: `NEXT_PUBLIC_USE_MOCK=false`
2. **Configure API URL**: `NEXT_PUBLIC_API_URL=http://localhost:8080`
3. **Add authentication** (optional):
   - Install Supabase: `bun add @supabase/ssr @supabase/supabase-js`
   - Create auth client and middleware
   - Add auth headers to API client

The service layer abstraction means no component changes are needed - just configure the environment.

---

## Related Documentation

- [**API Reference**](../api/README.md) - Backend API endpoints
- [**Architecture**](../architecture/README.md) - System design overview
- [**Deployment**](../deployment/README.md) - Production deployment guide
- [**Contributing**](../contributing/README.md) - Development workflow

---

_See also: [Architecture](../architecture/README.md) | [API Reference](../api/README.md)_
