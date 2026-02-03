## ADDED Requirements

### Requirement: API Client Architecture

The system SHALL provide a configurable API client for all data fetching.

#### Scenario: API client configuration

- **WHEN** API client is initialized
- **THEN** it uses environment variables:
  - `NEXT_PUBLIC_API_URL` for base URL
  - `NEXT_PUBLIC_USE_MOCK` to toggle mock mode

#### Scenario: API client methods

- **WHEN** API client is used
- **THEN** it provides typed methods:
  - `get<T>(path, params?): Promise<T>`
  - `post<T>(path, body): Promise<T>`
  - `put<T>(path, body): Promise<T>`
  - `delete(path): Promise<void>`

### Requirement: Service Layer Pattern

The system SHALL use a service layer that abstracts mock vs real API.

#### Scenario: Service function structure

- **WHEN** a service function is called
- **THEN** it checks `config.useMock`
- **AND** returns mock data if true
- **AND** calls real API if false

#### Scenario: Service file organization

- **WHEN** services are organized
- **THEN** structure follows:
  ```
  src/lib/services/
  ├── dashboard.service.ts
  ├── groups.service.ts
  ├── channels.service.ts
  └── analytics.service.ts
  ```

### Requirement: Type Definitions

The system SHALL define TypeScript interfaces matching API response shapes exactly.

#### Scenario: Type file location

- **WHEN** types are defined
- **THEN** they exist in `src/lib/services/types.ts`

#### Scenario: Core types defined

- **WHEN** types file is inspected
- **THEN** it exports:
  - `DashboardStats` interface
  - `ChartDataPoint` interface
  - `Group` interface
  - `Channel` interface
  - `Activity` interface
  - `AnalyticsMetrics` interface
  - `PaginatedResult<T>` generic interface

### Requirement: DashboardStats Interface

The system SHALL define DashboardStats matching API response.

```typescript
interface DashboardStats {
  totalGroups: number;
  totalGroupsChange: number; // percentage change
  activeChannels: number;
  activeChannelsChange: number;
  verificationsToday: number;
  verificationsTodayChange: number;
  successRate: number; // 0-100
  successRateChange: number;
}
```

#### Scenario: DashboardStats usage

- **WHEN** dashboard fetches stats
- **THEN** response conforms to DashboardStats interface

### Requirement: Group Interface

The system SHALL define Group matching API response.

```typescript
interface Group {
  id: number;
  groupId: number; // Telegram group ID
  title: string;
  enabled: boolean;
  memberCount: number;
  linkedChannelsCount: number;
  createdAt: string; // ISO date string
  updatedAt: string | null;
}
```

#### Scenario: Group usage

- **WHEN** groups list is fetched
- **THEN** each item conforms to Group interface

### Requirement: Channel Interface

The system SHALL define Channel matching API response.

```typescript
interface Channel {
  id: number;
  channelId: number; // Telegram channel ID
  title: string;
  username: string | null; // @username handle
  inviteLink: string | null;
  subscriberCount: number;
  linkedGroupsCount: number;
  isActive: boolean;
  createdAt: string; // ISO date string
  updatedAt: string | null;
}
```

#### Scenario: Channel usage

- **WHEN** channels list is fetched
- **THEN** each item conforms to Channel interface

### Requirement: PaginatedResult Generic

The system SHALL define a generic paginated result type.

```typescript
interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
```

#### Scenario: Paginated results

- **WHEN** groups or channels are fetched
- **THEN** response is `PaginatedResult<Group>` or `PaginatedResult<Channel>`

### Requirement: Service Functions

The system SHALL provide typed service functions for each data domain.

#### Scenario: Dashboard service

- **WHEN** dashboard.service.ts is inspected
- **THEN** it exports:
  - `getDashboardStats(): Promise<DashboardStats>`
  - `getChartData(days?: number): Promise<ChartDataPoint[]>`
  - `getActivity(limit?: number): Promise<Activity[]>`

#### Scenario: Groups service

- **WHEN** groups.service.ts is inspected
- **THEN** it exports:
  - `getGroups(params?: GroupsParams): Promise<PaginatedResult<Group>>`
  - `getGroup(id: number): Promise<Group>`

#### Scenario: Channels service

- **WHEN** channels.service.ts is inspected
- **THEN** it exports:
  - `getChannels(params?: ChannelsParams): Promise<PaginatedResult<Channel>>`
  - `getChannel(id: number): Promise<Channel>`

