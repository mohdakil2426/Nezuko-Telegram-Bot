import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { configApi } from "../api/endpoints/config";
import { ConfigUpdateRequest } from "@nezuko/types";

export function useConfig() {
    return useQuery({
        queryKey: ["config"],
        queryFn: () => configApi.getConfig(),
    });
}

export function useUpdateConfig() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: ["config", "update"], // v5: Enable tracking with useMutationState
        mutationFn: (data: ConfigUpdateRequest) => configApi.updateConfig(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["config"] });
        },
    });
}

export function useTestWebhook() {
    return useMutation({
        mutationKey: ["config", "testWebhook"], // v5: Enable tracking with useMutationState
        mutationFn: () => configApi.testWebhook(),
    });
}
