"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuthStore } from "@/stores/auth-store";
import { Toaster } from "@/components/ui/toaster";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, router]);

    if (!mounted) {
        return null; // Avoid hydration mismatch
    }

    if (!isAuthenticated) {
        return null; // Should redirect
    }

    return (
        <div className="flex h-screen bg-background">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto bg-background p-6">
                    {children}
                </main>
            </div>
            <Toaster />
        </div>
    );
}
