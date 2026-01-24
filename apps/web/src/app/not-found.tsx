import Link from "next/link";
import { Ghost } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
                <Ghost className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-3xl font-bold tracking-tight">Page Not Found</h2>
            <p className="mb-6 max-w-md text-muted-foreground">
                Could not find the requested resource. The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
            <Button asChild>
                <Link href="/">Return Home</Link>
            </Button>
        </div>
    );
}
