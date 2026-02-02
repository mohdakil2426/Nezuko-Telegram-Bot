# Active Context: Phase 31 - useConfirm Integration & Assets Page Cleanup

## Current Status

**Phase 31 COMPLETE** - Assets page migrated to dataService, useConfirm integrated for destructive actions.
**Focus**: Full services layer adoption across all pages.

### Recent Achievements (2026-02-02)

| Item                       | Status      | Description                                                              |
| :------------------------- | :---------- | :----------------------------------------------------------------------- |
| **Assets Page Migration**  | ✅ Complete | Assets page now uses `dataService.getAssets()` instead of `mockApi`.     |
| **Dropdown Menu Added**    | ✅ Complete | Asset cards now have dropdown with Settings, Open in Telegram, Delete.   |
| **useConfirm Integration** | ✅ Complete | Delete action shows confirmation dialog before removing asset.           |
| **Asset Type Extended**    | ✅ Complete | Added `protectionEnabled` and `dailyGrowth` fields to `Asset` interface. |
| **Mock Data Updated**      | ✅ Complete | `mockAssets` now includes protection and growth data.                    |
| **Build Verification**     | ✅ Complete | All 9 static pages generated successfully.                               |

---

## Active Decisions

### 1. Services Layer Architecture

Production-grade data abstraction with single toggle:

- **Location**: `src/services/`
- **Toggle**: `NEXT_PUBLIC_USE_MOCK_DATA=true|false`
- **Interface**: `DataService` contract in `types.ts`

```typescript
import { dataService } from "@/services";
const stats = await dataService.getDashboardStats();
```

### 2. Component Strategy: "Lean Premium"

- **Removed**: 28 unused shadcn/ui components (carousel, menubar, tabs, etc.)
- **Kept**: Essential primitives + custom premium wrappers
- **New**: `ConfirmDialog` for destructive action safety

### 3. Confirmation Dialog Pattern (NOW INTEGRATED)

All destructive actions (Ban, Delete) use `useConfirm`:

```tsx
const confirm = useConfirm();
const confirmed = await confirm({
  title: "Delete Asset?",
  description: "This action cannot be undone.",
  confirmText: "Delete",
  variant: "delete",
});
if (confirmed) {
  // Perform deletion
}
```

---

## Phase 31 Implementation (2026-02-02)

### 1. Assets Page Updates

**File**: `apps/web/src/app/dashboard/assets/page.tsx`

| Change                 | Description                                                    |
| :--------------------- | :------------------------------------------------------------- |
| Import `dataService`   | Replaced `mockApi` with unified services layer                 |
| Use `Asset` type       | Switched from `TelegramAsset` to `Asset` for type consistency  |
| Add `DropdownMenu`     | Three-dot menu with Settings, Open in Telegram, Delete actions |
| Integrate `useConfirm` | Delete action shows confirmation dialog with "delete" variant  |
| Remove on confirm      | Local state update removes asset (ready for API integration)   |

### 2. Type Definitions Extended

**File**: `apps/web/src/lib/data/types.ts`

```typescript
export interface Asset {
  // ... existing fields ...
  // NEW optional fields for UI display
  protectionEnabled?: boolean;
  dailyGrowth?: number;
}
```

### 3. Mock Data Updated

**File**: `apps/web/src/lib/data/mock-api.ts`

- All 7 mock assets now include `protectionEnabled` and `dailyGrowth` values
- Values range from 0-100 for growth percentage

---

## Pages Using Services Layer

| Page                   | Data Source                       | Status      |
| :--------------------- | :-------------------------------- | :---------- |
| `/dashboard`           | `dataService.getDashboardStats()` | ✅ Complete |
| `/dashboard/assets`    | `dataService.getAssets()`         | ✅ Complete |
| `/dashboard/analytics` | Uses direct mock + API            | Partial     |
| `/dashboard/logs`      | Uses direct mock                  | Partial     |
| `/dashboard/settings`  | Uses config stores                | N/A         |

---

## Hooks Status

### Using Services Layer (Complete)

| Hook                     | Method                                                                             |
| :----------------------- | :--------------------------------------------------------------------------------- |
| `use-dashboard-stats.ts` | `dataService.getDashboardStats()`                                                  |
| `use-dashboard-chart.ts` | `dataService.getChartData()`                                                       |
| `use-assets.ts`          | `dataService.getAssets()`, `getAssetsOverview()`, `getAssetById()`, `syncAssets()` |

### Legacy Hooks (Still using old pattern)

| Hook                   | Note                                                    |
| :--------------------- | :------------------------------------------------------ |
| `use-groups.ts`        | Legacy - Assets page now uses unified `dataService`     |
| `use-channels.ts`      | Legacy - Assets page now uses unified `dataService`     |
| `use-analytics.ts`     | Uses `@nezuko/types` response format, inline mock check |
| `use-activity-feed.ts` | Uses `@nezuko/types` response format, inline mock check |

---

## Project Structure

```
apps/web/src/
├── services/                   # Data abstraction layer
│   ├── index.ts               # dataService (auto-selects mock or real)
│   ├── config.ts              # Environment config
│   ├── types.ts               # DataService interface
│   ├── mock.service.ts        # Mock implementation
│   └── api.service.ts         # Production API
├── app/
│   ├── (auth)/login/          # Premium login + dev bypass
│   ├── dashboard/
│   │   ├── page.tsx           # Dashboard
│   │   ├── analytics/         # Analytics
│   │   ├── assets/            # Unified Groups + Channels (UPDATED)
│   │   ├── settings/          # Settings
│   │   └── logs/              # Logs
│   ├── layout.tsx             # Root layout (+ ConfirmProvider)
│   └── not-found.tsx          # Premium 404 page
├── components/
│   ├── ui/
│   │   ├── confirm-dialog.tsx # Confirmation system (NOW USED)
│   │   ├── dropdown-menu.tsx  # Asset card actions
│   │   └── ...
│   └── assets/                # Asset components
├── lib/
│   ├── hooks/                 # Updated to use dataService
│   ├── query-keys.ts          # Extended with assets/logs keys
│   └── data/                  # Mock data (used by mock.service)
└── stores/
    └── auth-store.ts          # Zustand auth store
```

---

## Environment Variables

| Variable                        | Purpose                          | Default                        |
| :------------------------------ | :------------------------------- | :----------------------------- |
| `NEXT_PUBLIC_DISABLE_AUTH`      | Skip auth checks in development  | `true`                         |
| `NEXT_PUBLIC_USE_MOCK_DATA`     | Use mock API instead of real API | `true`                         |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL             | -                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key           | -                              |
| `NEXT_PUBLIC_API_URL`           | Backend API URL                  | `http://localhost:8080/api/v1` |

---

## Testing the Delete Confirmation

1. Navigate to `/dashboard/assets`
2. Click the three-dot menu on any asset card
3. Click "Delete Asset"
4. Confirmation dialog appears with red delete button
5. Clicking "Delete" removes the asset from the list
6. Clicking "Cancel" or closing the dialog preserves the asset

---

## Test Credentials

| User  | Email            | Password  | Role        |
| :---- | :--------------- | :-------- | :---------- |
| Admin | admin@nezuko.bot | Admin@123 | super_admin |

---

_Last Updated: 2026-02-02 04:00 IST_
