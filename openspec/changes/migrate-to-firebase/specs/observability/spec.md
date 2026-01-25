## MODIFIED Requirements
### Requirement: Real-time Log Streaming
The system SHALL stream application logs to authenticated administrators in real-time.

#### Scenario: Stream Logs via Realtime Database
- **WHEN** the backend processes a log entry with `service=bot`
- **THEN** it pushes the log entry to Firebase Realtime Database at `/logs/{user_id}`
- **AND** the frontend receives the update via active subscription

## REMOVED Requirements
### Requirement: WebSocket Log Streaming
**Reason**: Replaced by robust Firebase Realtime Database sync.
**Migration**: Remove WebSocket endpoints and connection logic.
