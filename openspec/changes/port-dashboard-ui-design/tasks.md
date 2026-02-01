# Tasks: Port Dashboard UI Design

## Overview

Port the premium UI design from `docs/local/Telegram-Bot-Dashboard/` to `apps/web/`, implementing all visual effects, theme system, and page redesigns while preserving existing functionality.

---

## Phase 1: Foundation (CSS & Theme System)

### Task 1.1: Add CSS Design Tokens
**File:** `apps/web/src/app/globals.css`  
**Spec:** `specs/css-styling.md`  
**Effort:** Small

**Steps:**
1. Open `apps/web/src/app/globals.css`
2. Add Nezuko surface color variables (`--nezuko-bg`, `--nezuko-surface`, etc.)
3. Add text hierarchy variables (`--text-primary`, `--text-secondary`, `--text-muted`)
4. Add dynamic accent variables (`--accent-gradient`, `--accent-hex`)
5. Add light mode overrides in `.light` selector
6. Test: Verify variables are accessible in browser DevTools

**Acceptance:**
- [x] All CSS variables defined in `:root`
- [x] Light mode overrides work correctly

---

### Task 1.2: Add CSS Utility Classes
**File:** `apps/web/src/app/globals.css`  
**Spec:** `specs/css-styling.md`  
**Effort:** Small

**Steps:**
1. Add `.glass` class with backdrop-blur and border
2. Add `.gradient-text` class for accent gradient text
3. Add `.bg-primary-gradient` class
4. Add `.reduce-motion` class for accessibility
5. Add `.no-glass` class to disable blur
6. Add `.no-animations` class to disable animations
7. Add keyframe animations (`float`, `pulse-glow`, `shimmer`)

**Acceptance:**
- [x] `.glass` applies frosted glass effect
- [x] `.gradient-text` shows accent gradient
- [x] Effect toggle classes work

---

### Task 1.3: Create Theme Config Hook
**File:** `apps/web/src/lib/hooks/use-theme-config.tsx`  
**Spec:** `specs/theme-system.md`  
**Source:** `docs/local/Telegram-Bot-Dashboard/src/hooks/useTheme.tsx`  
**Effort:** Medium

**Steps:**
1. Create new file `use-theme-config.tsx`
2. Define `AccentId` type with all 11 themes + 'custom'
3. Define `ACCENT_THEMES` object with name, hsl, hex, gradient for each
4. Create `hexToHSL()` and `generateGradient()` helper functions
5. Create `ThemeConfigContext` with all state values
6. Create `ThemeConfigProvider` component with:
   - State for `accentId`, `customColor`, `animations`, `glassEffects`, `reducedMotion`, `particles`, `particleDensity`
   - Load from localStorage on mount
   - Apply CSS variables to `:root` on accent change
   - Apply CSS classes for effect toggles
   - Save to localStorage on changes
7. Create `useThemeConfig()` hook
8. Export all types and constants

**Acceptance:**
- [x] 11 preset themes work correctly
- [x] Custom color picker generates gradients
- [x] All settings persist to localStorage
- [x] CSS variables update on accent change

---

### Task 1.4: Create Theme Config Provider
**File:** `apps/web/src/providers/theme-config-provider.tsx`  
**Spec:** `specs/theme-system.md`  
**Effort:** Small

**Steps:**
1. Create wrapper component that includes `ThemeConfigProvider`
2. Ensure it wraps children with 'use client' directive
3. Handle SSR - avoid hydration mismatch

**Acceptance:**
- [x] Provider can wrap dashboard layout
- [x] No hydration errors

---

### Task 1.5: Integrate Theme Provider into Layout
**File:** `apps/web/src/app/dashboard/layout.tsx`  
**Spec:** `specs/layout-components.md`  
**Effort:** Small

**Steps:**
1. Import `ThemeConfigProvider`
2. Wrap dashboard layout content with provider
3. Ensure provider is inside other necessary providers (auth, query client)

**Acceptance:**
- [x] Theme context available in all dashboard pages
- [x] No TypeScript errors

---

## Phase 2: Base UI Components

