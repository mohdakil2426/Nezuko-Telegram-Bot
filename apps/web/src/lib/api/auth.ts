/**
 * Authentication API Client
 *
 * Handles Telegram authentication with the backend API.
 * Uses session cookies for authentication state.
 */

import { apiClient, ApiError } from "./client";
import type { TelegramUser } from "@/components/auth/telegram-login";

/**
 * Current user session info returned from /auth/me
 */
export interface SessionUser {
  telegram_id: number;
  username: string | null;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
}

/**
 * Response from /auth/telegram
 */
export interface AuthResponse {
  success: boolean;
  message: string;
  session_id: string | null;
  user: SessionUser | null;
}

/**
 * Response from /auth/logout
 */
export interface LogoutResponse {
  success: boolean;
  message: string;
}

/**
 * Send Telegram Login Widget data to backend for verification.
 * On success, the backend sets an HTTP-only session cookie.
 *
 * @param telegramUser - User data from Telegram Login Widget
 * @returns AuthResponse with success status and user info
 * @throws ApiError on authentication failure
 */
export async function verifyTelegramLogin(telegramUser: TelegramUser): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>("/api/v1/auth/telegram", telegramUser);
}

/**
 * Log out the current user.
 * Clears the session cookie on the backend.
 *
 * @returns LogoutResponse with success status
 */
export async function logout(): Promise<LogoutResponse> {
  return apiClient.post<LogoutResponse>("/api/v1/auth/logout");
}

/**
 * Get the current authenticated user's info.
 * Returns null if not authenticated.
 *
 * @returns SessionUser or null if not authenticated
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    return await apiClient.get<SessionUser>("/api/v1/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

/**
 * Check if the user is currently authenticated.
 * This is a lightweight check that doesn't throw on 401.
 *
 * @returns true if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
