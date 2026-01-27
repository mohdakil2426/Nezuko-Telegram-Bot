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
    <>
      <Child1 data={globalState.data} />
      <Child2 data={globalState.data} />
      <Child3 data={globalState.data} />
    </>
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
