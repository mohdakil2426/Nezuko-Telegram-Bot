# 11. Error Handling & Error Boundaries

## 11.1 Error Boundaries

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

## 11.2 Try-Catch in Async Operations

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

## 11.3 Error Recovery

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

[← Back to Security](./11-security.md) | [Next: Testing →](./13-testing.md)
