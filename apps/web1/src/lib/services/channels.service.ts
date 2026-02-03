/**
 * Channels Service
 * Handles data fetching with mock/API toggle
 */

import { USE_MOCK } from "@/lib/api/config";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  Channel,
  ChannelDetail,
  ChannelListResponse,
  ChannelsParams,
  ChannelCreateRequest,
  SuccessResponse,
} from "@/lib/services/types";
import * as mockData from "@/lib/mock";

/**
 * Get paginated list of channels
 */
export async function getChannels(params?: ChannelsParams): Promise<ChannelListResponse> {
  if (USE_MOCK) {
    return mockData.getChannels(params);
  }

  return apiClient.get<ChannelListResponse>(ENDPOINTS.channels.list, {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

/**
 * Get single channel by ID
 */
export async function getChannel(id: number): Promise<ChannelDetail | null> {
  if (USE_MOCK) {
    return mockData.getChannel(id);
  }

  const response = await apiClient.get<SuccessResponse<ChannelDetail>>(
    ENDPOINTS.channels.detail(id)
  );
  return response.data;
}

/**
 * Create a new channel
 */
export async function createChannel(data: ChannelCreateRequest): Promise<Channel> {
  if (USE_MOCK) {
    // Mock create - return new channel
    return {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: null,
      subscriber_count: 0,
      linked_groups_count: 0,
    };
  }

  const response = await apiClient.post<SuccessResponse<Channel>>(ENDPOINTS.channels.create, data);
  return response.data;
}

/**
 * Delete a channel
 */
export async function deleteChannel(id: number): Promise<void> {
  if (USE_MOCK) {
    // Mock delete - just simulate success
    return;
  }

  await apiClient.delete(ENDPOINTS.channels.delete(id));
}
