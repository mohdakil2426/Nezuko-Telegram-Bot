import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { configApi } from "../api/endpoints/config";
import { ConfigUpdateRequest } from "@nezuko/types";
import { queryKeys, mutationKeys } from "@/lib/query-keys";

export function useConfig() {
    return useQuery({
        queryKey: queryKeys.config.all, // v5: Centralized query keys
        queryFn: () => configApi.getConfig(),
    });
}

export function useUpdateConfig() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: mutationKeys.config.update, // v5: Centralized mutation keys
        mutationFn: (data: ConfigUpdateRequest) => configApi.updateConfig(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.config.all });
        },
    });
}

export function useTestWebhook() {
    return useMutation({
        mutationKey: mutationKeys.config.testWebhook, // v5: Centralized mutation keys
        mutationFn: () => configApi.testWebhook(),
    });
}
