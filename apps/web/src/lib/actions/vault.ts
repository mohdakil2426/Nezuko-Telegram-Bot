"use server";

import { auth } from "@insforge/nextjs/server";
import { createCipheriv, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { vaultSecuritySchema } from "../schemas/vault";
import { DEV_LOGIN } from "@/lib/api/config";

const VAULT_CACHE_PATH = "/dashboard/settings";
const MASTER_KEY_NAME = "master_key";
const TOKEN_REGEX = /^\d{8,15}:[A-Za-z0-9_-]{35,}$/;

interface VaultSecretRow {
  key_name: string;
  key_value?: string;
  description: string | null;
  updated_at: string;
}

interface BotInstanceRow {
  id: number;
  owner_telegram_id: number;
  bot_id: number;
  bot_username: string;
  bot_name: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

interface TelegramBotInfo {
  id: number;
  username?: string;
  first_name?: string;
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

async function getServerBearerToken(): Promise<{ token: string; userId: string | null }> {
  const { token, userId } = await auth();

  if (token) {
    return { token, userId };
  }

  if (DEV_LOGIN) {
    const serviceKey = process.env.INSFORGE_SERVICE_KEY;
    if (!serviceKey) {
      throw new Error(getDevBypassServiceKeyMessage());
    }
    return { token: serviceKey, userId: null };
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

async function verifyTelegramBotToken(token: string): Promise<TelegramBotInfo> {
  if (!TOKEN_REGEX.test(token)) {
    throw new Error("Invalid bot token format");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      signal: controller.signal,
      cache: "no-store",
    });
    const data = (await response.json()) as {
      ok: boolean;
      description?: string;
      result?: TelegramBotInfo;
    };

    if (!data.ok || !data.result) {
      throw new Error(data.description ?? "Invalid bot token");
    }

    return data.result;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Telegram verification timed out");
    }
    throw error instanceof Error ? error : new Error("Bot verification failed");
  } finally {
    clearTimeout(timeout);
  }
}

function encryptToken(plaintextToken: string, base64Key: string): string {
  const keyBuffer = Buffer.from(base64Key, "base64");
  if (keyBuffer.length !== 32) {
    throw new Error("Stored master key is invalid. Generate a new 256-bit vault key.");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBuffer, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintextToken, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `v2:${Buffer.concat([iv, ciphertext, authTag]).toString("base64")}`;
}

export async function getVaultStatus(): Promise<VaultStatus> {
  try {
    const { token } = await getServerBearerToken();
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
    const { token } = await getServerBearerToken();
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

export async function addBotSecure(token: string) {
  try {
    const { token: bearerToken, userId } = await getServerBearerToken();
    const botInfo = await verifyTelegramBotToken(token);
    const masterKeyRow = await getMasterKeyRow(bearerToken);
    const masterKey = masterKeyRow?.key_value;

    if (!masterKey) {
      return {
        success: false,
        error:
          "Security Vault not configured. Generate a master key in Settings before adding bots.",
      };
    }

    const encryptedToken = encryptToken(token, masterKey);
    const payload = {
      owner_telegram_id: userId ? Number(userId) : 0,
      bot_id: botInfo.id,
      bot_username: botInfo.username ?? `bot_${botInfo.id}`,
      bot_name: botInfo.first_name ?? null,
      token_encrypted: encryptedToken,
      is_active: true,
      is_deleted: false,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    };

    const updated = await patchRecords<BotInstanceRow>(
      "bot_instances",
      bearerToken,
      { bot_id: `eq.${botInfo.id}` },
      payload
    );

    const row =
      updated[0] ??
      (
        await insertRecords<BotInstanceRow>("bot_instances", bearerToken, [
          {
            ...payload,
            created_at: new Date().toISOString(),
          },
        ])
      )[0];

    revalidatePath("/dashboard/bots");

    return { success: true, data: row };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add bot",
    };
  }
}

export async function updateBotSecure(botId: number, isActive: boolean) {
  try {
    const { token } = await getServerBearerToken();
    const rows = await patchRecords<BotInstanceRow>(
      "bot_instances",
      token,
      { id: `eq.${botId}` },
      {
        is_active: isActive,
        updated_at: new Date().toISOString(),
      }
    );

    const row = rows[0];
    if (!row) {
      return { success: false, error: "Bot not found." };
    }

    revalidatePath("/dashboard/bots");
    return { success: true, data: row };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update bot",
    };
  }
}

export async function deleteBotSecure(botId: number) {
  try {
    const { token } = await getServerBearerToken();
    const rows = await patchRecords<BotInstanceRow>(
      "bot_instances",
      token,
      { id: `eq.${botId}` },
      {
        is_deleted: true,
        is_active: false,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );

    if (rows.length === 0) {
      return { success: false, error: "Bot not found." };
    }

    revalidatePath("/dashboard/bots");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete bot",
    };
  }
}
