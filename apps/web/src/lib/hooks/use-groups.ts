import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { groupsApi, GetGroupsParams } from "@/lib/api/endpoints/groups";
import { GroupUpdateRequest, PaginatedResponse, Group } from "@nezuko/types";
import { queryKeys, mutationKeys } from "@/lib/query-keys";
import { USE_MOCK_DATA } from "@/lib/data/config";
import { mockApi } from "@/lib/data/mock-api";

export function useGroups(params: GetGroupsParams) {
  return useQuery({
    queryKey: queryKeys.groups.list(params),
    queryFn: async (): Promise<PaginatedResponse<Group>> => {
      if (USE_MOCK_DATA) {
        return mockApi.getGroups(params);
      }
      return groupsApi.getGroups(params);
    },
    placeholderData: (previousData: PaginatedResponse<Group> | undefined) => previousData,
  });
}

export function useGroup(id: number) {
  return useQuery({
    queryKey: queryKeys.groups.detail(id),
    queryFn: () => groupsApi.getGroup(id),
    enabled: !!id,
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.groups.update,
    mutationFn: ({ id, data }: { id: number; data: GroupUpdateRequest }) =>
      groupsApi.updateGroup(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(data.group_id) });
    },
  });
}

export function useLinkChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.groups.linkChannel,
    mutationFn: ({ groupId, channelId }: { groupId: number; channelId: number }) =>
      groupsApi.linkChannel(groupId, channelId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(variables.groupId) });
    },
  });
}

export function useUnlinkChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.groups.unlinkChannel,
    mutationFn: ({ groupId, channelId }: { groupId: number; channelId: number }) =>
      groupsApi.unlinkChannel(groupId, channelId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(variables.groupId) });
    },
  });
}
