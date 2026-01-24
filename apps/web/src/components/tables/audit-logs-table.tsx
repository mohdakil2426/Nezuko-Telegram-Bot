"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Eye } from "lucide-react";

import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AuditLog } from "@nezuko/types";

export const columns: ColumnDef<AuditLog>[] = [
    {
        accessorKey: "created_at",
        header: "Timestamp",
        cell: ({ row }) => (
            <span className="whitespace-nowrap">
                {format(new Date(row.original.created_at), "MMM d, HH:mm:ss")}
            </span>
        ),
    },
    {
        accessorKey: "user",
        header: "User",
        cell: ({ row }) => {
            const user = row.original.user;
            return (
                <div className="flex flex-col">
                    <span className="font-medium text-sm">{user?.full_name || "Unknown"}</span>
                    <span className="text-xs text-muted-foreground">{user?.email || "System"}</span>
                </div>
            )
        },
    },
    {
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => <Badge variant="outline">{row.original.action}</Badge>,
    },
    {
        accessorKey: "resource",
        header: "Resource",
        cell: ({ row }) => (
            <div className="flex flex-col">
                <span className="capitalize font-medium">{row.original.resource_type}</span>
                {row.original.resource_id && (
                    <span className="text-xs text-muted-foreground font-mono">{row.original.resource_id}</span>
                )}
            </div>
        ),
    },
    {
        accessorKey: "ip_address",
        header: "IP Address",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.ip_address}</span>,
    },
    {
        id: "actions",
        cell: ({ row }) => {
            return (
                <Button variant="ghost" size="icon" title="View Details">
                    <Eye className="h-4 w-4" />
                </Button>
            )
        }
    }
];

interface AuditLogsTableProps {
    data: AuditLog[];
    pageCount: number;
    page: number;
    perPage: number;
    onPageChange: (page: number) => void;
    isLoading?: boolean;
}

export function AuditLogsTable({
    data,
    pageCount,
    page,
    perPage,
    onPageChange,
    isLoading
}: AuditLogsTableProps) {
    return (
        <DataTable
            columns={columns}
            data={data}
            pageCount={pageCount}
            page={page}
            perPage={perPage}
            onPageChange={onPageChange}
            isLoading={isLoading}
        // Add other props if DataTable supports them (e.g. onSortingChange)
        />
    );
}
