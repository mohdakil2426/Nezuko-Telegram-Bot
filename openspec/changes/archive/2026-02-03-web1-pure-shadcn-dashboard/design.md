## Context

**Current State**: The Nezuko platform has `apps/web` - a Next.js 16 dashboard with extensive custom UI (TiltCard, MagneticButton, Glassmorphism). While visually premium, it's complex to maintain.

**New Application**: `apps/web1` will be a **parallel** dashboard using pure shadcn/ui components. It runs alongside `apps/web` without replacing it.

**Target User**: Bot owners who need a clean, professional admin interface for:

- Monitoring protected groups and enforced channels
- Viewing verification analytics and trends
- Managing appearance settings
- **Accessing on mobile devices** while on the go

**Constraints**:

- Must use shadcn CLI for all component installation (no manual component code)
- Must use latest stack versions (Next.js 16, React 19, Tailwind v4)
- **No hardcoded data** - all values from API/mock layer
- **Mobile-first responsive design** - works on all screen sizes
- New York style for shadcn/ui components

## Goals / Non-Goals

**Goals:**

- Create `apps/web1/` with Next.js 16 + shadcn/ui (New York style)
- Implement 5 pages: Dashboard, Groups, Channels, Analytics, Settings
- Use sidebar-07 pattern (collapses to icons) + mobile sheet drawer
- Use TanStack Table for groups AND channels data display
- Use Area Charts for verification trends
- **API-ready architecture** with service layer pattern
- **Zero hardcoded values** - all data via typed service functions
- **Full mobile responsiveness** with breakpoint-aware layouts
- All lint checks pass (ESLint, TypeScript)
- Update memory-bank after each phase

**Non-Goals:**

- No real API integration in initial build (but architecture supports it)
- No authentication flow implementation
- No Logs page
- No Database browser
- No custom animations or effects
- No Framer Motion usage

## Decisions

### 1. Project Structure

**Decision**: Create `apps/web1/` as a new Turborepo workspace app

**Rationale**:

- Keeps existing `apps/web` untouched
- Can run both dashboards in parallel for comparison
- Clean slate without legacy component dependencies

**Alternatives Considered**:

- Refactor `apps/web` in place → Too risky, loses working dashboard
- Branch `apps/web` → Would diverge, merge conflicts

### 2. Component Strategy

**Decision**: Use shadcn CLI exclusively for component installation

**Rationale**:

- Components auto-configure for project setup
- Ensures compatibility with latest shadcn patterns
- Easy to update via CLI
- No manual code = no maintenance burden

**Implementation**:

```bash
bunx shadcn@latest add sidebar card chart table badge button sheet ...
```

### 3. Sidebar Pattern + Mobile Navigation

**Decision**: Use `sidebar-07` (collapses to icons) + shadcn `Sheet` for mobile

**Rationale**:

- Professional look matching enterprise dashboards
- Space-efficient on smaller screens
- Sheet component provides mobile drawer pattern

**Components Needed**:

- `SidebarProvider`, `Sidebar`, `SidebarInset`
- `SidebarHeader`, `SidebarContent`, `SidebarFooter`
- `Sheet`, `SheetTrigger`, `SheetContent` (mobile nav)
- `useMobile()` hook for responsive behavior

**Responsive Behavior**:
| Viewport | Sidebar Behavior |
|----------|------------------|
| Desktop (≥1024px) | Full sidebar, collapsible to icons |
| Tablet (768-1023px) | Collapsed by default, expandable |
| Mobile (<768px) | Hidden, accessible via hamburger → Sheet |

### 4. Data Table Implementation

**Decision**: Use `@tanstack/react-table` with shadcn Table primitives

**Rationale**:

- Industry standard for React data tables
- Full-featured: sorting, filtering, pagination, column visibility
- shadcn `table` component provides styled primitives

**Features for Groups & Channels Tables**:

- Columns vary by entity type
- Sortable columns
- Search filter
- Pagination with responsive controls
- Row actions dropdown
- **Responsive column hiding** on mobile

**Responsive Table Behavior**:
| Viewport | Table Behavior |
|----------|----------------|
| Desktop | All columns visible |
| Tablet | Hide less important columns |
| Mobile | Show key columns only, horizontal scroll for rest |

### 5. Chart Library

**Decision**: Use Recharts via shadcn `chart` component

**Rationale**:

- Already bundled with shadcn/ui
- Excellent React integration
- Area charts support gradient fills
- Responsive container support

**Chart Types Used**:

- Area Chart: Verification trends (main dashboard + analytics)
- Radial Chart: Success rate percentage (analytics)

**Responsive Charts**: Use `ResponsiveContainer` from Recharts for fluid sizing.

### 6. Theme System

**Decision**: Use `next-themes` for dark/light mode only

**Rationale**:

- Bundled with shadcn/ui
- Simple two-mode system (no accent colors)
- CSS variables for all theming

**No Custom Themes**: Unlike `apps/web` with 11 accents, this uses standard shadcn palette.

### 7. API-Ready Data Layer Architecture

**Decision**: Create a service layer with interface-based abstraction

**Rationale**:

- Single interface for both mock and real API
- Environment variable controls which implementation is used
- Zero code changes needed to switch to real API
- Type-safe from day one

