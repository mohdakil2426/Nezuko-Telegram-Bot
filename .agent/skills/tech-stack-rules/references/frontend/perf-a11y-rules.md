## 8. Performance & Rendering Optimization

### 8.1 Code Splitting & Dynamic Imports

**RULE:** Use dynamic imports with `React.lazy()` and Suspense for large components to reduce initial bundle size.

**✅ DO:**

```typescript
import { lazy, Suspense, ReactNode } from "react";

const HeavyChart = lazy(() => import("@/components/heavy-chart"));
const AdminPanel = lazy(() => import("@/components/admin-panel"));

export function Dashboard(): ReactNode {
  return (
    <div>
      <h1>Dashboard</h1>

      <Suspense fallback={<div>Loading chart...</div>}>
        <HeavyChart />
      </Suspense>

      {isAdmin && (
        <Suspense fallback={<div>Loading admin panel...</div>}>
          <AdminPanel />
        </Suspense>
      )}
    </div>
  );
}
```

**❌ DON'T:**

```typescript
// Import everything upfront
import HeavyChart from "@/components/heavy-chart";
import AdminPanel from "@/components/admin-panel";

// All code downloaded immediately, even if unused
```

### 8.2 Memoization - Selective Use

**RULE:** Use `useMemo` and `useCallback` ONLY when:

1. Component is in a performance profile showing re-render issues
2. Expensive computation or dependency has changed
3. Preventing re-render of memoized child components

**DO NOT memoize prematurely.** Profile first.

**✅ DO:**

```typescript
"use client";

import { useMemo, useCallback, ReactNode } from "react";

interface ListProps {
  items: string[];
  onItemClick: (id: string) => void;
}

export function List({ items, onItemClick }: ListProps): ReactNode {
  // Only memoize if items array is unstable (e.g., filter result)
  const sortedItems = useMemo(() => {
    return [...items].sort();
  }, [items]);

  // Memoize callback to prevent child re-renders
  const handleClick = useCallback((id: string) => {
    onItemClick(id);
  }, [onItemClick]);

  return (
    <ul>
      {sortedItems.map((item) => (
        <ListItem key={item} item={item} onClick={handleClick} />
      ))}
    </ul>
  );
}

interface ListItemProps {
  item: string;
  onClick: (id: string) => void;
}

// Memoized to prevent unnecessary re-renders
export const ListItem = React.memo(
  ({ item, onClick }: ListItemProps): ReactNode => (
    <li onClick={() => onClick(item)}>{item}</li>
  )
);
```

**❌ DON'T:**

```typescript
// Premature memoization without profiling
const expensiveComputation = useMemo(() => {
  return items.length; // Simple operation - no memoization needed!
}, [items]);

// Memoizing everything - unnecessary overhead
const greeting = useMemo(() => `Hello ${name}`, [name]);

// useCallback for every callback - defeats the purpose
const handleClick = useCallback(() => {
  console.log("clicked");
}, []); // Not preventing re-renders
```

### 8.3 Image Optimization

**RULE:** Always use **Next.js Image component** for optimization. Never use `<img>` tags.

**✅ DO:**

```typescript
import Image from "next/image";
import { ReactNode } from "react";

export function HeroImage(): ReactNode {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero section showing product features"
      width={1200}
      height={600}
      priority // For above-the-fold images only
      placeholder="blur" // Blur while loading
      blurDataURL="data:image/..." // Optional pre-calculated blur
      quality={75}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 100vw"
    />
  );
}
```

**❌ DON'T:**

```typescript
// Standard HTML img - no optimization
<img src="/hero.jpg" alt="Hero" />

// Incorrect Image usage - missing alt, width/height
<Image src="/hero.jpg" />

// Using external URLs without optimization
<Image src="https://example.com/image.jpg" width={100} height={100} />
```

### 8.4 Rendering Performance - Composition Over Memoization

**RULE:** Use **component composition** to prevent unnecessary re-renders instead of memoization. Lift state up and pass content as props (children/slots).

**✅ DO:**

```typescript
// Parent manages state, child is simple/stateless
"use client";

interface ExpensiveListProps {
  items: Item[];
  expandedId: string;
  onExpandChange: (id: string) => void;
}

export function ExpensiveList({
  items,
  expandedId,
  onExpandChange,
}: ExpensiveListProps): ReactNode {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          <button onClick={() => onExpandChange(item.id)}>
            {item.name}
          </button>
          {expandedId === item.id && <ItemDetails item={item} />}
        </li>
      ))}
    </ul>
  );
}

// Simple, pure component - no re-render issues
function ItemDetails({ item }: { item: Item }): ReactNode {
  return <div>{item.description}</div>;
}

// Usage
"use client";
export function Page(): ReactNode {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <ExpensiveList
      items={items}
      expandedId={expandedId ?? ""}
      onExpandChange={setExpandedId}
    />
  );
}
```

**❌ DON'T:**

```typescript
// Pushing state down - causes child re-renders
interface ListProps {
  items: Item[];
}

export function List({ items }: ListProps): ReactNode {
  return (
    <ul>
      {items.map((item) => (
        <ListItem key={item.id} item={item} /> // Causes re-render on parent state change
      ))}
    </ul>
  );
}

function ListItem({ item }: { item: Item }): ReactNode {
  const [isExpanded, setIsExpanded] = useState(false); // Local state causes re-render
  return <li>{item.name}</li>;
}
```

