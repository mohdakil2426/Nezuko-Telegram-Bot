# grammY PRD + Code Audit Report

Date: 2026-03-06  
Scope: `docs/grammy_docs/prd/PRD.md`, `apps/grammy/src/**`, `tests/grammy/**`, full `memory-bank/**`, and grammY official reference files under `.agents/skills/grammy/references/**`

## Executive Summary

The grammY bot is not fully complete against the PRD.

- P0 core feature coverage is largely present.
- P1 coverage is mixed: status heartbeat exists, but dashboard realtime command dispatch and multi-bot member sync are not fully implemented as planned.
- P2 coverage is incomplete: batch verification is an explicit stub and join request handling is absent.
- Code quality is generally good at the source level: `bun run type-check`, `bun run lint`, and `bun run test` all pass in `apps/grammy`.
- Confidence is lower than the green test suite suggests because several "integration" tests do not exercise the real production composers/wiring.

Overall verdict:

- PRD delivery status: `Partially Complete`
- Code quality status: `Good, with meaningful runtime/test coverage gaps`
- Deployment confidence: `Moderate`, not `High`

## What I Reviewed

### Project context

- Full memory bank:
  - `memory-bank/projectbrief.md`
  - `memory-bank/productContext.md`
  - `memory-bank/activeContext.md`
  - `memory-bank/systemPatterns.md`
  - `memory-bank/techContext.md`
  - `memory-bank/progress.md`

### PRD

- `docs/grammy_docs/prd/PRD.md`

### grammY official references used for best-practice comparison

- `.agents/skills/grammy/SKILL.md`
- `.agents/skills/grammy/references/guide/commands.md`
- `.agents/skills/grammy/references/guide/context.md`
- `.agents/skills/grammy/references/guide/middleware.md`
- `.agents/skills/grammy/references/guide/errors.md`
- `.agents/skills/grammy/references/advanced/scaling.md`
- `.agents/skills/grammy/references/advanced/structuring.md`
- `.agents/skills/grammy/references/advanced/reliability.md`
- `.agents/skills/grammy/references/plugins/commands.md`
- `.agents/skills/grammy/references/plugins/runner.md`

### Validation run

Executed in `apps/grammy`:

- `bun run type-check` -> passed
- `bun run lint` -> passed
- `bun run test` -> passed (`113/113`)

## PRD Feature Audit

Source PRD feature table: `docs/grammy_docs/prd/PRD.md:183-195`

| PRD Feature | Priority | Status | Evidence |
|---|---|---:|---|
| Join Mute | P0 | Complete | `apps/grammy/src/composers/events.ts:17` |
| Verify Button | P0 | Complete | `apps/grammy/src/composers/events.ts:55`, `apps/grammy/src/composers/verify.ts:16` |
| Multi-Channel Check | P0 | Complete | `apps/grammy/src/services/verification.ts:31` |
| Protection Setup | P0 | Complete | `apps/grammy/src/composers/admin.ts:45`, `apps/grammy/src/services/channel-linker.ts:40` |
| Leave Detection | P0 | Mostly complete | `apps/grammy/src/composers/events.ts:75`; no explicit `chat_member` user-leave handler |
| Message Filter | P0 | Complete | `apps/grammy/src/composers/events.ts:92` |
| Command Surface | P0 | Complete, but architecture diverged | `apps/grammy/src/core/bot-factory.ts:121-139`, `apps/grammy/src/composers/admin.ts:45-116`, `apps/grammy/src/composers/channels.ts:18-89` |
| Status Heartbeat | P1 | Complete | `apps/grammy/src/services/status-writer.ts:33`, `apps/grammy/src/multi-bot/bot-lifecycle.ts:119-134` |
| Dashboard Commands | P1 | Partial | `apps/grammy/src/services/command-worker.ts:45`; realtime path exists, but `apps/grammy/src/main.ts:231-239` wires `realtime: null` |
| Member Count Sync | P1 | Partial | standalone implementation exists in `apps/grammy/src/services/member-sync.ts:26`; multi-bot path is placeholder in `apps/grammy/src/multi-bot/bot-lifecycle.ts:136-139` |
| Multi-Bot Mode | P1 | Mostly complete | `apps/grammy/src/multi-bot/bot-manager.ts:55`, `apps/grammy/src/multi-bot/bot-lifecycle.ts:48` |
| Batch Verification | P2 | Missing | explicit stub in `apps/grammy/src/services/batch-verification.ts:23-31` |
| Join Request Handling | P2 | Missing | no `chat_join_request`, `approveChatJoinRequest`, or `declineChatJoinRequest` handlers in `apps/grammy/src/**` |

## Main Findings

