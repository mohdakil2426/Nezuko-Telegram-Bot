"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <html>
            <body>
                <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
                    <div className="mb-4 rounded-full bg-destructive/10 p-4">
                        <AlertCircle className="h-12 w-12 text-destructive" />
                    </div>
                    <h2 className="mb-2 text-3xl font-bold tracking-tight">Something went wrong!</h2>
                    <p className="mb-6 max-w-md text-muted-foreground">
                        An unexpected error occurred. We apologize for the inconvenience.
                        Please try again later or contact support if the issue persists.
                    </p>
                    <div className="flex gap-4">
                        <Button onClick={() => reset()} variant="default">
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Try Again
                        </Button>
                        <Button onClick={() => window.location.href = "/"} variant="outline">
                            Return Home
                        </Button>
                    </div>
                    {error.digest && (
                        <p className="mt-8 text-xs text-muted-foreground font-mono">
                            Error ID: {error.digest}
                        </p>
                    )}
                </div>
            </body>
        </html>
    );
}
