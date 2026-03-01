"use client";

/**
 * Reset Password Page
 *
 * Step 2 of 2 in the code-based password reset flow
 * (backend resetPasswordMethod: "code").
 *
 * Flow:
 *   1. User arrives here after /forgot-password with ?email=...
 *   2. Enters 6-digit code from email → exchangeResetPasswordToken() → reset token
 *   3. Enters new password → resetPassword(otp: resetToken, newPassword) → done
 *   4. Redirect to /login
 */

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { insforge } from "@/lib/insforge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const schema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

/** Step labels for progress indicator */
const STEPS = ["Enter Code", "New Password"] as const;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  // Step 1: OTP code entry → get reset token
  // Step 2: New password entry → call resetPassword
  const [step, setStep] = useState<1 | 2>(1);
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // ── Step 1: Exchange OTP code → reset token ─────────────────────────────
  const handleExchangeCode = async () => {
    if (otp.length !== 6) return;

    setIsPending(true);
    try {
      const { data, error } = await insforge.auth.exchangeResetPasswordToken({
        email,
        code: otp,
      });

      if (error) {
        toast.error(error.message ?? "Invalid or expired code.");
        return;
      }

      if (data?.token) {
        setResetToken(data.token);
        setStep(2);
        toast.success("Code verified! Now set your new password.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsPending(false);
    }
  };

  // ── Step 2: Set new password ────────────────────────────────────────────
  const onSubmitPassword = async ({ newPassword }: FormData) => {
    setIsPending(true);
    try {
      const { data, error } = await insforge.auth.resetPassword({
        newPassword,
        otp: resetToken,
      });

      if (error) {
        toast.error(error.message ?? "Failed to reset password.");
        return;
      }

      if (data) {
        toast.success("Password reset successfully! Please sign in.");
        router.push("/login");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="bg-card/80 w-full border-0 shadow-xl backdrop-blur-sm">
      <CardHeader className="pb-2 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-pink-500 to-violet-500 shadow-lg shadow-pink-500/25">
          <KeyRound className="h-8 w-8 text-white" />
        </div>

        <CardTitle className="bg-linear-to-r from-pink-500 to-violet-500 bg-clip-text text-2xl font-bold text-transparent">
          Reset Password
        </CardTitle>

        {/* Step indicator */}
        <div className="mt-2 flex items-center justify-center gap-2">
          {STEPS.map((label, idx) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  step > idx + 1
                    ? "bg-green-500 text-white"
                    : step === idx + 1
                      ? "bg-linear-to-r from-pink-500 to-violet-500 text-white"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {step > idx + 1 ? "✓" : idx + 1}
              </div>
              <span
                className={`text-xs ${step === idx + 1 ? "text-foreground font-medium" : "text-muted-foreground"}`}
              >
                {label}
              </span>
              {idx < STEPS.length - 1 && <div className="bg-border h-px w-4" />}
            </div>
          ))}
        </div>

        <CardDescription className="text-muted-foreground mt-1">
          {step === 1
            ? `Enter the 6-digit code sent to ${email || "your email"}`
            : "Choose a strong new password"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── Step 1: OTP ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="flex flex-col items-center gap-4">
            <InputOTP maxLength={6} value={otp} onChange={setOtp} onComplete={handleExchangeCode}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>

            <Button
              id="verify-reset-code-btn"
              className="w-full gap-2 bg-linear-to-r from-pink-500 to-violet-500 text-white hover:from-pink-600 hover:to-violet-600"
              onClick={handleExchangeCode}
              disabled={otp.length !== 6 || isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {isPending ? "Verifying…" : "Verify Code"}
            </Button>
          </div>
        )}

        {/* ── Step 2: New password ─────────────────────────────────────── */}
        {step === 2 && (
          <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className={`pr-10 ${errors.newPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  {...register("newPassword")}
                />
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground absolute top-2.5 right-3 cursor-pointer transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-destructive text-xs italic">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repeat password"
                className={
                  errors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""
                }
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-destructive text-xs italic">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              id="reset-password-btn"
              type="submit"
              className="w-full gap-2 bg-linear-to-r from-pink-500 to-violet-500 text-white hover:from-pink-600 hover:to-violet-600"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {isPending ? "Resetting…" : "Reset Password"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function Fallback() {
  return (
    <Card className="bg-card/80 w-full border-0 shadow-xl">
      <CardContent className="flex items-center justify-center py-16">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="bg-muted flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<Fallback />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
