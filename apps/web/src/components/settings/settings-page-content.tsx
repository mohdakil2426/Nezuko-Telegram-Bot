"use client";

/**
 * Settings Page Content
 * Client component that displays settings cards
 */

import { AppearanceCard } from "./appearance-card";
import { AccountInfoCard } from "./account-info-card";
import { RevealItem, PageTransition } from "@/components/page-transition";

interface SettingsPageContentProps {
  children: React.ReactNode;
}

export function SettingsPageContent({ children }: SettingsPageContentProps) {
  return (
    <PageTransition className="grid gap-6 md:grid-cols-2">
      <RevealItem className="md:col-span-2">{children}</RevealItem>
      <RevealItem>
        <AppearanceCard />
      </RevealItem>
      <RevealItem>
        <AccountInfoCard />
      </RevealItem>
    </PageTransition>
  );
}
