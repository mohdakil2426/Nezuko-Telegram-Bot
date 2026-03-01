/**
 * PageErrorState
 * Shared error state component for page-level errors
 */

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function PageErrorState({
  title = "Something went wrong",
  message = "An error occurred while loading this page.",
  onRetry,
}: PageErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <AlertCircle className="text-destructive h-12 w-12" />
      <div className="text-center">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
