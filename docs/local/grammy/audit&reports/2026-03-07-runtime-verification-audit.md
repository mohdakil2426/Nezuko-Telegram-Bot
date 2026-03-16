# Runtime and Verification Audit

Date: 2026-03-07
Scope: grammY runtime liveness, long-running non-response behavior, verification leave/message flow, live InsForge metadata and container logs

## Summary

The bot-side failure was not a backend outage. Live InsForge metadata showed healthy write activity in `bot_status`, `admin_logs`, `api_call_log`, and `verification_log`, and container logs showed steady `PATCH /bot_status`, `GET /bot_instances`, and `GET /admin_commands` traffic from the bot process while the user-reported non-response issue was being investigated.

Two code-level liveness regressions existed in the recent runner self-healing work:

1. Managed bots could be restarted during intentional stop/shutdown because runner completion was always treated as unexpected.
2. Quiet bots could be falsely marked stalled because liveness was measured from inbound chat activity instead of the long-poll `getUpdates` heartbeat.

One verification-flow regression also existed:

1. Required-channel leave immediately re-muted users and scheduled a delayed prompt fallback, which no longer matched the intended “first blocked message triggers enforcement” flow.

## Evidence Reviewed

### Memory Bank and Current Worktree

- Read all core memory-bank files before changes.
- Reviewed local dirty changes in `apps/grammy/src/composers/events.ts`, `apps/grammy/src/core/bot-factory.ts`, `apps/grammy/src/multi-bot/bot-lifecycle.ts`, `apps/grammy/src/multi-bot/bot-manager.ts`, and related tests.

### grammY References

- `guide/errors.md`
- `advanced/scaling.md`
- `advanced/reliability.md`
- `guide/deployment-types.md`
- `plugins/runner.md`

These were used to verify runner error-handling and long-poll supervision expectations.

### InsForge Metadata and Logs

- `get-backend-metadata`
- `fetch-docs("instructions")`
- `fetch-docs("real-time")`
- `get-container-logs("insforge.logs")`
- `get-container-logs("postgREST.logs")`
- `get-container-logs("postgres.logs")`
- `get-container-logs("function.logs")`

Key findings:

- `admin_logs`: 1632 rows
- `api_call_log`: 698 rows
- `verification_log`: 57 rows
- `bot_status`: 1 row
- `bot_instances`: 1 row
- `function.logs`: no relevant runtime errors
- `insforge.logs`: repeated successful `PATCH /bot_status` and manager polling traffic
- `postgREST.logs`: schema reloads only, no active API-layer failures tied to the incident
- `postgres.logs`: no bot-runtime failure explaining the stall; only manual query errors against non-existent `created_at` columns were present during inspection

## Fixes Applied

### 1. Runner supervision now uses polling heartbeat, not user traffic

Files:

- `apps/grammy/src/core/bot-factory.ts`
- `apps/grammy/src/multi-bot/bot-manager.ts`
- `apps/grammy/src/main.ts`

Changes:

- Added bot-level tracking for `getUpdates` polling activity.
- Kept inbound update tracking separately for observability.
- Switched dashboard health degradation from `lastUpdateAgeMs` to `lastPollAgeMs`.

Impact:

- Quiet groups no longer look unhealthy.
- Stall detection now measures whether long polling is still alive, which matches the actual failure mode.

### 2. Intentional stop/shutdown no longer races into auto-restart

Files:

- `apps/grammy/src/multi-bot/bot-lifecycle.ts`
- `apps/grammy/src/multi-bot/bot-registry.ts`

Changes:

- Added/used `isStopping` on managed bot instances.
- Guarded runner-task and watchdog supervision from restarting intentionally stopping bots.
- Marked instances as stopping before `runner.stop()`.
- Cleared intervals before awaiting runner shutdown on intentional stops.

Impact:

- Dashboard `stop`, `restart`, and whole-process shutdown no longer risk spawning an unwanted replacement bot.

### 3. Verification leave flow restored to first-message enforcement

Files:

- `apps/grammy/src/composers/events.ts`
- `apps/grammy/src/composers/verify.ts`
- `apps/grammy/src/services/verification-prompt.ts`
- `apps/grammy/src/core/constants.ts`

Changes:

- Removed immediate re-mute fan-out from required-channel leave.
- Removed delayed fallback prompt scheduling.
- Leave now only invalidates verified state and seeds `enforcement_block`.
- The first blocked group message now performs the actual delete -> restrict -> prompt flow if the user is still unverified.
- Verify success still clears `enforcement_block`.

Impact:

- Users are no longer muted immediately upon leaving a required channel.
- The visible enforcement point is back on the first blocked group message, which matches the requested UX.

### 4. Tests updated to match runtime intent

Files:

- `tests/grammy/integration/composers/delayed-verification-prompt.test.ts`
- `tests/grammy/integration/bot-factory-runtime.test.ts`
- `tests/grammy/unit/core/bot-factory.test.ts`

Changes:

- Updated leave-flow assertions to require silence on channel leave.
- Added coverage for poll-heartbeat tracking.
- Updated runtime wiring assertions so leave no longer expects immediate `restrictChatMember`.

## Validation

Executed successfully:

- `cd apps/grammy && bun run type-check`
- `cd apps/grammy && bun run lint`
- `cd apps/grammy && bun run test`
- `cd apps/grammy && bun run build`

Result:

- 152/152 grammY tests passing
- type-check passing
- lint passing
- build passing

## Remaining Risks

1. Standalone `/health` still exposes static mode/db details and does not yet surface poll-heartbeat degradation like dashboard mode.
2. The bot still uses grammY long polling for Telegram updates. This is reliable for the current architecture, but it is not webhook-based push delivery.
3. `verify.test.ts` still relies on simplified integration patterns instead of fully mounting the shipped composer in every case; broader real-composer coverage can still be improved.

## Recommendation

If you want truly “no polling” for Telegram update intake, that is a separate architectural change from this fix set. The current runtime is now healthier for 24/7 long-poll operation, but converting the bot from grammY runner long polling to webhooks would require a deliberate deployment change and separate validation path.
