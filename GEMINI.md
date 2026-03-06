# Nezuko Telegram Bot Platform

> **Production-ready Telegram bot platform** for automated channel membership enforcement.
> Python 3.13.1 | uv (lockfile) | python-telegram-bot v22.6+ | Async-first architecture

**Memory Bank**: The `memory-bank/` directory contains the source of truth for project context, patterns, and progress tracking. Read ALL files for deep project understanding. **NEVER SKIP THIS STEP.**

**⚠️ RESPECT ALL RULES**: You MUST follow every rule, guideline, principle, and best practice documented below. No exceptions, no shortcuts. Violations lead to broken builds, security issues, hardcoding, and technical debt. Respect project patterns, existing UI style consistency, and ensure all changes align with the project.

---

## 🏗️ Architecture (2-Tier InsForge BaaS)

```
Web Dashboard (Next.js 16) ──► @insforge/sdk ──► InsForge BaaS (PostgreSQL + Realtime WS)
                                                    ▲          ▲
Bot Engine (Python 3.13) ──────► httpx REST ────────┘          │ Socket.IO pushes
  └─ realtime_client.py (Socket.IO) ───────────────────────────┘
  └─ insforge_client.py                              DB triggers fire on:
  └─ status_writer.py (30s heartbeat)                • verification_log INSERT → "verification"
  └─ command_worker.py (WS-driven, 30s fallback)     • bot_status CHANGE → "status_changed"
  └─ member_sync.py (15min JobQueue)                 • admin_logs INSERT → "new_log"
  └─ verification_logger.py (fire-and-forget)        • admin_commands CHANGE → "command_updated"
  └─ api_call_logger.py (fire-and-forget)            • bot_instances CHANGE → "bot_instance_changed"
```

- **No custom API server** — both bot and web talk directly to InsForge REST / SDK.
- **SQLAlchemy is test-only** (SQLite in-memory for fast offline pytest runs). Never import `database.py`, `crud.py`, or `models.py` from production code.
- **Bot DB access**: `insforge_client.py` (`httpx` REST) — never raw PostgreSQL.
- **Web DB access**: `@insforge/sdk` via `import { insforge } from "@/lib/insforge"`.

---

## 📁 Project Structure

```
nezuko/
├── apps/
│   ├── bot/          # Telegram Bot (PTB v22, ~25 Python files)
│   │   ├── core/     # insforge_client, bot_manager, loader, encryption, cache
│   │   ├── handlers/ # admin/ (setup, settings, help), events/ (join, leave, message), verify, error
│   │   ├── services/ # verification, protection, member_sync, status_writer, command_worker
│   │   ├── database/ # verification_logger, api_call_logger, insforge_log_handler (tests: models, crud)
│   │   └── utils/    # health, metrics, resilience, logging, sentry, auto_delete, ui
│   └── web/          # Next.js 16 Admin Dashboard (~120 TS files)
│       └── src/
│           ├── app/dashboard/  # 7 route groups (analytics, groups, channels, bots, logs, settings)
│           ├── components/     # 70+ components (charts/, analytics/, dashboard/, settings/, ui/)
│           ├── lib/            # services/, hooks/, mock/, actions/, schemas/, query-keys.ts, insforge.ts
│           ├── providers/      # Theme, Query, Motion, Insforge auth providers
│           └── proxy.ts        # InsforgeMiddleware route guard (Next.js 16 proxy pattern)
├── insforge/
│   ├── migrations/   # SQL migration files (001-018)
│   └── functions/    # Edge Functions (manage-bot — AES-256-GCM token encryption)
├── tests/bot/        # ALL tests live here (58 pytest tests) — NEVER in apps/
├── openspec/         # OpenSpec change management artifacts
├── scripts/          # Dev utility scripts
├── memory-bank/      # 6 context files (project brief, active context, system patterns, etc.)
└── docs/             # Technical documentation
```

---

## 🚨 Critical Rules (NEVER Violate)

### File Locations

| Type | ✅ Correct Location | ❌ Wrong |
|---|---|---|
| Tests | `tests/bot/` | `apps/*/tests/` |
| Database | InsForge managed PostgreSQL (cloud) | Local SQLite, `apps/*.db` |
| Migrations | `insforge/migrations/*.sql` | `alembic/versions/` |
| Logs | `apps/bot/logs/` (gitignored) | `apps/*.log`, root logs |
| Bot env | `apps/bot/.env` | Root `.env` |
| Web env | `apps/web/.env.local` | Root `.env` |
| Python deps | `pyproject.toml` + `uv.lock` | `requirements.txt`, `pip` |
| Frontend deps | `apps/web/package.json` (managed with `bun`) | `npm`, `yarn` |
| Canonical schema | `insforge/migrations/009_clean_schema.sql` | Any other file |

