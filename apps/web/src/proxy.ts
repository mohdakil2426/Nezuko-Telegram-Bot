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

const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const AUTH_QUERY_PARAMS = [
  "access_token",
  "user_id",
  "email",
  "name",
  "csrf_token",
  "error",
] as const;

function serializeAuthUserCookie(userId: string, email: string, name?: string | null): string {
  return JSON.stringify({
    id: userId,
    email,
    profile: name ? { name } : null,
  });
}

function shouldUseSecureCookies(request: NextRequest): boolean {
  return request.nextUrl.protocol === "https:";
}

function getCleanRedirectUrl(request: NextRequest): URL {
  const redirectUrl = request.nextUrl.clone();
  for (const param of AUTH_QUERY_PARAMS) {
    redirectUrl.searchParams.delete(param);
  }
  return redirectUrl;
}

// InsforgeMiddleware is created once — the returned function handles each request.
const insforgeMiddleware = InsforgeMiddleware({
  baseUrl: BASE_URL,

  // Match our app's custom route names to InsForge defaults
  signInUrl: "/login", // Our login page (InsForge default: /sign-in)
  signUpUrl: "/login", // We use the same login page for both
  forgotPasswordUrl: "/forgot-password",

  // Where InsForge redirects users after successful authentication
  // MUST match InsforgeBrowserProvider afterSignInUrl in insforge-provider.tsx
  afterSignInUrl: "/dashboard",

  // useBuiltInAuth: true (default) → InsForge hosted sign-in page handles auth UI
  // When false, middleware redirects to local signInUrl instead of InsForge backend
  useBuiltInAuth: true,

  // Public routes — always accessible without authentication.
  // Note: /login is listed so the middleware itself doesn't redirect on that route.
  publicRoutes: ["/", "/login", "/verify-email", "/forgot-password", "/reset-password"],
});

export async function proxy(request: NextRequest) {
  // Read env at request time (not module level) so changes take effect after restart.
  const devLogin = process.env.NEXT_PUBLIC_DEV_LOGIN === "true";
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";

  if ((devLogin || useMock) && process.env.NODE_ENV !== "production") {
    // Dev/mock mode: skip all auth checks (never in production).
    return NextResponse.next();
  }

  const accessToken = request.nextUrl.searchParams.get("access_token");
  const userId = request.nextUrl.searchParams.get("user_id");
  const email = request.nextUrl.searchParams.get("email");
  const name = request.nextUrl.searchParams.get("name");

  if (accessToken && userId && email) {
    const response = NextResponse.redirect(getCleanRedirectUrl(request));
    const secure = shouldUseSecureCookies(request);

    response.cookies.set("insforge-session", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: AUTH_COOKIE_MAX_AGE,
    });
    response.cookies.set("insforge-user", serializeAuthUserCookie(userId, email, name), {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: AUTH_COOKIE_MAX_AGE,
    });

    return response;
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
