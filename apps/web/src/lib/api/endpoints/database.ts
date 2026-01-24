import { client } from "../client";
import { TableListResponse, TableDataResponse, MigrationStatusResponse } from "@nezuko/types";

export const databaseApi = {
    getTables: async () => {
        constEx response = await client.get<TableListResponse>("/database/tables");
        return response.data;
    },

    getTableData: async (tableName: string, page: number = 1, perPage: number = 50) => {
        const response = await client.get<TableDataResponse>(`/database/tables/${tableName}`, {
            params: { page, per_page: perPage },
        });
        return response.data;
    },

    getMigrations: async () => {
        const response = await client.get<MigrationStatusResponse>("/database/migrations");
        return response.data;
    },
};
