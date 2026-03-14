# Nezuko Telegram Bot Platform

> **Production-ready Telegram bot platform** for automated channel membership enforcement.

**Memory Bank**: The `memory-bank/` directory contains the source of truth for project context, patterns, and progress tracking. Read ALL files for deep project understanding. **NEVER SKIP THIS STEP.**

**RESPECT ALL RULES**: You MUST follow every rule, guideline, principle, coding standards and best practice. No exceptions, no shortcuts. no lazy, full efforts, Respect project patterns, shared contracts, and existing UI style patters consistency.

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
│   └── grammy/       # grammY bot tests
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
| grammY source         | `apps/grammy/`                                 | `apps/bot/` (deleted)              |
| grammY tests          | `tests/grammy/`                                | `apps/grammy/tests/`               |
| Web env               | `apps/web/.env.local`                          | Root `.env`                        |
| grammY env            | `apps/grammy/.env`                             | Root `.env`                        |
| Frontend deps         | `apps/web/package.json`                        | `npm`, `yarn` outside app rules    |
| grammY deps           | `apps/grammy/package.json`                     | root-level JS deps for bot runtime |
| Migrations            | `insforge/migrations/*.sql`                    | ad hoc schema edits elsewhere      |
| Canonical DB contract | latest active InsForge migration + memory bank | any outdated assumptions           |

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

## Tech Stack

| Layer        | Stack                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------- |
| **Bot**      | TypeScript 5.9.3, grammY 1.41.1, Bun, Node 22, ioredis 5.10.0, pino 10.3.1, zod 4.3.6, Socket.IO client 4.8.3 |
| **Frontend** | Next.js 16.1.6, React 19.2.3, TypeScript 5.9.3, Tailwind v4, shadcn/ui, Recharts 2.15.4, Motion 12+, TanStack Query v5 |
| **BaaS**     | InsForge — managed PostgreSQL, Realtime WebSocket, Storage, Edge Functions                         |
| **Auth**     | InsForge Auth, `InsforgeMiddleware`, `insforge_session` cookie, RLS                                |
| **Infra**    | Docker, Vercel, Caddy                                                                              |
| **Package**  | `bun` for all TypeScript apps (grammy + web)                                                       |
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
cd apps/grammy && bun run knip            # find dead code
cd apps/grammy && bun run test
cd apps/grammy && bun run build

# web
cd apps/web && bun run lint
cd apps/web && bun x prettier src --write
cd apps/web && bun x prettier src --check
cd apps/web && bun run type-check
cd apps/web && bun knip                    # find dead code
cd apps/web && bun knip --fix              # auto-fix exports/files
cd apps/web && bun run build
```

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

# 4. Knip — MUST show "Excellent, Knip found no issues."
cd apps/grammy && bun run knip

# 5. Tests — MUST show "X passed" with zero failures, zero skipped
cd apps/grammy && bun run test

# 6. Build — MUST produce dist/ with zero compile errors
cd apps/grammy && bun run build
```

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

# 4. Knip — MUST show "Excellent, Knip found no issues."
cd apps/web && bun knip

# 5. Build — MUST complete with zero errors (validates RSC boundaries, routes, types)
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

## Skills

**⚠️ MANDATORY: Read relevant skills BEFORE generating any code.**

Skills are located in `.agents/skills/` — check the path column. Read the **SKILL.md** file inside each skill folder and there all revent reference files thats critical.

**Skill Reading Rules:**

1. **Read the ENTIRE SKILL.md** - Do NOT skip any line. Study everything thoroughly.
2. **Follow all reference files** - If the skill mentions other files, examples, or resources, read those too, thats critical.
3. **NEVER violate rules** - Skills contain rules, principles, guidelines, and best practices that MUST be followed.
4. **No shortcuts** - Taking shortcuts by skipping skill refrence content leads to errors and tech debt.

### Frontend (Web Dashboard)

