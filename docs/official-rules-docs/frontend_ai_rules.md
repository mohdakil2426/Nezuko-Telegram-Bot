# Frontend AI Coding Rulebook
## Production-Grade TypeScript + Next.js 16 + React 19 + Tailwind CSS 4

**Last Updated:** January 2026  
**Stack Target:** Next.js 16+ (App Router), React 19+, TypeScript 5.9+, Tailwind CSS 4, shadcn/ui, Zustand, TanStack Query, react-hook-form, Zod  
**Scope:** AI-assisted frontend development for production-grade, high-scale web applications

---

## TABLE OF CONTENTS

1. [TypeScript & Type Safety](#1-typescript--type-safety)
2. [React Architecture & Component Design](#2-react-architecture--component-design)
3. [React Server Components (RSC) & Server Actions](#3-react-server-components-rsc--server-actions)
4. [State Management](#4-state-management)
5. [Data Fetching & Server-State Management](#5-data-fetching--server-state-management)
6. [Form Handling & Validation](#6-form-handling--validation)
7. [Styling & Design System](#7-styling--design-system)
8. [Performance & Rendering Optimization](#8-performance--rendering-optimization)
9. [Accessibility (a11y)](#9-accessibility-a11y)
10. [Security Best Practices](#10-security-best-practices)
11. [Error Handling & Error Boundaries](#11-error-handling--error-boundaries)
12. [Testing Strategy](#12-testing-strategy)
13. [Code Organization & Scalability](#13-code-organization--scalability)
14. [Forbidden Patterns & Anti-Patterns](#14-forbidden-patterns--anti-patterns)
15. [Configuration & Environment Management](#15-configuration--environment-management)

---

## 1. TypeScript & Type Safety

### 1.1 TypeScript Configuration - REQUIRED

**RULE:** All TypeScript projects MUST use **strict mode enabled** in `tsconfig.json`.

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "types": ["node", "jest", "@testing-library/jest-dom"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**WHY:** Strict mode catches entire categories of bugs at compile time. It forces explicit type annotations, null/undefined handling, and prevents implicit `any` types that undermine type safety.

### 1.2 Explicit Type Annotations

**RULE:** NEVER use implicit `any`. Always provide explicit types for:
- Function parameters
- Function return types
- Component props
- State variables
- Hook returns

**✅ DO:**
```typescript
interface UserData {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

function fetchUser(userId: string): Promise<UserData> {
  return fetch(`/api/users/${userId}`).then(r => r.json());
}

const Component = ({ user }: { user: UserData }): ReactNode => {
  return <div>{user.name}</div>;
};
```

**❌ DON'T:**
```typescript
// Implicit any parameters
function fetchUser(userId) {
  return fetch(`/api/users/${userId}`).then(r => r.json());
}

// Implicit any return type
const Component = ({ user }) => {
  return <div>{user.name}</div>;
};

// No type for state
const [data, setData] = useState();
```

### 1.3 Strict Null Checks

**RULE:** Always handle `null` and `undefined` explicitly. Never assume a value is not null.

**✅ DO:**
```typescript
interface User {
  id: string;
  name: string;
  email: string | null; // Nullable type explicitly marked
}

function displayUser(user: User | null): ReactNode {
  if (!user) {
    return <div>No user found</div>;
  }
  
  return (
    <div>
      <h1>{user.name}</h1>
      {user.email && <p>{user.email}</p>}
    </div>
  );
}

// Using optional chaining
const email = user?.email ?? "no-email";

// Using nullish coalescing
const displayName = user?.name ?? "Anonymous";
```

**❌ DON'T:**
```typescript
interface User {
  id: string;
  name: string;
  email: string; // Hiding nullable possibility
}

function displayUser(user: User) {
  // Assumes user is not null - unsafe!
  return <h1>{user.name}</h1>;
}

// No null check
const email = user.email; // Could be undefined
```

### 1.4 Type Inference & Explicit Annotations

**RULE:** Use type inference where it's clear, but ALWAYS provide explicit annotations for:
- Public function/component APIs
- Complex return types
- Module exports
- Props interfaces

**✅ DO:**
```typescript
// Explicit for public API
export interface ButtonProps {
  variant: "primary" | "secondary" | "outline";
  size: "sm" | "md" | "lg";
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  disabled?: boolean;
}

export const Button = ({
  variant,
  size,
  onClick,
  children,
  disabled = false,
}: ButtonProps): ReactNode => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant} btn-${size}`}
    >
      {children}
    </button>
  );
};

// Inference OK for local variables
const count = 0; // Inferred as number
const isActive = true; // Inferred as boolean
const items = []; // Should be items: T[] or items: string[] - EXPLICIT!
```

**❌ DON'T:**
```typescript
// No types on public API
export const Button = ({ variant, size, onClick, children, disabled }) => {
  return <button onClick={onClick}>{children}</button>;
};

// Implicit any
const items = []; // Any type array - dangerous!

// Missing return type
export function fetchData(id) {
  return fetch(`/api/${id}`).then(r => r.json());
}
```

### 1.5 Discriminated Unions & Literal Types

**RULE:** Use discriminated unions and literal types for type-safe state and API responses.

**✅ DO:**
```typescript
// Type-safe response handling
type ApiResponse<T> =
  | { status: "pending"; data: null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: null; error: Error };

function handleResponse<T>(response: ApiResponse<T>): ReactNode {
  switch (response.status) {
    case "pending":
      return <div>Loading...</div>;
    case "success":
      return <div>{JSON.stringify(response.data)}</div>;
    case "error":
      return <div>Error: {response.error.message}</div>;
  }
}

// Discriminated union for form states
type FormState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; data: string }
  | { type: "error"; message: string };

function renderForm(state: FormState): ReactNode {
  if (state.type === "success") {
    return <div>Success! {state.data}</div>;
  }
  return null;
}
```

**❌ DON'T:**
```typescript
// Loose typing - error prone
type ApiResponse = {
  status: string;
  data: any;
  error: any;
};

// No discriminant - confusing
type FormState = {
  isLoading?: boolean;
  error?: string;
  data?: string;
};
```

---

## 2. React Architecture & Component Design

### 2.1 Functional Components ONLY

**RULE:** Use **functional components exclusively**. Class components are FORBIDDEN in new code.

**✅ DO:**
```typescript
import { ReactNode } from "react";

interface CardProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export const Card = ({ title, description, children }: CardProps): ReactNode => {
  return (
    <div className="rounded-lg border p-4">
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
};
```

**❌ DON'T:**
```typescript
// Class components - FORBIDDEN
class Card extends React.Component {
  render() {
    return <div>{this.props.title}</div>;
  }
}
```

### 2.2 Component Boundaries & Composition

**RULE:** Every component MUST have a **single, well-defined responsibility**. Use composition over inheritance.

**Core Principles:**
- **Lift content up** - If a component doesn't influence HOW a child is rendered (just renders it in a slot), move rendering up to parent
- **Push state down** - Global state consumption should be as close as possible to components rendering that state
- **Tightly-coupled components are FORBIDDEN** - Components should not depend on sibling component APIs

**✅ DO:**
```typescript
// Parent controls WHAT is rendered
interface WeatherDisplayProps {
  temperature: number;
  status: "sunny" | "rainy" | "cloudy";
  dateContent: ReactNode; // Slot for date
  forecastContent: ReactNode; // Slot for forecast
}

export const WeatherDisplay = ({
  temperature,
  status,
  dateContent,
  forecastContent,
}: WeatherDisplayProps): ReactNode => {
  return (
    <div>
      <h2>{temperature}°</h2>
      <p>{status}</p>
      <div>{dateContent}</div>
      <div>{forecastContent}</div>
    </div>
  );
};

// Parent composes with specific content
export const CurrentWeatherPage = (): ReactNode => {
  const currentUser = useCurrentUser();
  const dateString = new Date().toLocaleDateString();
  
  return (
    <WeatherDisplay
      temperature={72}
      status="sunny"
      dateContent={<p>{dateString}</p>}
      forecastContent={<DailyForecast />}
    />
  );
};
```

**❌ DON'T:**
```typescript
// Tightly coupled - WeatherDisplay depends on UpsellPopover API
const WeatherDisplay = ({ temperature, status }) => {
  return (
    <div>
      <h2>{temperature}°</h2>
      {/* Any change to UpsellPopover prop requires change here */}
      <UpsellPopover kind="weather-widget" />
    </div>
  );
};

// State at wrong level - consuming global state too early
const ParentComponent = () => {
  const globalState = useGlobalStore();
  
  return (
    <Child1 data={globalState.data} />
    <Child2 data={globalState.data} />
    <Child3 data={globalState.data} />
  );
};
```

### 2.3 Props Interface Design

**RULE:** All component props MUST be defined in a `Props` interface. Use `React.ComponentProps<T>` for HTML elements only when extending built-in components.

**✅ DO:**
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: "primary" | "secondary" | "outline";
  size: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = ({
  variant,
  size,
  isLoading = false,
  children,
  ...htmlProps
}: ButtonProps): ReactNode => {
  return (
    <button
      {...htmlProps}
      className={`btn btn-${variant} btn-${size}`}
      disabled={isLoading || htmlProps.disabled}
    >
      {isLoading ? "Loading..." : children}
    </button>
  );
};

// For custom components
interface AlertProps {
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  onDismiss: () => void;
}

export const Alert = ({ type, title, message, onDismiss }: AlertProps): ReactNode => {
  return (
    <div role="alert" className={`alert alert-${type}`}>
      <h3>{title}</h3>
      <p>{message}</p>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  );
};
```

**❌ DON'T:**
```typescript
// No Props interface
export const Button = ({ variant, size, children, ...rest }) => {
  return <button {...rest}>{children}</button>;
};

// Mixing HTML props with custom props unsafely
interface ButtonProps {
  variant: string;
  size: any;
  onClick?: any;
  className?: any;
}
```

### 2.4 Refs & forwardRef

**RULE:** Functional components can now accept refs as standard props directly (React 19+). Use `forwardRef` only for libraries that require class component compatibility.

**✅ DO (React 19+):**
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  ref?: React.Ref<HTMLInputElement>;
}

// Refs are now regular props!
export const Input = ({
  label,
  error,
  ref,
  ...inputProps
}: InputProps): ReactNode => {
  return (
    <div>
      <label>{label}</label>
      <input ref={ref} {...inputProps} />
      {error && <span className="error">{error}</span>}
    </div>
  );
};

// Usage
const inputRef = useRef<HTMLInputElement>(null);
<Input ref={inputRef} label="Name" />;
```

**⚠️ LEGACY (use only if required):**
```typescript
// Only if you need forwardRef for compatibility
export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string }
>(({ label, ...props }, ref) => (
  <input ref={ref} {...props} />
));

Input.displayName = "Input";
```

### 2.5 Children & Slots

**RULE:** Use proper TypeScript types for children. Accept `ReactNode` for flexible content slots.

**✅ DO:**
```typescript
interface LayoutProps {
  children: ReactNode; // Any valid React content
}

interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode; // Render prop pattern
}

interface DialogProps {
  title: string;
  description: string;
  trigger: ReactNode;
  content: ReactNode;
  footer?: ReactNode;
}

// Compound component pattern
interface TabsProps {
  children: React.ReactElement<TabProps>[];
}

interface TabProps {
  label: string;
  children: ReactNode;
}
```

**❌ DON'T:**
```typescript
// Any type for children
interface ComponentProps {
  children: any;
}

// FC shorthand (deprecated in React 18+)
const Component: FC = ({ children }) => {
  return <div>{children}</div>;
};

// No type for render props
interface ListProps {
  items: any[];
  renderItem: any; // Unsafe!
}
```

---

## 3. React Server Components (RSC) & Server Actions

### 3.1 Server Components - Default Behavior

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

### 3.2 Client Components - "use client" Directive

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

### 3.3 Server Actions - Form Submissions & Mutations

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

### 3.4 useActionState Hook (React 19+)

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

### 3.5 useFormStatus Hook (React 19+)

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

### 3.6 useOptimistic Hook (React 19+)

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

### 3.7 Streaming & Suspense

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

## 4. State Management

### 4.1 State Hierarchy & Layer Selection

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
    const users = await fetch("/api/users").then(r => r.json());
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

---

## 6. Form Handling & Validation

### 6.1 react-hook-form + Zod Integration

**RULE:** Always use **react-hook-form** with **Zod** for form handling and validation. Form data MUST be validated on both client and server.

**Architecture:**
1. Define Zod schema (source of truth)
2. Use `useForm` with Zod resolver
3. Server Action performs same validation
4. Type-safe throughout

**✅ DO:**
```typescript
// lib/schemas/user.ts
import { z } from "zod";

export const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  bio: z.string().max(500).optional(),
  preferences: z.object({
    newsletter: z.boolean().default(true),
    notifications: z.boolean().default(true),
  }),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// app/actions/user.ts
"use server";

import { revalidatePath } from "next/cache";
import { updateUserSchema } from "@/lib/schemas/user";

export async function updateUser(input: UpdateUserInput) {
  // Server-side validation
  const validated = updateUserSchema.parse(input);
  
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");
  
  // Update database
  const updatedUser = await db.user.update({
    where: { id: session.user.id },
    data: validated,
  });
  
  revalidatePath("/settings");
  return updatedUser;
}

// app/settings/edit-profile-form.tsx
"use client";

import { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateUserSchema, type UpdateUserInput } from "@/lib/schemas/user";
import { updateUser } from "@/app/actions/user";

export function EditProfileForm(): ReactNode {
  const form = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: "",
      email: "",
      bio: "",
      preferences: {
        newsletter: true,
        notifications: true,
      },
    },
  });
  
  const onSubmit = async (data: UpdateUserInput) => {
    try {
      await updateUser(data);
      form.reset(data);
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Something went wrong",
      });
    }
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label>Name</label>
        <input
          {...form.register("name")}
          type="text"
          className={form.formState.errors.name ? "error" : ""}
        />
        {form.formState.errors.name && (
          <span className="error">{form.formState.errors.name.message}</span>
        )}
      </div>
      
      <div>
        <label>Email</label>
        <input {...form.register("email")} type="email" />
        {form.formState.errors.email && (
          <span className="error">{form.formState.errors.email.message}</span>
        )}
      </div>
      
      <div>
        <label>Bio</label>
        <textarea {...form.register("bio")} />
      </div>
      
      <div>
        <label>
          <input {...form.register("preferences.newsletter")} type="checkbox" />
          Subscribe to newsletter
        </label>
      </div>
      
      {form.formState.errors.root && (
        <div className="error">{form.formState.errors.root.message}</div>
      )}
      
      <button
        type="submit"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
```

**❌ DON'T:**
```typescript
// Manual validation
const [errors, setErrors] = useState({});
const handleSubmit = (e) => {
  if (!email.includes("@")) setErrors({ email: "Invalid" });
  // No server validation!
};

// Validation on client only
if (!name || name.length < 1) {
  return <span>Name required</span>;
}
// Server doesn't validate - security risk!

// Multiple sources of truth
const schema = z.object({ email: z.string().email() });
// And in form... different validation logic
```

### 6.2 Form State Management

**RULE:** Use `react-hook-form`'s built-in state. Don't duplicate form state in Zustand or useState.

**✅ DO:**
```typescript
const form = useForm<FormData>({
  resolver: zodResolver(schema),
});

// Access everything from form object
form.formState.isSubmitting
form.formState.isValid
form.formState.isDirty
form.formState.errors
form.watch() // Subscribe to changes
form.setValue() // Update values programmatically
```

**❌ DON'T:**
```typescript
// Duplicating state
const form = useForm<FormData>({ ... });
const [isSubmitting, setIsSubmitting] = useState(false);
useEffect(() => {
  setIsSubmitting(form.formState.isSubmitting);
}, [form.formState.isSubmitting]);

// Storing form data in global state
const { formData, setFormData } = useFormStore();
const form = useForm({ defaultValues: formData });
```

---

## 7. Styling & Design System

### 7.1 Tailwind CSS 4 Configuration

**RULE:** Use **Tailwind CSS v4** with **Oxide engine** for optimal performance. Configure CSS-first with native cascade layers.

**tsconfig.json / tailwind.config.ts:**
```typescript
import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Use CSS variables for theming
        "primary": "var(--color-primary)",
        "secondary": "var(--color-secondary)",
        "accent": "var(--color-accent)",
        "background": "var(--color-background)",
        "foreground": "var(--color-foreground)",
      },
      spacing: {
        "13": "3.25rem",
        "15": "3.75rem",
      },
      typography: {
        DEFAULT: {
          css: {
            "line-height": "1.6",
            "font-size": "1rem",
          },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
```

**CSS Variables in globals.css:**
```css
@layer base {
  :root {
    /* Light mode */
    --color-primary: rgb(59 130 246); /* blue-500 */
    --color-secondary: rgb(107 114 128); /* gray-500 */
    --color-accent: rgb(168 85 247); /* purple-500 */
    --color-background: rgb(255 255 255);
    --color-foreground: rgb(17 24 39);
    --color-border: rgb(229 231 235);
    --color-muted: rgb(107 114 128);
    --color-muted-foreground: rgb(75 85 99);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      /* Dark mode */
      --color-primary: rgb(96 165 250); /* blue-400 */
      --color-secondary: rgb(156 163 175); /* gray-400 */
      --color-accent: rgb(196 181 253); /* purple-300 */
      --color-background: rgb(17 24 39);
      --color-foreground: rgb(243 244 246);
      --color-border: rgb(55 65 81);
      --color-muted: rgb(107 114 128);
      --color-muted-foreground: rgb(156 163 175);
    }
  }
}

@layer components {
  .btn-primary {
    @apply px-4 py-2 rounded-lg bg-primary text-white font-medium hover:opacity-90 transition;
  }

  .card {
    @apply rounded-lg border border-border bg-background p-4 shadow-sm;
  }
}
```

### 7.2 shadcn/ui Component Library

**RULE:** Use **shadcn/ui** for production-grade, accessible UI components. Extend components in your codebase, don't fork them.

**Structure:**
```
src/
├── components/
│   ├── ui/
│   │   ├── button.tsx (from shadcn/ui, customized)
│   │   ├── input.tsx
│   │   ├── form.tsx
│   │   └── ...
│   ├── forms/
│   │   ├── login-form.tsx
│   │   └── profile-form.tsx
│   ├── layout/
│   │   ├── header.tsx
│   │   └── sidebar.tsx
│   └── ...
```

**✅ DO:**
```typescript
// src/components/ui/button.tsx (customized from shadcn/ui)
import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost"
  size?: "default" | "sm" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "default" && "bg-primary text-white hover:bg-primary/90",
        variant === "outline" && "border border-border hover:bg-secondary/50",
        size === "sm" && "h-8 px-3 text-sm",
        size === "default" && "h-10 px-4",
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Button.displayName = "Button"

export { Button }

// src/components/forms/login-form.tsx (using shadcn/ui components)
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";

export function LoginForm(): ReactNode {
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input
        {...form.register("email")}
        placeholder="Email"
        type="email"
      />
      <Button type="submit">Sign In</Button>
    </form>
  );
}
```

### 7.3 CSS-in-JS & Styled Components - FORBIDDEN

**RULE:** NEVER use CSS-in-JS libraries (styled-components, emotion, etc.). Use Tailwind CSS exclusively.

**✅ DO:**
```typescript
// Tailwind only
export const Card = ({ children }: { children: ReactNode }): ReactNode => (
  <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
    {children}
  </div>
);
```

**❌ DON'T:**
```typescript
// Styled components - FORBIDDEN
import styled from "styled-components";

const StyledCard = styled.div`
  border-radius: 8px;
  border: 1px solid #ccc;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
`;

export const Card = ({ children }) => (
  <StyledCard>{children}</StyledCard>
);
```

### 7.4 Dark Mode Support

**RULE:** Support dark mode using Tailwind's `dark:` prefix and CSS variables. Detect via `prefers-color-scheme` media query.

**✅ DO:**
```typescript
// globals.css
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: rgb(17 24 39);
    --color-foreground: rgb(243 244 246);
  }
}

// Component with dark support
export const Card = ({ children }: { children: ReactNode }): ReactNode => (
  <div className="rounded-lg border border-border bg-background text-foreground dark:bg-slate-950 dark:text-slate-50">
    {children}
  </div>
);
```

---

## 8. Performance & Rendering Optimization

### 8.1 Code Splitting & Dynamic Imports

**RULE:** Use dynamic imports with `React.lazy()` and Suspense for large components to reduce initial bundle size.

**✅ DO:**
```typescript
import { lazy, Suspense, ReactNode } from "react";

const HeavyChart = lazy(() => import("@/components/heavy-chart"));
const AdminPanel = lazy(() => import("@/components/admin-panel"));

export function Dashboard(): ReactNode {
  return (
    <div>
      <h1>Dashboard</h1>
      
      <Suspense fallback={<div>Loading chart...</div>}>
        <HeavyChart />
      </Suspense>
      
      {isAdmin && (
        <Suspense fallback={<div>Loading admin panel...</div>}>
          <AdminPanel />
        </Suspense>
      )}
    </div>
  );
}
```

**❌ DON'T:**
```typescript
// Import everything upfront
import HeavyChart from "@/components/heavy-chart";
import AdminPanel from "@/components/admin-panel";

// All code downloaded immediately, even if unused
```

### 8.2 Memoization - Selective Use

**RULE:** Use `useMemo` and `useCallback` ONLY when:
1. Component is in a performance profile showing re-render issues
2. Expensive computation or dependency has changed
3. Preventing re-render of memoized child components

**DO NOT memoize prematurely.** Profile first.

**✅ DO:**
```typescript
"use client";

import { useMemo, useCallback, ReactNode } from "react";

interface ListProps {
  items: string[];
  onItemClick: (id: string) => void;
}

export function List({ items, onItemClick }: ListProps): ReactNode {
  // Only memoize if items array is unstable (e.g., filter result)
  const sortedItems = useMemo(() => {
    return [...items].sort();
  }, [items]);
  
  // Memoize callback to prevent child re-renders
  const handleClick = useCallback((id: string) => {
    onItemClick(id);
  }, [onItemClick]);
  
  return (
    <ul>
      {sortedItems.map((item) => (
        <ListItem key={item} item={item} onClick={handleClick} />
      ))}
    </ul>
  );
}

interface ListItemProps {
  item: string;
  onClick: (id: string) => void;
}

// Memoized to prevent unnecessary re-renders
export const ListItem = React.memo(
  ({ item, onClick }: ListItemProps): ReactNode => (
    <li onClick={() => onClick(item)}>{item}</li>
  )
);
```

**❌ DON'T:**
```typescript
// Premature memoization without profiling
const expensiveComputation = useMemo(() => {
  return items.length; // Simple operation - no memoization needed!
}, [items]);

// Memoizing everything - unnecessary overhead
const greeting = useMemo(() => `Hello ${name}`, [name]);

// useCallback for every callback - defeats the purpose
const handleClick = useCallback(() => {
  console.log("clicked");
}, []); // Not preventing re-renders
```

### 8.3 Image Optimization

**RULE:** Always use **Next.js Image component** for optimization. Never use `<img>` tags.

**✅ DO:**
```typescript
import Image from "next/image";
import { ReactNode } from "react";

export function HeroImage(): ReactNode {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero section showing product features"
      width={1200}
      height={600}
      priority // For above-the-fold images only
      placeholder="blur" // Blur while loading
      blurDataURL="data:image/..." // Optional pre-calculated blur
      quality={75}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 100vw"
    />
  );
}
```

**❌ DON'T:**
```typescript
// Standard HTML img - no optimization
<img src="/hero.jpg" alt="Hero" />

// Incorrect Image usage - missing alt, width/height
<Image src="/hero.jpg" />

// Using external URLs without optimization
<Image src="https://example.com/image.jpg" width={100} height={100} />
```

### 8.4 Rendering Performance - Composition Over Memoization

**RULE:** Use **component composition** to prevent unnecessary re-renders instead of memoization. Lift state up and pass content as props (children/slots).

**✅ DO:**
```typescript
// Parent manages state, child is simple/stateless
"use client";

interface ExpensiveListProps {
  items: Item[];
  expandedId: string;
  onExpandChange: (id: string) => void;
}

export function ExpensiveList({
  items,
  expandedId,
  onExpandChange,
}: ExpensiveListProps): ReactNode {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          <button onClick={() => onExpandChange(item.id)}>
            {item.name}
          </button>
          {expandedId === item.id && <ItemDetails item={item} />}
        </li>
      ))}
    </ul>
  );
}

