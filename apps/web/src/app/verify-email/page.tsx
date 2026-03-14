/**
 * Email Verification Page
 *
 * Required because backend has `requireEmailVerification: true` and
 * `verifyEmailMethod: "code"` — user receives a 6-digit OTP after sign-up
 * and must enter it here to complete registration.
 */

import { VerifyEmailForm } from "@/components/auth/verify-email-form";

type VerifyEmailPageProps = {
  searchParams?: Promise<{
    email?: string;
  }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const email = resolvedSearchParams.email ?? "";

  return (
    <main className="bg-muted flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <VerifyEmailForm email={email} />
      </div>
    </main>
  );
}
