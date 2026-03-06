# Active Context: Current State

### Current Status

**Phase 103: grammY Group Command Reliability Fix — COMPLETE ✅**

All admin/permission guard middleware now returns explicit feedback instead of silently failing in groups. The grammY bot is fully operational and is the **only active bot runtime**.

> **Python PTB bot (`apps/bot/`) is ARCHIVED as of Phase 96 — not maintained, not developed.**

---

## Phase 103: Group Command Reliability Fix (2026-03-06)

### Root Cause

| Issue                                                                   | Root Cause                                                                                                     | Status |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------ |
| Some group commands looked dead while `/start` and `/help` still worked | `adminGuard` and `permissionCheck` had silent fail-closed branches (`return` with no reply)                    | ✅     |
| Group admin commands inconsistent in live usage                         | Anonymous-admin / missing-sender cases and membership lookup failures produced no user-visible response        | ✅     |
| Logs insufficient to explain the failure                                | `admin_logs` table currently had no useful recent records; failure happened before meaningful app-side logging | ✅     |

### Implemented This Session

| Area                 | Change                                                                                                           | Status |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- | ------ |
| Admin guard          | `admin-guard.ts` now replies when sender info is unavailable and when admin membership lookup fails              | ✅     |
| Bot permission guard | `permission-check.ts` now replies on 403 and unexpected permission lookup failures instead of silently returning | ✅     |
| User messaging       | Added explicit messages for unavailable admin checks and bot-permission check failures                           | ✅     |
| Coverage             | Added/expanded guard tests for missing sender and failed permission lookups                                      | ✅     |

---

## Phase 102: Command Menu Sync & `/status` Parity (2026-03-06)

| Area               | Change                                                                                                 | Status |
| ------------------ | ------------------------------------------------------------------------------------------------------ | ------ |
| Command sync       | Added shared `core/bot-commands.ts` with private/group/group-admin command scopes and menu-button sync | ✅     |
| Standalone startup | `main.ts` now syncs command menus after `getMe()`                                                      | ✅     |
| Multi-bot startup  | `bot-lifecycle.ts` now syncs command menus for every started dashboard bot                             | ✅     |
| PTB parity         | Added `/status` handler in `admin.ts`                                                                  | ✅     |
| Coverage           | Added tests for command sync and updated admin integration coverage                                    | ✅     |

---

## Phase 101: PRD Completion & Audit Fixes (2026-03-06)

| Area                 | Change                                                                                                                                   | Status |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Dashboard realtime   | `main.ts` now creates `InsForgeRealtimeClient`, connects it in dashboard mode, passes it to `CommandWorker`, and disconnects on shutdown | ✅     |
| Multi-bot lifecycle  | `bot-lifecycle.ts` now starts the real `startStatusWriter(...)` and `startMemberSync(...)` services instead of placeholder intervals     | ✅     |
| Batch verification   | `services/batch-verification.ts` now performs real verification via `verifyMembership(...)` and returns a `Map` keyed by user ID         | ✅     |
| Join requests        | `events.ts` now handles `chat_join_request`, approves verified users, declines missing users, and DMs guidance                           | ✅     |
| Update subscriptions | `chat_join_request` added to `ALLOWED_UPDATES`                                                                                           | ✅     |
| Data typing          | `ProtectedGroup` now includes `linked_channels_count`                                                                                    | ✅     |
| Test coverage        | Added runtime wiring, command worker, batch verification, and join-request test coverage                                                 | ✅     |

---

## Architecture Notes (Current)

The active grammY runtime path is now:

