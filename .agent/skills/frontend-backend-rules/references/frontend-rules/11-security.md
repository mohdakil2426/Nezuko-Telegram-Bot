# 10. Security Best Practices

## 10.1 XSS Prevention

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

## 10.2 CSRF Protection

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

## 10.3 Input Validation & Sanitization

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

## 10.4 Environment Variables & Secrets

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

## 10.5 Authentication & Authorization

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

[← Back to Accessibility](./10-accessibility.md) | [Next: Error Handling →](./12-error-handling.md)
