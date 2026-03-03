## ADDED Requirements

### Requirement: Admin Composer — /start Command
The system SHALL handle the `/start` command in both private and group chats. In private chats, it SHALL reply with a welcome message explaining the bot's purpose and how to get started (`/protect @channel`). In group chats, it SHALL reply with a brief "I'm active" message. Deep link payloads (`ctx.match`) SHALL be supported for future use.

#### Scenario: /start in private chat
- **WHEN** a user sends `/start` in a private chat
- **THEN** bot replies with HTML-formatted welcome message including bot name, purpose, and `/protect` instructions

#### Scenario: /start in group chat
- **WHEN** a user sends `/start` in a supergroup
- **THEN** bot replies "I'm active in this group! Use /help for commands."

#### Scenario: /start with deep link payload
- **WHEN** a user opens `https://t.me/bot?start=some_payload`
- **THEN** `ctx.match` contains `"some_payload"` for handler processing

---

### Requirement: Admin Composer — /help Command
The system SHALL handle the `/help` command, listing all available commands with HTML formatting: `/protect @channel`, `/unprotect @channel`, `/channels`, `/settings`, `/verify`, `/stats`, `/help`.

#### Scenario: /help shows command list
- **WHEN** a user sends `/help`
- **THEN** bot replies with HTML-formatted list of all 8 commands with descriptions

---

### Requirement: Admin Composer — /protect Command
The system SHALL handle the `/protect @channel` command to link a channel to a group. The command SHALL: (1) Verify sender is admin (EC-30), (2) Verify chat is supergroup (EC-29), (3) Parse channel username from `ctx.match`, (4) Validate channel exists via `getChat()` (EC-26), (5) Verify bot is admin in channel (EC-27), (6) Check channel not already linked (EC-28), (7) Check max channels limit (5) (EC-33), (8) Verify bot is admin in group (EC-31), (9) Create ProtectedGroup + EnforcedChannel + GroupChannelLink in DB, (10) Update denormalized counters, (11) Reply with success confirmation.

#### Scenario: Successful channel protection
- **WHEN** admin sends `/protect @testchannel` in a supergroup where bot is admin in both group and channel
- **THEN** bot creates DB entries and replies "✅ Channel linked! New members must join @testchannel to chat"

#### Scenario: Non-admin attempts /protect
- **WHEN** a regular member sends `/protect @channel`
- **THEN** bot replies "⚠️ Only admins can use this command."

#### Scenario: Channel not found (EC-26)
- **WHEN** admin sends `/protect @nonexistent`
- **THEN** bot replies "❌ Channel @nonexistent not found."

#### Scenario: Bot not admin in channel (EC-27)
- **WHEN** admin sends `/protect @channel` but bot is not admin in the channel
- **THEN** bot replies "❌ I need to be an admin in @channel first."

#### Scenario: Channel already linked (EC-28)
- **WHEN** admin sends `/protect @channel` for an already-linked channel
- **THEN** bot replies "ℹ️ @channel is already linked to this group."

#### Scenario: Max channels reached (EC-33)
- **WHEN** group already has 5 linked channels and admin sends `/protect @sixth`
- **THEN** bot replies "⚠️ Maximum 5 channels per group. Remove one first with /unprotect."

#### Scenario: Chat is basic group (EC-29)
- **WHEN** command is sent in a basic group (not supergroup)
- **THEN** bot replies "⚠️ Protection only works in supergroups. Please convert this group first."

#### Scenario: Missing argument
- **WHEN** admin sends `/protect` without a channel username
- **THEN** bot replies "Usage: `/protect @channelname`"

---

### Requirement: Admin Composer — /unprotect Command
The system SHALL handle the `/unprotect @channel` command to unlink a channel from a group. The command SHALL verify sender is admin, check the channel is linked, remove the GroupChannelLink, recalculate denormalized counters (using full recount from `group_channel_links` rows, NOT decrement), and reply with confirmation.

#### Scenario: Successful unprotect
- **WHEN** admin sends `/unprotect @testchannel` for a linked channel
- **THEN** bot removes the link, recalculates counters, and replies "✅ @testchannel unlinked."

#### Scenario: Channel not linked
- **WHEN** admin sends `/unprotect @notlinked`
- **THEN** bot replies "ℹ️ @notlinked is not linked to this group."

---

### Requirement: Admin Composer — /settings Command
The system SHALL handle the `/settings` command, displaying current group protection settings: linked channels list, protection status (active/inactive), member count, and last sync timestamp.