```
Standalone mode
  main.ts
    -> loadConfig() (Zod soft validation)
    -> runStandaloneMode()
    -> createBot(token, deps)
    -> bot.api.getMe() + syncBotCommands()
    -> run(bot, { allowed_updates })
    -> startMemberSync() (if DB available)
    -> setupShutdown()

Dashboard mode
  main.ts
    -> runDashboardMode()
    -> InsForgeRealtimeClient.connect()
    -> BotManager.initialize()   ← fetches bot_instances, decrypts tokens, starts each bot
    -> BotManager.startSyncLoop() ← 30s reconciliation loop
    -> CommandWorker.start()     ← realtime + 30s poll fallback
    -> await SIGINT/SIGTERM
    -> CommandWorker.stop() -> realtime.disconnect() -> manager.shutdown() -> cache.quit()

Per managed bot (dashboard mode)
  BotLifecycleManager.startBot()
    -> createBotWithDeps(bot, deps)   ← wires all middleware + composers
    -> bot.api.getMe() + syncBotCommands()
    -> run(bot, { allowed_updates })
    -> startStatusWriter(...)         ← 30s heartbeat
    -> startMemberSync(...)           ← 15min sync
```

### Key grammY Implementation Facts (from code inspection)

| Fact                          | Detail                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| `htmlTransformer`             | Custom `Transformer` installed on `bot.api.config` — sets `parse_mode: "HTML"` on all send methods        |
| Core commands wired inline    | `/start` and `/help` wired directly in `bot-factory.ts` `wireCoreCommands()` — not via composer singleton |
| `CACHE_PREFIX = "nezuko:v2:"` | All Redis keys use this prefix to avoid conflict with old Python bot keys                                 |
| `botInstanceId = 0`           | Standalone mode sentinel — skips `bot_status` upsert (no `bot_instances` FK row)                          |
| `CommandsFlavor` removed      | `NezukoContext` does NOT include `CommandsFlavor` — grammY built-in `.command()` is used                  |
| `token_encrypted` column      | `bot_instances` table uses this column name in `023_fresh_grammy_schema.sql`                              |

### Middleware Order (CRITICAL — do not reorder)

```typescript
// API Transformers
bot.api.config.use(autoRetry({ maxRetryAttempts: 3 }));
bot.api.config.use(htmlTransformer);  // custom Transformer, NOT parseMode()

// Middleware chain
[DEBUG_UPDATES middleware — only when DEBUG_UPDATES=true]
bot.use(sequentializeMiddleware);     // MUST be first
bot.use(hydrate());                   // no hydrateReply in v1.6.0
bot.use(chatMembers(cache.chatMembersAdapter));
bot.use(contextEnricher(deps));

// Core commands (inline, not via singleton composer)
wireCoreCommands(bot, deps);          // /start, /help

// Composers with errorBoundary
bot.use(adminComposer.errorBoundary(errorHandler));
bot.use(channelsComposer.errorBoundary(errorHandler));
bot.use(migrationComposer.errorBoundary(errorHandler));
bot.use(eventsComposer.errorBoundary(errorHandler));
bot.use(verifyComposer.errorBoundary(errorHandler));
bot.use(fallbackComposer);            // ALWAYS last, no boundary

// Global error handler
bot.catch(...)
```

---

## Quality Gate Status (Phase 103 Baseline)

| Check                                       | Result                |
| ------------------------------------------- | --------------------- |
| `cd apps/grammy && bun run type-check`      | ✅ 0 errors           |
| `cd apps/grammy && bun run lint`            | ✅ 0 warnings         |
| `cd apps/grammy && bun run format:check`    | ✅ All files clean    |
| `cd apps/grammy && bun run test`            | ✅ **127/127 passed** |
| `cd apps/web && bun run type-check`         | ✅ 0 errors           |
| `cd apps/web && bun run lint`               | ✅ 0 warnings         |
| `cd apps/web && bun x prettier src --check` | ✅ All files clean    |

---

## Next Steps

1. **Live validation** — run the grammY bot in dashboard mode and confirm realtime commands from the web dashboard hit the `CommandWorker` path.
2. **Telegram validation** — test `chat_join_request` approval/decline flows in a real protected group with linked channels.
3. **Deploy** — ship the updated grammY runtime to the VPS/Docker environment after live validation.
4. **Admin alerting** — error handler doesn't yet send alerts to admin chat (Task 6.2 — low priority).

---

_Last Updated: 2026-03-06 (Phase 103 — group command reliability + PTB archived + prettier gates added)_
