# Active Context: Phase 35 - TiltCard Consolidation

## Current Status

**Phase 35 COMPLETE** - Consolidated HoverLiftCard into TiltCard.
**Focus**: Single premium card component with all features.

### Recent Achievements (2026-02-02)

| Item                            | Status      | Description                                           |
| :------------------------------ | :---------- | :---------------------------------------------------- |
| **TiltCard onClick Support**    | ✅ Complete | Added onClick prop for interactive cards              |
| **TiltCard isSelected Support** | ✅ Complete | Added selection styling with primary border           |
| **SelectionIndicator Moved**    | ✅ Complete | Exported from TiltCard.tsx                            |
| **Settings Page Updated**       | ✅ Complete | Theme cards now use TiltCard instead of HoverLiftCard |
| **HoverLiftCard Deleted**       | ✅ Complete | Removed redundant component                           |
| **Build Verification**          | ✅ Complete | All 9 static pages generated successfully             |

---

## TiltCard - Unified Card Component

TiltCard now handles all card use cases:

### Props

```tsx
interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  index?: number; // Staggered animation delay
  intensity?: number; // Tilt intensity (default: 15)
  glowColor?: string; // Custom glow color
  enableTilt?: boolean; // 3D tilt effect (default: true)
  enableGlow?: boolean; // Dynamic glow (default: true)
  enableLift?: boolean; // Y:-4px lift (default: true)
  liftAmount?: number; // Lift pixels (default: 4)
  onClick?: () => void; // Click handler (makes it a button)
  isSelected?: boolean; // Selection styling
}
```

### Usage Examples

```tsx
// Standard card (display only)
<TiltCard className="p-6">
  <h3>Dashboard Card</h3>
</TiltCard>

// Selectable card (like theme options)
<TiltCard
  onClick={() => setTheme('dark')}
  isSelected={theme === 'dark'}
  enableTilt={false}
>
  <h4>Dark Mode</h4>
</TiltCard>

// With selection indicator
import TiltCard, { SelectionIndicator } from "@/components/TiltCard";

<TiltCard onClick={handleClick} isSelected={isActive}>
  <div className="absolute top-3 right-3">
    <SelectionIndicator isSelected={isActive} />
  </div>
  {/* content */}
</TiltCard>
```

### Features

1. **3D Perspective Tilt** - Card follows cursor position
2. **Scale Effect** - 1.02x on hover
3. **Lift Effect** - Y:-4px lift on hover
4. **Dynamic Glow** - Cursor-following radial glow
5. **Click Support** - Adds role="button", whileTap scale, keyboard support
6. **Selection Styling** - Primary border, background glow when selected
7. **SelectionIndicator** - Animated checkmark component

---

## Files Changed

| File                                    | Change                                               |
| :-------------------------------------- | :--------------------------------------------------- |
| `src/components/TiltCard.tsx`           | Added onClick, isSelected, SelectionIndicator export |
| `src/app/dashboard/settings/page.tsx`   | Updated imports, ThemeOption uses TiltCard           |
| `src/components/ui/hover-lift-card.tsx` | **DELETED**                                          |

---

## Component Library

```
apps/web/src/components/
├── TiltCard.tsx           # Unified premium card (3D tilt + lift + glow + selection)
├── StatCard.tsx           # Stats display (wraps TiltCard)
├── DashboardCard.tsx      # Chart containers (wraps TiltCard)
└── ui/
    └── setting-row.tsx    # Toggle rows for settings
```

---

## Test Credentials

| User  | Email            | Password  | Role        |
| :---- | :--------------- | :-------- | :---------- |
| Admin | admin@nezuko.bot | Admin@123 | super_admin |

---

_Last Updated: 2026-02-02 06:00 IST_
