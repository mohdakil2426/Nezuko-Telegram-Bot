## 4. State Management

### 4.1 State Hierarchy & Layer Selection

**RULE:** Choose the appropriate state layer based on **scope**, **frequency**, and **access pattern**.

| Layer                     | Use Case                                 | Tools                          | Scope                 |
| ------------------------- | ---------------------------------------- | ------------------------------ | --------------------- |
| **URL/Search Params**     | Pagination, filters, sorting, navigation | `useSearchParams`, `useRouter` | Page-level, shareable |
| **Local Component State** | Form inputs, UI toggles, animations      | `useState`                     | Single component      |
| **Lifted/Context State**  | Shared across 2-3 components in tree     | React Context                  | Component subtree     |
| **Global Client State**   | Theme, auth status, feature flags        | Zustand                        | Entire app            |
| **Server State**          | API data, database state                 | TanStack Query                 | Derived from server   |

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
("use client");
useEffect(() => {
  setLocalState(globalState); // Unnecessary sync - TanStack Query does this!
}, [globalState]);

// Storing derived data that should be server state
const [users, setUsers] = useState([]);
useEffect(() => {
  fetch("/api/users")
    .then((r) => r.json())
    .then(setUsers);
}, []);
```

### 4.2 Zustand - Global Client State

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
    const users = await fetch("/api/users").then((r) => r.json());
    set({ users });
  },
})); // Use TanStack Query instead!

// Don't subscribe outside of components
useAuthStore.subscribe((state) => {
  localStorage.setItem("user", JSON.stringify(state.user)); // Use persist middleware!
});
```

### 4.3 Context API - Rare Cases Only

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

## 5. Data Fetching & Server-State Management

### 5.1 TanStack Query (React Query) - Server State Authority

**RULE:** **TanStack Query is the ONLY authority for server state**. Treat API responses as cached, time-bound data that requires synchronization with server truth.

**Core Concepts:**

- **Query Key** - Unique identifier that determines cache lifetime
- **Query Function** - Async function that fetches data
- **Stale Time** - How long before data is considered "stale"
- **GC Time (formerly cacheTime)** - How long to keep unused data in cache
- **Invalidation** - Trigger refetch when server state changes

**✅ DO:**

```typescript
// lib/queries/users.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, UpdateUserInput } from "@/types";

const USERS_QUERY_KEY = ["users"] as const;
const USER_QUERY_KEY = (id: string) => [...USERS_QUERY_KEY, id] as const;

export function useUser(userId: string) {
  return useQuery({
    queryKey: USER_QUERY_KEY(userId),
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json() as Promise<User>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useUsers(options?: { filter?: string }) {
  return useQuery({
    queryKey: [...USERS_QUERY_KEY, { filter: options?.filter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.filter) params.set("filter", options.filter);

      const response = await fetch(`/api/users?${params}`);
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json() as Promise<User[]>;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateUserInput) => {
      const response = await fetch(`/api/users/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update user");
      return response.json() as Promise<User>;
    },
    onSuccess: (updatedUser) => {
      // Invalidate affected queries
      queryClient.invalidateQueries({
        queryKey: USER_QUERY_KEY(updatedUser.id),
      });
      queryClient.invalidateQueries({
        queryKey: USERS_QUERY_KEY,
      });
    },
  });
}

// app/user/[id]/page.tsx
"use client";

export function UserPage({ params }: { params: { id: string } }): ReactNode {
  const { data: user, isPending, error } = useUser(params.id);
  const updateUser = useUpdateUser();

  if (isPending) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <button
        onClick={() =>
          updateUser.mutate({
            id: user.id,
            name: "New Name",
          })
        }
      >
        Update
      </button>
    </div>
  );
}
```

**❌ DON'T:**

```typescript
// Manual data fetching - error prone and doesn't cache
"use client";
const [user, setUser] = useState(null);
useEffect(() => {
  fetch(`/api/users/${userId}`)
    .then((r) => r.json())
    .then(setUser);
}, [userId]);

// Don't duplicate server state in Zustand
const userStore = create((set) => ({
  users: [],
  loadUsers: async () => {
    const response = await fetch("/api/users");
    set({ users: response.json() });
  },
}));

// Don't mix TanStack Query with manual state
const { data } = useQuery({ queryKey: ["user"], queryFn: fetchUser });
const [localUser, setLocalUser] = useState(data); // Sync problem!
useEffect(() => {
  setLocalUser(data);
}, [data]);
```

### 5.2 Query Keys & Invalidation Strategy

**RULE:** Design query keys hierarchically. Invalidate keys at the appropriate level on mutations.

**✅ DO:**

```typescript
// Define query key factory
export const queryKeys = {
  all: ["posts"] as const,
  lists: () => [...queryKeys.all, "list"] as const,
  list: (filters: PostFilters) => [...queryKeys.lists(), filters] as const,
  details: () => [...queryKeys.all, "detail"] as const,
  detail: (id: string) => [...queryKeys.details(), id] as const,
  comments: () => [...queryKeys.all, "comments"] as const,
  comment: (id: string) => [...queryKeys.comments(), id] as const,
};

// Usage in queries
export function usePosts(filters: PostFilters) {
  return useQuery({
    queryKey: queryKeys.list(filters),
    queryFn: () => fetchPosts(filters),
  });
}

export function usePost(id: string) {
  return useQuery({
    queryKey: queryKeys.detail(id),
    queryFn: () => fetchPost(id),
  });
}

// Mutations
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      // Invalidate list - will refetch all posts with any filters
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePost,
    onSuccess: (updatedPost) => {
      // Only invalidate the specific post and lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.detail(updatedPost.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.lists(),
      });
    },
  });
}
```

### 5.3 Server Components for Initial Data

**RULE:** Fetch initial data in **Server Components** when possible to avoid "waterfall" requests and improve performance.

**✅ DO:**

```typescript
// app/posts/page.tsx (Server Component - no "use client")
import { ReactNode } from "react";
import { PostList } from "./post-list";

async function getPosts(): Promise<Post[]> {
  // Direct database access or API call
  const response = await fetch("https://api.example.com/posts", {
    // Cache for 60 seconds
    next: { revalidate: 60 },
  });
  return response.json();
}

export default async function PostsPage(): Promise<ReactNode> {
  const posts = await getPosts();

  return (
    <div>
      <h1>Posts</h1>
      {/* Client component receives initial data */}
      <PostList initialPosts={posts} />
    </div>
  );
}

// app/posts/post-list.tsx (Client Component)
"use client";

import { useQuery } from "@tanstack/react-query";
import { Post } from "@/types";

interface PostListProps {
  initialPosts: Post[];
}

export function PostList({ initialPosts }: PostListProps): ReactNode {
  const { data: posts = initialPosts } = useQuery({
    queryKey: ["posts"],
    queryFn: () => fetch("/api/posts").then(r => r.json()),
    initialData: initialPosts, // Use server data as initial cache
  });

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

**❌ DON'T:**

```typescript
// Client-side only fetching - causes waterfall
"use client";
export function PostsPage(): ReactNode {
  const { data: posts } = useQuery({
    queryKey: ["posts"],
    queryFn: () => fetch("/api/posts").then(r => r.json()),
  });

  return <PostList posts={posts} />;
}
```
