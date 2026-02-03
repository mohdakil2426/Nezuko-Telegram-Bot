"use client";

/**
 * Channels Page Content
 * Client component that fetches and displays channels with data table
 */

import { useChannels, useDeleteChannel } from "@/lib/hooks";
import { ChannelsDataTable } from "./channels-data-table";
import { toast } from "sonner";

export function ChannelsPageContent() {
  const { data, isPending, error } = useChannels();
  const deleteChannel = useDeleteChannel();

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to remove this channel?")) {
      return;
    }

    deleteChannel.mutate(id, {
      onSuccess: () => {
        toast.success("Channel removed successfully");
      },
      onError: () => {
        toast.error("Failed to remove channel");
      },
    });
  };

  const handleViewDetails = (id: number) => {
    // TODO: Navigate to channel details or open modal
    toast.info(`View details for channel ${id}`);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive font-medium">Failed to load channels</p>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <ChannelsDataTable
      data={data?.data ?? []}
      isLoading={isPending}
      onDelete={handleDelete}
      onViewDetails={handleViewDetails}
    />
  );
}
