import { api } from "../client";
import type { AuditLogListResponse, AuditLogFilters } from "@nezuko/types";

export const auditApi = {
    getLogs: async (params: AuditLogFilters) => {
        return api.get<AuditLogListResponse>("/audit", {
            params,
        });
    },
};
