import { NextRequest, NextResponse } from "next/server";

import { buildLoginUrl, DEFAULT_AUTH_REDIRECT, sanitizeRedirect } from "@/lib/auth/shared";
import {
  clearAuthCookies,
  isAllowedDashboardEmail,
  setAuthCookies,
  type ValidatedAuthSession,
} from "@/lib/auth/server";

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;
const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
const serviceKey = process.env.INSFORGE_SERVICE_KEY;

if (!baseUrl) {
  throw new Error("NEXT_PUBLIC_INSFORGE_BASE_URL is required");
}

if (!anonKey) {
  throw new Error("NEXT_PUBLIC_INSFORGE_ANON_KEY is required");
}

async function syncDashboardAdmin(user: ValidatedAuthSession["user"]) {
  const serviceAuthKey = serviceKey;
  const publicAnonKey = anonKey;

  if (!serviceAuthKey || !publicAnonKey) {
    return;
  }

  const patchUrl = new URL("/api/database/records/dashboard_admins", baseUrl);
  patchUrl.searchParams.set("auth_user_id", `eq.${user.id}`);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${serviceAuthKey}`,
    apikey: publicAnonKey,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  const payload = {
    auth_user_id: user.id,
    email: user.email,
    updated_at: new Date().toISOString(),
  };

  const patchResponse = await fetch(patchUrl.toString(), {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!patchResponse.ok && patchResponse.status !== 204) {
    throw new Error("Failed to update dashboard_admins");
  }

  if (patchResponse.status !== 204) {
    const patchedRows = (await patchResponse.json()) as Array<{ auth_user_id: string }>;
    if (patchedRows.length > 0) {
      return;
    }
  }

  const insertResponse = await fetch(`${baseUrl}/api/database/records/dashboard_admins`, {
    method: "POST",
    headers,
    body: JSON.stringify([
      {
        ...payload,
        created_at: new Date().toISOString(),
      },
    ]),
    cache: "no-store",
  });

  if (!insertResponse.ok) {
    throw new Error("Failed to insert dashboard_admins");
  }
}

export async function GET(request: NextRequest) {
  const redirectTo = sanitizeRedirect(
    request.nextUrl.searchParams.get("redirect") ?? DEFAULT_AUTH_REDIRECT
  );
  const accessToken = request.nextUrl.searchParams.get("access_token");

  if (!accessToken) {
    return NextResponse.redirect(new URL(buildLoginUrl(redirectTo, "invalid_auth"), request.url));
  }

  try {
    const sessionResponse = await fetch(`${baseUrl}/api/auth/sessions/current`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!sessionResponse.ok) {
      return NextResponse.redirect(new URL(buildLoginUrl(redirectTo, "invalid_auth"), request.url));
    }

    const sessionData = (await sessionResponse.json()) as {
      user?: ValidatedAuthSession["user"];
    };
    const user = sessionData.user;

    if (!user?.id || !user.email) {
      return NextResponse.redirect(new URL(buildLoginUrl(redirectTo, "invalid_auth"), request.url));
    }

    if (!isAllowedDashboardEmail(user.email)) {
      const response = NextResponse.redirect(
        new URL(buildLoginUrl(DEFAULT_AUTH_REDIRECT, "unauthorized_owner"), request.url)
      );
      return clearAuthCookies(response, request);
    }

    await syncDashboardAdmin(user);

    const response = NextResponse.redirect(new URL(redirectTo, request.url));
    response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");

    return setAuthCookies(response, request, {
      accessToken,
      user,
    });
  } catch {
    return NextResponse.redirect(new URL(buildLoginUrl(redirectTo, "invalid_auth"), request.url));
  }
}
