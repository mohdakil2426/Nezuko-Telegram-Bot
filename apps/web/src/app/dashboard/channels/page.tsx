/**
 * Channels Page
 * Displays enforced channels with TanStack table
 */

import { ChannelsPageContent } from "@/components/channels";

export default function ChannelsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Enforced Channels</h1>
        <p className="text-muted-foreground">
          Manage channels that enforce membership verification.
        </p>
      </div>

      <ChannelsPageContent />
    </div>
  );
}
