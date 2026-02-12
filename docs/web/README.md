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
| **@insforge/sdk**  | Latest  | Backend Integration          |

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
- **Direct InsForge Integration** - connects directly to BaaS
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
│   └── page.tsx             # Login page (InsForge Auth)
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

---

## API Integration

### InsForge SDK Pattern

The dashboard uses the `@insforge/sdk` for all data fetching and mutations.

```typescript
// apps/web/src/lib/services/groups.service.ts

import { createClient } from "@insforge/sdk";

const client = createClient({ ... });

export const groupsService = {
  async getAll() {
    const { data, error } = await client
      .from('protected_groups')
      .select('*');

    if (error) throw error;
    return data;
  }
};
```

### Real-time Updates

InsForge provides real-time subscriptions to database changes:

```typescript
// Example subscription
client
  .from('logs')
  .on('INSERT', (payload) => {
    console.log('New log:', payload.new);
  })
  .subscribe();
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

# Required for InsForge
NEXT_PUBLIC_INSFORGE_URL=https://your-app.region.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=your_anon_key
```

### Adding shadcn Components

```bash
cd apps/web
bunx shadcn@latest add <component-name>
```

---

## Related Documentation

- [**Architecture**](../architecture/README.md) - System design overview
- [**Deployment**](../deployment/README.md) - Production deployment guide
- [**Contributing**](../contributing/README.md) - Development workflow

---

_See also: [Architecture](../architecture/README.md)_
