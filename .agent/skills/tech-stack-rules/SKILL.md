---
name: tech-stack-rules
description: Authoritative coding standards for Nezuko project. Backend (Python 3.13+, AsyncIO, SQLAlchemy 2.0, Pydantic V2, PTB v22, Redis, Sentry, Structlog). Frontend (Next.js 16, React 19, TypeScript strict, TanStack Query, Zustand, Tailwind v4, Shadcn/UI). Triggers on architecture, refactoring, code review, debugging, performance tuning, technical debt, best practices, coding standards, implementation planning, library selection, async patterns, database patterns, type safety, error handling, testing strategies, security. Prevents forbidden anti-patterns. Essential for robustness, security, and performance.
---

# Tech Stack Rules

This skill provides the **authoritative** coding standards for the Nezuko project. It follows **Progressive Disclosure**: use this top-level guide to find the correct reference file for your task.

---

## 🎯 Purpose

Ensure all code adheres to:

- **High-performance**, async-first patterns
- **Type-safe** implementations (Pyright strict + TypeScript strict)
- **Modern tech stack** standards (Python 3.13+ and Next.js 16+)

---

## 🕒 When to Use

This skill **automatically activates** when you mention:

### Keywords (Explicit Triggers)

- `best practices`, `coding standards`, `tech stack`, `project rules`
- `code review`, `audit code`, `check code`, `verify code`
- `refactor`, `clean code`, `technical debt`, `modernize`
- `async pattern`, `database pattern`, `api pattern`
- `type safety`, `strict typing`, `pyright`, `typescript strict`
- `performance`, `optimization`, `memory`, `caching`
- `error handling`, `sentry`, `logging`, `structlog`
- `testing`, `pytest`, `unit test`, `integration test`
- `security`, `authentication`, `jwt`, `deployment`

### Intent Patterns (Implicit Triggers)

- "Is this code correct?" / "Does this follow standards?"
- "How do I implement [async/component/endpoint]?"
- "Review my code" / "Check this implementation"
- "Refactor this" / "Clean up this code"
- "What's the best way to [any implementation task]?"

### File Triggers

- Editing `**/*.py` files → Backend rules apply
- Editing `**/*.ts` or `**/*.tsx` files → Frontend rules apply

---

## 📚 Reference Files

### Backend Development (Python 3.13+)

**Location:** `references/backend/`

| When You're Working On                                | Read This File                                                                    |
| :---------------------------------------------------- | :-------------------------------------------------------------------------------- |
| **Async/await, TaskGroups, event loops, concurrency** | [`async-rules.md`](references/backend/async-rules.md)                             |
| **SQLAlchemy 2.0, Alembic migrations, queries**       | [`database-rules.md`](references/backend/database-rules.md)                       |
| **PTB v22.5+, handlers, conversations, jobs**         | [`telegram-rules.md`](references/backend/telegram-rules.md)                       |
| **Pytest, Structlog, Sentry integration**             | [`testing-logging-rules.md`](references/backend/testing-logging-rules.md)         |
| **Memory, Redis caching, batch processing**           | [`performance-rules.md`](references/backend/performance-rules.md)                 |
| **JWT, secrets, rate limiting, deployment**           | [`security-deployment-rules.md`](references/backend/security-deployment-rules.md) |
| **Common Do/Don't scenarios**                         | [`scenarios-rules.md`](references/backend/scenarios-rules.md)                     |

### Frontend Development (Next.js 16)

**Location:** `references/frontend/`

| When You're Working On                      | Read This File                                                             |
| :------------------------------------------ | :------------------------------------------------------------------------- |
| **TypeScript strict mode, type utilities**  | [`typescript-rules.md`](references/frontend/typescript-rules.md)           |
| **React 19, RSC, Server Components, hooks** | [`react-component-rules.md`](references/frontend/react-component-rules.md) |
| **TanStack Query, Zustand, server state**   | [`state-data-rules.md`](references/frontend/state-data-rules.md)           |
| **React Hook Form, Zod validation**         | [`form-rules.md`](references/frontend/form-rules.md)                       |
| **Tailwind v4, Shadcn/UI, CSS**             | [`styling-rules.md`](references/frontend/styling-rules.md)                 |
| **Performance, accessibility, streaming**   | [`perf-a11y-rules.md`](references/frontend/perf-a11y-rules.md)             |
| **Error boundaries, code quality**          | [`quality-rules.md`](references/frontend/quality-rules.md)                 |
| **Forbidden patterns to avoid**             | [`anti-patterns-rules.md`](references/frontend/anti-patterns-rules.md)     |

---

## ⚠️ Critical Mandates (NEVER Violate)

### Backend (Python)

1. **No blocking calls** in async contexts - `time.sleep()`, `requests` are FORBIDDEN
2. **Type everything** - No `Any` without justification; run `pyright --strict`
3. **TaskGroups for concurrency** - Not raw `asyncio.gather()` for unbounded tasks
4. **Context managers** - Always use `async with` for sessions, connections
5. **Explicit error handling** - Catch specific exceptions, log with context

### Frontend (TypeScript/React)

1. **No `any` type** - Use `unknown` + type guards or explicit types
2. **Server Actions for mutations** - Not API routes for form handling
3. **Server Components by default** - Only `"use client"` when hooks are required
4. **No `localStorage` for server state** - Use TanStack Query
5. **Functional components only** - Class components are FORBIDDEN

---

## 🔄 Quick Decision Tree

```
Need to implement something?
│
├─ Is it Python code?
│   ├─ Involves async/await? → async-rules.md
│   ├─ Database operations? → database-rules.md
│   ├─ Telegram bot logic? → telegram-rules.md
│   ├─ Error handling/logging? → testing-logging-rules.md
│   └─ Performance concern? → performance-rules.md
│
└─ Is it TypeScript/React?
    ├─ Component design? → react-component-rules.md
    ├─ Type definitions? → typescript-rules.md
    ├─ State management? → state-data-rules.md
    ├─ Form handling? → form-rules.md
    ├─ Styling? → styling-rules.md
    └─ Unsure if bad pattern? → anti-patterns-rules.md
```

---

## 🚨 If Something Feels Like a "Hack"

**STOP and check:**

1. `scenarios-rules.md` (backend) or `anti-patterns-rules.md` (frontend)
2. If the pattern isn't covered, ask before implementing

---

**Skill Status**: ACTIVE ✅
**Line Count**: <150 (Progressive Disclosure Rule) ✅
**Reference Files**: 15 domain-specific guides ✅
