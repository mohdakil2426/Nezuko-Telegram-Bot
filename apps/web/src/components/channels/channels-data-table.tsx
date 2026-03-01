"use client";

/**
 * Channels Data Table
 * TanStack Table implementation for channels list
 */

import * as React from "react";
import { DataTable } from "@/components/shared/data-table";
import { createChannelsColumns, type ChannelsColumnsProps } from "./channels-columns";
import type { Channel } from "@/lib/services/types";

interface ChannelsDataTableProps extends ChannelsColumnsProps {
  data: Channel[];
  isPending?: boolean;
  pageSize?: number;
}

export function ChannelsDataTable({
  data,
  isPending = false,
  pageSize = 10,
  onDelete,
  onViewDetails,
}: ChannelsDataTableProps) {
  const columns = React.useMemo(
    () =>
      createChannelsColumns({
        onDelete,
        onViewDetails,
      }),
    [onDelete, onViewDetails]
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      filterPlaceholder="Filter channels..."
      filterColumn="title"
      emptyMessage="No channels found."
      isPending={isPending}
      pageSize={pageSize}
      ariaLabel="Enforced channels"
    />
  );
}
