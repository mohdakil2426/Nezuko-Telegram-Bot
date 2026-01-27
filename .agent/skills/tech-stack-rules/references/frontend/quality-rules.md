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
      return Response.json({ errors: error.errors }, { status: 400 });
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
NEXT_PUBLIC_API_SECRET = secret123; // VISIBLE IN CLIENT!

// Use secrets in client components
("use client");
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
("use client");
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

### 15.2 ESLint Configuration (Reference)

**RULE:** Use eslint-config-next with strict rules. Enable all recommended checks.

**.eslintrc.json:**

```json
{
  "extends": ["next/core-web-vitals", "plugin:@typescript-eslint/strict"],
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

### 15.3 Next.js Configuration (Reference)

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
        protocol: "https",
        hostname: "example.com",
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};
```

### 15.4 Environment Variables (Reference)

**RULE:** Never expose secrets in client code. Use `.env.local` for server secrets only.

**.env.local:**

```
DATABASE_URL=postgresql://...
API_SECRET=secret...
JWT_SECRET=secret...
STRIPE_SECRET_KEY=sk_...
```

**.env.public:**

```
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_...
NEXT_PUBLIC_ANALYTICS_ID=gtag-...
```
