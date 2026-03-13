import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@insforge/nextjs/server";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { ErrorBoundary } from "@/components/error-boundary";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DEV_LOGIN } from "@/lib/api/config";

function SiteHeaderFallback() {
  return <div className="h-16 shrink-0" aria-hidden="true" />;
}

/**
 * Dashboard Layout — Server Component
 *
 * Defense-in-depth auth guard (2 server-side layers):
 *   1. Primary:   InsforgeMiddleware in proxy.ts (runs on every request, edge-layer).
 *                 With useBuiltInAuth=true, unauthenticated users are redirected to
 *                 InsForge's hosted sign-in page automatically.
 *   2. Secondary: auth() server guard here (catches expired cookies / edge cases).
 *
 * Both guards skip auth when NEXT_PUBLIC_DEV_LOGIN=true (dev bypass).
 *
 * ⚠️ DO NOT add a client-side AuthGuard here. useAuth() returns isSignedIn=false
 *    during InsForge's token exchange (POST /api/auth after redirect), which creates
 *    an infinite redirect loop: dashboard → login → InsForge auth → dashboard → ...
 *
 * ⚠️ Changing NEXT_PUBLIC_DEV_LOGIN requires:
 *   1. Full server restart (Ctrl+C + bun dev)
 *   2. Browser hard-reload (Ctrl+Shift+R) to clear cached JS bundle
 *   3. Clear cookies if switching dev→prod: DevTools → Application → Cookies → Clear
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Read env at request time — Server Component layouts re-execute per request,
  // so process.env.NEXT_PUBLIC_DEV_LOGIN is always current after a server restart.
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get("sidebar_state")?.value;
  const defaultSidebarOpen = sidebarState === undefined ? true : sidebarState === "true";

  // Server-side auth guard — defense-in-depth (skipped in dev mode).
  // auth() reads insforge-session + insforge-user cookies (no server-side JWT validation).
  // We check BOTH token and userId so a partial/stale cookie state also redirects.
  if (!DEV_LOGIN) {
    const { userId, token } = await auth();
    if (!userId || !token) {
      redirect("/login");
    }
  }

  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <AppSidebar />
      <SidebarInset>
        <Suspense fallback={<SiteHeaderFallback />}>
          <SiteHeader />
        </Suspense>
        <main id="main-content" className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
