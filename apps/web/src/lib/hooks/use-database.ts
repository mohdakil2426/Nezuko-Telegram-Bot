import { useQuery } from "@tanstack/react-query";
import { databaseApi } from "../api/endpoints/database";

export function useTables() {
    return useQuery({
        queryKey: ["database", "tables"],
        queryFn: () => databaseApi.getTables(),
    });
}

export function useTableData(tableName: string, page: number, perPage: number) {
    return useQuery({
        queryKey: ["database", "table", tableName, page, perPage],
        queryFn: () => databaseApi.getTableData(tableName, page, perPage),
        enabled: !!tableName,
    });
}

export function useMigrations() {
    return useQuery({
        queryKey: ["database", "migrations"],
        queryFn: () => databaseApi.getMigrations(),
    });
}
