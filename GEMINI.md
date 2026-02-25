# Nezuko Telegram Bot Platform

> **Production-ready Telegram bot platform** for automated channel membership enforcement.  
> Python 3.13+ | python-telegram-bot v22.6+ | Async-first architecture

**Memory Bank**: The `memory-bank/` directory contains the source of truth for project context, patterns, and progress tracking. Read these all files for deep project understanding. **NEVER SKIP THIS STEP**

**⚠️ RESPECT ALL RULES**: You MUST follow every rule, guideline, principle, and best practice documented below. No exceptions, no shortcuts. Violations lead to broken builds, security issues, hard coding, and technical debt. and most importantly project pattern, existing ui style consistancy to insure all ui changes alligned with project, and respect all the rules and guidelines documented below.

---

## 📁 Project Structure

```
nezuko/
├── apps/
│   ├── web/          # Next.js 16 Admin Dashboard (~120 TS files)
│   └── bot/          # Telegram Bot (PTB v22, ~25 Python files)
├── insforge/         # InsForge migration files & Edge Functions
│   ├── migrations/   # SQL migration files (001-005)
│   └── functions/    # Edge Functions (manage-bot, test-webhook)
├── openspec/         # OpenSpec change management artifacts
├── config/           # Docker, Caddy, deployment configs
├── tests/            # ALL tests (not in apps/)
├── scripts/          # Utility scripts
├── apps/bot/logs/    # Bot runtime logs (gitignored)
├── memory-bank/      # Project context & progress
└── docs/             # Documentation
```

---

## 🚨 Critical Rules

### File Locations (NEVER Violate)

| Type        | Correct Location                       | ❌ Wrong                      |
| ----------- | -------------------------------------- | ----------------------------- |
| Tests       | `tests/bot/`                           | `apps/*/tests/`               |
| Database    | InsForge managed PostgreSQL (cloud)    | Local sqlite or `apps/*.db`   |
| Migrations  | `insforge/migrations/*.sql`            | `alembic/versions/`           |
| Logs        | `apps/bot/logs/`                       | `apps/*.log`                  |
| Env files   | `apps/bot/.env`, `apps/web/.env.local` | Root `.env`                   |
| Python deps | `requirements.txt`, `requirements-dev.txt` | `requirements/*.txt`      |

### Code Quality (ZERO TOLERANCE)

**⚠️ Always use LATEST versions. Check before installing:**

```bash
# Python (Bot) - 3 tools required:
ruff check apps/bot                  # Lint (0 errors)
ruff format --check .                # Format check
pylint apps/bot --rcfile=pyproject.toml  # Score: 10.00/10
.venv/Scripts/python.exe -m pyrefly check  # Type check (0 errors)

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
python -m apps.bot.main    # Bot (run from project root)
cd apps/web && bun dev     # Web (port 3000)
```

### Lint & Format

```bash
ruff check apps/bot --fix && ruff format .   # Python auto-fix
cd apps/web && bun run lint --fix            # TypeScript
pylint apps/bot --rcfile=pyproject.toml      # Target: 10.00/10
```

### Test & Migrate

```bash
pytest tests/bot/ -v                  # Bot tests
pytest --cov=apps --cov-report=html   # Coverage

# Database migrations are managed via InsForge migrations:
# → Edit insforge/migrations/*.sql and apply via InsForge dashboard
```

---

## ⚙️ Tech Stack

| Layer        | Stack                                                                      |
| ------------ | -------------------------------------------------------------------------- |
| **Frontend** | Next.js 16.1, React 19.2, TypeScript 5.9, Tailwind v4, shadcn/ui, Recharts |
| **Bot**      | python-telegram-bot v22.6, Python 3.13, AsyncIO, SQLAlchemy 2.0, AsyncPG  |
| **BaaS**     | InsForge — managed PostgreSQL, Realtime WebSocket, Storage, Edge Functions |
| **Auth**     | None (development mode — direct dashboard access)                          |
| **Infra**    | Docker (bot), Vercel (web hosting), Caddy                                  |