### Task 2.1: Create TiltCard Component
**File:** `apps/web/src/components/ui/tilt-card.tsx`  
**Spec:** `specs/ui-components.md`  
**Source:** `docs/local/Telegram-Bot-Dashboard/src/components/TiltCard.tsx`  
**Effort:** Medium

**Steps:**
1. Create new file with 'use client' directive
2. Implement mouse tracking with `useRef` and `useState`
3. Calculate rotateX/rotateY based on mouse position (max ±10°)
4. Use Framer Motion for spring animation
5. Add glass effect class
6. Add glow shadow from `glowColor` prop
7. Add entry animation with delay based on `index`
8. Handle reduced motion preference

**Acceptance:**
- [x] Card tilts smoothly following mouse
- [x] Resets on mouse leave
- [x] Entry animation works
- [x] Respects reduced motion

---

### Task 2.2: Create MagneticButton Component
**File:** `apps/web/src/components/ui/magnetic-button.tsx`  
**Spec:** `specs/ui-components.md`  
**Source:** `docs/local/Telegram-Bot-Dashboard/src/components/MagneticButton.tsx`  
**Effort:** Small

**Steps:**
1. Create new file with 'use client' directive
2. Track mouse position with `useRef`
3. Calculate x/y offset (15% of distance from center)
4. Use Framer Motion for position animation
5. Add scale on hover (1.05) and tap (0.95)
6. Support 'primary' and 'secondary' variants
7. Reset position on mouse leave

**Acceptance:**
- [x] Button follows cursor within bounds
- [x] Scale animations work
- [x] Both variants styled correctly

---

### Task 2.3: Create AnimatedCounter Component
**File:** `apps/web/src/components/ui/animated-counter.tsx`  
**Spec:** `specs/ui-components.md`  
**Source:** `docs/local/Telegram-Bot-Dashboard/src/components/AnimatedCounter.tsx`  
**Effort:** Small

**Steps:**
1. Create new file with 'use client' directive
2. Use `useEffect` to animate from 0 to value
3. Use `requestAnimationFrame` for smooth animation
4. Apply easeOut timing function
5. Format number with locale separators
6. Support suffix prop

**Acceptance:**
- [x] Numbers count up smoothly on mount
- [x] Large numbers formatted with commas
- [x] Suffix rendered after number

---

### Task 2.4: Create StatusBadge Component
**File:** `apps/web/src/components/ui/status-badge.tsx`  
**Spec:** `specs/ui-components.md`  
**Source:** `docs/local/Telegram-Bot-Dashboard/src/components/StatusBadge.tsx`  
**Effort:** Small

**Steps:**
1. Create new file (can be server component)
2. Define variant styles (success, warning, error, info, neutral)
3. Apply appropriate background and text colors
4. Use `cn()` utility for class merging

**Acceptance:**
- [x] All 5 variants render correctly
- [x] Colors work in light and dark modes

---

### Task 2.5: Create DashboardCard Component
**File:** `apps/web/src/components/ui/dashboard-card.tsx`  
**Spec:** `specs/ui-components.md`  
**Source:** `docs/local/Telegram-Bot-Dashboard/src/components/DashboardCard.tsx`  
**Effort:** Small

**Steps:**
1. Create new file with 'use client' directive
2. Use `TiltCard` as wrapper
3. Add header section with title, subtitle, action slot
4. Apply consistent padding and spacing
5. Support `glowColor` prop passed to TiltCard

**Acceptance:**
- [x] Title and subtitle render correctly
- [x] Action slot works (e.g., buttons)
- [x] Inherits TiltCard 3D effect

---

### Task 2.6: Create PageTransition Component
**File:** `apps/web/src/components/ui/page-transition.tsx`  
**Spec:** `specs/ui-components.md`  
**Source:** `docs/local/Telegram-Bot-Dashboard/src/components/PageTransition.tsx`  
**Effort:** Small

**Steps:**
1. Create new file with 'use client' directive
2. Use Framer Motion `motion.div`
3. Initial: opacity 0, y: 20
4. Animate: opacity 1, y: 0
5. Add easeOut transition with 0.3s duration
6. Export `FadeIn` variant for individual elements

