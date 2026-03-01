/**
 * InsForge auth API route handler.
 *
 * Syncs auth tokens to HTTP-only cookies for server-side middleware.
 * Required for SSR authentication — do not remove.
 */
import { createAuthRouteHandlers } from "@insforge/nextjs/api";

const handlers = createAuthRouteHandlers({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL || "https://u4ckbciy.us-west.insforge.app",
});

export const POST = handlers.POST;
export const GET = handlers.GET;
export const DELETE = handlers.DELETE;