// Simple, pure component - no re-render issues
function ItemDetails({ item }: { item: Item }): ReactNode {
  return <div>{item.description}</div>;
}

// Usage
"use client";
export function Page(): ReactNode {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  return (
    <ExpensiveList
      items={items}
      expandedId={expandedId ?? ""}
      onExpandChange={setExpandedId}
    />
  );
}
```

**❌ DON'T:**
```typescript
// Pushing state down - causes child re-renders
interface ListProps {
  items: Item[];
}

export function List({ items }: ListProps): ReactNode {
  return (
    <ul>
      {items.map((item) => (
        <ListItem key={item.id} item={item} /> // Causes re-render on parent state change
      ))}
    </ul>
  );
}

function ListItem({ item }: { item: Item }): ReactNode {
  const [isExpanded, setIsExpanded] = useState(false); // Local state causes re-render
  return <li>{item.name}</li>;
}
```

---

## 9. Accessibility (a11y)

### 9.1 Semantic HTML

**RULE:** Use semantic HTML elements. Never use `<div>` or `<span>` for interactive elements.

**✅ DO:**
```typescript
export function Navigation(): ReactNode {
  return (
    <header>
      <nav aria-label="Main navigation">
        <ul>
          <li><a href="/home">Home</a></li>
          <li><a href="/about">About</a></li>
        </ul>
      </nav>
    </header>
  );
}

