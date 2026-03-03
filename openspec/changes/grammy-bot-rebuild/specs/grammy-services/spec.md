## ADDED Requirements

### Requirement: Verification Service — 3-Layer Membership Check
The system SHALL provide a `src/services/verification.ts` module with ZERO grammY imports (framework-agnostic). The `verifyMembership(api, db, cache, groupId, userId)` function SHALL check channel membership using 3 cache layers: (L1) `chat-members` plugin cache via `ctx.chatMembers.getChatMember()`, (L2) Redis key `member:{channelId}:{userId}` (5min TTL), (L3) Telegram API `getChatMember(channelId, userId)`. Valid member statuses: `["member", "administrator", "creator", "restricted"]` (EC-43). Returns `{ success: boolean, missingChannels: string[], latencyMs: number }`.

#### Scenario: All channels verified via cache
- **WHEN** user is a member of all channels and membership is cached
- **THEN** `verifyMembership` returns `{ success: true, missingChannels: [], latencyMs: <5 }`

#### Scenario: Channel membership via API fallback
- **WHEN** cache misses for a channel but API confirms membership
- **THEN** result is cached in Redis (5min TTL) and verification succeeds

#### Scenario: Missing single channel
- **WHEN** user is not a member of @channel2 but is a member of @channel1
- **THEN** returns `{ success: false, missingChannels: ["@channel2"] }`

#### Scenario: Channel unreachable (EC-15, EC-16)
- **WHEN** `getChatMember` returns 403 (channel private or bot removed)
- **THEN** function returns `null` for that channel (treated as "channel unreachable"), channel marked as inactive

#### Scenario: User not found (EC-42)
- **WHEN** `getChatMember` returns 400 USER_ID_INVALID
- **THEN** function treats user as "not a member" for that channel

#### Scenario: Restricted member is valid (EC-43)
- **WHEN** `getChatMember` returns status `"restricted"`
- **THEN** user IS considered a member (restrictions are not the same as non-membership)

#### Scenario: Redis down — graceful degradation (EC-59)
- **WHEN** Redis is unreachable
- **THEN** L2 cache is skipped, API fallback is used, and function logs a warning

---

### Requirement: Protection Service — Mute/Unmute/Kick
The system SHALL provide a `src/services/protection.ts` module with functions: `muteUser(api, chatId, userId)` — restricts all message permissions, `unmuteUser(api, chatId, userId)` — restores all permissions (`can_send_messages`, `can_send_media_messages`, `can_send_other_messages`, `can_add_web_page_previews`), `kickUser(api, chatId, userId)` — bans then unbans (Telegram kick pattern). All functions SHALL catch 403 errors gracefully (EC-19) and return a result indicating success/failure.

#### Scenario: Successful mute
- **WHEN** `muteUser()` is called for a non-admin user
- **THEN** `restrictChatMember` is called with `can_send_messages: false`

#### Scenario: Successful unmute
- **WHEN** `unmuteUser()` is called after verification
- **THEN** `restrictChatMember` is called with all permissions set to `true`

#### Scenario: Bot lacks permission (EC-19)
- **WHEN** `muteUser()` is called but bot lacks `can_restrict_members`
- **THEN** function catches 403 error and returns `{ success: false, error: "missing_permission" }`

#### Scenario: Kick unverified user after timeout
- **WHEN** `kickUser()` is called after 5 minutes without verification
- **THEN** `banChatMember` is called followed by `unbanChatMember` (allows rejoin)

---

### Requirement: Channel Linker Service
The system SHALL provide a `src/services/channel-linker.ts` module with functions: `linkChannel(ctx, channelUsername)` — performs full validation chain (see /protect spec), creates DB entries, updates counters. `unlinkChannel(ctx, channelUsername)` — removes link, recalculates counters. `unlinkAllChannels(ctx, groupId)` — removes all links, resets group counter to 0, recalculates each channel's counter. Denormalized counters (`linked_channels_count`, `linked_groups_count`) SHALL always be recalculated from actual `group_channel_links` rows (NEVER increment/decrement).

#### Scenario: Link creates all DB entries
- **WHEN** `linkChannel()` succeeds
- **THEN** entries are created/updated in `protected_groups`, `enforced_channels`, and `group_channel_links` tables, and both counters are recalculated

#### Scenario: Unlink recalculates counters
- **WHEN** `unlinkChannel()` removes a link
- **THEN** group's `linked_channels_count` and channel's `linked_groups_count` are recalculated from actual link rows (not decremented)

#### Scenario: Unlink all resets group counter
- **WHEN** `unlinkAllChannels()` is called
- **THEN** group's `linked_channels_count` is set to 0 and each channel's `linked_groups_count` is recalculated

---

### Requirement: Status Writer Service — 30-Second Heartbeat
The system SHALL provide a `src/services/status-writer.ts` module with a `startStatusWriter(api, db, botId)` function that returns a `NodeJS.Timeout`. Every 30 seconds, it SHALL UPSERT to the `bot_status` table with fields: `bot_id`, `status: "online"`, `uptime_seconds`, `last_heartbeat` (ISO 8601 timestamp). The UPSERT SHALL use PATCH-then-POST pattern (required for tables with multiple UNIQUE constraints).

#### Scenario: Heartbeat writes every 30 seconds
- **WHEN** the status writer is running
- **THEN** `bot_status` table is updated every 30 seconds with current uptime and timestamp

#### Scenario: First heartbeat creates row (POST)
- **WHEN** no `bot_status` row exists for this bot
- **THEN** a new row is created via POST

#### Scenario: Subsequent heartbeats update row (PATCH)
- **WHEN** a `bot_status` row already exists
- **THEN** the row is updated via PATCH

#### Scenario: DB error does not crash the service
- **WHEN** InsForge REST returns an error on heartbeat write
- **THEN** the error is logged and the next heartbeat is attempted in 30 seconds

---

### Requirement: Member Sync Service — 15-Minute Bulk Re-check
The system SHALL provide a `src/services/member-sync.ts` module with a `startMemberSync(api, db, botId)` function that returns a `NodeJS.Timeout`. Every 15 minutes, it SHALL: (1) Fetch all protected groups for this bot, (2) For each group, call `getChatMemberCount()` and update `member_count` in `protected_groups`, (3) For each linked channel, call `getChatMemberCount()` and update `subscriber_count` in `enforced_channels`, (4) Update `last_sync_at` timestamps.

#### Scenario: Member counts are synced
- **WHEN** the sync job runs
- **THEN** `member_count` and `subscriber_count` are updated in the database for all protected groups and linked channels

#### Scenario: API error for one group doesn't block others
- **WHEN** `getChatMemberCount` fails for group A
- **THEN** the error is logged and sync continues for remaining groups and channels

#### Scenario: Bot removed from group is handled
- **WHEN** `getChatMemberCount` returns 403 for a group (bot removed)
- **THEN** the group is marked as inactive in the database

---

### Requirement: Batch Verification Service (Scaffold)
The system SHALL provide a `src/services/batch-verification.ts` module with a `batchVerify(api, db, cache, groupId, userIds)` function that checks membership for multiple users in one operation. This is a P2 feature — the initial implementation SHALL be a scaffold with types and interface defined, but implementation deferred.

#### Scenario: Batch verify interface exists
- **WHEN** `batchVerify()` is imported
- **THEN** the function signature is available with correct types, but calls throw "Not implemented" error
