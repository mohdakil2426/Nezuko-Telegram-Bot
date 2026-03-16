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
│   │   ├── src/
│   │   │   ├── composers/   # admin, channels, events, verify, fallback, migration
│   │   │   ├── core/        # bot-factory, config, insforge client, realtime, cache, shutdown
│   │   │   ├── database/    # repo helpers and shared DB types
│   │   │   ├── middleware/  # admin-guard, group-only, permission-check, context-enricher
│   │   │   ├── multi-bot/   # bot-manager, bot-lifecycle, bot-registry
│   │   │   ├── services/    # verification, protection, member-sync, status-writer, command-worker
│   │   │   └── utils/       # logger, health, messages, auto-delete
│   │   └── tests/        # Isolated test suite (unit + integration)
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
| grammY tests          | `apps/grammy/tests/`                           | `tests/grammy/` (deleted)          |
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

| Layer        | Stack                                                                                                                 |
| ------------ | --------------------------------------------------------------------------------------------------------------------- |
| **Bot**      | TypeScript 5.9.3, grammY 1.41.1, Bun, Node 24, ioredis 5.10.0, pino 10.3.1, zod 4.3.6, Socket.IO client 4.8.3         |
| **Frontend** | Next.js 16.1.6, React 19.2.4, TypeScript 5.9.3, Tailwind v4, shadcn/ui, Recharts 3.8.0, Motion 12+, TanStack Query v5 |
| **BaaS**     | InsForge — managed PostgreSQL, Realtime WebSocket, Storage, Edge Functions                                            |
| **Auth**     | InsForge Auth, `InsforgeMiddleware`, `insforge_session` cookie, RLS                                                   |
| **Infra**    | Docker, Vercel, Caddy                                                                                                 |
| **Package**  | `bun` for all TypeScript apps (grammy + web)                                                                          |

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

---

## Key Patterns

| Pattern                 | Implementation                                                                   |
| ----------------------- | -------------------------------------------------------------------------------- |
| **Run Bot**             | `cd apps/grammy && bun run dev`                                                  |
| **Run Web**             | `cd apps/web && bun dev`                                                         |
| **Run Redis**           | `docker compose -f docker-compose.local.yml up -d`                               |
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

## CI/CD, Quality Gates & Commit Rules

### Commit Message Format — MANDATORY (Commitlint enforced)

```
<type>(<scope>): <description>   ← max 100 chars, lowercase, no period at end

Types: feat | fix | docs | style | refactor | perf | test | build | ci | chore | revert
Scope: optional (bot | web | ci | grammy | auth | db | etc.)

feat(bot): add /help command          ✅
fix(web): resolve login loop          ✅
ci: update workflow timeout           ✅
feat!: breaking API change            ✅  ← triggers major version bump
some random message                   ❌
WIP                                   ❌
```

CI bot commits use `[skip ci]` suffix — never use this yourself.

---

### CI Pipeline — What Happens on `git push origin main`

**Auto-fixed by CI (no action needed):**

- Prettier formatting → `prettier --write`
- ESLint fixable rules → `eslint --fix`
- Committed as: `fix(ci): auto-fix code quality [prettier, eslint] [skip ci]`

**NOT auto-fixed — you MUST fix before pushing:**

- TypeScript errors → type-check gate fails
- Unfixable lint errors → lint gate fails
- Build errors → build gate fails
- Test failures → test gate fails

**Deploy gate:** Vercel deploys ONLY after `Web Dashboard CI / Quality Gates` passes. Broken builds never reach production.

---

### Quality Gates — Run BEFORE Every Commit

**grammY bot** (run when touching `apps/grammy/**`):

```bash
cd apps/grammy && bun run type-check   # zero errors
cd apps/grammy && bun run lint         # zero warnings
cd apps/grammy && bun run format       # auto-fix prettier
cd apps/grammy && bun run format:check # verify clean
cd apps/grammy && bun run knip         # zero dead code
cd apps/grammy && bun run test         # zero failures, zero skipped
cd apps/grammy && bun run build        # produces dist/ cleanly
```

**Web dashboard** (run when touching `apps/web/`):

```bash
cd apps/web && bun run type-check      # zero errors
cd apps/web && bun run lint            # zero warnings
cd apps/web && bun x prettier src --write && bun x prettier src --check
cd apps/web && bun knip                # zero dead code
cd apps/web && bun run build           # zero errors
```

---

### Hard Failure Rules

| Failure              | Rule                                                             |
| -------------------- | ---------------------------------------------------------------- |
| type-check fails     | Add real types. Never `as any`, `as unknown as T`, `@ts-ignore`. |
| lint warns/errors    | Fix code. Never `eslint-disable` without justification comment.  |
| prettier dirty       | Run `--write`, commit, verify `--check` clean.                   |
| test fails           | Fix behavior OR fix test — never delete/skip to make CI green.   |
| build fails          | Fix build. Never hand off a broken deploy path.                  |
| test count drops     | Justify it explicitly.                                           |
| knip finds dead code | Remove it. Never suppress knip warnings.                         |

---

### Manual Verification Checklist

- [ ] Imports: `@/lib/insforge` for web, relative ESM `.js` for bot
- [ ] No hardcoded values — use env vars, constants, or config
- [ ] No `any` types — use real types or generics
- [ ] No `console.log` in production paths — use `logger` / `pino`
- [ ] Realtime channel names unchanged — shared contract bot ↔ web
- [ ] DB column names in TS interfaces match exact PostgreSQL column names
- [ ] Memory bank updated if change affects architecture, patterns, or project state

---

### GitHub Workflows Reference

| Workflow             | Trigger                       | Purpose                                  |
| -------------------- | ----------------------------- | ---------------------------------------- |
| `web-ci.yml`         | push/PR → main (web paths)    | Auto-fix + quality gates + Vercel deploy |
| `grammy-ci.yml`      | push/PR → main (grammy paths) | Auto-fix + quality gates                 |
| `codeql.yml`         | push + weekly                 | Security vulnerability scan              |
| `commitlint.yml`     | push/PR → main                | Enforce conventional commit format       |
| `release-please.yml` | push → main                   | Auto CHANGELOG + GitHub releases         |
| `bundle-size.yml`    | push/PR → main (web paths)    | Next.js bundle size tracking             |
| `dependabot.yml`     | weekly Monday                 | Auto dependency security PRs             |

**Branch protection (`main`):** `Quality Gates` status check required. Owner can bypass for direct pushes (solo dev setup).

---

## MCP Tools

| Server       | Purpose                         |
| ------------ | ------------------------------- |
| **context7** | Query library docs              |
| **insforge** | DB ops, storage, edge functions |
| **shadcn**   | UI component discovery          |

---

_Last Updated: 2026-03-16 (CI/CD rules, commit format, workflows, branch protection, auto-fix behavior added)_
