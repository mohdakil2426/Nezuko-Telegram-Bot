# 1. TypeScript & Type Safety

## 1.1 TypeScript Configuration - REQUIRED

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

## 1.2 Explicit Type Annotations

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

## 1.3 Strict Null Checks

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

## 1.4 Type Inference & Explicit Annotations

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

## 1.5 Discriminated Unions & Literal Types

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

[← Back to Overview](./01-overview.md) | [Next: React Architecture →](./03-react-architecture.md)
