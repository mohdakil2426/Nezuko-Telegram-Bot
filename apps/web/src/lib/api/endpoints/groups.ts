import { client } from "@/lib/api/client";
import { Group, GroupDetail, GroupUpdateRequest, PaginatedResponse, SuccessResponse } from "@nezuko/types";

export interface GetGroupsParams {
    page?: number;
    per_page?: number;
    search?: string;
    status?: "active" | "inactive" | "all";
    sort_by?: string;
    sort_order?: "asc" | "desc";
}

export const groupsApi = {
    getGroups: async (params: GetGroupsParams = {}): Promise<PaginatedResponse<Group>> => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.per_page) queryParams.append("per_page", params.per_page.toString());
        if (params.search) queryParams.append("search", params.search);
        if (params.status) queryParams.append("status", params.status);
        if (params.sort_by) queryParams.append("sort_by", params.sort_by);
        if (params.sort_order) queryParams.append("sort_order", params.sort_order);

        return client<PaginatedResponse<Group>>(`/groups?${queryParams.toString()}`);
    },

    getGroup: async (id: number): Promise<GroupDetail> => {
        return client<GroupDetail>(`/groups/${id}`);
    },

    updateGroup: async (id: number, data: GroupUpdateRequest): Promise<GroupDetail> => {
        return client<GroupDetail>(`/groups/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    linkChannel: async (groupId: number, channelId: number): Promise<SuccessResponse<{ message: string }>> => {
        return client<SuccessResponse<{ message: string }>>(`/groups/${groupId}/channels`, {
            method: "POST",
            body: JSON.stringify({ channel_id: channelId }),
        });
    },

    unlinkChannel: async (groupId: number, channelId: number): Promise<SuccessResponse<{ message: string }>> => {
        return client<SuccessResponse<{ message: string }>>(`/groups/${groupId}/channels/${channelId}`, {
            method: "DELETE",
        });
    }
};
