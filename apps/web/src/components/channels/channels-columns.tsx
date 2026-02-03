"use client";

/**
 * Channels Table Column Definitions
 * TanStack Table columns for the channels data table
 */

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, ExternalLink, Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Channel } from "@/lib/services/types";

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format large numbers with K/M suffixes
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export interface ChannelsColumnsProps {
  onDelete?: (id: number) => void;
  onViewDetails?: (id: number) => void;
}

export function createChannelsColumns({
  onDelete,
  onViewDetails,
}: ChannelsColumnsProps = {}): ColumnDef<Channel>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Channel Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const title = row.getValue("title") as string | null;
        const username = row.original.username;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{title ?? "Untitled Channel"}</span>
            {username && <span className="text-xs text-muted-foreground">@{username}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "username",
      header: "Username",
      cell: ({ row }) => {
        const username = row.getValue("username") as string | null;
        if (!username) {
          return <span className="text-muted-foreground">Private</span>;
        }
        return (
          <a
            href={`https://t.me/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            @{username}
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      },
    },
    {
      accessorKey: "subscriber_count",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Subscribers
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const count = row.getValue("subscriber_count") as number;
        return <div className="text-center font-medium">{formatNumber(count)}</div>;
      },
    },
    {
      accessorKey: "linked_groups_count",
      header: "Linked Groups",
      cell: ({ row }) => {
        const count = row.getValue("linked_groups_count") as number;
        return (
          <div className="flex items-center justify-center gap-1">
            <Link2 className="h-3 w-3 text-muted-foreground" />
            <span>{count}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "invite_link",
      header: "Invite Link",
      cell: ({ row }) => {
        const inviteLink = row.original.invite_link;
        if (!inviteLink) {
          return (
            <Badge variant="outline" className="text-muted-foreground">
              No Link
            </Badge>
          );
        }
        return (
          <Badge variant="secondary" className="gap-1">
            <Link2 className="h-3 w-3" />
            Available
          </Badge>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string;
        return <div className="text-muted-foreground">{formatDate(date)}</div>;
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
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
                onClick={() => navigator.clipboard.writeText(channel.channel_id.toString())}
              >
                Copy Channel ID
              </DropdownMenuItem>
              {channel.invite_link && (
                <DropdownMenuItem
                  onClick={() => navigator.clipboard.writeText(channel.invite_link!)}
                >
                  Copy Invite Link
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onViewDetails?.(channel.channel_id)}>
                View Details
              </DropdownMenuItem>
              {channel.username && (
                <DropdownMenuItem asChild>
                  <a
                    href={`https://t.me/${channel.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Telegram
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete?.(channel.channel_id)}
              >
                Remove Channel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
