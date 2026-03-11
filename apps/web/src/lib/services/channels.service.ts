/**
 * Channels Service
 * Handles data fetching via InsForge SDK with mock fallback
 */

import { USE_MOCK } from "@/lib/api/config";
import { insforge } from "@/lib/insforge";
import type { Channel, ChannelListResponse, ChannelsParams } from "@/lib/services/types";
import * as mockData from "@/lib/mock";

/**
 * Get paginated list of channels
 */
export async function getChannels(params?: ChannelsParams): Promise<ChannelListResponse> {
  if (USE_MOCK) {
    return mockData.getChannels(params);
  }

  const page = params?.page ?? 1;
  const perPage = params?.per_page ?? 10;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = insforge.database.from("enforced_channels").select("*", { count: "exact" });

  if (params?.search) {
    query = query.ilike("title", `%${params.search}%`);
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
    data: (data ?? []) as Channel[],
    meta: {
      page,
      per_page: perPage,
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / perPage),
    },
  };
}

/**
 * Delete a channel
 */
export async function deleteChannel(id: number): Promise<void> {
  if (USE_MOCK) {
    return;
  }

  const { error } = await insforge.database.from("enforced_channels").delete().eq("channel_id", id);
  if (error) throw error;
}
