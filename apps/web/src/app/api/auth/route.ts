/**
 * InsForge auth API route handler.
 *
 * Syncs auth tokens to HTTP-only cookies for server-side middleware.
 * Required for SSR authentication — do not remove.
 *
 * Explicitly force-dynamic: auth routes always read session state per-request
 * and MUST NOT be cached or statically optimised by Next.js or Vercel's CDN.
 */
import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createAuthRouteHandlers } from "@insforge/nextjs/api";

import { isAllowedDashboardEmail } from "@/lib/auth/server";

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;
const serviceKey = process.env.INSFORGE_SERVICE_KEY;
if (!baseUrl) {
  throw new Error(
    "NEXT_PUBLIC_INSFORGE_BASE_URL is not set. " +
      "Copy apps/web/.env.example to apps/web/.env.local and fill in your InsForge project URL."
  );
}

const handlers = createAuthRouteHandlers({ baseUrl });

type SessionUser = {
  id?: string | null;
  email?: string | null;
};

async function getSessionUserForToken(token: string): Promise<SessionUser | null> {
  const response = await fetch(`${baseUrl}/api/auth/sessions/current`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { user?: SessionUser };
  return data.user ?? null;
}

async function upsertDashboardAdmin(user: SessionUser): Promise<void> {
  if (!serviceKey) {
    throw new Error("INSFORGE_SERVICE_KEY is required for dashboard admin sync.");
  }

  if (!user.id || !user.email) {
    throw new Error("Authenticated user payload is incomplete.");
  }

  const response = await fetch(`${baseUrl}/api/database/records/dashboard_admins`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify([
      {
        auth_user_id: user.id,
        email: user.email.toLowerCase(),
      },
    ]),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to sync dashboard admin record.");
  }
}

async function getAllowedSyncUser(req: NextRequest): Promise<SessionUser | null> {
  const body = (await req
    .clone()
    .json()
    .catch(() => null)) as { action?: string; user?: SessionUser } | null;

  if (body?.action !== "sync-token") {
    return null;
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return null;
  }

  const sessionUser = await getSessionUserForToken(token);
  const resolvedUser = sessionUser ?? body?.user ?? null;
  const email = resolvedUser?.email ?? null;

  if (!isAllowedDashboardEmail(email)) {
    return null;
  }
 
  return resolvedUser;
}

export const POST = async (req: NextRequest) => {
  try {
    const allowedUser = await getAllowedSyncUser(req);
    const body = (await req
      .clone()
      .json()
      .catch(() => null)) as { action?: string } | null;

    if (body?.action === "sync-token" && !allowedUser) {
      return NextResponse.json({ error: "Unauthorized owner account" }, { status: 403 });
    }

    if (allowedUser) {
      await upsertDashboardAdmin(allowedUser);
    }

    const response = await handlers.POST(req);
    response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    return response;
  } catch (err: any) {
    console.error("[AUTH_API_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to finalize authentication session" },
      { status: 500 }
    );
  }
};

export const GET = async (req: NextRequest) => {
  const response = await handlers.GET(req);
  // Auth routes must never be cached by CDN or browser
  response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  return response;
};

export const DELETE = handlers.DELETE;