### High

1. Dashboard command processing is only partially implemented relative to the PRD.

The PRD expects dashboard command handling with realtime behavior. The code has a realtime client and a realtime-aware `CommandWorker`, but dashboard mode does not wire it in. `main.ts` constructs the worker with `realtime: null` and logs a `30s poll fallback`, so instant websocket-driven command handling is not active in the actual runtime path.

Evidence:

- `apps/grammy/src/main.ts:230-239`
- `apps/grammy/src/services/command-worker.ts:63-85`
- `apps/grammy/src/core/realtime-client.ts:28-118`

Impact:

- P1 feature is only partially delivered.
- Dashboard-to-bot commands work, but not with the intended realtime path.

2. Multi-bot member sync is not actually implemented in the dashboard lifecycle.

The standalone path starts the real `startMemberSync(...)` service. The multi-bot lifecycle does not. Instead, `BotLifecycleManager` starts a 15-minute placeholder timer that only logs `"Member sync tick"`.

Evidence:

- `apps/grammy/src/services/member-sync.ts:26-97`
- `apps/grammy/src/multi-bot/bot-lifecycle.ts:136-139`

Impact:

- P1 "Member Count Sync" is incomplete in the mode where it matters most for dashboard-managed bots.

3. Batch verification is still not implemented.

This is not a hidden gap. The code explicitly throws a `Not implemented` error.

Evidence:

- `apps/grammy/src/services/batch-verification.ts:23-31`

Impact:

- PRD P2 feature remains open.

4. Join request handling is absent.

The PRD includes auto-approve/deny join request handling. No handler or service exists for `chat_join_request`, `approveChatJoinRequest`, or `declineChatJoinRequest`.

Evidence:

- PRD feature requirement at `docs/grammy_docs/prd/PRD.md:195`
- no matching implementation under `apps/grammy/src/**`

Impact:

- PRD P2 feature remains open.

### Medium

5. The runtime architecture diverged from the PRD’s composer-centric plan.

The PRD describes `/start` and `/help` as part of `adminComposer`. In the current bot factory, those commands are wired directly on the bot to avoid composer-sharing/reliability issues. This is not inherently wrong, but it means the implementation no longer cleanly matches the planned "feature modules via composers" architecture.

Evidence:

- PRD architecture and module blueprint: `docs/grammy_docs/prd/PRD.md:393-396`, `1152-1212`
- actual wiring: `apps/grammy/src/core/bot-factory.ts:121-173`
- duplicate composer handlers still exist in `apps/grammy/src/composers/admin.ts:25-43`

Impact:

- Architecture drift.
- Higher maintenance cost because command ownership is split between `bot-factory.ts` and composers.

6. Leave detection is implemented through service messages, but not through a dedicated `chat_member` user-status flow.

The PRD and edge-case catalog mention `chat_member` as a secondary/important signal, especially for more precise leave/kick semantics. Current code handles:

- `message:left_chat_member`
- `my_chat_member`

but not a dedicated user `chat_member` transition handler.

Evidence:

- `apps/grammy/src/composers/events.ts:75-181`
- `apps/grammy/src/core/constants.ts:39-43`

Impact:

- Core leave detection works for common cases.
- Some edge cases from the PRD catalog remain only partially addressed.

7. The passing integration suite does not exercise the production bot wiring as directly as its naming suggests.

The `admin`, `events`, and `verify` integration tests repeatedly build ad hoc `new Composer<NezukoContext>()` handlers instead of importing and running the actual production modules from `apps/grammy/src/composers/**`. The real runtime behavior now also includes direct command wiring in `bot-factory.ts`, middleware order, error boundaries, and transformers that these tests do not verify end to end.

Evidence:

- `tests/grammy/integration/composers/admin.test.ts:40`
- `tests/grammy/integration/composers/events.test.ts:54`
- `tests/grammy/integration/composers/verify.test.ts:50`
- repeated ad hoc composers throughout those files
- actual runtime wiring in `apps/grammy/src/core/bot-factory.ts:144-216`

Impact:

- Test suite gives good service-level confidence.
- It gives only moderate confidence in shipped middleware/composer wiring.

8. Startup, multi-bot, realtime, and command-worker flows are largely untested.

There are no dedicated tests for:

- `apps/grammy/src/main.ts`
- `apps/grammy/src/multi-bot/bot-manager.ts`
- `apps/grammy/src/multi-bot/bot-lifecycle.ts`
- `apps/grammy/src/multi-bot/bot-registry.ts`
- `apps/grammy/src/services/command-worker.ts`
- `apps/grammy/src/core/realtime-client.ts`

Also, coverage explicitly excludes `src/main.ts`.