### Database Rules

- **All Telegram IDs MUST be `BIGINT`** — they exceed INT4 max (2.1B). Bot ID `8265490825` = 8.26B.
- **Always grant sequences** after `CREATE TABLE`: `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;`
- **UPSERT conflicts**: Use PATCH-then-POST pattern when table has multiple UNIQUE columns (PostgREST 409).
- **Denormalized counters** (`linked_channels_count`, `linked_groups_count`): Always recalculate from `group_channel_links` rows — never increment/decrement.

### Security Rules

- **Master key stays server-side only** — `addBotSecure()` server action handles encryption entirely on the server.
- **Never log secrets** — error messages sanitized to generic text for clients, real errors logged server-side.
- **No hardcoded fallback URLs** — throw if env var missing (e.g., `NEXT_PUBLIC_INSFORGE_BASE_URL`).
- **Dev bypass guarded** — `NEXT_PUBLIC_DEV_LOGIN=true` only works when `NODE_ENV !== "production"`.
- **Open redirect prevention** — validate `redirectTo` doesn't start with `//`.
- **RLS on all tables** — 38 policies across 11 tables (migration 012).

---

## 🎯 Universal Development Principles

1. **No Hardcoding** — Use env vars, config files, or named constants. Never hardcode URLs, keys, IDs, or magic numbers.
2. **DRY** — Extract reusable functions, components, and utilities. If you write it twice, refactor.
3. **Single Responsibility** — Each function/class does ONE thing well. Split if doing multiple things.
4. **Fail Fast** — Validate inputs early, throw meaningful errors, use proper error boundaries.
5. **Type Everything** — Full type coverage in Python (Pyrefly) and TypeScript (TSC strict). No `any`, no untyped parameters.
6. **Document Intent** — Docstrings explain WHY, not just WHAT. Comments for complex logic only.
7. **Test Critical Paths** — Unit tests for business logic. No untested code in production.
8. **Security First** — Sanitize inputs, validate tokens, never log secrets, use parameterized queries.
9. **Performance Aware** — Avoid N+1 queries, cache expensive operations, lazy load when possible.
10. **Clean Commits** — Atomic commits, conventional messages, no broken builds in history.
11. **KISS** — Simple, readable, maintainable solutions over complex, over-engineered architectures.

---

## ⚙️ Tech Stack

| Layer | Stack |
|---|---|
| **Bot** | Python 3.13, python-telegram-bot v22.6 (with JobQueue, rate-limiter, http2), httpx <0.29, Redis 7.1+, cryptography 45+, python-socketio 5.16+ |
| **Frontend** | Next.js 16.1, React 19.2, TypeScript 5.9, Tailwind v4, shadcn/ui, Recharts 2.15, Motion 12.27+, TanStack Query 5.90+ |
| **BaaS** | InsForge — managed PostgreSQL, Realtime WebSocket, Storage (2 buckets), Edge Functions |
| **Auth** | InsForge Auth (email/password + Google/GitHub OAuth), `InsforgeMiddleware` route guard, `insforge_session` cookie, RLS |
| **Infra** | Docker (bot), Vercel (web), Caddy reverse proxy |
| **Package** | `uv` (Python), `bun` (TypeScript) |

---

## 🛠️ Commands

### Run Services

```bash
uv run python -m apps.bot.main    # Bot (from project root — detects standalone/dashboard mode)
cd apps/web && bun dev             # Web (port 3000)
docker compose -f docker-compose.local.yml up -d  # Redis (local)
```

### Lint & Format

```bash
# ── Python (Bot) ──────────────────────────────────────────────────────────────
uv run ruff check apps/bot --fix && uv run ruff format .   # Auto-fix + format
uv run pylint apps/bot --rcfile=pyproject.toml              # Deep analysis (target: 10.00/10)
.venv/Scripts/python.exe -m pyrefly check                   # Type check (0 errors)

# ── TypeScript (Web) ──────────────────────────────────────────────────────────
cd apps/web && bun run lint --fix                           # ESLint (0 warnings, --max-warnings 0)
cd apps/web && bun x prettier src --write                   # Prettier + Tailwind sort
cd apps/web && bun run type-check                           # TSC --noEmit (0 errors)
```

### Quality & Testing

