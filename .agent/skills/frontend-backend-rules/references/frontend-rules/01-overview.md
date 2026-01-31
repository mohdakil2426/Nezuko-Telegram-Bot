# Frontend AI Coding Rulebook
## Production-Grade TypeScript + Next.js 16 + React 19 + Tailwind CSS 4

**Last Updated:** January 2026  
**Stack Target:** Next.js 16+ (App Router), React 19+, TypeScript 5.9+, Tailwind CSS 4, shadcn/ui, Zustand, TanStack Query, react-hook-form, Zod  
**Scope:** AI-assisted frontend development for production-grade, high-scale web applications

---

## TABLE OF CONTENTS

1. [TypeScript & Type Safety](./02-typescript-type-safety.md)
2. [React Architecture & Component Design](./03-react-architecture.md)
3. [React Server Components (RSC) & Server Actions](./04-server-components-actions.md)
4. [State Management](./05-state-management.md)
5. [Data Fetching & Server-State Management](./06-data-fetching.md)
6. [Form Handling & Validation](./07-form-handling.md)
7. [Styling & Design System](./08-styling-design-system.md)
8. [Performance & Rendering Optimization](./09-performance.md)
9. [Accessibility (a11y)](./10-accessibility.md)
10. [Security Best Practices](./11-security.md)
11. [Error Handling & Error Boundaries](./12-error-handling.md)
12. [Testing Strategy](./13-testing.md)
13. [Code Organization & Scalability](./14-code-organization.md)
14. [Forbidden Patterns & Anti-Patterns](./15-forbidden-patterns.md)
15. [Configuration & Environment Management](./16-configuration.md)

---

## Quick Reference: Do's & Don'ts

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

**This rulebook is comprehensive, production-grade, and based on the latest official documentation for Next.js 16, React 19, TypeScript 5.9, and all listed technologies at January 2026.**
