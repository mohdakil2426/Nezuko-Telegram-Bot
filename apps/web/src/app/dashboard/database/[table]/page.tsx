"use client";

import { useTableData } from "@/lib/hooks/use-database";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useMemo } from "react";
import { EditRowModal } from "@/components/database/edit-row-modal";
import { DeleteConfirmDialog } from "@/components/database/delete-confirm-dialog";

// Tables that are protected from modification
const BLOCKED_TABLES = new Set([
    "admin_users",
    "admin_sessions",
    "admin_audit_log",
    "alembic_version",
]);

// Tables allowed for modification
const MODIFIABLE_TABLES = new Set([
    "protected_groups",
    "enforced_channels",
    "group_channel_links",
    "admin_config",
]);

interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
}

export default function TableDataPage() {
    const params = useParams();
    const table_name = params.table as string;

    // Pagination state
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    // Modal state
    const [editRow, setEditRow] = useState<{ id: string; data: Record<string, unknown> } | null>(null);
    const [deleteRow, setDeleteRow] = useState<{ id: string; summary: string } | null>(null);

    const { data: rawData, isLoading, isError } = useTableData(table_name, page, pageSize);
    const data = (rawData as { data?: { columns?: ColumnInfo[], rows?: Record<string, unknown>[], total_rows?: number } })?.data;

    const isModifiable = MODIFIABLE_TABLES.has(table_name);
    const isBlocked = BLOCKED_TABLES.has(table_name);

    // Dynamic columns based on API response
    const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => {
        const baseCols: ColumnDef<Record<string, unknown>>[] = data?.columns?.map((col) => ({
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

        // Add actions column if modifiable
        if (isModifiable && !isBlocked) {
            baseCols.push({
                id: "actions",
                header: "Actions",
                cell: ({ row }) => {
                    const rowData = row.original;
                    const rowId = String(rowData.id || rowData.group_id || rowData.channel_id || "");
                    const rowSummary = Object.entries(rowData)
                        .slice(0, 3)
                        .map(([k, v]) => `${k}: ${String(v).substring(0, 20)}`)
                        .join(", ");

                    return (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditRow({ id: rowId, data: rowData })}
                                title="Edit row"
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteRow({ id: rowId, summary: rowSummary })}
                                title="Delete row"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    );
                },
            });
        }

        return baseCols;
    }, [data?.columns, isModifiable, isBlocked]);

    if (isError) {
        return (
            <div className="p-6 text-center text-error">
                Failed to load data for table: {table_name}
            </div>
        );
    }

    const totalPages = data?.total_rows ? Math.ceil(data.total_rows / pageSize) : 1;

    return (
        <div className="space-y-6 pt-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/database">
                        <Button variant="outline" size="icon">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-text-primary font-mono">{table_name}</h1>
                            {isBlocked && (
                                <Badge variant="outline" className="text-yellow-600 border-yellow-600/30">
                                    Protected
                                </Badge>
                            )}
                            {isModifiable && (
                                <Badge variant="outline" className="text-success border-success/30">
                                    Editable
                                </Badge>
                            )}
                        </div>
                        <p className="text-text-secondary">
                            {(data?.total_rows ?? 0).toLocaleString()} records • {pageSize} per page
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

            {/* Edit Modal */}
            {editRow && (
                <EditRowModal
                    isOpen={!!editRow}
                    onClose={() => setEditRow(null)}
                    tableName={table_name}
                    rowId={editRow.id}
                    rowData={editRow.data}
                    columns={data?.columns || []}
                />
            )}

            {/* Delete Confirmation */}
            {deleteRow && (
                <DeleteConfirmDialog
                    isOpen={!!deleteRow}
                    onClose={() => setDeleteRow(null)}
                    tableName={table_name}
                    rowId={deleteRow.id}
                    rowSummary={deleteRow.summary}
                />
            )}
        </div>
    );
}
