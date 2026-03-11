"use client";

/**
 * Auth Hook — powered by @insforge/nextjs
 *
 * Re-exports `useAuth` and `useUser` from the InsForge Next.js SDK.
 * Components across the dashboard use this hook to access auth state.
 *
 * Usage:
 *   const { isSignedIn, isLoaded } = useAuth();
 *   const { user } = useUser();
 *
 * Note: Previously a stub returning a hardcoded dev user.
 * Now uses real authentication via InsForge hosted auth.
 */

export { useAuth } from "@insforge/nextjs";
