"use server";

import { insforge } from "@/lib/insforge";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { vaultSecuritySchema } from "../schemas/vault";

/**
 * Verify the caller has an active session before allowing vault operations.
 * Throws if no session cookie is present.
 *
 * Dev bypass: when NEXT_PUBLIC_DEV_LOGIN=true the dashboard layout already
 * skips InsForge auth — vault actions must honour the same bypass so the
 * Settings page doesn't crash with "Unauthorized" in dev mode.
 */
async function requireAuth(): Promise<void> {
  // Match the same guard used in dashboard/layout.tsx
  const devLogin = process.env.NEXT_PUBLIC_DEV_LOGIN === "true";
  if (devLogin) return; // Skip auth check in dev-bypass mode

  const cookieStore = await cookies();
  const session = cookieStore.get("insforge-session");
  if (!session?.value) {
    throw new Error("Unauthorized");
  }
}

/**
 * Fetch the master encryption key from the secure vault (Server Side Only).
 *
 * Uses a raw fetch with the anon key instead of the InsForge SDK because
 * Server Actions don't forward user sessions in DEV_LOGIN mode — the SDK's
 * session-based auth returns an empty error `{}` in that case.
 *
 * The `nezuko_secrets` table has `secrets_anon_read: SELECT qual=true`, so
 * a direct anon-key request always succeeds regardless of session state.
 *
 * In mock mode: returns null immediately (no vault configured in dev).
 */
export async function getMasterKey() {
  await requireAuth();

  // Short-circuit in mock/dev mode — no real vault is configured
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    return null;
  }

  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

  if (!baseUrl || !anonKey) {
    console.error("[getMasterKey] Missing InsForge env vars — cannot fetch master key");
    return null;
  }

  try {
    // Use raw fetch with anon key — bypasses session-cookie auth that fails in dev bypass mode
    const url = new URL("/api/database/records/nezuko_secrets", baseUrl);
    url.searchParams.set("key_name", "eq.master_key");
    url.searchParams.set("select", "key_value");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      // No caching — this is a security-sensitive value
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[getMasterKey] HTTP error fetching master key:", res.status, res.statusText);
      return null;
    }

    const rows = (await res.json()) as Array<{ key_value: string }>;
    return rows[0]?.key_value || null;
  } catch (err) {
    console.error("[getMasterKey] Unexpected error:", err);
    return null;
  }
}


/**
 * Save a new master key to the secure vault
 *
 * @param keyValue The base64 encoded 256-bit key
 * @param description Optional description for the key
 */
export async function saveMasterKey(keyValue: string, description?: string) {
  await requireAuth();

  // 1. Validate the input against our Zod schema
  const validated = vaultSecuritySchema.safeParse({
    master_key: keyValue,
    key_name: "master_key",
    description,
  });

  if (!validated.success) {
    return {
      success: false,
      error: validated.error.errors[0].message || "Invalid master key format.",
    };
  }

  try {
    // 2. UPSERT the secret into the database vault
    // This will create the key if it doesn't exist, or update it if it does.
    const { error } = await insforge.database.from("nezuko_secrets").upsert(
      {
        key_name: "master_key",
        key_value: keyValue,
        description: description || "Main platform-wide encryption vault key",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key_name" }
    );

    if (error) {
      console.error("[saveMasterKey] Database error:", error);
      return { success: false, error: "Failed to save the encryption key. Please try again." };
    }

    // 3. Revalidate the settings page to reflect the new security state
    revalidatePath("/dashboard/settings");

    return {
      success: true,
      message: "Security Vault configured successfully!",
    };
  } catch (err: unknown) {
    console.error("[saveMasterKey] Unexpected error:", err);
    return {
      success: false,
      error: "An unexpected error occurred while saving the key.",
    };
  }
}

/**
 * Add a bot securely — fetches master key and invokes edge function server-side.
 * This prevents the master key from ever being exposed to the client.
 */
export async function addBotSecure(token: string) {
  await requireAuth();

  // 1. Get master key server-side
  const masterKey = await getMasterKey();
  if (!masterKey) {
    return {
      success: false,
      error:
        "Security Vault not configured. Please generate a master key in Settings before adding bots.",
    };
  }

  // 2. Call edge function server-side
  const { data, error } = await insforge.functions.invoke("manage-bot", {
    body: { action: "add", token, master_key: masterKey },
  });

  if (error) {
    return { success: false, error: (error as Error).message || "Failed to add bot" };
  }

  return { success: true, data };
}

/**
 * Update bot active status securely via server-side function call.
 * This bypasses browser-side RLS restrictions for all users (including dev bypass).
 */
export async function updateBotSecure(botId: number, isActive: boolean) {
  await requireAuth();

  const { data, error } = await insforge.functions.invoke("manage-bot", {
    body: { action: "update", id: botId, is_active: isActive },
  });

  if (error) {
    return { success: false, error: (error as Error).message || "Failed to update bot" };
  }

  return { success: true, data };
}

/**
 * Soft-delete bot securely via server-side function call.
 * This bypasses browser-side RLS restrictions for all users (including dev bypass).
 */
export async function deleteBotSecure(botId: number) {
  await requireAuth();

  const { error } = await insforge.functions.invoke("manage-bot", {
    body: { action: "delete", id: botId },
  });

  if (error) {
    return { success: false, error: (error as Error).message || "Failed to delete bot" };
  }

  return { success: true };
}
