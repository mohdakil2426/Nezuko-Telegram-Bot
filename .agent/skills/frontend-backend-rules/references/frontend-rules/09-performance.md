# 8. Performance & Rendering Optimization

## 8.1 Code Splitting & Dynamic Imports

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

## 8.2 Memoization - Selective Use

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

## 8.3 Image Optimization

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

## 8.4 Rendering Performance - Composition Over Memoization

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

[← Back to Styling](./08-styling-design-system.md) | [Next: Accessibility →](./10-accessibility.md)
