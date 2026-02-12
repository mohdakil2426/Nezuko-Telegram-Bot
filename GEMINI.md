# Nezuko Telegram Bot Platform

> **Production-ready Telegram bot platform** for automated channel membership enforcement.  
> Python 3.13+ | python-telegram-bot v22.6+ | Async-first architecture

**Memory Bank**: The `memory-bank/` directory contains the source of truth for project context, patterns, and progress tracking. Read these all files for deep project understanding. **NEVER SKIP THIS STEP**

**⚠️ RESPECT ALL RULES**: You MUST follow every rule, guideline, principle, and best practice documented below. No exceptions, no shortcuts. Violations lead to broken builds, security issues, hard coding, and technical debt. and most importantly project pattern, existing ui style consistancy to insure all ui changes alligned with project, and respect all the rules and guidelines documented below.

---

## 📁 Project Structure

```
nezuko-monorepo/
├── apps/
│   ├── web/          # Next.js 16 Admin Dashboard
│   ├── api/          # FastAPI REST Backend
│   └── bot/          # Telegram Bot (PTB v22)
├── packages/         # Shared packages (@nezuko/types)
├── config/           # Docker, Caddy, deployment configs
├── requirements/     # Python deps (base, api, bot, dev)
├── tests/            # ALL tests (not in apps/)
├── scripts/          # Utility scripts
├── storage/          # Runtime files (gitignored)
├── memory-bank/      # Project context & progress
└── docs/             # Documentation
```

---

## 🚨 Critical Rules

### File Locations (NEVER Violate)

| Type        | Correct Location            | ❌ Wrong                     |
| ----------- | --------------------------- | ---------------------------- |
| Tests       | `tests/api/`, `tests/bot/`  | `apps/*/tests/`              |
| Database    | `storage/data/`             | `apps/*.db`                  |
| Logs        | `storage/logs/`             | `apps/*.log`                 |
| Env files   | `apps/*/.env`, `.env.local` | Root `.env`                  |
| Python deps | `requirements/*.txt`        | Root `requirements.txt` only |

### Code Quality (ZERO TOLERANCE)

**⚠️ Always use LATEST versions. Check before installing:**

```bash
# Python (Bot & API) - 3 tools required:
ruff check apps/bot apps/api         # Lint (0 errors)
ruff format --check .                # Format check
pylint apps/bot apps/api             # Score: 10.00/10
pyrefly check                        # Type check (0 errors)

# TypeScript (Web):
cd apps/web && bun run lint          # ESLint (0 warnings)
cd apps/web && bun run build         # TypeScript (0 errors)

# MUST pass before ANY commit:
pytest                               # All tests pass
```

### Async Patterns (RUF006)

```python
# ✅ Store task references
_tasks: set[asyncio.Task] = set()
task = asyncio.create_task(coro())
_tasks.add(task)
task.add_done_callback(_tasks.discard)

# ❌ WRONG - task may be garbage collected
asyncio.create_task(coro())
```

---

## 🎯 Universal Development Principles

**ALWAYS follow these principles - no exceptions:**

