## ADDED Requirements

### Requirement: Next.js 16 Project Initialization

The system SHALL create a new Next.js 16 application in `apps/web1/` using the latest stable versions of all dependencies.

#### Scenario: Project creation with correct structure

- **WHEN** the project is initialized via `bunx create-next-app@latest`
- **THEN** the following structure is created:
  - `apps/web1/src/app/` - App Router pages
  - `apps/web1/src/components/` - React components
  - `apps/web1/src/lib/` - Utilities and data layer
  - `apps/web1/package.json` - Project dependencies
  - `apps/web1/tsconfig.json` - TypeScript configuration
  - `apps/web1/tailwind.config.ts` - Tailwind v4 configuration

### Requirement: shadcn/ui Configuration

The system SHALL configure shadcn/ui with New York style and CSS variables for theming.

#### Scenario: shadcn initialization

- **WHEN** `bunx shadcn@latest init` is executed
- **THEN** `components.json` is created with:
  - Style: "new-york"
  - CSS Variables: enabled
  - Tailwind CSS: configured
  - Components alias: "@/components"

### Requirement: Latest Stack Versions

The system SHALL use the following minimum versions (no older versions allowed):

| Package               | Minimum Version |
| --------------------- | --------------- |
| next                  | 16.0.0          |
| react                 | 19.0.0          |
| typescript            | 5.8.0           |
| tailwindcss           | 4.0.0           |
| @tanstack/react-table | 8.20.0          |

#### Scenario: Version verification

- **WHEN** `package.json` is inspected
- **THEN** all dependencies meet or exceed minimum versions

### Requirement: Core shadcn Components Installation

The system SHALL install all required shadcn components via CLI before any page implementation.

#### Scenario: Component installation

- **WHEN** shadcn add commands are executed
- **THEN** the following components exist in `src/components/ui/`:
  - sidebar.tsx (navigation)
  - card.tsx (stat cards, containers)
  - chart.tsx (Recharts wrapper)
  - table.tsx (data display)
  - button.tsx (actions)
  - badge.tsx (status indicators)
  - dropdown-menu.tsx (actions, user menu)
  - select.tsx (filters)
  - input.tsx (search)
  - switch.tsx (toggles)
  - label.tsx (form labels)
  - tabs.tsx (navigation)
  - skeleton.tsx (loading states)
  - separator.tsx (dividers)
  - avatar.tsx (user profile)
  - tooltip.tsx (hints)
  - scroll-area.tsx (scrolling)
  - sonner.tsx (toasts)
  - alert-dialog.tsx (confirmations)

### Requirement: TypeScript Strict Mode

The system SHALL enable TypeScript strict mode with no implicit any.

#### Scenario: TypeScript configuration

- **WHEN** `tsconfig.json` is inspected
- **THEN** `"strict": true` is set
- **AND** `"noImplicitAny": true` is set

### Requirement: ESLint Zero Errors

The system SHALL pass ESLint checks with zero errors.

#### Scenario: Lint check passes

- **WHEN** `bun run lint` is executed
- **THEN** exit code is 0
- **AND** no errors are reported
