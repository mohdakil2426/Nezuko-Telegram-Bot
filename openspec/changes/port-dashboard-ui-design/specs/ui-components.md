# Spec: UI Components

## Overview

Port premium UI components from prototype to `apps/web/src/components/ui/`.

---

## Component: TiltCard

### Purpose
3D tilt effect card that follows mouse position for physics-based interaction.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Card content |
| `className` | `string` | - | Additional classes |
| `glowColor` | `string` | - | Glow shadow color (e.g. `#d946ef15`) |
| `index` | `number` | `0` | Stagger animation delay index |

### Behavior
- Track mouse position relative to card center
- Apply rotateX/rotateY transform (max ±10 degrees)
- Spring animation for smooth transitions
- Reset rotation on mouse leave
- Entry animation: fade up with delay based on index

### Source
`docs/local/Telegram-Bot-Dashboard/src/components/TiltCard.tsx`

---

## Component: MagneticButton

### Purpose
Button that magnetically follows cursor when hovered.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Button content |
| `variant` | `'primary' \| 'secondary'` | `'primary'` | Button style |
| `className` | `string` | - | Additional classes |
| `...props` | `ButtonHTMLAttributes` | - | Native button props |

### Behavior
- Track cursor position when hovering
- Apply x/y offset (15% of distance from center)
- Scale up on hover (1.05x)
- Scale down on tap (0.95x)
- Reset position on mouse leave

### Source
`docs/local/Telegram-Bot-Dashboard/src/components/MagneticButton.tsx`

---

## Component: AnimatedCounter

### Purpose
Animate number from 0 to target value on mount.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | required | Target value |
| `suffix` | `string` | - | Suffix text (e.g. `%`, `k`) |
| `duration` | `number` | `1000` | Animation duration in ms |

### Behavior
- Count up from 0 to value over duration
- Use easing function (easeOut)
- Format number with locale separators

### Source
`docs/local/Telegram-Bot-Dashboard/src/components/AnimatedCounter.tsx`

---

## Component: StatusBadge

### Purpose
Consistent colored status indicator badges.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | required | Badge text |
| `variant` | `'success' \| 'warning' \| 'error' \| 'info' \| 'neutral'` | `'neutral'` | Color scheme |

### Variants

| Variant | Background | Text |
|---------|------------|------|
| `success` | `bg-green-500/10` | `text-green-500` |
| `warning` | `bg-yellow-500/10` | `text-yellow-500` |
| `error` | `bg-red-500/10` | `text-red-500` |
| `info` | `bg-blue-500/10` | `text-blue-500` |
| `neutral` | `bg-gray-500/10` | `text-gray-500` |

### Source
`docs/local/Telegram-Bot-Dashboard/src/components/StatusBadge.tsx`

---

## Component: DashboardCard

### Purpose
Wrapper card with glass effect, title, subtitle, and action slot.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Card title |
| `subtitle` | `string` | - | Subtitle text |
| `action` | `ReactNode` | - | Right-side action (buttons, etc) |
| `children` | `ReactNode` | required | Card content |
| `className` | `string` | - | Additional classes |
| `index` | `number` | `0` | Animation delay index |
| `glowColor` | `string` | - | Optional glow color |

### Structure
```
┌────────────────────────────────────┐
│ Title                      [Action]│
│ Subtitle                           │
├────────────────────────────────────┤
│ {children}                         │
└────────────────────────────────────┘
```

### Source
`docs/local/Telegram-Bot-Dashboard/src/components/DashboardCard.tsx`

---

## Component: PageTransition

### Purpose
Framer Motion page transition wrapper with fade/slide effects.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Page content |

### Animation
- Initial: opacity 0, y: 20
- Animate: opacity 1, y: 0
- Exit: opacity 0, y: -10
- Duration: 0.3s with easeOut

### Source
`docs/local/Telegram-Bot-Dashboard/src/components/PageTransition.tsx`

---

## Component: ParticleBackground

### Purpose
Floating particle effect in background.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `density` | `number` | `50` | Particle count (10-100) |
| `enabled` | `boolean` | `true` | Show/hide particles |

### Behavior
- Render floating circles/dots
- Random positions, sizes, opacities
- Gentle floating animation
- Use canvas for performance
- Respect `reducedMotion` setting

### Source
`docs/local/Telegram-Bot-Dashboard/src/components/ParticleBackground.tsx`

---

## Files to Create

| File | Component |
|------|-----------|
| `components/ui/tilt-card.tsx` | TiltCard |
| `components/ui/magnetic-button.tsx` | MagneticButton |
| `components/ui/animated-counter.tsx` | AnimatedCounter |
| `components/ui/status-badge.tsx` | StatusBadge |
| `components/ui/dashboard-card.tsx` | DashboardCard |
| `components/ui/page-transition.tsx` | PageTransition |
| `components/ui/particle-background.tsx` | ParticleBackground |

## Acceptance Criteria

- [ ] All components render correctly in light and dark modes
- [ ] Animations respect `reducedMotion` setting
- [ ] No TypeScript errors
- [ ] Components use accent color from theme context
- [ ] All components work with SSR (no hydration mismatch)
