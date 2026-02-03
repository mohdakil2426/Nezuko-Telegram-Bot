## 1. Phase 1: Project Initialization

- [x] 1.1 Create Next.js 16 project in `apps/web1` using `bunx create-next-app@latest web1 --typescript --tailwind --eslint --app --src-dir`
- [x] 1.2 Verify Next.js version >= 16.0.0 in package.json
- [x] 1.3 Verify React version >= 19.0.0 in package.json
- [x] 1.4 Verify TypeScript version >= 5.8.0 in package.json
- [x] 1.5 Verify Tailwind CSS version >= 4.0.0 in package.json
- [x] 1.6 Initialize shadcn/ui with `bunx shadcn@latest init` (New York style, CSS variables enabled)
- [x] 1.7 Verify `components.json` created with correct configuration
- [x] 1.8 Enable TypeScript strict mode in `tsconfig.json` (`"strict": true`, `"noImplicitAny": true`)
- [x] 1.9 Configure path aliases in tsconfig.json (`@/*` → `src/*`)
- [x] 1.10 Install `next-themes` for dark/light mode support: `bun add next-themes`
- [x] 1.11 Install `@tanstack/react-query` for data fetching: `bun add @tanstack/react-query`
- [x] 1.12 Install `@tanstack/react-table` for data tables: `bun add @tanstack/react-table`
- [x] 1.13 Create `.env.local` with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_USE_MOCK=true`
- [x] 1.14 Run `bun run lint` and verify zero errors
- [x] 1.15 Run `bun run build` and verify successful build
- [x] 1.16 Update memory-bank/activeContext.md with Phase 1 completion

## 2. Phase 2: Install shadcn Components via CLI

- [x] 2.1 Install sidebar component: `bunx shadcn@latest add sidebar`
- [x] 2.2 Install card component: `bunx shadcn@latest add card`
- [x] 2.3 Install chart component: `bunx shadcn@latest add chart`
- [x] 2.4 Install table component: `bunx shadcn@latest add table`
- [x] 2.5 Install button component: `bunx shadcn@latest add button`
- [x] 2.6 Install badge component: `bunx shadcn@latest add badge`
- [x] 2.7 Install dropdown-menu component: `bunx shadcn@latest add dropdown-menu`
- [x] 2.8 Install select component: `bunx shadcn@latest add select`
- [x] 2.9 Install input component: `bunx shadcn@latest add input`
- [x] 2.10 Install switch component: `bunx shadcn@latest add switch`
- [x] 2.11 Install label component: `bunx shadcn@latest add label`
- [x] 2.12 Install tabs component: `bunx shadcn@latest add tabs`
- [x] 2.13 Install skeleton component: `bunx shadcn@latest add skeleton`
- [x] 2.14 Install separator component: `bunx shadcn@latest add separator`
- [x] 2.15 Install avatar component: `bunx shadcn@latest add avatar`
- [x] 2.16 Install tooltip component: `bunx shadcn@latest add tooltip`
- [x] 2.17 Install scroll-area component: `bunx shadcn@latest add scroll-area`
- [x] 2.18 Install sonner component: `bunx shadcn@latest add sonner`
- [x] 2.19 Install alert-dialog component: `bunx shadcn@latest add alert-dialog`
- [x] 2.20 Install toggle-group component: `bunx shadcn@latest add toggle-group`
- [x] 2.21 Install checkbox component: `bunx shadcn@latest add checkbox`
- [x] 2.22 Install breadcrumb component: `bunx shadcn@latest add breadcrumb`
- [x] 2.23 Install sheet component (for mobile nav): `bunx shadcn@latest add sheet`
- [x] 2.24 Verify all components exist in `src/components/ui/`
- [x] 2.25 Run `bun run lint` and fix any errors
- [x] 2.26 Run `bun run build` and verify successful build
- [x] 2.27 Update memory-bank/activeContext.md with Phase 2 completion

## 3. Phase 3: API Client & Service Layer

- [x] 3.1 Create `src/lib/api/` directory structure
- [x] 3.2 Create `src/lib/api/config.ts` with environment variable exports
- [x] 3.3 Create `src/lib/api/client.ts` with typed fetch wrapper (get, post, put, delete methods)
- [x] 3.4 Create `src/lib/api/endpoints.ts` with API path constants
- [x] 3.5 Create `src/lib/services/` directory structure
- [x] 3.6 Create `src/lib/services/types.ts` with all interfaces:
- [x] 3.7 Add DashboardStats interface to types.ts
- [x] 3.8 Add ChartDataPoint interface to types.ts
- [x] 3.9 Add Group interface to types.ts (matching API schema exactly)
- [x] 3.10 Add Channel interface to types.ts (matching API schema exactly)
- [x] 3.11 Add Activity interface to types.ts
- [x] 3.12 Add AnalyticsMetrics interface to types.ts
- [x] 3.13 Add PaginatedResult<T> generic interface to types.ts
- [x] 3.14 Add GroupsParams, ChannelsParams, TrendsParams interfaces to types.ts
- [x] 3.15 Create `src/lib/query-keys.ts` with centralized query key factory
- [x] 3.16 Run `bun run lint` and fix any type errors
- [x] 3.17 Update memory-bank/activeContext.md with Phase 3 completion

## 4. Phase 4: Mock Data Implementation

- [x] 4.1 Create `src/lib/mock/` directory structure
- [x] 4.2 Create `src/lib/mock/utils.ts` with delay simulation helper (200-500ms)
- [x] 4.3 Create `src/lib/mock/dashboard.mock.ts` with getDashboardStats() returning realistic data
- [x] 4.4 Add getChartData(days?: number) to dashboard.mock.ts with 30 days of time-series data
- [x] 4.5 Add getActivity(limit?: number) to dashboard.mock.ts with 10+ activity items
- [x] 4.6 Create `src/lib/mock/groups.mock.ts` with getGroups() returning 12+ realistic groups
- [x] 4.7 Add getGroup(id: number) to groups.mock.ts
- [x] 4.8 Create `src/lib/mock/channels.mock.ts` with getChannels() returning 8+ realistic channels
- [x] 4.9 Add getChannel(id: number) to channels.mock.ts
- [x] 4.10 Create `src/lib/mock/analytics.mock.ts` with getAnalytics()
- [x] 4.11 Add getVerificationTrends() to analytics.mock.ts
- [x] 4.12 Ensure all mock data uses realistic Telegram-style IDs (large numbers)
- [x] 4.13 Run `bun run lint` and fix any errors
- [x] 4.14 Update memory-bank/activeContext.md with Phase 4 completion

## 5. Phase 5: Service Layer & React Query Hooks

- [x] 5.1 Create `src/lib/services/dashboard.service.ts` with mock/API toggle logic
- [x] 5.2 Create `src/lib/services/groups.service.ts` with mock/API toggle logic
- [x] 5.3 Create `src/lib/services/channels.service.ts` with mock/API toggle logic
- [x] 5.4 Create `src/lib/services/analytics.service.ts` with mock/API toggle logic
- [x] 5.5 Create `src/lib/hooks/` directory
- [x] 5.6 Create `src/lib/hooks/use-mobile.tsx` for mobile viewport detection
- [x] 5.7 Create `src/lib/hooks/use-dashboard.ts` with useDashboardStats(), useChartData(), useActivity() hooks
- [x] 5.8 Create `src/lib/hooks/use-groups.ts` with useGroups(), useGroup() hooks
- [x] 5.9 Create `src/lib/hooks/use-channels.ts` with useChannels(), useChannel() hooks
- [x] 5.10 Create `src/lib/hooks/use-analytics.ts` with useAnalytics(), useVerificationTrends() hooks
- [x] 5.11 Create `src/providers/query-provider.tsx` with QueryClient configuration
- [x] 5.12 Run `bun run lint` and fix any type errors
- [x] 5.13 Run `bun run build` and verify successful build
- [x] 5.14 Update memory-bank/activeContext.md with Phase 5 completion

## 6. Phase 6: Layout & Navigation (Desktop + Mobile)

- [x] 6.1 Create `src/components/app-sidebar.tsx` based on sidebar-07 pattern
- [x] 6.2 Define navigation items array: Dashboard, Analytics, Groups, Channels, Settings
- [x] 6.3 Add Lucide icons for each navigation item (LayoutDashboard, BarChart3, Users, Radio, Settings)
- [x] 6.4 Implement SidebarHeader with Nezuko logo and brand text
- [x] 6.5 Implement SidebarContent with NavMain component for navigation items
- [x] 6.6 Create `src/components/nav-main.tsx` for main navigation
- [x] 6.7 Implement active route indication using usePathname()
- [x] 6.8 Create `src/components/nav-user.tsx` for user profile section
- [x] 6.9 Add user avatar, name, email display (from constants, not hardcoded inline)
- [x] 6.10 Add dropdown menu with Profile, Settings, Log out options
- [x] 6.11 Create `src/components/theme-toggle.tsx` for dark/light mode switching
- [x] 6.12 Integrate theme-toggle into sidebar
- [x] 6.13 Create `src/components/mobile-nav.tsx` with Sheet-based navigation for mobile
- [x] 6.14 Add hamburger menu trigger in site header (visible < 1024px)
- [x] 6.15 Implement Sheet with full navigation, theme toggle, user profile
- [x] 6.16 Add auto-close on navigation item click
- [x] 6.17 Create `src/components/site-header.tsx` with responsive behavior
- [x] 6.18 Add breadcrumb component (hidden on mobile)
- [x] 6.19 Add hamburger menu trigger (visible on mobile)
- [x] 6.20 Create `src/app/dashboard/layout.tsx` with SidebarProvider wrapper
- [x] 6.21 Add responsive SidebarInset containing site-header and children
- [x] 6.22 Create `src/app/layout.tsx` with ThemeProvider from next-themes
- [x] 6.23 Add QueryProvider for React Query
- [x] 6.24 Add Toaster (sonner) to root layout
- [x] 6.25 Create `src/app/page.tsx` with redirect to /dashboard
- [x] 6.26 Test sidebar collapse/expand functionality on desktop
- [x] 6.27 Test mobile Sheet navigation opens/closes correctly
- [x] 6.28 Test theme toggle persistence in localStorage
- [x] 6.29 Run `bun run lint` and fix any errors
- [x] 6.30 Run `bun run build` and verify successful build
- [x] 6.31 Update memory-bank/activeContext.md with Phase 6 completion

## 7. Phase 7: Dashboard Page Implementation

- [x] 7.1 Create `src/app/dashboard/page.tsx` as main dashboard
- [x] 7.2 Create `src/components/dashboard/stat-cards.tsx` for stat cards section
- [x] 7.3 Implement 4 stat cards using data from useDashboardStats() hook (NO hardcoded values)
- [x] 7.4 Add Card, CardHeader, CardTitle, CardContent from shadcn for each stat
- [x] 7.5 Display primary value with large text styling (tabular-nums for alignment)
- [x] 7.6 Display change indicator with up/down arrow and percentage
- [x] 7.7 Add appropriate Lucide icons to each stat card
- [x] 7.8 Implement responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- [x] 7.9 Create `src/components/dashboard/verification-chart.tsx` for trends chart
- [x] 7.10 Use shadcn ChartContainer with Recharts AreaChart
- [x] 7.11 Wire up chart data from useChartData() hook (NO hardcoded data)
- [x] 7.12 Implement two data series: verified (primary) and restricted (secondary)
- [x] 7.13 Add gradient fill effect to area chart
- [x] 7.14 Implement ChartTooltip with date and values on hover
- [x] 7.15 Add time range selector using ToggleGroup (7d, 30d, 90d)
- [x] 7.16 Wrap chart in ResponsiveContainer for fluid sizing
- [x] 7.17 Adjust chart height: `h-[200px] md:h-[300px]`
- [x] 7.18 Create `src/components/dashboard/activity-feed.tsx` for recent activity
- [x] 7.19 Use useActivity() hook to fetch data (NO hardcoded items)
- [x] 7.20 Display activity items with type icon, description, relative timestamp
- [x] 7.21 Create `src/components/dashboard/dashboard-skeleton.tsx` for loading states
- [x] 7.22 Implement skeleton cards matching responsive grid layout
- [x] 7.23 Implement skeleton chart area
- [x] 7.24 Implement skeleton activity rows
- [x] 7.25 Add loading states using isPending from React Query
- [x] 7.26 Test dashboard with mock data
- [x] 7.27 Test responsive layouts at 375px, 768px, 1280px
- [x] 7.28 Run `bun run lint` and fix any errors
- [x] 7.29 Run `bun run build` and verify successful build
- [x] 7.30 Update memory-bank/activeContext.md with Phase 7 completion

## 8. Phase 8: Groups Page with Data Table

- [x] 8.1 Create `src/app/dashboard/groups/page.tsx`
- [x] 8.2 Add page header with title "Protected Groups" and description
- [x] 8.3 Create `src/components/groups/columns.tsx` for column definitions
- [x] 8.4 Define Checkbox column for row selection
- [x] 8.5 Define Group Name column (sortable)
- [x] 8.6 Define Members column (sortable, right-aligned, formatted with Intl.NumberFormat)
- [x] 8.7 Define Linked Channels column (count display)
- [x] 8.8 Define Status column with Badge (Active/Paused based on `enabled` field)
- [x] 8.9 Define Actions column with DropdownMenu
- [x] 8.10 Add responsive column visibility: hide Linked Channels on mobile
- [x] 8.11 Create `src/components/groups/groups-table.tsx` with TanStack Table setup
- [x] 8.12 Use useGroups() hook to fetch data (NO hardcoded data)
- [x] 8.13 Implement useReactTable with getCoreRowModel
- [x] 8.14 Add getSortedRowModel for column sorting
- [x] 8.15 Add getFilteredRowModel for search filtering
- [x] 8.16 Add getPaginationRowModel for pagination
- [x] 8.17 Implement column visibility state with responsive defaults
- [x] 8.18 Implement row selection state
- [x] 8.19 Create search Input for filtering by group name
- [x] 8.20 Create column visibility DropdownMenu with checkboxes
- [x] 8.21 Create `src/components/groups/table-pagination.tsx` with responsive controls
- [x] 8.22 Show full controls on desktop (First, Prev, Next, Last, page size selector)
- [x] 8.23 Show simplified controls on mobile (Prev, Next only)
- [x] 8.24 Hide "X of Y selected" on mobile
- [x] 8.25 Implement row actions dropdown: View, Edit, Toggle Protection, Delete
- [x] 8.26 Create `src/components/groups/groups-skeleton.tsx` for loading state
- [x] 8.27 Implement empty state message when no groups
- [x] 8.28 Add horizontal scroll wrapper for mobile table overflow
- [x] 8.29 Test sorting, filtering, pagination
- [x] 8.30 Test responsive column hiding at 375px, 768px
- [x] 8.31 Run `bun run lint` and fix any errors
- [x] 8.32 Run `bun run build` and verify successful build
- [x] 8.33 Update memory-bank/activeContext.md with Phase 8 completion

## 9. Phase 9: Channels Page with Data Table

- [x] 9.1 Create `src/app/dashboard/channels/page.tsx`
- [x] 9.2 Add page header with title "Enforced Channels" and description
- [x] 9.3 Create `src/components/channels/columns.tsx` for column definitions
- [x] 9.4 Define Checkbox column for row selection
- [x] 9.5 Define Channel Name column (sortable)
- [x] 9.6 Define Username column (@handle display)
- [x] 9.7 Define Subscribers column (sortable, right-aligned, formatted number)
- [x] 9.8 Define Linked Groups column (count display)
- [x] 9.9 Define Status column with Badge (Active/Inactive based on `isActive` field)
- [x] 9.10 Define Actions column with DropdownMenu (View, Edit, Open in Telegram, Remove)
- [x] 9.11 Add responsive column visibility: hide Username and Linked Groups on mobile
- [x] 9.12 Create `src/components/channels/channels-table.tsx` with TanStack Table setup
- [x] 9.13 Use useChannels() hook to fetch data (NO hardcoded data)
- [x] 9.14 Implement all table features (sorting, filtering, pagination) like Groups
- [x] 9.15 Reuse `table-pagination.tsx` component from Groups
- [x] 9.16 Implement row actions dropdown with channel-specific actions
- [x] 9.17 Create `src/components/channels/channels-skeleton.tsx` for loading state
- [x] 9.18 Implement empty state message when no channels
- [x] 9.19 Test sorting, filtering, pagination
- [x] 9.20 Test responsive column hiding at 375px, 768px
- [x] 9.21 Run `bun run lint` and fix any errors
- [x] 9.22 Run `bun run build` and verify successful build
- [x] 9.23 Update memory-bank/activeContext.md with Phase 9 completion

## 10. Phase 10: Analytics Page Implementation

- [x] 10.1 Create `src/app/dashboard/analytics/page.tsx`
- [x] 10.2 Add page header with title "Analytics"
- [x] 10.3 Add time period Select (Last 7 days, Last 30 days, Last 90 days)
- [x] 10.4 Implement Tabs component with Overview, Verifications, Users tabs
- [x] 10.5 Create `src/components/analytics/overview-cards.tsx` for metrics cards
- [x] 10.6 Use useAnalytics() hook for data (NO hardcoded values)
- [x] 10.7 Display Total Verifications, Success Rate, Avg Response Time, Active Groups
- [x] 10.8 Implement responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- [x] 10.9 Create `src/components/analytics/verification-chart.tsx`
- [x] 10.10 Use useVerificationTrends() hook for data (NO hardcoded values)
- [x] 10.11 Implement area chart with successful/failed verifications
- [x] 10.12 Add stacked area fill effect
- [x] 10.13 Create `src/components/analytics/success-rate-chart.tsx` for radial chart
- [x] 10.14 Use shadcn chart with radial/gauge visualization
- [x] 10.15 Display success percentage in center (from API, not hardcoded)
- [x] 10.16 Create Verifications tab with detailed verification chart
- [x] 10.17 Create Users tab with user growth line chart
- [x] 10.18 Wrap all charts in ResponsiveContainer
- [x] 10.19 Adjust chart heights for mobile: `h-[200px] md:h-[300px]`
- [x] 10.20 Add ChartTooltips to all charts
- [x] 10.21 Create `src/components/analytics/analytics-skeleton.tsx` for loading state
- [x] 10.22 Implement responsive grid: 2 columns desktop, 1 column mobile
- [x] 10.23 Test tab switching functionality
- [x] 10.24 Test time period filter updates data
- [x] 10.25 Test responsive layouts at 375px, 768px, 1280px
- [x] 10.26 Run `bun run lint` and fix any errors
- [x] 10.27 Run `bun run build` and verify successful build
- [x] 10.28 Update memory-bank/activeContext.md with Phase 10 completion

## 11. Phase 11: Settings Page Implementation

- [x] 11.1 Create `src/app/dashboard/settings/page.tsx`
- [x] 11.2 Add page header with title "Settings"
- [x] 11.3 Create `src/components/settings/appearance-section.tsx`
- [x] 11.4 Add Card with "Appearance" title
- [x] 11.5 Implement theme selector with visual previews (Light, Dark, System)
- [x] 11.6 Wire up theme selector to next-themes setTheme()
- [x] 11.7 Create `src/components/settings/preferences-section.tsx`
- [x] 11.8 Add Card with "Preferences" title
- [x] 11.9 Create toggle row component for consistent styling
- [x] 11.10 Add Compact Mode toggle with Switch
- [x] 11.11 Add Reduce Motion toggle with Switch
- [x] 11.12 Implement settings persistence to localStorage
- [x] 11.13 Load saved settings on page mount
- [x] 11.14 Add toast notification on setting change ("Settings saved")
- [x] 11.15 Add Separator between toggle rows
- [x] 11.16 Test theme switching persists across page reloads
- [x] 11.17 Test preference toggles save and load correctly
- [x] 11.18 Test responsive layout (cards stack on mobile)
- [x] 11.19 Run `bun run lint` and fix any errors
- [x] 11.20 Run `bun run build` and verify successful build
- [x] 11.21 Update memory-bank/activeContext.md with Phase 11 completion

## 12. Phase 12: Final Verification & Polish

- [x] 12.1 Verify NO hardcoded data values exist in any component
- [x] 12.2 Verify all data comes from hooks/services
- [x] 12.3 Test complete navigation flow: Dashboard → Analytics → Groups → Channels → Settings
- [x] 12.4 Test sidebar collapse/expand on all pages
- [x] 12.5 Test mobile Sheet navigation on all pages
- [x] 12.6 Test dark/light mode on all pages
- [x] 12.7 Verify all loading skeletons display correctly
- [x] 12.8 Verify all chart tooltips work
- [x] 12.9 Verify groups table sorting, filtering, pagination
- [x] 12.10 Verify channels table sorting, filtering, pagination
- [x] 12.11 Test responsive layouts on mobile viewport (375px)
- [x] 12.12 Test responsive layouts on tablet viewport (768px)
- [x] 12.13 Test responsive layouts on desktop viewport (1280px)
- [x] 12.14 Verify no horizontal overflow on any page at any viewport
- [x] 12.15 Verify touch targets are minimum 44x44px on mobile
- [x] 12.16 Run `bun run lint` and ensure zero errors
- [x] 12.17 Run `bun run build` and ensure successful production build
- [x] 12.18 Verify no TypeScript errors in IDE
- [x] 12.19 Verify all pages have correct page titles
- [x] 12.20 Verify breadcrumb navigation works correctly
- [x] 12.21 Test user dropdown menu functionality
- [x] 12.22 Document API integration steps for future (README section)
- [x] 12.23 Update memory-bank/activeContext.md with Phase 12 completion
- [x] 12.24 Update memory-bank/progress.md with full Phase 37 summary
- [x] 12.25 Create final summary of completed work
