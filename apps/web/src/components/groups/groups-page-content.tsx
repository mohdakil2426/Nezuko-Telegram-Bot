"use client";

/**
 * Groups Page Content
 * Client component that fetches and displays groups with data table
 */

import { useState } from "react";
import { useGroups, useToggleGroupProtection, useDeleteGroup } from "@/lib/hooks";
import { GroupsDataTable } from "./groups-data-table";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

  const handleViewDetails = (id: number) => {
    // TODO: Navigate to group details or open modal
    toast.info(`View details for group ${id}`);
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
        onViewDetails={handleViewDetails}
      />
      <AlertDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open && !deleteGroup.isPending) setDeleteTargetId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The group will be permanently removed
              from the bot&apos;s management list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteGroup.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleteGroup.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteGroup.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
