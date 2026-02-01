# Spec: Theme System

## Overview

Port the theme system from `docs/local/Telegram-Bot-Dashboard/src/hooks/useTheme.tsx` to Next.js, integrating with `next-themes` for SSR-safe theme switching.

## Requirements

### FR-1: Theme Mode Switching

- Support Light, Dark, and System modes
- System mode follows OS preference
- Persist mode to localStorage
- No flash on page load (SSR compatible)

### FR-2: Accent Color System

11 preset accent themes:

| ID | Name | Primary Hex | Gradient |
|----|------|-------------|----------|
| `cyberpunk` | Cyberpunk | `#d946ef` | Pink → Cyan |
| `matrix` | Matrix | `#4ade80` | Green gradient |
| `synthwave` | Synthwave | `#9333ea` | Purple → Orange |
| `system-error` | System Error | `#ef4444` | Red gradient |
| `admin` | Admin Access | `#eab308` | Amber gradient |
| `docker` | Docker Blue | `#06b6d4` | Blue → Cyan |
| `toxic` | Toxic | `#84cc16` | Lime → Yellow |
| `night-city` | Night City | `#8b5cf6` | Violet gradient |
| `galaxy` | Galaxy | `#a855f7` | Multi-color |
| `volcano` | Volcano | `#f97316` | Orange → Red |
| `abyss` | Abyss | `#0ea5e9` | Green → Blue → Indigo |

### FR-3: Custom Color Picker

- Allow user to input custom hex color
- Auto-generate HSL values
- Auto-generate complementary gradient
- Persist custom color to localStorage

### FR-4: Effect Toggles

| Setting | Default | Description |
|---------|---------|-------------|
| `animations` | `true` | Enable/disable all Framer Motion |
| `glassEffects` | `true` | Enable/disable backdrop blur |
| `reducedMotion` | `false` | Accessibility: minimize motion |
| `particles` | `true` | Particle background on/off |
| `particleDensity` | `50` | Particle density (10-100) |

### FR-5: CSS Variable Application

On accent change, set these CSS variables on `:root`:

```css
--primary: <hsl>;
--ring: <hsl>;
--sidebar-primary: <hsl>;
--sidebar-ring: <hsl>;
--accent-gradient: <gradient>;
--accent-hex: <hex>;
```

## Files to Create

| File | Description |
|------|-------------|
| `lib/hooks/use-theme-config.tsx` | Theme config context and hook |
| `providers/theme-config-provider.tsx` | Context provider wrapper |
| Update `app/layout.tsx` | Wrap with ThemeConfigProvider |

## Source Reference

- `docs/local/Telegram-Bot-Dashboard/src/hooks/useTheme.tsx` (lines 1-382)

## Acceptance Criteria

- [ ] Theme mode persists across page refreshes
- [ ] Accent color changes apply immediately to all components
- [ ] Custom color picker generates valid gradients
- [ ] Effect toggles add/remove CSS classes correctly
- [ ] No hydration mismatches (SSR safe)
- [ ] All settings persist to localStorage with `nezuko-` prefix
