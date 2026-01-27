# 🎨 UI/UX Design System & Guidelines

> **Nezuko Admin Panel - Premium $10,000+ Design Specification**
> 
> **Last Updated**: January 24, 2026  
> **Design Philosophy**: Premium, Immersive, Accessible

---

## 1. Design Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NEZUKO DESIGN PRINCIPLES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1️⃣  PREMIUM FIRST                                                          │
│      Every pixel should scream quality. No generic UI allowed.             │
│                                                                             │
│  2️⃣  PURPOSEFUL MOTION                                                      │
│      Animations guide, don't distract. Every micro-interaction has reason. │
│                                                                             │
│  3️⃣  ACCESSIBILITY BY DEFAULT                                               │
│      WCAG 2.2 AA compliant. Reduced motion support. Color contrast 4.5:1+. │
│                                                                             │
│  4️⃣  DARK MODE NATIVE                                                       │
│      Designed for dark mode first, with carefully calibrated light mode.   │
│                                                                             │
│  5️⃣  RESPONSIVE & ADAPTIVE                                                  │
│      Works beautifully from 320px mobile to 4K displays.                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Color System (OKLCH - 2026 Standard)

### 2.1 Why OKLCH?

OKLCH is the modern CSS color space for 2026, offering:
- **50% more colors** than sRGB (P3 wide gamut)
- **Perceptually uniform** - colors look as expected
- **Predictable contrast** - accessibility-friendly
- **Smoother gradients** - no muddy transitions
- **Native browser support** since 2023

### 2.2 Primary Palette (Indigo/Violet)

```css
/* Primary Brand Colors - Deep Violet/Indigo */
:root {
  /* Core Brand */
  --color-primary-50:  oklch(0.98 0.010 285);   /* Lightest tint */
  --color-primary-100: oklch(0.95 0.025 285);
  --color-primary-200: oklch(0.88 0.050 280);
  --color-primary-300: oklch(0.78 0.100 275);
  --color-primary-400: oklch(0.68 0.160 270);
  --color-primary-500: oklch(0.55 0.220 265);   /* ← Main brand color */
  --color-primary-600: oklch(0.48 0.200 265);
  --color-primary-700: oklch(0.40 0.180 265);
  --color-primary-800: oklch(0.32 0.140 265);
  --color-primary-900: oklch(0.25 0.100 265);
  --color-primary-950: oklch(0.18 0.060 265);   /* Darkest shade */
}
```

### 2.3 Semantic Colors

```css
:root {
  /* Success - Emerald Green */
  --color-success-50:  oklch(0.98 0.015 160);
  --color-success-100: oklch(0.94 0.040 160);
  --color-success-500: oklch(0.65 0.180 160);   /* Main */
  --color-success-600: oklch(0.55 0.160 160);
  --color-success-900: oklch(0.25 0.080 160);

  /* Warning - Amber */
  --color-warning-50:  oklch(0.98 0.020 85);
  --color-warning-100: oklch(0.94 0.055 85);
  --color-warning-500: oklch(0.78 0.170 75);    /* Main */
  --color-warning-600: oklch(0.68 0.160 70);
  --color-warning-900: oklch(0.35 0.090 65);

  /* Error - Rose Red */
  --color-error-50:  oklch(0.98 0.015 25);
  --color-error-100: oklch(0.94 0.040 25);
  --color-error-500: oklch(0.60 0.220 25);      /* Main */
  --color-error-600: oklch(0.52 0.200 25);
  --color-error-900: oklch(0.28 0.100 25);

  /* Info - Sky Blue */
  --color-info-50:  oklch(0.98 0.012 230);
  --color-info-100: oklch(0.94 0.035 230);
  --color-info-500: oklch(0.62 0.180 230);      /* Main */
  --color-info-600: oklch(0.52 0.160 230);
  --color-info-900: oklch(0.28 0.090 230);
}
```

### 2.4 Dark Mode Neutrals (Slate)

