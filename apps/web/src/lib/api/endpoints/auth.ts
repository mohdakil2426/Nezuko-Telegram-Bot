import { api } from "@/lib/api/client";
import { AdminApiResponse, UserResponse } from "@/lib/api/types";
import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, "Password is required"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const authApi = {
    me: () => api.get<AdminApiResponse<UserResponse>>("/auth/me"),
    sync: () => api.post<AdminApiResponse<UserResponse>>("/auth/sync", {}),
};
