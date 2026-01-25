import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
            <h2 className="text-2xl font-bold text-text-primary">Channel Not Found</h2>
            <p className="text-text-secondary">
                The channel you are looking for does not exist or has been deleted.
            </p>
            <Button asChild variant="outline">
                <Link href="/dashboard/channels">Back to Channels</Link>
            </Button>
        </div>
    );
}