---

## 9. Accessibility (a11y)

### 9.1 Semantic HTML

**RULE:** Use semantic HTML elements. Never use `<div>` or `<span>` for interactive elements.

**✅ DO:**

```typescript
export function Navigation(): ReactNode {
  return (
    <header>
      <nav aria-label="Main navigation">
        <ul>
          <li><a href="/home">Home</a></li>
          <li><a href="/about">About</a></li>
        </ul>
      </nav>
    </header>
  );
}

export function Article({ title, content }: { title: string; content: ReactNode }): ReactNode {
  return (
    <article>
      <h1>{title}</h1>
      <section>{content}</section>
    </article>
  );
}

export function FormExample(): ReactNode {
  return (
    <form>
      <fieldset>
        <legend>Contact Information</legend>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" />
      </fieldset>
    </form>
  );
}
```

**❌ DON'T:**

```typescript
// Using divs for semantic elements
<div onClick={handleNav} className="nav">
  <div className="nav-item">Home</div>
</div>

// Unclear structure
<div>
  <div className="heading">Title</div>
  <div>{content}</div>
</div>
```

### 9.2 ARIA & Accessibility Attributes

**RULE:** Use ARIA attributes where semantic HTML doesn't suffice. Properly label all interactive elements.

**✅ DO:**

```typescript
// Button with tooltip
<button
  aria-label="Close dialog"
  aria-describedby="close-button-tooltip"
  onClick={onClose}
>
  ✕
</button>
<div id="close-button-tooltip" role="tooltip">
  Close (Esc)
</div>

// Alert dialog
<div
  role="alertdialog"
  aria-labelledby="alert-title"
  aria-describedby="alert-description"
>
  <h2 id="alert-title">Confirm deletion</h2>
  <p id="alert-description">
    This action cannot be undone.
  </p>
</div>

// Live region for notifications
<div aria-live="polite" aria-atomic="true">
  {message && <p>{message}</p>}
</div>

// Form validation
<input
  aria-invalid={!!errors.email}
  aria-describedby="email-error"
  type="email"
/>
{errors.email && (
  <span id="email-error" role="alert">
    {errors.email}
  </span>
)}
```

**❌ DON'T:**

```typescript
// No aria labels on icon buttons
<button onClick={closeDialog}>✕</button>

// Unclear ARIA usage
<div aria-hidden="true">{importantContent}</div>

// Missing form labels
<input type="email" placeholder="Email" />
```

### 9.3 Keyboard Navigation

**RULE:** All interactive elements MUST be keyboard accessible. Test with Tab key navigation.

**✅ DO:**

```typescript
export function Modal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }): ReactNode {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Dialog title"
      onKeyDown={handleKeyDown}
    >
      <h2>Dialog Title</h2>
      <p>Content</p>
      <button onClick={onClose}>Close (Esc)</button>
    </div>
  );
}

// Tab trap in modal - keep focus within dialog
export function useFocusTrap(ref: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        if (e.shiftKey && document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    element.addEventListener("keydown", handleKeyDown);
    return () => element.removeEventListener("keydown", handleKeyDown);
  }, [ref]);
}
```

**❌ DON'T:**

```typescript
// Non-semantic interactive elements
<div onClick={handleClick} className="button">
  Click me
</div>

// Untrappable focus in modal
<dialog>
  <button>Close</button>
  {/* Focus can escape */}
</dialog>
```

### 9.4 Color & Contrast

**RULE:** Maintain WCAG AA minimum contrast ratio of 4.5:1 for text, 3:1 for UI components. Never use color alone to convey information.

**✅ DO:**

```typescript
// Use dark text on light background
<div className="bg-white text-gray-900">
  {/* Sufficient contrast */}
</div>

// Use icons + text together
<button className="flex items-center gap-2">
  <ErrorIcon />
  <span>Error</span>
</button>

// Visual + aria indication
<input
  aria-invalid={hasError}
  aria-describedby="error-message"
  className={hasError ? "ring-red-500" : ""}
/>
```

**❌ DON'T:**

```typescript
// Low contrast text
<span className="text-gray-400 bg-gray-500">Low contrast</span>

// Color only - not visible to colorblind users
<div className="bg-red-500">Error</div> {/* No text indicator */}

// No focus indicator
<button className="outline-none">Click me</button>
```

### 9.5 Alt Text for Images

**RULE:** Every image MUST have descriptive alt text. Use Next.js Image component's alt prop.

**✅ DO:**

```typescript
// Descriptive alt text
<Image
  src="/product.jpg"
  alt="Red wireless headphones with noise-cancellation feature"
  width={400}
  height={300}
/>

// Decorative images
<Image
  src="/divider.svg"
  alt="" // Empty alt for purely decorative images
  width={400}
  height={1}
  aria-hidden="true"
/>
```

**❌ DON'T:**

```typescript
// No alt text
<Image src="/product.jpg" width={400} height={300} />

// Useless alt text
<Image src="/product.jpg" alt="image" width={400} height={300} />

// Redundant alt text
<figure>
  <Image src="/product.jpg" alt="Product image" width={400} height={300} />
  <figcaption>Our new product</figcaption> {/* Repeats image info */}
</figure>
```