```css
:root {
  /* Dark Mode Background Layers */
  --color-background:      oklch(0.12 0.008 265);  /* Page background */
  --color-surface:         oklch(0.16 0.010 265);  /* Card background */
  --color-surface-raised:  oklch(0.20 0.012 265);  /* Elevated cards */
  --color-surface-overlay: oklch(0.24 0.014 265);  /* Modals, dropdowns */
  
  /* Borders */
  --color-border:         oklch(0.28 0.012 265);   /* Default border */
  --color-border-subtle:  oklch(0.22 0.010 265);   /* Subtle separator */
  --color-border-strong:  oklch(0.36 0.016 265);   /* Emphasis border */
  
  /* Text */
  --color-text-primary:   oklch(0.98 0.002 265);   /* Primary text */
  --color-text-secondary: oklch(0.72 0.008 265);   /* Secondary text */
  --color-text-muted:     oklch(0.55 0.012 265);   /* Muted/disabled */
  --color-text-inverted:  oklch(0.12 0.008 265);   /* Text on light bg */
}
```

### 2.5 Glassmorphism Effects

```css
/* Premium Glassmorphism for cards and overlays */
.glass-card {
  background: oklch(0.16 0.010 265 / 0.7);
  backdrop-filter: blur(16px) saturate(1.8);
  -webkit-backdrop-filter: blur(16px) saturate(1.8);
  border: 1px solid oklch(0.98 0.002 265 / 0.08);
  box-shadow: 
    0 4px 30px oklch(0 0 0 / 0.1),
    inset 0 1px 0 oklch(0.98 0.002 265 / 0.05);
}

/* Dark glassmorphism with gradient background */
.glass-premium {
  background: linear-gradient(
    135deg,
    oklch(0.18 0.020 280 / 0.9) 0%,
    oklch(0.14 0.015 260 / 0.8) 100%
  );
  backdrop-filter: blur(24px) saturate(2);
  border: 1px solid oklch(0.98 0.002 265 / 0.12);
}
```

### 2.6 Premium Gradients

```css
/* Hero gradient backgrounds */
.gradient-hero {
  background: linear-gradient(
    135deg,
    oklch(0.35 0.180 280) 0%,
    oklch(0.25 0.200 300) 50%,
    oklch(0.30 0.160 260) 100%
  );
}

/* Subtle card glow on hover */
.card-glow:hover {
  box-shadow: 
    0 0 40px oklch(0.55 0.220 265 / 0.15),
    0 0 80px oklch(0.55 0.220 265 / 0.08);
}

/* Animated gradient border */
.gradient-border {
  background: linear-gradient(var(--color-surface), var(--color-surface)) padding-box,
              linear-gradient(135deg, 
                oklch(0.55 0.220 265),
                oklch(0.60 0.180 300),
                oklch(0.55 0.220 265)
              ) border-box;
  border: 2px solid transparent;
}
```

---

## 3. Typography System

### 3.1 Font Stack

```css
:root {
  /* Primary font - Inter (Google Fonts) */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
               Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  
  /* Monospace - JetBrains Mono for code/logs */
  --font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;
  
  /* Display - Outfit for large headings (optional premium) */
  --font-display: 'Outfit', var(--font-sans);
}
```

### 3.2 Type Scale

```css
:root {
  /* Size scale (rem-based for accessibility) */
  --text-xs:   0.75rem;    /* 12px */
  --text-sm:   0.875rem;   /* 14px */
  --text-base: 1rem;       /* 16px */
  --text-lg:   1.125rem;   /* 18px */
  --text-xl:   1.25rem;    /* 20px */
  --text-2xl:  1.5rem;     /* 24px */
  --text-3xl:  1.875rem;   /* 30px */
  --text-4xl:  2.25rem;    /* 36px */
  --text-5xl:  3rem;       /* 48px */
  --text-6xl:  3.75rem;    /* 60px */
  
  /* Line heights */
  --leading-none:    1;
  --leading-tight:   1.25;
  --leading-snug:    1.375;
  --leading-normal:  1.5;
  --leading-relaxed: 1.625;
  --leading-loose:   2;
  
  /* Font weights */
  --font-light:    300;
  --font-normal:   400;
  --font-medium:   500;
  --font-semibold: 600;
  --font-bold:     700;
}
```

### 3.3 Text Styles

