/**
 * Next.js Proxy (Route Protection) — proxy.ts
 *
 * Next.js 16 uses proxy.ts (replaces middleware.ts).
 *
 * How InsforgeMiddleware works (from source):
 *   1. Checks for access_token in URL params → stores in insforge-session cookie
 *   2. If route is in publicRoutes → allows through
 *   3. If no insforge-session cookie → redirects to InsForge hosted sign-in
 *   4. If cookie exists → allows through (no server-side JWT validation)
 *
 * Dev bypass (NEXT_PUBLIC_DEV_LOGIN=true):
 *   All routes pass through without any auth check.
 *   ⚠️ REQUIRES SERVER RESTART after toggling this env var.
 *   ⚠️ Also clear browser cookies after switching prod→dev or dev→prod.
 */

import { InsforgeMiddleware } from "@insforge/nextjs/middleware";
import { NextResponse, type NextRequest } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;
if (!BASE_URL) {
  throw new Error("NEXT_PUBLIC_INSFORGE_BASE_URL environment variable is required");
}

// InsforgeMiddleware is created once — the returned function handles each request.
const insforgeMiddleware = InsforgeMiddleware({
  baseUrl: BASE_URL,

  // Match our app's custom route names to local pages.
  // Built-in auth redirect handling is disabled below so /login stays a real page.
  signInUrl: "/login",
  signUpUrl: "/sign-up",
  forgotPasswordUrl: "/forgot-password",
  afterSignInUrl: "/dashboard",

  // We use a local /login page with SignInButton.
  // Let protected routes redirect there first instead of short-circuiting to hosted auth.
  useBuiltInAuth: false,

  // Public routes — always accessible without authentication.
  // Note: /login is listed so the middleware itself doesn't redirect on that route.
  publicRoutes: ["/", "/login", "/sign-up", "/verify-email", "/forgot-password", "/reset-password"],
});

export async function proxy(request: NextRequest) {
  // Read env at request time (not module level) so changes take effect after restart.
  const devLogin = process.env.NEXT_PUBLIC_DEV_LOGIN === "true";
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";

  if ((devLogin || useMock) && process.env.NODE_ENV !== "production") {
    // Dev/mock mode: skip all auth checks (never in production).
    return NextResponse.next();
  }

  // Primary: InsForge middleware check
  const middlewareResponse = await insforgeMiddleware(request);

  // If middleware redirects, respect it
  if (middlewareResponse.status === 307 || middlewareResponse.status === 302) {
    return middlewareResponse;
  }

  return middlewareResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static / _next/image (Next.js static assets)
     * - favicon + image files
     * - /api/* — /api/auth must stay public for the InsForge cookie sync
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
