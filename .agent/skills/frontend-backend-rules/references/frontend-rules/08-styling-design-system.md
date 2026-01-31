# 7. Styling & Design System

## 7.1 Tailwind CSS 4 Configuration

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

## 7.2 shadcn/ui Component Library

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

## 7.3 CSS-in-JS & Styled Components - FORBIDDEN

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

## 7.4 Dark Mode Support

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

[← Back to Form Handling](./07-form-handling.md) | [Next: Performance →](./09-performance.md)