| Skill                           | When to Use                             | Path                                         |
| ------------------------------- | --------------------------------------- | -------------------------------------------- |
| **next-best-practices**         | Next.js patterns and boundaries         | `.agents/skills/next-best-practices/`        |
| **next-cache-components**       | Next.js 16 cache behavior               | `.agents/skills/next-cache-components/`      |
| **next-upgrade**                | Upgrade Next.js to latest version       | `.agents/skills/next-upgrade/`               |
| **shadcn-ui**                   | shadcn/ui work                          | `.agents/skills/shadcn-ui`                   |
| **tanstack-query**              | query/mutation/cache work               | `.agents/skills/tanstack-query/`             |
| **typescript-expert**           | advanced TS/JS work                     | `.agents/skills/typescript-expert`           |
| **vercel-react-best-practices** | React/Next performance                  | `.agents/skills/vercel-react-best-practices` |
| **vercel-composition-patterns** | scalable component APIs                 | `.agents/skills/vercel-composition-patterns` |
| **ui-ux-pro-max**               | UI/UX design work                       | `.agents/skills/ui-ux-pro-max`               |
| **web-design-guidelines**       | accessibility/UI audits                 | `.agents/skills/web-design-guidelines`       |
| **motion**                      | Motion animations                       | `.agents/skills/motion`                      |
| **tailwind-design-system**      | Tailwind v4 design system work          | `.agents/skills/tailwind-design-system`      |
| **react-doctor**                | Scan React code for issues              | `.agents/skills/react-doctor`                |

### Backend (Bot & BaaS)

| Skill                 | When to Use                        | Path                               |
| --------------------- | ---------------------------------- | ---------------------------------- |
| **grammy**            | Any bot work in `apps/grammy`      | `.agents/skills/grammy`            |
| **insforge**         | Frontend SDK integration            | `.agents/skills/insforge`          |
| **insforge-cli**     | Backend CLI, DB, functions, deploy  | `.agents/skills/insforge-cli`      |
| **redis-development** | Redis optimization & patterns      | `.agents/skills/redis-development` |

### DevOps & Tooling

| Skill                           | When to Use                       | Path                                       |
| ------------------------------- | --------------------------------- | ------------------------------------------ |
| **brainstorming**               | Required before creative work     | `.agents/skills/brainstorming/`            |
| **code-review-expert**          | Code review with senior lens      | `.agents/skills/code-review-expert/`       |
| **docker-expert**              | Docker/container work              | `.agents/skills/docker-expert`             |
| **github-actions-templates**    | CI/CD work                        | `.agents/skills/github-actions-templates/` |
| **mermaid-diagrams**            | diagrams/architecture visuals     | `.agents/skills/mermaid-diagrams`          |
| **playwright-cli**              | browser automation                | `.agents/skills/playwright-cli`            |
| **powershell-expert**           | PowerShell scripts                | `.agents/skills/powershell-expert`         |
| **skill-creator**              | skill updates                      | `.agents/skills/skill-creator`             |
| **vitest**                     | Unit testing with Vitest           | `.agents/skills/vitest`                    |
| **vercel-doctor**              | Optimize Vercel costs              | `.agents/skills/vercel-doctor`             |

### Project Management

| Skill                      | When to Use                              | Path                                     |
| -------------------------- | ---------------------------------------- | ---------------------------------------- |
| **openspec-propose**       | Propose new change with artifacts        | `.agents/skills/openspec-propose`        |
| **openspec-explore**       | Research and clarify requirements        | `.agents/skills/openspec-explore`        |
| **openspec-apply-change**  | Implement tasks from a change            | `.agents/skills/openspec-apply-change`   |
| **openspec-archive-change**| Finalize and archive a completed change  | `.agents/skills/openspec-archive-change` |

---

_Last Updated: 2026-03-14 (Skills updated to match .agents/skills/ folder; removed obsolete skills, added code-review-expert, insforge-cli, next-upgrade, openspec-propose, vitest)_