export function Article({ title, content }: { title: string; content: ReactNode }): ReactNode {
  return (
    <article>
      <h1>{title}</h1>
      <section>{content}</section>
    </article>
  );
}

export function FormExample(): ReactNode {
  return (
    <form>
      <fieldset>
        <legend>Contact Information</legend>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" />
      </fieldset>
    </form>
  );
}
```

**❌ DON'T:**
```typescript
// Using divs for semantic elements
<div onClick={handleNav} className="nav">
  <div className="nav-item">Home</div>
</div>

// Unclear structure
<div>
  <div className="heading">Title</div>
  <div>{content}</div>
</div>
```

### 9.2 ARIA & Accessibility Attributes

**RULE:** Use ARIA attributes where semantic HTML doesn't suffice. Properly label all interactive elements.

**✅ DO:**
```typescript
// Button with tooltip
<button
  aria-label="Close dialog"
  aria-describedby="close-button-tooltip"
  onClick={onClose}
>
  ✕
</button>
<div id="close-button-tooltip" role="tooltip">
  Close (Esc)
</div>

// Alert dialog
<div
  role="alertdialog"
  aria-labelledby="alert-title"
  aria-describedby="alert-description"
>
  <h2 id="alert-title">Confirm deletion</h2>
  <p id="alert-description">
    This action cannot be undone.
  </p>
