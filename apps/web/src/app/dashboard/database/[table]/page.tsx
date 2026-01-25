"use client";

import { useTableData } from "@/lib/hooks/use-database";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function TableDataPage() {
    const params = useParams();
    const table_name = params.table as string;

    // Pagination state
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    const { data, isLoading, isError } = useTableData(table_name, page, pageSize);

    if (isError) {
        return (
            <div className="p-6 text-center text-error">
                Failed to load data for table: {table_name}
            </div>
        );
    }

    // Dynamic columns based on API response
    const columns: ColumnDef<any>[] = data?.columns.map((col) => ({
        accessorKey: col.name,
        header: col.name,
        cell: ({ row }) => {
            const val = row.getValue(col.name);
            if (val === null) return <span className="text-muted-foreground italic">null</span>;
            if (typeof val === "boolean") return val ? <Badge variant="outline" className="text-success border-success/30">true</Badge> : <Badge variant="outline" className="text-muted-foreground">false</Badge>;
            if (typeof val === "object") return <code className="text-xs">{JSON.stringify(val).substring(0, 30)}...</code>;
            if (col.name.includes("at") && typeof val === "string") return new Date(val).toLocaleString();
            return String(val);
        },
    })) || [];

    const totalPages = data ? Math.ceil(data.total_rows / pageSize) : 0;

    return (
        <div className="space-y-6 pt-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/database">
                        <Button variant="outline" size="icon">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-text-primary font-mono">{table_name}</h1>
                        <p className="text-text-secondary">
                            {data?.total_rows.toLocaleString()} records • {pageSize} per page
                        </p>
                    </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => alert("Export feature coming soon")}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-96 w-full rounded-md" />
                </div>
            ) : (
                <DataTable
                    columns={columns}
                    data={data?.rows || []}
                    pageCount={totalPages}
                    pagination={{ pageIndex: page - 1, pageSize }}
                    onPaginationChange={(updater) => {
                        if (typeof updater === "function") {
                            const newState = updater({ pageIndex: page - 1, pageSize });
                            setPage(newState.pageIndex + 1);
                            setPageSize(newState.pageSize);
                        } else {
                            setPage(updater.pageIndex + 1);
                            setPageSize(updater.pageSize);
                        }
                    }}
                    sorting={[]}
                    onSortingChange={() => {}}
                />
            )}
        </div>
    );
}
