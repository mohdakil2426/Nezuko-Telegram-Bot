"use client";

/**
 * Auth hooks with a dev-mode bypass.
 *
 * In production we forward to the InsForge SDK hooks. In local dev bypass mode
 * we return a stable synthetic signed-out state so the app can skip mounting the
 * provider entirely and avoid noisy 401 refresh attempts.
 */

import {
  useAuth as useInsforgeAuth,
  useUser as useInsforgeUser,
  type InitialAuthState,
} from "@insforge/nextjs";

import { DEV_LOGIN } from "@/lib/api/config";

type AuthState = ReturnType<typeof useInsforgeAuth>;
type UserState = ReturnType<typeof useInsforgeUser>;

function useDevAuth(): AuthState {
  return {
    isLoaded: true,
    isSignedIn: false,
    userId: null,
    user: null,
    getToken: async () => null,
    signIn: async () => {
      throw new Error("InsForge auth is disabled while NEXT_PUBLIC_DEV_LOGIN=true.");
    },
    signUp: async () => {
      throw new Error("InsForge auth is disabled while NEXT_PUBLIC_DEV_LOGIN=true.");
    },
    signOut: async () => {},
  } as unknown as AuthState;
}

function useDevUser(): UserState {
  return {
    isLoaded: true,
    user: null,
    userId: null,
  } as unknown as UserState;
}

const useResolvedAuth: () => AuthState = DEV_LOGIN ? useDevAuth : useInsforgeAuth;
const useResolvedUser: () => UserState = DEV_LOGIN ? useDevUser : useInsforgeUser;

export function useAuth(): AuthState {
  return useResolvedAuth();
}

export function useUser(): UserState {
  return useResolvedUser();
}

export type { InitialAuthState };
