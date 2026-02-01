# Design: Port Dashboard UI Design

## Context

The Nezuko project has two dashboards:
1. **Production Dashboard** (`apps/web/`) - Next.js 16, Supabase Auth, TanStack Query, functional but basic UI
2. **UI Prototype** (`docs/local/Telegram-Bot-Dashboard/`) - Vite + React, premium anime-inspired design, mock data

The goal is to port the premium visual design from the prototype to the production dashboard while preserving all backend integration.

### Current State

```
apps/web/
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── page.tsx            # Basic stats, chart, activity
│   │   │   ├── analytics/          # Recharts visualization
│   │   │   ├── channels/           # Channel CRUD + detail pages
│   │   │   ├── groups/             # Group CRUD + detail pages
│   │   │   ├── config/             # Bot configuration
│   │   │   ├── database/           # Raw database browser
│   │   │   ├── logs/               # Real-time Supabase logs
│   │   │   └── settings/           # Basic settings (placeholder)
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── dashboard/              # stats-card, activity-feed
│   │   ├── layout/                 # sidebar, header
│   │   └── ...
│   └── lib/
│       ├── hooks/                  # TanStack Query hooks (keep)
│       └── supabase/               # Auth (keep)
```

### Source Design

```
docs/local/Telegram-Bot-Dashboard/src/
├── components/
│   ├── AnimatedCounter.tsx         # Animated number display
│   ├── DashboardCard.tsx           # Glass-effect card wrapper
│   ├── MagneticButton.tsx          # Cursor-following button
│   ├── PageTransition.tsx          # Framer Motion transitions
│   ├── ParticleBackground.tsx      # Floating particles effect
│   ├── StatCard.tsx                # 3D tilt stats with sparklines
│   ├── StatusBadge.tsx             # Colored status indicators
│   ├── TiltCard.tsx                # 3D tilt physics effect
│   └── layout/
│       ├── DashboardLayout.tsx     # Main layout wrapper
│       ├── PageHeader.tsx          # Unified page header
│       └── Sidebar.tsx             # Mobile-responsive sidebar
├── hooks/
│   └── useTheme.tsx                # Theme context (11 accents)
├── pages/
│   ├── Dashboard.tsx               # Stats, charts, activity
│   ├── Analytics.tsx               # Trends, command usage, logs
│   ├── Channels.tsx                # Asset cards, search, tabs
│   ├── Settings.tsx                # Full theme customization
│   └── Login.tsx                   # Animated login
└── index.css                       # CSS variables, glass effects
```

## Goals / Non-Goals

**Goals:**
- ✅ Port all 11 accent themes + custom color picker
- ✅ Port glassmorphism and glass effect CSS
- ✅ Port TiltCard, StatCard, DashboardCard, MagneticButton components
- ✅ Port ParticleBackground with density control
- ✅ Port PageTransition animations
- ✅ Port AnimatedCounter for stat values
- ✅ Port StatusBadge component
- ✅ Port PageHeader unified header
- ✅ Redesign Settings page with full customization
- ✅ Redesign Dashboard, Analytics, Channels pages
- ✅ Update Sidebar to be mobile-responsive
- ✅ Add reduced motion accessibility toggle
- ✅ Maintain all existing functionality (Groups, Config, Database, Logs)

**Non-Goals:**
- ❌ Replace authentication (keep Supabase SSR)
- ❌ Replace data fetching (keep TanStack Query)
- ❌ Add new features beyond UI changes
- ❌ Remove existing pages (Groups, Config, Database)
- ❌ Change routing structure

## Technical Design

### 1. Theme System Architecture

#### 1.1 Theme Provider Adaptation

Adapt `useTheme.tsx` for Next.js using `next-themes` integration:

