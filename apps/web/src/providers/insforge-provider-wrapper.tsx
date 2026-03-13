import { InsforgeProvider } from "./insforge-provider";
import { DEV_LOGIN } from "@/lib/api/config";

interface InsforgeProviderWrapperProps {
  children: React.ReactNode;
}

export function InsforgeProviderWrapper({ children }: InsforgeProviderWrapperProps) {
  if (DEV_LOGIN) {
    return <>{children}</>;
  }

  return <InsforgeProvider>{children}</InsforgeProvider>;
}
