## ADDED Requirements

### Requirement: InsForge REST Client (TypeScript Port)
The system SHALL provide a `src/core/insforge-client.ts` module with an `InsForgeClient` class that mirrors the Python bot's `insforge_client.py` refactored public API (Phase 95). The class SHALL use native `fetch()` API (NOT `@insforge/sdk`). Constructor SHALL accept `{ baseUrl, anonKey, logger }`. HTTP headers SHALL include `Authorization: Bearer {anonKey}` and `Content-Type: application/json`. The base URL path for records is `/api/database/records/{table}`.

#### Scenario: Client initializes with correct headers
- **WHEN** `new InsForgeClient({ baseUrl, anonKey, logger })` is called
- **THEN** all subsequent requests include `Authorization: Bearer {anonKey}` header

#### Scenario: Trailing slash in baseUrl is stripped
- **WHEN** baseUrl is `"https://example.insforge.app/"`
- **THEN** internal URL construction works correctly (no double slashes)

---

### Requirement: InsForge REST — getRecords<T> Method
The system SHALL provide a `getRecords<T>(table, params?)` method. It SHALL construct a GET request to `/api/database/records/{table}` with query parameters appended (PostgREST operators like `eq.`, `in.()`, `select`). On success (2xx), it SHALL parse JSON as `T[]`. On error, it SHALL throw with descriptive message including table name and HTTP status.

#### Scenario: Fetch all records from a table
- **WHEN** `getRecords<Group>("protected_groups")` is called
- **THEN** a GET request is made to `/api/database/records/protected_groups` and response is parsed as `Group[]`

#### Scenario: Fetch with PostgREST filter
- **WHEN** `getRecords("group_channel_links", { group_id: "eq.123" })` is called
- **THEN** request URL includes `?group_id=eq.123`

#### Scenario: HTTP error throws
- **WHEN** API returns 401 Unauthorized
- **THEN** an Error is thrown: `"InsForge GET protected_groups: 401 Unauthorized"`

---

### Requirement: InsForge REST — postRecords<T> Method
The system SHALL provide a `postRecords<T>(table, body, prefer?)` method. It SHALL construct a POST request with JSON body (array format — InsForge requires `[{...}]`). Default `Prefer` header: `"return=representation"`. On 204, return empty array. On 2xx, parse JSON as `T[]`.

#### Scenario: Insert a single record
- **WHEN** `postRecords("verification_log", [{ user_id: 123, status: "verified" }])` is called
- **THEN** POST body is `[{"user_id":123,"status":"verified"}]` with `Prefer: return=representation`

#### Scenario: Insert returns 204
- **WHEN** API returns 204 No Content
- **THEN** method returns empty array `[]`

---

### Requirement: InsForge REST — patchRecords<T> Method
The system SHALL provide a `patchRecords<T>(table, params, body)` method. It SHALL construct a PATCH request with query parameters identifying rows to update and JSON body with new values. `Prefer: return=representation` is always set.

#### Scenario: Update matching rows
- **WHEN** `patchRecords("protected_groups", { group_id: "eq.123" }, { member_count: 500 })` is called
- **THEN** PATCH request targets `?group_id=eq.123` with body `{"member_count":500}`

---

### Requirement: InsForge REST — deleteRecords Method
The system SHALL provide a `deleteRecords(table, params)` method. It SHALL construct a DELETE request with query parameters identifying rows to delete.

#### Scenario: Delete matching rows
- **WHEN** `deleteRecords("group_channel_links", { group_id: "eq.123", channel_id: "eq.456" })` is called
- **THEN** DELETE request targets `?group_id=eq.123&channel_id=eq.456`

---

### Requirement: InsForge REST — UPSERT Pattern (PATCH-then-POST)
For tables with multiple UNIQUE columns (e.g., `bot_status` with `bot_id UNIQUE` + `bot_instance_id UNIQUE`), the system SHALL use PATCH-then-POST pattern: attempt PATCH first, check if response is empty array (no matching row), then POST. PostgREST `Prefer: resolution=merge-duplicates` SHALL NOT be used (fails with 409 on multiple UNIQUE columns).

#### Scenario: UPSERT updates existing row
- **WHEN** `upsertBotStatus(botId, "online")` is called and row exists
- **THEN** PATCH succeeds and returns the updated row

#### Scenario: UPSERT creates new row
- **WHEN** `upsertBotStatus(botId, "online")` is called and no row exists
- **THEN** PATCH returns `[]`, then POST creates the row

---

### Requirement: Group Repository
The system SHALL provide `src/database/group.repo.ts` with functions: `getGroupChannels(db, groupId) → Channel[]` — fetches linked channels via two-step query (links → channels), `createGroup(db, groupId, ownerId, title, memberCount)` — UPSERTs `protected_groups`, `setGroupActive(db, groupId, active)` — updates `enabled` flag, `migrateGroupId(db, oldId, newId)` — updates group_id in `protected_groups` and `group_channel_links` tables (EC-6).

