## ADDED Requirements

### Requirement: Unused production dependencies removed
The following unused production dependencies SHALL be removed from `pyproject.toml`: `asyncpg`, `alembic`, `aiohttp`, `pyjwt`.

#### Scenario: Dependencies removed from pyproject.toml
- **WHEN** `uv sync` is run after removal
- **THEN** the unused packages SHALL NOT be installed in the virtual environment

### Requirement: PTB webhooks extra installed
The `python-telegram-bot[webhooks]` extra SHALL be installed to enable webhook mode support.

#### Scenario: Webhook mode works
- **WHEN** the bot is configured to run in webhook mode
- **THEN** the required dependencies (tornado) SHALL be available

### Requirement: PTB callback-data extra installed
The `python-telegram-bot[callback-data]` extra SHALL be installed to enable arbitrary callback data support.

#### Scenario: Arbitrary callback data available
- **WHEN** a handler uses `CallbackContext.bot_data` with complex objects
- **THEN** the callback data serialization SHALL work correctly

### Requirement: HTTP/2 support installed
The `python-telegram-bot[http2]` extra or `httpx[http2]` SHALL be installed to enable HTTP/2 for Telegram API calls.

#### Scenario: HTTP/2 used for API calls
- **WHEN** the bot makes API calls to Telegram servers
- **THEN** HTTP/2 SHALL be used if the server supports it

### Requirement: Leave handler has generic catch
The leave handler SHALL have a generic exception catch at the outermost level to prevent unhandled exceptions from propagating.

#### Scenario: Unexpected error in leave handler
- **WHEN** an unexpected exception occurs during leave processing
- **THEN** the error SHALL be logged and the handler SHALL return gracefully

### Requirement: DRY welcome/help message
The `/start` and `/help` command handlers SHALL share a single message template to avoid duplication.

#### Scenario: Welcome and help show consistent info
- **WHEN** a user sends `/start` or `/help`
- **THEN** both commands SHALL render from the same base template
