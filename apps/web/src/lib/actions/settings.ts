"use server";

import { revalidatePath } from "next/cache";
import { botSettingsSchema, type BotSettings } from "../schemas/settings";

/**
 * Update Bot Settings Action
 * 
 * This is a Server Action. It runs ONLY on the server.
 * Benefits for Beginners:
 * 1. Security: API keys and logic are hidden from the browser.
 * 2. Validation: We check the data before it ever touches our database.
 * 3. Simplicity: No need to fetch() from the frontend.
 */
export async function updateBotSettings(formData: BotSettings) {
  // 1. Validate the data against our schema
  const validated = botSettingsSchema.safeParse(formData);

  if (!validated.success) {
    return {
      success: false,
      error: "Invalid settings data provided. Please check the form.",
      details: validated.error.flatten().fieldErrors,
    };
  }

  // 2. Security Check (Simulator)
  // In a real app, we would verify the user's session here.
  // console.log("Verifying admin permissions...");

  try {
    // 3. Database Operation (Simulator)
    // In a real app: await insforge.db.from('settings').update(validated.data);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate networking delay

    // 4. Update the UI
    // Tells Next.js to refresh the settings page data
    revalidatePath("/dashboard/settings");

    return {
      success: true,
      message: "Bot configuration updated successfully!",
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to update settings. Please try again later.",
    };
  }
}
