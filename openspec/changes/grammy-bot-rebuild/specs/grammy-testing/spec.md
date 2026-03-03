## ADDED Requirements

### Requirement: Vitest Configuration
The system SHALL provide a `vitest.config.ts` at `apps/grammy/vitest.config.ts` with: ESM support, test file pattern `tests/grammy/**/*.test.ts`, coverage provider (v8 or istanbul), coverage target 80%+, timeout 10_000ms. The config SHALL use `vitest/config` import style.

#### Scenario: Test runner discovers all tests
- **WHEN** `bun run test` is executed
- **THEN** vitest discovers and runs all `*.test.ts` files in `tests/grammy/`

#### Scenario: Coverage report is generated
- **WHEN** `bun run test:coverage` is executed
- **THEN** coverage report shows per-file line/branch/function coverage

---

### Requirement: Test Bot Helper with Transformer Mocking
The system SHALL provide a `tests/grammy/helpers/test-bot.ts` module exporting `createTestBot()`. This function SHALL: (1) Create a `Bot<NezukoContext>` with test token `"TEST_TOKEN"`, (2) Provide static `botInfo` (id, username, etc.) to skip `getMe()` API call, (3) Install a transformer that intercepts ALL outgoing API calls, records them in an `apiCalls` array, and returns `{ ok: true, result: true }`. Returns `{ bot, apiCalls }`.

#### Scenario: Test bot intercepts API calls
- **WHEN** `bot.handleUpdate(mockUpdate)` triggers a `reply()` call
- **THEN** `apiCalls` array contains `{ method: "sendMessage", payload: { ... } }`

#### Scenario: No real API calls are made
- **WHEN** any handler runs in test mode
- **THEN** zero HTTP requests reach Telegram API (all intercepted by transformer)

#### Scenario: API call payload is inspectable
- **WHEN** `ctx.api.restrictChatMember()` is called in a test
- **THEN** `apiCalls` contains `{ method: "restrictChatMember", payload: { chat_id, user_id, permissions } }`

---

### Requirement: Mock Update Factory
The system SHALL provide `tests/grammy/helpers/mock-update.ts` with factory functions: `createMessageUpdate(overrides?)` — creates a Telegram `Update` with `message` field (default: supergroup, non-bot user, text "/start"), `createCallbackUpdate(data)` — creates a `callback_query` update with specified data string, `createNewMemberUpdate(members)` — creates `message:new_chat_members` update, `createLeftMemberUpdate(member)` — creates `message:left_chat_member` update, `createMyChatMemberUpdate(oldStatus, newStatus)` — creates `my_chat_member` update for bot status changes. All factories SHALL produce valid Telegram `Update` objects matching the Bot API schema.

#### Scenario: Message update has correct structure
- **WHEN** `createMessageUpdate({ text: "/protect @test" })` is called
- **THEN** returned update has `update_id`, `message.chat` (supergroup), `message.from`, and `message.text`

#### Scenario: Callback update includes data
- **WHEN** `createCallbackUpdate("verify:-100123")` is called
- **THEN** returned update has `callback_query.data === "verify:-100123"`

#### Scenario: New member update has member array
- **WHEN** `createNewMemberUpdate([{ id: 789, first_name: "Test", is_bot: false }])` is called
- **THEN** returned update has `message.new_chat_members` array with the specified members

---

### Requirement: Mock Dependencies
The system SHALL provide `tests/grammy/helpers/mock-deps.ts` with factory functions: `createMockDb()` — returns a mock `InsForgeClient` with all methods mocked (vi.fn()), `createMockCache()` — returns a mock `CacheClient` with `get`, `set`, `del`, `quit` mocked, `createMockLogger()` — returns a mock pino logger with `info`, `warn`, `error`, `child` mocked.

#### Scenario: Mock DB is fully functional
- **WHEN** `createMockDb()` is called
- **THEN** every method on the returned DB client is a vitest mock that can be configured with `.mockResolvedValue()`

#### Scenario: Mock cache returns null by default
- **WHEN** `createMockCache().get("any")` is called without configuration
- **THEN** it returns `null` (simulating cache miss)

---

### Requirement: Unit Tests — Verification Service
The system SHALL provide `tests/grammy/unit/services/verification.test.ts` testing: (1) All channels verified → success, (2) Missing one channel → failure with channel name, (3) Multiple missing → all listed, (4) Cache hit skips API call, (5) 403 error → channel unreachable, (6) 400 error → user not found, (7) Restricted status → valid member (EC-43), (8) Redis down → graceful degradation (EC-59), (9) Latency is measured.

#### Scenario: Test coverage for core verification logic
- **WHEN** all 9 test cases pass
- **THEN** verification service has >90% line coverage

---

### Requirement: Unit Tests — Protection Service
The system SHALL provide `tests/grammy/unit/services/protection.test.ts` testing: (1) Successful mute, (2) Successful unmute with all permissions, (3) Kick with ban+unban, (4) 403 missing permission → descriptive error, (5) API timeout → error propagation.

#### Scenario: Protection tests cover all paths
- **WHEN** all 5 test cases pass
- **THEN** protection service has >90% line coverage

---

### Requirement: Unit Tests — Channel Linker Service
The system SHALL provide `tests/grammy/unit/services/channel-linker.test.ts` testing: (1) Successful link flow, (2) Channel not found, (3) Bot not admin in channel, (4) Already linked, (5) Max channels exceeded, (6) Counter recalculation correctness, (7) Unlink flow with counter update, (8) Unlink all.

#### Scenario: Linker tests cover validation chain
- **WHEN** all 8 test cases pass
- **THEN** channel linker service has >85% line coverage

---

### Requirement: Unit Tests — Middleware
The system SHALL provide `tests/grammy/unit/middleware/context-enricher.test.ts` testing: (1) Dependencies injected correctly, (2) Logger scoped with updateId. Provide `tests/grammy/unit/middleware/admin-guard.test.ts` testing: (3) Admin allowed, (4) Non-admin blocked, (5) Creator allowed. Provide `tests/grammy/unit/middleware/group-only.test.ts` testing: (6) Group proceeds, (7) Private blocked.

#### Scenario: Middleware tests verify filtering logic
- **WHEN** all 7 middleware test cases pass
- **THEN** all custom middleware have >80% line coverage

---

### Requirement: Integration Tests — Composers
The system SHALL provide integration tests that create a full test bot (via `createTestBot`), register composers and middleware, then feed mock updates via `bot.handleUpdate()` and assert on `apiCalls`.

Tests SHALL include:
- `tests/grammy/integration/composers/admin.test.ts`: /start in private, /start in group, /protect success, /protect validation failures (all 7 EC scenarios)
- `tests/grammy/integration/composers/events.test.ts`: new member muted, bot skipped (EC-1), admin skipped (EC-17), left member cleanup, message filter (verified pass, unverified delete, admin pass)
- `tests/grammy/integration/composers/verify.test.ts`: successful verify unmutes, missing channels, debounce, expired callback

#### Scenario: Integration tests verify full handler chain
- **WHEN** all composer integration tests pass
- **THEN** the middleware → composer → service chain is validated end-to-end

---

### Requirement: Integration Test — Bot Factory
The system SHALL provide `tests/grammy/integration/bot-factory.test.ts` that creates a full `Bot<NezukoContext>` via `createBot()`, verifies all plugins are installed, and processes a mock update through the entire pipeline.

#### Scenario: Bot factory creates valid bot
- **WHEN** `createBot(token, deps)` is called
- **THEN** returned bot has all transformers, middleware, and composers installed and can process updates
