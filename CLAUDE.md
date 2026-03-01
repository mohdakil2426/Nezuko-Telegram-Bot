# Nezuko Telegram Bot Platform

> **Production-ready Telegram bot platform** for automated channel membership enforcement.  
> Python 3.13.1 | uv (lockfile) | python-telegram-bot v22.6+ | Async-first architecture

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
| Python deps | `pyproject.toml`, `uv.lock`            | `requirements.txt`, `pip`     |

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
11. **KISS (Keep It Simple, Stupid)** - Prioritize simple, readable, and maintainable solutions over complex, over-engineered architectures. Simple is better than complex.

---

## 🛠️ Commands

### Run Services

```bash
uv run python -m apps.bot.main    # Bot (run from project root)
cd apps/web && bun dev            # Web (port 3000)
```

### Lint & Format

**Python (Bot):**
```bash
uv run ruff check apps/bot --fix && uv run ruff format .   # Auto-fix & Format (Ruff)
uv run pylint apps/bot --rcfile=pyproject.toml             # Deep analysis (Target: 10/10)
```

**TypeScript (Web):**
```bash
cd apps/web && bun run lint --fix                          # ESLint (Logic fixes)
cd apps/web && bun x prettier src --write                  # Prettier (Tailwind & style fix)
```

### Quality & Testing

**Python (Bot):**
```bash
uv run pytest tests/bot/ -v                  # Run all tests
uv run pytest --cov=apps --cov-report=html   # Coverage report
```

**TypeScript (Web):**
```bash
cd apps/web && bun run type-check            # TypeScript validation (TSC)
cd apps/web && bun x knip                    # Find dead code & unused deps
```

# Database migrations are managed via InsForge migrations:
# → Edit insforge/migrations/*.sql and apply via InsForge dashboard


---

## ⚙️ Tech Stack

| Layer        | Stack                                                                      |
| ------------ | -------------------------------------------------------------------------- |
| **Frontend** | Next.js 16.1, React 19.2, TypeScript 5.9, Tailwind v4, shadcn/ui, Recharts |
| **Bot**      | python-telegram-bot v22.6, Python 3.13.1, AsyncIO, SQLAlchemy 2.0, AsyncPG  |
| **BaaS**     | InsForge — managed PostgreSQL, Realtime WebSocket, Storage, Edge Functions |
| **Auth**     | None (development mode — direct dashboard access)                          |
| **Package**  | uv (high-performance dependency resolver & lockfile)                       |
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
| **Python deps**       | `pyproject.toml`, `uv.lock` (managed with `uv`)       |
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

Skills are located in `.claude/skills/` — check the path column. Read the **SKILL.md** file inside each skill folder.

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
| **nextjs**                      | Any Next.js 16 work, App Router, Server Components | `.claude/skills/nextjs/`                      |
| **shadcn-ui**                   | Adding/customizing shadcn components               | `.claude/skills/shadcn-ui`                    |
| **tanstack-query**              | Data fetching, mutations, caching                  | `.claude/skills/tanstack-query/`              |
| **typescript-expert**           | Complex TS patterns, generics                      | `.claude/skills/typescript-expert`            |
| **typescript-advanced-types**   | Utility types, conditional types                   | `.claude/skills/typescript-advanced-types`    |
| **vercel-react-best-practices** | React 19 patterns, performance                     | `.claude/skills/vercel-react-best-practices`  |
| **web-design-guidelines**       | Layout, spacing, responsive design                 | `.claude/skills/web-design-guidelines`        |
| **motion**                      | React animations, gestures, scroll effects         | `.claude/skills/motion`                       |
| **responsiveness-check**        | Breakpoint testing, mobile-first verification      | `.claude/skills/responsiveness-check`         |

### Backend (API & Bot)

| Skill                               | When to Use                                 | Path                                                                       |
| ----------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------- |
| **fastapi**                         | FastAPI endpoints, dependencies, middleware | `.claude/skills/fastapi`                                                   |
| **insforge**                        | InsForge BaaS — tables, auth, SDK, storage  | `.claude/skills/insforge`                                                  |
| **websocket-engineer**              | Real-time bi-directional communication      | `.claude/skills/websocket-engineer`           |

### Database

| Skill                                | When to Use                              | Path                                               |
| ------------------------------------ | ---------------------------------------- | -------------------------------------------------- |
| **postgresql-table-design**          | Schema design, indexes, constraints      | `.claude/skills/postgresql-table-design/`          |
| **postgresql-best-practices**        | Query optimization, admin, performance   | `.claude/skills/postgresql-best-practices`         |
| **postgres-pro**                     | Advanced queries, EXPLAIN, JSONB, VACUUM | `.claude/skills/postgres-pro`                      |

### DevOps & Tooling

| Skill                        | When to Use                           | Path                                       |
| ---------------------------- | ------------------------------------- | ------------------------------------------ |
| **docker-expert**            | Containerization, Multi-stage builds, Compose | `.claude/skills/docker-expert`             |
| **git-commit**               | Conventional commits, staging         | `.claude/skills/git-commit/`               |
| **github-actions-templates** | CI/CD workflows                       | `.claude/skills/github-actions-templates/` |
| **mermaid-diagrams**         | UML, Flowcharts, Sequence diagrams    | `.claude/skills/mermaid-diagrams`          |
| **playwright-cli**           | Browser automation, testing, scraping | `.claude/skills/playwright-cli`            |
| **powershell-expert**        | Windows scripts, automation           | `.claude/skills/powershell-expert`         |
| **skill-creator**            | Create or update agent skills         | `.claude/skills/skill-creator`             |

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

_Last Updated: 2026-03-01_