</div>

// Live region for notifications
<div aria-live="polite" aria-atomic="true">
  {message && <p>{message}</p>}
</div>

// Form validation
<input
  aria-invalid={!!errors.email}
  aria-describedby="email-error"
  type="email"
/>
{errors.email && (
  <span id="email-error" role="alert">
    {errors.email}
  </span>
)}
```

**❌ DON'T:**
```typescript
// No aria labels on icon buttons
<button onClick={closeDialog}>✕</button>

// Unclear ARIA usage
<div aria-hidden="true">{importantContent}</div>

// Missing form labels
<input type="email" placeholder="Email" />
```

### 9.3 Keyboard Navigation

**RULE:** All interactive elements MUST be keyboard accessible. Test with Tab key navigation.

**✅ DO:**
```typescript
export function Modal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }): ReactNode {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Dialog title"
      onKeyDown={handleKeyDown}
    >
      <h2>Dialog Title</h2>
      <p>Content</p>
      <button onClick={onClose}>Close (Esc)</button>
    </div>
  );
}

// Tab trap in modal - keep focus within dialog
export function useFocusTrap(ref: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        if (e.shiftKey && document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    element.addEventListener("keydown", handleKeyDown);
    return () => element.removeEventListener("keydown", handleKeyDown);
  }, [ref]);
}
```

**❌ DON'T:**
```typescript
// Non-semantic interactive elements
<div onClick={handleClick} className="button">
  Click me