**Acceptance:**
- [x] Page content fades in on load
- [x] Animation respects reduced motion

---

### Task 2.7: Create ParticleBackground Component
**File:** `apps/web/src/components/ui/particle-background.tsx`  
**Spec:** `specs/ui-components.md`  
**Source:** `docs/local/Telegram-Bot-Dashboard/src/components/ParticleBackground.tsx`  
**Effort:** Medium

**Steps:**
1. Create new file with 'use client' directive
2. Use canvas for performance
3. Generate random particle positions, sizes, opacities
4. Animate floating motion with `requestAnimationFrame`
5. Read density and enabled from theme context
6. Clean up animation on unmount
7. Position as fixed background with low z-index

**Acceptance:**
- [x] Particles float smoothly
- [x] Density slider changes particle count
- [x] Toggle enables/disables
- [x] Performance acceptable (60fps)

---

## Phase 3: Dashboard Components

### Task 3.1: Create StatCardV2 Component
**File:** `apps/web/src/components/dashboard/stat-card-v2.tsx`  
**Spec:** `specs/dashboard-components.md`  
**Source:** `docs/local/Telegram-Bot-Dashboard/src/components/StatCard.tsx`  
**Effort:** Medium

**Steps:**
1. Create new file with 'use client' directive
2. Use `TiltCard` as wrapper with glow
3. Add icon with gradient background using accent color
4. Add change badge with conditional coloring
5. Use `AnimatedCounter` for value display
6. Add title with muted styling
7. Support loading state

**Acceptance:**
- [x] Icon uses accent gradient
- [x] Value animates on mount
- [x] Change badge shows +/- correctly
- [x] Works with existing dashboard hooks

---

### Task 3.2: Create ActivityItem Component
**File:** `apps/web/src/components/dashboard/activity-item.tsx`  
**Spec:** `specs/dashboard-components.md`  
**Effort:** Small

**Steps:**
1. Create new file with 'use client' directive
2. Add timeline line on left
3. Add colored status dot with pulse animation
4. Add title, description, timestamp
5. Add hover effect (slide right)
6. Use Framer Motion for staggered entry

**Acceptance:**
- [x] Timeline styling matches design
- [x] Status dots colored by type
- [x] Entry animation works

---

### Task 3.3: Create CustomTooltip Component
**File:** `apps/web/src/components/charts/custom-tooltip.tsx`  
**Spec:** `specs/dashboard-components.md`  
**Effort:** Small

**Steps:**
1. Create new file
2. Style with glass effect
3. Add accent border
4. Format payload values with labels
5. Match Recharts tooltip interface

**Acceptance:**
- [x] Tooltip has glass styling
- [x] Shows formatted values

---

## Phase 4: Layout Components

### Task 4.1: Create PageHeader Component
**File:** `apps/web/src/components/layout/page-header.tsx`  
**Spec:** `specs/layout-components.md`  
**Source:** `docs/local/Telegram-Bot-Dashboard/src/components/layout/PageHeader.tsx`  
**Effort:** Small

**Steps:**
1. Create new file with 'use client' directive
2. Add title with optional gradient highlight
3. Add description text
4. Add children slot for action buttons (right side)
5. Use Framer Motion for entry animation
6. Make responsive (stack on mobile)

**Acceptance:**
- [x] Title shows gradient text for highlight
- [x] Actions appear on right
- [x] Responsive layout works

---

### Task 4.2: Update Sidebar for Mobile
**File:** `apps/web/src/components/layout/sidebar.tsx`  
**Spec:** `specs/layout-components.md`  
**Source:** `docs/local/Telegram-Bot-Dashboard/src/components/layout/Sidebar.tsx`  
**Effort:** Large

**Steps:**
1. Add mobile state (`isMobileOpen`)
2. Add mobile header bar with hamburger button
3. Add overlay backdrop on mobile
4. Make sidebar slide in/out on mobile
5. Add magnetic nav item effect (optional, can simplify)
6. Add active indicator bar on left of active item
7. Add theme toggle button at bottom
8. Add user profile section with avatar and status dot
9. Auto-close sidebar on navigation (mobile)
10. Keep desktop sidebar always visible

