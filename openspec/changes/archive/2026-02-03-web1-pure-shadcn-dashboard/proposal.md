## Why

The current `apps/web` dashboard uses extensive custom UI components (TiltCard, MagneticButton, AnimatedCounter, Glassmorphism effects) that are complex to maintain and deviate from standard patterns. For bot owners who need a clean, professional admin interface, we need a **pure shadcn/ui dashboard** that:

1. Uses native shadcn components without customization for maintainability
2. Provides a consistent, professional look matching industry standards
3. Is easier to extend and maintain with the shadcn CLI
4. Focuses on bot owner workflows: monitoring groups, channels, analytics, settings
5. **Fully responsive** - works seamlessly on mobile, tablet, and desktop
6. **API-ready architecture** - no hardcoded values, easy swap from mock to real API

## What Changes

- **NEW**: Create `apps/web1/` - A fresh Next.js 16 application with pure shadcn/ui
- **NEW**: Implement collapsible sidebar navigation (sidebar-07 pattern) with mobile drawer
- **NEW**: Dashboard page with stat cards and verification trends chart
- **NEW**: Groups management page with TanStack Data Table
- **NEW**: Channels management page with TanStack Data Table
- **NEW**: Analytics page with area charts and metrics
- **NEW**: Settings page for appearance (dark/light theme)
- **NEW**: API client layer with environment-based configuration
- **NEW**: Mock data layer structured to match real API response shapes exactly
- **NEW**: Mobile-first responsive design across all pages
- Uses latest stack: Next.js 16, React 19, Tailwind v4, shadcn/ui (New York style)
- All components installed via shadcn CLI - no manual component code
- Zero hardcoded values - all data from API/mock layer

## Capabilities

### New Capabilities

- `web1-project-setup`: Initialize Next.js 16 project with shadcn/ui, Tailwind v4, TypeScript 5.9
- `web1-layout-sidebar`: Collapsible sidebar navigation with user menu, theme toggle, mobile sheet
- `web1-dashboard-page`: Dashboard with stat cards, area chart, activity feed (responsive grid)
- `web1-groups-page`: Protected groups management with TanStack data table (responsive)
- `web1-channels-page`: Enforced channels management with TanStack data table (responsive)
- `web1-analytics-page`: Analytics with verification trends, success rate charts (responsive)
- `web1-settings-page`: Appearance settings with theme toggle
- `web1-data-layer`: API client + mock data with identical interfaces for seamless swap
- `web1-responsive-design`: Mobile-first responsive patterns across all components

### Modified Capabilities

<!-- No existing specs to modify - this is a new standalone application -->

## Impact

| Area                    | Impact                                                     |
| ----------------------- | ---------------------------------------------------------- |
| **New Directory**       | `apps/web1/` created alongside existing `apps/web/`        |
| **Dependencies**        | New package.json with Next.js 16, React 19, shadcn/ui deps |
| **Types**               | New type definitions matching existing API schemas exactly |
| **API Client**          | Configurable base URL, auth headers, error handling        |
| **Turborepo**           | May need to add web1 to turbo.json workspaces              |
| **Mobile Support**      | Full responsive design with mobile navigation              |
| **No Backend Changes**  | Uses mock data; API integration ready for future           |
| **No Breaking Changes** | Existing `apps/web` remains untouched                      |
