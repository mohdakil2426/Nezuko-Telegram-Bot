# 🖼️ Page Wireframes & Components

> **Nezuko Admin Panel - Detailed Page Layouts**
> 
> **Continuation of UI/UX Design System**

---

## 11. Dashboard Shell Layout

### 11.1 Desktop Layout (1280px+)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓                         GLASSMORPHISM HEADER                           ▓ │
│ ▓  [☰]  Nezuko Admin                        🔍 Search...    👤 Admin  ▼  ▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
├────────────────────┬────────────────────────────────────────────────────────┤
│                    │                                                        │
│  ┌──────────────┐  │  ┌────────────────────────────────────────────────┐   │
│  │   N E Z U   │  │  │                                                │   │
│  │   K O       │  │  │              MAIN CONTENT AREA                 │   │
│  │             │  │  │                                                │   │
│  │  ─────────  │  │  │   ┌──────────┐  ┌──────────┐  ┌──────────┐    │   │
│  │  🏠 Dashboard│  │  │   │ Stat    │  │ Stat    │  │ Stat    │    │   │
│  │  👥 Groups   │  │  │   │ Card    │  │ Card    │  │ Card    │    │   │
│  │  📺 Channels │  │  │   │ + Glow  │  │ + Glow  │  │ + Glow  │    │   │
│  │  ⚙️ Config   │  │  │   └──────────┘  └──────────┘  └──────────┘    │   │
│  │  📝 Logs     │  │  │                                                │   │
│  │  🗃️ Database │  │  │   ┌─────────────────────────────────────────┐  │   │
│  │  📈 Analytics│  │  │   │                                         │  │   │
│  │             │  │  │   │         ANIMATED AREA CHART              │  │   │
│  │  ─────────  │  │  │   │         (Gradient Fill)                  │  │   │
│  │             │  │  │   │                                         │  │   │
│  │  🔌 Plugins  │  │  │   └─────────────────────────────────────────┘  │   │
│  │  👤 Admins   │  │  │                                                │   │
│  │             │  │  │   ┌──────────────────┐  ┌───────────────────┐   │   │
│  │  ─────────  │  │  │   │  Recent Activity │  │   Quick Actions   │   │   │
│  │  🚪 Logout   │  │  │   │  (Animated List) │  │   (Button Grid)   │   │   │
│  └──────────────┘  │  │   └──────────────────┘  └───────────────────┘   │   │
│                    │  └────────────────────────────────────────────────┘   │
│   SIDEBAR (280px)  │              CONTENT AREA (flex-1)                    │
└────────────────────┴────────────────────────────────────────────────────────┘
```

### 11.2 Tablet Layout (768px-1279px)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [☰]  Nezuko Admin                           🔍      👤                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐                                 │
│   │ Stat 1   │  │ Stat 2   │  │ Stat 3   │     (3 columns)                 │
│   └──────────┘  └──────────┘  └──────────┘                                 │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         CHART (full width)                          │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                     Recent Activity (full width)                    │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  SIDEBAR: Overlay/Sheet (slides from left)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.3 Mobile Layout (<768px)

```
┌─────────────────────────────────────────┐
│  [☰]  Nezuko          🔍    👤          │
├─────────────────────────────────────────┤
│                                         │
│   ┌─────────────────────────────────┐   │
│   │ Stat 1 (full width)             │   │
│   └─────────────────────────────────┘   │
│   ┌─────────────────────────────────┐   │
│   │ Stat 2 (full width)             │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │ Chart (horizontal scroll)       │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │ Activity List                   │   │
│   │ ┌─────────────────────────┐     │   │
│   │ │ Item 1                  │     │   │
│   │ └─────────────────────────┘     │   │
│   │ ┌─────────────────────────┐     │   │
│   │ │ Item 2                  │     │   │
│   │ └─────────────────────────┘     │   │
│   └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│  🏠   👥   📺   ⚙️   📝                  │
│  (Bottom Navigation - 5 items)          │
└─────────────────────────────────────────┘
```

---

## 12. Page Wireframes

### 12.1 Login Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  ░                                                                       ░ │
│  ░   GRADIENT BACKGROUND                                                 ░ │
│  ░   (Animated Aurora Effect)                                            ░ │
│  ░                                                                       ░ │
│  ░                    ┌─────────────────────────────────┐                ░ │
│  ░                    │                                 │                ░ │
│  ░                    │        🤖 NEZUKO LOGO           │                ░ │
│  ░                    │        (Animated Glow)          │                ░ │
│  ░                    │                                 │                ░ │
│  ░                    │   ┌─────────────────────────┐   │                ░ │
│  ░                    │   │ 📧 Email                │   │                ░ │
│  ░                    │   └─────────────────────────┘   │                ░ │
│  ░                    │                                 │                ░ │
│  ░                    │   ┌─────────────────────────┐   │                ░ │
│  ░                    │   │ 🔒 Password          👁️ │   │                ░ │
│  ░                    │   └─────────────────────────┘   │                ░ │
│  ░                    │                                 │                ░ │
│  ░                    │   ┌─────────────────────────┐   │                ░ │
│  ░                    │   │      🔓 SIGN IN         │   │                ░ │
│  ░                    │   │   (Shimmer Animation)   │   │                ░ │
│  ░                    │   └─────────────────────────┘   │                ░ │
│  ░                    │                                 │                ░ │
│  ░                    │   [ ] Remember me               │                ░ │
│  ░                    │                                 │                ░ │
│  ░                    │        GLASSMORPHISM CARD       │                ░ │
│  ░                    └─────────────────────────────────┘                ░ │
│  ░                                                                       ░ │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Login Page Features**:
- Aurora/gradient animated background
- Glassmorphism login card
- Logo with subtle glow animation
- Password visibility toggle
- Loading state with shimmer button
- Error shake animation on invalid credentials

### 12.2 Dashboard Home

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Dashboard                                              Last updated: now 🔄│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│   │ ▲ 12.5%      │  │ ▲ 8.3%       │  │ ▼ 2.1%       │  │ ● Online     │   │
│   │              │  │              │  │              │  │              │   │
│   │    1,247     │  │      89      │  │     156      │  │   HEALTHY    │   │
│   │  Total Users │  │ Active Groups│  │  Channels    │  │  Bot Status  │   │
│   │              │  │              │  │              │  │              │   │
│   │ [Sparkline]  │  │ [Sparkline]  │  │ [Sparkline]  │  │ [Pulse Dot]  │   │
│   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│    HOVER: Glow + Lift Animation                                            │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  Verification Activity (Last 7 Days)                      [D] [W] [M] │  │
│   │                                                                     │  │
│   │  400 ┤                                         ╭─────╮              │  │
│   │      │                              ╭─────────╯     │              │  │
│   │  300 ┤                     ╭───────╯                ╰───╮          │  │
│   │      │            ╭───────╯                              │          │  │
│   │  200 ┤   ╭───────╯                                       ╰───╮     │  │
│   │      │  ╱                                                     ╰─   │  │
│   │  100 ┤╭╯    (Animated line draw + gradient fill)                   │  │
│   │      └──────────────────────────────────────────────────────────── │  │
│   │       Mon    Tue    Wed    Thu    Fri    Sat    Sun                │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   ┌─────────────────────────────┐  ┌───────────────────────────────────┐   │
│   │  Recent Activity            │  │  Quick Actions                    │   │
│   │  ─────────────────────────  │  │  ─────────────────────────────── │   │
│   │                             │  │                                   │   │
│   │  ○ User joined Group A      │  │  ┌─────────┐  ┌─────────┐        │   │
│   │    2 minutes ago            │  │  │ ➕ Add  │  │ ⚙️ Config│        │   │
│   │                             │  │  │  Group  │  │         │        │   │
│   │  ● Verification failed      │  │  └─────────┘  └─────────┘        │   │
│   │    5 minutes ago            │  │                                   │   │
│   │                             │  │  ┌─────────┐  ┌─────────┐        │   │
│   │  ○ Channel added            │  │  │ 📝 View │  │ 🔄 Sync │        │   │
│   │    12 minutes ago           │  │  │  Logs   │  │  Cache  │        │   │
│   │                             │  │  └─────────┘  └─────────┘        │   │
│   │  (Stagger animation)        │  │  (Hover scale + glow)            │   │
│   └─────────────────────────────┘  └───────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Dashboard Features**:
- Stat cards with trend indicators and sparklines
- Cards animate in with stagger effect
- Hover effect: lift + glow + scale
- Area chart with animated line draw
- Activity list with live updates
- Quick action buttons with icon animations

### 12.3 Groups Management

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Groups                                                                     │
│  Manage your protected Telegram groups                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌────────────────────────────────────────────────────────────┐  ┌──────┐ │
│   │ 🔍 Search groups...                                        │  │+ Add │ │
│   └────────────────────────────────────────────────────────────┘  └──────┘ │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                                                                     │  │
│   │  ┌─────┬──────────────────┬────────┬─────────┬────────┬─────────┐  │  │
│   │  │     │ GROUP            │CHANNELS│ MEMBERS │ STATUS │ ACTIONS │  │  │
│   │  ├─────┼──────────────────┼────────┼─────────┼────────┼─────────┤  │  │
│   │  │ [ ] │ 🔵 Crypto Alpha  │   3    │  1,247  │ ●Active│ ⚙️ 🗑️   │  │  │
│   │  │     │ @crypto_alpha_..│        │         │        │         │  │  │
│   │  ├─────┼──────────────────┼────────┼─────────┼────────┼─────────┤  │  │
│   │  │ [ ] │ 🟢 NFT Traders   │   5    │    892  │ ●Active│ ⚙️ 🗑️   │  │  │
│   │  │     │ @nft_traders_hub│        │         │        │         │  │  │
│   │  ├─────┼──────────────────┼────────┼─────────┼────────┼─────────┤  │  │
│   │  │ [ ] │ 🟡 DeFi Community│   2    │    456  │ ○Paused│ ⚙️ 🗑️   │  │  │
│   │  │     │ @defi_community │        │         │        │         │  │  │
│   │  └─────┴──────────────────┴────────┴─────────┴────────┴─────────┘  │  │
│   │                                                                     │  │
│   │   ROW HOVER: Subtle highlight + border glow                        │  │
│   │   CLICK ROW: Expand for details / Navigate to detail               │  │
│   │                                                                     │  │
│   │  ┌─────────────────────────────────────────────────────────────┐   │  │
│   │  │  ← Previous     Page 1 of 10     1  2  3  ...  10   Next → │   │  │
│   │  └─────────────────────────────────────────────────────────────┘   │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Table Features**:
- Sortable columns (click header)
- Row hover with highlight
- Inline actions with tooltips
- Bulk selection with floating action bar
- Animated skeleton loading
- Empty state with illustration

### 12.4 Group Detail Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Groups                                                          │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │   🔵 Crypto Alpha Premium                                    ● Active │ │
│  │   @crypto_alpha_premium                                              │ │
│  │                                                                       │ │
│  │   Group ID: -1001234567890                        Created: Jan 15, 2026│ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  [Overview]   [Channels]   [Settings]   [Logs]   [Analytics]        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                   ▲ Active tab indicator (animated underline)              │
│                                                                             │
│  ╔═════════════════════════════════════════════════════════════════════╗   │
│  ║  OVERVIEW TAB CONTENT                                               ║   │
│  ╠═════════════════════════════════════════════════════════════════════╣   │
│  ║                                                                     ║   │
│  ║   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              ║   │
│  ║   │    1,247     │  │      98%     │  │      3       │              ║   │
│  ║   │   Members    │  │  Verified    │  │  Channels    │              ║   │
│  ║   └──────────────┘  └──────────────┘  └──────────────┘              ║   │
│  ║                                                                     ║   │
│  ║   Linked Channels                                                   ║   │
│  ║   ─────────────────────────────────────────────────────            ║   │
│  ║   ┌────────────────────────────────────────────────┐               ║   │
│  ║   │ 📺 @crypto_updates  │  Required  │  ✓ Active  │  ⚙️           │   ║   │
│  ║   └────────────────────────────────────────────────┘               ║   │
│  ║   ┌────────────────────────────────────────────────┐               ║   │
│  ║   │ 📺 @alpha_signals   │  Optional  │  ✓ Active  │  ⚙️           │   ║   │
│  ║   └────────────────────────────────────────────────┘               ║   │
│  ║   ┌────────────────────────────────────────────────┐               ║   │
│  ║   │ 📺 @vip_lounge      │  Required  │  ○ Paused  │  ⚙️           │   ║   │
│  ║   └────────────────────────────────────────────────┘               ║   │
│  ║                                                                     ║   │
│  ║   [+ Link New Channel]                                             ║   │
│  ║                                                                     ║   │
│  ╚═════════════════════════════════════════════════════════════════════╝   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 12.5 Real-Time Logs

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Logs                                                            🔴 LIVE   │
│  Real-time bot activity stream                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Filters:                                                                   │
│  ┌────────────┐ ┌───────────────┐ ┌───────────────┐ ┌─────────────────────┐│
│  │ All Levels▼│ │ All Groups   ▼│ │ All Types   ▼│ │ 🔍 Search logs...   ││
│  └────────────┘ └───────────────┘ └───────────────┘ └─────────────────────┘│
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ [INFO]  19:34:52  User 123456789 verified in @crypto_alpha  │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ [WARN]  19:34:48  Rate limit approaching (28/30)            │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ [ERROR] 19:34:45  Failed to check @channel_123: Timeout     │   │   │
│  │  │         └─ View stack trace                                 │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ [INFO]  19:34:42  Webhook received: /protect command        │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ [DEBUG] 19:34:40  Cache hit for user 987654321              │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  New logs slide in from top with fade animation                    │   │
│  │  Color-coded by level: INFO=blue, WARN=yellow, ERROR=red         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │  [⏸️ Pause]  [🗑️ Clear]  [📥 Export CSV]  [📥 Export JSON]  Auto-scroll ✓││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Log Viewer Features**:
- WebSocket live streaming
- Color-coded log levels
- Expandable stack traces
- Filter by level/group/search
- Export to CSV/JSON
- Pause/resume stream
- Auto-scroll toggle

### 12.6 Configuration Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Configuration                                                              │
│  Bot settings and environment variables                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  [General]   [Webhook]   [Messages]   [Limits]   [Advanced]         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ╔═════════════════════════════════════════════════════════════════════╗   │
│  ║  GENERAL SETTINGS                                                   ║   │
│  ╠═════════════════════════════════════════════════════════════════════╣   │
│  ║                                                                     ║   │
│  ║   Bot Token                                                         ║   │
│  ║   ┌───────────────────────────────────────────────────┐  ┌──────┐  ║   │
│  ║   │ ••••••••••••••••••••••••••••••••••••••          │  │ 👁️    │  ║   │
│  ║   └───────────────────────────────────────────────────┘  └──────┘  ║   │
│  ║   ⚠️ Never share your bot token                                    ║   │
│  ║                                                                     ║   │
│  ║   Environment                                                       ║   │
│  ║   ┌───────────────────────────────────────────────────────────────┐║   │
│  ║   │ Production                                                 ▼ │║   │
│  ║   └───────────────────────────────────────────────────────────────┘║   │
│  ║                                                                     ║   │
│  ║   Log Level                                                         ║   │
│  ║   ┌───────────────────────────────────────────────────────────────┐║   │
│  ║   │ INFO                                                       ▼ │║   │
│  ║   └───────────────────────────────────────────────────────────────┘║   │
│  ║                                                                     ║   │
│  ║   ┌────────────────────────────────────────────────────────────┐   ║   │
│  ║   │ ☑️ Enable Sentry Error Tracking                            │   ║   │
│  ║   └────────────────────────────────────────────────────────────┘   ║   │
│  ║                                                                     ║   │
│  ╚═════════════════════════════════════════════════════════════════════╝   │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                      [✓ Save Changes]   [↩️ Reset to Defaults]         │ │
│  │                      (Shimmer button)                                  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 12.7 Analytics Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Analytics                                          Date Range: [Last 30d ▼]│
│  Insights and trends                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│   │   +234       │  │   +89        │  │   98.2%      │  │   1.2s       │   │
│   │  New Users   │  │ Verifications│  │ Success Rate │  │  Avg. Time   │   │
│   │  ▲ 12% vs mo │  │  ▲ 5% vs mo  │  │  ▼ 0.3%     │  │  ▼ 0.1s      │   │
│   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
│   ┌───────────────────────────────────────────┐ ┌─────────────────────────┐│
│   │  User Growth Over Time                    │ │  Verification by Group  ││
│   │                                           │ │                         ││
│   │     ╭────────────────────────╮            │ │  ████████████  45%     ││
│   │    ╱                          ╲           │ │  Crypto Alpha          ││
│   │   ╱                            ──         │ │                         ││
│   │  ╱                                        │ │  ██████████    38%     ││
│   │ ╱                                         │ │  NFT Traders           ││
│   │╱  ANIMATED AREA CHART                     │ │                         ││
│   │                                           │ │  █████         17%     ││
│   │  Jan 1        Jan 15        Jan 24        │ │  DeFi Community        ││
│   │                                           │ │                         ││
│   └───────────────────────────────────────────┘ └─────────────────────────┘│
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  Hourly Activity Heatmap                                            │  │
│   │                                                                     │  │
│   │  Mon  ░░▓▓▓▓████▓▓▓▓▓▓████████▓▓▓▓░░░░░░                          │  │
│   │  Tue  ░░▓▓▓▓████▓▓▓▓▓▓████████████▓▓░░░░                          │  │
│   │  Wed  ░░▓▓████████▓▓▓▓████████▓▓▓▓░░░░░░                          │  │
│   │  Thu  ░░▓▓▓▓████▓▓▓▓▓▓▓▓██████▓▓░░░░░░░░                          │  │
│   │  Fri  ░░▓▓████████████████████▓▓▓▓░░░░░░                          │  │
│   │  Sat  ░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░                          │  │
│   │  Sun  ░░░░░░░░▓▓▓▓░░░░░░▓▓░░░░░░░░░░░░░░                          │  │
│   │       00  04  08  12  16  20  24                                   │  │
│   │                                                                     │  │
│   │  ANIMATED: Cells fade in with stagger                              │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Premium Component Gallery

### 13.1 Stat Card with Sparkline

```tsx
// components/dashboard/stat-card.tsx
import { motion } from "motion/react";
import { Sparklines, SparklinesLine } from "react-sparklines";

interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  trend: number[];
}

export function StatCard({ title, value, change, trend }: StatCardProps) {
  const isPositive = change >= 0;
  
  return (
    <motion.div
      className="relative overflow-hidden rounded-xl bg-surface border border-border p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        y: -4,
        boxShadow: "0 20px 40px oklch(0 0 0 / 0.2)",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      {/* Gradient glow on hover */}
      <motion.div
        className="absolute -inset-px rounded-xl opacity-0"
        style={{
          background: `linear-gradient(135deg, 
            oklch(0.55 0.220 265 / 0.1) 0%, 
            transparent 60%
          )`
        }}
        whileHover={{ opacity: 1 }}
      />
      
      {/* Trend indicator */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-text-muted text-sm">{title}</span>
        <span className={`text-xs font-medium ${isPositive ? 'text-success-500' : 'text-error-500'}`}>
          {isPositive ? '▲' : '▼'} {Math.abs(change)}%
        </span>
      </div>
      
      {/* Value */}
      <motion.div 
        className="text-3xl font-bold text-text-primary mb-4"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
      >
        {value}
      </motion.div>
      
      {/* Sparkline */}
      <div className="h-8">
        <Sparklines data={trend} height={32}>
          <SparklinesLine 
            color={isPositive ? "oklch(0.65 0.180 160)" : "oklch(0.60 0.220 25)"} 
            style={{ strokeWidth: 2, fill: "none" }}
          />
        </Sparklines>
      </div>
    </motion.div>
  );
}
```

### 13.2 Animated Data Table Row

```tsx
// components/ui/table-row.tsx
import { motion } from "motion/react";

export function AnimatedTableRow({ children, index, ...props }) {
  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ 
        delay: index * 0.05, // Stagger effect
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
      whileHover={{ 
        backgroundColor: "oklch(0.20 0.012 265)",
        transition: { duration: 0.2 }
      }}
      className="border-b border-border cursor-pointer transition-colors"
      {...props}
    >
      {children}
    </motion.tr>
  );
}
```

### 13.3 Shimmer Button

```tsx
// components/ui/shimmer-button.tsx
import { motion } from "motion/react";

