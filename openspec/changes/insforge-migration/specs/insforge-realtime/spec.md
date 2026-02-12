## ADDED Requirements

### Requirement: InsForge Realtime WebSocket connection
The system SHALL establish a WebSocket connection to InsForge Realtime on dashboard load and subscribe to channels: `dashboard`, `bot_status`, `logs`, and `commands`.

#### Scenario: Dashboard connects to realtime
- **WHEN** the dashboard page mounts
- **THEN** the system calls `insforge.realtime.connect()` and subscribes to `dashboard` and `bot_status` channels

#### Scenario: Logs page connects to realtime
- **WHEN** the logs page mounts
- **THEN** the system subscribes to the `logs` channel for real-time log streaming

#### Scenario: Connection lost and recovered
- **WHEN** the WebSocket connection drops
- **THEN** InsForge SDK auto-reconnects and TanStack Query triggers `refetchOnReconnect` to fill any missed events

### Requirement: Verification events via database triggers
The system SHALL create a PostgreSQL trigger on `verification_log` that calls `realtime.publish('dashboard', 'verification', ...)` on every INSERT, sending user_id, group_id, status, cached, latency_ms, and timestamp.

#### Scenario: Bot writes verification log
- **WHEN** the bot inserts a row into `verification_log`
- **THEN** the trigger fires and publishes a `verification` event to the `dashboard` channel
- **THEN** all subscribed dashboard clients receive the event via WebSocket

### Requirement: Bot status events via database triggers
The system SHALL create a PostgreSQL trigger on `bot_status` that calls `realtime.publish('bot_status', 'status_changed', ...)` on INSERT or UPDATE, sending bot_instance_id, status, uptime_seconds, and last_heartbeat.

#### Scenario: Bot heartbeat updates status
- **WHEN** the bot updates its `bot_status` row with a new heartbeat timestamp
- **THEN** the trigger fires and publishes a `status_changed` event to the `bot_status` channel

### Requirement: Admin command status events via database triggers
The system SHALL create a PostgreSQL trigger on `admin_commands` that calls `realtime.publish('commands', 'command_updated', ...)` on UPDATE when status changes.

#### Scenario: Command completed
- **WHEN** the bot updates an admin_command status from `processing` to `completed`
- **THEN** the trigger fires and publishes a `command_updated` event with id, type, and status
- **THEN** the dashboard shows a success toast notification

#### Scenario: Command failed
- **WHEN** the bot updates an admin_command status to `failed`
- **THEN** the trigger fires and the dashboard shows an error toast notification

### Requirement: Log streaming via database triggers
The system SHALL create a PostgreSQL trigger on `admin_logs` that publishes ERROR, WARNING, and INFO level logs to the `logs` realtime channel. DEBUG level logs SHALL NOT be published to avoid flooding.

#### Scenario: Error log published
- **WHEN** a new row with level='ERROR' is inserted into `admin_logs`
- **THEN** the trigger publishes a `new_log` event with id, level, logger, message, and timestamp

#### Scenario: Debug log not published
- **WHEN** a new row with level='DEBUG' is inserted into `admin_logs`
- **THEN** no realtime event is published

### Requirement: Realtime channel registration
The system SHALL register 5 realtime channels in InsForge: `dashboard`, `verification:%`, `bot_status`, `logs`, and `commands` via SQL INSERT into `realtime.channels`.

#### Scenario: Channels registered
- **WHEN** the realtime setup migration is executed
- **THEN** all 5 channel patterns exist in `realtime.channels` with `enabled = true`

### Requirement: React hooks for realtime
The system SHALL provide React hooks (`useDashboardRealtime`, `useLogsRealtime`, `useCommandsRealtime`) that wrap InsForge Realtime subscriptions and integrate with TanStack Query cache invalidation.

#### Scenario: Dashboard realtime hook invalidates queries
- **WHEN** a `verification` event is received on the `dashboard` channel
- **THEN** the hook calls `queryClient.invalidateQueries(['dashboard'])` to trigger data refresh

#### Scenario: Cleanup on unmount
- **WHEN** the component using the realtime hook unmounts
- **THEN** the hook unsubscribes from all channels and disconnects
