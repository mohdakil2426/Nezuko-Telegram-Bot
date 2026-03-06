# Progress: Nezuko Platform

## Roadmap & Status

| Phase | Milestone | Status |
| --- | --- | --- |
| 58    | InsForge REST Client Migration (Bot Core)   | Complete ✅ |
| 59    | Member Sync (JobQueue) & Dashboard Analytics | Complete ✅ |
| 60    | WebSocket Realtime & Verification Logs      | Complete ✅ |
| 61    | Status Heartbeat & Remote Health Checks     | Complete ✅ |
| 62    | Command Worker (Dashboard-to-Bot control)   | Complete ✅ |
| 63    | Dashboard Data Pipeline & Crash Resilience  | Complete ✅ |
| 64    | Dashboard Full Pipeline Fix & Log Noise Reduction | Complete ✅ |
| 65    | Complete InsForge Clean Rebuild + Realtime Setup | Complete ✅ |
| 66    | Full End-to-End Success (Bot + Web Working) | Complete ✅ 🎉 |
| 67    | Web Charts & InsForge RPC Type Alignment    | Complete ✅ |
| 68    | Comprehensive Audit, Bug Fixes & Redis Setup | Complete ✅ |
| 70    | Frontend Audit & Performance Optimization   | Complete ✅ |
| 71    | Secure Vault & Automated Key Management      | Complete ✅ |
| 72    | Security Audit Fixes v5 (RLS, Auth, Bot)    | Complete ✅ |
| 73    | Security Vault RLS Fix (anon role policies) | Complete ✅ |
| 74    | Login Auth Fix (InsForge middleware + SignIn)| Complete ✅ |
| 75    | Telegram Auth Removal (InsForge sole auth)  | Complete ✅ |
| 76    | Auth System Hardening (pages, proxy, cleanup)| Complete ✅ |
| 77    | Comprehensive UI/UX Audit Fix (104 findings) | Complete ✅ |
| 77+   | Dashboard Chart & UI Polish                  | Complete ✅ |
| 77b   | Members Interactive Bar Chart (Analytics)    | Complete ✅ |
| 77c   | Fix Missing Members Chart RPC (get_members_chart_data) | Complete ✅ |
| 78    | Responsiveness Audit v1 Fixes (20 items, 14 files)     | Complete ✅ |
| 79    | Deep Web Standards Audit v2 (34 findings, WEB_AUDIT_REPORT_V2.md) | Complete ✅ |
| 31: | 80    | WEB_AUDIT_REPORT_V2 Fixes (all 34 findings, 13 chart a11y, 5 loading.tsx, shared format.ts) | **Complete ✅** |
| 32: | 80+   | Card Responsiveness Analysis — Quick Insights grid, BotHealth, SecurityVault, ActivityFeed | **Complete ✅** |
| 33: | 81    | Cache Analytics Consolidation — ApiCallsTrendChart, chart period standardization, migration 017-018 | **Complete ✅** |
| 34: | 82    | Web UI Charts Comprehensive Audit — 42 issues fixed, tab reorg (4→3), shared components, a11y, mobile | **Complete ✅** |
| 35: | 83    | Comprehensive Codebase Audit V3 Fixes — 163 findings resolved, 86 files changed, 8 new, 3 deleted | **Complete ✅** |
| 36: | 84    | Bot & Web Production Bug Fixes — Stale anon key, delete reappear, getMasterKey, empty logs | **Complete ✅** |
| 37: | 85    | Audit & Robustness — Bot Delete Restore, Auth Bypass Interceptor, manage-bot Secure CRUD | **Complete ✅** |
| 38: | 86    | Critical Bug Fix — Auth Loop, Bot CRUD RLS, Unified Sync, Sign-Out Hard Redirect | **Complete ✅** |
| 39: | 87    | Full Realtime Overhaul — Eliminate all polling, InsForge WebSocket event-driven architecture | **Complete ✅** |
| 40: | 88    | Socket.IO Protocol Fix — Fix raw WS → Socket.IO mismatch, migrate chart hooks to realtime | **Complete ✅** |
| 41: | 89    | Uptime Bug & RLS Anon Write Policies Fix — Fix missing httpx[http2] and anon write policies | **Complete ✅** |
| 42: | 90    | Uptime Polish & Formatting Fix — Fix PostgREST UPSERT logic, add minute-level UI tracking | **Complete ✅** |
| 43: | 91    | CLI Menu Enhancement — Add standalone Docker (Redis) Start/Stop options | **Complete ✅** |
| 44: | 92    | Unified Logging Fix — Removed duplicate log files to use a single unified `bot.log` | **Complete ✅** |
| 45: | 93    | Realtime WebSockets Emit Fix — Fixed 10s Socket.IO disconnection by replacing `call()` with `emit()` | **Complete ✅** |
| 94    | Audit Fixes Implementation — SEC-01/02, ARCH-01/02, PERF-01, TEST-01 (5 P0/P1 tasks) | Complete ✅ |
| 95    | InsForge Client Public API Refactoring — Resolve Pylint protected-access warnings | Complete ✅ |
| 96    | grammY Bot Rebuild (TypeScript) — Full bot rebuild with 41 source files, 105 tests, 113 OpenSpec tasks | Complete ✅ |
| 96    | grammY Bot Rebuild (TypeScript) — Full bot rebuild with 41 source files, 105 tests, 113 OpenSpec tasks | Complete ✅ |
| 97    | grammY Startup Hardening — Soft config validation, mode-aware startup, graceful degradation, BotManager.shutdown() | Complete ✅ |
| 98    | InsForge Fresh DB Setup (grammY Clean Baseline) — Audit + 9 SQL fixes + live migration + fresh data clear | Complete ✅ |
| 99    | grammY Dashboard Mode Debug — htmlTransformer, stale DB, Redis fix, middleware chain traced via checkpoints | Complete ✅ |
| 100   | grammY Comprehensive Audit & Command Wiring Fixes | Complete ✅ |
| 101   | grammY PRD Completion & Runtime Hardening — realtime worker wiring, member sync, batch verify, join requests, runtime tests | Complete ✅ |