| Style          | Size    | Weight         | Line Height | Use Case        |
| -------------- | ------- | -------------- | ----------- | --------------- |
| **Display**    | 48-60px | Bold           | 1.1         | Hero titles     |
| **H1**         | 36px    | Semibold       | 1.25        | Page titles     |
| **H2**         | 24px    | Semibold       | 1.3         | Section headers |
| **H3**         | 20px    | Medium         | 1.4         | Card titles     |
| **H4**         | 18px    | Medium         | 1.4         | Subsections     |
| **Body**       | 16px    | Regular        | 1.5         | Paragraphs      |
| **Body Small** | 14px    | Regular        | 1.5         | Secondary text  |
| **Caption**    | 12px    | Regular        | 1.4         | Labels, hints   |
| **Code**       | 14px    | Regular (Mono) | 1.5         | Code, logs      |

---

## 4. Animation & Micro-Interactions

### 4.1 Animation Library: Motion (formerly Framer Motion)

```json
// Motion v12.29+ (Latest January 2026)
{
  "dependencies": {
    "motion": "^12.29.0"
  }
}
```

### 4.2 Animation Principles

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MICRO-INTERACTION BEST PRACTICES                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ⏱️  TIMING                                                                 │
│      • Micro-interactions: 100-300ms                                       │
│      • Page transitions: 300-500ms                                         │
│      • Complex animations: 500-800ms max                                   │
│                                                                             │
│  📈  EASING                                                                 │
│      • Use spring physics for natural feel                                 │
│      • Avoid linear animations (feels robotic)                             │
│      • Exit animations slightly faster than enter                          │
│                                                                             │
│  🎯  PURPOSE                                                                │
│      • Every animation must serve UX purpose                               │
│      • Provide feedback for user actions                                   │
│      • Guide attention to important elements                               │
│      • Never animate just for decoration                                   │
│                                                                             │
│  ♿  ACCESSIBILITY                                                          │
│      • Respect prefers-reduced-motion                                      │
│      • No rapid flashing (epilepsy risk)                                   │
│      • Provide static alternatives                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Core Animation Presets

```typescript
// lib/animations.ts - Motion animation presets

import { type Variants, type Transition } from "motion/react";

// Spring physics for natural movement
export const springTransition: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

export const springBouncy: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 25,
  mass: 0.8,
};

// Smooth easing
export const smoothTransition: Transition = {
  duration: 0.3,
  ease: [0.25, 0.1, 0.25, 1], // cubic-bezier
};

// Fade in/out variants
export const fadeInOut: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// Scale and fade
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: springTransition 
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.15 }
  },
};

// Slide from bottom (modals, sheets)
export const slideUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: springTransition 
  },
  exit: { 
    opacity: 0, 
    y: 10,
    transition: { duration: 0.2 }
  },
};

// Stagger children animation
export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: springTransition
  },
};
```

### 4.4 Micro-Interaction Components

#### Button Interactions

```tsx
// components/ui/animated-button.tsx
import { motion } from "motion/react";

export function AnimatedButton({ children, ...props }) {
  return (
    <motion.button
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      whileTap={{ 
        scale: 0.98,
        transition: { duration: 0.1 }
      }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
```

#### Card Hover Effects

```tsx
// components/ui/hover-card.tsx
import { motion } from "motion/react";

export function HoverCard({ children }) {
  return (
    <motion.div
      className="relative rounded-xl bg-surface p-6 border border-border"
      initial={{ boxShadow: "0 0 0 rgba(0,0,0,0)" }}
      whileHover={{
        y: -4,
        boxShadow: "0 20px 40px oklch(0 0 0 / 0.2)",
        borderColor: "oklch(0.55 0.220 265 / 0.3)",
        transition: { duration: 0.3 }
      }}
    >
      {/* Gradient glow on hover */}
      <motion.div
        className="absolute inset-0 rounded-xl opacity-0"
        style={{
          background: "radial-gradient(circle at 50% 0%, oklch(0.55 0.220 265 / 0.15), transparent 70%)"
        }}
        whileHover={{ opacity: 1 }}
      />
      {children}
    </motion.div>
  );
}
```

#### Loading Spinners

