/**
 * Settings Page
 * Theme and preferences management
 */

import { SettingsPageContent, VaultSection } from "@/components/settings";


export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Settings</h1>
        <p className="text-muted-foreground">Manage your dashboard and platform security</p>
      </div>

      <SettingsPageContent>
        <VaultSection />
      </SettingsPageContent>
    </div>
  );
}