---

## Phase 101: grammY PRD Completion & Runtime Hardening (Complete)

Implemented the remaining gaps identified in the grammY PRD/code audit and verified them with expanded runtime-facing tests.

### Completed

| Area | Implementation |
|---|---|
| Dashboard realtime | `main.ts` now creates and connects `InsForgeRealtimeClient`, injects it into `CommandWorker`, and disconnects it during shutdown |
| Multi-bot background jobs | `bot-lifecycle.ts` now starts the actual `startStatusWriter(...)` and `startMemberSync(...)` services per bot instance |
| Batch verification | `batch-verification.ts` now verifies unique user IDs through the existing verification service |
| Join-request enforcement | `events.ts` now handles `chat_join_request` approve/decline flows using linked-channel membership verification |
| Allowed updates | `chat_join_request` added to `ALLOWED_UPDATES` |
| Types | `ProtectedGroup` updated with `linked_channels_count` |
| Coverage | Added runtime bot wiring tests plus focused tests for command worker and batch verification |

### Quality Gates
| Check | Result |
|---|---|
| `cd apps/grammy && bun run type-check` | ✅ 0 errors |
| `cd apps/grammy && bun run lint` | ✅ 0 warnings |
| `cd apps/grammy && bun run test` | ✅ **120/120 passed** |

---

## Phase 100: Comprehensive Audit & Command Wiring Fixes (Complete)

Resolved the non-responsive dashboard-mode command path and cleaned up the temporary debug state.

### Completed

| Area | Implementation |
|---|---|
| Context typing | Removed `CommandsFlavor` from `NezukoContext` because the commands plugin middleware was not installed |
| Middleware cleanup | Removed checkpoint/debug middleware from `bot-factory.ts` |
| Command logging cleanup | Removed temporary debug logging from `admin.ts` |
| Redis resilience | Added safer Redis adapter error handling/logging in `cache.ts` |
| Test alignment | Rewrote outdated encryption/config tests to match the current async/runtime behavior |

### Quality Gates
| Check | Result |
|---|---|
| `cd apps/grammy && bun run type-check` | ✅ 0 errors |
| `cd apps/grammy && bun run lint` | ✅ 0 warnings |
| `cd apps/grammy && bun run test` | ✅ **113/113 passed** |

---

