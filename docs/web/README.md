# 🌐 Web Dashboard Reference

> **Complete documentation for the Nezuko Admin Dashboard**

The Nezuko Admin Dashboard is a modern web application built with Next.js 16, providing a comprehensive interface for managing protected groups, monitoring bot activity, and analyzing verification metrics.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Pages & Routes](#pages--routes)
3. [Components](#components)
4. [State Management](#state-management)
5. [Authentication](#authentication)
6. [API Integration](#api-integration)
7. [Styling](#styling)

---

## Overview

### Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.4 | React framework (App Router) |
| **React** | 19.2.3 | UI library |
| **TypeScript** | 5.9.3 | Type safety |
| **Tailwind CSS** | 4.1.18 | Styling |
| **shadcn/ui** | Latest | UI components |
| **TanStack Query** | 5.90.20 | Server state |
| **Zustand** | 5.0.10 | Client state |
| **Supabase** | 2.93.1 | Authentication |

### Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Overview with key metrics and activity |
| **Groups Management** | CRUD operations for protected groups |
| **Channels Management** | CRUD operations for enforced channels |
| **Real-time Logs** | Live log streaming via WebSocket |
| **Database Browser** | Explore and query database tables |
| **Analytics** | Charts and statistics |

---

## Pages & Routes

### Route Structure

```
apps/web/src/app/
├── (auth)/                     # Auth route group (public)
│   └── login/
│       └── page.tsx            # Login page
│
├── dashboard/                   # Dashboard route group (protected)
│   ├── layout.tsx              # Dashboard layout with sidebar
│   ├── page.tsx                # Main dashboard
│   │
│   ├── groups/
│   │   ├── page.tsx            # Groups list
│   │   └── [id]/
│   │       └── page.tsx        # Group detail
│   │
│   ├── channels/
│   │   ├── page.tsx            # Channels list
│   │   └── [id]/
│   │       └── page.tsx        # Channel detail
│   │
│   ├── analytics/
│   │   └── page.tsx            # Analytics dashboard
│   │
│   ├── logs/
│   │   └── page.tsx            # Real-time logs
│   │
│   ├── database/
│   │   └── page.tsx            # Database browser
│   │
│   └── config/
│       └── page.tsx            # Configuration
│
├── layout.tsx                   # Root layout
├── globals.css                  # Tailwind styles
├── loading.tsx                  # Global loading
├── error.tsx                    # Error boundary
└── not-found.tsx               # 404 page
```

### Route Details

| Route | Description | Access |
|-------|-------------|--------|
| `/` | Redirect to dashboard | Public |
| `/login` | Authentication page | Public |
| `/dashboard` | Main dashboard with stats | Protected |
| `/dashboard/groups` | List all protected groups | Protected |
| `/dashboard/groups/[id]` | Single group details | Protected |
| `/dashboard/channels` | List all channels | Protected |
| `/dashboard/channels/[id]` | Single channel details | Protected |
| `/dashboard/analytics` | Charts and metrics | Protected |
| `/dashboard/logs` | Real-time log viewer | Protected |
| `/dashboard/database` | Database browser | Protected |
| `/dashboard/config` | Configuration settings | Protected |

---

## Components

### Component Structure

```
apps/web/src/components/
├── ui/                          # shadcn/ui primitives
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── input.tsx
│   ├── table.tsx
│   └── ...
│
├── layout/                      # Layout components
│   ├── sidebar.tsx
│   ├── header.tsx
│   ├── nav-item.tsx
│   └── user-menu.tsx
│
├── dashboard/                   # Dashboard components
│   ├── stats-card.tsx
│   ├── activity-feed.tsx
│   └── quick-actions.tsx
│
├── groups/                      # Groups components
│   ├── groups-table.tsx
│   ├── group-form.tsx
│   ├── group-card.tsx
│   └── group-stats.tsx
│
├── channels/                    # Channels components
│   ├── channels-table.tsx
│   ├── channel-form.tsx
│   └── channel-card.tsx
│
├── logs/                        # Logs components
│   ├── log-viewer.tsx
│   ├── log-entry.tsx
│   ├── log-filters.tsx
│   └── log-level-badge.tsx
│
├── database/                    # Database components
│   ├── table-browser.tsx
│   ├── table-viewer.tsx
│   └── query-editor.tsx
│
└── analytics/                   # Analytics components
    ├── verification-chart.tsx
    ├── group-growth-chart.tsx
    └── stats-overview.tsx
```

### Key Components

#### StatsCard

Displays a metric with optional trend indicator:

```tsx
<StatsCard
  title="Total Groups"
  value={150}
  change={+12}
  changeType="increase"
  icon={<Users />}
/>
```

#### DataTable

Generic table with sorting, filtering, pagination:

```tsx
<DataTable
  columns={groupColumns}
  data={groups}
  searchColumn="title"
  pageSize={20}
/>
```

#### LogViewer

Real-time log streaming component:

```tsx
<LogViewer
  autoConnect={true}
  levelFilter="INFO"
  maxEntries={1000}
/>
```

---

## State Management

### TanStack Query (Server State)

All API data fetching uses TanStack Query v5:

```typescript
// apps/web/src/lib/hooks/use-groups.ts

export function useGroups(params?: GroupsParams) {
  return useQuery({
    queryKey: queryKeys.groups.list(params),
    queryFn: () => groupsApi.getAll(params),
    staleTime: 60_000,
  });
}

export function useGroup(id: string) {
  return useQuery({
    queryKey: queryKeys.groups.detail(id),
    queryFn: () => groupsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: groupsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.groups.all 
      });
    },
  });
}
```

### Query Keys Pattern

Centralized query key factory:

```typescript
// apps/web/src/lib/query-keys.ts

export const queryKeys = {
  groups: {
    all: ['groups'] as const,
    list: (params?: GroupsParams) => [...queryKeys.groups.all, params] as const,
    detail: (id: string) => [...queryKeys.groups.all, id] as const,
  },
  channels: {
    all: ['channels'] as const,
    list: (params?: ChannelsParams) => [...queryKeys.channels.all, params] as const,
    detail: (id: string) => [...queryKeys.channels.all, id] as const,
  },
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
    activity: ['dashboard', 'activity'] as const,
  },
};
```

### Zustand (Client State)

Local application state:

```typescript
// apps/web/src/stores/auth-store.ts

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
```

---

## Authentication

### Supabase SSR

Authentication uses Supabase with SSR cookie handling:

```typescript
// apps/web/src/lib/supabase/client.ts

import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Proxy Pattern (Next.js 16)

Session management via `proxy.ts`:

```typescript
// apps/web/src/proxy.ts

import { updateSession } from '@/lib/supabase/middleware';
import { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### Session Middleware

```typescript
// apps/web/src/lib/supabase/middleware.ts

export async function updateSession(request: NextRequest) {
  const supabase = createServerClient(URL, KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Redirect unauthenticated users
  if (!session && !isPublicRoute(request.url)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}
```

### Login Flow

```tsx
// apps/web/src/app/(auth)/login/page.tsx

async function handleLogin(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    toast.error(error.message);
    return;
  }

  // Full page reload required for cookie refresh
  window.location.href = '/dashboard';
}
```

---

## API Integration

### API Client

Centralized API client with authentication:

```typescript
// apps/web/src/lib/api/client.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.json());
  }

  return response.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.json());
  }

  return response.json();
}
```

### API Services

Domain-specific API functions:

```typescript
// apps/web/src/lib/api/groups.ts

export const groupsApi = {
  getAll: (params?: GroupsParams) => 
    apiGet<PaginatedResponse<Group>>('/groups', params),
    
  getById: (id: string) => 
    apiGet<Group>(`/groups/${id}`),
    
  create: (data: CreateGroup) => 
    apiPost<Group>('/groups', data),
    
  update: (id: string, data: UpdateGroup) => 
    apiPut<Group>(`/groups/${id}`, data),
    
  delete: (id: string) => 
    apiDelete(`/groups/${id}`),
};
```

---

## Styling

### Tailwind CSS v4

Using the `@theme` inline pattern:

```css
/* apps/web/src/app/globals.css */

@import "tailwindcss";

@theme {
  /* Colors */
  --color-primary-50: oklch(0.97 0.01 265);
  --color-primary-500: oklch(0.55 0.25 265);
  --color-primary-900: oklch(0.25 0.15 265);

  /* Dark mode colors */
  --color-background: oklch(0.98 0.01 265);
  --color-foreground: oklch(0.15 0.02 265);

  /* Typography */
  --font-sans: var(--font-inter), ui-sans-serif, system-ui;

  /* Spacing */
  --spacing-sidebar: 280px;
  --spacing-header: 64px;
}

@layer base {
  :root {
    color-scheme: light;
  }

  .dark {
    color-scheme: dark;
    --color-background: oklch(0.12 0.02 265);
    --color-foreground: oklch(0.95 0.01 265);
  }
}
```

### Component Styling

Using shadcn/ui with Tailwind:

```tsx
// Example card component
<Card className="p-6 hover:shadow-lg transition-shadow">
  <CardHeader>
    <CardTitle className="text-lg font-semibold">
      {title}
    </CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-muted-foreground">{description}</p>
  </CardContent>
</Card>
```

### Dark Mode

Automatic dark mode via CSS variables:

```tsx
// Theme toggle
import { useTheme } from 'next-themes';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
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
```

### Environment Variables

```bash
# apps/web/.env.local

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

### Build

```bash
# Production build
bun run build

# Preview production build
bun run start
```

---

## Related Documentation

- [**API Reference**](../api/README.md) - Backend API endpoints
- [**Architecture**](../architecture/README.md) - System design overview
- [**Deployment**](../deployment/README.md) - Production deployment guide
- [**Contributing**](../contributing/README.md) - Development workflow

---

*See also: [Architecture](../architecture/README.md) | [API Reference](../api/README.md)*
