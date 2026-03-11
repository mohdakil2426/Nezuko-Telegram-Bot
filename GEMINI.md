# Nezuko Telegram Bot Platform

> **Production-ready Telegram bot platform** for automated channel membership enforcement.
> TypeScript 5.9 | Bun | grammY v1.41+ | Async-first architecture

**Memory Bank**: The `memory-bank/` directory contains the source of truth for project context, patterns, and progress tracking. Read ALL files for deep project understanding. **NEVER SKIP THIS STEP.**

**RESPECT ALL RULES**: You MUST follow every rule, guideline, principle, coding standards and best practice documented below. No exceptions, no shortcuts. no lazy, full efforts, Respect project patterns, shared contracts, and existing UI style consistency.

---

## Architecture (2-Tier InsForge BaaS)

```text
Web Dashboard (Next.js 16) ──► @insforge/sdk ──► InsForge BaaS (PostgreSQL + Realtime WS)
                                                     ▲          ▲
Bot Engine (grammY / TS) ───────► fetch REST ────────┘          │ Socket.IO pushes
  └─ realtime-client.ts (Socket.IO) ────────────────────────────┘
  └─ insforge-client.ts                            DB triggers fire on:
  └─ status-writer.ts (heartbeat)                   • verification_log INSERT → "verification"
  └─ command-worker.ts (WS-driven, poll fallback)   • bot_status CHANGE → "status_changed"
  └─ member-sync.ts                                 • admin_logs INSERT → "new_log"
                                                     • admin_commands CHANGE → "command_updated"
                                                     • bot_instances CHANGE → "bot_instance_changed"
```

- **No custom API server** — both bot and web talk directly to InsForge REST / SDK.
- **Bot DB access**: `apps/grammy/src/core/insforge-client.ts` — never raw PostgreSQL.
- **Web DB access**: `@insforge/sdk` via `import { insforge } from "@/lib/insforge"`.
- **Legacy PTB code is not the active bot path anymore**. Treat `apps/grammy` as canonical for bot runtime work.

---

## Project Structure

```text
nezuko/
├── apps/
│   ├── grammy/       # Canonical Telegram bot runtime (grammY + TypeScript)
│   │   └── src/
│   │       ├── composers/   # admin, channels, events, verify, fallback, migration
│   │       ├── core/        # bot-factory, config, insforge client, realtime, cache, shutdown
│   │       ├── database/    # repo helpers and shared DB types
│   │       ├── middleware/  # admin-guard, group-only, permission-check, context-enricher
│   │       ├── multi-bot/   # bot-manager, bot-lifecycle, bot-registry
│   │       ├── services/    # verification, protection, member-sync, status-writer, command-worker
│   │       └── utils/       # logger, health, messages, auto-delete
│   └── web/          # Next.js 16 Admin Dashboard
│       └── src/
│           ├── app/dashboard/
│           ├── components/
│           ├── lib/
│           ├── providers/
│           └── proxy.ts
├── insforge/
│   ├── migrations/
│   └── functions/
├── tests/
│   ├── grammy/       # grammY bot tests
│   └── bot/          # legacy PTB tests retained for historical reference only
├── openspec/
├── scripts/
├── memory-bank/
└── docs/
```

---

## Critical Rules

### File Locations

| Type                  | Correct Location                               | Wrong                              |
| --------------------- | ---------------------------------------------- | ---------------------------------- |
| grammY source         | `apps/grammy/`                                 | `apps/bot/` for new bot work       |
| grammY tests          | `tests/grammy/`                                | `apps/grammy/tests/`               |
| Web env               | `apps/web/.env.local`                          | Root `.env`                        |
| grammY env            | `apps/grammy/.env`                             | Root `.env`                        |
| Frontend deps         | `apps/web/package.json`                        | `npm`, `yarn` outside app rules    |
| grammY deps           | `apps/grammy/package.json`                     | root-level JS deps for bot runtime |
| Migrations            | `insforge/migrations/*.sql`                    | ad hoc schema edits elsewhere      |
| Canonical DB contract | latest active InsForge migration + memory bank | outdated PTB assumptions           |

### Database Rules

- **All Telegram IDs MUST be `BIGINT`**.
- **Always grant sequences** after `CREATE TABLE`: `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;`
- **UPSERT conflicts**: Use PATCH-then-POST when table has multiple UNIQUE columns.
- **Denormalized counters** (`linked_channels_count`, `linked_groups_count`): always recalculate from `group_channel_links` rows.

