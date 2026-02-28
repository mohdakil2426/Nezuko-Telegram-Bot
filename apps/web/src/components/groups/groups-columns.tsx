"use client";

/**
 * Groups Table Column Definitions
 * TanStack Table columns for the groups data table
 */

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Shield, ShieldOff } from "lucide-react";

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
import type { Group } from "@/lib/services/types";
import { formatDate, formatCount } from "@/lib/format";


export interface GroupsColumnsProps {
  onToggleProtection?: (id: number, enabled: boolean) => void;
  onDelete?: (id: number) => void;
  onViewDetails?: (id: number) => void;
}

export function createGroupsColumns({
  onToggleProtection,
  onDelete,
  onViewDetails,
}: GroupsColumnsProps = {}): ColumnDef<Group>[] {
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
          aria-label={`Sort by group name ${column.getIsSorted() === "asc" ? "(ascending)" : column.getIsSorted() === "desc" ? "(descending)" : ""}`}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Group Name
          <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      ),
      cell: ({ row }) => {
        const title = row.getValue("title") as string | null;
        const groupId = row.original.group_id;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{title ?? "Untitled Group"}</span>
            <span className="text-muted-foreground text-xs">ID: {groupId}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "enabled",
      header: "Status",
      cell: ({ row }) => {
        const enabled = row.getValue("enabled") as boolean;
        return enabled ? (
          <Badge variant="default" className="gap-1">
            <Shield className="h-3 w-3" />
            Protected
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <ShieldOff className="h-3 w-3" />
            Disabled
          </Badge>
        );
      },
    },
    {
      accessorKey: "member_count",
      header: ({ column }) => (
        <Button
          variant="ghost"
          aria-label={`Sort by members ${column.getIsSorted() === "asc" ? "(ascending)" : column.getIsSorted() === "desc" ? "(descending)" : ""}`}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Members
          <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      ),
      cell: ({ row }) => {
        const count = row.getValue("member_count") as number;
        return <div className="text-center font-medium">{formatCount(count)}</div>;
      },
    },
    {
      accessorKey: "linked_channels_count",
      header: "Linked Channels",
      cell: ({ row }) => {
        const count = row.getValue("linked_channels_count") as number;
        return <div className="text-center">{count}</div>;
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          aria-label={`Sort by created date ${column.getIsSorted() === "asc" ? "(ascending)" : column.getIsSorted() === "desc" ? "(descending)" : ""}`}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
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
        const group = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(group.group_id.toString())}
              >
                Copy Group ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onViewDetails?.(group.group_id)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onToggleProtection?.(group.group_id, !group.enabled)}
              >
                {group.enabled ? "Disable Protection" : "Enable Protection"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete?.(group.group_id)}
              >
                Delete Group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