## Phase 99: grammY Dashboard Mode Debugging (Complete)

### Problem
Bot starts in dashboard mode and is `online` (heartbeat confirmed in `bot_status`) but sends
**zero responses** to any Telegram messages including `/start` DMs.

### Root Causes Found & Fixed

| # | Bug | Root Cause | Fix |
|---|---|---|---|
| 1 | Silent parse errors | `WELCOME_PRIVATE`/`HELP_TEXT` HTML tags sent without `parse_mode` → Telegram rejects every reply silently | ✅ `htmlTransformer: Transformer` added + `bot.api.config.use(htmlTransformer)` |
| 2 | Stale bot_instances rows | Rows (IDs 9, 10) encrypted with old master key — decryption fails every 30s sync | ✅ Deleted via `mcp_insforge_run-raw-sql`, re-added via dashboard (ID 12) |
| 3 | Redis ioredis deadlock risk | `maxRetriesPerRequest: null` + `enableOfflineQueue` = commands queue forever if Redis is slow | ✅ `maxRetriesPerRequest: 0`, `enableOfflineQueue: false`, `connectTimeout: 3000` in `cache.ts` |
| 4 | chatMembersAdapter Redis errors propagate | No try/catch in `read()`/`write()`/`delete()` — Redis error bubbles to middleware chain | ✅ All three wrapped in `try/catch` in `cache.ts` |
| 5 | makeErrorHandler signature wrong | Used `(err) => void` but grammY `errorBoundary` expects `(err: BotError<C>, next: NextFunction) => MaybePromise<unknown>` | ✅ Fixed in `bot-factory.ts` |
| 6 | Updates arrive, full chain runs, NO reply | Checkpoint logs confirmed: all middleware ENTER/EXIT OK. Composers ENTER/EXIT with no error logged, no `[START] handler matched` log | ⚠️ **OPEN — confirmed as command filter not matching** |
| 7 | `CommandsFlavor` type in context without plugin installed | `NezukoContext` includes `CommandsFlavor` from `@grammyjs/commands` but the Commands plugin's `createCommandGroup()` middleware is NEVER installed on any bot instance — this may alter how `.command()` filter matching works | ⚠️ **SUSPECTED ROOT CAUSE — needs fix** |

### Checkpoint Trace (key diagnostic — 2026-03-06 07:17 IST)

Added `[CHAIN]` debug middleware between every plugin. For update `#822547088` (`/start` DM):
```
→ entering sequentialize  ✅
→ entering hydrate        ✅
→ entering chatMembers    ✅
→ entering contextEnricher✅
→ entering composers      ✅
← exited composers        ✅  (immediately — NO handler matched!)
← exited contextEnricher  ✅
← exited chatMembers      ✅
← exited hydrate          ✅
← exited sequentialize    ✅
```
**Zero errors. Zero replies. The command filter in `adminComposer.command("start")` is silently not matching.**

### Diagnosis: Why `.command("start")` Doesn't Match

Two candidate causes (both need investigation):

**Candidate A — `@grammyjs/commands` `CommandsFlavor` overrides `.command()` behaviour**
- `NezukoContext = HydrateFlavor<Context & NezukoContextFlavor & CommandsFlavor & ...>`
- `CommandsFlavor` adds a `commands: CommandsGroupManager` property but may also alter `ctx.hasCommand()` or `.command()` filter resolution
- The `@grammyjs/commands` plugin middleware (`setMyCommands()` etc.) is NEVER installed in `bot-factory.ts`
- **Fix**: Either install the Commands plugin middleware, OR remove `CommandsFlavor` from `NezukoContext` if the plugin isn't actually used

**Candidate B — `adminComposer` is a module-level `Composer` singleton**
- All composer files export a single module-level instance (e.g. `export const adminComposer = new Composer<NezukoContext>()`)
- In multi-bot dashboard mode, `wireBotMiddleware()` is called once per bot — but the SAME singleton `adminComposer` instance is shared across all bots
- grammY `Composer.errorBoundary()` may cause issues when the same composer is installed on multiple bot instances simultaneously
- **Fix**: Replace module-level singletons with factory functions — `export function createAdminComposer(): Composer<NezukoContext>`

