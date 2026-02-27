/**
 * Next.js Proxy (Route Protection)
 *
 * Next.js 16 uses the 'proxy' convention instead of 'middleware'.
 * Handles route protection using InsForge session cookies set by
 * the auth API route (/api/auth).
 *
 * Public routes: '/', '/login' — all others require authentication.
 */

import { NextResponse, type NextRequest } from "next/server";

/**
 * InsForge sets this cookie via /api/auth after successful sign-in.
 * The cookie is HTTP-only and contains the user's JWT.
 */
const INSFORGE_SESSION_COOKIE = "insforge_session";

/**
 * Public routes that don't require authentication.
 */
const PUBLIC_ROUTES = ["/", "/login"];

/**
 * Check if the path is a public route (no auth required).
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

/**
 * Check if the path should be skipped entirely (static assets, API routes).
 */
function shouldSkip(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") // Static files like favicon.ico, images, etc.
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip proxy for static assets and API routes (including /api/auth)
  if (shouldSkip(pathname)) {
    return NextResponse.next();
  }

  // Dev/mock mode bypass (allows local development without auth)
  const devLogin = process.env.NEXT_PUBLIC_DEV_LOGIN === "true";
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";
  if (devLogin || useMock) {
    return NextResponse.next();
  }

  // Check for InsForge auth session cookie
  const sessionCookie =
    request.cookies.get(INSFORGE_SESSION_COOKIE) ||
    // Fallback: legacy session cookie from old Telegram Login system
    request.cookies.get("nezuko_session");
  const isAuthenticated = !!sessionCookie?.value;

  // Redirect unauthenticated users to login
  if (!isAuthenticated && !isPublicRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect already-authenticated users away from login page
  if (isAuthenticated && pathname === "/login") {
    const redirectTo = request.nextUrl.searchParams.get("redirectTo") || "/dashboard";
    const url = request.nextUrl.clone();
    url.pathname = redirectTo;
    url.searchParams.delete("redirectTo");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico and other static assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
