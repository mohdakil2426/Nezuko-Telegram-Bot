"use client";

/**
 * Brand Logo Component
 * Displays Nezuko branding in sidebar header
 */

import { Bot } from "lucide-react";
import Link from "next/link";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

export function BrandLogo() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Link href="/dashboard" aria-label="Nezuko Dashboard home" prefetch={false}>
            {/* suppressHydrationWarning: Dark Reader extension injects data-darkreader-inline-stroke into SVGs */}
            <div
              suppressHydrationWarning
              className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
            >
              <Bot className="size-4" suppressHydrationWarning />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Nezuko</span>
              <span className="truncate text-xs">Bot Dashboard</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
