/**
 * Groups Service
 * Handles data fetching with mock/API toggle
 */

import { USE_MOCK } from "@/lib/api/config";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  Group,
  GroupDetail,
  GroupListResponse,
  GroupsParams,
  GroupUpdateRequest,
  SuccessResponse,
} from "@/lib/services/types";
import * as mockData from "@/lib/mock";

/**
 * Get paginated list of groups
 */
export async function getGroups(params?: GroupsParams): Promise<GroupListResponse> {
  if (USE_MOCK) {
    return mockData.getGroups(params);
  }

  return apiClient.get<GroupListResponse>(ENDPOINTS.groups.list, {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

/**
 * Get single group by ID
 */
export async function getGroup(id: number): Promise<GroupDetail | null> {
  if (USE_MOCK) {
    return mockData.getGroup(id);
  }

  const response = await apiClient.get<SuccessResponse<GroupDetail>>(ENDPOINTS.groups.detail(id));
  return response.data;
}

/**
 * Update a group
 */
export async function updateGroup(id: number, data: GroupUpdateRequest): Promise<Group> {
  if (USE_MOCK) {
    // Mock update - just return the existing group with updates
    const group = await mockData.getGroup(id);
    if (!group) throw new Error("Group not found");
    return { ...group, ...data };
  }

  const response = await apiClient.patch<SuccessResponse<Group>>(ENDPOINTS.groups.update(id), data);
  return response.data;
}

/**
 * Delete a group
 */
export async function deleteGroup(id: number): Promise<void> {
  if (USE_MOCK) {
    // Mock delete - just simulate success
    return;
  }

  await apiClient.delete(ENDPOINTS.groups.delete(id));
}

/**
 * Toggle group protection status
 */
export async function toggleGroupProtection(id: number, enabled: boolean): Promise<Group> {
  return updateGroup(id, { enabled });
}
