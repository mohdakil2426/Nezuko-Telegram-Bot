"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
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

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();

    const routes = [
        {
            label: "Dashboard",
            icon: LayoutDashboard,
            href: "/",
            active: pathname === "/",
        },
        {
            label: "Groups",
            icon: Users,
            href: "/groups",
            active: pathname.startsWith("/groups"),
        },
        {
            label: "Channels",
            icon: Tv,
            href: "/channels",
            active: pathname.startsWith("/channels"),
        },
        {
            label: "Config",
            icon: Settings,
            href: "/config",
            active: pathname.startsWith("/config"),
        },
        {
            label: "Logs",
            icon: FileText,
            href: "/logs",
            active: pathname.startsWith("/logs"),
        },
        {
            label: "Database",
            icon: Database,
            href: "/database",
            active: pathname.startsWith("/database"),
        },
        {
            label: "Analytics",
            icon: BarChart,
            href: "/analytics",
            active: pathname.startsWith("/analytics"),
        },
    ];

    return (
        <div className={cn("flex h-full w-[280px] flex-col border-r border-border bg-surface text-text-primary", className)}>
            <div className="flex h-16 items-center border-b border-border px-6">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl">
                    <span className="text-2xl">🤖</span>
                    <span>Nezuko</span>
                </Link>
            </div>
            <div className="flex flex-1 flex-col justify-between py-6">
                <nav className="flex flex-col gap-1 px-4">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "group flex items-center rounded-md px-4 py-3 text-sm font-medium transition-colors hover:bg-primary-500/10 hover:text-primary-500",
                                route.active ? "bg-primary-500/10 text-primary-500" : "text-text-secondary"
                            )}
                        >
                            <route.icon className={cn("mr-3 h-5 w-5", route.active ? "text-primary-500" : "text-text-muted group-hover:text-primary-500")} />
                            {route.label}
                        </Link>
                    ))}
                </nav>
                <div className="px-4">
                    <button
                        className="flex w-full items-center rounded-md px-4 py-3 text-sm font-medium text-error-500 transition-colors hover:bg-error-500/10"
                    // onClick={logout} // To be implemented with auth
                    >
                        <LogOut className="mr-3 h-5 w-5" />
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
