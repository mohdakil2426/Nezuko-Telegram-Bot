import { client } from "../client";
import { ConfigResponse, ConfigUpdateRequest, ConfigUpdateResponse, WebhookTestResult } from "@nezuko/types";

export const configApi = {
    getConfig: async () => {
        const response = await client.get<ConfigResponse>("/config");
        return response.data;
    },

    updateConfig: async (data: ConfigUpdateRequest) => {
        const response = await client.put<ConfigUpdateResponse>("/config", data);
        return response.data;
    },

    testWebhook: async () => {
        const response = await client.post<WebhookTestResult>("/config/webhook/test");
        return response.data;
    },
};
