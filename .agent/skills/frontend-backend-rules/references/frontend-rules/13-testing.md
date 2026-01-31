# 12. Testing Strategy

## 12.1 Unit Tests with Vitest & React Testing Library

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

## 12.2 Integration Tests

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

## 12.3 Type Testing

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

[← Back to Error Handling](./12-error-handling.md) | [Next: Code Organization →](./14-code-organization.md)
