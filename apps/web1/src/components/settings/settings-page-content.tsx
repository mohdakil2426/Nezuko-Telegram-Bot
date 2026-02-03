"use client";

/**
 * Settings Page Content
 * Client component that displays settings cards
 */

import { AppearanceCard } from "./appearance-card";
import { AccountInfoCard } from "./account-info-card";

export function SettingsPageContent() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <AppearanceCard />
      <AccountInfoCard />
    </div>
  );
}
