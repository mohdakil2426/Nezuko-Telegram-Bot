# Active Context: Current State

### Current Status
**Phase 103: grammY Group Command Reliability Fix — COMPLETE ✅**

The remaining group-command issue was in the middleware guards, not command matching. Admin-only group commands could stop silently when sender identity was unavailable or when `getChatMember` / bot-permission checks failed. The grammY bot now returns explicit feedback instead of appearing dead in groups.

---

## Phase 103: Group Command Reliability Fix (2026-03-06)

### Root Cause

| Issue | Root Cause | Status |
|---|---|---|
| Some group commands looked dead while `/start` and `/help` still worked | `adminGuard` and `permissionCheck` had silent fail-closed branches (`return` with no reply) | ✅ |
| Group admin commands inconsistent in live usage | Anonymous-admin / missing-sender cases and membership lookup failures produced no user-visible response | ✅ |
| Logs insufficient to explain the failure | `admin_logs` table currently had no useful recent records; failure happened before meaningful app-side logging | ✅ |

### Implemented This Session

| Area | Change | Status |
|---|---|---|
| Admin guard | `admin-guard.ts` now replies when sender info is unavailable and when admin membership lookup fails | ✅ |
| Bot permission guard | `permission-check.ts` now replies on 403 and unexpected permission lookup failures instead of silently returning | ✅ |
| User messaging | Added explicit messages for unavailable admin checks and bot-permission check failures | ✅ |
| Coverage | Added/expanded guard tests for missing sender and failed permission lookups | ✅ |

---

## Phase 102: Command Menu Sync & `/status` Parity (2026-03-06)

### Root Cause

| Issue | Root Cause | Status |
|---|---|---|
| No slash-command menu in DM | grammY bot handled `/start` and `/help` but never called Telegram `setMyCommands` | ✅ |
| No slash-command menu in groups | No group/admin command scopes were published to Telegram | ✅ |
| PTB parity gap | PTB exposed `/status` in group command menu, grammY did not implement it | ✅ |

### Implemented This Session

| Area | Change | Status |
|---|---|---|
| Command sync | Added shared `core/bot-commands.ts` with private/group/group-admin command scopes and menu-button sync | ✅ |
| Standalone startup | `main.ts` now syncs command menus after `getMe()` | ✅ |
| Multi-bot startup | `bot-lifecycle.ts` now syncs command menus for every started dashboard bot | ✅ |
| PTB parity | Added `/status` handler in `admin.ts` | ✅ |
| UX alignment | Expanded `HELP_TEXT` to include `/start`, `/status`, and current command surface | ✅ |
| Coverage | Added tests for command sync and updated admin integration coverage | ✅ |

---

## Phase 101: PRD Completion & Audit Fixes (2026-03-06)

### Implemented This Session

| Area | Change | Status |
|---|---|---|
| Dashboard commands | `main.ts` now creates `InsForgeRealtimeClient`, connects it in dashboard mode, passes it to `CommandWorker`, and disconnects on shutdown | ✅ |
| Multi-bot lifecycle | `bot-lifecycle.ts` now starts the real `startStatusWriter(...)` and `startMemberSync(...)` services instead of placeholder intervals | ✅ |
| Batch verification | `services/batch-verification.ts` now performs real verification via `verifyMembership(...)` and returns a `Map` keyed by user ID | ✅ |
| Join requests | `events.ts` now handles `chat_join_request`, approves verified users, declines missing users, and DMs guidance | ✅ |
| Update subscriptions | `chat_join_request` added to `ALLOWED_UPDATES` | ✅ |
| Data typing | `ProtectedGroup` now includes `linked_channels_count` | ✅ |
| Test coverage | Added runtime wiring, command worker, batch verification, and join-request test coverage | ✅ |

### Quality Gates

| Check | Result |
|---|---|
| `cd apps/grammy && bun run type-check` | ✅ 0 errors |
| `cd apps/grammy && bun run lint` | ✅ 0 warnings |
| `cd apps/grammy && bun run test` | ✅ **122/122 passed** |

### Files Changed

| File | Change |
|------|--------|
| `apps/grammy/src/main.ts` | Realtime client wiring + clean shutdown |
| `apps/grammy/src/multi-bot/bot-lifecycle.ts` | Real status writer/member sync startup |
| `apps/grammy/src/services/batch-verification.ts` | Implemented batch verification |
| `apps/grammy/src/composers/events.ts` | Added join-request enforcement flow |
| `apps/grammy/src/core/constants.ts` | Added `chat_join_request` to allowed updates |
| `apps/grammy/src/database/types.ts` | Added `linked_channels_count` to `ProtectedGroup` |
| `tests/grammy/integration/bot-factory-runtime.test.ts` | Real runtime wiring coverage |
| `tests/grammy/unit/services/command-worker.test.ts` | Realtime + polling fallback coverage |
| `tests/grammy/unit/services/batch-verification.test.ts` | Batch verification coverage |
| `tests/grammy/helpers/test-bot.ts` | Configurable API method overrides for runtime tests |
| `tests/grammy/helpers/mock-update.ts` | Join-request update factory |

---

## Architecture Notes (Current)

The active grammY runtime path is now:

```
Dashboard mode
  main.ts
    -> InsForge REST client
    -> Redis cache
    -> InsForgeRealtimeClient.connect()
    -> BotManager.start()
    -> CommandWorker(realtime + poll fallback)
    -> shutdown: command worker stop -> realtime disconnect -> manager shutdown -> cache quit

Per managed bot
  BotLifecycleManager.startBot()
    -> createBot()
    -> bot.start({ allowed_updates })
    -> startStatusWriter(...)
    -> startMemberSync(...)
```

Join-request enforcement now happens in `eventsComposer` before the user enters the group, using the same verification service that backs normal membership checks.

---

## Next Steps

1. Run the bot live and verify the command list is visible in DM, normal groups, and group admin scope.
2. Validate realtime dashboard commands and join-request flows against a real Telegram setup.
3. If Telegram clients cache old command menus briefly, force-refresh by reopening the chat after the bot restart and confirm the synced scopes appear.

---

_Last Updated: 2026-03-06 18:05 IST (Phase 102 — command menu sync + PTB parity, 122 tests passing)_
