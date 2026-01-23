# channel-guard Specification

## Purpose
TBD - created by archiving change init-channel-verification-bot. Update Purpose after archive.
## Requirements
### Requirement: Enforce Channel Membership
The system SHALL restrict group participants from sending messages if they are not members of the configured Telegram Channel(s). Configuration SHALL be stored in a PostgreSQL database and queried at runtime instead of static environment variables.

#### Scenario: Non-member attempts to speak (multi-tenant)
- **WHEN** a user who is NOT a member of ANY linked channel sends a message in the group
- **THEN** the bot queries the database for `protected_groups` matching the group_id
- **AND** retrieves associated channels via `group_channel_links` table
- **AND** checks membership in all linked channels using cache-aware verification service
- **AND** if ANY channel membership is missing, the bot deletes the message AND restricts the user from sending messages (Mute)
- **AND** the bot sends a unique warning with "Join Channel" and "I have joined" buttons

#### Scenario: Member speaks (database-driven)
- **WHEN** a user who IS a member of ALL linked channels sends a message
- **THEN** the bot queries the database for linked channels
- **AND** verifies membership (checking cache first, then API if cache miss)
- **AND** the message is allowed (Bot takes no action)

#### Scenario: Admin speaks
- **WHEN** a Group Admin or Channel Admin sends a message
- **THEN** the message is allowed (Bot takes no action)

#### Scenario: Cache hit reduces latency
- **WHEN** a verified user sends multiple messages within cache TTL
- **THEN** the bot retrieves membership status from Redis cache
- **AND** verification completes in <10ms (no Telegram API call)

#### Scenario: Group not protected
- **WHEN** a message is sent in a group not in the `protected_groups` table
- **THEN** the bot takes no action (allows message)

### Requirement: User Re-verification  
The system SHALL allow restricted users to self-verify their membership and regain sending permissions using a cache-aware verification flow.

#### Scenario: User validates membership (cache-aware)
- **WHEN** a restricted user joins the channel AND clicks the "I have joined" button
- **THEN** the bot invalidates cached membership status for that user-channel pair
- **AND** re-checks membership status via Telegram API
- **AND** if confirmed member, caches the positive result (10min TTL with jitter)
- **AND** unmutes the user (restores `can_send_messages`) AND deletes the warning message

#### Scenario: User clicks verify without joining
- **WHEN** a restricted user clicks "I have joined" but has NOT joined the channel
- **THEN** the bot invalidates cache and checks API
- **AND** caches negative result (1min TTL with jitter)
- **AND** displays an alert (toast) saying "You still haven't joined the channel!"
- **AND** the user remains restricted

### Requirement: Multi-Tenant Configuration
The system SHALL support multiple groups with independent channel enforcement configurations stored in a relational database.

#### Scenario: Multiple groups protected
- **WHEN** multiple groups have run `/protect` command
- **THEN** each group's configuration is stored independently in the database
- **AND** the bot verifies users against their group's specific linked channels
- **AND** no cross-group interference occurs (user muted in Group A doesn't affect Group B)

#### Scenario: One channel protects many groups
- **WHEN** a single channel (e.g., @MainChannel) is used by multiple groups
- **THEN** the bot efficiently caches membership checks for that channel
- **AND** a user verified in @MainChannel is cached across all groups using that channel

### Requirement: Database-Driven Channel Links
The system SHALL query the database at runtime to determine which channels to enforce for each group rather than using static configuration files.

#### Scenario: Dynamic channel lookup
- **WHEN** a user sends a message in a protected group
- **THEN** the bot executes: `SELECT channels FROM group_channel_links WHERE group_id = ?`
- **AND** uses the result to determine verification requirements
- **AND** query completes in <50ms (p95)

#### Scenario: Protection disabled
- **WHEN** an admin runs `/unprotect` for a group
- **THEN** the bot updates `protected_groups.enabled = FALSE` in the database
- **AND** subsequent messages bypass verification (no enforcement)

### Requirement: Distributed Cache Integration
The system SHALL use Redis for membership verification caching with TTL jitter to prevent thundering herd scenarios.

#### Scenario: Cache positive membership
- **WHEN** a user is verified as a channel member
- **THEN** the bot stores the result in Redis with key `verify:{user_id}:{channel_id}`
- **AND** sets TTL to 600 seconds ± 90 seconds (15% jitter)
- **AND** subsequent verifications within TTL skip Telegram API calls

#### Scenario: Cache negative membership  
- **WHEN** a user is verified as NOT a channel member
- **THEN** the bot caches the negative result with TTL 60 seconds ± 9 seconds (15% jitter)
- **AND** allows retry verification after cache expires (faster re-verification after user joins)

#### Scenario: Cache unavailable (graceful degradation)
- **WHEN** Redis is unavailable or connection fails
- **THEN** the bot logs a warning and skips caching
- **AND** falls back to direct Telegram API calls for verification
- **AND** continues operating normally (degraded performance, but functional)