#### Scenario: Get channels via links table
- **WHEN** `getGroupChannels(db, -1001234567)` is called
- **THEN** first query fetches `channel_id`s from `group_channel_links`, second query fetches channel details from `enforced_channels`

#### Scenario: Group migration updates IDs
- **WHEN** `migrateGroupId(db, -100OLD, -100NEW)` is called
- **THEN** `protected_groups.group_id` and `group_channel_links.group_id` are both updated from old to new

---

### Requirement: Channel Repository
The system SHALL provide `src/database/channel.repo.ts` with functions: `createChannel(db, channelId, username, title, subscriberCount)` — UPSERTs `enforced_channels`, `updateSubscriberCount(db, channelId, count)` — updates `subscriber_count`.

#### Scenario: Channel is created or updated
- **WHEN** `createChannel(db, 123, "test_channel", "Test", 5000)` is called
- **THEN** channel is UPSERTed in `enforced_channels` table

---

### Requirement: Link Repository
The system SHALL provide `src/database/link.repo.ts` with functions: `createLink(db, groupId, channelId)` — inserts into `group_channel_links`, `removeLink(db, groupId, channelId)` — deletes from `group_channel_links`, `removeAllGroupLinks(db, groupId)` — deletes all links for a group, `getGroupChannelCount(db, groupId) → number` — counts links for counter recalculation, `getChannelGroupCount(db, channelId) → number` — counts links for counter recalculation.

#### Scenario: Link creation
- **WHEN** `createLink(db, -100123, 456)` is called
- **THEN** a row is inserted into `group_channel_links` with `group_id` and `channel_id`

#### Scenario: Counter recalculation
- **WHEN** `getGroupChannelCount(db, -100123)` is called
- **THEN** actual count of rows in `group_channel_links` WHERE `group_id = -100123` is returned

---

### Requirement: Verification Log Repository
The system SHALL provide `src/database/verification.repo.ts` with functions: `logVerification(db, data)` — inserts into `verification_log` table with fields: `user_id`, `group_id`, `channel_id`, `status` ("verified" or "failed"), `latency_ms`, `bot_id`, `created_at` (ISO 8601). `isUserVerified(db, groupId, userId) → boolean` — queries `verification_log` for a recent successful verification.

#### Scenario: Verification is logged
- **WHEN** `logVerification(db, { user_id: 789, group_id: -100123, status: "verified", latency_ms: 45 })` is called
- **THEN** a row is inserted into `verification_log` table

#### Scenario: User verification status is checked
- **WHEN** `isUserVerified(db, -100123, 789)` is called
- **THEN** returns `true` if a "verified" entry exists for that user+group combination

---

### Requirement: Bot Status Repository
The system SHALL provide `src/database/bot-status.repo.ts` with functions: `upsertBotStatus(db, data)` — UPSERTs `bot_status` using PATCH-then-POST pattern with fields: `bot_id`, `status`, `uptime_seconds`, `last_heartbeat`, `version` (package version). The writes SHALL be identical to the Python bot's status writer for dashboard compatibility.

#### Scenario: Status UPSERT matches Python bot format
- **WHEN** `upsertBotStatus(db, { bot_id: 123, status: "online", uptime_seconds: 3600 })` is called
- **THEN** the resulting DB row has the same field names and types as produced by the Python bot

---

### Requirement: Database Entity Types
The system SHALL provide `src/database/types.ts` defining TypeScript interfaces for all database entities: `ProtectedGroup` (group_id: number BIGINT-safe, owner_id, title, member_count, enabled, linked_channels_count, created_at, updated_at, last_sync_at), `EnforcedChannel` (channel_id: number, username, title, subscriber_count, linked_groups_count), `GroupChannelLink` (id, group_id, channel_id, created_at), `VerificationLog` (id, user_id, group_id, channel_id, status, latency_ms, bot_id, created_at), `BotStatus` (id, bot_id, status, uptime_seconds, last_heartbeat, version). All Telegram IDs SHALL be TypeScript `number` (safe up to 2^53 — Telegram IDs are currently < 10B) (EC-62).

#### Scenario: Telegram BIGINT IDs are safe as number
- **WHEN** a Telegram ID like `8265490825` is stored
- **THEN** JavaScript `number` type represents it exactly (8265490825 < 2^53 = 9007199254740992)

#### Scenario: Types match existing database schema
- **WHEN** `ProtectedGroup` interface is used
- **THEN** all field names match columns in `insforge/migrations/009_clean_schema.sql`
