import { api } from "../client";
import { AdminApiResponse } from "../types";
import type { AuditLogListResponse, AuditLogFilters } from "@nezuko/types";

export const auditApi = {
    getLogs: async (params: AuditLogFilters): Promise<AdminApiResponse<AuditLogListResponse>> => {
        return api.get<AdminApiResponse<AuditLogListResponse>>("/audit", {
            params: params as unknown as Record<string, string | number | boolean | null | undefined>,
        });
    },
};
