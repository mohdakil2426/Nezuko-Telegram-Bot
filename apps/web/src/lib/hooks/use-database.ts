import { useQuery } from "@tanstack/react-query";
import { databaseApi } from "../api/endpoints/database";
import { queryKeys } from "@/lib/query-keys";

export function useTables() {
    return useQuery({
        queryKey: queryKeys.database.tables(), // v5: Centralized query keys
        queryFn: () => databaseApi.getTables(),
    });
}

export function useTableData(tableName: string, page: number, perPage: number) {
    return useQuery({
        queryKey: queryKeys.database.tableData(tableName, page, perPage), // v5: Centralized query keys
        queryFn: () => databaseApi.getTableData(tableName, page, perPage),
        enabled: !!tableName,
    });
}

export function useMigrations() {
    return useQuery({
        queryKey: queryKeys.database.migrations(), // v5: Centralized query keys
        queryFn: () => databaseApi.getMigrations(),
    });
}
