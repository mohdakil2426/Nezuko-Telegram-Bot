## ADDED Requirements

### Requirement: Global error handler registered
The bot SHALL register a global error handler via `Application.add_error_handler()` that catches all unhandled exceptions from handlers, jobs, and update processing.

#### Scenario: Handler throws unhandled exception
- **WHEN** a handler raises an uncaught exception
- **THEN** the global error handler SHALL log the full traceback with `logger.error()` and NOT crash the bot

#### Scenario: Error handler logs context
- **WHEN** an error is caught by the global handler
- **THEN** the log entry SHALL include the update that caused the error, the error type, and the traceback

### Requirement: Admin notification on critical errors
The global error handler SHALL send a Telegram message to the bot owner when a critical error occurs.

#### Scenario: Owner notified of error
- **WHEN** a critical exception is caught
- **THEN** the system SHALL send a message to the configured admin chat with error summary
