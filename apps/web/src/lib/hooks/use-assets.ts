import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { dataService, type GetAssetsParams, type PaginatedResult } from "@/services";
import type { Asset, AssetsOverviewStats } from "@/lib/data/types";

export type AssetFilter = "all" | "groups" | "channels" | "archived";

interface UseAssetsParams {
  type?: AssetFilter;
  search?: string;
  page?: number;
  perPage?: number;
}

/**
 * Combined hook for fetching assets (groups + channels).
 * Uses the unified service layer that automatically selects mock or real API.
 */
export function useAssets(params: UseAssetsParams = {}) {
  const { type = "all", search, page = 1, perPage = 20 } = params;

  const query = useQuery<PaginatedResult<Asset>>({
    queryKey: queryKeys.assets.list({ type, search, page, perPage }),
    queryFn: () => dataService.getAssets({ type, search, page, perPage }),
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    data: query.data,
    isPending: query.isPending,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook for fetching assets overview statistics.
 */
export function useAssetsOverview() {
  return useQuery<AssetsOverviewStats>({
    queryKey: queryKeys.assets.overview(),
    queryFn: () => dataService.getAssetsOverview(),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook for fetching a single asset by ID.
 */
export function useAssetById(id: number) {
  return useQuery<Asset>({
    queryKey: queryKeys.assets.detail(id),
    queryFn: () => dataService.getAssetById(id),
    enabled: !!id,
  });
}

/**
 * Hook for syncing assets with Telegram.
 */
export function useSyncAssets() {
  return useQuery<{ success: boolean; message: string }>({
    queryKey: ["assets", "sync"],
    queryFn: () => dataService.syncAssets(),
    enabled: false, // Only run when manually triggered
  });
}
