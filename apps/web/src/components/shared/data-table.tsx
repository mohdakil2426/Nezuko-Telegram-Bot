"use client";

/**
 * Generic DataTable component
 * Shared TanStack Table implementation used by groups and channels tables
 */

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ChevronDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  filterPlaceholder?: string;
  filterColumn?: string;
  emptyMessage?: string;
  isPending?: boolean;
  pageSize?: number;
  ariaLabel?: string;
  pageIndex?: number;
  pageCount?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-8" />
        </div>
      ))}
    </div>
  );
}

export function DataTable<T>({
  columns,
  data,
  filterPlaceholder = "Filter...",
  filterColumn,
  emptyMessage = "No results found.",
  isPending = false,
  pageSize = 10,
  ariaLabel,
  pageIndex,
  pageCount,
  totalItems,
  onPageChange,
}: DataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const isServerPaginated =
    typeof pageIndex === "number" &&
    typeof pageCount === "number" &&
    typeof onPageChange === "function";

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table owns memoization internally; this wrapper does not pass the returned API into memoized hooks/components.
  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: isServerPaginated ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    manualPagination: isServerPaginated,
    pageCount: isServerPaginated ? pageCount : undefined,
    initialState: {
      pagination: {
        pageIndex: isServerPaginated ? pageIndex : 0,
        pageSize,
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: isServerPaginated
        ? {
            pageIndex,
            pageSize,
          }
        : undefined,
    },
  });

  if (isPending) {
    return (
      <div className="w-full">
        <div className="flex items-center py-4">
          <Skeleton className="h-10 w-62.5" />
          <Skeleton className="ml-auto h-10 w-25" />
        </div>
        <div className="rounded-md border p-4">
          <TableSkeleton rows={pageSize} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full min-w-0 sm:max-w-sm sm:flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={filterPlaceholder}
            aria-label={filterPlaceholder}
            value={
              filterColumn
                ? ((table.getColumn(filterColumn)?.getFilterValue() as string) ?? "")
                : ""
            }
            onChange={(event) =>
              filterColumn
                ? table.getColumn(filterColumn)?.setFilterValue(event.target.value)
                : undefined
            }
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:ml-auto sm:w-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id.replace(/_/g, " ")}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table aria-label={ariaLabel}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-muted-foreground text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {isServerPaginated
            ? (totalItems ?? data.length)
            : table.getFilteredRowModel().rows.length}{" "}
          row(s) selected.
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="text-muted-foreground text-sm">
            Page{" "}
            {isServerPaginated
              ? pageCount > 0
                ? pageIndex + 1
                : 0
              : table.getPageCount() > 0
                ? table.getState().pagination.pageIndex + 1
                : 0}{" "}
            of {isServerPaginated ? pageCount : table.getPageCount()}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                isServerPaginated ? onPageChange(Math.max(0, pageIndex - 1)) : table.previousPage()
              }
              disabled={isServerPaginated ? pageIndex <= 0 : !table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                isServerPaginated
                  ? onPageChange(Math.min(pageCount - 1, pageIndex + 1))
                  : table.nextPage()
              }
              disabled={isServerPaginated ? pageIndex + 1 >= pageCount : !table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