```tsx
// components/ui/spinner.tsx
import { motion } from "motion/react";

export function Spinner({ size = 24 }) {
  return (
    <motion.div
      className="rounded-full border-2 border-primary-500/30 border-t-primary-500"
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  );
}

// Premium pulsing spinner
export function PulseSpinner({ size = 24 }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full bg-primary-500"
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.4,
            ease: "easeOut"
          }}
        />
      ))}
      <div 
        className="absolute inset-0 rounded-full bg-primary-500"
        style={{ width: size * 0.4, height: size * 0.4, margin: 'auto' }}
      />
    </div>
  );
}
```

#### Toast Notifications

```tsx
// components/ui/toast.tsx
import { motion, AnimatePresence } from "motion/react";

export function Toast({ message, type, isVisible, onClose }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bottom-6 right-6 z-50"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1,
            transition: { type: "spring", stiffness: 300, damping: 25 }
          }}
          exit={{ 
            opacity: 0, 
            scale: 0.9, 
            x: 100,
            transition: { duration: 0.2 }
          }}
        >
          <div className="glass-card px-4 py-3 rounded-lg flex items-center gap-3">
            <StatusIcon type={type} />
            <span>{message}</span>
            <button onClick={onClose} className="ml-2 hover:opacity-70">✕</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### 4.5 Reduced Motion Support

```tsx
// hooks/use-reduced-motion.ts
import { useEffect, useState } from "react";

export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
}

// Usage in components
export function AnimatedComponent({ children }) {
  const reducedMotion = useReducedMotion();
  
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : springTransition}
    >
      {children}
    </motion.div>
  );
}
```

---

## 5. Component Libraries & Tools

### 5.1 Primary: shadcn/ui 3.7.0

```bash
# Initialize with new visual styles
npx shadcn@3.7.0 create

# Choose theme: "Lyra" or "Nova" for premium dark mode
# Add essential components
npx shadcn@latest add button card dialog dropdown-menu
npx shadcn@latest add table tabs toast tooltip avatar badge
npx shadcn@latest add form input label select textarea
npx shadcn@latest add sheet sidebar navigation-menu skeleton
npx shadcn@latest add chart calendar command
```

### 5.2 Animation Libraries

| Library               | Version | Purpose                                         |
| --------------------- | ------- | ----------------------------------------------- |
| **Motion**            | 12.29.0 | Core animation library (formerly Framer Motion) |
| **Motion Primitives** | Latest  | Pre-built animated components                   |
| **Magic UI**          | Latest  | 150+ animated effects                           |
| **Animate UI**        | Latest  | shadcn-compatible animations                    |

#### Magic UI Components to Use

```bash
# Install Magic UI components (copy-paste style)
# From: magicui.design

# Background effects
- Aurora Background
- Dot Pattern Background
- Grid Background

# Text effects
- Text Reveal
- Typing Animation
- Blur In Text

# Interactive elements
- Magnetic Button
- Shine Border
- Border Beam

# Cards
- 3D Card Effect
- Flip Card
- Glow Card
```

### 5.3 Chart Libraries

| Library            | Version | Best For                              |
| ------------------ | ------- | ------------------------------------- |
| **Recharts**       | 3.7.0   | General charts, shadcn/ui integration |
| **Tremor**         | 3.18+   | Dashboard-specific components         |
| **Apache ECharts** | Latest  | Large datasets, WebGL rendering       |

#### Recommended Chart Combinations

```tsx
// For dashboard stats - Use Recharts via shadcn/ui Chart component
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// Premium chart styling
const chartConfig = {
  gradient: {
    id: "colorGradient",
    stops: [
      { offset: "0%", color: "oklch(0.55 0.220 265)", opacity: 0.4 },
      { offset: "100%", color: "oklch(0.55 0.220 265)", opacity: 0 },
    ]
  },
  line: {
    stroke: "oklch(0.55 0.220 265)",
    strokeWidth: 2,
  },
  dot: {
    fill: "oklch(0.55 0.220 265)",
    strokeWidth: 3,
  }
};
```

---

## 6. Layout & Spacing

### 6.1 Spacing Scale

```css
:root {
  --space-0:  0;
  --space-1:  0.25rem;   /* 4px */
  --space-2:  0.5rem;    /* 8px */
  --space-3:  0.75rem;   /* 12px */
  --space-4:  1rem;      /* 16px */
  --space-5:  1.25rem;   /* 20px */
  --space-6:  1.5rem;    /* 24px */
  --space-8:  2rem;      /* 32px */
  --space-10: 2.5rem;    /* 40px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */
  --space-20: 5rem;      /* 80px */
  --space-24: 6rem;      /* 96px */
}
```

### 6.2 Border Radius Scale

```css
:root {
  --radius-none: 0;
  --radius-sm:   0.25rem;   /* 4px - inputs, small elements */
  --radius-md:   0.5rem;    /* 8px - buttons, chips */
  --radius-lg:   0.75rem;   /* 12px - cards */
  --radius-xl:   1rem;      /* 16px - modals */
  --radius-2xl:  1.5rem;    /* 24px - large containers */
  --radius-full: 9999px;    /* Pills, avatars */
}
```

### 6.3 Responsive Breakpoints

```css
/* Tailwind 4 breakpoints */
@media (width >= 640px)  { /* sm */ }
@media (width >= 768px)  { /* md */ }
@media (width >= 1024px) { /* lg */ }
@media (width >= 1280px) { /* xl */ }
@media (width >= 1536px) { /* 2xl */ }
```

---

## 7. Code Quality & Safety Rules

### 7.1 ESLint Configuration (Flat Config)

```javascript
// eslint.config.js
import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import a11y from "eslint-plugin-jsx-a11y";
import security from "eslint-plugin-security";
import prettier from "eslint-plugin-prettier/recommended";

