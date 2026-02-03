/**
 * Groups React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import * as groupsService from "@/lib/services/groups.service";
import type { GroupsParams, GroupUpdateRequest } from "@/lib/services/types";

/**
 * Hook to fetch paginated groups list
 */
export function useGroups(params?: GroupsParams) {
  return useQuery({
    queryKey: queryKeys.groups.list(params as Record<string, unknown>),
    queryFn: () => groupsService.getGroups(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch single group details
 */
export function useGroup(id: number | null) {
  return useQuery({
    queryKey: queryKeys.groups.detail(id ?? 0),
    queryFn: () => groupsService.getGroup(id!),
    enabled: id !== null,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to update a group
 */
export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: GroupUpdateRequest }) =>
      groupsService.updateGroup(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate both the list and detail queries
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(id) });
    },
  });
}

/**
 * Hook to delete a group
 */
export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => groupsService.deleteGroup(id),
    onSuccess: () => {
      // Invalidate the list query
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.lists() });
    },
  });
}

/**
 * Hook to toggle group protection
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
