import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { groupsApi, GetGroupsParams } from "@/lib/api/endpoints/groups";
import { GroupUpdateRequest } from "@nezuko/types";

export function useGroups(params: GetGroupsParams) {
    return useQuery({
        queryKey: ["groups", params],
        queryFn: () => groupsApi.getGroups(params),
        placeholderData: (previousData) => previousData, // Keep previous data while fetching new data
    });
}

export function useGroup(id: number) {
    return useQuery({
        queryKey: ["groups", id],
        queryFn: () => groupsApi.getGroup(id),
        enabled: !!id,
    });
}

export function useUpdateGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: GroupUpdateRequest }) =>
            groupsApi.updateGroup(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["groups"] });
            queryClient.invalidateQueries({ queryKey: ["groups", data.group_id] });
        },
    });
}

export function useLinkChannel() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ groupId, channelId }: { groupId: number; channelId: number }) =>
            groupsApi.linkChannel(groupId, channelId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["groups", variables.groupId] });
        },
    });
}

export function useUnlinkChannel() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ groupId, channelId }: { groupId: number; channelId: number }) =>
            groupsApi.unlinkChannel(groupId, channelId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["groups", variables.groupId] });
        },
    });
}
