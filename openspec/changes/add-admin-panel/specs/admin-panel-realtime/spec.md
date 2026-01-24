## ADDED Requirements

### Requirement: WebSocket Log Streaming
The system SHALL provide real-time log streaming via WebSocket as defined in `docs/admin-panel/04-API-DESIGN.md` Section 7.2.

#### Scenario: WebSocket connection
- **WHEN** client connects to `wss://api/ws/logs` with valid JWT
- **THEN** connection is established
- **AND** client receives acknowledgment

#### Scenario: Log subscription
- **WHEN** client sends subscribe message with level filter
- **THEN** only matching log entries are streamed

#### Scenario: Real-time log delivery
- **WHEN** new log entry is generated
- **THEN** entry is broadcast to subscribed clients within 100ms

#### Scenario: Connection authentication
- **WHEN** client connects without valid JWT
- **THEN** connection is rejected with 401

---

### Requirement: Log Viewer Component
The system SHALL provide a real-time log viewing component.

#### Scenario: Log display
- **WHEN** log viewer is open
- **THEN** new logs appear in real-time with color coding by level

#### Scenario: Auto-scroll
- **WHEN** auto-scroll is enabled
- **THEN** view scrolls to newest log entries

#### Scenario: Pause streaming
- **WHEN** user clicks pause button
- **THEN** log display stops updating
- **AND** new logs are buffered

#### Scenario: Log filtering
- **WHEN** user selects log level filter
- **THEN** only matching logs are displayed

---

### Requirement: Connection Resilience
The system SHALL handle WebSocket disconnections gracefully.

#### Scenario: Automatic reconnection
- **WHEN** WebSocket connection drops
- **THEN** client attempts reconnection with exponential backoff

#### Scenario: Connection status indicator
- **WHEN** WebSocket is disconnected
- **THEN** UI shows disconnection warning
