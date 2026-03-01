"use server";

import { insforge } from "@/lib/insforge";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { vaultSecuritySchema } from "../schemas/vault";

/**
 * Verify the caller has an active session before allowing vault operations.
 * Throws if no session cookie is present.
 */
async function requireAuth(): Promise<void> {
  const cookieStore = await cookies();
  const session = cookieStore.get("insforge-session");
  if (!session?.value) {
    throw new Error("Unauthorized");
  }
}

/**
 * Fetch the master encryption key from the secure vault (Server Side Only)
 */
export async function getMasterKey() {
  await requireAuth();

  try {
    const { data, error } = await insforge.database
      .from("nezuko_secrets")
      .select("key_value")
      .eq("key_name", "master_key")
      .maybeSingle();

    if (error) {
      console.error("[getMasterKey] Error fetching master key:", error);
      return null;
    }

    return data?.key_value || null;
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
