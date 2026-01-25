"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { authApi, loginSchema, LoginValues } from "@/lib/api/endpoints/auth";
import { useAuthStore } from "@/stores/auth-store";

export function LoginForm() {
    const router = useRouter();
    const { toast } = useToast();
    const setUser = useAuthStore((state) => state.setUser);
    const [isLoading, setIsLoading] = React.useState<boolean>(false);

    const form = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(data: LoginValues) {
        setIsLoading(true);

        try {
            await signInWithEmailAndPassword(auth, data.email, data.password);

            // Sync user with backend and update store
            const user = await authApi.sync();
            setUser(user);

            toast({
                title: "Login successful",
                description: "Welcome back!",
            });
            router.push("/");
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Login failed",
                description: error.message || "Invalid credentials",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="grid gap-6">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="name@example.com"
                                        type="email"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                        autoCorrect="off"
                                        disabled={isLoading}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="••••••••"
                                        type="password"
                                        autoCapitalize="none"
                                        autoComplete="current-password"
                                        disabled={isLoading}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button disabled={isLoading} className="w-full">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sign In
                    </Button>
                </form>
            </Form>
        </div>
    );
}