</div>

// Untrappable focus in modal
<dialog>
  <button>Close</button>
  {/* Focus can escape */}
</dialog>
```

### 9.4 Color & Contrast

**RULE:** Maintain WCAG AA minimum contrast ratio of 4.5:1 for text, 3:1 for UI components. Never use color alone to convey information.

**✅ DO:**
```typescript
// Use dark text on light background
<div className="bg-white text-gray-900">
  {/* Sufficient contrast */}
</div>

// Use icons + text together
<button className="flex items-center gap-2">
  <ErrorIcon />
  <span>Error</span>
</button>

// Visual + aria indication
<input
  aria-invalid={hasError}
  aria-describedby="error-message"
  className={hasError ? "ring-red-500" : ""}
/>
```

**❌ DON'T:**
```typescript
// Low contrast text
<span className="text-gray-400 bg-gray-500">Low contrast</span>

// Color only - not visible to colorblind users
<div className="bg-red-500">Error</div> {/* No text indicator */}

// No focus indicator
<button className="outline-none">Click me</button>
```

### 9.5 Alt Text for Images

**RULE:** Every image MUST have descriptive alt text. Use Next.js Image component's alt prop.

**✅ DO:**
```typescript
// Descriptive alt text
<Image
  src="/product.jpg"
  alt="Red wireless headphones with noise-cancellation feature"
  width={400}
  height={300}
/>

// Decorative images
<Image
  src="/divider.svg"
  alt="" // Empty alt for purely decorative images
  width={400}
  height={1}
  aria-hidden="true"
/>
```

**❌ DON'T:**
```typescript
// No alt text
<Image src="/product.jpg" width={400} height={300} />

