# 13. Code Organization & Scalability

## 13.1 Folder Structure

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

## 13.2 Module Exports & Re-exports

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

## 13.3 Custom Hooks Organization

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

[← Back to Testing](./13-testing.md) | [Next: Forbidden Patterns →](./15-forbidden-patterns.md)