---

## 📐 Coding Standards

### Python (Bot)

- **Indent**: 4 spaces | **Line**: 100 chars
- **Format**: `ruff format` | **Lint**: ruff + pylint (target 10.00/10)
- **Types**: Required on all functions (pyrefly enforced)
- **Docstrings**: Required on public functions
- **Async**: Always for I/O operations
- **SQLAlchemy**: Use `select()` style, not ORM queries
- **Errors**: Catch specific exceptions (`PostgresError`, `TelegramError`) — never bare `except Exception`

### TypeScript (Web)

- **Indent**: 2 spaces | **Format**: Prettier | **Lint**: ESLint
- **Components**: Functional with hooks
- **TanStack Query**: Use `isPending`, not `isLoading`

---

## 🔑 Key Patterns

| Pattern               | Implementation                                         |
| --------------------- | ------------------------------------------------------ |
| **Run Bot**           | `python -m apps.bot.main` from project root            |
| **Imports (Bot)**     | Absolute from package root, e.g. `from apps.bot.core` |
| **Imports (Tests)**   | `from apps.bot`                                        |
| **Env (Bot)**         | `apps/bot/.env`                                        |
| **Env (Web)**         | `apps/web/.env.local`                                  |
| **Python deps**       | `requirements.txt` (prod) + `requirements-dev.txt`     |
| **Frontend deps**     | `apps/web/package.json`, managed with `bun`            |
| **DB migrations**     | Raw SQL in `insforge/migrations/`                      |
| **InsForge SDK**      | `import { insforge } from "@/lib/insforge"` (web)      |

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

| Server         | Purpose                                                                          |
| -------------- | -------------------------------------------------------------------------------- |
| **context7**   | Query library docs: `resolve-library-id` → `query-docs`                          |
| **insforge**   | DB ops: `execute_sql`, `list_tables`, `apply_migration`, storage & edge functions |
| **shadcn**     | Components: `view_items_in_registries`, `get_add_command_for_items`              |

**🔍 Web Search Rule:** When searching the web or fetching URLs for documentation, best practices, or solutions, always append `2025-2026` to queries to ensure latest, up-to-date information.

## 📚 Next.js Docs Never Skip when working on Next.js

<!-- NEXT-AGENTS-MD-START -->[Next.js Docs Index]|root: ./.next-docs|STOP. What you remember about Next.js is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: npx @next/codemod agents-md --output AGENTS.md
<!-- NEXT-AGENTS-MD-END -->

## 🧠 Skills

**⚠️ MANDATORY: Read relevant skills BEFORE generating any code.**

Skills are located in `.agent/skills/` or `.agents/skills/` — check the path column. Read the **SKILL.md** file inside each skill folder.

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

| Skill                           | When to Use                                        | Path                                          |
| ------------------------------- | -------------------------------------------------- | --------------------------------------------- |
| **nextjs**                      | Any Next.js 16 work, App Router, Server Components | `.agents/skills/nextjs/`                      |
| **shadcn-ui**                   | Adding/customizing shadcn components               | `.agents/skills/shadcn-ui`                    |
| **tanstack-query**              | Data fetching, mutations, caching                  | `.agents/skills/tanstack-query/`              |
| **typescript-expert**           | Complex TS patterns, generics                      | `.agents/skills/typescript-expert`            |
| **typescript-advanced-types**   | Utility types, conditional types                   | `.agents/skills/typescript-advanced-types`    |
| **vercel-react-best-practices** | React 19 patterns, performance                     | `.agents/skills/vercel-react-best-practices`  |
| **ui-ux-pro-max**               | Design systems, color palettes, typography         | `.agents/skills/ui-ux-pro-max`                |
| **web-design-guidelines**       | Layout, spacing, responsive design                 | `.agents/skills/web-design-guidelines`        |
| **motion**                      | React animations, gestures, scroll effects         | `.agents/skills/motion`                       |

