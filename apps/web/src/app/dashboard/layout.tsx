"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuthStore } from "@/stores/auth-store";
import { Toaster } from "@/components/ui/toaster";
import { ThemeConfigProvider, useThemeConfig } from "@/lib/hooks/use-theme-config";
import { ParticleBackground } from "@/components/ui/particle-background";
import { PageTransition } from "@/components/ui/page-transition";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const { particles } = useThemeConfig();

    return (
        <div className="flex min-h-screen bg-background relative">
            {/* Particle Background (conditional) */}
            {particles && <ParticleBackground />}

            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <div className="flex flex-1 flex-col lg:ml-64">
                {/* Mobile top padding for fixed header */}
                <main className="flex-1 overflow-y-auto bg-background p-6 pt-20 lg:pt-6 relative z-10">
                    <PageTransition>{children}</PageTransition>
                </main>
            </div>

            <Toaster />
        </div>
    );
}

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
        <ThemeConfigProvider>
            <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </ThemeConfigProvider>
    );
}

