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

import { AUTH_CALLBACK_PATH, DEFAULT_AUTH_REDIRECT } from "@/lib/auth/shared";
import { insforge } from "@/lib/insforge";

interface InsforgeProviderProps {
  children: React.ReactNode;
  initialState?: InitialAuthState;
}

export function InsforgeProvider({ children, initialState }: InsforgeProviderProps) {
  return (
    <InsforgeBrowserProvider
      client={insforge}
      afterSignInUrl={`${AUTH_CALLBACK_PATH}?redirect=${DEFAULT_AUTH_REDIRECT}`}
      initialState={initialState}
    >
      {children}
    </InsforgeBrowserProvider>
  );
}
