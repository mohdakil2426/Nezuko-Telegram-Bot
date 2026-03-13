import { Suspense } from "react";
import { getVaultStatus } from "@/lib/actions/vault";
import { SecurityVaultCard } from "./security-vault-card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading Skeleton for the Security Vault Card
 */
function VaultSkeleton() {
  return <Skeleton className="h-[280px] w-full rounded-xl" />;
}

/**
 * Server Component that fetches the master key and renders the vault card.
 * Wrapped in Suspense in the parent to enable streaming.
 */
async function VaultSectionContent() {
  const status = await getVaultStatus();
  return <SecurityVaultCard initialStatus={status} />;
}

export function VaultSection() {
  return (
    <Suspense fallback={<VaultSkeleton />}>
      <VaultSectionContent />
    </Suspense>
  );
}