export function ShimmerButton({ children, loading, ...props }) {
  return (
    <motion.button
      className="relative overflow-hidden px-6 py-3 rounded-lg bg-primary-500 text-white font-medium"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {/* Shimmer overlay */}
      <motion.div
        className="absolute inset-0 -translate-x-full"
        animate={{ 
          translateX: loading ? ["−100%", "100%"] : "−100%" 
        }}
        transition={{ 
          repeat: loading ? Infinity : 0,
          duration: 1.5,
          ease: "linear"
        }}
        style={{
          background: `linear-gradient(
            90deg,
            transparent 0%,
            oklch(1 0 0 / 0.2) 50%,
            transparent 100%
          )`
        }}
      />
      
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
```

### 13.4 Live Status Indicator

```tsx
// components/ui/status-indicator.tsx
import { motion } from "motion/react";

type Status = "online" | "offline" | "warning";

export function StatusIndicator({ status }: { status: Status }) {
  const colors = {
    online: "oklch(0.65 0.180 160)",
    offline: "oklch(0.55 0.015 265)",
    warning: "oklch(0.78 0.170 75)"
  };
  
  return (
    <span className="relative inline-flex h-3 w-3">
      {/* Ping animation for online status */}
      {status === "online" && (
        <motion.span
          className="absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ backgroundColor: colors[status] }}
          animate={{ scale: [1, 2], opacity: [0.75, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      
      {/* Core dot */}
      <span
        className="relative inline-flex rounded-full h-3 w-3"
        style={{ backgroundColor: colors[status] }}
      />
    </span>
  );
}
```

---

## 14. Animation Accessibility Summary

### 14.1 CSS Reduced Motion Media Query

```css
/* styles/animations.css */

/* Default animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Disable animations for users who prefer reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 14.2 Motion Hook Usage

```tsx
// Always wrap animated components with reduced motion check
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { motion } from "motion/react";

export function AnimatedCard({ children }) {
  const reducedMotion = useReducedMotion();
  
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
```

---

## 15. Summary: Premium UI Checklist

### Before Each Component Release:

- [ ] **Colors**: Using OKLCH color space
- [ ] **Animations**: 100-500ms duration, spring physics
- [ ] **Reduced Motion**: Respects `prefers-reduced-motion`
- [ ] **Contrast**: 4.5:1+ for text, 3:1+ for UI
- [ ] **Keyboard**: Fully navigable, visible focus states
- [ ] **ARIA**: Proper labels, roles, and live regions
- [ ] **Responsive**: Works 320px to 4K
- [ ] **Dark Mode**: Primary design target
- [ ] **Glassmorphism**: Subtle, not overdone
- [ ] **Performance**: 60fps animations, no layout thrashing

---

[← Back to Design System](./05-UI-WIREFRAMES.md) | [Back to Index](./README.md) | [Next: Implementation →](./06-IMPLEMENTATION.md)