### Security Rules

- **Master key stays server-side only** — `addBotSecure()` and vault actions keep encryption server-side.
- **Never log secrets** — sanitize client-facing errors.
- **No hardcoded fallback URLs** — throw if required env vars are missing.
- **Dev bypass guarded** — `NEXT_PUBLIC_DEV_LOGIN=true` only works when `NODE_ENV !== "production"`.
- **Open redirect prevention** — validate `redirectTo` does not start with `//`.
- **RLS on all tables** — keep InsForge security policies aligned with runtime behavior.

---

## Universal Development Principles

1. **No Hardcoding** — use env vars, config, or named constants.
2. **DRY** — extract repeated logic.
3. **Single Responsibility** — keep functions/modules focused.
4. **Fail Fast** — validate inputs and surface meaningful failures.
5. **Type Everything** — TypeScript strict mode, no `any`.
6. **Document Intent** — comments explain why, not obvious mechanics.
7. **Test Critical Paths** — no production behavior without coverage.
8. **Security First** — sanitize inputs, validate auth, never leak secrets.
9. **Performance Aware** — avoid redundant polling, N+1 patterns, and wasteful realtime churn.
10. **Clean Commits** — atomic, passing, reviewable.
11. **KISS** — choose simple, maintainable designs over cleverness.

---

## Tech Stack

| Layer        | Stack                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------- |
| **Bot**      | TypeScript 5.9, grammY 1.41+, Bun, Node 22, ioredis, pino, zod, Socket.IO client                   |
| **Frontend** | Next.js 16.1, React 19.2, TypeScript 5.9, Tailwind v4, shadcn/ui, Recharts, Motion, TanStack Query |
| **BaaS**     | InsForge — managed PostgreSQL, Realtime WebSocket, Storage, Edge Functions                         |
| **Auth**     | InsForge Auth, `InsforgeMiddleware`, `insforge_session` cookie, RLS                                |
| **Infra**    | Docker, Vercel, Caddy                                                                              |
| **Package**  | `bun` for TypeScript apps, `uv` only for retained Python legacy tooling if needed                  |

---

## Commands

### Run Services

```bash
cd apps/grammy && bun run dev      # Canonical bot runtime
cd apps/web && bun dev             # Web dashboard
docker compose -f docker-compose.local.yml up -d  # Redis
```

### Lint, Type-Check, Test

```bash
# grammY bot
cd apps/grammy && bun run type-check
cd apps/grammy && bun run lint
cd apps/grammy && bun run format          # prettier --write src/ + tests/grammy/
cd apps/grammy && bun run format:check   # prettier --check  src/ + tests/grammy/
cd apps/grammy && bun run test
cd apps/grammy && bun run build

# web
cd apps/web && bun run lint
cd apps/web && bun x prettier src --write
cd apps/web && bun x prettier src --check
cd apps/web && bun run type-check
cd apps/web && bun run build
```

---

## Coding Standards — TypeScript

### Formatting & Style

| Setting         | Value     | Enforced By               |
| --------------- | --------- | ------------------------- |
| Indent          | 2 spaces  | `.editorconfig`, Prettier |
| Line length     | 100 chars | `.prettierrc`             |
| Semicolons      | Yes       | project config            |
| Quotes          | Double    | project config            |
| Trailing commas | ES5       | project config            |

### TypeScript Coding Patterns

```typescript
// InsForge SDK — web
import { insforge } from "@/lib/insforge";

// grammY bot wiring
import { Bot } from "grammy";
import { run } from "@grammyjs/runner";

// TanStack Query v5
const { data, isPending, error } = useQuery({ ... });

// Shared timing constants, not magic numbers
refetchInterval: REFETCH_INTERVALS.STANDARD;
staleTime: STALE_TIMES.SHORT;

// Never do these:
const value: any = something;
```

### grammY Bot Patterns

```typescript
// Canonical bot runtime lives in apps/grammy
import { createBot } from "./core/bot-factory.js";
import { syncBotCommands } from "./core/bot-commands.js";

// Middleware order matters
bot.use(sequentializeMiddleware);
bot.use(hydrate());
bot.use(chatMembers(cache.chatMembersAdapter));
bot.use(contextEnricher(deps));

// Multi-bot runtime
const manager = new BotManager({ db, cache, logger, botFactory });
await manager.initialize();
manager.startSyncLoop();

// Realtime command worker
const commandWorker = new CommandWorker({ db, realtime, botManager: manager, botId: 0, logger });
commandWorker.start();
```

