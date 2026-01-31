# 4. State Management

## 4.1 State Hierarchy & Layer Selection

**RULE:** Choose the appropriate state layer based on **scope**, **frequency**, and **access pattern**.

| Layer | Use Case | Tools | Scope |
|-------|----------|-------|-------|
| **URL/Search Params** | Pagination, filters, sorting, navigation | `useSearchParams`, `useRouter` | Page-level, shareable |
| **Local Component State** | Form inputs, UI toggles, animations | `useState` | Single component |
| **Lifted/Context State** | Shared across 2-3 components in tree | React Context | Component subtree |
| **Global Client State** | Theme, auth status, feature flags | Zustand | Entire app |
| **Server State** | API data, database state | TanStack Query | Derived from server |

**HIERARCHY (from preferred to avoid):**
1. ✅ URL/Search Params (most shareable, bookmark-friendly)
2. ✅ Local `useState` (simplest, no external state)
3. ✅ Server State (TanStack Query - cached, automatically synchronized)
4. ⚠️ Context API (only for cross-component theme/auth - split by update frequency)
5. ⚠️ Zustand (only when Context doesn't fit performance needs)
6. ❌ Never use localStorage directly in components (use Zustand middleware)

**✅ DO:**
```typescript
// 1. URL parameters for navigation state
"use client";
import { useSearchParams, useRouter } from "next/navigation";

export function ProductList(): ReactNode {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const currentPage = searchParams.get("page") ?? "1";
  const sortBy = searchParams.get("sort") ?? "newest";
  
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    router.push(`?${params.toString()}`);
  };
  
  return (
    <div>
      {/* Products for currentPage */}
      <button onClick={() => handlePageChange(2)}>Next</button>
    </div>
  );
}

// 2. Local state for UI
"use client";
import { useState, ReactNode } from "react";

export function TogglePanel(): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
      {isOpen && <div>Panel content</div>}
    </>
  );
}

// 3. Zustand for global client state
import create from "zustand";

interface ThemeStore {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: "light",
  setTheme: (theme) => set({ theme }),
}));

"use client";
import { useThemeStore } from "@/store/theme";

export function ThemeToggle(): ReactNode {
  const { theme, setTheme } = useThemeStore();
  
  return (
    <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
      Current: {theme}
    </button>
  );
}

// 4. Server State with TanStack Query
"use client";
import { useQuery } from "@tanstack/react-query";

export function UserData({ userId }: { userId: string }): ReactNode {
  const { data: user, isPending, error } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => fetch(`/api/users/${userId}`).then(r => r.json()),
  });
  
  if (isPending) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{user.name}</div>;
}
```

**❌ DON'T:**
```typescript
// Global state for everything
const appStore = create((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
  // ... 50 more UI toggles
}));

// Synchronizing state manually
"use client";
useEffect(() => {
  setLocalState(globalState); // Unnecessary sync - TanStack Query does this!
}, [globalState]);

// Storing derived data that should be server state
const [users, setUsers] = useState([]);
useEffect(() => {
  fetch("/api/users").then(r => r.json()).then(setUsers);
}, []);
```

## 4.2 Zustand - Global Client State

**RULE:** Use Zustand ONLY for **true global state** (theme, auth user, feature flags). Never duplicate server state.

**Store Structure:**
```typescript
// lib/store/auth.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) =>
        set({
          user,
          isAuthenticated: user !== null,
        }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "auth-store",
      storage: typeof window !== "undefined" ? localStorage : undefined,
    }
  )
);

// lib/store/theme.ts
interface ThemeStore {
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: "system",
  setTheme: (theme) => set({ theme }),
}));
```

**✅ DO:**
```typescript
// Use custom hooks to encapsulate store usage
export const useUser = () => {
  const user = useAuthStore((state) => state.user);
  return user;
};

export const useLogout = () => {
  const logout = useAuthStore((state) => state.logout);
  return logout;
};

// Only export custom hooks, not the raw store
"use client";
import { useUser, useLogout } from "@/lib/store/auth";

export function UserProfile(): ReactNode {
  const user = useUser();
  const logout = useLogout();
  
  if (!user) return <div>Not logged in</div>;
  
  return (
    <div>
      <h1>{user.name}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

**❌ DON'T:**
```typescript
// Don't export raw store - breaks encapsulation
export const useAppStore = create(/* ... */);

// Don't use Zustand for server state
const userStore = create((set) => ({
  users: [],
  loadUsers: async () => {
    const users = await fetch("/api/users").then(r => r.json());
    set({ users });
  },
})); // Use TanStack Query instead!

// Don't subscribe outside of components
useAuthStore.subscribe((state) => {
  localStorage.setItem("user", JSON.stringify(state.user)); // Use persist middleware!
});
```

## 4.3 Context API - Rare Cases Only

**RULE:** Use Context API **ONLY** for cross-cutting concerns that don't update frequently (theme, auth). Split contexts by update frequency to prevent excessive re-renders.

**✅ DO (if Context is necessary):**
```typescript
// Separate slow-changing auth from UI state
import { createContext, useContext, ReactNode, useState } from "react";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load user on mount
  useEffect(() => {
    checkAuth().then(setUser).finally(() => setIsLoading(false));
  }, []);
  
  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

// Root layout
export function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
```

**❌ DON'T:**
```typescript
// Context for everything
const AppContext = createContext({
  user: null,
  isOpen: false,
  isLoading: false,
  notifications: [],
  // ... 20 more fields that update at different frequencies
});

// Creates unnecessary re-renders!
```

---

[← Back to Server Components](./04-server-components-actions.md) | [Next: Data Fetching →](./06-data-fetching.md)
