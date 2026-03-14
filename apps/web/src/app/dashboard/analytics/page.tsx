/**
 * Analytics Page
 * Displays verification trends and growth metrics
 */

import { AnalyticsPageContent } from "@/components/analytics";

type AnalyticsPageProps = {
  searchParams?: Promise<{
    tab?: string;
  }>;
};

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Analytics</h1>
        <p className="text-muted-foreground">Track verification trends and user growth.</p>
      </div>

      <AnalyticsPageContent initialTab={resolvedSearchParams.tab} />
    </div>
  );
}