```bash
# ── Python ────────────────────────────────────────────────────────────────────
uv run pytest tests/bot/ -v                   # Run all 58 tests
uv run pytest --cov=apps --cov-report=html    # Coverage report

# ── TypeScript ────────────────────────────────────────────────────────────────
cd apps/web && bun run build                  # Full production build (0 errors)
cd apps/web && bun x knip                     # Find dead code & unused deps
```

---

## 📐 Coding Standards — Python (Bot)

### Formatting & Style

| Setting | Value | Enforced By |
|---|---|---|
| Indent | 4 spaces | `.editorconfig`, Ruff |
| Line length | 100 chars | `pyproject.toml` → `[tool.ruff] line-length = 100` |
| Quote style | Double quotes | `[tool.ruff.format] quote-style = "double"` |
| Target version | Python 3.13 | `target-version = "py313"` |
| Import order | `future → stdlib → third-party → first-party → local` | `[tool.ruff.lint.isort]` |

### Ruff Lint Rules (Active)

```
E     — pycodestyle errors
W     — pycodestyle warnings
F     — Pyflakes (unused imports, undefined names)
I     — isort (import sorting)
B     — flake8-bugbear (common bugs)
C4    — flake8-comprehensions (unnecessary list/dict/set comprehensions)
UP    — pyupgrade (modernize syntax)
ARG   — flake8-unused-arguments
SIM   — flake8-simplify (code simplification)
RUF   — Ruff-specific rules (includes RUF006 asyncio task references)
PERF  — Performance anti-patterns
ASYNC — Async best practices
```

**Ignored**: `E501` (formatter handles), `B008` (Depends()), `B904`, `ARG001/002` (framework callbacks), `RUF001` (emoji), `RUF012` (Pydantic)

### Pylint Config (Target: 10.00/10)

- **Design limits**: `max-args=10`, `max-locals=25`, `max-returns=8`, `max-branches=15`, `max-statements=60`
- **Disabled checks**: `missing-*-docstring` (handled by Ruff), `invalid-name`, `too-few-public-methods`, `too-many-arguments`, `import-error` (Pyrefly covers), `not-callable` (SQLAlchemy false positive), `import-outside-toplevel` (lazy imports), `unused-argument` (framework callbacks)
- **Parallel**: `jobs = 0` (auto-detect CPU cores)

### Pyrefly Type Checker (0 errors required)

- **Strict mode**: `untyped-def-behavior = "check-and-infer-return-type"`
- **Includes**: `apps/bot`
- **Excludes**: `tests/`, `venv/`, `__pycache__/`, `node_modules/`, `apps/web/`
- **Missing imports tolerated**: `alembic`, `apscheduler`, `prometheus_client`, `sentry_sdk`

### Python Coding Patterns

```python
# ✅ Imports — always absolute from package root
from apps.bot.core import insforge_client
from apps.bot.services.verification import check_membership

# ✅ DB operations — always insforge_client (never SQLAlchemy in production)
channels = await insforge_client.get_group_channels(chat_id)
await insforge_client.create_owner(user_id, username)

# ✅ Fire-and-forget analytics
from apps.bot.database.verification_logger import log_verification_async
log_verification_async(user_id, group_id, channel_id, "verified", latency_ms=45)

# ✅ Async task references (RUF006 — prevent garbage collection)
_background_tasks: set[asyncio.Task[None]] = set()
task = asyncio.create_task(some_coroutine())
_background_tasks.add(task)
task.add_done_callback(_background_tasks.discard)

# ✅ Specific exception handling
except TelegramError as e: ...        # Telegram SDK
except httpx.HTTPError as e: ...      # InsForge REST API
except (OSError, RuntimeError) as e: ... # Network/system
except asyncio.CancelledError: ...    # Task cancellation

# ❌ NEVER do these:
asyncio.create_task(coro())           # Task lost to GC
except Exception as e: ...            # Too broad — masks bugs
async with get_session() as session:  # SQLAlchemy is test-only
from apps.bot.database.crud import *  # crud.py is test-only
```

---

## 📐 Coding Standards — TypeScript (Web)

### Formatting & Style

| Setting | Value | Enforced By |
|---|---|---|
| Indent | 2 spaces | `.editorconfig`, Prettier |
| Line length | 100 chars | `.prettierrc` → `printWidth: 100` |
| Semicolons | Yes | `"semi": true` |
| Quotes | Double | `"singleQuote": false` |
| Trailing commas | ES5 | `"trailingComma": "es5"` |
| Tailwind sort | Auto | `prettier-plugin-tailwindcss` |