---

## Key Patterns

| Pattern                 | Implementation                                                                   |
| ----------------------- | -------------------------------------------------------------------------------- |
| **Run Bot**             | `cd apps/grammy && bun run dev`                                                  |
| **Bot Operating Modes** | `DASHBOARD_MODE=true` → multi-bot from DB; `false` → single bot from `BOT_TOKEN` |
| **Bot Imports**         | Relative ESM imports within `apps/grammy/src`, package-root based                |
| **Web Imports**         | `import { insforge } from "@/lib/insforge"`                                      |
| **Bot Env**             | `apps/grammy/.env`                                                               |
| **Web Env**             | `apps/web/.env.local`                                                            |
| **Query keys**          | `queryKeys.*` factory in `apps/web/src/lib/query-keys.ts`                        |
| **Realtime Web**        | `use-realtime-insforge.ts`                                                       |
| **Realtime Bot**        | `apps/grammy/src/core/realtime-client.ts`                                        |
| **Auth guard**          | `apps/web/src/proxy.ts`                                                          |
| **Token storage**       | `nezuko_secrets` table via server action + edge function                         |

---

## Pre-Commit Checklist

> **⛔ ZERO-TOLERANCE**: Every gate below MUST pass before considering any task complete.
> Running these checks is NOT optional. A single failure means the task is NOT done.
> Fix the root cause — never suppress, skip, or `@ts-ignore` your way past a failure.

---

### grammY Bot Quality Gates

Run ALL commands, in order, every time you touch `apps/grammy/` or `tests/grammy/`:

```bash
# 1. Type safety — MUST exit 0, zero errors
cd apps/grammy && bun run type-check

# 2. Lint — MUST exit 0, zero warnings (--max-warnings 0 is enforced)
cd apps/grammy && bun run lint

# 3. Prettier — MUST show "All matched files use Prettier code style!"
#    Covers both src/ and ../../tests/grammy (root .prettierrc, no tailwind plugin)
cd apps/grammy && bun run format         # auto-fix
cd apps/grammy && bun run format:check   # verify clean

# 4. Tests — MUST show "X passed" with zero failures, zero skipped
cd apps/grammy && bun run test

# 5. Build — MUST produce dist/ with zero compile errors
cd apps/grammy && bun run build
```

**Expected passing baseline:** 127/127 tests as of Phase 103.
If your change alters this count, justify it explicitly.

---

### Web Quality Gates

Run ALL four commands, in order, every time you touch `apps/web/`:

```bash
# 1. Type safety — MUST exit 0, zero errors
cd apps/web && bun run type-check

# 2. Lint — MUST exit 0, zero warnings (--max-warnings 0 is enforced)
cd apps/web && bun run lint

# 3. Prettier — MUST show "All matched files use Prettier code style!"
#    If it reports [warn] files, run --write first, then re-check:
cd apps/web && bun x prettier src --write
cd apps/web && bun x prettier src --check

# 4. Build — MUST complete with zero errors (validates RSC boundaries, routes, types)
cd apps/web && bun run build
```

---

### Manual Verification Checklist

Before closing any task, confirm ALL of the following:

- [ ] Imports follow project patterns (`@/lib/insforge` for web, relative ESM `.js` for bot)
- [ ] No hardcoded values — env vars, constants, or config for everything
- [ ] No `any` types — use real types or generics
- [ ] No `@ts-ignore` or `// eslint-disable` without a written justification comment
- [ ] No `console.log` left in production code paths — use `logger` / `pino`
- [ ] Realtime channel names unchanged — shared contract between bot and web
- [ ] DB column names in TypeScript interfaces match actual PostgreSQL column names exactly
- [ ] Memory bank updated if the change affects architecture, patterns, or project state

---

### Hard Failure Rules

| Gate                       | Rule                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------- |
| **type-check fails**       | Add real types. Never use `as any`, `as unknown as T`, or `@ts-ignore`.                 |
| **lint warns/errors**      | Fix the code. Never add `eslint-disable` without a comment explaining why.              |
| **prettier reports dirty** | Run `--write`, commit the formatted files, then verify `--check` is clean.              |
| **any test fails**         | Fix the behavior OR fix the test — never delete or skip a test to make CI green.        |
| **build fails**            | Fix the build. Do not hand off a broken deploy path under any circumstances.            |
| **test count drops**       | Justify it. Removing tests requires explicit explanation of why coverage is maintained. |

