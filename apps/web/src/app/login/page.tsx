/**
 * Login Page
 * Public login page with centered form
 */

import { LoginForm } from "@/components/login-form";

type LoginPageProps = {
  searchParams?: Promise<{
    redirectTo?: string;
  }>;
};

function sanitizeRedirect(rawRedirect?: string): string {
  if (!rawRedirect) {
    return "/dashboard";
  }

  return rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/dashboard";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const redirectTo = sanitizeRedirect(resolvedSearchParams.redirectTo);

  return (
    <div className="bg-muted flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
