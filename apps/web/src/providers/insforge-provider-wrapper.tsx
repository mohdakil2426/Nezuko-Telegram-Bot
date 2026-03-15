import { InsforgeProvider } from "./insforge-provider";
import { auth } from "@insforge/nextjs/server";
import { DEV_LOGIN } from "@/lib/api/config";

interface InsforgeProviderWrapperProps {
  children: React.ReactNode;
}

/**
 * Server component wrapper for InsforgeProvider.
 *
 * Reads the auth session from the `insforge-session` cookie server-side and
 * passes it as `initialState` to the client provider. This prevents the SDK
 * from firing `POST /api/auth/refresh` on mount — which triggers a CSRF
 * validation error (403) on the InsForge backend when no valid CSRF cookie
 * exists on the Vercel domain after an OAuth redirect.
 */
export async function InsforgeProviderWrapper({ children }: InsforgeProviderWrapperProps) {
  if (DEV_LOGIN) {
    return <>{children}</>;
  }

  // Read session server-side — gives InsforgeProvider the initial auth state
  // so the client skips the CSRF-triggering refresh call on boot.
  const session = await auth();

  const initialState = {
    user: session.user ?? null,
    userId: session.userId ?? null,
  };

  return <InsforgeProvider initialState={initialState}>{children}</InsforgeProvider>;
}
