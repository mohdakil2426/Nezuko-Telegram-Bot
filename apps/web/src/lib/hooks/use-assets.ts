import { useQuery } from "@tanstack/react-query";
import { USE_MOCK_DATA } from "@/lib/data/config";
import { mockApi } from "@/lib/data/mock-api";
import { useGroups } from "./use-groups";
import { useChannels } from "./use-channels";
import { assetsFromGroupsAndChannels, type Asset } from "@/lib/data/types";

export type AssetFilter = "all" | "groups" | "channels" | "archived";

interface UseAssetsParams {
  type?: AssetFilter;
  search?: string;
  page?: number;
  perPage?: number;
}

interface AssetsResult {
  items: Asset[];
  total: number;
}

/**
 * Combined hook for fetching assets (groups + channels).
 * Supports filtering by type and search, and works with both mock and real API.
 */
export function useAssets(params: UseAssetsParams = {}) {
  const { type = "all", search, page = 1, perPage = 20 } = params;

  // In mock mode, use unified mock API
  const mockQuery = useQuery({
    queryKey: ["assets", "mock", params],
    queryFn: () => mockApi.getAssets({ type, search }),
    enabled: USE_MOCK_DATA,
  });

  // In real mode, fetch groups and channels separately
  const groupsQuery = useGroups({
    page,
    per_page: perPage,
    search,
  });

  const channelsQuery = useChannels({
    page,
    per_page: perPage,
    search,
  });

  // If mock mode, return mock data
  if (USE_MOCK_DATA) {
    return {
      data: mockQuery.data as AssetsResult | undefined,
      isLoading: mockQuery.isLoading,
      isPending: mockQuery.isPending,
      isError: mockQuery.isError,
      error: mockQuery.error,
      refetch: mockQuery.refetch,
    };
  }

  // Combine real API data
  const isLoading = groupsQuery.isLoading || channelsQuery.isLoading;
  const isPending = groupsQuery.isPending || channelsQuery.isPending;
  const isError = groupsQuery.isError || channelsQuery.isError;

  let assets: Asset[] = [];
  if (groupsQuery.data && channelsQuery.data) {
    const groups = groupsQuery.data.data || [];
    const channels = channelsQuery.data.data || [];
    assets = assetsFromGroupsAndChannels(groups, channels);

    // Filter by type
    if (type === "groups") {
      assets = assets.filter((a) => a.type === "group");
    } else if (type === "channels") {
      assets = assets.filter((a) => a.type === "channel");
    } else if (type === "archived") {
      assets = assets.filter((a) => a.status === "archived");
    }
  }

  return {
    data: { items: assets, total: assets.length } as AssetsResult,
    isLoading,
    isPending,
    isError,
    error: groupsQuery.error || channelsQuery.error,
    refetch: () => {
      groupsQuery.refetch();
      channelsQuery.refetch();
    },
  };
}

/**
 * Hook for fetching assets overview statistics.
 */
export function useAssetsOverview() {
  return useQuery({
    queryKey: ["assets", "overview"],
    queryFn: mockApi.getAssetsOverview,
    // TODO: Add real API endpoint when available
    // For now, always use mock data for overview stats
  });
}

/**
 * Hook for syncing assets with Telegram.
 */
export function useSyncAssets() {
  return useQuery({
    queryKey: ["assets", "sync"],
    queryFn: mockApi.syncAssets,
    enabled: false, // Only run when manually triggered
  });
}
