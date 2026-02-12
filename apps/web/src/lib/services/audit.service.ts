/**
 * Audit Service
 * Fetches admin audit log entries via InsForge SDK
 */

import { USE_MOCK } from "@/lib/api/config";
import { insforge } from "@/lib/insforge";

export interface AuditLogEntry {
  id: number;
  admin_user_id: number | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  admin_username: string | null;
}

export interface AuditLogsResponse {
  items: AuditLogEntry[];
  total: number;
}

/**
 * Fetch audit log entries with pagination
 */
export async function getAuditLogs(
  limit = 50,
  offset = 0,
): Promise<AuditLogsResponse> {
  if (USE_MOCK) {
    return { items: [], total: 0 };
  }

  const { data, error, count } = await insforge.database
    .from("admin_audit_log")
    .select("*, admin_users(username)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;

  const items = (data ?? []).map(
    (row: {
      id: number;
      admin_user_id: number | null;
      action: string;
      resource_type: string;
      resource_id: string | null;
      details: Record<string, unknown> | null;
      ip_address: string | null;
      created_at: string;
      admin_users: { username: string | null } | null;
    }) => ({
      id: row.id,
      admin_user_id: row.admin_user_id,
      action: row.action,
      resource_type: row.resource_type,
      resource_id: row.resource_id,
      details: row.details,
      ip_address: row.ip_address,
      created_at: row.created_at,
      admin_username: row.admin_users?.username ?? null,
    }),
  );

  return { items, total: count ?? items.length };
}
