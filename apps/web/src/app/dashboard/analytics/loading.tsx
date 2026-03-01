/**
 * Analytics Route Loading Skeleton (PERF-L1)
 * Shown by Next.js while AnalyticsPageContent suspends.
 * Matches the new 3-tab layout with "operations" as default tab.
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-2 h-5 w-72" />
      </div>

      {/* Overview cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-1 h-8 w-20" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab bar skeleton — 3 tabs */}
      <div className="bg-muted grid w-full grid-cols-3 gap-1 rounded-lg p-1">
        <Skeleton className="h-8 rounded-md" />
        <Skeleton className="h-8 rounded-md" />
        <Skeleton className="h-8 rounded-md" />
      </div>

      {/* Default "operations" tab skeleton content */}
      <div className="space-y-4">
        {/* Full-width chart skeletons (VerificationTrends, UserGrowth, HourlyActivity) */}
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="min-h-[200px]">
              <Skeleton className="h-[250px] w-full" />
            </CardContent>
          </Card>
        ))}

        {/* 2-col grid skeleton (VerificationDistribution + BotHealth) */}
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="min-h-[200px]">
                <Skeleton className="mx-auto h-[200px] w-[200px] rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
