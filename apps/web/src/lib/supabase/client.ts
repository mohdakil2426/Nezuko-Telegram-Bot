/**
 * Supabase Browser Client
 * Creates a Supabase client for use in browser-side code (Client Components).
 */

import { createBrowserClient } from "@supabase/ssr";

/**
 * Create a Supabase client for use in the browser.
 * Use this in Client Components ("use client").
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
