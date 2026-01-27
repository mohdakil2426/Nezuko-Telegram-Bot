import { useQuery } from "@tanstack/react-query";
import { auditApi } from "@/lib/api/endpoints/audit";
import type { AuditLogFilters } from "@nezuko/types";
import { queryKeys } from "@/lib/query-keys";

export function useAuditLogs(filters: AuditLogFilters) {
    return useQuery({
        queryKey: queryKeys.audit.list(filters), // v5: Centralized query keys
        queryFn: () => auditApi.getLogs(filters),
        placeholderData: (previousData) => previousData,
    });
}
