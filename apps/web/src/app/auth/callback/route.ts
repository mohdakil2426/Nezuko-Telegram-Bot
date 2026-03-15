import { NextRequest, NextResponse } from "next/server";

import { DEFAULT_AUTH_REDIRECT, sanitizeRedirect } from "@/lib/auth/shared";

export function GET(request: NextRequest) {
  const redirectTo = sanitizeRedirect(
    request.nextUrl.searchParams.get("redirect") ?? DEFAULT_AUTH_REDIRECT
  );
  const loginUrl = new URL("/login", request.nextUrl.origin);
  loginUrl.searchParams.set("redirect", redirectTo);
  return NextResponse.redirect(loginUrl);
}
