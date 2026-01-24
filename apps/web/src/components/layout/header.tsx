import { Bell, Search, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface HeaderProps {
    className?: string;
}

export function Header({ className }: HeaderProps) {
    return (
        <header className={cn("flex h-16 w-full items-center justify-between border-b border-border bg-surface/50 px-6 backdrop-blur-md", className)}>
            <div className="flex items-center gap-4">
                {/* Placeholder for sidebar toggle if needed on mobile */}
                <h1 className="text-lg font-semibold text-text-primary">Admin Panel</h1>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-muted" />
                    <input
                        type="search"
                        placeholder="Search..."
                        className="h-9 w-64 rounded-md border border-border bg-background pl-9 pr-4 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                </div>

                <button className="relative rounded-full p-2 text-text-secondary hover:bg-surface-raised hover:text-text-primary">
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error-500 ring-2 ring-surface" />
                </button>

                <div className="flex items-center gap-3 pl-4 border-l border-border">
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-medium text-text-primary">Admin User</span>
                        <span className="text-xs text-text-muted">Owner</span>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500">
                        <User className="h-5 w-5" />
                    </div>
                </div>
            </div>
        </header>
    );
}