### ESLint Config (Flat Config — eslint.config.mjs)

- **Base**: `eslint-config-next` (includes Next.js + React + a11y rules)
- **Plugin**: `eslint-plugin-react-compiler` → `"react-compiler/react-compiler": "error"`
- **Max warnings**: `0` (`--max-warnings 0` in `lint` script)
- **Ignores**: `.next/`, `out/`, `build/`, `node_modules/`

### TypeScript Coding Patterns

```typescript
// ✅ InsForge SDK — singleton client
import { insforge } from "@/lib/insforge";
const { data, error } = await insforge.database.rpc("get_dashboard_stats");

// ✅ Service → Hook → Component pattern
// service: fetches data via InsForge SDK
// hook: wraps in useQuery with queryKeys.* factory
// component: consumes hook, renders UI

// ✅ TanStack Query v5 — correct API
const { data, isPending, error } = useQuery({ ... });  // isPending, NOT isLoading
refetchInterval: REFETCH_INTERVALS.STANDARD,            // Shared constants, NOT magic numbers
staleTime: STALE_TIMES.SHORT,

// ✅ Server Components by default, "use client" only when needed
// ✅ Motion via LazyMotion + domAnimation (~4.6 KB, not full 34 KB)
// ✅ Intl API for date/number formatting (no locale hardcoding)
// ✅ ARIA patterns: role="figure", aria-label, aria-live="polite"
// ✅ Chart containers: aspect-auto h-[250px] md:h-[300px] w-full (time-series)

// ❌ NEVER do these:
const x: any = ...;                    // No any
refetchIntervalInBackground: true      // Wastes 25+ req/min (removed in Phase 77)
toLocaleDateString("en-US")            // Hardcoded locale — use formatDate() from lib/format.ts
```

---

## 🔑 Key Patterns

| Pattern | Implementation |
|---|---|
| **Run Bot** | `python -m apps.bot.main` from project root |
| **Bot Operating Modes** | `DASHBOARD_MODE=true` → multi-bot from DB; `false` → single bot from `BOT_TOKEN` |
| **Imports (Bot)** | Absolute: `from apps.bot.core.insforge_client import get_owner` |
| **Imports (Tests)** | `from apps.bot.services.verification import check_membership` |
| **Imports (Web)** | `import { insforge } from "@/lib/insforge"` |
| **Env (Bot)** | `apps/bot/.env` (template: `apps/bot/.env.example`) |
| **Env (Web)** | `apps/web/.env.local` (template: `apps/web/.env.example`) |
| **Python deps** | `pyproject.toml` + `uv.lock` (managed with `uv`) |
| **Frontend deps** | `apps/web/package.json` (managed with `bun`) |
| **DB migrations** | Raw SQL in `insforge/migrations/` (001-018) |
| **Query keys** | `queryKeys.*` factory in `lib/query-keys.ts` |
| **Timing constants** | `REFETCH_INTERVALS.{FAST,STANDARD,SLOW}`, `STALE_TIMES.{SHORT,STANDARD,LONG}` |
| **Chart period selector** | `<ChartPeriodSelector>` (responsive buttons, NOT hidden Select dropdowns) |
| **Chart empty state** | `<ChartEmptyState>` (shared, `aria-live="polite"`) |
| **Auth guard (proxy)** | `InsforgeMiddleware` in `proxy.ts` (Next.js 16 proxy pattern) |
| **Auth guard (actions)** | `requireAuth()` checks `insforge-session` cookie at top of every server action |
| **Encryption** | AES-256-GCM via `core/encryption.py` (bot) + `manage-bot` Edge Function (web) |
| **Token storage** | `nezuko_secrets` table (Security Vault) — auto-synced on bot startup |

---

## ✅ Pre-Commit Checklist (ENFORCED — ZERO TOLERANCE)

**🚨 MANDATORY**: You MUST run these commands and verify they pass BEFORE completing ANY task. No exceptions. If a check fails, FIX IT before moving on. Do NOT leave broken lints, type errors, or failing tests for the user to deal with.

### When to Run What

| Change Scope | Python Checks | TypeScript Checks |
|---|---|---|
| Bot code only (`apps/bot/`) | ✅ ALL 5 Python checks | ❌ Skip |
| Web code only (`apps/web/`) | ❌ Skip | ✅ ALL 2 TypeScript checks |
| Both bot + web | ✅ ALL 5 Python checks | ✅ ALL 2 TypeScript checks |
| SQL migrations only | ❌ Skip | ❌ Skip |

