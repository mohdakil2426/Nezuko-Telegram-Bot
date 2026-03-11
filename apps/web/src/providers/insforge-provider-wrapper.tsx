import { getAuthFromCookies } from "@insforge/nextjs/server";
import { InsforgeProvider } from "./insforge-provider";

interface InsforgeProviderWrapperProps {
  children: React.ReactNode;
}

/**
 * Server Component that fetches auth state and wraps children with InsforgeProvider.
 * This is meant to be wrapped in Suspense in the Root Layout to enable PPR.
 */
export async function InsforgeProviderWrapper({ children }: InsforgeProviderWrapperProps) {
  // Accessing cookies/runtime data here is safe as long as this component is suspended.
  const initialState = await getAuthFromCookies();

  return <InsforgeProvider initialState={initialState}>{children}</InsforgeProvider>;
}