**Acceptance:**
- [x] Hamburger menu works on mobile
- [x] Sidebar slides in/out smoothly
- [x] Auto-closes on navigation
- [x] Theme toggle changes theme
- [x] Desktop layout unchanged

---

### Task 4.3: Update Dashboard Layout
**File:** `apps/web/src/app/dashboard/layout.tsx`  
**Spec:** `specs/layout-components.md`  
**Effort:** Small

**Steps:**
1. Add `ParticleBackground` component (conditional)
2. Wrap page content with `PageTransition`
3. Add proper padding for mobile header
4. Ensure correct z-index layering

**Acceptance:**
- [x] Particle background visible when enabled
- [x] Page transitions work
- [x] Mobile layout has proper spacing

---

## Phase 5: Page Redesigns

### Task 5.1: Redesign Dashboard Page
**File:** `apps/web/src/app/dashboard/page.tsx`  
**Spec:** `specs/page-redesigns.md`  
**Effort:** Medium

**Steps:**
1. Replace header with `PageHeader` component
2. Replace stat cards with `StatCardV2`
3. Update chart styling with accent colors
4. Replace activity feed with new `ActivityItem` components
5. Add entry animations for all sections
6. Keep existing data hooks unchanged

**Acceptance:**
- [x] 4 stat cards with 3D tilt
- [x] Chart uses accent gradient
- [x] Activity timeline with colored dots
- [x] All data still loads correctly

---

### Task 5.2: Redesign Analytics Page
**File:** `apps/web/src/app/dashboard/analytics/page.tsx`  
**Spec:** `specs/page-redesigns.md`  
**Effort:** Medium

**Steps:**
1. Add `PageHeader` with time range selector (24h, 7d, 30d)
2. Add 3 stat cards (Active Users, Commands, Errors)
3. Add engagement trends area chart with dual lines
4. Add command usage pie chart
5. Add system logs table with filter tabs
6. Add export report button

**Acceptance:**
- [x] Time range selector works
- [x] Charts render with accent colors
- [x] Logs table filterable

---

### Task 5.3: Redesign Channels Page
**File:** `apps/web/src/app/dashboard/channels/page.tsx`  
**Spec:** `specs/page-redesigns.md`  
**Effort:** Medium

**Steps:**
1. Add `PageHeader` with Sync button
2. Add overview stat cards (Audience, Active, Health)
3. Add search input with animated clear
4. Add tab navigation (ALL, SUPERVISING, CHANNELS, ARCHIVED)
5. Convert table to card grid layout
6. Create asset cards with member stats
7. Add "Connect New Asset" card

**Acceptance:**
- [x] Search filters assets
- [x] Tabs switch views
- [x] Cards show member counts and badges
- [x] Existing CRUD actions still work

---

### Task 5.4: Create New Settings Page
**File:** `apps/web/src/app/dashboard/settings/page.tsx`  
**Spec:** `specs/page-redesigns.md`  
**Source:** `docs/local/Telegram-Bot-Dashboard/src/pages/Settings.tsx`  
**Effort:** Large

**Steps:**
1. Add `PageHeader` with Save button
2. Create Theme section with Light/Dark/System cards
3. Create Accent Theme section with 11 color circles + custom
4. Create custom color picker dialog
5. Create Effects & Animations section with toggles:
   - Animations toggle
   - Glass Effects toggle
   - Reduced Motion toggle
   - Particle Effects toggle
   - Particle Density slider
6. Create preview card at bottom
7. Connect all controls to theme context
8. Add toast notifications on save

**Acceptance:**
- [x] Theme mode switches work
- [x] All 11 accents apply correctly
- [x] Custom color picker opens and works
- [x] All toggles function
- [x] Settings persist on refresh

---

## Phase 6: Polish & Existing Pages

### Task 6.1: Style Groups Page
**File:** `apps/web/src/app/dashboard/groups/page.tsx`  
**Effort:** Small

**Steps:**
1. Add `PageHeader` component
2. Apply glass effect to table container
3. Add entry animations
4. Keep all existing functionality

