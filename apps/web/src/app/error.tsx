"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function Error({
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
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-6">
            <Card className="max-w-md w-full border-destructive/50">
                <CardHeader className="text-center pb-2">
                    <div className="flex justify-center mb-4">
                        <div className="rounded-full bg-destructive/10 p-3">
                            <AlertCircle className="h-8 w-8 text-destructive" />
                        </div>
                    </div>
                    <CardTitle className="text-xl">Something went wrong!</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-sm text-muted-foreground space-y-4">
                    <p>
                        We encountered an error while processing your request.
                        Please try again or return to the dashboard.
                    </p>
                    {error.digest && (
                        <div className="bg-muted p-2 rounded text-xs font-mono">
                            ID: {error.digest}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center gap-2">
                    <Button onClick={() => reset()} variant="secondary">
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Retry
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
