"use client";

/**
 * InsforgeProvider wraps the app with InsForge auth context.
 *
 * Provides `useAuth()`, `useUser()`, `SignedIn`, `SignedOut`, and
 * `UserButton` components throughout the component tree.
 *
 * afterSignInUrl: redirect to dashboard after successful sign-in.
 */
import { InsforgeBrowserProvider } from "@insforge/nextjs";

import { insforge } from "@/lib/insforge";

export function InsforgeProvider({ children }: { children: React.ReactNode }) {
  return (
    <InsforgeBrowserProvider client={insforge} afterSignInUrl="/dashboard">
      {children}
    </InsforgeBrowserProvider>
  );
}
