import { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";

export const metadata: Metadata = {
    title: "Login - Nezuko Admin",
    description: "Login to Nezuko Admin Panel",
};

export default function LoginPage() {
    return (
        <div className="flex flex-col space-y-6">
            <div className="flex flex-col space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Welcome back
                </h1>
                <p className="text-sm text-muted-foreground">
                    Enter your email to sign in to your account
                </p>
            </div>
            <LoginForm />
            <p className="px-8 text-center text-sm text-muted-foreground">
                <Link
                    href="/forgot-password"
                    className="hover:text-brand underline underline-offset-4"
                >
                    Forgot your password?
                </Link>
            </p>
        </div>
    );
}