export default [
  js.configs.recommended,
  ...tseslint.configs.strict,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  a11y.configs.flat.recommended,
  prettier,
  {
    plugins: {
      "@typescript-eslint": tseslint,
      "react-hooks": reactHooks,
      security,
    },
    rules: {
      // TypeScript strict
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/strict-boolean-expressions": "warn",
      
      // React
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react/jsx-no-target-blank": "error",
      "react/no-danger": "warn",
      
      // Accessibility
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/click-events-have-key-events": "error",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      
      // Security
      "security/detect-object-injection": "warn",
      "security/detect-non-literal-regexp": "warn",
    },
  },
];
```

### 7.2 TypeScript Configuration (Strict)

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

### 7.3 Security Best Practices

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND SECURITY RULES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ❌ NEVER                                                                   │
│     • Use dangerouslySetInnerHTML without DOMPurify sanitization           │
│     • Store sensitive data in localStorage/sessionStorage                  │
│     • Expose API keys or secrets in client code                            │
│     • Trust user input without validation                                  │
│     • Use eval() or Function() with dynamic strings                        │
│     • Disable HTTPS in production                                          │
│                                                                             │
│  ✅ ALWAYS                                                                  │
│     • Validate all API responses with Zod schemas                          │
│     • Use httpOnly cookies for auth tokens                                 │
│     • Sanitize HTML with DOMPurify before rendering                        │
│     • Use CSP (Content Security Policy) headers                            │
│     • Implement rate limiting on sensitive actions                         │
│     • Use CSRF tokens for state-changing requests                          │
│     • Audit dependencies regularly (npm audit)                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.4 Component Patterns

```tsx
// ✅ CORRECT: Type-safe props with runtime validation
interface UserCardProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
  onDelete?: (id: string) => void;
}

export function UserCard({ user, onDelete }: UserCardProps) {
  // Use optional chaining and nullish coalescing
  const displayName = user.name ?? "Unknown User";
  
  return (
    <div className="card">
      <h3>{displayName}</h3>
      <p>{user.email}</p>
      {onDelete && (
        <button 
          onClick={() => onDelete(user.id)}
          aria-label={`Delete ${displayName}`}
        >
          Delete
        </button>
      )}
    </div>
  );
}

// ❌ WRONG: No types, unsafe patterns
export function UserCard({ user, onDelete }) {
  return (
    <div dangerouslySetInnerHTML={{ __html: user.bio }} />
  );
}
```

### 7.5 API Data Validation

```tsx
// schemas/api.ts
import { z } from "zod";

// Define schema for API response
export const GroupSchema = z.object({
  id: z.string().uuid(),
  group_id: z.number(),
  title: z.string().min(1).max(255),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
});

