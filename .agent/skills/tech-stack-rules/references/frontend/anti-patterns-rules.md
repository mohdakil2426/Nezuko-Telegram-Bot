## 14. Forbidden Patterns & Anti-Patterns

### 14.1 NEVER Use These Patterns

| Anti-Pattern                                     | Why                              | Alternative                        |
| ------------------------------------------------ | -------------------------------- | ---------------------------------- |
| `dangerouslySetInnerHTML` (without sanitization) | XSS vulnerability                | DOMPurify or react-markdown        |
| Class components                                 | Legacy pattern                   | Functional components with hooks   |
| `any` type                                       | Defeats TypeScript               | Use explicit types                 |
| Default exports                                  | Import confusion                 | Named exports                      |
| Inline function definitions in props             | Causes re-renders                | useCallback or extracted functions |
| Deeply nested component states                   | Prop drilling hell               | Composition or state management    |
| localStorage in components                       | Not SSR safe                     | Zustand with persist middleware    |
| useEffect for data fetching                      | Race conditions, double-fetch    | TanStack Query                     |
| Mutations during render                          | Side effects in render           | useEffect or Server Actions        |
| Global store for all state                       | Impossible to reason about       | Proper state layering              |
| CSS-in-JS                                        | Bundle bloat, no static analysis | Tailwind CSS                       |
| `eval()` or `Function()` constructors            | Security risk                    | Proper validation and type safety  |

### 14.2 Props Drilling Prevention

**RULE:** If you need to pass props down >2 levels, use composition or state management instead.

**❌ DON'T:**

```typescript
// Props drilling - nightmare!
const App = () => (
  <Level1 user={user} onLogout={onLogout} theme={theme} />
);

const Level1 = ({ user, onLogout, theme }) => (
  <Level2 user={user} onLogout={onLogout} theme={theme} />
);

const Level2 = ({ user, onLogout, theme }) => (
  <Level3 user={user} onLogout={onLogout} theme={theme} />
);

const Level3 = ({ user, onLogout, theme }) => (
  <UserProfile user={user} onLogout={onLogout} theme={theme} />
);
```

**✅ DO:**

```typescript
// Composition - pass content, not props
const App = () => (
  <Level1>
    <Level2>
      <Level3>
        <UserProfile />
      </Level3>
    </Level2>
  </Level1>
);

// Or use Context for cross-cutting concerns
const AuthProvider = ({ children }) => (
  <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
);

// Or use Zustand for global state
```

---

## Summary: Do's & Don'ts Quick Reference

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

**END OF RULEBOOK**