### Files Changed This Session
| File | Change |
|---|---|
| `apps/grammy/src/core/bot-factory.ts` | Full rewrite: `wireBotMiddleware()` extracted, `makeErrorHandler()` correct signature, `DEBUG_UPDATES` flag, checkpoint debug middleware (temp), removed RAW TEST handler |
| `apps/grammy/src/core/cache.ts` | `maxRetriesPerRequest: 0`, `enableOfflineQueue: false`, `connectTimeout: 3000`, try/catch in all `chatMembersAdapter` methods |
| `apps/grammy/src/composers/admin.ts` | Added `[START]` debug logging + try/catch in `/start` handler (temp — for diagnosis) |
| `apps/grammy/.env` | Added `DEBUG_UPDATES=true` |

### What Confirmed Works
- ✅ Updates DO arrive — `DEBUG_UPDATES=true` middleware fires for every update
- ✅ `ctx.api.sendMessage()` works — RAW TEST handler (before sequentialize) sent replies successfully
- ✅ Full middleware chain completes cleanly — no deadlock, no error
- ✅ `htmlTransformer` + Redis fast-fail don't cause issues
- ✅ `bun run type-check` → 0 errors after every change

### Resolution
The command-routing issue was resolved in the subsequent audit/fix phases. The temporary debug state from this phase is no longer the active project state.

### Quality Gates (Phase 99 — in progress)
| Check | Result |
|---|---|
| `bun run type-check` | ✅ 0 errors |
| `bun run lint` | ✅ 0 warnings |
| `bun run dev` | ✅ Bot starts, heartbeat firing |
| Updates received | ✅ Confirmed via DEBUG middleware |
| Raw reply works | ✅ Confirmed via RAW TEST handler |
| Full chain completes | ✅ No deadlock (confirmed via checkpoint logs) |
| `/start` response | ❌ Not yet — command filter not matching (open) |
| `bun run test` | ❌ 6 tests failing (investigate after fix) |

---

## Phase 94: Audit Fixes Implementation (Complete)

All Critical (P0) and High (P1) findings from the comprehensive codebase audit have been implemented.

### Tasks Completed

| Task | Finding | Implementation | Commit |
|------|---------|----------------|--------|
| SEC-01 | Remove Base64 fallback | Removed legacy Base64 decode path from `decrypt_token()` | `ad27cf1` |
| SEC-02 | JWT server-side validation | Created `jwt-validator.ts`, integrated into `proxy.ts` | `263ac64` |
| ARCH-01/02 | Split BotManager god class | Created `BotRegistry`, `BotLifecycleManager`, `BotHealthMonitor` | `7562656`, `9948b7a` |
| PERF-01 | Pagination for batched queries | Added `_CHUNK_SIZE=50` and `_chunk_list()` to `insforge_client.py` | `a910012` |
| TEST-01 | Expand test coverage | Added 43 new tests (58 → 101 total) | `5356447` |

### New Files Created
| File | Purpose |
|------|---------|
| `apps/web/src/lib/auth/jwt-validator.ts` | Server-side JWT validation with InsForge |
| `apps/bot/core/bot_registry.py` | Bot instance registry with thread-safe operations |
| `apps/bot/services/bot_lifecycle.py` | Bot start/stop/restart lifecycle management |
| `apps/bot/services/bot_health_monitor.py` | Health checks and auto-restart logic |
| `tests/bot/core/test_bot_registry.py` | 17 tests for BotRegistry and related classes |
| `tests/bot/core/test_insforge_pagination.py` | 11 tests for pagination functionality |
| `tests/bot/services/test_bot_lifecycle.py` | 9 tests for BotLifecycleManager |

### Modified Files
| File | Changes |
|------|---------|
| `apps/bot/core/encryption.py` | Removed Base64 fallback, updated docstring |
| `apps/bot/core/insforge_client.py` | Added `_CHUNK_SIZE`, `_chunk_list()`, pagination in batched queries |
| `apps/bot/core/bot_manager.py` | Refactored to coordinator (~200 lines), delegates to new services |
| `apps/bot/core/bot_registry.py` | Added TYPE_CHECKING imports for forward references |
| `apps/bot/services/bot_lifecycle.py` | Fixed forward references, renamed timeout parameter |
| `apps/bot/services/bot_health_monitor.py` | Fixed forward references |
| `apps/web/src/proxy.ts` | Added async JWT validation |
| `tests/bot/core/test_encryption.py` | Added 6 new tests for encryption edge cases |

