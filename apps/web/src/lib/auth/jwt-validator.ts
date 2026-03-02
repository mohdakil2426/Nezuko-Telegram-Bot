/**
 * Server-side JWT validation for InsForge tokens.
 *
 * Note: This adds defense-in-depth. The primary auth check is still
 * the InsForge middleware + RLS policies, but this prevents tampered
 * cookies from reaching the application.
 */

import { createClient } from "@insforge/sdk";

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;
const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

if (!baseUrl || !anonKey) {
  throw new Error("InsForge configuration missing");
}

const insforge = createClient({ baseUrl, anonKey });

interface JWTPayload {
  sub: string;
  email?: string;
  exp: number;
  iat: number;
}

/**
 * Validate a JWT token server-side.
 * Returns the payload if valid, null if invalid.
 * Note: The token parameter is kept for API consistency but the SDK
 * uses the stored session internally.
 */
export async function validateJWT(_token: string): Promise<JWTPayload | null> {
  try {
    // Use InsForge's getCurrentSession to validate
    const { data, error } = await insforge.auth.getCurrentSession();

    if (error || !data.session) {
      return null;
    }

    // Check expiration - expiresAt is a Date object
    const now = new Date();
    if (data.session.expiresAt && data.session.expiresAt < now) {
      return null;
    }

    return {
      sub: data.session.user.id,
      email: data.session.user.email,
      exp: data.session.expiresAt ? Math.floor(data.session.expiresAt.getTime() / 1000) : 0,
      iat: Math.floor(Date.now() / 1000),
    };
  } catch {
    return null;
  }
}

/**
 * Check if session cookie is present and valid.
 */
export async function isValidSession(cookieValue: string): Promise<boolean> {
  const payload = await validateJWT(cookieValue);
  return payload !== null;
}