```typescript
// lib/hooks/use-theme-config.tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useTheme as useNextTheme } from 'next-themes';

export type AccentId = 
  | 'cyberpunk' | 'matrix' | 'synthwave' | 'system-error' 
  | 'admin' | 'docker' | 'toxic' | 'night-city' 
  | 'galaxy' | 'volcano' | 'abyss' | 'custom';

interface ThemeConfig {
  accentId: AccentId;
  setAccentId: (id: AccentId) => void;
  customColor: string;
  setCustomColor: (color: string) => void;
  animations: boolean;
  setAnimations: (enabled: boolean) => void;
  glassEffects: boolean;
  setGlassEffects: (enabled: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;
  particles: boolean;
  setParticles: (enabled: boolean) => void;
  particleDensity: number;
  setParticleDensity: (density: number) => void;
  accentColor: string;  // Computed hex value
  accentGradient: string;  // Computed gradient
}

export const ACCENT_THEMES = {
  cyberpunk: { name: 'Cyberpunk', hsl: '300 76% 60%', hex: '#d946ef', gradient: '...' },
  matrix: { name: 'Matrix', hsl: '142 69% 58%', hex: '#4ade80', gradient: '...' },
  // ... all 11 themes
};
```

#### 1.2 CSS Variables Structure

Extend `globals.css` with Nezuko design tokens:

```css
/* Theme Design Tokens */
:root {
  /* Surface colors */
  --nezuko-bg: var(--background);
  --nezuko-surface: oklch(0.18 0.02 285);
  --nezuko-surface-hover: oklch(0.22 0.02 285);
  --nezuko-border: oklch(0.28 0.02 285);
  --nezuko-border-hover: oklch(0.35 0.02 285);
  
  /* Text hierarchy */
  --text-primary: var(--foreground);
  --text-secondary: oklch(0.75 0.02 285);
  --text-muted: oklch(0.55 0.02 285);
  
  /* Dynamic accent (set by JS) */
  --accent-gradient: linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%);
}

/* Glass effect utility */
.glass {
  background: oklch(0.15 0.02 285 / 0.6);
  backdrop-filter: blur(16px);
  border: 1px solid var(--nezuko-border);
}

/* Reduced motion support */
.reduce-motion * {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
}

/* No glass mode */
.no-glass .glass {
  backdrop-filter: none;
  background: var(--nezuko-surface);
}
```

### 2. Component Architecture

#### 2.1 TiltCard Component

3D tilt effect using mouse position:

```typescript
// components/ui/tilt-card.tsx
'use client';

import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  index?: number;
}

export function TiltCard({ children, className, glowColor, index = 0 }: TiltCardProps) {
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rotateY = ((e.clientX - centerX) / rect.width) * 10;
    const rotateX = ((centerY - e.clientY) / rect.height) * 10;
    setTransform({ rotateX, rotateY });
  };

  return (
    <motion.div
      ref={cardRef}
      className={cn("glass rounded-2xl", className)}
      style={{ 
        transformStyle: 'preserve-3d',
        boxShadow: glowColor ? `0 0 30px ${glowColor}` : undefined 
      }}
      animate={{ rotateX: transform.rotateX, rotateY: transform.rotateY }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTransform({ rotateX: 0, rotateY: 0 })}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      {children}
    </motion.div>
  );
}
```

#### 2.2 StatCard Component

Animated stats with sparkline:

```typescript
// components/dashboard/stat-card-v2.tsx
'use client';

import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { TiltCard } from '@/components/ui/tilt-card';
import { useThemeConfig } from '@/lib/hooks/use-theme-config';

interface StatCardProps {
  title: string;
  value: number;
  suffix?: string;
  change?: string | number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  index?: number;
}

export function StatCardV2({ title, value, suffix, change, icon: Icon, index = 0 }: StatCardProps) {
  const { accentColor } = useThemeConfig();
  
  return (
    <TiltCard index={index} glowColor={`${accentColor}15`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <motion.div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}40)` }}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <Icon className="w-6 h-6" style={{ color: accentColor }} />
          </motion.div>
          {change && (
            <span className={cn(
              "text-xs font-medium px-2 py-1 rounded-lg",
              typeof change === 'number' && change > 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
            )}>
              {typeof change === 'number' && change > 0 ? '+' : ''}{change}
            </span>
          )}
        </div>
        <p className="text-sm text-text-muted uppercase tracking-wider mb-1">{title}</p>
        <p className="text-3xl font-bold text-text-primary">
          <AnimatedCounter value={value} />{suffix}
        </p>
      </div>
    </TiltCard>
  );
}
```

#### 2.3 MagneticButton Component

```typescript
// components/ui/magnetic-button.tsx
'use client';

