"use client";

/**
 * Email Verification Page
 *
 * Required because backend has `requireEmailVerification: true` and
 * `verifyEmailMethod: "code"` — user receives a 6-digit OTP after sign-up
 * and must enter it here to complete registration.
 *
 * Flow:
 *   1. User signs up → backend sends 6-digit code to email
 *   2. User is redirected here (email in query param)
 *   3. User enters code → insforge.auth.verifyEmail({ email, otp }) → session
 *   4. InsforgeBrowserProvider picks up session → afterSignInUrl="/dashboard"
 */

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Mail, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { insforge } from "@/lib/insforge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

// ── Inner form that reads searchParams ─────────────────────────────────────
function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) return;

    setIsPending(true);
    try {
      const { data, error } = await insforge.auth.verifyEmail({ email, otp });

      if (error) {
        toast.error(error.message ?? "Verification failed. Please try again.");
        return;
      }

      if (data?.accessToken) {
        toast.success("Email verified! Redirecting to dashboard…");
        // InsforgeBrowserProvider picks up the new session automatically.
        // Push to /api/auth to sync the cookie, then to dashboard.
        router.push("/dashboard");
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const { data, error } = await insforge.auth.resendVerificationEmail({
        email,
      });

      if (error) {
        toast.error(error.message ?? "Failed to resend verification email.");
        return;
      }

      if (data?.success) {
        toast.success("Verification code resent! Check your inbox.");
        setOtp("");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="bg-card/80 w-full border-0 shadow-xl backdrop-blur-sm">
      <CardHeader className="pb-2 text-center">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-pink-500 to-violet-500 shadow-lg shadow-pink-500/25">
          <Mail className="h-8 w-8 text-white" />
        </div>

        <CardTitle className="bg-linear-to-r from-pink-500 to-violet-500 bg-clip-text text-2xl font-bold text-transparent">
          Check Your Email
        </CardTitle>

        <CardDescription className="text-muted-foreground">
          We sent a 6-digit code to <span className="font-medium">{email || "your email"}</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* OTP Input */}
        <div className="flex flex-col items-center gap-4">
          <div role="group" aria-label="6-digit verification code">
            <InputOTP maxLength={6} value={otp} onChange={setOtp} onComplete={handleVerify}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <p className="text-muted-foreground text-center text-xs">
            Enter the 6-digit code from your email. It expires in 10 minutes.
          </p>
        </div>

        {/* Verify Button */}
        <Button
          id="verify-email-btn"
          className="w-full gap-2 bg-linear-to-r from-pink-500 to-violet-500 text-white hover:from-pink-600 hover:to-violet-600"
          onClick={handleVerify}
          disabled={otp.length !== 6 || isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          {isPending ? "Verifying…" : "Verify Email"}
        </Button>
      </CardContent>

      <CardFooter className="flex flex-col gap-2 border-t pt-4">
        <p className="text-muted-foreground text-center text-xs">Didn&apos;t receive the code?</p>
        <Button
          id="resend-code-btn"
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={handleResend}
          disabled={isResending}
        >
          {isResending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          {isResending ? "Sending…" : "Resend Code"}
        </Button>
      </CardFooter>
    </Card>
  );
}

// ── Page wrapper with Suspense (required for useSearchParams) ──────────────
function VerifyEmailFallback() {
  return (
    <Card className="bg-card/80 w-full border-0 shadow-xl backdrop-blur-sm">
      <CardContent className="flex items-center justify-center py-16">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <span className="sr-only" role="status">
          Loading...
        </span>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="bg-muted flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<VerifyEmailFallback />}>
          <VerifyEmailForm />
        </Suspense>
      </div>
    </main>
  );
}