### Quality Gates
| Check | Result |
|---|---|
| `ruff check apps/bot` | ✅ 0 errors |
| `pylint apps/bot` | ✅ 9.99/10 |
| `pyrefly check` | ✅ 0 errors |
| `pytest tests/bot/` | ✅ **101 passed** |
| `tsc --noEmit` | ✅ 0 errors |
| `bun run build` | ✅ exit 0 |

---

## Phase 93: Realtime WebSockets Emit Fix (Complete)

Resolved a bug where the `python-socketio` client would disconnect exactly 10 seconds after connecting to InsForge due to an unmet ACK timeout expectation.

### Files Changed
| File | Change |
| --- | --- |
| `realtime_client.py` | Switched `_sio.call("REALTIME_SUBSCRIBE")` out for `_sio.emit()`. Removed rigid dictionary check requirements. |

---

## Phase 92: Unified Logging Fix (Complete)

Improved Developer CLI tools to decouple Docker startup from Bot/Web startups.

### Files Changed
| File | Change |
| --- | --- |
| `scripts/core/menu.ps1` | Added Options 4 & 5 to `Show-StartMenu`. Added Switch handlers. |
| `scripts/dev/start.ps1` | Added `docker` to `[ValidateSet]`. Restructured Success summaries. |
| `scripts/dev/stop.ps1` | Added `-Service` param conditional blocks for Web and Bot process termination. |

---

## Phase 90: Uptime Polish & Formatting Fix (Complete)

Resolved issues where the dashboard visually froze its uptime tracking by improving API response handling and TS UI formatting.

### Root Cause
- **PostgREST PATCH Logic:** `Prefer: return=minimal` silently ate the 0-row update without triggering the POST fallback. Changed to `return=representation`.
- **UI Staleness:** `formatUptime` rounded down to the nearest hour.

### Files Changed
| File | Change |
| --- | --- |
| `status_writer.py` | Switched PATCH to `Prefer: return=representation` and interval to 60s |
| `stat-cards.tsx` | Expanded `formatUptime` to show combinations like `1h 45m` and `1d 2h` |

---

## Technical Debt & Known Issues

- [x] **Test Coverage**: ~~58 tests~~ → **101 tests (Python) + 111 tests (grammY)** ✅ Complete
- [x] **BotManager god class**: Split into focused services ✅ Complete (Phase 94)
- [x] **Base64 fallback**: Removed ✅ Complete (Phase 94)
- [x] **JWT validation**: Server-side validation ✅ Complete (Phase 94)
- [x] **InsForge schema**: Full clean baseline (023_fresh_grammy_schema.sql) ✅ Complete (Phase 98)
- [x] **Legacy Base64 bot token in DB**: DB cleared — fresh start removes this issue ✅
- [x] **`ProtectedGroup` type**: Added `linked_channels_count: number` to `apps/grammy/src/database/types.ts` ✅
- [ ] **Admin Notification**: Error handler doesn't yet send alerts to admin chat (Task 6.2)
- [ ] **ESLint Plugin**: `eslint-plugin-react` incompatible with ESLint 10.0.0 — needs upgrade

---

---

## Phase 96: grammY Bot Rebuild — TypeScript (Complete)

Complete rebuild of the Nezuko Telegram bot from Python (python-telegram-bot v22.6) to TypeScript (grammY v1.41.1). Built using 12 parallel agent teams across 3 context sessions.

### Files Created

**Source (41 files in `apps/grammy/src/`):**
- **Core (6):** config.ts, bot-factory.ts, insforge-client.ts, cache.ts, encryption.ts, realtime-client.ts, constants.ts, shutdown.ts
- **Middleware (6):** context-enricher.ts, admin-guard.ts, group-only.ts, sequentialize.ts, permission-check.ts
- **Composers (5):** admin.ts, verify.ts, events.ts, channels.ts, fallback.ts, migration.ts
- **Services (6):** verification.ts, protection.ts, channel-linker.ts, member-sync.ts, status-writer.ts, batch-verification.ts
- **Multi-bot (4):** bot-manager.ts, bot-lifecycle.ts, bot-registry.ts, command-worker.ts
- **Database (5):** group.repo.ts, channel.repo.ts, link.repo.ts, verification.repo.ts, bot-status.repo.ts, types.ts
- **Utils (3):** messages.ts, logger.ts, auto-delete.ts, health.ts
- **Entry:** main.ts, types.ts

