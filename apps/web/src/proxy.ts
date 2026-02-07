/**
 * Next.js Proxy
 * Handles session-based route protection using Telegram Login.
 * Next.js 16 uses 'proxy' convention instead of 'middleware'.
 */

import { NextResponse, type NextRequest } from "next/server";

/**
 * Session cookie name (matches API backend)
 */
const SESSION_COOKIE = "nezuko_session";

/**
 * Public routes that don't require authentication.
 */
const PUBLIC_ROUTES = ["/login"];

/**
 * Check if the path is a public route.
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if the path is a static asset or API route.
 */
function shouldSkip(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".") // Static files like favicon.ico, images, etc.
  );
}

export async function proxy(request: NextRequest) {
  // Skip proxy for static assets
  if (shouldSkip(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  const isAuthenticated = !!sessionId;

  // Check if we're in mock/dev mode (allow all routes)
  // DEV_LOGIN bypasses auth check, USE_MOCK uses mock data
  const devLogin = process.env.NEXT_PUBLIC_DEV_LOGIN === "true";
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";
  if (devLogin || useMock) {
    return NextResponse.next();
  }

  // Route protection: redirect unauthenticated users to login
  if (!isAuthenticated && !isPublicRoute(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login page
  if (isAuthenticated && request.nextUrl.pathname === "/login") {
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
     * - favicon.ico (favicon file)
     * - Public files (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
