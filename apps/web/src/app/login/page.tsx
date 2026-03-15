/**
 * Login Page
 * Public login page with centered form
 */

import { LoginForm } from "@/components/login-form";
import { getLoginErrorMessage, sanitizeRedirect } from "@/lib/auth/shared";

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

  return (
    <div className="bg-muted flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm redirectTo={redirectTo} errorMessage={errorMessage} />
      </div>
    </div>
  );
}
