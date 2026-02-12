## ADDED Requirements

### Requirement: Bot token management Edge Function
The system SHALL provide an Edge Function at slug `manage-bot` that handles bot token verification and addition. The function MUST call the Telegram Bot API (`https://api.telegram.org/bot<token>/getMe`) to validate tokens and return bot metadata (bot_id, username, name).

#### Scenario: Verify valid bot token
- **WHEN** the dashboard sends `{ action: "verify", token: "<valid-token>" }` to the `manage-bot` function
- **THEN** the function calls Telegram API `getMe`
- **THEN** returns `{ bot_id, username, name }` with status 200

#### Scenario: Verify invalid bot token
- **WHEN** the dashboard sends `{ action: "verify", token: "<invalid-token>" }` to the `manage-bot` function
- **THEN** the Telegram API returns `{ ok: false }`
- **THEN** the function returns `{ error: "Invalid token" }` with status 400

#### Scenario: Add bot with encryption
- **WHEN** the dashboard sends `{ action: "add", token: "<valid-token>" }` to the `manage-bot` function
- **THEN** the function verifies the token via Telegram API
- **THEN** encrypts the token with Fernet using `ENCRYPTION_KEY` from environment
- **THEN** inserts into `bot_instances` table and returns the created bot record

### Requirement: Webhook test Edge Function
The system SHALL provide an Edge Function at slug `test-webhook` that tests webhook URL connectivity by sending a test POST request and returning the response status.

#### Scenario: Webhook URL reachable
- **WHEN** the dashboard sends `{ url: "https://example.com/webhook" }` to the `test-webhook` function
- **THEN** the function sends a POST request with a test payload
- **THEN** returns `{ success: true, status: 200, latency_ms }`

#### Scenario: Webhook URL unreachable
- **WHEN** the dashboard sends a URL that times out or returns an error
- **THEN** the function returns `{ success: false, error: "Connection timeout" }`

### Requirement: Edge Function invocation from frontend
The system SHALL invoke Edge Functions via `insforge.functions.invoke('slug', { body: {...} })` from the service layer. Each function returns `{ data, error }`.

#### Scenario: Service calls Edge Function
- **WHEN** the bot management service needs to verify a token
- **THEN** it calls `insforge.functions.invoke('manage-bot', { body: { action: 'verify', token } })`
- **THEN** handles `{ data, error }` response pattern
