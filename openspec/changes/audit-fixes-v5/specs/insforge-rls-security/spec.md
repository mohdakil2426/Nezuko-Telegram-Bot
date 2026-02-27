## ADDED Requirements

### Requirement: RLS enabled on all public tables
The system SHALL enable Row-Level Security on all 12 tables in the `public` schema: `owners`, `bot_instances`, `bot_status`, `protected_groups`, `enforced_channels`, `group_channel_links`, `admin_commands`, `admin_config`, `admin_logs`, `api_call_log`, `verification_log`, `nezuko_secrets`.

#### Scenario: Anonymous user cannot read secrets
- **WHEN** an unauthenticated request queries `nezuko_secrets` via the anon key
- **THEN** the system SHALL return zero rows

#### Scenario: Anonymous user cannot read bot tokens
- **WHEN** an unauthenticated request queries `bot_instances` via the anon key
- **THEN** the system SHALL return zero rows

#### Scenario: Authenticated user can access allowed data
- **WHEN** an authenticated user with role `authenticated` queries any table
- **THEN** the system SHALL return rows permitted by the user's RLS policy

### Requirement: Bot admin key bypasses RLS
The bot's admin API key (service-role) SHALL bypass RLS so bot operations are unaffected by policy changes.

#### Scenario: Bot reads all protected groups
- **WHEN** the bot queries `protected_groups` using the admin API key
- **THEN** the system SHALL return all rows regardless of RLS policies

### Requirement: Realtime RLS optional enablement
The system SHALL provide SQL migration to enable RLS on `realtime.channels` and `realtime.messages` with appropriate subscribe/publish policies.

#### Scenario: RLS enabled on realtime channels
- **WHEN** RLS is enabled on `realtime.channels`
- **THEN** only authenticated users can subscribe to channels matching their access policies
