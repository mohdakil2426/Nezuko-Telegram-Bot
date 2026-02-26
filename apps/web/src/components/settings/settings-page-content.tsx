"use client";

/**
 * Settings Page Content
 * Client component that displays settings cards
 */

import { AppearanceCard } from "./appearance-card";
import { AccountInfoCard } from "./account-info-card";
import { BotConfigurationCard } from "./bot-configuration-card";
import { RevealItem, PageTransition } from "@/components/page-transition";

export function SettingsPageContent() {
  return (
    <PageTransition className="grid gap-6 md:grid-cols-2">
      <RevealItem>
        <BotConfigurationCard />
      </RevealItem>
      <RevealItem>
        <AppearanceCard />
      </RevealItem>
      <RevealItem className="md:col-span-2">
        <AccountInfoCard />
      </RevealItem>
    </PageTransition>
  );
}
