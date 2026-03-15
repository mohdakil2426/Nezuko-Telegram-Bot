/**
 * Login Page
 * Public login page with centered form
 */

import { auth } from "@insforge/nextjs/server";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { isAllowedDashboardEmail } from "@/lib/auth/server";
import { DEFAULT_AUTH_REDIRECT, getLoginErrorMessage, sanitizeRedirect } from "@/lib/auth/shared";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    redirect?: string;
    redirectTo?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const redirectTo = sanitizeRedirect(
    resolvedSearchParams.redirect ?? resolvedSearchParams.redirectTo
  );
  const errorMessage = getLoginErrorMessage(resolvedSearchParams.error);
  const session = await auth();

  if (session.userId && session.token && isAllowedDashboardEmail(session.user?.email)) {
    redirect(redirectTo || DEFAULT_AUTH_REDIRECT);
  }

  return (
    <div className="bg-muted flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm redirectTo={redirectTo} errorMessage={errorMessage} />
      </div>
    </div>
  );
}