---

## MCP Tools

| Server       | Purpose                         |
| ------------ | ------------------------------- |
| **context7** | Query library docs              |
| **insforge** | DB ops, storage, edge functions |
| **shadcn**   | UI component discovery          |

**Web Search Rule:** When searching the web or fetching URLs for documentation, best practices, or solutions, always append `2025-2026` to queries.

## Skills

**⚠️ MANDATORY: Read relevant skills BEFORE generating any code.**

Skills are located in `.agent/skills/` or `.agents/skills/` — check the path column. Read the **SKILL.md** file inside each skill folder.

**Skill Reading Rules:**

1. **Read the ENTIRE SKILL.md** - Do NOT skip any line. Study everything thoroughly.
2. **Follow all reference files** - If the skill mentions other files, examples, or resources, read those too.
3. **NEVER violate rules** - Skills contain rules, principles, guidelines, and best practices that MUST be followed.
4. **Context-aware reading** - Focus on sections relevant to your current task, but never skip critical rules.
5. **No shortcuts** - Taking shortcuts by skipping skill content leads to errors and tech debt.

### Frontend (Web Dashboard)

| Skill                           | When to Use                     | Path                                         |
| ------------------------------- | ------------------------------- | -------------------------------------------- |
| **next-best-practices**         | Next.js patterns and boundaries | `.agents/skills/next-best-practices/`        |
| **next-cache-components**       | Next.js 16 cache behavior       | `.agents/skills/next-cache-components/`      |
| **shadcn-ui**                   | shadcn/ui work                  | `.agents/skills/shadcn-ui`                   |
| **tanstack-query**              | query/mutation/cache work       | `.agents/skills/tanstack-query/`             |
| **typescript-expert**           | advanced TS/JS work             | `.agents/skills/typescript-expert`           |
| **typescript-advanced-types**   | complex type work               | `.agents/skills/typescript-advanced-types`   |
| **vercel-react-best-practices** | React/Next performance          | `.agents/skills/vercel-react-best-practices` |
| **vercel-composition-patterns** | scalable component APIs         | `.agents/skills/vercel-composition-patterns` |
| **ui-ux-pro-max**               | UI/UX design work               | `.agents/skills/ui-ux-pro-max`               |
| **web-design-guidelines**       | accessibility/UI audits         | `.agents/skills/web-design-guidelines`       |
| **motion**                      | Motion animations               | `.agents/skills/motion`                      |
| **tailwind-design-system**      | design system work              | `.agents/skills/tailwind-design-system`      |
| **responsiveness-check**        | responsive audits               | `.agents/skills/responsiveness-check`        |

### Backend (Bot & BaaS)

@.agents/skils/grammy/GEMINI.md

| Skill            | When to Use                   | Path                          |
| ---------------- | ----------------------------- | ----------------------------- |
| **grammy**       | Any bot work in `apps/grammy` | `.agents/skills/grammy`       |
| **insforge**     | InsForge backend integration  | `.agents/skills/insforge`     |
| **postgres-pro** | SQL/query/schema performance  | `.agents/skills/postgres-pro` |

### DevOps & Tooling

| Skill                                | When to Use                                        | Path                                              |
| ------------------------------------ | -------------------------------------------------- | ------------------------------------------------- |
| **brainstorming**                    | Required before creative or behavior-changing work | `.agents/skills/brainstorming/`                   |
| **docker-expert**                    | Docker/container work                              | `.agents/skills/docker-expert`                    |
| **github-actions-templates**         | CI/CD work                                         | `.agents/skills/github-actions-templates/`        |
| **mermaid-diagrams**                 | diagrams/architecture visuals                      | `.agents/skills/mermaid-diagrams`                 |
| **playwright-cli**                   | browser automation                                 | `.agents/skills/playwright-cli`                   |
| **powershell-expert**                | PowerShell scripts                                 | `.agents/skills/powershell-expert`                |
| **skill-creator**                    | skill updates                                      | `.agents/skills/skill-creator`                    |
| **write-coding-standards-from-file** | derive standards from code                         | `.agents/skills/write-coding-standards-from-file` |

### Project Management

Use the relevant `openspec-*` skill in `.agent/skills/` when the task is about OpenSpec workflows.

---

_Last Updated: 2026-03-06 (Prettier added to grammy + tests/grammy via root .prettierrc; web gets own .prettierrc with tailwind plugin)_