### Python Quality Gates (ALL must show 0 errors)

```bash
# 1. Lint — catch bugs, style issues, unused imports, async anti-patterns
uv run ruff check apps/bot                           # Target: 0 errors

# 2. Format — consistent code style
uv run ruff format --check .                          # Target: no changes needed

# 3. Deep analysis — code quality scoring
uv run pylint apps/bot --rcfile=pyproject.toml        # Target: 10.00/10

# 4. Type safety — full static type checking
.venv/Scripts/python.exe -m pyrefly check             # Target: 0 errors

# 5. Tests — no regressions
uv run pytest tests/bot/ -v                           # Target: ALL tests pass
```

**Auto-fix workflow** (run this first to auto-resolve most issues):
```bash
uv run ruff check apps/bot --fix && uv run ruff format .
```

### TypeScript Quality Gates (ALL must show 0 errors)

```bash
# 1. Type safety — strict TypeScript compilation
cd apps/web && bun run type-check                     # tsc --noEmit → 0 errors

# 2. Production build — full Next.js build validation
cd apps/web && bun run build                          # next build → exit code 0
```

**Auto-fix workflow** (run this first to auto-resolve most issues):
```bash
cd apps/web && bun run lint --fix && bun x prettier src --write
```

### Manual Verification (check these mentally)

- [ ] Imports use absolute paths (`from apps.bot.core...`, `import { x } from "@/lib/..."`)
- [ ] Files placed in correct locations (see File Location rules above)
- [ ] Tests added for any new bot business logic
- [ ] No hardcoded values — use constants, env vars, or config
- [ ] No `any` types (TS), no bare `except Exception` (Python)
- [ ] Memory-bank updated if the change is significant

### ⚠️ Failure Policy

- **If Ruff fails** → Run `--fix` first, then manually fix remaining issues. Do NOT ignore.
- **If Pylint scores below 10.00** → Read the specific warning, fix the code. Do NOT add `# pylint: disable` blindly.
- **If Pyrefly reports type errors** → Add proper type annotations. Do NOT use `# type: ignore` unless it's a genuine false positive.
- **If tests fail** → Fix the test or the code. Do NOT skip or delete tests.
- **If TSC fails** → Fix the type error. Do NOT use `as any` or `@ts-ignore`.
- **If build fails** → Fix the build error. This means the app won't deploy.

---

## 🧰 MCP Tools

| Server         | Purpose                                                                            |
| -------------- | ---------------------------------------------------------------------------------- |
| **context7**   | Query library docs: `resolve-library-id` → `query-docs`                            |
| **insforge**   | DB ops: `execute_sql`, `list_tables`, `apply_migration`, storage & edge functions  |
| **shadcn**     | Components: `view_items_in_registries`, `get_add_command_for_items`                |

**🔍 Web Search Rule:** When searching the web or fetching URLs for documentation, best practices, or solutions, always append `2025-2026` to queries to ensure latest, up-to-date information.

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

| Skill | When to Use | Path |
|---|---|---|
| **next-best-practices** | Next.js best practices - file conventions, RSC boundaries, data patterns, async APIs, metadata, error handling, route handlers, image/font optimization, bundling | `.agents/skills/next-best-practices/` |
| **next-cache-components** | Next.js 16 Cache Components - PPR, use cache directive, cacheLife, cacheTag, updateTag | `.agents/skills/next-cache-components/` |
| **shadcn-ui** | Expert guidance for integrating and building applications with shadcn/ui components, including component discovery, installation, customization, and best practices. | `.agents/skills/shadcn-ui` |
| **tanstack-query** | Data fetching, mutations, caching | `.agents/skills/tanstack-query/` |
| **typescript-expert** | TypeScript and JavaScript expert with deep knowledge of type-level programming, performance optimization, monorepo management, migration strategies, and modern tooling. | `.agents/skills/typescript-expert` |
| **typescript-advanced-types** | Master TypeScript's advanced type system including generics, conditional types, mapped types, template literals, and utility types for building type-safe applications. | `.agents/skills/typescript-advanced-types` |
| **vercel-react-best-practices** | React and Next.js performance optimization guidelines from Vercel Engineering. | `.agents/skills/vercel-react-best-practices` |
| **vercel-composition-patterns** | React composition patterns that scale. Use when refactoring components with boolean prop proliferation, building flexible component libraries, or designing reusable APIs. | `.agents/skills/vercel-composition-patterns` |
| **ui-ux-pro-max** | UI/UX design intelligence. 50 styles, 21 palettes, 50 font pairings, 20 charts, 9 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui). | `.agents/skills/ui-ux-pro-max` |
| **web-design-guidelines** | Review UI code for Web Interface Guidelines compliance. | `.agents/skills/web-design-guidelines` |
| **motion** | Build React animations with Motion (Framer Motion) - gestures (drag, hover, tap), scroll effects, spring physics, layout animations, SVG. | `.agents/skills/motion` |
| **tailwind-design-system** | Build scalable design systems with Tailwind CSS v4, design tokens, component libraries, and responsive patterns. | `.agents/skills/tailwind-design-system` |
| **responsiveness-check** | Test website responsiveness across viewport widths using browser automation. | `.agents/skills/responsiveness-check` |

