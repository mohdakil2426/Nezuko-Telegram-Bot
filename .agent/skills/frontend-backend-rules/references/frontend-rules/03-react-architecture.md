# 2. React Architecture & Component Design

## 2.1 Functional Components ONLY

**RULE:** Use **functional components exclusively**. Class components are FORBIDDEN in new code.

**✅ DO:**
```typescript
import { ReactNode } from "react";

interface CardProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export const Card = ({ title, description, children }: CardProps): ReactNode => {
  return (
    <div className="rounded-lg border p-4">
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
};
```

**❌ DON'T:**
```typescript
// Class components - FORBIDDEN
class Card extends React.Component {
  render() {
    return <div>{this.props.title}</div>;
  }
}
```

## 2.2 Component Boundaries & Composition

**RULE:** Every component MUST have a **single, well-defined responsibility**. Use composition over inheritance.

**Core Principles:**
- **Lift content up** - If a component doesn't influence HOW a child is rendered (just renders it in a slot), move rendering up to parent
- **Push state down** - Global state consumption should be as close as possible to components rendering that state
- **Tightly-coupled components are FORBIDDEN** - Components should not depend on sibling component APIs

**✅ DO:**
```typescript
// Parent controls WHAT is rendered
interface WeatherDisplayProps {
  temperature: number;
  status: "sunny" | "rainy" | "cloudy";
  dateContent: ReactNode; // Slot for date
  forecastContent: ReactNode; // Slot for forecast
}

export const WeatherDisplay = ({
  temperature,
  status,
  dateContent,
  forecastContent,
}: WeatherDisplayProps): ReactNode => {
  return (
    <div>
      <h2>{temperature}°</h2>
      <p>{status}</p>
      <div>{dateContent}</div>
      <div>{forecastContent}</div>
    </div>
  );
};

// Parent composes with specific content
export const CurrentWeatherPage = (): ReactNode => {
  const currentUser = useCurrentUser();
  const dateString = new Date().toLocaleDateString();
  
  return (
    <WeatherDisplay
      temperature={72}
      status="sunny"
      dateContent={<p>{dateString}</p>}
      forecastContent={<DailyForecast />}
    />
  );
};
```

**❌ DON'T:**
```typescript
// Tightly coupled - WeatherDisplay depends on UpsellPopover API
const WeatherDisplay = ({ temperature, status }) => {
  return (
    <div>
      <h2>{temperature}°</h2>
      {/* Any change to UpsellPopover prop requires change here */}
      <UpsellPopover kind="weather-widget" />
    </div>
  );
};

// State at wrong level - consuming global state too early
const ParentComponent = () => {
  const globalState = useGlobalStore();
  
  return (
    <Child1 data={globalState.data} />
    <Child2 data={globalState.data} />
    <Child3 data={globalState.data} />
  );
};
```

## 2.3 Props Interface Design

**RULE:** All component props MUST be defined in a `Props` interface. Use `React.ComponentProps<T>` for HTML elements only when extending built-in components.

**✅ DO:**
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: "primary" | "secondary" | "outline";
  size: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = ({
  variant,
  size,
  isLoading = false,
  children,
  ...htmlProps
}: ButtonProps): ReactNode => {
  return (
    <button
      {...htmlProps}
      className={`btn btn-${variant} btn-${size}`}
      disabled={isLoading || htmlProps.disabled}
    >
      {isLoading ? "Loading..." : children}
    </button>
  );
};

// For custom components
interface AlertProps {
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  onDismiss: () => void;
}

export const Alert = ({ type, title, message, onDismiss }: AlertProps): ReactNode => {
  return (
    <div role="alert" className={`alert alert-${type}`}>
      <h3>{title}</h3>
      <p>{message}</p>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  );
};
```

**❌ DON'T:**
```typescript
// No Props interface
export const Button = ({ variant, size, children, ...rest }) => {
  return <button {...rest}>{children}</button>;
};

// Mixing HTML props with custom props unsafely
interface ButtonProps {
  variant: string;
  size: any;
  onClick?: any;
  className?: any;
}
```

## 2.4 Refs & forwardRef

**RULE:** Functional components can now accept refs as standard props directly (React 19+). Use `forwardRef` only for libraries that require class component compatibility.

**✅ DO (React 19+):**
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  ref?: React.Ref<HTMLInputElement>;
}

// Refs are now regular props!
export const Input = ({
  label,
  error,
  ref,
  ...inputProps
}: InputProps): ReactNode => {
  return (
    <div>
      <label>{label}</label>
      <input ref={ref} {...inputProps} />
      {error && <span className="error">{error}</span>}
    </div>
  );
};

// Usage
const inputRef = useRef<HTMLInputElement>(null);
<Input ref={inputRef} label="Name" />;
```

**⚠️ LEGACY (use only if required):**
```typescript
// Only if you need forwardRef for compatibility
export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string }
>(({ label, ...props }, ref) => (
  <input ref={ref} {...props} />
));

Input.displayName = "Input";
```

## 2.5 Children & Slots

**RULE:** Use proper TypeScript types for children. Accept `ReactNode` for flexible content slots.

**✅ DO:**
```typescript
interface LayoutProps {
  children: ReactNode; // Any valid React content
}

interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode; // Render prop pattern
}

interface DialogProps {
  title: string;
  description: string;
  trigger: ReactNode;
  content: ReactNode;
  footer?: ReactNode;
}

// Compound component pattern
interface TabsProps {
  children: React.ReactElement<TabProps>[];
}

interface TabProps {
  label: string;
  children: ReactNode;
}
```

**❌ DON'T:**
```typescript
// Any type for children
interface ComponentProps {
  children: any;
}

// FC shorthand (deprecated in React 18+)
const Component: FC = ({ children }) => {
  return <div>{children}</div>;
};

// No type for render props
interface ListProps {
  items: any[];
  renderItem: any; // Unsafe!
}
```

---

[← Back to TypeScript](./02-typescript-type-safety.md) | [Next: Server Components →](./04-server-components-actions.md)
