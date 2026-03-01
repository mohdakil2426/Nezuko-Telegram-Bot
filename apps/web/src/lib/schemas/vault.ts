import { z } from "zod";

export const vaultSecuritySchema = z.object({
  master_key: z
    .string()
    .min(32, "Master key must be a valid base64 256-bit key")
    .refine((val) => /^[A-Za-z0-9+/]+=*$/.test(val), {
      message: "Key must be valid base64 format",
    }),
  key_name: z.string().min(1),
  description: z.string().optional(),
});

export type VaultSecurityInput = z.infer<typeof vaultSecuritySchema>;
