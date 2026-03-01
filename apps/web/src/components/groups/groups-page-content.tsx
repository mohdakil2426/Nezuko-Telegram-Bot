"use client";

/**
 * Groups Page Content
 * Client component that fetches and displays groups with data table
 */

import { useState } from "react";
import { useGroups, useToggleGroupProtection, useDeleteGroup } from "@/lib/hooks";
import { GroupsDataTable } from "./groups-data-table";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";

export function GroupsPageContent() {
  const { data, isPending, error } = useGroups();
  const toggleProtection = useToggleGroupProtection();
  const deleteGroup = useDeleteGroup();
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const handleToggleProtection = (id: number, enabled: boolean) => {
    if (toggleProtection.isPending) return;
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
    setDeleteTargetId(id);
  };

  const confirmDelete = () => {
    if (deleteTargetId === null) return;
    deleteGroup.mutate(deleteTargetId, {
      onSuccess: () => {
        toast.success("Group deleted successfully");
        setDeleteTargetId(null);
      },
      onError: () => {
        toast.error("Failed to delete group");
        setDeleteTargetId(null);
      },
    });
  };

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-destructive font-medium">Failed to load groups</p>
          <p className="text-muted-foreground mt-1 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <GroupsDataTable
        data={data?.data ?? []}
        isPending={isPending}
        onToggleProtection={handleToggleProtection}
        onDelete={handleDelete}
      />
      <DeleteConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open && !deleteGroup.isPending) setDeleteTargetId(null);
        }}
        onConfirm={confirmDelete}
        entityName="group"
        isDeleting={deleteGroup.isPending}
      />
    </>
  );
}
