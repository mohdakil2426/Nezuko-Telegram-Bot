"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

const STEPS = ["Enter Code", "New Password"] as const;

interface ResetPasswordFormProps {
  email: string;
}

export function ResetPasswordForm({ email }: ResetPasswordFormProps) {
  const router = useRouter();
  const [state, setState] = useState({
    step: 1 as 1 | 2,
    otp: "",
    resetToken: "",
    showPassword: false,
    isPending: false,
  });

  const { step, otp, resetToken, showPassword, isPending } = state;

  const updateState = (updates: Partial<typeof state>) =>
    setState((prev) => ({ ...prev, ...updates }));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const handleExchangeCode = async () => {
    if (otp.length !== 6) return;

    updateState({ isPending: true });
    const result = await insforge.auth
      .exchangeResetPasswordToken({
        email,
        code: otp,
      })
      .catch(() => null);

    if (!result) {
      toast.error("An unexpected error occurred.");
      updateState({ isPending: false });
      return;
    }

    const { data, error } = result;

    if (error) {
      toast.error(error.message ?? "Invalid or expired code.");
      updateState({ isPending: false });
      return;
    }

    if (data?.token) {
      updateState({ resetToken: data.token, step: 2, isPending: false });
      toast.success("Code verified! Now set your new password.");
      return;
    }

    updateState({ isPending: false });
  };

  const onSubmitPassword = async ({ newPassword }: FormData) => {
    updateState({ isPending: true });
    const result = await insforge.auth
      .resetPassword({
        newPassword,
        otp: resetToken,
      })
      .catch(() => null);

    if (!result) {
      toast.error("An unexpected error occurred.");
      updateState({ isPending: false });
      return;
    }

    const { data, error } = result;

    if (error) {
      toast.error(error.message ?? "Failed to reset password.");
      updateState({ isPending: false });
      return;
    }

    if (data) {
      toast.success("Password reset successfully! Please sign in.");
      router.push("/login");
      return;
    }

    updateState({ isPending: false });
  };

  return (
    <Card className="bg-card/80 w-full border-0 shadow-xl backdrop-blur-sm">
      <CardHeader className="pb-2 text-center">
        <div className="bg-primary text-primary-foreground mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full shadow-lg">
          <KeyRound className="h-8 w-8" />
        </div>

        <CardTitle className="text-foreground text-2xl font-bold">Reset Password</CardTitle>

        <div className="mt-2 flex items-center justify-center gap-2">
          {STEPS.map((label, idx) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  step > idx + 1
                    ? "bg-green-500 text-white"
                    : step === idx + 1
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {step > idx + 1 ? "✓" : idx + 1}
              </div>
              <span
                className={`text-xs ${
                  step === idx + 1 ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
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
        {step === 1 && (
          <div className="flex flex-col items-center gap-4">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(v) => updateState({ otp: v })}
              onComplete={handleExchangeCode}
            >
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
              className="w-full gap-2"
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
                  className={`pr-10 ${
                    errors.newPassword ? "border-destructive focus-visible:ring-destructive" : ""
                  }`}
                  {...register("newPassword")}
                />
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute top-2.5 right-3 cursor-pointer rounded-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
                  onClick={() => updateState({ showPassword: !showPassword })}
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
              className="w-full gap-2"
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
