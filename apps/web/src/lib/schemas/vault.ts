import { z } from "zod";

export const vaultSecuritySchema = z.object({
  master_key: z.string().min(32, "Master key must be a valid base64 256-bit key"),
  key_name: z.string().min(1),
  description: z.string().optional(),
});

export type VaultSecurityInput = z.infer<typeof vaultSecuritySchema>;
