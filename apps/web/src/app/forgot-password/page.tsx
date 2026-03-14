"use client";

/**
 * Forgot Password Page
 *
 * Step 1 of 2 in the code-based password reset flow
 * (backend resetPasswordMethod: "code").
 *
 * Flow:
 *   1. User enters email → sends reset code via insforge.auth.sendResetPasswordEmail()
 *   2. Backend sends 6-digit code to that email
 *   3. User is redirected to /reset-password?email=...
 */

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, ArrowLeft, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";

import { insforge } from "@/lib/insforge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});
type FormData = z.infer<typeof schema>;

function ForgotPasswordForm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }: FormData) => {
    setIsPending(true);
    const result = await insforge.auth
      .sendResetPasswordEmail({
        email,
      })
      .catch(() => null);

    if (!result) {
      toast.error("An unexpected error occurred. Please try again.");
      setIsPending(false);
      return;
    }

    const { data, error } = result;

    if (error) {
      toast.error(error.message ?? "Failed to send reset email.");
      setIsPending(false);
      return;
    }

    if (data?.success) {
      toast.success("Check your email for the 6-digit reset code.");
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
      return;
    }

    setIsPending(false);
  };

  return (
    <Card className="bg-card/80 w-full border-0 shadow-xl backdrop-blur-sm">
      <CardHeader className="pb-2 text-center">
        <div className="bg-primary text-primary-foreground mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full shadow-lg">
          <KeyRound className="h-8 w-8" />
        </div>

        <CardTitle className="text-foreground text-2xl font-bold">Forgot Password</CardTitle>

        <CardDescription className="text-muted-foreground">
          Enter your email and we&apos;ll send a reset code.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="you@example.com"
                aria-describedby={errors.email ? "email-error" : undefined}
                className={`pl-9 ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p id="email-error" className="text-destructive text-xs italic">
                {errors.email.message}
              </p>
            )}
          </div>

          <Button id="send-reset-btn" type="submit" className="w-full gap-2" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {isPending ? "Sending…" : "Send Reset Code"}
          </Button>
        </CardContent>
      </form>

      <CardFooter className="justify-center border-t pt-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login" className="gap-2" prefetch={false}>
            <ArrowLeft className="h-3 w-3" />
            Back to login
          </Link>
        </Button>
      </CardFooter>
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

export default function ForgotPasswordPage() {
  return (
    <main className="bg-muted flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<Fallback />}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
