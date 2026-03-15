import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_MAX_AGE_SECONDS } from "./shared";

interface AuthUserCookie {
  id: string;
  email: string;
  profile: Record<string, unknown> | null;
}

export interface ValidatedAuthSession {
  accessToken: string;
  user: {
    id: string;
    email: string;
    profile?: Record<string, unknown> | null;
  };
}

function getAllowedDashboardEmails(): string[] {
  return (process.env.INSFORGE_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedDashboardEmail(email?: string | null): boolean {
  const allowedEmails = getAllowedDashboardEmails();

  if (allowedEmails.length === 0) {
    return process.env.NODE_ENV !== "production";
  }

  if (!email) {
    return false;
  }

  return allowedEmails.includes(email.toLowerCase());
}

function shouldUseSecureCookies(request: NextRequest): boolean {
  return request.nextUrl.protocol === "https:";
}

export function setAuthCookies(
  response: NextResponse,
  request: NextRequest,
  session: ValidatedAuthSession
): NextResponse {
  const secure = shouldUseSecureCookies(request);
  const serializedUser: AuthUserCookie = {
    id: session.user.id,
    email: session.user.email,
    profile: session.user.profile ?? null,
  };

  response.cookies.set("insforge-session", session.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });

  response.cookies.set("insforge-user", JSON.stringify(serializedUser), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}

export function clearAuthCookies(response: NextResponse, request: NextRequest): NextResponse {
  const secure = shouldUseSecureCookies(request);

  response.cookies.set("insforge-session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("insforge-user", "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });

  return response;
}
