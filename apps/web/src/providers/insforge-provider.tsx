"use client";

/**
 * InsforgeProvider wraps the app with InsForge auth context.
 *
 * Provides `useAuth()`, `useUser()`, `SignedIn`, `SignedOut`, and
 * `UserButton` components throughout the component tree.
 *
 * afterSignInUrl: redirect to dashboard after successful sign-in.
 */
import { InsforgeBrowserProvider, type InitialAuthState } from "@insforge/nextjs";

import { insforge } from "@/lib/insforge";

interface InsforgeProviderProps {
  children: React.ReactNode;
  initialState?: InitialAuthState;
}

export function InsforgeProvider({ children, initialState }: InsforgeProviderProps) {
  return (
    <InsforgeBrowserProvider
      client={insforge}
      afterSignInUrl="/dashboard"
      initialState={initialState}
    >
      {children}
    </InsforgeBrowserProvider>
  );
}
