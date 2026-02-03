"use client";

/**
 * Groups Page Content
 * Client component that fetches and displays groups with data table
 */

import { useGroups, useToggleGroupProtection, useDeleteGroup } from "@/lib/hooks";
import { GroupsDataTable } from "./groups-data-table";
import { toast } from "sonner";

export function GroupsPageContent() {
  const { data, isPending, error } = useGroups();
  const toggleProtection = useToggleGroupProtection();
  const deleteGroup = useDeleteGroup();

  const handleToggleProtection = (id: number, enabled: boolean) => {
    toggleProtection.mutate(
      { id, enabled },
      {
        onSuccess: () => {
          toast.success(enabled ? "Protection enabled" : "Protection disabled");
        },
        onError: () => {
          toast.error("Failed to update protection status");
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this group?")) {
      return;
    }

    deleteGroup.mutate(id, {
      onSuccess: () => {
        toast.success("Group deleted successfully");
      },
      onError: () => {
        toast.error("Failed to delete group");
      },
    });
  };

  const handleViewDetails = (id: number) => {
    // TODO: Navigate to group details or open modal
    toast.info(`View details for group ${id}`);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive font-medium">Failed to load groups</p>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <GroupsDataTable
      data={data?.data ?? []}
      isLoading={isPending}
      onToggleProtection={handleToggleProtection}
      onDelete={handleDelete}
      onViewDetails={handleViewDetails}
    />
  );
}