**Tests (19 files in `tests/grammy/`):**
- 3 helpers, 12 unit tests, 4 integration tests → **105 tests all passing**

**Deployment (3 files):**
- Dockerfile (3-stage: bun deps → node build → node runtime)
- .dockerignore
- .github/workflows/grammy-ci.yml

**Config:**
- eslint.config.mjs (TypeScript ESLint flat config)
- vitest.config.ts, tsconfig.json, tsconfig.build.json, package.json

### Quality Gates
| Check | Result |
|---|---|
| `bun run type-check` | ✅ 0 errors |
| `bun run lint` | ✅ 0 warnings |
| `bun run test` | ✅ **111/111 passed** (Phase 96: 105 + Phase 97: +6) |
| OpenSpec tasks | ✅ 113/113 complete |

---

## Phase 97: grammY Startup Hardening (Complete)

Hardened the grammY bot startup to match the robustness of the PTB bot.

### Files Changed
| File | Change |
|---|---|
| `apps/grammy/src/config.ts` | Soft Zod validation — all credentials optional at schema level; empty strings coerced to `undefined`; `dbAvailable` + `standaloneMode` flags |
| `apps/grammy/src/main.ts` | Split into `runStandaloneMode()` + `runDashboardMode()`; startup banner; graceful DB degradation; dashboard keep-alive loop |
| `apps/grammy/src/core/shutdown.ts` | `db: InsForgeClient \| null`; `botInstanceId=0` sentinel |
| `apps/grammy/src/multi-bot/bot-manager.ts` | Added `shutdown()` method |
| `apps/grammy/.env` | Real InsForge credentials filled in |
| `apps/grammy/.env.example` | Rewritten with PTB-style documentation |
| `tests/grammy/unit/core/config.test.ts` | 6 new tests (`dbAvailable`, `standaloneMode`, empty-string coercion, botId=0 sentinel) |

### Quality Gates
| Check | Result |
|---|---|
| `bun run type-check` | ✅ 0 errors |
| `bun run lint` | ✅ 0 warnings |
| `bun run test` | ✅ **111/111 passed** |
| `bun run dev` | ✅ Bot started live |

---

### Key Technical Decisions
- grammY v1.41.1 (not v2.x — stable release)
- `hydrateReply` not available in @grammyjs/hydrate v1.6.0
- `ParseModeFlavor` not available in @grammyjs/parse-mode v2.2.1
- Zod v4: `.default()` must precede `.transform()` on string schemas
- BotManager takes `BotManagerOptions` object (not positional args)
- Test bot helper returns proper `Message` objects for hydrate plugin
- grammY `.command()` requires `bot_command` entities in message

---

## Phase 95: InsForge Client Public API Refactoring (Complete)

Refactored the internal InsForge client methods to make them public and descriptive, resolving all Pylint `protected-access` warnings.

### Implementation Details:
- **Methods**: `_get` → `get_records`, `_post` → `post_records`, `_patch` → `patch_records`, `_delete` → `delete_records`, `_rpc` → `rpc`, `_get_client` → `get_httpx_client`.
- **Tests**: Replaced all `patch.object(insforge_client, "_get", ...)` with the new public method names.
- **Pylint Score**: Achieved **10.00/10** in several core services and handlers.

---

## What to Work on Next

### Immediate
1. **Live validation** — run the grammY bot in dashboard mode and confirm realtime commands from the web dashboard hit the new `CommandWorker` path.
2. **Telegram validation** — test `chat_join_request` approval/decline flows in a real protected group with linked channels.
3. **Operational follow-up** — decide whether to add admin alerting in the global error path (still open, low priority).
4. **Deploy** — ship the updated grammY runtime to the VPS/Docker environment after live validation.

---

_Last Updated: 2026-03-06 17:45 IST (Phase 101 — PRD completion + runtime hardening, 120 tests passing)_
