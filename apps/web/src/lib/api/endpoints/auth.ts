import { api } from "../client";
import { AuthResponse } from "../types";
import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(1, { message: "Password is required" }),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const authApi = {
    login: (data: LoginValues) =>
        api.post<AuthResponse>("/auth/login", data),

    refresh: () =>
        api.post<AuthResponse>("/auth/refresh", {}),

    logout: () =>
        api.post<void>("/auth/logout", {}),

    me: () =>
        api.get<Pick<AuthResponse, "user">>("/auth/me"),
};