### Backend (API & Bot)

| Skill | When to Use | Path |
|---|---|---|
| **grammy** | Expert grammY Telegram bot framework assistant. Use this skill whenever building, debugging, or extending a Telegram bot with grammY (TypeScript/JavaScript). | `.agents/skills/grammy` |
| **insforge** | Build applications with InsForge Backend-as-a-Service. | `.agents/skills/insforge` |

### Database

| Skill | When to Use | Path |
|---|---|---|
| **postgres-pro** | Use when optimizing PostgreSQL queries, configuring replication, or implementing advanced database features. | `.agents/skills/postgres-pro` |

### DevOps & Tooling

| Skill                        | When to Use                           | Path                                       |
| ---------------------------- | ------------------------------------- | ------------------------------------------ |
| **brainstorming**            | You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation. | `.agents/skills/brainstorming/` |
| **docker-expert**            | Docker containerization expert with deep knowledge of multi-stage builds, image optimization, container security, Docker Compose orchestration, and production deployment patterns. | `.agents/skills/docker-expert` |
| **github-actions-templates** | Create production-ready GitHub Actions workflows for automated testing, building, and deploying applications. | `.agents/skills/github-actions-templates/`  |
| **mermaid-diagrams**         | Comprehensive guide for creating software diagrams using Mermaid syntax. | `.agents/skills/mermaid-diagrams`            |
| **playwright-cli**           | Automates browser interactions for web testing, form filling, screenshots, and data extraction. | `.agents/skills/playwright-cli`            |
| **powershell-expert**        | Develop PowerShell scripts, tools, modules, and GUIs following Microsoft best practices. | `.agents/skills/powershell-expert`         |
| **skill-creator**            | Create new skills, modify and improve existing skills, and measure skill performance. | `.agents/skills/skill-creator`             |
| **write-coding-standards-from-file** | Write a coding standards document for a project using the coding styles from the file(s) and/or folder(s) passed as arguments in the prompt. | `.agents/skills/write-coding-standards-from-file` |

### Project Management

| Skill                        | When to Use                                  | Path                                          |
| ---------------------------- | -------------------------------------------- | --------------------------------------------- |
| **openspec-new-change**      | Start a new OpenSpec change using the experimental artifact workflow. | `.agent/skills/openspec-new-change/`          |
| **openspec-ff-change**       | Fast-forward through OpenSpec artifact creation. | `.agent/skills/openspec-ff-change/`           |
| **openspec-apply-change**    | Implement tasks from an OpenSpec change. | `.agent/skills/openspec-apply-change/`        |
| **openspec-continue-change** | Continue working on an OpenSpec change by creating the next artifact. | `.agent/skills/openspec-continue-change/`     |
| **openspec-verify-change**   | Verify implementation matches change artifacts. | `.agent/skills/openspec-verify-change/`       |
| **openspec-archive-change**  | Archive a completed change in the experimental workflow. | `.agent/skills/openspec-archive-change/`      |
| **openspec-bulk-archive-change** | Archive multiple completed changes at once. | `.agent/skills/openspec-bulk-archive-change/` |
| **openspec-sync-specs**      | Sync delta specs from a change to main specs. | `.agent/skills/openspec-sync-specs/`          |
| **openspec-explore**         | Enter explore mode - a thinking partner for exploring ideas, investigating problems, and clarifying requirements. | `.agent/skills/openspec-explore/`             |
| **openspec-onboard**         | Guided onboarding for OpenSpec - walk through a complete workflow cycle with narration and real codebase work. | `.agent/skills/openspec-onboard/`             |

---

_Last Updated: 2026-03-06 (Skills Reference Sync — .agents & .agent folders reconciled)_
