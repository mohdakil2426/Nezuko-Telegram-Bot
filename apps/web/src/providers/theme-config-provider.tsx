"use client";

import { type ReactNode } from "react";
import { ThemeConfigProvider as ThemeConfigContextProvider } from "@/lib/hooks/use-theme-config";

interface ThemeConfigProviderProps {
  children: ReactNode;
}

/**
 * Theme configuration provider wrapper for the dashboard.
 * Provides accent color themes, effect toggles, and particle settings.
 * 
 * This wrapper exists to:
 * 1. Ensure 'use client' directive is applied
 * 2. Handle any SSR considerations
 * 3. Allow future composition with other providers
 */
export function ThemeConfigProvider({ children }: ThemeConfigProviderProps) {
  return (
    <ThemeConfigContextProvider>
      {children}
    </ThemeConfigContextProvider>
  );
}
