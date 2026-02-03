/**
 * Groups Page
 * Displays protected groups with TanStack table
 */

import { GroupsPageContent } from "@/components/groups";

export default function GroupsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Protected Groups</h1>
        <p className="text-muted-foreground">Manage your protected Telegram groups.</p>
      </div>

      <GroupsPageContent />
    </div>
  );
}
