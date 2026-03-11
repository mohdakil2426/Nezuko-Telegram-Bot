/**
 * Groups Service
 * Handles data fetching via InsForge SDK with mock fallback
 */

import { USE_MOCK } from "@/lib/api/config";
import { insforge } from "@/lib/insforge";
import type {
  Group,
  GroupListResponse,
  GroupsParams,
  GroupUpdateRequest,
} from "@/lib/services/types";
import * as mockData from "@/lib/mock";

/**
 * Get paginated list of groups
 */
export async function getGroups(params?: GroupsParams): Promise<GroupListResponse> {
  if (USE_MOCK) {
    return mockData.getGroups(params);
  }

  const page = params?.page ?? 1;
  const perPage = params?.per_page ?? 10;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = insforge.database.from("protected_groups").select("*", { count: "exact" });

  if (params?.search) {
    query = query.ilike("title", `%${params.search}%`);
  }

  if (params?.enabled !== undefined) {
    query = query.eq("enabled", params.enabled);
  }

  const sortBy = params?.sort_by ?? "created_at";
  const sortOrder = params?.sort_order ?? "desc";
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  const totalItems = count ?? 0;

  return {
    status: "success",
    data: (data ?? []) as Group[],
    meta: {
      page,
      per_page: perPage,
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / perPage),
    },
  };
}

/**
 * Update a group
 */
async function updateGroup(id: number, updates: GroupUpdateRequest): Promise<Group> {
  if (USE_MOCK) {
    return { group_id: id, ...updates } as Group;
  }

  const { data, error } = await insforge.database
    .from("protected_groups")
    .update(updates)
    .eq("group_id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Group;
}

/**
 * Delete a group
 */
export async function deleteGroup(id: number): Promise<void> {
  if (USE_MOCK) {
    return;
  }

  const { error } = await insforge.database.from("protected_groups").delete().eq("group_id", id);
  if (error) throw error;
}

/**
 * Toggle group protection status
 */
export async function toggleGroupProtection(id: number, enabled: boolean): Promise<Group> {
  return updateGroup(id, { enabled });
}