#### Scenario: Protected group settings
- **WHEN** admin sends `/settings` in a protected group with 2 linked channels
- **THEN** bot replies with formatted settings showing channel list, status "Active", member count, and last sync time

#### Scenario: Unprotected group
- **WHEN** `/settings` is sent in a group with no linked channels
- **THEN** bot replies "No channels linked. Use `/protect @channel` to get started."

---

### Requirement: Channels Composer — /channels Command
The system SHALL handle the `/channels` command, listing all channels linked to the current group with their titles, usernames, and subscriber counts.

#### Scenario: Group has linked channels
- **WHEN** `/channels` is sent in a group with 3 linked channels
- **THEN** bot replies with numbered list of channels (title, @username, subscriber count)

#### Scenario: Group has no linked channels
- **WHEN** `/channels` is sent in unprotected group
- **THEN** bot replies "No channels linked to this group."

---

### Requirement: Channels Composer — /verify Command (Status Check Only)
The system SHALL handle the `/verify` command as a status check (NOT an unmute action). It SHALL check if the sender is verified for all linked channels and reply with their verification status. The inline button is the primary verification flow — `/verify` is informational only.

#### Scenario: User is verified
- **WHEN** a verified user sends `/verify`
- **THEN** bot replies "✅ You're verified! You can send messages in this group."

#### Scenario: User is not verified
- **WHEN** an unverified user sends `/verify`
- **THEN** bot replies "❌ Not verified. Please join: @channel1, @channel2"

---

### Requirement: Channels Composer — /stats Command
The system SHALL handle the `/stats` command, displaying group statistics: total verifications, success rate, member count, linked channels count, and bot uptime.

#### Scenario: Stats displayed
- **WHEN** admin sends `/stats` in a protected group
- **THEN** bot replies with formatted stats including verification counts and success rate

---

### Requirement: Events Composer — New Member Join Handler
The system SHALL handle `message:new_chat_members` events. For each non-bot new member: (1) Skip bots (EC-1), (2) Skip members without ID (EC-9), (3) Check if admin → skip (EC-17), (4) Query linked channels via DB, (5) If protected: mute user (`restrictChatMember` with `can_send_messages: false`), (6) Build InlineKeyboard with channel join links + "✅ Verify" button with callback data `verify:{chatId}`, (7) Send greeting message with keyboard, (8) Auto-delete greeting after 5 minutes. The handler SHALL iterate `ctx.msg.new_chat_members` array (EC-2, EC-5).

#### Scenario: New member is muted and shown verification
- **WHEN** a non-admin user joins a protected supergroup
- **THEN** bot mutes the user and sends a greeting with channel join links and a verify button

#### Scenario: Bot joining is skipped (EC-1)
- **WHEN** a bot (including Nezuko itself) joins the group via new_chat_members
- **THEN** the handler skips that member

#### Scenario: Admin joining is not muted (EC-17)
- **WHEN** a group administrator joins via new_chat_members
- **THEN** the handler skips muting that member

#### Scenario: Multiple users join simultaneously (EC-2, EC-5)
- **WHEN** User A adds User B and User C to the group
- **THEN** the handler processes User B and User C independently (iterating the array)

#### Scenario: Unprotected group join is ignored
- **WHEN** a user joins a group with no linked channels
- **THEN** no muting or verification message occurs

#### Scenario: Auto-delete after timeout
- **WHEN** 5 minutes pass after the verification message is sent
- **THEN** the verification message is deleted (errors caught silently)

---

### Requirement: Events Composer — Member Leave Handler
The system SHALL handle `message:left_chat_member` events: (1) Delete the "X left the group" service message (EC-24: catch if already deleted), (2) If left user is not a bot, invalidate verification cache for that user.

#### Scenario: Leave message is deleted
- **WHEN** a user leaves the group
- **THEN** the "User left the group" service message is deleted

#### Scenario: Verification cache is invalidated on leave
- **WHEN** a non-bot user leaves the group
- **THEN** `verified:{groupId}:{userId}` cache key is deleted from Redis

#### Scenario: Already-deleted message is handled (EC-24)
- **WHEN** another bot or admin already deleted the leave message
- **THEN** the `deleteMessage()` error is caught silently

---