1. **No Hardcoding** - Use environment variables, config files, or constants. Never hardcode URLs, keys, IDs, or magic numbers.
2. **DRY (Don't Repeat Yourself)** - Extract reusable functions, components, and utilities. If you write it twice, refactor.
3. **Single Responsibility** - Each function/class does ONE thing well. If it does multiple things, split it.
4. **Fail Fast** - Validate inputs early, throw meaningful errors, use proper error boundaries.
5. **Type Everything** - Full type coverage in Python and TypeScript. No `any`, no untyped parameters.
6. **Document Intent** - Write docstrings explaining WHY, not just WHAT. Comments for complex logic only.
7. **Test Critical Paths** - Unit tests for business logic, integration tests for APIs, no untested code in production.
8. **Security First** - Sanitize inputs, validate tokens, never log secrets, use parameterized queries.
9. **Performance Aware** - Avoid N+1 queries, cache expensive operations, lazy load when possible.
10. **Clean Commits** - Atomic commits, conventional messages, no broken builds in commit history.

---

## 🛠️ Commands

### Run Services

```bash
python -m apps.bot.main                                    # Bot
cd apps/api && uvicorn src.main:app --reload --port 8080   # API
cd apps/web && bun dev                                     # Web
npx turbo dev                                              # All services
```

### Lint & Format

```bash
ruff check . --fix && ruff format .   # Python auto-fix
cd apps/web && bun run lint --fix     # TypeScript
pylint apps/bot apps/api              # Target: 10.00/10
```

### Test & Migrate

```bash
pytest tests/api/ -v                  # API tests
pytest tests/bot/ -v                  # Bot tests
pytest --cov=apps --cov-report=html   # Coverage

alembic upgrade head                  # Apply migrations
alembic revision --autogenerate -m "desc"  # Create migration
```

---

## ⚙️ Tech Stack

| Layer        | Stack                                                    |
| ------------ | -------------------------------------------------------- |
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui |
| **Backend**  | FastAPI, Python 3.13, SQLAlchemy 2.0, Pydantic V2        |
| **Bot**      | python-telegram-bot v22.6, AsyncIO, Redis                |
| **Database** | SQLite (dev), PostgreSQL (production)                    |
| **Auth**     | Telegram Login Widget (owner-only)                       |
| **Infra**    | Docker, Turborepo, Caddy                                 |

---

## 📐 Coding Standards

### Python (Bot & API)

- **Indent**: 4 spaces | **Line**: 100 chars
- **Format**: `ruff format` | **Lint**: ruff + pylint
- **Types**: Required on all functions
- **Docstrings**: Required on public functions
- **Async**: Always for I/O operations
- **SQLAlchemy**: Use `select()` style, not ORM queries
- **Pydantic**: Use `model_validator`, not `root_validator`

### TypeScript (Web)

- **Indent**: 2 spaces | **Format**: Prettier | **Lint**: ESLint
- **Components**: Functional with hooks
- **TanStack Query**: Use `isPending`, not `isLoading`

---

## 🔑 Key Patterns

| Pattern             | Implementation                                  |
| ------------------- | ----------------------------------------------- |
| **Imports (Bot)**   | `python -m apps.bot.main` from root             |
| **Imports (API)**   | Relative imports within `src/`                  |
| **Imports (Tests)** | `from apps.api.src` or `from apps.bot`          |
| **Env files**       | Per-app: `apps/web/.env.local`, `apps/api/.env` |
| **Dependencies**    | `requirements/{base,api,bot,dev}.txt`           |

---

## ✅ Task Completion Checklist

Before marking any task complete:

- [ ] `ruff check .` passes with 0 errors
- [ ] `pytest` all tests pass
- [ ] Imports work correctly
- [ ] Files in correct locations
- [ ] Tests added for new code
- [ ] Memory-bank updated (if significant)

---

## 🧰 MCP Tools

| Server                  | Purpose                                                             |
| ----------------------- | ------------------------------------------------------------------- |
| **context7**            | Query library docs: `resolve-library-id` → `query-docs`             |
| **supabase-mcp-server** | DB ops: `execute_sql`, `apply_migration`, `list_tables`             |
| **shadcn**              | Components: `view_items_in_registries`, `get_add_command_for_items` |

**🔍 Web Search Rule:** When searching the web or fetching URLs for documentation, best practices, or solutions, always append `2025-2026` to queries to ensure latest, up-to-date information.

## 📚 Next.js Docs Never Skip when working on Next.js

<!-- NEXT-AGENTS-MD-START -->[Next.js Docs Index]|root: ./.next-docs|STOP. What you remember about Next.js is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: npx @next/codemod agents-md --output AGENTS.md
<!-- NEXT-AGENTS-MD-END -->

## 🧠 Skills

**⚠️ MANDATORY: Read relevant skills BEFORE generating any code.**

Skills are located in `.agent/skills/`. Read the **SKILL.md** file inside each skill folder.

**Skill Reading Rules:**

1. **Read the ENTIRE SKILL.md** - Do NOT skip any line. Study everything thoroughly.
2. **Follow all reference files** - If the skill mentions other files, examples, or resources, read those too.
3. **NEVER violate rules** - Skills contain rules, principles, guidelines, and best practices that MUST be followed.
4. **Context-aware reading** - Focus on sections relevant to your current task, but never skip critical rules.
5. **No shortcuts** - Taking shortcuts by skipping skill content leads to errors and tech debt.

**Skill Priority Guide:**

- **Simple tasks** (fix a bug, add a field): Read 1-2 directly relevant skills
- **Medium tasks** (new endpoint, new component): Read category-specific skills (e.g., all Backend skills for API work)
- **Complex tasks** (new feature, refactoring): Read all relevant category skills + cross-cutting skills (testing, patterns)

### Frontend (Web Dashboard)

| Skill                           | When to Use                                        | Path                                        |
| ------------------------------- | -------------------------------------------------- | ------------------------------------------- |
| **nextjs**                      | Any Next.js 16 work, App Router, Server Components | `.agent/skills/nextjs/`                     |
| **shadcn-ui**                   | Adding/customizing shadcn components               | `.agent/skills/shadcn-ui`                   |
| **tanstack-query**              | Data fetching, mutations, caching                  | `.agent/skills/tanstack-query/`             |
| **typescript-expert**           | Complex TS patterns, generics                      | `.agent/skills/typescript-expert`           |
| **typescript-advanced-types**   | Utility types, conditional types                   | `.agent/skills/typescript-advanced-types`   |
| **vercel-react-best-practices** | React 19 patterns, performance                     | `.agent/skills/vercel-react-best-practices` |
| **ui-ux-pro-max**               | Design systems, color palettes, typography         | `.agent/skills/ui-ux-pro-max`               |
| **web-design-guidelines**       | Layout, spacing, responsive design                 | `.agent/skills/web-design-guidelines`       |

### Backend (API & Bot)

| Skill                               | When to Use                                 | Path                                                                       |
| ----------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------- |
| **fastapi**                         | FastAPI endpoints, dependencies, middleware | `.agent/skills/fastapi`                                                    |
| **async-python-patterns**           | Async/await, concurrency, event loops       | `.agent/skills/python-development/skills/async-python-patterns/`           |
| **python-code-style**               | PEP 8, naming conventions, formatting       | `.agent/skills/python-development/skills/python-code-style/`               |
| **python-type-safety**              | Type hints, generics, Pydantic              | `.agent/skills/python-development/skills/python-type-safety/`              |
| **python-error-handling**           | Exceptions, error recovery, logging         | `.agent/skills/python-development/skills/python-error-handling/`           |
| **python-design-patterns**          | Factory, singleton, dependency injection    | `.agent/skills/python-development/skills/python-design-patterns/`          |
| **python-testing-patterns**         | pytest, fixtures, mocking                   | `.agent/skills/python-development/skills/python-testing-patterns/`         |
| **python-performance-optimization** | Profiling, caching, memory management       | `.agent/skills/python-development/skills/python-performance-optimization/` |
| **python-anti-patterns**            | Common mistakes to avoid                    | `.agent/skills/python-development/skills/python-anti-patterns/`            |
| **python-resilience**               | Retry, circuit breaker, fallbacks           | `.agent/skills/python-development/skills/python-resilience/`               |
| **python-background-jobs**          | Task queues, scheduled jobs                 | `.agent/skills/python-development/skills/python-background-jobs/`          |
| **python-observability**            | Logging, metrics, tracing                   | `.agent/skills/python-development/skills/python-observability/`            |

### Database

| Skill                                | When to Use                              | Path                                             |
| ------------------------------------ | ---------------------------------------- | ------------------------------------------------ |
| **postgresql-table-design**          | Schema design, indexes, constraints      | `.agent/skills/postgresql-table-design/`         |
| **supabase-postgres-best-practices** | Supabase auth, RLS, Edge Functions       | `.agent/skills/supabase-postgres-best-practices` |
| **timescaledb**                      | Time-series data, hypertables, analytics | `.agent/skills/timescaledb/`                     |

### DevOps & Tooling

| Skill                        | When to Use                   | Path                                      |
| ---------------------------- | ----------------------------- | ----------------------------------------- |
| **git-commit**               | Conventional commits, staging | `.agent/skills/git-commit/`               |
| **github-actions-templates** | CI/CD workflows               | `.agent/skills/github-actions-templates/` |
| **powershell-expert**        | Windows scripts, automation   | `.agent/skills/powershell-expert`         |

### Project Management

| Skill                      | When to Use                 | Path                                    |
| -------------------------- | --------------------------- | --------------------------------------- |
| **openspec-new-change**    | Start a new feature/fix     | `.agent/skills/openspec-new-change/`    |
| **openspec-apply-change**  | Implement tasks from change | `.agent/skills/openspec-apply-change/`  |
| **openspec-verify-change** | Verify before archiving     | `.agent/skills/openspec-verify-change/` |

---

_Last Updated: 2026-02-05_
