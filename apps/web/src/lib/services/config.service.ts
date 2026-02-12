/**
 * Config Service
 * Key-value configuration management via InsForge SDK
 */

import { USE_MOCK } from "@/lib/api/config";
import { insforge } from "@/lib/insforge";

export interface ConfigEntry {
  key: string;
  value: string;
  updated_at: string;
}

/**
 * Get all configuration entries
 */
export async function getConfig(): Promise<ConfigEntry[]> {
  if (USE_MOCK) {
    return [];
  }

  const { data, error } = await insforge.database
    .from("admin_config")
    .select("*")
    .order("key", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ConfigEntry[];
}

/**
 * Get a single configuration value by key
 */
export async function getConfigValue(key: string): Promise<string | null> {
  if (USE_MOCK) {
    return null;
  }

  const { data, error } = await insforge.database
    .from("admin_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
}

/**
 * Set a configuration value (upsert)
 */
export async function setConfigValue(key: string, value: string): Promise<void> {
  if (USE_MOCK) {
    return;
  }

  const { error } = await insforge.database
    .from("admin_config")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) throw error;
}