// Useless alt text
<Image src="/product.jpg" alt="image" width={400} height={300} />

// Redundant alt text
<figure>
  <Image src="/product.jpg" alt="Product image" width={400} height={300} />
  <figcaption>Our new product</figcaption> {/* Repeats image info */}
</figure>
```

---

## 10. Security Best Practices

### 10.1 XSS Prevention

**RULE:** Never use `dangerouslySetInnerHTML`. React auto-escapes text content by default.

**✅ DO:**
```typescript
// React auto-escapes - safe
const userContent = "<script>alert('XSS')</script>";
export function SafeContent(): ReactNode {
  return <div>{userContent}</div>; // Rendered as text, not executed
}

// Use libraries for HTML content
import DOMPurify from "isomorphic-dompurify";

export function RichTextContent({ html }: { html: string }): ReactNode {
  const cleanHtml = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
}

// Use marked for markdown
import { marked } from "marked";

export function MarkdownContent({ md }: { md: string }): ReactNode {
  const html = marked(md);
  const clean = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

**❌ DON'T:**
```typescript
// XSS vulnerability
const userContent = req.query.content;
return <div dangerouslySetInnerHTML={{ __html: userContent }} />;

// Trusting unvalidated input
return <div>{eval(userCode)}</div>;

// Constructing HTML strings
const html = "<div>" + userInput + "</div>";
```

### 10.2 CSRF Protection

**RULE:** Use Server Actions (they have automatic CSRF protection) or implement CSRF tokens manually for API routes.

**✅ DO:**
```typescript
// Server Actions - automatic CSRF protection
"use server";

export async function updateProfile(formData: FormData) {
  // No need for CSRF token - Next.js handles it
  const name = formData.get("name");
  // Process mutation
}

// API route with CSRF token
// middleware.ts
export const middleware = (request: NextRequest) => {
  const nonce = crypto.randomUUID();
  const response = NextResponse.next();
  response.headers.set("X-CSRF-Token", nonce);
  return response;
};

// app/api/profile/route.ts
export async function POST(request: Request) {
  const csrfToken = request.headers.get("X-CSRF-Token");
  const storedToken = await getStoredToken(request);
  
  if (csrfToken !== storedToken) {
    return new Response("CSRF token invalid", { status: 403 });
  }
  
  // Process mutation
}

// Client sending CSRF token
const response = await fetch("/api/profile", {
  method: "POST",
  headers: {
    "X-CSRF-Token": csrfToken,
  },
  body: JSON.stringify(data),
});
```

**❌ DON'T:**
```typescript
// Using GET for mutations - enables CSRF attacks
app.get("/api/delete-user/:id", (req, res) => {
  // Anyone can make you click a link that deletes your account!
});

// No CSRF protection on POST
app.post("/api/transfer-money", (req, res) => {
  // Vulnerable to CSRF
});
```

### 10.3 Input Validation & Sanitization

**RULE:** **Always validate on the server**. Validate with Zod in Server Actions and API routes.

**✅ DO:**
```typescript
// app/actions/user.ts
"use server";

import { z } from "zod";

const updateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().min(18).max(120),
});

export async function updateUser(input: unknown) {
  // Validate BEFORE using any data
  const validated = updateUserSchema.parse(input);
  
  // Use validated data safely
  await db.user.update({
    where: { id: getCurrentUserId() },
    data: validated,
  });
}

// API route validation
// app/api/users/route.ts
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email().toLowerCase(),
  name: z.string().trim().min(1).max(100),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const body = await request.json();
  
  try {
    const validated = createUserSchema.parse(body);
    // Safe to use validated
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { errors: error.errors },
        { status: 400 }
      );
    }
  }
}
```

**❌ DON'T:**
```typescript
// No server validation
"use client";
const [email, setEmail] = useState("");

// Only client validation - easily bypassed
if (!email.includes("@")) {
  return <span>Invalid email</span>;
}

await fetch("/api/users", {
  method: "POST",
  body: JSON.stringify({ email }), // Unvalidated!
});

// Trusting client validation
app.post("/api/users", (req, res) => {
  // Assume email is valid because client validated
  db.user.create({ email: req.body.email }); // What if it's malicious?
});
```

### 10.4 Environment Variables & Secrets

**RULE:** Never expose secrets in client code. Use `.env.local` for server secrets only.

**✅ DO:**
```typescript
// .env.local (server only)
DATABASE_URL=postgresql://...
API_SECRET=abc123...
JWT_SECRET=xyz789...
STRIPE_SECRET_KEY=sk_...

// .env.public (safe to expose)
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_...

// app/actions/payment.ts - Server Action
"use server";

export async function processPayment(amount: number) {
  // Safe to use server-only secrets
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  return stripe.paymentIntents.create({ amount });
}

// Client can access public variables
const stripe = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);
```

**❌ DON'T:**
```typescript
// Expose secrets in NEXT_PUBLIC_ variables
NEXT_PUBLIC_API_SECRET=secret123 // VISIBLE IN CLIENT!

// Use secrets in client components
"use client";
const apiSecret = process.env.API_SECRET; // undefined in client!

// Hardcode secrets
const dbUrl = "postgresql://user:password@localhost";
```

### 10.5 Authentication & Authorization

**RULE:** Implement authentication and check authorization on EVERY mutation.

**✅ DO:**
```typescript
// app/actions/posts.ts
"use server";

import { getSession } from "@/lib/auth";

export async function deletePost(postId: string) {
  const session = await getSession();
  
  // 1. Check authentication
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  
  // 2. Check authorization
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });
  
  if (post.authorId !== session.user.id) {
    throw new Error("Forbidden - not post author");
  }
  
  // 3. Only then perform mutation
  await db.post.delete({ where: { id: postId } });
}

// middleware.ts - protect routes
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const protectedPaths = ["/dashboard", "/settings", "/admin"];
  
  if (protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path))) {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }
  
  return NextResponse.next();
}
```

**❌ DON'T:**
```typescript
// No authentication check
"use server";
export async function deletePost(postId: string) {
  await db.post.delete({ where: { id: postId } }); // Anyone can delete!
}

// Client-side only authentication
"use client";
if (localStorage.getItem("token")) {
  // Not secure - tokens are visible in client
}

// No authorization check
export async function updateUser(userId: string, data: any) {
  // Anyone can update anyone else's data!
  await db.user.update({ where: { id: userId }, data });
}
```

---

## 11. Error Handling & Error Boundaries

### 11.1 Error Boundaries

**RULE:** Use Error Boundaries to catch rendering errors and prevent white screens.

**✅ DO:**
```typescript
// app/error.tsx - Page-level error boundary
"use client";

import { ReactNode } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <p className="text-gray-600 mb-8">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-white rounded-lg"
      >
        Try again
      </button>
    </div>
  );
}

// Global error boundary
// app/global-error.tsx
"use client";

export default function GlobalError({ error, reset }: ErrorProps): ReactNode {
  return (
    <html>
      <body>
        <h2>Application Error</h2>
        <button onClick={reset}>Reset</button>
      </body>
    </html>
  );
}

// Component-level error boundary (client component)
"use client";

import { ReactNode, useEffect, useState } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps): ReactNode {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setError(event.error);
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (error) {
    return fallback?.(error, () => setError(null)) ?? <div>Error occurred</div>;
  }

  return children;
}
```

### 11.2 Try-Catch in Async Operations

**RULE:** Always catch errors in async operations. Provide meaningful error messages to users.

**✅ DO:**
```typescript
"use client";

import { ReactNode, useState } from "react";

export function DataFetch(): ReactNode {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/data");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Process data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleFetch} disabled={loading}>
        {loading ? "Loading..." : "Fetch"}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}

// Server Action error handling
"use server";

export async function createPost(data: unknown) {
  try {
    const validated = postSchema.parse(data);
    return await db.post.create({ data: validated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors[0].message}`);
    }
    throw error;
  }
}
```

**❌ DON'T:**
```typescript
// Silent errors
try {
  await fetch("/api/data");
} catch (error) {
  // Ignore and continue - user sees nothing!
}

