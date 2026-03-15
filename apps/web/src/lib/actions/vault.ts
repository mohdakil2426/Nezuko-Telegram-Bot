"use server";

import { auth } from "@insforge/nextjs/server";
import { revalidatePath } from "next/cache";

import { DEV_LOGIN } from "@/lib/api/config";
import { isAllowedDashboardEmail } from "@/lib/auth/server";
import { vaultSecuritySchema } from "../schemas/vault";

const VAULT_CACHE_PATH = "/dashboard/settings";
const MASTER_KEY_NAME = "master_key";

interface VaultSecretRow {
  key_name: string;
  key_value?: string;
  description: string | null;
  updated_at: string;
}

export interface VaultStatus {
  configured: boolean;
  description: string | null;
  updatedAt: string | null;
  unavailableReason?: string | null;
}

function getDevBypassServiceKeyMessage(): string {
  return "Set INSFORGE_SERVICE_KEY in apps/web/.env.local to use Security Vault while NEXT_PUBLIC_DEV_LOGIN=true.";
}

function getBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_INSFORGE_BASE_URL is required");
  }

  return baseUrl.replace(/\/$/, "");
}

async function getServerBearerToken(): Promise<string> {
  const { token, user } = await auth();

  if (user?.email && !isAllowedDashboardEmail(user.email)) {
    throw new Error("Unauthorized");
  }

  if (token) {
    return token;
  }

  if (DEV_LOGIN) {
    const serviceKey = process.env.INSFORGE_SERVICE_KEY;
    if (!serviceKey) {
      throw new Error(getDevBypassServiceKeyMessage());
    }

    return serviceKey;
  }

  throw new Error("Unauthorized");
}

async function fetchRecords<T>(
  table: string,
  token: string,
  params?: Record<string, string>
): Promise<T[]> {
  const url = new URL(`/api/database/records/${table}`, getBaseUrl());
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${table}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T[];
}

async function patchRecords<T>(
  table: string,
  token: string,
  filters: Record<string, string>,
  body: Record<string, unknown>
): Promise<T[]> {
  const url = new URL(`/api/database/records/${table}`, getBaseUrl());
  for (const [key, value] of Object.entries(filters)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "",
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (response.status === 204) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`Failed to update ${table}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T[];
}

async function insertRecords<T>(
  table: string,
  token: string,
  rows: Record<string, unknown>[]
): Promise<T[]> {
  const response = await fetch(`${getBaseUrl()}/api/database/records/${table}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "",
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(rows),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to insert into ${table}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T[];
}

async function getMasterKeyRow(token: string): Promise<VaultSecretRow | null> {
  const rows = await fetchRecords<VaultSecretRow>("nezuko_secrets", token, {
    key_name: `eq.${MASTER_KEY_NAME}`,
    select: "key_name,key_value,description,updated_at",
    limit: "1",
  });

  return rows[0] ?? null;
}

export async function getVaultStatus(): Promise<VaultStatus> {
  try {
    const token = await getServerBearerToken();
    const secret = await getMasterKeyRow(token);

    return {
      configured: Boolean(secret?.key_value),
      description: secret?.description ?? null,
      updatedAt: secret?.updated_at ?? null,
      unavailableReason: null,
    };
  } catch (error) {
    if (DEV_LOGIN) {
      return {
        configured: false,
        description: null,
        updatedAt: null,
        unavailableReason: error instanceof Error ? error.message : getDevBypassServiceKeyMessage(),
      };
    }

    throw error;
  }
}

export async function saveMasterKey(keyValue: string, description?: string) {
  const validated = vaultSecuritySchema.safeParse({
    master_key: keyValue,
    key_name: MASTER_KEY_NAME,
    description,
  });

  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message ?? "Invalid master key format.",
    };
  }

  try {
    const token = await getServerBearerToken();
    const existing = await getMasterKeyRow(token);
    const payload = {
      key_name: MASTER_KEY_NAME,
      key_value: keyValue,
      description: description || "Main platform-wide encryption vault key",
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await patchRecords("nezuko_secrets", token, { key_name: `eq.${MASTER_KEY_NAME}` }, payload);
    } else {
      await insertRecords("nezuko_secrets", token, [payload]);
    }

    revalidatePath(VAULT_CACHE_PATH);

    return {
      success: true,
      message: "Security Vault configured successfully.",
    };
  } catch (error) {
    console.error(
      "[saveMasterKey]",
      error instanceof Error ? error.message : "Unexpected vault write error"
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save the encryption key.",
    };
  }
}
