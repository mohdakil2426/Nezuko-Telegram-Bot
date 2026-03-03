## ADDED Requirements

### Requirement: Bot Factory with Full Plugin Stack
The system SHALL provide a `src/core/bot-factory.ts` module exporting a `createBot(token, deps)` function that returns a `Bot<NezukoContext>` with all plugins configured. The plugin installation order SHALL be: (Transformers) `autoRetry` → `parseMode("HTML")`, then (Middleware) `sequentialize` → `ratelimiter` → `hydrateReply` → `hydrate` → `chatMembers` → `contextEnricher`, then (Composers) `adminComposer` → `channelsComposer` → `migrationComposer` → `eventsComposer` → `verifyComposer` → `fallbackComposer` (ALWAYS last), then `bot.catch()` for global error handling.

#### Scenario: Bot creates with all plugins
- **WHEN** `createBot(token, { db, cache, logger })` is called with a valid token
- **THEN** a `Bot<NezukoContext>` instance is returned with all 7 plugins installed

#### Scenario: Middleware order is enforced
- **WHEN** the bot processes an update
- **THEN** `sequentialize` runs first (per grammY deployment checklist), preventing race conditions

#### Scenario: Transformers wrap outgoing calls
- **WHEN** `ctx.reply("test")` is called from any handler
- **THEN** `auto-retry` wraps the outgoing API call (retrying on 429/500/network errors) AND `parse_mode: "HTML"` is set by default

#### Scenario: Error boundaries isolate composer failures
- **WHEN** an error occurs in `adminComposer`
- **THEN** the error is caught by `adminComposer.errorBoundary()`, logged, and does NOT crash `eventsComposer` or `verifyComposer`

#### Scenario: Global error handler catches unhandled errors
- **WHEN** an error bypasses all error boundaries
- **THEN** `bot.catch()` receives a `BotError` wrapping either `GrammyError` (API error) or `HttpError` (network error), logs the error with context

---

### Requirement: auto-retry Transformer Configuration
The system SHALL install `@grammyjs/auto-retry` as the first transformer with config: `maxRetryAttempts: 3`, `maxDelaySeconds: 60`, `rethrowInternalServerErrors: false`, `rethrowHttpErrors: false`.

#### Scenario: 429 rate limit is retried
- **WHEN** Telegram API returns 429 with `Retry-After: 5`
- **THEN** the transformer waits 5 seconds and retries the request (up to 3 attempts)

#### Scenario: 500 server error is retried
- **WHEN** Telegram API returns 500 Internal Server Error
- **THEN** the transformer retries with exponential backoff

#### Scenario: Network error is retried
- **WHEN** a DNS resolution or connection timeout occurs
- **THEN** the transformer retries (up to 3 attempts)

---

### Requirement: ratelimiter Middleware Configuration
The system SHALL install `@grammyjs/ratelimiter` with Redis-backed storage. Config: `timeFrame: 2000` (2s window), `limit: 3` (max 3 per window), `keyGenerator: (ctx) => ctx.from?.id.toString()` (per-user), `onLimitExceeded` SHALL silently drop the update (no reply to avoid spam amplification in groups).

#### Scenario: Rapid user messages are throttled
- **WHEN** a user sends 5 messages within 2 seconds
- **THEN** the first 3 are processed and the last 2 are silently dropped

#### Scenario: Different users are independently rate-limited
- **WHEN** User A sends 3 messages and User B sends 3 messages in the same 2-second window
- **THEN** all 6 messages are processed (3 per user)

---

### Requirement: chatMembers Plugin with Redis Adapter
The system SHALL install `@grammyjs/chat-members` with an ioredis-backed storage adapter. The plugin SHALL automatically cache `getChatMember` results from `chat_member` update events and provide `ctx.chatMembers.getChatMember(chatId, userId)` that checks cache first, falls back to Telegram API on miss.

#### Scenario: chat_member event updates cache
- **WHEN** a `chat_member` update indicates User A joined Channel X
- **THEN** the plugin caches the membership status in Redis automatically

#### Scenario: Cached member lookup avoids API call
- **WHEN** `ctx.chatMembers.getChatMember(channelId, userId)` is called for a cached member
- **THEN** the result is returned from Redis without making a Telegram API call