import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export function MagneticButton({ 
  children, 
  className, 
  variant = 'primary',
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    setPosition({
      x: (e.clientX - centerX) * 0.15,
      y: (e.clientY - centerY) * 0.15,
    });
  };

  return (
    <motion.button
      ref={buttonRef}
      className={cn(
        "px-6 py-3 rounded-xl font-bold transition-all",
        variant === 'primary' 
          ? "bg-primary text-primary-foreground hover:opacity-90" 
          : "glass hover:bg-white/10",
        className
      )}
      style={{ x: position.x, y: position.y }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setPosition({ x: 0, y: 0 })}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
```

### 3. Page Redesign Strategy

#### 3.1 Dashboard Page

Replace current basic stats grid with new TiltCard-based layout:
- 4 StatCardV2 components with animated counters
- Area chart with accent gradient fill
- Pie chart for status breakdown
- Activity timeline with colored dots and animations

#### 3.2 Channels Page

Replace current table with card-based asset view:
- Overview stats section (Total Audience, Active Channels, Health)
- Search bar with animated clear button
- Tab navigation (ALL, SUPERVISING, CHANNELS, ARCHIVED)
- AssetCard grid with member counts, badges, sparklines
- Connect New Asset card

#### 3.3 Analytics Page

Enhance current analytics with:
- Time range selector (24h, 7d, 30d)
- Dual-line engagement chart
- Command usage pie chart
- System logs table with StatusBadge

#### 3.4 Settings Page

**Complete replacement** with:
- Theme selection (Light/Dark/System) with preview cards
- Accent color palette (11 presets + custom picker)
- Effects toggles (Animations, Glass, Particles)
- Reduced motion accessibility option
- Particle density slider
- Live preview card

### 4. File Structure After Migration

```
apps/web/src/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx                    # Redesigned with new components
│   │   ├── analytics/page.tsx          # Redesigned
│   │   ├── channels/page.tsx           # Redesigned
│   │   ├── settings/page.tsx           # Complete replacement
│   │   ├── groups/page.tsx             # Keep with styling updates
│   │   ├── config/page.tsx             # Keep with styling updates
│   │   └── ...
│   └── globals.css                     # Extended with Nezuko tokens
├── components/
│   ├── ui/
│   │   ├── tilt-card.tsx              # NEW
│   │   ├── magnetic-button.tsx        # NEW
│   │   ├── animated-counter.tsx       # NEW
│   │   ├── page-transition.tsx        # NEW
│   │   ├── particle-background.tsx    # NEW
│   │   ├── status-badge.tsx           # NEW
│   │   ├── dashboard-card.tsx         # NEW
│   │   └── ...existing...
│   ├── dashboard/
│   │   ├── stat-card-v2.tsx           # NEW (replaces stats-card.tsx)
│   │   └── ...existing...
│   └── layout/
│       ├── page-header.tsx            # NEW
│       ├── sidebar.tsx                # Modified for mobile
│       └── ...
├── lib/
│   └── hooks/
│       ├── use-theme-config.tsx       # NEW
│       └── ...existing...
└── providers/
    └── theme-config-provider.tsx      # NEW
```

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance impact from particles | Medium | Make optional, default density 50% |
| Bundle size increase | Low | Framer Motion already installed, tree-shake unused |
| Tailwind v3 → v4 syntax differences | Medium | Manual adaptation, test each component |
| Breaking existing pages during migration | High | Incremental approach, test after each page |
| localStorage conflicts | Low | Use `nezuko-` prefix for all theme keys |
| SSR hydration mismatches | Medium | Use `'use client'` for all animated components |

## Implementation Order

1. **Foundation** - Theme system, CSS variables, base components
2. **UI Components** - TiltCard, MagneticButton, AnimatedCounter, etc.
3. **Layout** - Sidebar updates, PageHeader, ParticleBackground
4. **Dashboard Page** - First page redesign to validate approach
5. **Channels Page** - Asset card layout
6. **Analytics Page** - Charts and logs styling
7. **Settings Page** - Complete new implementation
8. **Existing Pages** - Add styling to Groups, Config, Database, Logs
9. **Polish** - Mobile testing, accessibility, performance