// Generic error messages
throw new Error("Error"); // Unhelpful

// Throwing in render
export function Component() {
  throw new Error("Oops"); // Crashes entire app
}
```

### 11.3 Error Recovery

**RULE:** Provide meaningful recovery paths for errors. Don't just show error messages.

**✅ DO:**
```typescript
export function Component(): ReactNode {
  const [error, setError] = useState<string | null>(null);

  const handleRetry = async () => {
    setError(null);
    try {
      // Retry operation
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry");
    }
  };

  if (error) {
    return (
      <div className="error-container">
        <h3>Something went wrong</h3>
        <p>{error}</p>
        <button onClick={handleRetry}>Retry</button>
        <button onClick={() => window.location.href = "/"}>Go home</button>
      </div>
    );
  }

  return null;
}
```

---

## 12. Testing Strategy

### 12.1 Unit Tests with Vitest & React Testing Library

**RULE:** Test behavior, not implementation. Write tests for components and utilities that users interact with.

**✅ DO:**
```typescript
// lib/__tests__/utils.test.ts
import { describe, it, expect } from "vitest";
import { formatDate } from "@/lib/utils";

describe("formatDate", () => {
  it("formats date in MM/DD/YYYY format", () => {
    const date = new Date("2024-01-15");
    expect(formatDate(date)).toBe("01/15/2024");
  });

  it("handles invalid dates", () => {
    expect(formatDate(new Date("invalid"))).toBe("Invalid Date");
  });
});

