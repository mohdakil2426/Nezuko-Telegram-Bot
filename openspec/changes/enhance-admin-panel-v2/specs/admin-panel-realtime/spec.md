# admin-panel-realtime

Capability for real-time log streaming via WebSocket connection.

## ADDED Requirements

### Requirement: WebSocket Log Endpoint
The API MUST provide a WebSocket endpoint at `/api/v1/ws/logs` for real-time log streaming.

#### Scenario: WebSocket connection established
**Given** an authenticated admin user
**When** the user connects to `/api/v1/ws/logs?token=<jwt>`
**Then** the connection is established successfully
**And** the server sends a welcome message

#### Scenario: Unauthenticated connection rejected
**Given** a request without valid token
**When** attempting to connect to the WebSocket endpoint
**Then** the connection is rejected with 401 status

#### Scenario: Heartbeat maintains connection
**Given** an active WebSocket connection
**When** 30 seconds pass without activity
**Then** the server sends a heartbeat message
**And** the connection remains alive

---

### Requirement: Log Broadcasting
The API MUST broadcast log events to all connected WebSocket clients in real-time.

#### Scenario: Bot log appears in real-time
**Given** an admin has an active WebSocket connection
**When** the bot logs a verification event
**Then** the log entry appears in the WebSocket stream within 1 second

#### Scenario: Log entry format
**Given** a log event is broadcast
**When** the client receives the message
**Then** it contains: id, timestamp, level, logger, message, trace_id, extra

#### Scenario: Multiple clients receive logs
**Given** 3 admin users have active WebSocket connections
**When** a log event occurs
**Then** all 3 clients receive the log entry

---

### Requirement: Log Filtering
Clients MUST be able to filter logs by level and source.

#### Scenario: Filter by log level
**Given** an admin with active WebSocket connection
**When** the admin sends filter command: `{"action": "filter", "level": "error"}`
**Then** only ERROR level logs are sent to that client

#### Scenario: Filter by logger
**Given** an admin with active WebSocket connection
**When** the admin sends filter command: `{"action": "filter", "logger": "verification"}`
**Then** only logs from the verification logger are sent

#### Scenario: Clear filters
**Given** an admin has filters applied
**When** the admin sends: `{"action": "filter", "level": null, "logger": null}`
**Then** all log entries are sent again

---

### Requirement: Frontend Log Viewer
The Logs page MUST display real-time logs from the WebSocket connection.

#### Scenario: Connection status indicator
**Given** the admin opens the Logs page
**When** the WebSocket connection is established
**Then** a green "Connected" indicator is displayed

#### Scenario: Reconnection handling
**Given** the WebSocket connection drops
**When** the connection is lost
**Then** a "Reconnecting..." indicator is shown
**And** automatic reconnection is attempted with exponential backoff

#### Scenario: Log buffer limit
**Given** the log viewer has received 1000+ entries
**When** new logs arrive
**Then** oldest entries are removed to maintain 1000 entry limit

#### Scenario: Pause/resume streaming
**Given** the admin is viewing logs
**When** the admin clicks "Pause"
**Then** new logs are buffered but not displayed
**And** clicking "Resume" shows buffered logs
