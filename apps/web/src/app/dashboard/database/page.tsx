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
import { Eye, Database, HardDrive, Table2, Columns3 } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/page-transition";

const columns: ColumnDef<TableInfo>[] = [
    {
        accessorKey: "name",
        header: "Table Name",
        cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => (
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--accent-hex)]/10">
                    <Table2 className="h-4 w-4 text-[var(--accent-hex)]" />
                </div>
                <span className="font-medium font-mono text-[var(--text-primary)]">
                    {row.getValue("name") as string}
                </span>
            </div>
        ),
    },
    {
        accessorKey: "row_count",
        header: "Rows",
        cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => {
            const count: number = row.getValue("row_count") as number;
            return (
                <Badge 
                    variant={count > 0 ? "secondary" : "outline"}
                    className={count > 0 ? "bg-[var(--accent-hex)]/20 text-[var(--accent-hex)] border-[var(--accent-hex)]/30" : ""}
                >
                    {count.toLocaleString()}
                </Badge>
            );
        },
    },
    {
        accessorKey: "size_bytes",
        header: "Size",
        cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => (
            <span className="text-[var(--text-muted)] flex items-center gap-2">
                <HardDrive className="h-3 w-3" />
                {formatBytes(row.getValue("size_bytes") as number)}
            </span>
        ),
    },
    {
        accessorKey: "columns",
        header: "Columns",
        cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => {
            const cols: string[] = row.getValue("columns") as string[];
            return (
                <div className="flex flex-wrap gap-1.5 max-w-sm">
                    {cols.slice(0, 3).map((col) => (
                        <code 
                            key={col} 
                            className="text-[10px] bg-[var(--nezuko-surface)] px-1.5 py-0.5 rounded border border-[var(--nezuko-border)] text-[var(--text-secondary)]"
                        >
                            {col}
                        </code>
                    ))}
                    {cols.length > 3 && (
                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                            <Columns3 className="h-3 w-3" />
                            +{cols.length - 3} more
                        </span>
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
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 hover:bg-[var(--accent-hex)]/10 hover:text-[var(--accent-hex)]"
                    >
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

    const tableData = (tables as { data?: { tables?: TableInfo[] } })?.data?.tables || [];
    const totalSize = tableData.reduce((acc, t) => acc + (t.size_bytes || 0), 0);
    const totalRows = tableData.reduce((acc, t) => acc + (t.row_count || 0), 0);

    if (isError) {
        return (
            <div className="space-y-8">
                <PageHeader
                    title="Database"
                    highlight="Browser"
                    description="Direct access to raw database tables. Use with caution."
                />
                <FadeIn>
                    <div className="p-8 text-center rounded-2xl glass border border-red-500/20">
                        <p className="text-red-400">Failed to load database tables.</p>
                    </div>
                </FadeIn>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <PageHeader
                title="Database"
                highlight="Browser"
                description="Direct access to raw database tables. Use with caution."
            >
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass text-sm">
                    <Database className="h-4 w-4 text-[var(--accent-hex)]" />
                    <span className="text-[var(--text-secondary)]">
                        SQLite Database
                    </span>
                </div>
            </PageHeader>

            {isLoading ? (
                <DatabaseSkeleton />
            ) : (
                <>
                    {/* Stats Overview */}
                    <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StaggerItem>
                            <div className="rounded-xl glass p-4 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--accent-hex)]/10">
                                    <Table2 className="h-6 w-6 text-[var(--accent-hex)]" />
                                </div>
                                <div>
                                    <p className="text-sm text-[var(--text-muted)]">Total Tables</p>
                                    <p className="text-2xl font-bold text-[var(--text-primary)]">{tableData.length}</p>
                                </div>
                            </div>
                        </StaggerItem>
                        <StaggerItem>
                            <div className="rounded-xl glass p-4 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--accent-hex)]/10">
                                    <Columns3 className="h-6 w-6 text-[var(--accent-hex)]" />
                                </div>
                                <div>
                                    <p className="text-sm text-[var(--text-muted)]">Total Rows</p>
                                    <p className="text-2xl font-bold text-[var(--text-primary)]">{totalRows.toLocaleString()}</p>
                                </div>
                            </div>
                        </StaggerItem>
                        <StaggerItem>
                            <div className="rounded-xl glass p-4 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--accent-hex)]/10">
                                    <HardDrive className="h-6 w-6 text-[var(--accent-hex)]" />
                                </div>
                                <div>
                                    <p className="text-sm text-[var(--text-muted)]">Database Size</p>
                                    <p className="text-2xl font-bold text-[var(--text-primary)]">{formatBytes(totalSize)}</p>
                                </div>
                            </div>
                        </StaggerItem>
                    </StaggerContainer>

                    {/* Table */}
                    <FadeIn delay={0.3}>
                        <div className="rounded-2xl glass overflow-hidden">
                            <DataTable
                                columns={columns}
                                data={tableData}
                                pageCount={1}
                                pagination={pagination}
                                onPaginationChange={setPagination}
                                sorting={sorting}
                                onSortingChange={setSorting}
                            />
                        </div>
                    </FadeIn>
                </>
            )}
        </div>
    );
}

function DatabaseSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 rounded-xl bg-[var(--nezuko-surface)]" />
                ))}
            </div>
            <div className="rounded-2xl glass p-4 space-y-4">
                <Skeleton className="h-12 w-full bg-[var(--nezuko-surface)]" />
                <Skeleton className="h-12 w-full bg-[var(--nezuko-surface)]" />
                <Skeleton className="h-12 w-full bg-[var(--nezuko-surface)]" />
                <Skeleton className="h-12 w-full bg-[var(--nezuko-surface)]" />
            </div>
        </div>
    );
}
