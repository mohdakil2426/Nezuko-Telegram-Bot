/**
 * Settings Page
 * Theme and preferences management
 */

import { SettingsPageContent } from "@/components/settings";
import { getMasterKey } from "@/lib/actions/vault";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const masterKey = await getMasterKey();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Settings</h1>
        <p className="text-muted-foreground">Manage your dashboard and platform security</p>
      </div>

      <SettingsPageContent masterKey={masterKey} />
    </div>
  );
}
