import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GroupNotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[500px] text-center space-y-4">
            <div className="bg-surface p-4 rounded-full border border-border">
                <FileQuestion className="h-12 w-12 text-text-tertiary" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">Group Not Found</h2>
            <p className="text-text-secondary max-w-sm">
                The group you are looking for does not exist or you do not have permission to view it.
            </p>
            <Button asChild variant="outline" className="mt-4">
                <Link href="/dashboard/groups">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Groups
                </Link>
            </Button>
        </div>
    );
}
