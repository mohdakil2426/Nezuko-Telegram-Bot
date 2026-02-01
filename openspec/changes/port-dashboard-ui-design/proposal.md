# Proposal: Port Dashboard UI Design

## Summary

Port the premium UI design from the standalone Vite dashboard (`docs/local/Telegram-Bot-Dashboard/`) to the existing Next.js 16 production dashboard (`apps/web/`), including the 11 dynamic accent themes, glassmorphism effects, 3D tilt cards, particle backgrounds, magnetic buttons, and all micro-animations while preserving the existing authentication, API integration, and feature set.

## Motivation

The current Next.js dashboard is functional but lacks visual polish. A separately-developed Vite prototype showcases a premium, anime-inspired UI with:

1. **Dynamic Theming**: 11 preset accent color themes (Cyberpunk, Matrix, Synthwave, etc.) + custom color picker
2. **Advanced Visual Effects**: Glassmorphism, particle backgrounds, 3D tilt interactions
3. **Superior Animations**: Framer Motion page transitions, magnetic buttons, animated counters
4. **Modern Component Design**: Reusable TiltCard, StatCard, DashboardCard, StatusBadge components
5. **Mobile-First Sidebar**: Properly responsive with hamburger menu and smooth transitions
6. **Accessibility Options**: Reduced motion toggle, animation controls

The goal is to achieve the same premium look while maintaining production-ready architecture (Next.js 16, Supabase Auth, TanStack Query, real API).

## Impact

### Components to Add/Port

| Component | Source | Destination | Purpose |
|-----------|--------|-------------|---------|
| `useTheme.tsx` | `hooks/` | `lib/hooks/` | Theme context with 11 accents + effects toggles |
| `TiltCard.tsx` | `components/` | `components/ui/` | 3D tilt effect card wrapper |
| `StatCard.tsx` | `components/` | `components/dashboard/` | Animated stat cards with counters |
| `DashboardCard.tsx` | `components/` | `components/ui/` | Glass-effect card wrapper |
| `MagneticButton.tsx` | `components/` | `components/ui/` | Cursor-following button |
| `AnimatedCounter.tsx` | `components/` | `components/ui/` | Number animation component |
| `StatusBadge.tsx` | `components/` | `components/ui/` | Consistent status indicators |
| `PageHeader.tsx` | `components/layout/` | `components/layout/` | Unified page header component |
| `PageTransition.tsx` | `components/` | `components/ui/` | Framer Motion page transitions |
| `ParticleBackground.tsx` | `components/` | `components/ui/` | Floating particle effect |

### Pages to Redesign

| Page | Changes |
|------|---------|
| `/dashboard` | New stat cards, charts with accent colors, activity timeline |
| `/dashboard/channels` | Asset cards with member stats, search, tabs, sync button |
| `/dashboard/analytics` | Time range selector, engagement trends, command usage pie chart |
| `/dashboard/settings` | **Complete replacement** with theme, accent, effects controls |
| `/dashboard/groups` | Add new styling (keep CRUD functionality) |
| `/dashboard/config` | Add new styling (keep functionality) |
| `/dashboard/database` | Add new styling (keep functionality) |
| `/dashboard/logs` | Merge with new log table styling |

### Styles to Migrate

| Style | Description |
|-------|-------------|
| CSS Variables | `--nezuko-*` surface/border/text tokens |
| Glass Effect | `backdrop-blur-xl` with opacity layers |
| Accent Gradients | `--accent-gradient` for buttons and highlights |
| Animation Classes | `.reduce-motion`, `.no-glass`, `.no-animations` |

### Dependencies

| Package | Current | Action |
|---------|---------|--------|
| `framer-motion` | Already installed as `motion` | Use existing |
| `next-themes` | Not installed | Add for theme management |
| Tailwind v3 → v4 | Source uses v3 | Adapt styles to v4 syntax |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing pages | Port incrementally, test each page |
| Auth integration | Keep existing Supabase SSR auth unchanged |
| API compatibility | Keep existing TanStack Query hooks |
| Tailwind v4 differences | Manually adapt v3 classes to v4 `@theme` syntax |
| Performance (particles) | Make particle effects optional with toggle |

## Success Criteria

- [ ] All 11 accent themes work correctly in light/dark modes
- [ ] Settings page has all customization controls
- [ ] Particle background toggleable and performant
- [ ] All existing features (Groups, Config, Database) still work
- [ ] Mobile sidebar works with hamburger menu
- [ ] Page transitions are smooth
- [ ] No TypeScript errors
- [ ] Lighthouse performance score ≥ 90
