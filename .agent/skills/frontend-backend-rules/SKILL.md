---
name: frontend-backend-rules
description: Comprehensive coding rules for full-stack development with Next.js 16+/React 19+/Tailwind v4 frontend and Python 3.13+/FastAPI/Firebase async-first backend. Use when writing, reviewing, or debugging frontend or backend code. Covers type safety, architecture, state management, security, performance, testing, and forbidden patterns.
---

# Frontend & Backend Coding Rules

## Quick Navigation

| Domain | Reference Files |
|--------|-----------------|
| **Frontend** | [references/frontend-rules/](references/frontend-rules/) - 16 files covering TypeScript, React, Next.js, state management, styling, security, testing |
| **Backend** | [references/python-rules/](references/python-rules/) - 19 files covering async, FastAPI, Firebase, error handling, security, multi-tenancy, testing |

---

## Frontend Rules Summary (TypeScript/Next.js 16+/React 19+)

**Read detailed rules:** [references/frontend-rules/01-overview.md](references/frontend-rules/01-overview.md)

### Critical Patterns

| Topic | Do ✅ | Don't ❌ |
|-------|-------|---------|
| Types | Explicit annotations, strict mode | `any` type, implicit types |
| Components | Functional, single responsibility | Class components, props drilling >2 |
| Data | TanStack Query, Server Components | `useEffect` for fetching, Zustand for server state |
| Forms | react-hook-form + Zod | useState for forms, skip server validation |
| Styling | Tailwind v4, shadcn/ui | CSS-in-JS libraries |
| Exports | Named exports | Default exports |

### Frontend References

| File | When to Read |
|------|--------------|
| [02-typescript-type-safety.md](references/frontend-rules/02-typescript-type-safety.md) | Writing types, interfaces, generics |
| [03-react-architecture.md](references/frontend-rules/03-react-architecture.md) | Component design, props, composition |
| [04-server-components-actions.md](references/frontend-rules/04-server-components-actions.md) | Server Components, Server Actions, async params |
| [05-state-management.md](references/frontend-rules/05-state-management.md) | Choosing state solution, Zustand, Context |
| [06-data-fetching.md](references/frontend-rules/06-data-fetching.md) | TanStack Query, caching, invalidation |
| [07-form-handling.md](references/frontend-rules/07-form-handling.md) | react-hook-form, Zod validation |
| [08-styling-design-system.md](references/frontend-rules/08-styling-design-system.md) | Tailwind v4, CSS variables, theming |
| [09-performance.md](references/frontend-rules/09-performance.md) | Code splitting, memoization, images |
| [10-accessibility.md](references/frontend-rules/10-accessibility.md) | ARIA, keyboard nav, semantic HTML |
| [11-security.md](references/frontend-rules/11-security.md) | XSS, CSRF, secrets, validation |
| [12-error-handling.md](references/frontend-rules/12-error-handling.md) | Error boundaries, async errors |
| [13-testing.md](references/frontend-rules/13-testing.md) | Vitest, RTL, Playwright |
| [14-code-organization.md](references/frontend-rules/14-code-organization.md) | Folder structure, barrel exports |
| [15-forbidden-patterns.md](references/frontend-rules/15-forbidden-patterns.md) | Anti-patterns to avoid |
| [16-configuration.md](references/frontend-rules/16-configuration.md) | tsconfig, ESLint, next.config |

---

## Backend Rules Summary (Python 3.13+/FastAPI/Firebase)

**Read detailed rules:** [references/python-rules/01-overview.md](references/python-rules/01-overview.md)

### Critical Patterns

| Topic | Do ✅ | Don't ❌ |
|-------|-------|---------|
| Async | `async def` all routes, `asyncio.timeout()` | `time.sleep()`, blocking I/O |
| Types | Full annotations, Pydantic models | `Any` type, untyped dict |
| Database | Request-scoped sessions, tenant filter | Global sessions, no tenant filter |
| Errors | Custom exceptions, retry with backoff | Bare `Exception`, no retry |
| Security | JWT verification, rate limiting | Hardcoded secrets, no auth |
| Tasks | TaskGroup, store task references | Fire-and-forget, RUF006 violations |

### Backend References

| File | When to Read |
|------|--------------|
| [02-core-philosophy.md](references/python-rules/02-core-philosophy.md) | Async-first mindset, principles |
| [03-async-programming.md](references/python-rules/03-async-programming.md) | TaskGroup, cancellation, timeouts |
| [04-fastapi-architecture.md](references/python-rules/04-fastapi-architecture.md) | Routes, dependencies, lifespan |
| [05-telegram-bot.md](references/python-rules/05-telegram-bot.md) | PTB handlers, JobQueue, conversations |
| [06-firebase-integration.md](references/python-rules/06-firebase-integration.md) | Firestore, auth, transactions |
| [07-error-handling.md](references/python-rules/07-error-handling.md) | Exceptions, retries, circuit breaker |
| [08-security.md](references/python-rules/08-security.md) | JWT, RBAC, rate limiting, CORS |
| [09-multi-tenant.md](references/python-rules/09-multi-tenant.md) | Tenant isolation, query filtering |
| [10-performance.md](references/python-rules/10-performance.md) | Connection pooling, caching, batching |
| [11-memory-management.md](references/python-rules/11-memory-management.md) | GC, streaming, context vars |
| [12-observability.md](references/python-rules/12-observability.md) | Structlog, Prometheus, Sentry |
| [13-testing.md](references/python-rules/13-testing.md) | pytest-asyncio, fixtures, AsyncMock |
| [14-type-system.md](references/python-rules/14-type-system.md) | Type hints, TypedDict, Pydantic |
| [15-configuration.md](references/python-rules/15-configuration.md) | Environment, settings, .env |
| [16-code-quality.md](references/python-rules/16-code-quality.md) | Ruff, Pylint, Pyrefly, CI/CD |
| [17-scalability.md](references/python-rules/17-scalability.md) | Stateless design, load balancing |
| [18-clean-architecture.md](references/python-rules/18-clean-architecture.md) | Layers, dependency injection |
| [19-forbidden-patterns.md](references/python-rules/19-forbidden-patterns.md) | Anti-patterns, correctness checklist |

---

## Deployment Checklist

### Frontend
- [ ] Server Components by default, `'use client'` only when needed
- [ ] TanStack Query for server state
- [ ] react-hook-form + Zod for forms
- [ ] No `any` types, named exports only
- [ ] Next.js Image for all images
- [ ] Security headers in `next.config.js`

### Backend
- [ ] All routes/dependencies `async def`
- [ ] Every `await` has timeout
- [ ] Every query filters by `tenant_id`
- [ ] JWT verified with signature check
- [ ] Rate limiting on auth endpoints
- [ ] Ruff/Pylint/Pyrefly pass with zero errors
- [ ] Tests use AsyncMock, cover error paths

---

## Code Quality Commands

```bash
# Frontend
cd apps/web && bun run lint && bun run type-check

# Backend
ruff check . --fix
ruff format .
pyrefly check
pytest
```