Evidence:

- `apps/grammy/vitest.config.ts:10`

Impact:

- Runtime confidence for dashboard mode is weaker than the green test count suggests.

### Low

9. Dependency/plugin drift exists versus the PRD/plugin plan.

The current dependency set includes `@grammyjs/commands` and `@grammyjs/ratelimiter`, but runtime wiring uses built-in `bot.command(...)` and does not install a rate limiter middleware.

Evidence:

- `apps/grammy/package.json`
- `apps/grammy/src/types.ts:23-25`
- no `ratelimiter` middleware installed in `apps/grammy/src/core/bot-factory.ts`

Impact:

- Not a correctness bug by itself.
- Does signal some drift between the PRD’s selected plugin set and the delivered implementation.

10. Project documentation state is inconsistent across the memory bank.

`activeContext.md` says Phase 100 audit/fixes are complete, while `progress.md` still has Phase 99 marked in progress with `/start` not responding. The code and tests now indicate the Phase 99 issue was addressed, so the documentation is stale/inconsistent.

Impact:

- Low code risk.
- Medium maintenance/context risk for future sessions.

## grammY Best-Practice Alignment

### Good alignment

- Uses `run(bot)` for long polling concurrency, consistent with grammY runner guidance.
- Installs `sequentialize` before state-touching middleware, matching scaling guidance.
- Uses `bot.catch(...)`, matching grammY error-handling guidance.
- Uses per-composer `errorBoundary(...)`, matching official error-boundary guidance.
- Uses modular composers and middleware folders, broadly matching official structuring guidance.
- Uses `await` consistently in the reviewed async paths; no obvious floating-promise misuse in core runtime paths reviewed.

Evidence:

- `apps/grammy/src/core/bot-factory.ts:144-216`
- `apps/grammy/src/middleware/sequentialize.ts`
- `apps/grammy/src/main.ts`

### Partial or weaker alignment

- The code structure is modular, but command ownership is now split between direct bot wiring and composers, which weakens the clean composer-tree model described in the PRD and grammY structuring docs.
- Realtime support exists as a class, but the main runtime path currently falls back to polling instead of using the designed websocket path.
- Tests do not strongly validate the real middleware tree, which reduces confidence in best-practice compliance under refactor.

## Code Quality Assessment

### Strengths

- Source organization is clear and readable.
- TypeScript strict validation passes.
- ESLint passes with zero warnings.
- Service responsibilities are separated reasonably well.
- Error handling is generally explicit and pragmatic.
- Sensitive token handling is clearly isolated in encryption/vault flows.
- DB access is encapsulated behind the InsForge client/repo helpers.

### Weak spots

- Dashboard-mode runtime paths have lower implementation completeness than the PRD suggests.
- Integration tests are too synthetic in several key areas.
- Some planned behavior is represented as scaffolding instead of finished features.
- The architecture contains traceable drift from the original composer-based plan.

## Recommended Next Actions

1. Finish realtime dashboard command dispatch in actual runtime wiring.
   Target files:
   - `apps/grammy/src/main.ts`
   - `apps/grammy/src/services/command-worker.ts`
   - `apps/grammy/src/core/realtime-client.ts`

2. Replace the dashboard-mode member-sync placeholder with the real sync service.
   Target file:
   - `apps/grammy/src/multi-bot/bot-lifecycle.ts`

3. Either implement or explicitly de-scope the two open P2 PRD features:
   - batch verification
   - join request handling

4. Add production-wiring integration tests that import real modules rather than recreating throwaway composers.
   Priority targets:
   - `apps/grammy/src/core/bot-factory.ts`
   - `apps/grammy/src/composers/channels.ts`
   - `apps/grammy/src/services/command-worker.ts`
   - `apps/grammy/src/multi-bot/**`

5. Resolve architecture drift:
   pick one source of truth for `/start` and `/help`
   - either keep direct wiring and remove duplicate composer handlers
   - or move them back fully into a tested composer-based model

6. Update the memory bank so implementation state and progress state no longer contradict each other.

## Final Verdict

If the question is "did we implement everything planned in the grammY PRD?", the answer is:

`No, not fully.`

What is done:

- most P0 bot functionality
- core single-bot behavior
- status heartbeat
- multi-bot foundation
- command worker foundation

What is still incomplete or missing:

- realtime dashboard command dispatch in the active runtime path
- real member sync in multi-bot lifecycle
- batch verification
- join request handling

If the question is "is the grammY bot codebase in bad shape?", the answer is:

`No.`

The codebase is generally well-structured and passes its local quality gates. The main problem is not code chaos. The problem is that PRD completion and runtime/test confidence are overstated by the current green status.
