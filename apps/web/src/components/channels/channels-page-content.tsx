"use client";

/**
 * Channels Page Content
 * Client component that fetches and displays channels with data table
 */

import { useState } from "react";
import { useChannels, useDeleteChannel } from "@/lib/hooks";
import { ChannelsDataTable } from "./channels-data-table";
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

export function ChannelsPageContent() {
  const { data, isPending, error } = useChannels();
  const deleteChannel = useDeleteChannel();
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const handleDelete = (id: number) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = () => {
    if (deleteTargetId === null) return;
    deleteChannel.mutate(deleteTargetId, {
      onSuccess: () => {
        toast.success("Channel removed successfully");
        setDeleteTargetId(null);
      },
      onError: () => {
        toast.error("Failed to remove channel");
        setDeleteTargetId(null);
      },
    });
  };

  const handleViewDetails = (id: number) => {
    // TODO: Navigate to channel details or open modal
    toast.info(`View details for channel ${id}`);
  };

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-destructive font-medium">Failed to load channels</p>
          <p className="text-muted-foreground mt-1 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ChannelsDataTable
        data={data?.data ?? []}
        isPending={isPending}
        onDelete={handleDelete}
        onViewDetails={handleViewDetails}
      />
      <AlertDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open && !deleteChannel.isPending) setDeleteTargetId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove channel</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The channel will be permanently
              removed from the bot&apos;s management list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteChannel.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleteChannel.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteChannel.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
