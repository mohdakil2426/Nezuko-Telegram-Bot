## ADDED Requirements

### Requirement: Foreign keys added for bot_status and admin_commands
The database SHALL add foreign key constraints: `bot_status.bot_instance_id` → `bot_instances.id` and `admin_commands.bot_id` → `bot_instances.id`.

#### Scenario: Bot status references valid bot instance
- **WHEN** a bot status record is inserted
- **THEN** the `bot_instance_id` MUST reference an existing `bot_instances.id`

#### Scenario: Invalid bot_id rejected
- **WHEN** an `admin_commands` record with a non-existent `bot_id` is inserted
- **THEN** the database SHALL reject the insert with a foreign key violation

### Requirement: bot_id column added to admin_logs and api_call_log
The tables `admin_logs` and `api_call_log` SHALL have a `bot_id` INTEGER column (nullable) to support per-bot log filtering.

#### Scenario: Bot writes log with bot_id
- **WHEN** the bot writes a log entry to `admin_logs`
- **THEN** the `bot_id` column SHALL contain the bot instance ID

#### Scenario: Logs filterable by bot
- **WHEN** the dashboard queries logs with a `bot_id` filter
- **THEN** only logs from that specific bot SHALL be returned

### Requirement: RPC functions verified
All 13 RPC functions called by the web dashboard SHALL be verified to exist in the database. Missing functions SHALL be created.

#### Scenario: Dashboard stats RPC exists
- **WHEN** the dashboard calls `.rpc("get_dashboard_stats")`
- **THEN** the function SHALL exist and return valid data