#### Scenario: Analytics service

- **WHEN** analytics.service.ts is inspected
- **THEN** it exports:
  - `getAnalytics(period?: string): Promise<AnalyticsMetrics>`
  - `getVerificationTrends(params?: TrendsParams): Promise<ChartDataPoint[]>`

### Requirement: Mock Data Functions

The system SHALL provide mock data implementations for each service.

#### Scenario: Mock file organization

- **WHEN** mock data is organized
- **THEN** structure follows:
  ```
  src/lib/mock/
  ├── dashboard.mock.ts
  ├── groups.mock.ts
  ├── channels.mock.ts
  └── analytics.mock.ts
  ```

### Requirement: Realistic Mock Data

The system SHALL provide realistic mock data values.

#### Scenario: Dashboard stats mock

- **WHEN** dashboard mock is called
- **THEN** returns realistic values:
  - totalGroups: 24
  - activeChannels: 8
  - verificationsToday: 1,247
  - successRate: 94.2

#### Scenario: Groups mock data

- **WHEN** groups mock is called
- **THEN** returns array of 12+ groups
- **AND** each has realistic Telegram-style data (large IDs, varied member counts)

#### Scenario: Channels mock data

- **WHEN** channels mock is called
- **THEN** returns array of 8+ channels
- **AND** each has realistic data (subscriber counts, @usernames)

### Requirement: Chart Data Generation

The system SHALL generate time-series data for charts.

#### Scenario: Chart data structure

- **WHEN** `getChartData()` is called
- **THEN** returns array with:
  - date (ISO string)
  - verified (number)
  - restricted (number)

#### Scenario: Chart data points

- **WHEN** `getChartData(30)` is called
- **THEN** returns 30 data points
- **AND** dates are consecutive days

### Requirement: Simulated API Delay

The system SHALL simulate network latency for realistic UX testing.

#### Scenario: API delay

- **WHEN** any mock function is called
- **THEN** response is delayed by 200-500ms
- **AND** allows testing loading states

### Requirement: Environment Configuration

The system SHALL use environment variables for all configuration.

#### Scenario: Environment file

- **WHEN** .env.local is inspected
- **THEN** it contains:
  ```
  NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
  NEXT_PUBLIC_USE_MOCK=true
  ```

#### Scenario: Config module

- **WHEN** config.ts is inspected
- **THEN** it exports:
  ```typescript
  export const config = {
    apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1",
    useMock: process.env.NEXT_PUBLIC_USE_MOCK === "true",
  };
  ```

### Requirement: React Query Hooks

The system SHALL provide React Query hooks for data fetching.

#### Scenario: Hook file organization

- **WHEN** hooks are organized
- **THEN** structure follows:
  ```
  src/lib/hooks/
  ├── use-dashboard.ts
  ├── use-groups.ts
  ├── use-channels.ts
  └── use-analytics.ts
  ```

#### Scenario: Hook implementation

- **WHEN** a hook is used
- **THEN** it uses TanStack Query with:
  - Typed queryKey
  - Service function as queryFn
  - Appropriate staleTime and gcTime

### Requirement: No Hardcoded Values

The system SHALL never use hardcoded data values in components.

#### Scenario: Component data usage

- **WHEN** a component displays data
- **THEN** data comes from hooks or props
- **AND** never from inline literals

#### Scenario: Loading states

- **WHEN** data is loading
- **THEN** components show skeleton/loading state
- **AND** default to empty/zero, never hardcoded sample values

### Requirement: Query Keys Pattern

The system SHALL use centralized query key factory.

#### Scenario: Query keys file

- **WHEN** query-keys.ts is inspected
- **THEN** it exports:
  ```typescript
  export const queryKeys = {
    dashboard: {
      stats: ["dashboard", "stats"] as const,
      chart: (days: number) => ["dashboard", "chart", days] as const,
      activity: ["dashboard", "activity"] as const,
    },
    groups: {
      all: ["groups"] as const,
      list: (params: GroupsParams) => ["groups", "list", params] as const,
      detail: (id: number) => ["groups", id] as const,
    },
    channels: {
      all: ["channels"] as const,
      list: (params: ChannelsParams) => ["channels", "list", params] as const,
      detail: (id: number) => ["channels", id] as const,
    },
    analytics: {
      metrics: (period: string) => ["analytics", "metrics", period] as const,
      trends: (params: TrendsParams) => ["analytics", "trends", params] as const,
    },
  };
  ```
