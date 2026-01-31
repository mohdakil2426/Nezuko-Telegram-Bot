# 3. React Server Components (RSC) & Server Actions

## 3.1 Server Components - Default Behavior

**RULE:** In Next.js App Router, **all components are Server Components by default**. Only use `"use client"` when interactivity is required.

**Key Principles:**
- Server Components have ZERO JavaScript sent to client
- Can access databases, secrets, and sensitive data directly
- Cannot use hooks, event listeners, or browser APIs
- Can be async for direct data fetching

**✅ DO:**
```typescript
// This is a Server Component - no "use client" directive
import { ReactNode } from "react";
import { fetchUser } from "@/lib/api";

interface UserProfileProps {
  userId: string;
}

export async function UserProfile({ userId }: UserProfileProps): Promise<ReactNode> {
  // Can directly access database/APIs - no exposed to client
  const user = await fetchUser(userId);
  
  if (!user) {
    return <div>User not found</div>;
  }
  
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      {/* Interactive parts wrapped in Client Component */}
      <UserActions userId={userId} />
    </div>
  );
}
```

**❌ DON'T:**
```typescript
// Unnecessary "use client" - defeats Server Component benefits
"use client";

export async function UserProfile({ userId }: UserProfileProps) {
  const user = await fetchUser(userId); // Still sent to client!
  return <div>{user.name}</div>;
}
```

## 3.2 Client Components - "use client" Directive

**RULE:** Use `"use client"` **ONLY** for components that require:
- Event listeners (onClick, onChange, etc.)
- React hooks (useState, useEffect, etc.)
- Browser APIs (localStorage, window, etc.)
- Context consumers
- Custom hooks

**✅ DO:**
```typescript
"use client";

import { useState, ReactNode } from "react";
import { deletePost } from "@/app/actions/posts";

interface PostActionsProps {
  postId: string;
}

export function PostActions({ postId }: PostActionsProps): ReactNode {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePost(postId);
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <button onClick={handleDelete} disabled={isDeleting}>
      {isDeleting ? "Deleting..." : "Delete"}
    </button>
  );
}
```

**❌ DON'T:**
```typescript
// "use client" on read-only component
"use client";

export function UserName({ name }: { name: string }) {
  return <h1>{name}</h1>;
}

// Hooks in Server Component
export async function UserProfile({ userId }: { userId: string }) {
  const [data, setData] = useState(null); // ERROR - can't use hooks in Server Component
  return <div>{data}</div>;
}
```

## 3.3 Server Actions - Form Submissions & Mutations

**RULE:** Use **Server Actions** for all data mutations. Never use API routes for form handling when Server Actions are available.

**Core Benefits:**
- Form submission without manual API route management
- Automatic CSRF protection (GET requests never perform side effects)
- Revalidation of cached data on mutation
- Type-safe mutation handling
- Progressive enhancement support

**✅ DO:**
```typescript
// app/actions/posts.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  publishedAt: z.date().optional(),
});

type CreatePostInput = z.infer<typeof createPostSchema>;

export async function createPost(input: CreatePostInput) {
  // Validate input
  const validated = createPostSchema.parse(input);
  
  // Check authentication
  const session = await getSession(); // From auth lib
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  
  // Perform mutation
  const post = await db.post.create({
    data: {
      title: validated.title,
      content: validated.content,
      authorId: session.user.id,
      publishedAt: validated.publishedAt,
    },
  });
  
  // Revalidate affected caches
  revalidatePath("/posts");
  revalidatePath(`/posts/${post.id}`);
  
  return post;
}

// app/components/create-post-form.tsx
"use client";

import { FormEvent, ReactNode, useState } from "react";
import { createPost } from "@/app/actions/posts";

export function CreatePostForm(): ReactNode {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    
    try {
      await createPost({ title, content });
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsPending(false);
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input name="title" required />
      <textarea name="content" required />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create"}
      </button>
    </form>
  );
}
```

**❌ DON'T:**
```typescript
// Manual API endpoint for form handling
// app/api/posts/route.ts - AVOID THIS!
export async function POST(request: Request) {
  const data = await request.json();
  // Manual validation, error handling, revalidation...
  return Response.json({ ... });
}

// Performing mutations in useEffect
"use client";
export function PostForm() {
  useEffect(() => {
    if (formData) {
      fetch("/api/posts", { method: "POST", body: JSON.stringify(formData) });
    }
  }, [formData]); // Dangerous!
}
```

## 3.4 useActionState Hook (React 19+)

**RULE:** Use `useActionState` (formerly `useFormState`) to integrate Server Actions with forms for automatic pending state management.

**✅ DO:**
```typescript
"use client";

import { ReactNode, useActionState } from "react";
import { createPost } from "@/app/actions/posts";

export function CreatePostForm(): ReactNode {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: unknown, formData: FormData) => {
      try {
        const result = await createPost({
          title: formData.get("title") as string,
          content: formData.get("content") as string,
        });
        return { success: true, postId: result.id };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
      }
    },
    null
  );
  
  return (
    <form action={formAction}>
      <input name="title" required />
      <textarea name="content" required />
      {state?.error && <p className="error">{state.error}</p>}
      {state?.success && <p className="success">Post created!</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create"}
      </button>
    </form>
  );
}
```

## 3.5 useFormStatus Hook (React 19+)

**RULE:** Use `useFormStatus` to access form submission state without prop drilling.

**✅ DO:**
```typescript
"use client";

import { ReactNode, useFormStatus } from "react";

export function SubmitButton(): ReactNode {
  const { pending } = useFormStatus();
  
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Submitting..." : "Submit"}
    </button>
  );
}

// In form
export function MyForm(): ReactNode {
  return (
    <form action={submitAction}>
      <input name="email" />
      <SubmitButton />
    </form>
  );
}
```

## 3.6 useOptimistic Hook (React 19+)

**RULE:** Use `useOptimistic` for immediate UI feedback on mutations while waiting for server confirmation.

**✅ DO:**
```typescript
"use client";

import { ReactNode, useOptimistic } from "react";
import { addTodoAction } from "@/app/actions/todos";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

interface TodoListProps {
  initialTodos: Todo[];
}

export function TodoList({ initialTodos }: TodoListProps): ReactNode {
  const [todos, addOptimisticTodo] = useOptimistic(
    initialTodos,
    (state: Todo[], newTodo: Todo) => [...state, newTodo]
  );
  
  const handleAddTodo = async (title: string) => {
    // Optimistic update - immediate UI feedback
    const tempId = crypto.randomUUID();
    addOptimisticTodo({
      id: tempId,
      title,
      completed: false,
    });
    
    // Server action performs actual mutation
    const result = await addTodoAction(title);
  };
  
  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  );
}
```

## 3.7 Streaming & Suspense

**RULE:** Use Suspense boundaries with Server Components to stream content progressively and improve perceived performance.

**✅ DO:**
```typescript
import { Suspense, ReactNode } from "react";
import { fetchUser } from "@/lib/api";

function UserSkeleton(): ReactNode {
  return <div className="skeleton-user">Loading user...</div>;
}

async function UserData({ userId }: { userId: string }): Promise<ReactNode> {
  const user = await fetchUser(userId);
  return <div>{user.name}</div>;
}

export function UserProfile({ userId }: { userId: string }): ReactNode {
  return (
    <Suspense fallback={<UserSkeleton />}>
      <UserData userId={userId} />
    </Suspense>
  );
}
```

---

[← Back to React Architecture](./03-react-architecture.md) | [Next: State Management →](./05-state-management.md)
