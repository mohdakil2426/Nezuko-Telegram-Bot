import { redirect } from "next/navigation";
import { auth } from "@insforge/nextjs/server";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { ErrorBoundary } from "@/components/error-boundary";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/**
 * Dashboard Layout — Server Component
 *
 * Defense-in-depth auth guard (2 layers):
 *   1. Primary:   InsforgeMiddleware in proxy.ts (runs on every request, edge-layer).
 *   2. Secondary: auth() server guard here (catches any edge cases / expired cookies).
 *
 * Both guards skip auth when NEXT_PUBLIC_DEV_LOGIN=true (dev bypass).
 * ⚠️ Changing that env var requires a full server restart to take effect.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read env at request time — Server Component layouts re-execute per request,
  // so process.env.NEXT_PUBLIC_DEV_LOGIN is always current after a server restart.
  const devLogin = process.env.NEXT_PUBLIC_DEV_LOGIN === "true";

  // Server-side auth guard — defense-in-depth (skipped in dev mode).
  // auth() reads insforge-session + insforge-user cookies (no server-side JWT validation).
  // We check BOTH token and userId so a partial/stale cookie state also redirects.
  if (!devLogin) {
    const { userId, token } = await auth();
    if (!userId || !token) {
      redirect("/login");
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <main id="main-content" className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-x-hidden">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
