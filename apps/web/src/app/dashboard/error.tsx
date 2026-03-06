"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50svh] items-center justify-center p-4">
      <div className="bg-card text-card-foreground w-full max-w-md rounded-xl border p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="bg-destructive/10 text-destructive flex h-10 w-10 items-center justify-center rounded-full">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Dashboard error</h2>
            <p className="text-muted-foreground text-sm">
              This dashboard section failed to load.
            </p>
          </div>
        </div>
        {error.digest && <p className="text-muted-foreground mb-4 text-xs">Ref: {error.digest}</p>}
        <Button onClick={() => reset()}>Retry Section</Button>
      </div>
    </div>
  );
}
