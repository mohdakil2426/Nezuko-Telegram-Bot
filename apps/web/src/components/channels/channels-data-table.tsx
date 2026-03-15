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
  pageIndex?: number;
  pageCount?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
}

export function ChannelsDataTable({
  data,
  isPending = false,
  pageSize = 10,
  pageIndex,
  pageCount,
  totalItems,
  onPageChange,
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
      pageIndex={pageIndex}
      pageCount={pageCount}
      totalItems={totalItems}
      onPageChange={onPageChange}
    />
  );
}
