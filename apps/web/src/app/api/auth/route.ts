/**
 * InsForge auth API route handler.
 *
 * Syncs auth tokens to HTTP-only cookies for server-side middleware.
 * Required for SSR authentication — do not remove.
 *
 * Explicitly force-dynamic: auth routes always read session state per-request
 * and MUST NOT be cached or statically optimised by Next.js or Vercel's CDN.
 */
import { createAuthRouteHandlers } from "@insforge/nextjs/api";

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;
if (!baseUrl) {
  throw new Error(
    "NEXT_PUBLIC_INSFORGE_BASE_URL is not set. " +
      "Copy apps/web/.env.example to apps/web/.env.local and fill in your InsForge project URL."
  );
}

const handlers = createAuthRouteHandlers({ baseUrl });

export const POST = handlers.POST;

export const GET = async (req: Request) => {
  const response = await handlers.GET(req);
  // Auth routes must never be cached by CDN or browser
  response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  return response;
};

export const DELETE = handlers.DELETE;