**Acceptance:**
- [x] Consistent styling with other pages
- [x] All CRUD operations work

---

### Task 6.2: Style Config Page
**File:** `apps/web/src/app/dashboard/config/page.tsx`  
**Effort:** Small

**Steps:**
1. Add `PageHeader` component
2. Apply glass effect to form containers
3. Add entry animations
4. Keep all existing functionality

**Acceptance:**
- [x] Consistent styling with other pages
- [x] Config save/load works

---

### Task 6.3: Style Database Page
**File:** `apps/web/src/app/dashboard/database/page.tsx`  
**Effort:** Small

**Steps:**
1. Add `PageHeader` component
2. Apply glass effect to containers
3. Style SQL editor/results
4. Keep all existing functionality

**Acceptance:**
- [x] Consistent styling
- [x] Query execution works

---

### Task 6.4: Style Logs Page
**File:** `apps/web/src/app/dashboard/logs/page.tsx`  
**Effort:** Small

**Steps:**
1. Add `PageHeader` component
2. Apply glass effect to log container
3. Use `StatusBadge` for log levels
4. Keep real-time Supabase integration

**Acceptance:**
- [x] Log levels have color badges
- [x] Real-time updates work

---

## Phase 7: Testing & Documentation

### Task 7.1: Test Mobile Responsiveness
**Effort:** Medium

**Steps:**
1. Test sidebar on mobile (hamburger, slide, close)
2. Test all pages on viewport widths: 375px, 768px, 1024px, 1440px
3. Fix any overflow or layout issues
4. Test touch interactions

**Acceptance:**
- [x] No horizontal scroll on mobile
- [x] All pages readable on 375px width
- [x] Sidebar works correctly on mobile

---

### Task 7.2: Test Theme Switching
**Effort:** Small

**Steps:**
1. Test all 11 accent themes in dark mode
2. Test all 11 accent themes in light mode
3. Test custom color picker
4. Verify persistence across page refreshes
5. Test effect toggles

**Acceptance:**
- [x] All themes apply correctly
- [x] Colors look good in both modes
- [x] Settings persist

---

### Task 7.3: Accessibility Audit
**Effort:** Small

**Steps:**
1. Test reduced motion toggle eliminates animations
2. Verify color contrast meets WCAG AA
3. Test keyboard navigation
4. Verify screen reader compatibility

**Acceptance:**
- [x] Reduced motion works
- [x] Contrast ratios pass
- [x] Keyboard navigation functional

---

### Task 7.4: Update Memory Bank
**Effort:** Small

**Steps:**
1. Update `memory-bank/activeContext.md` with new UI status
2. Update `memory-bank/progress.md` with completed phase
3. Document new component library in `systemPatterns.md`

**Acceptance:**
- [x] Memory bank reflects current state

---

## Summary

| Phase | Tasks | Estimated Effort |
|-------|-------|------------------|
| Phase 1: Foundation | 5 tasks | ~4 hours |
| Phase 2: Base UI Components | 7 tasks | ~6 hours |
| Phase 3: Dashboard Components | 3 tasks | ~3 hours |
| Phase 4: Layout Components | 3 tasks | ~5 hours |
| Phase 5: Page Redesigns | 4 tasks | ~8 hours |
| Phase 6: Polish | 4 tasks | ~2 hours |
| Phase 7: Testing | 4 tasks | ~3 hours |
| **Total** | **30 tasks** | **~31 hours** |

---

## Implementation Order

Execute tasks in this order for best results:

1. **1.1 → 1.2** (CSS foundation)
2. **1.3 → 1.4 → 1.5** (Theme system)
3. **2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6** (UI components)
4. **2.7** (Particles - can be parallel)
5. **3.1 → 3.2 → 3.3** (Dashboard components)
6. **4.1 → 4.2 → 4.3** (Layout)
7. **5.1** (Dashboard page - validates all components)
8. **5.4** (Settings page - complete new)
9. **5.2 → 5.3** (Analytics, Channels)
10. **6.1 → 6.4** (Polish existing)
11. **7.1 → 7.4** (Testing)
