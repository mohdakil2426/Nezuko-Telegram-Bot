## ADDED Requirements

### Requirement: Bot status writer service
The system SHALL provide a `status_writer.py` service that replaces the HeartbeatService. It MUST write to the `bot_status` table using an UPSERT pattern (INSERT ON CONFLICT UPDATE) every 30 seconds, updating `last_heartbeat`, `status`, and `uptime_seconds`.

#### Scenario: Heartbeat loop running
- **WHEN** the bot starts
- **THEN** the status_writer starts a background task (RUF006 compliant) that writes to `bot_status` every 30 seconds

#### Scenario: Bot status set to running
- **WHEN** the status_writer performs a heartbeat write
- **THEN** it upserts into `bot_status` with `status='running'`, `last_heartbeat=NOW()`, and `uptime_seconds` calculated from `started_at`

#### Scenario: Bot shutdown
- **WHEN** the bot process shuts down gracefully
- **THEN** the status_writer writes `status='stopped'` to `bot_status` before exit

### Requirement: Command queue worker service
The system SHALL provide a `command_worker.py` service that polls the `admin_commands` table every 1 second for pending commands, executes them via the Telegram Bot API, and updates the command status to `completed` or `failed`.

#### Scenario: Pending command found
- **WHEN** a row in `admin_commands` has `status='pending'`
- **THEN** the worker sets it to `processing`, executes the command, then sets it to `completed` with `executed_at=NOW()`

#### Scenario: Command execution fails
- **WHEN** command execution raises an exception
- **THEN** the worker sets the command status to `failed` with `error_message` containing the exception string (truncated to 500 chars)

#### Scenario: Ban user command
- **WHEN** the command type is `ban_user` with payload `{ chat_id, user_id }`
- **THEN** the worker calls `bot_app.bot.ban_chat_member(chat_id, user_id)`

#### Scenario: Unban user command
- **WHEN** the command type is `unban_user` with payload `{ chat_id, user_id }`
- **THEN** the worker calls `bot_app.bot.unban_chat_member(chat_id, user_id)`

### Requirement: Remove EventPublisher dependency
The system SHALL remove `apps/bot/services/event_publisher.py` and all references to it. The bot SHALL NOT make HTTP calls to any API endpoint for event publishing.

#### Scenario: Bot starts without EventPublisher
- **WHEN** the bot starts
- **THEN** it does NOT initialize EventPublisher or configure API base URL for event publishing

### Requirement: Remove HeartbeatService dependency
The system SHALL remove `apps/bot/services/heartbeat.py` and all references to it. The bot SHALL NOT make HTTP calls to any API endpoint for heartbeat.

#### Scenario: Bot starts without HeartbeatService
- **WHEN** the bot starts
- **THEN** it does NOT initialize HeartbeatService
- **THEN** the status_writer service handles all heartbeat functionality via direct DB writes

### Requirement: Bot DATABASE_URL points to InsForge
The bot's `DATABASE_URL` environment variable SHALL point to the InsForge PostgreSQL connection string with `sslmode=require`. The SQLAlchemy async engine configuration (pool_size, max_overflow, pool_pre_ping) SHALL remain unchanged.

#### Scenario: Bot connects to InsForge PostgreSQL
- **WHEN** the bot starts with `DATABASE_URL=postgresql+asyncpg://<user>:<pass>@<insforge-host>:<port>/<db>?sslmode=require`
- **THEN** SQLAlchemy creates an async engine with the InsForge connection string
- **THEN** all existing CRUD operations work against the InsForge database

### Requirement: Verification logger continues DB writes
The bot's verification logger SHALL continue writing directly to the `verification_log` table via SQLAlchemy. It SHALL NOT publish SSE events via HTTP. The PostgreSQL trigger on `verification_log` handles realtime notification.

#### Scenario: Verification logged
- **WHEN** a verification event occurs
- **THEN** the verification logger inserts a row into `verification_log` via SQLAlchemy
- **THEN** the PostgreSQL trigger automatically publishes the event to the `dashboard` realtime channel