### Backend (API & Bot)

| Skill                               | When to Use                                 | Path                                                                       |
| ----------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------- |
| **fastapi**                         | FastAPI endpoints, dependencies, middleware | `.agents/skills/fastapi`                                                   |
| **insforge**                        | InsForge BaaS — tables, auth, SDK, storage  | `.agents/skills/insforge`                                                  |
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
| **python-configuration**            | Config management, env vars, settings       | `.agent/skills/python-development/skills/python-configuration/`            |
| **python-packaging**                | Package structure, pyproject, build         | `.agent/skills/python-development/skills/python-packaging/`                |
| **python-project-structure**        | Layout, modules, imports organisation       | `.agent/skills/python-development/skills/python-project-structure/`        |
| **python-resource-management**      | Context managers, file handles, cleanup     | `.agent/skills/python-development/skills/python-resource-management/`      |
| **uv-package-manager**              | uv install, lockfiles, virtualenvs          | `.agent/skills/python-development/skills/uv-package-manager/`              |

### Database

| Skill                                | When to Use                              | Path                                               |
| ------------------------------------ | ---------------------------------------- | -------------------------------------------------- |
| **postgresql-table-design**          | Schema design, indexes, constraints      | `.agents/skills/postgresql-table-design/`          |
| **postgresql-best-practices**        | Query optimization, admin, performance   | `.agents/skills/postgresql-best-practices`         |
| **postgres-pro**                     | Advanced queries, EXPLAIN, JSONB, VACUUM | `.agents/skills/postgres-pro`                      |
| **supabase-postgres-best-practices** | InsForge/Supabase RLS, Edge Functions    | `.agents/skills/supabase-postgres-best-practices`  |
| **timescaledb**                      | Time-series data, hypertables, analytics | `.agents/skills/timescaledb/`                      |

### DevOps & Tooling

| Skill                        | When to Use                           | Path                                       |
| ---------------------------- | ------------------------------------- | ------------------------------------------ |
| **git-commit**               | Conventional commits, staging         | `.agent/skills/git-commit/`                |
| **github-actions-templates** | CI/CD workflows                       | `.agent/skills/github-actions-templates/`  |
| **powershell-expert**        | Windows scripts, automation           | `.agents/skills/powershell-expert`         |
| **playwright-cli**           | Browser automation, testing, scraping | `.agents/skills/playwright-cli`            |
| **skill-creator**            | Create or update agent skills         | `.agents/skills/skill-creator`             |

### Project Management

| Skill                        | When to Use                                  | Path                                          |
| ---------------------------- | -------------------------------------------- | --------------------------------------------- |
| **openspec-new-change**      | Start a new feature/fix                      | `.agent/skills/openspec-new-change/`          |
| **openspec-ff-change**       | Fast-forward all artifacts in one go         | `.agent/skills/openspec-ff-change/`           |
| **openspec-apply-change**    | Implement tasks from a change                | `.agent/skills/openspec-apply-change/`        |
| **openspec-continue-change** | Create the next artifact for a change        | `.agent/skills/openspec-continue-change/`     |
| **openspec-verify-change**   | Verify implementation before archiving       | `.agent/skills/openspec-verify-change/`       |
| **openspec-archive-change**  | Archive a completed change                   | `.agent/skills/openspec-archive-change/`      |
| **openspec-bulk-archive**    | Archive multiple changes at once             | `.agent/skills/openspec-bulk-archive-change/` |
| **openspec-sync-specs**      | Sync delta specs to main specs               | `.agent/skills/openspec-sync-specs/`          |
| **openspec-explore**         | Think through ideas before starting a change | `.agent/skills/openspec-explore/`             |
| **openspec-onboard**         | Guided walkthrough of the full OPSX cycle    | `.agent/skills/openspec-onboard/`             |

---

_Last Updated: 2026-02-05_
