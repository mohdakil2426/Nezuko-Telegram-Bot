"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mail, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { insforge } from "@/lib/insforge";
import { syncSessionToAuthCookie } from "@/lib/auth/client";
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

interface VerifyEmailFormProps {
  email: string;
  redirectTo?: string;
}

export function VerifyEmailForm({ email, redirectTo = "/dashboard" }: VerifyEmailFormProps) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) return;

    setIsPending(true);
    const result = await insforge.auth.verifyEmail({ email, otp }).catch(() => null);

    if (!result) {
      toast.error("An unexpected error occurred. Please try again.");
      setIsPending(false);
      return;
    }

    const { data, error } = result;

    if (error) {
      toast.error(error.message ?? "Verification failed. Please try again.");
      setIsPending(false);
      return;
    }

    if (data?.accessToken) {
      await syncSessionToAuthCookie(data.accessToken, data.user);
      toast.success("Email verified! Redirecting to dashboard…");
      router.push(redirectTo);
      return;
    }

    setIsPending(false);
  };

  const handleResend = async () => {
    setIsResending(true);
    const result = await insforge.auth.resendVerificationEmail({ email }).catch(() => null);

    if (!result) {
      toast.error("An unexpected error occurred.");
      setIsResending(false);
      return;
    }

    const { data, error } = result;

    if (error) {
      toast.error(error.message ?? "Failed to resend verification email.");
      setIsResending(false);
      return;
    }

    if (data?.success) {
      toast.success("Verification code resent! Check your inbox.");
      setOtp("");
    }
    setIsResending(false);
  };

  return (
    <Card className="bg-card/80 w-full border-0 shadow-xl backdrop-blur-sm">
      <CardHeader className="pb-2 text-center">
        <div className="bg-primary text-primary-foreground mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full shadow-lg">
          <Mail className="h-8 w-8" />
        </div>

        <CardTitle className="text-foreground text-2xl font-bold">Check Your Email</CardTitle>

        <CardDescription className="text-muted-foreground">
          We sent a 6-digit code to <span className="font-medium">{email || "your email"}</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
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

        <Button
          id="verify-email-btn"
          className="w-full gap-2"
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
