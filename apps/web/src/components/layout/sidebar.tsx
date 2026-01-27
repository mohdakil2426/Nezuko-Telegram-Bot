"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import {
    LayoutDashboard,
    Users,
    Tv,
    Settings,
    FileText,
    Database,
    BarChart,
    LogOut
} from "lucide-react";

interface SidebarProps {
    className?: string;
}

// Rule: rendering-hoist-jsx - Extract static data outside components
// This prevents the routes array from being recreated on every render
const ROUTES = [
    {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/dashboard",
        matchExact: true,
    },
    {
        label: "Groups",
        icon: Users,
        href: "/dashboard/groups",
    },
    {
        label: "Channels",
        icon: Tv,
        href: "/dashboard/channels",
    },
    {
        label: "Config",
        icon: Settings,
        href: "/dashboard/config",
    },
    {
        label: "Logs",
        icon: FileText,
        href: "/dashboard/logs",
    },
    {
        label: "Database",
        icon: Database,
        href: "/dashboard/database",
    },
    {
        label: "Analytics",
        icon: BarChart,
        href: "/dashboard/analytics",
    },
] as const;

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();
    const logout = useAuthStore((state) => state.logout);

    // Rule: rerender-functional-setstate - Use useCallback for stable callback references
    const handleLogout = useCallback(async () => {
        await supabase.auth.signOut();
        logout();
        window.location.href = "/login";
    }, [logout]);

    return (
        <div className={cn("flex h-full w-[280px] flex-col border-r border-border bg-surface text-text-primary", className)}>
            <div className="flex h-16 items-center border-b border-border px-6">
                <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
                    <span className="text-2xl">🤖</span>
                    <span>Nezuko</span>
                </Link>
            </div>
            <div className="flex flex-1 flex-col justify-between py-6">
                <nav className="flex flex-col gap-1 px-4">
                    {/* Rule: rerender-derived-state-no-effect - Derive active state during render */}
                    {ROUTES.map((route) => {
                        const isActive = 'matchExact' in route && route.matchExact
                            ? pathname === route.href || pathname === "/"
                            : pathname.startsWith(route.href);
                        const IconComponent = route.icon;
                        return (
                            <Link
                                key={route.href}
                                href={route.href}
                                className={cn(
                                    "group flex items-center rounded-md px-4 py-3 text-sm font-medium transition-colors hover:bg-primary-500/10 hover:text-primary-500",
                                    isActive ? "bg-primary-500/10 text-primary-500" : "text-text-secondary"
                                )}
                            >
                                <IconComponent className={cn("mr-3 h-5 w-5", isActive ? "text-primary-500" : "text-text-muted group-hover:text-primary-500")} />
                                {route.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="px-4">
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center rounded-md px-4 py-3 text-sm font-medium text-error-500 transition-colors hover:bg-error-500/10"
                    >
                        <LogOut className="mr-3 h-5 w-5" />
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}

