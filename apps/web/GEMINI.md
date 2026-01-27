# Web Dashboard Context

## Overview

Next.js 16 Admin Dashboard for managing Nezuko bot settings, groups, channels, and analytics.

## Tech Stack

- **Framework**: Next.js 16.1.4 with App Router
- **React**: 19.2.3 with React Compiler
- **Styling**: Tailwind CSS v4 with `@theme` inline pattern
- **Components**: shadcn/ui (Radix Primitives)
- **State**: TanStack Query v5 + Zustand
- **Auth**: Supabase SSR

## Key Patterns

### App Router Structure

```
src/app/
├── (auth)/           # Auth route group (login, register)
├── dashboard/        # Protected dashboard routes
│   ├── groups/
│   ├── channels/
│   ├── analytics/
│   └── logs/
├── layout.tsx        # Root layout
└── globals.css       # Tailwind styles
```

### Component Organization

```
src/components/
├── ui/               # shadcn/ui primitives (Button, Card, Dialog)
├── layout/           # Sidebar, Header, Navigation
├── dashboard/        # Dashboard-specific components
└── [feature]/        # Feature-specific components
```

### State Management

- **Server State**: Use TanStack Query for all API data
- **Client State**: Use Zustand only for UI state (modals, sidebar)
- **Forms**: React Hook Form + Zod validation

### Important Conventions

```typescript
// ✅ Use isPending (not isLoading) - TanStack Query v5
const { data, isPending, error } = useQuery({ ... });

// ✅ Use object syntax for queries
useQuery({
  queryKey: ['groups'],
  queryFn: fetchGroups,
});

// ✅ Async route params in Next.js 16
export default async function Page({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
}
```

### Tailwind v4 Patterns

```css
/* Use @theme for design tokens */
@theme {
  --color-primary: oklch(0.55 0.25 265);
  --radius-lg: 0.75rem;
}
```

## Commands

```bash
bun dev              # Development server
bun build            # Production build
bun run lint         # ESLint
bun run type-check   # TypeScript check
```
