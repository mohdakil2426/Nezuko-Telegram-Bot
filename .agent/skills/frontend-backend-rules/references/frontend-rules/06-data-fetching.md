# 5. Data Fetching & Server-State Management

## 5.1 TanStack Query (React Query) - Server State Authority

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
  fetch(`/api/users/${userId}`).then(r => r.json()).then(setUser);
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

## 5.2 Query Keys & Invalidation Strategy

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

## 5.3 Server Components for Initial Data

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

---

[← Back to State Management](./05-state-management.md) | [Next: Form Handling →](./07-form-handling.md)