**Architecture**:

```
src/lib/
├── api/
│   ├── client.ts          # Base API client (fetch wrapper)
│   ├── config.ts          # API_URL, USE_MOCK from env
│   └── endpoints.ts       # Endpoint path constants
├── services/
│   ├── types.ts           # All interfaces (DashboardStats, Group, Channel, etc.)
│   ├── dashboard.service.ts
│   ├── groups.service.ts
│   ├── channels.service.ts
│   └── analytics.service.ts
├── mock/
│   ├── dashboard.mock.ts
│   ├── groups.mock.ts
│   ├── channels.mock.ts
│   └── analytics.mock.ts
└── hooks/
    ├── use-dashboard.ts   # React Query hooks
    ├── use-groups.ts
    ├── use-channels.ts
    └── use-analytics.ts
```

**Service Interface Pattern**:

```typescript
// services/groups.service.ts
import { apiClient } from "@/lib/api/client";
import { config } from "@/lib/api/config";
import { mockGroups } from "@/lib/mock/groups.mock";

export async function getGroups(params?: GroupsParams): Promise<PaginatedResult<Group>> {
  if (config.useMock) {
    return mockGroups.getGroups(params);
  }
  return apiClient.get<PaginatedResult<Group>>("/groups", params);
}
```

**Environment Configuration**:

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_USE_MOCK=true  # Set to false for real API
```

### 8. No Hardcoded Values Pattern

**Decision**: All displayable data comes from services, never inline

**Rules**:

1. **No inline numbers** - All stats from `getDashboardStats()`
2. **No inline strings** for data - All labels from API/config
3. **Config for UI strings** - Use constants file for static UI text
4. **Type everything** - No `any`, all responses typed

**Example - Good vs Bad**:

```tsx
// ❌ BAD - Hardcoded
<StatCard title="Groups" value={24} change={12} />;

// ✅ GOOD - From service
const { data } = useDashboardStats();
<StatCard title="Groups" value={data?.totalGroups ?? 0} change={data?.totalGroupsChange ?? 0} />;
```

### 9. Responsive Design Strategy

**Decision**: Mobile-first with Tailwind breakpoints

**Breakpoints** (Tailwind v4 defaults):
| Breakpoint | Min Width | Target |
|------------|-----------|--------|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |

**Responsive Patterns**:

1. **Grid layouts**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
2. **Sidebar**: Hidden on mobile, sheet trigger visible
3. **Tables**: Column visibility, horizontal scroll
4. **Charts**: Full width, reduced height on mobile
5. **Forms**: Stacked on mobile, inline on desktop

### 10. Icon Library

**Decision**: Use Lucide React (shadcn default)

**Rationale**:

- Already configured with shadcn
- Consistent with shadcn examples
- Tree-shakeable

## Risks / Trade-offs

| Risk                         | Impact                      | Mitigation                                     |
| ---------------------------- | --------------------------- | ---------------------------------------------- |
| shadcn version changes       | Components may need updates | Pin versions in package.json                   |
| Two dashboards to maintain   | Increased codebase size     | Clear documentation, may deprecate one later   |
| Mock data diverges from API  | Integration issues later    | Use exact API response types from existing API |
| No auth flow                 | Can't test protected routes | Use bypass/mock auth flag                      |
| Tailwind v4 breaking changes | CSS issues                  | Follow Tailwind v4 migration guide             |
| Mobile table usability       | Complex data hard to view   | Use responsive column hiding, expandable rows  |

## Migration Plan

**Phase 1**: Project Setup

- Initialize Next.js 16 in `apps/web1`
- Configure shadcn/ui with New York style
- Install core components via CLI

**Phase 2**: Install All shadcn Components

- Install all needed components via CLI
- Include `sheet` for mobile navigation

**Phase 3**: Data Layer & Services

- Create service layer with interfaces
- Create mock data implementations
- Set up environment config

**Phase 4**: Layout & Navigation

- Implement sidebar-07 pattern
- Add mobile sheet navigation
- Create site header with responsive behavior

**Phase 5**: Dashboard Page

- Stat cards component (responsive grid)
- Verification trends chart
- Activity feed

**Phase 6**: Groups Page

- TanStack Table setup
- Responsive column definitions
- Mobile-friendly pagination

**Phase 7**: Channels Page

- Similar structure to Groups
- Channel-specific columns
- Subscriber count, linked groups

**Phase 8**: Analytics Page

- Multiple charts
- Tab navigation
- Time range filters
- Responsive chart containers

**Phase 9**: Settings Page

- Theme toggle
- Appearance options

**Phase 10**: Final Polish & Testing

- Test all responsive breakpoints
- Verify no hardcoded values
- Lint and type check

**Rollback Strategy**: Delete `apps/web1/` directory - no impact on existing code.

## Open Questions

1. **Turborepo Integration**: Should `web1` be added to `turbo.json` now or after completion?
   - **Recommendation**: Add after Phase 1 is working

2. **Shared Types**: Should types be in `packages/types` or local to `web1`?
   - **Recommendation**: Local for now, extract to package later if needed

3. **Auth Bypass**: How to handle protected routes during development?
   - **Recommendation**: No auth checks initially, add later
