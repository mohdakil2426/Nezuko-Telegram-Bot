"use server";

import { insforge } from "@/lib/insforge";
import { revalidatePath } from "next/cache";
import { vaultSecuritySchema } from "../schemas/vault";

/**
 * Fetch the master encryption key from the secure vault (Server Side Only)
 */
export async function getMasterKey() {
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
  // 1. Validate the input against our Zod schema
  const validated = vaultSecuritySchema.safeParse({ 
    master_key: keyValue, 
    key_name: "master_key",
    description 
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
    const { error } = await insforge.database
      .from("nezuko_secrets")
      .upsert({
        key_name: "master_key",
        key_value: keyValue,
        description: description || "Main platform-wide encryption vault key",
        updated_at: new Date().toISOString(),
      }, { onConflict: "key_name" });

    if (error) {
      console.error("[saveMasterKey] Database error:", error);
      return { success: false, error: error.message };
    }

    // 3. Revalidate the settings page to reflect the new security state
    revalidatePath("/dashboard/settings");

    return {
      success: true,
      message: "Security Vault configured successfully!",
    };
  } catch (err: any) {
    console.error("[saveMasterKey] Unexpected error:", err);
    return {
      success: false,
      error: err.message || "An unexpected error occurred while saving the key.",
    };
  }
}
