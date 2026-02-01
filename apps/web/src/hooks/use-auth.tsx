"use client";

import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase/client';
import type { AuthState, User } from '@/lib/data/types';
import type { UserResponse } from '@/lib/api/types';

// Adapter to map API User to UI User
const mapUserToUI = (apiUser: UserResponse | null): User | null => {
  if (!apiUser) return null;
  return {
    id: apiUser.id,
    name: apiUser.full_name || apiUser.email.split('@')[0],
    email: apiUser.email,
    avatar: '', // Fallback handled in UI
    role: (apiUser.role as any) || 'User',
    status: 'online'
  };
};

export function useAuth() {
  const { user: apiUser, isAuthenticated, logout: storeLogout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      
      // The AuthProvider in layout will listen to the auth state change
      // and update the store automatically.
      
      return { success: true };
    } catch (err) {
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      storeLogout(); 
    } catch (error) {
      console.error('Logout failed', error);
      // Force local logout anyway
      storeLogout();
    }
  }, [storeLogout]);

  // Compatibility return object
  return {
    isAuthenticated,
    user: mapUserToUI(apiUser),
    token: null, // Token handled by Supabase/Cookies
    login,
    logout,
    isLoading
  };
}

// Deprecated: AuthProvider is now handled globally in app/layout.tsx via providers/auth-provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
