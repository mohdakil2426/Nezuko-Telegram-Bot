/**
 * Groups React Query Hooks — Phase 87 Realtime Upgrade
 */

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, STALE_TIMES, REFETCH_INTERVALS } from "@/lib/query-keys";
import * as groupsService from "@/lib/services/groups.service";
import type { GroupsParams, GroupUpdateRequest } from "@/lib/services/types";
import { useRealtimeChart } from "@/lib/hooks/use-realtime-insforge";

/**
 * Hook to fetch paginated groups list.
 * Invalidates on verification events — member counts update when users verify.
 */
export function useGroups(params?: GroupsParams) {
  return useRealtimeChart({
    queryKey: queryKeys.groups.list(params as Record<string, unknown>),
    queryFn: () => groupsService.getGroups(params),
    staleTime: STALE_TIMES.SHORT,
    refetchInterval: REFETCH_INTERVALS.FALLBACK,
    channels: ["dashboard"],
    invalidateOnEvents: ["verification"],
  });
}

/**
 * Hook to update a group.
 */
export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: GroupUpdateRequest }) =>
      groupsService.updateGroup(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(id) });
    },
  });
}

/**
 * Hook to delete a group.
 */
export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => groupsService.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.lists() });
    },
  });
}

/**
 * Hook to toggle group protection.
 */
export function useToggleGroupProtection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      groupsService.toggleGroupProtection(id, enabled),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(id) });
    },
  });
}
