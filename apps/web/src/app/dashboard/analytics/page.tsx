/**
 * Analytics Page
 * Displays verification trends and growth metrics
 */

import { Suspense } from "react";
import { AnalyticsPageContent } from "@/components/analytics";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Analytics</h1>
        <p className="text-muted-foreground">Track verification trends and user growth.</p>
      </div>

      <Suspense fallback={<div className="bg-muted h-[400px] w-full animate-pulse rounded-xl" />}>
        <AnalyticsPageContent />
      </Suspense>
    </div>
  );
}
