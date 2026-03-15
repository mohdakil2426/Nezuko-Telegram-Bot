export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const DEFAULT_AUTH_REDIRECT = "/dashboard";
export const AUTH_CALLBACK_PATH = "/auth/callback";

export type AuthErrorCode = "invalid_auth" | "unauthorized_owner";

export function sanitizeRedirect(rawRedirect?: string | null): string {
  if (!rawRedirect) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
    ? rawRedirect
    : DEFAULT_AUTH_REDIRECT;
}

export function buildLoginUrl(
  redirectTo: string = DEFAULT_AUTH_REDIRECT,
  error?: AuthErrorCode
): string {
  const params = new URLSearchParams({
    redirect: sanitizeRedirect(redirectTo),
  });

  if (error) {
    params.set("error", error);
  }

  return `/login?${params.toString()}`;
}

export function buildHostedSignInUrl(baseUrl: string, origin: string, redirectTo: string): string {
  const callbackUrl = new URL(AUTH_CALLBACK_PATH, origin);
  callbackUrl.searchParams.set("redirect", sanitizeRedirect(redirectTo));

  const authUrl = new URL("/auth/sign-in", baseUrl);
  authUrl.searchParams.set("redirect", callbackUrl.toString());

  return authUrl.toString();
}

export function getLoginErrorMessage(error?: string | null): string | null {
  switch (error) {
    case "invalid_auth":
      return "Your sign-in session could not be verified. Please try again.";
    case "unauthorized_owner":
      return "This dashboard is restricted to approved owner account(s).";
    default:
      return null;
  }
}
