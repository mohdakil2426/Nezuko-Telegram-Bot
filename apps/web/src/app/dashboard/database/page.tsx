"use client";

import * as React from "react";
import { useTables } from "@/lib/hooks/use-database";
import { DataTable } from "@/components/tables/data-table";
import { type ColumnDef, type SortingState } from "@tanstack/react-table";
import { TableInfo } from "@nezuko/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye, Database } from "lucide-react";
import { formatBytes } from "@/lib/utils";

const columns: ColumnDef<TableInfo>[] = [
    {
        accessorKey: "name",
        header: "Table Name",
        cell: ({ row }: { row: { getValue: (key: string) => any } }) => (
            <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium font-mono text-primary">
                    {row.getValue("name")}
                </span>
            </div>
        ),
    },
    {
        accessorKey: "row_count",
        header: "Rows",
        cell: ({ row }: { row: { getValue: (key: string) => any } }) => {
            const count: number = row.getValue("row_count");
            return <Badge variant={count > 0 ? "secondary" : "outline"}>{count.toLocaleString()}</Badge>;
        },
    },
    {
        accessorKey: "size_bytes",
        header: "Size",
        cell: ({ row }: { row: { getValue: (key: string) => any } }) => (
            <span className="text-muted-foreground">
                {formatBytes(row.getValue("size_bytes"))}
            </span>
        ),
    },
    {
        accessorKey: "columns",
        header: "Columns",
        cell: ({ row }: { row: { getValue: (key: string) => any } }) => {
            const cols: string[] = row.getValue("columns");
            return (
                <div className="flex flex-wrap gap-1 max-w-sm">
                    {cols.slice(0, 3).map((col) => (
                        <code key={col} className="text-[10px] bg-muted px-1 py-0.5 rounded">
                            {col}
                        </code>
                    ))}
                    {cols.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{cols.length - 3} more</span>
                    )}
                </div>
            );
        },
    },
    {
        id: "actions",
        cell: ({ row }: { row: { original: TableInfo } }) => (
            <div className="flex justify-end">
                <Link href={`/dashboard/database/${row.original.name}`}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Eye className="h-4 w-4" />
                    </Button>
                </Link>
            </div>
        ),
    },
];

export default function DatabasePage() {
    const { data: tables, isLoading, isError } = useTables();
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [pagination, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: 50,
    });

    if (isError) {
        return (
            <div className="p-6 text-center text-error border rounded-lg bg-error/10">
                Failed to load database tables.
            </div>
        );
    }

    return (
        <div className="space-y-6 pt-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-text-primary">Database Browser</h1>
                <p className="text-text-secondary">
                    Direct access to raw database tables. Use with caution.
                </p>
            </div>

            {isLoading ? (
                <CardSkeleton />
            ) : (
                <DataTable
                    columns={columns}
                    data={tables?.tables || []}
                    pageCount={1}
                    pagination={pagination}
                    onPaginationChange={setPagination}
                    sorting={sorting}
                    onSortingChange={setSorting}
                />
            )}
        </div>
    );
}

function CardSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-[250px]" />
            </div>
            <div className="rounded-md border p-4 space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
    );
}
