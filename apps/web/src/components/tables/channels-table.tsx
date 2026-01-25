"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    type ColumnDef,
    type PaginationState,
    type SortingState,
} from "@tanstack/react-table";
import { ChannelResponse } from "@nezuko/types";
import { DataTable } from "./data-table";
import { useChannels } from "@/lib/hooks/use-channels";
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

interface ChannelsTableProps {
    search?: string;
}

export function ChannelsTable({ search }: ChannelsTableProps) {
    const router = useRouter();
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
    const [sorting, setSorting] = useState<SortingState>([]);

    const { data, isLoading } = useChannels({
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        search,
    });

    const columns: ColumnDef<ChannelResponse>[] = [
        {
            accessorKey: "title",
            header: "Channel",
            cell: ({ row }: { row: { original: ChannelResponse } }) => {
                const channel = row.original;
                return (
                    <div className="flex flex-col">
                        <span className="font-medium text-text-primary">
                            {channel.title || "Untitled Channel"}
                        </span>
                        <span className="text-xs text-text-tertiary">
                            ID: {channel.channel_id.toString()}
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: "username",
            header: "Username",
            cell: ({ row }: { row: { getValue: (key: string) => any } }) => {
                const username = row.getValue("username") as string | null;
                return username ? (
                    <span className="text-primary hover:underline cursor-pointer">
                        {username.startsWith("@") ? username : `@${username}`}
                    </span>
                ) : (
                    <span className="text-text-tertiary italic">None</span>
                );
            }
        },
        {
            accessorKey: "subscriber_count",
            header: "Subscribers",
            cell: ({ row }: { row: { getValue: (key: string) => any } }) => (
                <div className="font-medium">
                    {new Intl.NumberFormat("en-US").format(row.getValue("subscriber_count"))}
                </div>
            ),
        },
        {
            accessorKey: "linked_groups_count",
            header: "Groups",
            cell: ({ row }: { row: { getValue: (key: string) => any } }) => (
                <div className="text-center w-16">
                    <Badge variant="outline">{row.getValue("linked_groups_count")}</Badge>
                </div>
            ),
        },
        {
            accessorKey: "created_at",
            header: "Added",
            cell: ({ row }: { row: { getValue: (key: string) => any } }) => {
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
            cell: ({ row }: { row: { original: ChannelResponse } }) => {
                const channel = row.original;

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
                                onClick={() => router.push(`/dashboard/channels/${channel.channel_id}`)}
                            >
                                <Eye className="mr-2 h-4 w-4" />
                                <span>View Details</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/channels/${channel.channel_id}?action=edit`)}
                            >
                                <FileEdit className="mr-2 h-4 w-4" />
                                <span>Edit Info</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Remove</span>
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
            pageCount={data?.pages || -1}
            pagination={pagination}
            onPaginationChange={setPagination}
            sorting={sorting}
            onSortingChange={setSorting}
            isLoading={isLoading}
            onRowClick={(row: ChannelResponse) => router.push(`/dashboard/channels/${row.channel_id}`)}
        />
    );
}
