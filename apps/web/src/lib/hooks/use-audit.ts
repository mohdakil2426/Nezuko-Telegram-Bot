import { useQuery } from "@tanstack/react-query";
import { auditApi } from "@/lib/api/endpoints/audit";
import type { AuditLogFilters } from "@nezuko/types";

export function useAuditLogs(filters: AuditLogFilters) {
    return useQuery({
        queryKey: ["audit-logs", filters],
        queryFn: () => auditApi.getLogs(filters),
        placeholderData: (previousData) => previousData,
    });
}