### Requirement: Events Composer — Message Filter
The system SHALL filter messages from unverified users in protected groups. The filter SHALL: (1) Skip own messages (EC-36), (2) Skip auto-forwarded channel posts (EC-39: `sender_chat` present), (3) Skip service messages without `from` (EC-40), (4) Query linked channels — skip if unprotected, (5) Check admin status — always allow admins (EC-35), (6) Check Redis cache `verified:{groupId}:{userId}`, (7) Check DB `isUserVerified()`, (8) If verified in DB but not cache: write to cache (1h TTL), (9) If not verified: delete the message. The filter SHALL apply to ALL message types, not just text (EC-37).

#### Scenario: Verified user's message passes
- **WHEN** a verified user sends a message in a protected group
- **THEN** the message is NOT deleted

#### Scenario: Unverified user's message is deleted
- **WHEN** an unverified user sends a text/photo/video message in a protected group
- **THEN** the message is deleted

#### Scenario: Admin's message always passes (EC-35)
- **WHEN** an unverified admin sends a message
- **THEN** the message is NOT deleted (admins are always allowed)

#### Scenario: Bot's own messages pass (EC-36)
- **WHEN** the bot sends a reply message
- **THEN** the message filter skips it

#### Scenario: Channel auto-post passes (EC-39)
- **WHEN** a linked channel auto-forwards a post (sender_chat present)
- **THEN** the message is NOT deleted

---

### Requirement: Verify Composer — Callback Query Handler
The system SHALL handle callback queries matching `/^verify:(-?\d+)$/`. The handler SHALL: (1) Extract groupId from regex match, (2) Get userId from `ctx.from.id`, (3) Debounce: check Redis `verify_debounce:{userId}` (3s TTL) (EC-11), (4) Verify membership across all linked channels using 3-layer cache, (5) On success: unmute user (restore all permissions), cache verification status (6h TTL), log to `verification_log`, answer callback query "✅ Verified!", delete verification message, (6) On failure: answer callback query "❌ Please join: @channel1, @channel2" (list missing channels).

#### Scenario: Successful verification
- **WHEN** user clicks verify button after joining all required channels
- **THEN** user is unmuted, verification is cached and logged, callback is answered with "✅ Verified!", and verification message is deleted

#### Scenario: Missing channels
- **WHEN** user clicks verify button without joining @channel2
- **THEN** callback is answered with "❌ Please join: @channel2" (show_alert: true)

#### Scenario: Rapid double-click debounce (EC-11)
- **WHEN** user clicks verify button twice within 3 seconds
- **THEN** first click processes normally, second click gets "⏳ Processing..." response

#### Scenario: Expired callback query (EC-12)
- **WHEN** user clicks a verify button from >15 seconds ago and `answerCallbackQuery` throws `QUERY_ID_INVALID`
- **THEN** the 400 error is caught silently

#### Scenario: Verification message already deleted (EC-14)
- **WHEN** verification succeeds but the message was already deleted
- **THEN** the `deleteMessage()` error is caught silently

---

### Requirement: Migration Composer — Supergroup Migration Handler
The system SHALL handle `migrate_to_chat_id` messages (EC-6). When a basic group migrates to a supergroup, the handler SHALL update the group ID in the database from old chat ID to new chat ID.

#### Scenario: Group migration updates database
- **WHEN** a basic group migrates to a supergroup (new chat ID assigned)
- **THEN** the group's ID is updated in `protected_groups` table

---

### Requirement: Fallback Composer — Catch-All Callback Answerer
The system SHALL register a handler on `callback_query:data` as the LAST composer that answers ANY unclaimed callback query with an empty response. This prevents Telegram's infinite loading spinner on buttons (grammY deployment checklist).

#### Scenario: Unknown callback query is answered
- **WHEN** a callback query with unrecognized data arrives (not matching "verify:*")
- **THEN** the query is answered with an empty response (loading spinner removed)

---

### Requirement: Bot Added-to-Group Welcome (my_chat_member)
The system SHALL handle `my_chat_member` updates. When the bot is added to a group as administrator, it SHALL send a one-time welcome message: "Hi! I'm Nezuko 🌸 — use `/protect @channel` to enable verification". When the bot is demoted to regular member, it SHALL mark the group as inactive. When removed/kicked, it SHALL mark the group as inactive and clean up cache.

#### Scenario: Bot added as admin
- **WHEN** bot is added to a group as administrator
- **THEN** bot sends welcome message with `/protect` instructions

#### Scenario: Bot demoted (EC-48)
- **WHEN** bot status changes from administrator to member
- **THEN** bot marks group as inactive in DB and logs warning

#### Scenario: Bot removed (EC-49)
- **WHEN** bot is kicked or leaves the group
- **THEN** bot marks group as inactive in DB and invalidates cache keys for that group
