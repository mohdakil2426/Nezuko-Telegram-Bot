import { client } from "../client";
import { AdminApiResponse } from "../types";
import { ConfigResponse, ConfigUpdateRequest, ConfigUpdateResponse, WebhookTestResult } from "@nezuko/types";

export const configApi = {
    getConfig: async (): Promise<AdminApiResponse<ConfigResponse>> => {
        return client.get<AdminApiResponse<ConfigResponse>>("/config");
    },

    updateConfig: async (data: ConfigUpdateRequest): Promise<AdminApiResponse<ConfigUpdateResponse>> => {
        return client.put<AdminApiResponse<ConfigUpdateResponse>>("/config", data);
    },

    testWebhook: async (): Promise<AdminApiResponse<WebhookTestResult>> => {
        return client.post<AdminApiResponse<WebhookTestResult>>("/config/webhook/test", {});
    },
};
