# Spec: Layout Components

## Overview

Port layout components including sidebar updates and page header.

---

## Component: PageHeader

### Purpose
Unified page header with title, subtitle, and action buttons.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | required | Page title (plain text) |
| `highlight` | `string` | - | Gradient-colored text appended to title |
| `description` | `string` | - | Page description/subtitle |
| `children` | `ReactNode` | - | Action buttons (right side) |

### Structure
```
┌─────────────────────────────────────────────────────┐
│ Page Title Gradient                     [Actions]   │
│ Description text                                    │
└─────────────────────────────────────────────────────┘
```

### Features
- Title with optional gradient-colored suffix
- Staggered fade-in animation
- Responsive flex layout (stack on mobile)
- Glass effect optional background

### Source
`docs/local/Telegram-Bot-Dashboard/src/components/layout/PageHeader.tsx`

---

## Component: Sidebar Updates

### Purpose
Update existing sidebar with mobile responsiveness and new styling.

### Changes to Existing Sidebar

| Feature | Current | Target |
|---------|---------|--------|
| Mobile menu | Fixed visible | Hamburger toggle |
| Logo | Text only | Icon + text with glow |
| Nav items | Basic hover | Magnetic hover effect |
| Active indicator | Background only | Left bar + background |
| Theme toggle | Not present | Add at bottom |
| User section | Basic | Avatar with status dot |

### New Features

1. **Mobile Header Bar**
   - Fixed top bar on mobile (h-16)
   - Logo left, hamburger right
   - Backdrop blur

2. **Slide-in Mobile Menu**
   - Overlay with backdrop blur
   - Slide from left
   - Auto-close on navigation

3. **Magnetic Nav Items**
   - Slight cursor-following effect
   - Animated icon on hover
   - Active state with left indicator bar

4. **Theme Toggle**
   - Bottom section
   - Sun/Moon icon swap animation
   - Works with theme context

5. **User Profile Section**
   - Avatar with online status dot (green pulse)
   - Username and role badge
   - More options button

### Source
`docs/local/Telegram-Bot-Dashboard/src/components/layout/Sidebar.tsx`

---

## Modifications to DashboardLayout

### Current
```tsx
// apps/web/src/app/dashboard/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

### Target
```tsx
export default function DashboardLayout({ children }) {
  return (
    <ThemeConfigProvider>
      <div className="flex min-h-screen bg-background">
        <ParticleBackground />
        <Sidebar />
        <main className="flex-1 p-6 lg:ml-64">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </ThemeConfigProvider>
  );
}
```

### Changes
- Add ParticleBackground (conditional on setting)
- Add PageTransition wrapper
- Add ThemeConfigProvider if not at root
- Add left margin for sidebar on desktop
- Mobile: add top padding for mobile header

---

## Files to Modify/Create

| File | Action |
|------|--------|
| `components/layout/page-header.tsx` | CREATE |
| `components/layout/sidebar.tsx` | MODIFY |
| `app/dashboard/layout.tsx` | MODIFY |

## Acceptance Criteria

- [ ] Mobile sidebar opens/closes with hamburger
- [ ] Sidebar auto-closes when navigating on mobile
- [ ] Theme toggle changes theme immediately
- [ ] User section shows current user info
- [ ] PageHeader supports gradient text
- [ ] Layout includes particle background when enabled
