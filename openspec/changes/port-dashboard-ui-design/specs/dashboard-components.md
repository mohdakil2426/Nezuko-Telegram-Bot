# Spec: Dashboard Components

## Overview

Port dashboard-specific components for stats, charts, and activity.

---

## Component: StatCardV2

### Purpose
Premium stat card with 3D tilt, animated counter, and accent-colored icon.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | required | Stat label |
| `value` | `number` | required | Numeric value |
| `suffix` | `string` | - | Value suffix (%, k, M) |
| `change` | `string \| number` | - | Change from previous period |
| `changeType` | `'positive' \| 'negative' \| 'neutral'` | auto | Change indicator color |
| `icon` | `LucideIcon` | required | Icon component |
| `index` | `number` | `0` | Animation stagger index |

### Structure
```
┌──────────────────────────────┐
│ [Icon]              [+12.5%] │
│                              │
│ TOTAL GROUPS                 │
│ 1,234                        │
└──────────────────────────────┘
```

### Features
- Uses TiltCard wrapper for 3D effect
- Icon has gradient background from accent color
- AnimatedCounter for value
- Change badge with appropriate color

### Source
`docs/local/Telegram-Bot-Dashboard/src/components/StatCard.tsx`

---

## Component: ActivityItem

### Purpose
Single activity log entry with timeline styling.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'success' \| 'info' \| 'warning' \| 'error'` | required | Event type |
| `title` | `string` | required | Event title (supports HTML) |
| `description` | `string` | - | Event description |
| `timestamp` | `string` | required | Time string |
| `index` | `number` | `0` | Animation delay |

### Structure
```
│ ● Title text here
│   Description text                    2m ago
```

### Features
- Vertical timeline line
- Colored dot with pulse animation
- Staggered entry animation
- Hover effect (slide right)

### Source
`docs/local/Telegram-Bot-Dashboard/src/pages/Dashboard.tsx` (ActivityItem component)

---

## Component: CustomTooltip

### Purpose
Styled chart tooltip for Recharts.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `active` | `boolean` | Tooltip visibility |
| `payload` | `array` | Tooltip data |
| `label` | `string` | X-axis label |

### Style
- Glass effect background
- Accent border
- Formatted values with labels

### Source
`docs/local/Telegram-Bot-Dashboard/src/components/charts/CustomTooltip.tsx`

---

## Component: AssetCard (Channels Page)

### Purpose
Telegram channel/group card with member stats.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `asset` | `TelegramAsset` | Asset data object |
| `index` | `number` | Animation index |

### TelegramAsset Structure
```typescript
interface TelegramAsset {
  id: string;
  name: string;
  type: 'channel' | 'supergroup';
  avatar?: string;
  members: number;
  membersChange: number;
  membersChangeType: 'positive' | 'negative' | 'neutral';
  badges: { label: string; type: string }[];
  status: 'active' | 'restricted' | 'archived';
  accessLevel?: string;
  adminAvatars?: string[];
}
```

### Structure
```
┌────────────────────────────────────────┐
│ [Avatar] Name                 [Status] │
│          [Badge] [Badge]               │
├────────────────────────────────────────┤
│ MEMBERS                                │
│ 12,345                    [Sparkline]  │
│                              +5.2%     │
├────────────────────────────────────────┤
│ [Admin Avatars]           [Config Btn] │
└────────────────────────────────────────┘
```

### Source
`docs/local/Telegram-Bot-Dashboard/src/pages/Channels.tsx` (AssetCard component)

---

## Files to Create

| File | Component |
|------|-----------|
| `components/dashboard/stat-card-v2.tsx` | StatCardV2 |
| `components/dashboard/activity-item.tsx` | ActivityItem |
| `components/charts/custom-tooltip.tsx` | CustomTooltip |
| `components/dashboard/asset-card.tsx` | AssetCard |

## Acceptance Criteria

- [ ] StatCardV2 integrates with existing dashboard data hooks
- [ ] ActivityItem works with real activity feed data
- [ ] AssetCard works with existing channel data types
- [ ] All components use accent color from theme
- [ ] Animations are smooth at 60fps
