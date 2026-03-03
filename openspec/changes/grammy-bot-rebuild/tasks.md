## 1. Project Scaffolding & Configuration

- [x] 1.1 Create `apps/grammy/` directory structure matching design.md layout: `src/`, `src/core/`, `src/middleware/`, `src/composers/`, `src/services/`, `src/database/`, `src/utils/`
- [x] 1.2 Create `apps/grammy/package.json` with exact pinned versions from PRD §22.4: `grammy@1.41.1`, `@grammyjs/auto-retry@2.0.2`, `@grammyjs/hydrate@1.6.0`, `@grammyjs/parse-mode@2.2.1`, `@grammyjs/runner@2.0.3`, `@grammyjs/ratelimiter@1.2.1`, `@grammyjs/commands@1.3.2`, `@grammyjs/chat-members@1.2.0`, `ioredis@5.10.0`, `pino@10.3.1`, `zod@4.3.6`, `@sentry/node@10.41.0`, `socket.io-client@4.8.3`. ESM module type, scripts: dev/build/start/type-check/lint/test/test:watch/test:coverage
- [x] 1.3 Run `bun install` in `apps/grammy/` and verify all 13+6 dependencies install without errors; commit `bun.lock`
- [x] 1.4 Create `apps/grammy/tsconfig.json` with strict mode: `target: "ES2022"`, `module: "NodeNext"`, `moduleResolution: "NodeNext"`, `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `outDir: "./dist"`, `rootDir: "./src"`, `declaration: true`, `sourceMap: true`
- [x] 1.5 Create `apps/grammy/tsconfig.build.json` extending `tsconfig.json` but excluding `tests/`, `vitest.config.ts`, and dev files
- [x] 1.6 Create `apps/grammy/vitest.config.ts` with: test pattern `tests/grammy/**/*.test.ts`, timeout 10_000ms, coverage provider v8, coverage thresholds (lines: 80, functions: 80, branches: 70)
- [x] 1.7 Create `apps/grammy/.env.example` documenting all env vars: `BOT_TOKEN` (required), `REDIS_URL` (default redis://localhost:6379), `INSFORGE_BASE_URL` (required), `INSFORGE_ANON_KEY` (required), `LOG_LEVEL` (optional, default info), `HEALTH_PORT` (optional, default 8080), `DASHBOARD_MODE` (optional, default false), `MASTER_KEY` (optional)
- [x] 1.8 Verify `bun run type-check` passes with zero errors (tsc --noEmit on empty src/)

## 2. Foundation Types & Utilities

- [x] 2.1 Create `src/types.ts` — define `NezukoContextFlavor` interface (`db: InsForgeClient`, `cache: CacheClient`, `botId: number`, `log: Logger`), compose `NezukoContext` type: `ParseModeFlavor<HydrateFlavor<Context & NezukoContextFlavor & CommandsFlavor & ChatMembersFlavor>>`. Export all shared types.
- [x] 2.2 Create `src/config.ts` — implement `loadConfig()` using Zod v4 schema. Required: `BOT_TOKEN` (z.string().min(1)), `INSFORGE_BASE_URL` (z.string().url()), `INSFORGE_ANON_KEY` (z.string().min(1)). Optional with defaults: `REDIS_URL` (z.string().default("redis://localhost:6379")), `LOG_LEVEL` (z.enum(["debug","info","warn","error"]).default("info")), `HEALTH_PORT` (z.coerce.number().default(8080)), `DASHBOARD_MODE` (z.string().transform(v => v === "true").default("false")), `MASTER_KEY` (z.string().optional()). Derive `botId` from token (split on ":")[0]. Export `Config` type.
- [x] 2.3 Create `src/core/constants.ts` — export: `AUTO_DELETE_DELAY = 300_000` (5 min ms), `MAX_CHANNELS_PER_GROUP = 5`, `VALID_MEMBER_STATUSES = ["member","administrator","creator","restricted"] as const`, `ADMIN_STATUSES = ["administrator","creator"] as const`, `CACHE_NAMESPACES = { VERIFIED: "verified", MEMBER: "member", DEBOUNCE: "verify_debounce" }`, `INTERVALS = { STATUS_HEARTBEAT: 30_000, MEMBER_SYNC: 900_000, VERIFY_DEBOUNCE: 3 }`, `SHUTDOWN_TIMEOUT_MS = 8_000`, `ALLOWED_UPDATES = ["message","callback_query","chat_member","my_chat_member"] as const`
- [x] 2.4 Create `src/utils/logger.ts` — implement `createLogger(level)` using pino v10. JSON output when `NODE_ENV=production`, `pino-pretty` transport otherwise. Export `Logger` type. Support `logger.child({ module, updateId })`.
- [x] 2.5 Create `src/utils/messages.ts` — centralize ALL user-facing strings in one file: `WELCOME_PRIVATE`, `WELCOME_GROUP`, `HELP_TEXT`, `PROTECT_SUCCESS`, `PROTECT_USAGE`, `PROTECT_ONLY_GROUPS`, `PROTECT_ONLY_ADMINS`, `PROTECT_CHANNEL_NOT_FOUND`, `PROTECT_NOT_ADMIN_IN_CHANNEL`, `PROTECT_ALREADY_LINKED`, `PROTECT_MAX_CHANNELS`, `PROTECT_BOT_NOT_ADMIN`, `UNPROTECT_SUCCESS`, `UNPROTECT_NOT_LINKED`, `VERIFY_SUCCESS`, `VERIFY_MISSING_CHANNELS`, `VERIFY_PROCESSING`, `VERIFY_STATUS_VERIFIED`, `VERIFY_STATUS_NOT_VERIFIED`, `SETTINGS_PROTECTED`, `SETTINGS_NOT_PROTECTED`, `CHANNELS_LIST`, `CHANNELS_EMPTY`, `STATS_FORMAT`, `ERROR_GENERIC`, `ERROR_PERMISSION`, `BOT_ADDED_WELCOME`, `BOT_DEMOTED_WARNING`. All with HTML formatting and emoji.
- [x] 2.6 Create `src/utils/auto-delete.ts` — implement `scheduleDelete(msg, delayMs)`. Use `setTimeout(() => msg.delete().catch(() => {}), delayMs)` with `timer.unref()` to not prevent process exit.
- [x] 2.7 Create `src/utils/health.ts` — implement `startHealthServer(port)`. Use `http.createServer` responding to `GET /health` with `{ status: "ok", uptime: process.uptime() }`. Return the server instance for cleanup.

## 3. InsForge REST Client & Database Layer

- [x] 3.1 Create `src/core/insforge-client.ts` — implement `InsForgeClient` class. Constructor accepts `{ baseUrl, anonKey, logger }`. Strip trailing slash from baseUrl. Set headers: `Authorization: Bearer {anonKey}`, `Content-Type: application/json`. Use native `fetch()` API.
- [x] 3.2 Implement `getRecords<T>(table, params?)` — construct URL with `/api/database/records/{table}`, append query params (PostgREST operators), parse JSON as `T[]`, throw with descriptive error on non-2xx.
- [x] 3.3 Implement `postRecords<T>(table, body, prefer?)` — POST with JSON array body, default `Prefer: return=representation`, handle 204 → empty array, parse JSON as `T[]`.
- [x] 3.4 Implement `patchRecords<T>(table, params, body)` — PATCH with query params + JSON body, set `Prefer: return=representation`, handle 204.
- [x] 3.5 Implement `deleteRecords(table, params)` — DELETE with query params, throw on non-2xx.
- [x] 3.6 Create `src/database/types.ts` — define TypeScript interfaces: `ProtectedGroup` (group_id: number, owner_id: number, title: string, member_count: number, enabled: boolean, linked_channels_count: number, created_at: string, updated_at: string, last_sync_at: string), `EnforcedChannel` (channel_id: number, username: string, title: string, subscriber_count: number, linked_groups_count: number), `GroupChannelLink` (id: number, group_id: number, channel_id: number, created_at: string), `VerificationLog` (id: number, user_id: number, group_id: number, channel_id: number | null, status: string, latency_ms: number | null, bot_id: number, created_at: string), `BotStatus` (id: number, bot_id: number, status: string, uptime_seconds: number, last_heartbeat: string, version: string). Verify field names match `insforge/migrations/009_clean_schema.sql`.
- [x] 3.7 Create `src/database/group.repo.ts` — implement: `getGroupChannels(db, groupId)` (two-step: links → channels), `createGroup(db, groupId, ownerId, title, memberCount)` (UPSERT), `setGroupActive(db, groupId, active)` (PATCH enabled flag), `migrateGroupId(db, oldId, newId)` (PATCH both protected_groups and group_channel_links).
- [x] 3.8 Create `src/database/channel.repo.ts` — implement: `createChannel(db, channelId, username, title, subscriberCount)` (UPSERT), `updateSubscriberCount(db, channelId, count)` (PATCH).
- [x] 3.9 Create `src/database/link.repo.ts` — implement: `createLink(db, groupId, channelId)` (POST), `removeLink(db, groupId, channelId)` (DELETE), `removeAllGroupLinks(db, groupId)` (DELETE with group_id filter), `getGroupChannelCount(db, groupId)` (GET with count), `getChannelGroupCount(db, channelId)` (GET with count).
- [x] 3.10 Create `src/database/verification.repo.ts` — implement: `logVerification(db, data)` (POST to verification_log), `isUserVerified(db, groupId, userId)` (GET with eq filters, limit 1, check length > 0).
- [x] 3.11 Create `src/database/bot-status.repo.ts` — implement: `upsertBotStatus(db, data)` using PATCH-then-POST pattern (PATCH `bot_status?bot_id=eq.{id}`, check empty result → POST).

## 4. Redis Cache Client

- [x] 4.1 Create `src/core/cache.ts` — implement `createCache(redisUrl)` returning `CacheClient`. Wrap ioredis v5.10.0. All keys auto-prefixed with `nezuko:v2:`.
- [x] 4.2 Implement `get(key)`, `set(key, value, "EX", ttl)`, `del(key)`, `quit()` methods with auto-prefixing.
- [x] 4.3 Implement error handling — on connection error, log warning via pino, set internal `isConnected = false`. `get()` returns `null` when disconnected (graceful degradation — EC-59).
- [x] 4.4 Implement `chatMembersAdapter` property — create ioredis storage adapter compatible with `@grammyjs/chat-members` plugin. Reference `chat-members` plugin docs for adapter interface.
- [x] 4.5 Implement auto-reconnect — ioredis handles reconnection natively; verify reconnection listeners log appropriately.

## 5. Middleware Pipeline

- [x] 5.1 Create `src/middleware/sequentialize.ts` — export pre-configured sequentialize middleware: `sequentialize((ctx) => ctx.chat?.id.toString())` using `@grammyjs/runner`. This MUST be installed as the first middleware (grammY deployment checklist).
- [x] 5.2 Create `src/middleware/context-enricher.ts` — implement `contextEnricher(deps: { db, cache, botId, logger })`. Middleware injects: `ctx.db = deps.db`, `ctx.cache = deps.cache`, `ctx.botId = deps.botId`, `ctx.log = deps.logger.child({ updateId: ctx.update.update_id })`. Call `await next()`.
- [x] 5.3 Create `src/middleware/admin-guard.ts` — implement `adminGuard()` middleware. Check `ctx.chat` type (allow private for /start). For groups: call `ctx.api.getChatMember(chatId, fromId)`, check status in `ADMIN_STATUSES`. If not admin: reply with `PROTECT_ONLY_ADMINS` message, return (don't call next). Catch errors gracefully.
- [x] 5.4 Create `src/middleware/group-only.ts` — implement `groupOnly()` middleware. Check `ctx.chat.type` is `"group"` or `"supergroup"`. If private: reply with `PROTECT_ONLY_GROUPS`, return. For supergroup-only features, additionally reject basic groups (EC-29).
- [x] 5.5 Create `src/middleware/permission-check.ts` — implement `permissionCheck()` middleware. L1: Check bot has `can_restrict_members` + `can_delete_messages` via `getChatMember(chatId, botId)`. L2: integrated into `my_chat_member` handler in events composer. L3: 403 catch in protection service.

## 6. Bot Factory

- [x] 6.1 Create `src/core/bot-factory.ts` — implement `createBot(token, deps: BotDeps)` function returning `Bot<NezukoContext>`.
- [x] 6.2 Install transformers: `bot.api.config.use(autoRetry({ maxRetryAttempts: 3, maxDelaySeconds: 60 }))`, `bot.api.config.use(parseMode("HTML"))`.
- [x] 6.3 Install middleware in exact order: (1) sequentialize (per-chat), (2) rate limiter (limit({ storageClient: deps.cache.redis })), (3) hydrateReply, (4) hydrate(), (5) chatMembers(deps.cache.chatMembersAdapter), (6) contextEnricher(deps).
- [x] 6.4 Install composers with errorBoundary: `bot.use(adminComposer.errorBoundary(handleError))`, `bot.use(channelsComposer.errorBoundary(handleError))`, `bot.use(migrationComposer.errorBoundary(handleError))`, `bot.use(eventsComposer.errorBoundary(handleError))`, `bot.use(verifyComposer.errorBoundary(handleError))`, then `bot.use(fallbackComposer)` (ALWAYS last, no boundary).
- [x] 6.5 Implement `bot.catch()` global error handler — distinguish `GrammyError` (API error with `error_code`), `HttpError` (network error), and unknown errors. Log with pino. Handle 403 (bot kicked → mark group inactive), 409 (conflict → log warning).

## 7. Services (Framework-Agnostic — Zero grammY Imports)

- [x] 7.1 Create `src/services/verification.ts` — implement `verifyMembership(api, db, cache, groupId, userId)`. 3-layer check per channel: L1 chat-members cache, L2 Redis `member:{channelId}:{userId}`, L3 Telegram API `getChatMember`. Accept `VALID_MEMBER_STATUSES` including "restricted" (EC-43). Catch 400 USER_ID_INVALID (EC-42), 403 channel inaccessible (EC-15, EC-16). Measure latency (`performance.now()`). Return `{ success, missingChannels, latencyMs }`.
- [x] 7.2 Create `src/services/protection.ts` — implement `muteUser(api, chatId, userId)` (restrictChatMember with can_send_messages: false), `unmuteUser(api, chatId, userId)` (restore all permissions), `kickUser(api, chatId, userId)` (banChatMember + unbanChatMember). Catch 403 → return `{ success: false, error: "missing_permission" }` (EC-19).
- [x] 7.3 Create `src/services/channel-linker.ts` — implement `linkChannel(ctx, channelUsername)`. Full validation chain: (1) parse username (strip @), (2) getChat (EC-26 → 400), (3) check bot admin in channel (EC-27), (4) check not already linked (EC-28), (5) check max channels (EC-33), (6) check bot admin in group (EC-31), (7) createGroup UPSERT, (8) createChannel UPSERT, (9) createLink INSERT, (10) recalculate counters from link rows, (11) reply success. Implement `unlinkChannel(ctx, channelUsername)` with same counter recalculation pattern.
- [x] 7.4 Create `src/services/status-writer.ts` — implement `startStatusWriter(api, db, botId)` → returns `NodeJS.Timeout`. Every 30s: `upsertBotStatus(db, { bot_id: botId, status: "online", uptime_seconds: uptimeTracker.getSeconds(), last_heartbeat: new Date().toISOString() })`. Catch errors, log, continue. Implement `UptimeTracker` class (tracks process start time, returns elapsed seconds).
- [x] 7.5 Create `src/services/member-sync.ts` — implement `startMemberSync(api, db, botId)` → returns `NodeJS.Timeout`. Every 15min: (1) fetch all protected groups for this bot, (2) for each group: getChatMemberCount → update member_count, (3) for each linked channel: getChatMemberCount → update subscriber_count, (4) update last_sync_at. Catch 403 → mark group inactive. Catch all other errors per-group (don't block remaining groups).
- [x] 7.6 Create `src/services/batch-verification.ts` — scaffold with `batchVerify(api, db, cache, groupId, userIds)` function signature, throw "Not implemented" (P2 feature placeholder).

## 8. Composers (Handler Tree)

- [x] 8.1 Create `src/composers/admin.ts` — export `adminComposer = new Composer<NezukoContext>()`. Implement `/start` (private vs group response), `/help` (HTML command list), `/protect` (full validation chain using channel-linker service), `/unprotect` (full validation + unlink), `/settings` (display current config). Use messages from `messages.ts`. Auto-delete bot responses in groups after `AUTO_DELETE_DELAY`.
- [x] 8.2 Create `src/composers/channels.ts` — export `channelsComposer`. Implement `/channels` (list linked channels with titles/usernames/counts), `/verify` (status check only — NOT unmute, return verified/not verified status), `/stats` (group statistics from DB).
- [x] 8.3 Create `src/composers/events.ts` — export `eventsComposer`. Implement: (1) `on("message:new_chat_members")` — iterate members, skip bots (EC-1), skip !id (EC-9), check admin (EC-17), query channels, mute, send inline keyboard with verify button, schedule auto-delete (5min). (2) `on("message:left_chat_member")` — delete service msg (EC-24: catch), invalidate cache. (3) `on("message")` — message filter: skip self (EC-36), skip sender_chat (EC-39), skip !from (EC-40), check protected, check admin (EC-35), check cache, check DB, delete if unverified.
- [x] 8.4 Create `src/composers/verify.ts` — export `verifyComposer`. Handle `callbackQuery(/^verify:(-?\d+)$/)`. Debounce via Redis 3s TTL (EC-11). Call `verifyMembership()`. On success: unmute, cache verified status (6h TTL), log to verification_log, answerCallbackQuery "✅ Verified!", deleteMessage. On failure: answerCallbackQuery with missing channels. Catch expired query 400 (EC-12), catch deleted message (EC-14).
- [x] 8.5 Create `src/composers/migration.ts` — export `migrationComposer`. Handle `on("message")` where `ctx.msg.migrate_to_chat_id` exists (EC-6). Log migration, call `migrateGroupId(db, oldId, newId)`.
- [x] 8.6 Create `src/composers/fallback.ts` — export `fallbackComposer`. Handle `on("callback_query:data")`. Answer with empty response: `ctx.answerCallbackQuery()`. No error boundary (MUST always answer to remove Telegram loading spinner).
- [x] 8.7 Implement `my_chat_member` handler in `events.ts` — handle bot added as admin (send welcome — Decision #36), bot demoted (mark inactive — EC-48), bot removed (mark inactive + cleanup — EC-49).

## 9. Entry Point & Graceful Shutdown

- [x] 9.1 Create `src/core/shutdown.ts` — implement `setupShutdown(handle, deps)`. Register `process.once("SIGINT")` and `process.once("SIGTERM")`. 4-step: (1) `handle.stop()`, (2) `await Promise.race([handle.task(), timeout(SHUTDOWN_TIMEOUT_MS)])`, (3) `await Promise.allSettled([db.upsertBotStatus(botId, "offline"), cache.quit()])`, (4) `process.exit(0)`.
- [x] 9.2 Create `src/main.ts` — wire everything: (1) `loadConfig()`, (2) `createLogger()`, (3) `createInsForgeClient()`, (4) `createCache()`, (5) detect mode from `DASHBOARD_MODE`. Single-bot: `createBot()` → `run(bot, { runner: { fetch: { allowed_updates } } })` → `startStatusWriter()` → `startMemberSync()` → `startHealthServer()` → `setupShutdown()`. Dashboard-mode: initialize `BotManager` + `InsForgeRealtimeClient`.
- [x] 9.3 Add bot startup logging — log bot username, ID, mode (single/dashboard), connected services (Redis, InsForge, Realtime).
- [x] 9.4 Verify `bun run dev` starts the bot successfully with a test token and connects to Redis.

## 10. Multi-Bot Mode (Phase 5)

- [x] 10.1 Create `src/multi-bot/bot-registry.ts` — implement `BotRegistry` class with `Map<number, BotInstance>`. Methods: `add()`, `get()`, `remove()`, `getAll()`, `count()`, `has()`. Define `BotInstance` type.
- [x] 10.2 Create `src/multi-bot/bot-lifecycle.ts` — implement `BotLifecycleManager`. `startBot(config)`: createBot → run() → start services → add to registry. `stopBot(botId)`: stop runner → clear intervals → remove from registry → update DB status. `restartBot(botId)`: stop → start. Handle EC-53 (invalid token), EC-54 (409 conflict).
- [x] 10.3 Create `src/multi-bot/bot-manager.ts` — implement `BotManager` coordinator. `initialize()`: fetch active bot_instances from DB, decrypt tokens, start each. `handleCommand(cmd)`: dispatch start/stop/restart/update. `getStatus()`: return registry snapshot.
- [x] 10.4 Create `src/core/encryption.ts` — implement `decryptToken(encrypted, masterKey)`. Parse `{iv}:{ciphertext}:{authTag}` format. Use `crypto.createDecipheriv("aes-256-gcm", ...)`. No Base64 fallback (removed Phase 95). Never log token content (EC-55).
- [x] 10.5 Create `src/core/realtime-client.ts` — implement `InsForgeRealtimeClient` using `socket.io-client`. Config: `transports: ["websocket"]`, `reconnection: true`, `reconnectionDelay: 2_000`, `reconnectionDelayMax: 60_000`. `connect()`: 10s timeout → return boolean. `subscribe(channel)`: `socket.emit("REALTIME_SUBSCRIBE", { channel })` (NOT `call()` — Phase 93 fix). `on<T>()`, `disconnect()`.
- [x] 10.6 Create `src/services/command-worker.ts` — implement CommandWorker. In realtime mode: `command_updated` event triggers immediate processing. In fallback: 30s poll. Command lifecycle: pending → processing → completed/failed. Process start/stop/restart commands via BotLifecycleManager.
- [x] 10.7 Update `src/main.ts` — add dashboard mode branch: initialize BotManager, connect Realtime client, subscribe to "commands" + "bot_instances" channels, register event handlers for `command_updated` and `bot_instance_changed`.

## 11. Test Helpers

- [x] 11.1 Create `tests/grammy/helpers/test-bot.ts` — implement `createTestBot()` returning `{ bot: Bot<NezukoContext>, apiCalls: Array<{ method: string, payload: unknown }> }`. Provide static botInfo. Install API call interception transformer that records all calls.
- [x] 11.2 Create `tests/grammy/helpers/mock-update.ts` — implement factories: `createMessageUpdate(overrides?)` (default: supergroup, text "/start"), `createCallbackUpdate(data)`, `createNewMemberUpdate(members)`, `createLeftMemberUpdate(member)`, `createMyChatMemberUpdate(oldStatus, newStatus)`.
- [x] 11.3 Create `tests/grammy/helpers/mock-deps.ts` — implement: `createMockDb()` (all InsForgeClient methods as vi.fn()), `createMockCache()` (get/set/del/quit as vi.fn(), get returns null by default), `createMockLogger()` (info/warn/error/child as vi.fn(), child returns self).

## 12. Unit Tests — Services

- [x] 12.1 Create `tests/grammy/unit/services/verification.test.ts` — test: all channels verified (cache hit), API fallback on cache miss, missing single channel, multiple missing channels, 403 channel unreachable (EC-15/16), 400 USER_ID_INVALID (EC-42), restricted status valid (EC-43), Redis down graceful degradation (EC-59), latency measurement.
- [x] 12.2 Create `tests/grammy/unit/services/protection.test.ts` — test: successful mute (permissions set to false), successful unmute (all permissions true), kick pattern (ban + unban), 403 missing permission (EC-19), API timeout error propagation.
- [x] 12.3 Create `tests/grammy/unit/services/channel-linker.test.ts` — test: successful link (all 10 validation steps), channel not found (EC-26), bot not admin in channel (EC-27), already linked (EC-28), max channels exceeded (EC-33), counter recalculation from rows (not increment), unlink with counter update, unlink all.
- [x] 12.4 Create `tests/grammy/unit/services/status-writer.test.ts` — test: heartbeat writes correct fields, PATCH-then-POST UPSERT pattern, DB error doesn't crash, uptime tracker accuracy.
- [x] 12.5 Create `tests/grammy/unit/services/member-sync.test.ts` — test: member counts updated, channel subscriber counts updated, 403 marks group inactive, one group error doesn't block others.

## 13. Unit Tests — Middleware

- [x] 13.1 Create `tests/grammy/unit/middleware/context-enricher.test.ts` — test: db/cache/botId/logger injected on ctx, logger scoped with updateId, next() is called.
- [x] 13.2 Create `tests/grammy/unit/middleware/admin-guard.test.ts` — test: admin allowed, creator allowed, non-admin blocked with reply, getChatMember error handling.
- [x] 13.3 Create `tests/grammy/unit/middleware/group-only.test.ts` — test: supergroup allowed, basic group allowed, private chat blocked with reply.

## 14. Integration Tests — Composers

- [x] 14.1 Create `tests/grammy/integration/composers/admin.test.ts` — test: /start in private (welcome), /start in group (active msg), /help shows commands, /protect success (full flow with mocked DB), /protect validation failures (all 7 error scenarios), /unprotect success, /unprotect not linked, /settings protected group, /settings unprotected.
- [x] 14.2 Create `tests/grammy/integration/composers/events.test.ts` — test: new member muted + keyboard sent, bot member skipped (EC-1), admin member skipped (EC-17), multiple members processed (EC-2), left member service msg deleted, left member cache invalidated, message filter: verified passes, unverified deleted, admin always passes (EC-35), own messages pass (EC-36), channel auto-posts pass (EC-39).
- [x] 14.3 Create `tests/grammy/integration/composers/verify.test.ts` — test: successful verify → unmute + cache + log + answer + delete, missing channels → answer with list, debounce rapid clicks (EC-11), expired callback (EC-12), already deleted message (EC-14).
- [x] 14.4 Create `tests/grammy/integration/bot-factory.test.ts` — test: createBot returns valid bot, all plugins installed, mock update processed through full pipeline.

## 15. Unit Tests — Database & Core

- [x] 15.1 Create `tests/grammy/unit/database/group-repo.test.ts` — test: getGroupChannels two-step query, createGroup UPSERT, setGroupActive, migrateGroupId updates both tables.
- [x] 15.2 Create `tests/grammy/unit/database/insforge-client.test.ts` — test: getRecords with params, postRecords with Prefer header, patchRecords, deleteRecords, error handling (401, 500), UPSERT pattern (PATCH empty → POST).
- [x] 15.3 Create `tests/grammy/unit/core/config.test.ts` — test: valid config loads, missing BOT_TOKEN throws ZodError, invalid LOG_LEVEL rejected, defaults applied.
- [x] 15.4 Create `tests/grammy/unit/core/encryption.test.ts` — test: valid decrypt, wrong key throws, token not logged in errors.

## 16. Quality Gates & Verification

- [x] 16.1 Run `bun run type-check` (tsc --noEmit) — verify 0 errors across all src/ files
- [x] 16.2 Run `bun run lint` — verify 0 ESLint warnings (--max-warnings 0)
- [x] 16.3 Run `bun x prettier src --check` — verify no formatting issues
- [x] 16.4 Run `bun run test` — verify all tests pass (target: 30-40 tests)
- [x] 16.5 Run `bun run test:coverage` — verify 80%+ line coverage
- [x] 16.6 Run `bun run build` (tsc -p tsconfig.build.json) — verify dist/ output with 0 errors

## 17. Docker & CI/CD

- [x] 17.1 Create `apps/grammy/Dockerfile` — 3-stage build: Stage 1 `oven/bun:1.2` (bun install --frozen-lockfile), Stage 2 `node:22-slim` (npm run build), Stage 3 `node:22-slim` (copy dist + node_modules + package.json, CMD node dist/main.js). Set `NODE_ENV=production`.
- [x] 17.2 Create `apps/grammy/.dockerignore` — exclude: `node_modules`, `.git`, `tests`, `docs`, `.env`, `*.md`, `vitest.config.ts`, `dist`
- [x] 17.3 Verify Docker build: `docker build -t nezuko-grammy apps/grammy/` completes without errors
- [x] 17.4 Create `.github/workflows/grammy-ci.yml` — trigger on push/PR to main for `apps/grammy/**`. Jobs: lint (eslint), type-check (tsc --noEmit), test (vitest run), docker-build. Matrix: `node-version: [22.x]`. Working directory: `apps/grammy/`.
- [x] 17.5 Verify CI workflow runs correctly on a test push

## 18. Integration Verification & Dashboard Compatibility

- [x] 18.1 Start bot with test token, verify startup log: "Bot @username started (ID: NNN)"
- [x] 18.2 Verify Redis connection: cache set/get/del work with `nezuko:v2:` prefix
- [x] 18.3 Verify InsForge REST: `getRecords("protected_groups")` returns data
- [x] 18.4 Verify status heartbeat: `bot_status` table updates every 30s with correct fields
- [x] 18.5 Verify health endpoint: `GET http://localhost:8080/health` returns `{ status: "ok", uptime: N }`
- [x] 18.6 Test /start in private — verify welcome message
- [x] 18.7 Test /protect @channel in supergroup — verify full chain (validation → DB writes → response)
- [x] 18.8 Test new member join → verify mute + inline keyboard displayed
- [x] 18.9 Test verify button click → verify unmute + cache update + DB log
- [x] 18.10 Compare DB writes with Python bot: verify identical table structures, field names, and UPSERT patterns
- [x] 18.11 Verify dashboard still shows correct data (no dashboard code changes needed)

## 19. Documentation & Cleanup

- [x] 19.1 Create `apps/grammy/README.md` — document: setup, env vars, development workflow, testing, Docker, architecture overview, plugin list
- [x] 19.2 Verify all source files have JSDoc comments on exported functions
- [x] 19.3 Verify no hardcoded values (URLs, keys, IDs, magic numbers) — all use constants or env vars
- [x] 19.4 Verify no `any` types in TypeScript code
- [x] 19.5 Update `memory-bank/activeContext.md` with grammY bot rebuild status
- [x] 19.6 Update `memory-bank/techContext.md` with grammY dependencies and tooling
- [x] 19.7 Update `memory-bank/progress.md` with Phase 96 (grammY bot rebuild) completion status
