# Spec: CSS & Styling

## Overview

Port CSS styles, design tokens, and Tailwind configuration updates.

---

## Design Tokens (CSS Variables)

### New Variables to Add to `globals.css`

```css
:root {
  /* Nezuko Surface Colors */
  --nezuko-bg: var(--background);
  --nezuko-surface: oklch(0.18 0.02 285);
  --nezuko-surface-hover: oklch(0.22 0.02 285);
  --nezuko-border: oklch(0.28 0.02 285);
  --nezuko-border-hover: oklch(0.35 0.02 285);
  
  /* Text Hierarchy */
  --text-primary: var(--foreground);
  --text-secondary: oklch(0.75 0.02 285);
  --text-muted: oklch(0.55 0.02 285);
  
  /* Dynamic Accent (set by JS) */
  --accent-gradient: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%);
  --accent-hex: #d946ef;
}

.light {
  --nezuko-surface: oklch(0.98 0.01 285);
  --nezuko-surface-hover: oklch(0.95 0.01 285);
  --nezuko-border: oklch(0.90 0.01 285);
  --nezuko-border-hover: oklch(0.85 0.01 285);
  --text-secondary: oklch(0.45 0.02 285);
  --text-muted: oklch(0.60 0.02 285);
}
```

---

## Utility Classes

### Glass Effect
```css
.glass {
  background: oklch(0.15 0.02 285 / 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--nezuko-border);
}

.light .glass {
  background: oklch(0.98 0.01 285 / 0.8);
}
```

### Gradient Text
```css
.gradient-text {
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### Primary Gradient Background
```css
.bg-primary-gradient {
  background: var(--accent-gradient);
}
```

---

## Effect Toggle Classes

### Reduced Motion
```css
.reduce-motion *,
.reduce-motion *::before,
.reduce-motion *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}
```

### No Glass
```css
.no-glass .glass {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  background: var(--nezuko-surface);
}
```

### No Animations
```css
.no-animations * {
  animation: none !important;
  transition: none !important;
}
```

---

## Tailwind v4 Adaptations

### Theme Extension

Add to `globals.css` theme section:

```css
@theme inline {
  /* Existing theme tokens... */
  
  /* Animation durations */
  --animate-duration-fast: 0.15s;
  --animate-duration-normal: 0.3s;
  --animate-duration-slow: 0.5s;
  
  /* Timing functions */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### New Animation Keyframes

```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 5px var(--accent-hex); }
  50% { box-shadow: 0 0 20px var(--accent-hex); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

---

## Source Files Reference

| Source File | Lines | Description |
|-------------|-------|-------------|
| `docs/local/Telegram-Bot-Dashboard/src/index.css` | 1-450 | Main stylesheet with all variables |
| `docs/local/Telegram-Bot-Dashboard/tailwind.config.js` | 1-180 | Tailwind config (v3 syntax) |

---

## Files to Modify

| File | Action |
|------|--------|
| `app/globals.css` | MODIFY - Add Nezuko design tokens, utilities |

## Migration Notes

### Tailwind v3 → v4 Differences

| v3 Syntax | v4 Equivalent |
|-----------|---------------|
| `tailwind.config.js` | `@theme inline` in CSS |
| `theme.extend.colors` | CSS variables |
| `screens` breakpoints | Already use CSS |

### CSS Variable Naming

- Use `--nezuko-` prefix for design system tokens
- Use `--text-` prefix for typography
- Use `--accent-` prefix for dynamic colors

---

## Acceptance Criteria

- [ ] All new CSS variables defined
- [ ] Glass effect works in light and dark modes
- [ ] Gradient text shows accent color
- [ ] Effect toggle classes work correctly
- [ ] No Tailwind compilation errors
- [ ] Variables accessible from components