export const GroupsResponseSchema = z.object({
  status: z.literal("success"),
  data: z.array(GroupSchema),
  meta: z.object({
    pagination: z.object({
      page: z.number(),
      per_page: z.number(),
      total_items: z.number(),
    }),
  }),
});

// Type inference from schema
export type Group = z.infer<typeof GroupSchema>;
export type GroupsResponse = z.infer<typeof GroupsResponseSchema>;

// Usage in API calls
export async function fetchGroups(): Promise<Group[]> {
  const response = await fetch("/api/v1/groups");
  const json = await response.json();
  
  // Validate at runtime
  const validated = GroupsResponseSchema.parse(json);
  return validated.data;
}
```

---

## 8. Accessibility (WCAG 2.2 AA)

### 8.1 Color Contrast Requirements

| Element            | Minimum Ratio | Our Target |
| ------------------ | ------------- | ---------- |
| Normal text        | 4.5:1         | 7:1+       |
| Large text (24px+) | 3:1           | 4.5:1+     |
| UI components      | 3:1           | 4.5:1+     |
| Focus indicators   | 3:1           | 4.5:1+     |

### 8.2 Keyboard Navigation

```tsx
// All interactive elements must be keyboard accessible
<button 
  onClick={handleClick}
  onKeyDown={(e) => e.key === "Enter" && handleClick()}
  tabIndex={0}
  role="button"
  aria-label="Descriptive label"
>
  Click me
</button>

// Focus visible styles
.focusable:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}
```

### 8.3 ARIA Labels

```tsx
// ✅ CORRECT: Descriptive ARIA labels
<button aria-label="Close modal dialog">
  <XIcon aria-hidden="true" />
</button>

<nav aria-label="Main navigation">
  <ul role="menubar">
    <li role="menuitem"><a href="/dashboard">Dashboard</a></li>
  </ul>
</nav>

// Status announcements
<div role="status" aria-live="polite">
  Settings saved successfully
</div>

<div role="alert" aria-live="assertive">
  Error: Failed to save changes
</div>
```

---

## 9. File Structure

> 📁 **Complete Structure:** See [02a-FOLDER-STRUCTURE.md](./02a-FOLDER-STRUCTURE.md) for full folder structure with naming conventions.

```
apps/web/src/
├── app/                    # Next.js App Router
│   ├── (auth)/             #   └── Login, forgot password
│   ├── (dashboard)/        #   └── Protected dashboard routes
│   │   ├── groups/         #       └── Groups management
│   │   ├── channels/       #       └── Channels management
│   │   ├── config/         #       └── Configuration pages
│   │   ├── logs/           #       └── Real-time logs
│   │   ├── database/       #       └── Database browser
│   │   ├── analytics/      #       └── Analytics charts
│   │   └── settings/       #       └── Admin settings
│   └── api/                #   └── API routes (optional)
├── components/             # Shared UI components
│   ├── ui/                 #   └── shadcn/ui primitives
│   ├── layout/             #   └── Sidebar, header
│   ├── dashboard/          #   └── Stats cards, feeds
│   ├── forms/              #   └── Form components
│   ├── charts/             #   └── Data visualization
│   └── shared/             #   └── Cross-feature components
├── lib/                    # Utilities & services
│   ├── api/                #   └── API client
│   ├── hooks/              #   └── Custom React hooks
│   ├── utils/              #   └── Helper functions
│   └── animations/         #   └── Motion presets
├── stores/                 # State management (Zustand)
├── providers/              # React context providers
└── types/                  # TypeScript definitions
```

---



## 10. Performance Targets

| Metric                             | Target | Measurement  |
| ---------------------------------- | ------ | ------------ |
| **LCP** (Largest Contentful Paint) | <2.5s  | Good         |
| **FID** (First Input Delay)        | <100ms | Good         |
| **CLS** (Cumulative Layout Shift)  | <0.1   | Good         |
| **TTI** (Time to Interactive)      | <3.5s  | Fast         |
| **Bundle Size (gzipped)**          | <150KB | Initial load |
| **Animation FPS**                  | 60fps  | No jank      |

---

[← Back to API Design](./04-API-DESIGN.md) | [Back to Index](./README.md) | [Next: Implementation →](./06-IMPLEMENTATION.md)