// components/__tests__/button.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders button with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("calls onClick handler when clicked", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByText("Click me"));
    
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("disables button when loading", () => {
    render(<Button disabled>Loading...</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
```

### 12.2 Integration Tests

**RULE:** Test feature workflows end-to-end. Use Playwright or Cypress for E2E tests.

**✅ DO:**
```typescript
// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test("user can log in", async ({ page }) => {
  // Navigate to login page
  await page.goto("/login");
  
  // Fill form
  await page.fill('input[name="email"]', "user@example.com");
  await page.fill('input[name="password"]', "password123");
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Verify redirect and successful login
  await expect(page).toHaveURL("/dashboard");
  await expect(screen.getByText("Welcome, User")).toBeVisible();
});

test("error displayed on invalid credentials", async ({ page }) => {
  await page.goto("/login");
  
  await page.fill('input[name="email"]', "user@example.com");
  await page.fill('input[name="password"]', "wrong");
  await page.click('button[type="submit"]');
  
  await expect(page.locator(".error")).toContainText("Invalid credentials");
});
```

### 12.3 Type Testing

**RULE:** Use `@testing-library/react` utilities to ensure type safety in tests.

**✅ DO:**
```typescript
import { expectType } from "@testing-library/react";

interface Props {
  name: string;
  age: number;
}

expectType<React.FC<Props>>(MyComponent);
```

---

## 13. Code Organization & Scalability

### 13.1 Folder Structure

**RULE:** Organize code by feature/domain, not by type.

**✅ DO:**
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   ├── page.tsx
│   │   │   ├── login-form.tsx
│   │   │   └── login-form.test.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── posts/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── post-list.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       └── settings-form.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   └── posts/
│   │       ├── route.ts
│   │       └── [id]/
│   │           └── route.ts
│   └── actions/
│       ├── auth.ts
│       ├── posts.ts
│       └── users.ts
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── forms/
│   │   ├── login-form.tsx
│   │   └── post-form.tsx
│   ├── layout/
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   └── footer.tsx
│   └── posts/
│       ├── post-card.tsx
│       ├── post-list.tsx
│       └── post-detail.tsx
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   ├── db.ts
│   ├── utils.ts
│   ├── schemas/
│   │   ├── auth.ts
│   │   ├── posts.ts
│   │   └── users.ts
│   ├── queries/
│   │   ├── posts.ts
│   │   └── users.ts
│   └── store/
│       ├── auth.ts
│       └── theme.ts
├── types/
│   ├── index.ts
│   ├── api.ts
│   └── database.ts
├── hooks/
│   ├── use-auth.ts
│   ├── use-posts.ts
│   └── use-debounce.ts
└── styles/
    ├── globals.css
    └── tailwind.css
```

### 13.2 Module Exports & Re-exports

**RULE:** Use barrel exports (index.ts) for cleaner imports. Only export public APIs.

**✅ DO:**
```typescript
// components/ui/index.ts
export { Button } from "./button";
export { Input } from "./input";
export { Form } from "./form";
export type { ButtonProps } from "./button";

// Import cleanly
import { Button, Input, Form } from "@/components/ui";

// hooks/index.ts
export { useAuth } from "./use-auth";
export { useUser } from "./use-user";
export { usePosts } from "./use-posts";
```

**❌ DON'T:**
```typescript
// Deep imports - clutters code
import Button from "@/components/ui/button/button.tsx";
import Input from "@/components/ui/input/input.tsx";

// Exporting everything
export * from "./button";
export * from "./input";
// ... everything is public!
```

### 13.3 Custom Hooks Organization

**RULE:** Co-locate custom hooks with the features they support. Create `hooks/` folder only for truly shared hooks.

**✅ DO:**
```typescript
// Feature-specific hooks
// app/posts/post-detail/use-post-detail.ts
export function usePostDetail(postId: string) {
  // Logic specific to post detail
}

// Shared hooks - truly used across multiple features
// hooks/use-debounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  // Generic, shared logic
}

// lib/queries/use-posts.ts
export function usePosts(filters: PostFilters) {
  // Data fetching hook
}
```

---

## 14. Forbidden Patterns & Anti-Patterns

### 14.1 NEVER Use These Patterns

| Anti-Pattern | Why | Alternative |
|---|---|---|
| `dangerouslySetInnerHTML` (without sanitization) | XSS vulnerability | DOMPurify or react-markdown |
| Class components | Legacy pattern | Functional components with hooks |
| `any` type | Defeats TypeScript | Use explicit types |
| Default exports | Import confusion | Named exports |
| Inline function definitions in props | Causes re-renders | useCallback or extracted functions |
| Deeply nested component states | Prop drilling hell | Composition or state management |
| localStorage in components | Not SSR safe | Zustand with persist middleware |
| useEffect for data fetching | Race conditions, double-fetch | TanStack Query |
| Mutations during render | Side effects in render | useEffect or Server Actions |
| Global store for all state | Impossible to reason about | Proper state layering |
| CSS-in-JS | Bundle bloat, no static analysis | Tailwind CSS |
| `eval()` or `Function()` constructors | Security risk | Proper validation and type safety |

### 14.2 Props Drilling Prevention

**RULE:** If you need to pass props down >2 levels, use composition or state management instead.

**❌ DON'T:**
```typescript
// Props drilling - nightmare!
const App = () => (
  <Level1 user={user} onLogout={onLogout} theme={theme} />
);

const Level1 = ({ user, onLogout, theme }) => (
  <Level2 user={user} onLogout={onLogout} theme={theme} />
);

const Level2 = ({ user, onLogout, theme }) => (
  <Level3 user={user} onLogout={onLogout} theme={theme} />
);

const Level3 = ({ user, onLogout, theme }) => (
  <UserProfile user={user} onLogout={onLogout} theme={theme} />
);
```

**✅ DO:**
```typescript
// Composition - pass content, not props
const App = () => (
  <Level1>
    <Level2>
      <Level3>
        <UserProfile />
      </Level3>
    </Level2>
  </Level1>
);

// Or use Context for cross-cutting concerns
const AuthProvider = ({ children }) => (
  <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
);

// Or use Zustand for global state
const useAuth = () => useAuthStore((state) => ({
  user: state.user,
  logout: state.logout,
}));
```

---

## 15. Configuration & Environment Management

### 15.1 TypeScript Configuration

**RULE:** Use `tsconfig.json` with strict settings and path aliases.

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"],
      "@/hooks/*": ["./src/hooks/*"]
    },
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "types": ["node", "jest", "@testing-library/jest-dom"]
  },
  "include": ["src/**/*", "next-env.d.ts"],
  "exclude": ["node_modules", "dist", ".next"]
}
```

### 15.2 ESLint Configuration

**RULE:** Use eslint-config-next with strict rules. Enable all recommended checks.

**.eslintrc.json:**
```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/strict"
  ],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error",
    "eqeqeq": ["error", "always"],
    "no-var": "error"
  }
}
```

### 15.3 Next.js Configuration

**next.config.js:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode - catches common mistakes during development
  reactStrictMode: true,
  
  // Optimize fonts
  optimizeFonts: true,
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Content Security Policy
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### 15.4 Environment Variables

**.env.local (server secrets - never commit):**
```
DATABASE_URL=postgresql://...
API_SECRET=secret...
JWT_SECRET=secret...
STRIPE_SECRET_KEY=sk_...
```

**.env.example (template - safe to commit):**
```
DATABASE_URL=
API_SECRET=
JWT_SECRET=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=
```

**.env.production (production secrets - set in CI/CD):**
```
# Set securely in CI/CD environment (Vercel, GitHub Secrets, etc.)
```

**.env.public (safe for client):**
```
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_...
NEXT_PUBLIC_ANALYTICS_ID=gtag-...
```

---

## Summary: Do's & Don'ts Quick Reference

### ✅ DO:
- Use strict TypeScript mode
- Prefer Server Components (App Router default)
- Use Server Actions for mutations
- Use TanStack Query for server state
- Validate on server with Zod
- Use semantic HTML
- Implement CSRF protection
- Test behavior, not implementation
- Organize by feature, not type
- Use composition over props drilling
- Implement proper error boundaries
- Memoize selectively (profile first)
- Use Zustand for global client state
- Keep forms controlled with react-hook-form

### ❌ DON'T:
- Use `any` type
- Use class components
- Use CSS-in-JS
- Use `dangerouslySetInnerHTML` unsanitized
- Use localStorage directly in components
- Duplicate server state in global stores
- Validate on client only
- Use `eval()` or `Function()`
- Use GET requests for mutations
- Perform side effects in render
- Use default exports
- Drill props through many levels
- Memoize prematurely
- Trust unvalidated user input
- Expose server secrets in client code

---

**END OF RULEBOOK**

This rulebook is comprehensive, production-grade, and based on the latest official documentation for Next.js 16, React 19, TypeScript 5.9, and all listed technologies at January 2026. Use this as your AI coding standard and reference.
