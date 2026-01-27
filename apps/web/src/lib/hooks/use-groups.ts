import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { groupsApi, GetGroupsParams } from "@/lib/api/endpoints/groups";
import { GroupUpdateRequest } from "@nezuko/types";
import { queryKeys, mutationKeys } from "@/lib/query-keys";

export function useGroups(params: GetGroupsParams) {
    return useQuery({
        queryKey: queryKeys.groups.list(params), // v5: Centralized query keys
        queryFn: () => groupsApi.getGroups(params),
        placeholderData: (previousData) => previousData, // Keep previous data while fetching new data
    });
}

export function useGroup(id: number) {
    return useQuery({
        queryKey: queryKeys.groups.detail(id), // v5: Centralized query keys
        queryFn: () => groupsApi.getGroup(id),
        enabled: !!id,
    });
}

export function useUpdateGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: mutationKeys.groups.update, // v5: Centralized mutation keys
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
        mutationKey: mutationKeys.groups.linkChannel, // v5: Centralized mutation keys
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
        mutationKey: mutationKeys.groups.unlinkChannel, // v5: Centralized mutation keys
        mutationFn: ({ groupId, channelId }: { groupId: number; channelId: number }) =>
            groupsApi.unlinkChannel(groupId, channelId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(variables.groupId) });
        },
    });
}
