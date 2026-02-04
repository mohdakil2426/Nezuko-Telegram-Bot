# Spec: Authentication Integration

## Overview

Configure real Supabase JWT authentication flow between Web Dashboard and API Backend.

## ADDED Features

### Feature: Web Supabase Client

**Purpose**: Initialize Supabase client for authentication in Next.js 16

**Requirements**:

- Create browser client with `@supabase/ssr` package
- Create server client for SSR/proxy
- Handle session refresh automatically
- Store session in HTTP-only cookies

**Files to Create**:

```typescript
// apps/web/src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```typescript
// apps/web/src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component - ignore
          }
        },
      },
    }
  );
}
```

---

### Feature: Proxy Session Middleware

**Purpose**: Refresh auth tokens and protect routes

**File**: `apps/web/src/proxy.ts`

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes that don't require auth
  const publicRoutes = ["/login", "/auth/callback"];
  const isPublicRoute = publicRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

---

### Feature: API Client with Auth

**Purpose**: Add JWT token to all API requests

**File**: `apps/web/src/lib/api/client.ts`

```typescript
import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  return {};
}

export const apiClient = {
  async get<T>(
    endpoint: string,
    options?: { params?: Record<string, string | number | boolean | undefined> }
  ): Promise<T> {
    const authHeader = await getAuthHeader();

    let url = `${API_URL}${endpoint}`;
    if (options?.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
      if (searchParams.toString()) url += `?${searchParams}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Redirect to login on auth failure
        window.location.href = "/login";
        throw new Error("Unauthorized");
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data ?? data;
  },

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    const authHeader = await getAuthHeader();

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return data.data ?? data;
  },

  async put<T>(endpoint: string, body: unknown): Promise<T> {
    const authHeader = await getAuthHeader();

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return data.data ?? data;
  },

  async delete<T>(endpoint: string): Promise<T> {
    const authHeader = await getAuthHeader();

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return data.data ?? data;
  },
};
```

---

### Feature: API JWT Verification

**Purpose**: Verify Supabase JWT tokens in FastAPI

**File**: `apps/api/src/api/v1/dependencies/auth.py`

```python
import jwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_session
from src.models.admin_user import AdminUser
from src.services.auth_service import get_admin_by_supabase_id, create_admin_from_supabase

async def get_current_active_user(
    authorization: str = Header(None),
    session: AsyncSession = Depends(get_session),
) -> AdminUser:
    """
    Dependency to get current authenticated user.

    In mock mode: Returns a default dev user
    In production: Verifies Supabase JWT and returns/creates admin user
    """
    if settings.MOCK_AUTH:
        # Development mode - return mock user
        return await get_or_create_mock_user(session)

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required",
        )

    # Extract token from "Bearer <token>"
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth scheme")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    # Verify JWT with Supabase secret
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    # Get user by Supabase UID
    supabase_uid = payload.get("sub")
    email = payload.get("email")

    if not supabase_uid:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = await get_admin_by_supabase_id(session, supabase_uid)

    if not user:
        # Auto-create admin user on first login
        user = await create_admin_from_supabase(
            session,
            supabase_uid=supabase_uid,
            email=email,
        )

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is deactivated")

    return user


async def get_or_create_mock_user(session: AsyncSession) -> AdminUser:
    """Get or create mock user for development."""
    from src.services.auth_service import get_admin_by_email, create_admin_user

    mock_email = "admin@nezuko.bot"
    user = await get_admin_by_email(session, mock_email)

    if not user:
        user = await create_admin_user(
            session,
            email=mock_email,
            supabase_uid="dev-user-mock-uid",
            role="super_admin",
        )

    return user
```

---

## MODIFIED Configuration

### File: apps/web/.env.local

**Add Supabase Keys**:

```bash
# API Connection
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_USE_MOCK=false

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### File: apps/api/.env

**Add Supabase Keys**:

```bash
# Disable mock auth for production
MOCK_AUTH=false

# Supabase Configuration
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase-dashboard
```

---

## Supabase Setup Requirements

### 1. Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Create new project
3. Note down:
   - Project URL
   - Anon Key
   - Service Role Key
   - JWT Secret (Settings → API → JWT Settings)

### 2. Create Admin User

```sql
-- In Supabase SQL Editor, create initial admin
-- (Or use Supabase Auth UI to create user with password)

-- After user created via UI, their ID will be in auth.users
-- The API will auto-create admin record on first login
```

### 3. Test Credentials

| Field    | Value              |
| -------- | ------------------ |
| Email    | `admin@nezuko.bot` |
| Password | `Admin@123`        |

Create this user in Supabase Auth (Authentication → Users → Invite User or Sign Up)

---

## Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │     │  Next.js    │     │   Supabase  │
│   (User)    │     │   App       │     │    Auth     │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ 1. Login Form    │                   │
       │──────────────────▶│                   │
       │                   │ 2. signInWithPassword
       │                   │──────────────────▶│
       │                   │◀──────────────────│
       │                   │ 3. JWT + Refresh  │
       │ 4. Store in      │   Token           │
       │   Cookie         │                   │
       │◀──────────────────│                   │
       │                   │                   │
       │ 5. Navigate to   │                   │
       │   /dashboard     │                   │
       │──────────────────▶│                   │
       │                   │                   │
       │                   │     ┌─────────────┐
       │                   │     │   FastAPI   │
       │                   │     │     API     │
       │                   │     └──────┬──────┘
       │                   │            │
       │                   │ 6. API Request with
       │                   │   Authorization: Bearer <jwt>
       │                   │───────────▶│
       │                   │            │ 7. Verify JWT
       │                   │            │   with secret
       │                   │◀───────────│
       │ 8. Real Data     │            │
       │◀──────────────────│            │
```
