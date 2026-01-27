/**
 * TanStack Query v5 - Centralized Query Keys
 *
 * Benefits:
 * - Type-safe query key access
 * - Consistent invalidation patterns
 * - Easy refactoring
 * - Supports partial matching
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
 */

export const queryKeys = {
    // Dashboard
    dashboard: {
        all: ["dashboard"] as const,
        stats: () => [...queryKeys.dashboard.all, "stats"] as const,
        chartData: () => [...queryKeys.dashboard.all, "chart-data"] as const,
        activity: (limit: number) => [...queryKeys.dashboard.all, "activity", limit] as const,
    },

    // Groups
    groups: {
        all: ["groups"] as const,
        list: (params: { page?: number; per_page?: number; search?: string }) =>
            [...queryKeys.groups.all, params] as const,
        detail: (id: number) => [...queryKeys.groups.all, id] as const,
    },

    // Channels
    channels: {
        all: ["channels"] as const,
        list: (params: { page: number; per_page: number; search?: string }) =>
            [...queryKeys.channels.all, params] as const,
        detail: (id: number) => ["channel", id] as const,
    },

    // Config
    config: {
        all: ["config"] as const,
    },

    // Database
    database: {
        all: ["database"] as const,
        tables: () => [...queryKeys.database.all, "tables"] as const,
        tableData: (tableName: string, page: number, perPage: number) =>
            [...queryKeys.database.all, "table", tableName, page, perPage] as const,
        migrations: () => [...queryKeys.database.all, "migrations"] as const,
    },

    // Analytics
    analytics: {
        all: ["analytics"] as const,
        userGrowth: (period: string, granularity: string) =>
            [...queryKeys.analytics.all, "users", period, granularity] as const,
        verificationTrends: (period: string, granularity: string) =>
            [...queryKeys.analytics.all, "verifications", period, granularity] as const,
    },

    // Audit Logs
    audit: {
        all: ["audit-logs"] as const,
        list: (filters: Record<string, unknown>) => [...queryKeys.audit.all, filters] as const,
    },

    // Admins
    admins: {
        all: ["admins"] as const,
    },
} as const;

/**
 * TanStack Query v5 - Centralized Mutation Keys
 *
 * Benefits:
 * - Enable cross-component mutation tracking with useMutationState
 * - Consistent mutation naming
 * - Easy debugging in React Query DevTools
 */
export const mutationKeys = {
    // Groups
    groups: {
        update: ["groups", "update"] as const,
        linkChannel: ["groups", "linkChannel"] as const,
        unlinkChannel: ["groups", "unlinkChannel"] as const,
    },

    // Channels
    channels: {
        create: ["channels", "create"] as const,
    },

    // Config
    config: {
        update: ["config", "update"] as const,
        testWebhook: ["config", "testWebhook"] as const,
    },

    // Admins
    admins: {
        create: ["admins", "create"] as const,
        delete: ["admins", "delete"] as const,
    },

    // Database
    database: {
        update: (tableName: string) => ["database", tableName, "update"] as const,
        delete: (tableName: string) => ["database", tableName, "delete"] as const,
    },
} as const;
