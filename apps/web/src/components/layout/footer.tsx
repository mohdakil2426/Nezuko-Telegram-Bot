import { cn } from "@/lib/utils/cn";

interface FooterProps {
    className?: string;
}

export function Footer({ className }: FooterProps) {
    return (
        <footer className={cn("border-t border-border bg-surface px-6 py-4 text-center text-xs text-text-muted", className)}>
            <p>
                &copy; {new Date().getFullYear()} Nezuko Bot. All rights reserved.
            </p>
        </footer>
    );
}
