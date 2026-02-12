/**
 * Channels Service
 * Handles data fetching via InsForge SDK with mock fallback
 */

import { USE_MOCK } from "@/lib/api/config";
import { insforge } from "@/lib/insforge";
import type {
  Channel,
  ChannelDetail,
  ChannelListResponse,
  ChannelsParams,
  ChannelCreateRequest,
} from "@/lib/services/types";
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

  let query = insforge.database
    .from("enforced_channels")
    .select("*", { count: "exact" });

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
 * Get single channel by ID with linked groups
 */
export async function getChannel(id: number): Promise<ChannelDetail | null> {
  if (USE_MOCK) {
    return mockData.getChannel(id);
  }

  const { data, error } = await insforge.database
    .from("enforced_channels")
    .select("*, group_channel_links(group_id, protected_groups(title))")
    .eq("channel_id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const links = (data.group_channel_links ?? []) as Array<{
    group_id: number;
    protected_groups: { title: string | null } | null;
  }>;

  const linkedGroups = links.map((link) => ({
    group_id: link.group_id,
    title: link.protected_groups?.title ?? null,
  }));

  return {
    ...data,
    linked_groups: linkedGroups,
  } as ChannelDetail;
}

/**
 * Create a new channel
 */
export async function createChannel(input: ChannelCreateRequest): Promise<Channel> {
  if (USE_MOCK) {
    return {
      ...input,
      created_at: new Date().toISOString(),
      updated_at: null,
      subscriber_count: 0,
      linked_groups_count: 0,
    };
  }

  const { data, error } = await insforge.database
    .from("enforced_channels")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Channel;
}

/**
 * Delete a channel
 */
export async function deleteChannel(id: number): Promise<void> {
  if (USE_MOCK) {
    return;
  }

  const { error } = await insforge.database
    .from("enforced_channels")
    .delete()
    .eq("channel_id", id);
  if (error) throw error;
}
