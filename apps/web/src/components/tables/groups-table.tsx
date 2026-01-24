"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    ColumnDef,
    PaginationState,
    SortingState,
} from "@tanstack/react-table";
import { Group } from "@nezuko/types";
import { DataTable } from "./data-table";
import { useGroups } from "@/lib/hooks/use-groups";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, FileEdit, Eye, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface GroupsTableProps {
    search?: string;
    status?: "active" | "inactive" | "all";
}

export function GroupsTable({ search, status }: GroupsTableProps) {
    const router = useRouter();
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
    const [sorting, setSorting] = useState<SortingState>([]);

    const { data, isLoading } = useGroups({
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        search,
        status,
        sort_by: sorting[0]?.id,
        sort_order: sorting[0]?.desc ? "desc" : "asc",
    });

    const columns: ColumnDef<Group>[] = [
        {
            accessorKey: "title",
            header: "Group",
            cell: ({ row }) => {
                const group = row.original;
                return (
                    <div className="flex flex-col">
                        <span className="font-medium text-text-primary">
                            {group.title || "Untitled Group"}
                        </span>
                        <span className="text-xs text-text-tertiary">
                            ID: {group.group_id}
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: "linked_channels_count",
            header: "Channels",
            cell: ({ row }) => (
                <div className="text-center w-16">
                    <Badge variant="outline">{row.getValue("linked_channels_count")}</Badge>
                </div>
            ),
        },
        {
            accessorKey: "member_count",
            header: "Members",
            cell: ({ row }) => (
                <div className="font-medium">
                    {new Intl.NumberFormat("en-US").format(row.getValue("member_count"))}
                </div>
            ),
        },
        {
            accessorKey: "enabled",
            header: "Status",
            cell: ({ row }) => {
                const isActive = row.getValue("enabled");
                return (
                    <Badge
                        variant={isActive ? "default" : "secondary"}
                        className={
                            isActive
                                ? "bg-success/15 text-success hover:bg-success/25 border-success/25"
                                : "bg-text-tertiary/15 text-text-tertiary border-text-tertiary/25"
                        }
                    >
                        {isActive ? "Active" : "Paused"}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "created_at",
            header: "Created",
            cell: ({ row }) => {
                return (
                    <span className="text-text-secondary text-sm">
                        {formatDistanceToNow(new Date(row.getValue("created_at")), {
                            addSuffix: true,
                        })}
                    </span>
                );
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const group = row.original;

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => router.push(`/groups/${group.group_id}`)}
                            >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => router.push(`/groups/${group.group_id}?action=edit`)}
                            >
                                <FileEdit className="mr-2 h-4 w-4" />
                                Edit Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-error focus:text-error">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    return (
        <DataTable
            columns={columns}
            data={data?.items || []}
            pageCount={data?.meta?.total_pages || -1}
            pagination={pagination}
            onPaginationChange={setPagination}
            sorting={sorting}
            onSortingChange={setSorting}
            isLoading={isLoading}
            onRowClick={(row) => router.push(`/groups/${row.group_id}`)}
        />
    );
}
