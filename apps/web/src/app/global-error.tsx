"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-muted text-foreground">
        <main className="flex min-h-svh items-center justify-center p-6">
          <div className="bg-card text-card-foreground w-full max-w-md rounded-xl border p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="bg-destructive/10 text-destructive flex h-10 w-10 items-center justify-center rounded-full">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Application error</h1>
                <p className="text-muted-foreground text-sm">
                  Reload the application or try again.
                </p>
              </div>
            </div>
            {error.digest && (
              <p className="text-muted-foreground mb-4 text-xs">Ref: {error.digest}</p>
            )}
            <Button onClick={() => reset()}>Try Again</Button>
          </div>
        </main>
      </body>
    </html>
  );
}