---

### Requirement: Context Enricher Middleware
The system SHALL provide a `src/middleware/context-enricher.ts` module exporting a `contextEnricher(deps)` function that creates middleware injecting `db`, `cache`, `botId`, and `log` (child logger with `updateId`) into every `NezukoContext`.

#### Scenario: Dependencies are available on context
- **WHEN** a handler receives a `NezukoContext` after contextEnricher runs
- **THEN** `ctx.db` is an `InsForgeClient`, `ctx.cache` is a `CacheClient`, `ctx.botId` is a `number`, and `ctx.log` is a `Logger`

#### Scenario: Logger is scoped to current update
- **WHEN** contextEnricher creates a child logger
- **THEN** `ctx.log` includes `updateId: ctx.update.update_id` in all log entries

---

### Requirement: Admin Guard Middleware
The system SHALL provide a `src/middleware/admin-guard.ts` module that filters updates, allowing only group administrators and creators to proceed. Non-admin users SHALL receive a reply "⚠️ Only admins can use this command." and processing stops.

#### Scenario: Admin command proceeds
- **WHEN** a group administrator sends `/protect @channel`
- **THEN** the handler chain continues past the admin guard

#### Scenario: Non-admin command is blocked
- **WHEN** a regular member sends `/protect @channel`
- **THEN** the bot replies "⚠️ Only admins can use this command." and the handler chain stops

#### Scenario: Creator is always allowed
- **WHEN** the group creator (owner) sends an admin command
- **THEN** the handler chain continues

---

### Requirement: Group-Only Filter Middleware
The system SHALL provide a `src/middleware/group-only.ts` module that filters updates to only allow processing in `group` or `supergroup` chat types. Private chat messages SHALL receive a reply directing the user to add the bot to a group.

#### Scenario: Group message proceeds
- **WHEN** a message is sent in a supergroup
- **THEN** the handler chain continues

#### Scenario: Private message is redirected
- **WHEN** a command is sent in a private chat
- **THEN** the bot replies "⚠️ This command only works in groups."

---

### Requirement: Permission Check Middleware
The system SHALL provide a `src/middleware/permission-check.ts` module implementing 3-layer bot permission defense: (L1) Check `can_restrict_members` + `can_delete_messages` on `/protect` setup, (L2) Listen for `my_chat_member` demotion events → disable group + notify, (L3) Catch 403 errors on each mute/kick action gracefully with informative admin reply.

#### Scenario: Bot has required permissions
- **WHEN** `/protect @channel` is called and bot has `can_restrict_members`
- **THEN** protection setup proceeds normally

#### Scenario: Bot lacks restrict permission
- **WHEN** bot tries to mute a user but lacks `can_restrict_members`
- **THEN** bot catches the 403 error and replies "⚠️ I need **Restrict Members** permission to work!"

#### Scenario: Bot is demoted
- **WHEN** bot receives `my_chat_member` update with new status `"member"` (demoted from admin)
- **THEN** bot marks the group as inactive in DB and logs a warning

---

### Requirement: Redis Cache Client
The system SHALL provide a `src/core/cache.ts` module wrapping `ioredis` v5.10.0. The client SHALL support: `get(key)`, `set(key, value, "EX", ttl)`, `del(key)`, `quit()`. All keys SHALL be prefixed with `nezuko:v2:` namespace. The client SHALL provide a `chatMembersAdapter` property compatible with `@grammyjs/chat-members`. Connection failures SHALL log warnings and degrade gracefully (cache misses fall through to DB).

#### Scenario: Cache set and get
- **WHEN** `cache.set("verified:123:456", "1", "EX", 3600)` is called
- **THEN** the key `nezuko:v2:verified:123:456` is stored in Redis with 3600s TTL

#### Scenario: Redis connection failure degrades gracefully
- **WHEN** Redis is unreachable
- **THEN** `cache.get()` returns `null` (cache miss), allowing fallback to DB lookup, and a warning is logged

#### Scenario: Cache provides chat-members adapter
- **WHEN** `cache.chatMembersAdapter` is accessed
- **THEN** it returns a storage adapter compatible with `@grammyjs/chat-members` plugin
