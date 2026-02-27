## ADDED Requirements

### Requirement: Dashboard uses InsForge authentication
The web dashboard SHALL use `@insforge/nextjs` for user authentication, replacing the stub `useAuth()` hook.

#### Scenario: Unauthenticated user redirected to login
- **WHEN** an unauthenticated user navigates to `/dashboard`
- **THEN** the system SHALL redirect them to the InsForge hosted login page

#### Scenario: Authenticated user accesses dashboard
- **WHEN** an authenticated user navigates to `/dashboard`
- **THEN** the system SHALL render the dashboard with the user's session

### Requirement: Middleware protects all dashboard routes
The system SHALL use `InsforgeMiddleware` to protect all `/dashboard/*` routes. Only `/` and `/login` SHALL be public.

#### Scenario: Middleware blocks unauthenticated access
- **WHEN** an unauthenticated request hits `/dashboard/settings`
- **THEN** the middleware SHALL redirect to the sign-in page

### Requirement: Auth provider wraps application
The root layout SHALL wrap the app in `InsforgeBrowserProvider` with `afterSignInUrl="/dashboard"`.

#### Scenario: Provider initializes auth state
- **WHEN** the app loads
- **THEN** the `InsforgeBrowserProvider` SHALL initialize auth state from cookies

### Requirement: Auth API route handles cookie sync
The system SHALL create `app/api/auth/route.ts` using `createAuthRouteHandlers()` for SSR cookie-based authentication.

#### Scenario: Auth cookies synced on sign-in
- **WHEN** a user signs in via the hosted auth page
- **THEN** the API route SHALL sync the auth token to HTTP-only cookies

### Requirement: Replace stub useAuth hook
The existing `use-auth.ts` SHALL be replaced with exports from `@insforge/nextjs` (`useAuth`, `useUser`).

#### Scenario: useAuth returns real auth state
- **WHEN** a component calls `useAuth()`
- **THEN** it SHALL receive `{ isSignedIn, isLoaded }` from the real InsForge auth system
