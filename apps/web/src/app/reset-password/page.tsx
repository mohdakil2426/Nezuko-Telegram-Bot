/**
 * Reset Password Page
 *
 * Step 2 of 2 in the code-based password reset flow
 * (backend resetPasswordMethod: "code").
 */

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    email?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const email = resolvedSearchParams.email ?? "";

  return (
    <main className="bg-muted flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <ResetPasswordForm email={email} />
      </div>
    </main>
  );
}
