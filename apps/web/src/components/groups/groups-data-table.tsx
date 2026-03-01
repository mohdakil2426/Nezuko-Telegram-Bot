"use client";

/**
 * Groups Data Table
 * TanStack Table implementation for groups list
 */

import * as React from "react";
import { DataTable } from "@/components/shared/data-table";
import { createGroupsColumns, type GroupsColumnsProps } from "./groups-columns";
import type { Group } from "@/lib/services/types";

interface GroupsDataTableProps extends GroupsColumnsProps {
  data: Group[];
  isPending?: boolean;
  pageSize?: number;
}

export function GroupsDataTable({
  data,
  isPending = false,
  pageSize = 10,
  onToggleProtection,
  onDelete,
  onViewDetails,
}: GroupsDataTableProps) {
  const columns = React.useMemo(
    () =>
      createGroupsColumns({
        onToggleProtection,
        onDelete,
        onViewDetails,
      }),
    [onToggleProtection, onDelete, onViewDetails]
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      filterPlaceholder="Filter groups..."
      filterColumn="title"
      emptyMessage="No groups found."
      isPending={isPending}
      pageSize={pageSize}
      ariaLabel="Protected groups"
    />
  );
}
