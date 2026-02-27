## ADDED Requirements

### Requirement: addBot passes master_key to edge function
The `addBot()` function SHALL fetch the master encryption key from the vault (via server action) and pass it in the request body to the `manage-bot` edge function.

#### Scenario: Bot token encrypted with AES-256-GCM
- **WHEN** a bot is added via the dashboard
- **THEN** the `manage-bot` edge function SHALL receive the `master_key` and encrypt the token with AES-256-GCM

#### Scenario: Master key not available fallback
- **WHEN** the vault does not contain a master key
- **THEN** the system SHALL display an error prompting the user to configure the Security Vault first

### Requirement: addBot passes real owner_telegram_id
The `addBot()` function SHALL NOT hardcode `owner_telegram_id: 0`. It SHALL derive the owner ID from the authenticated user's context or the bot's `getMe` info.

#### Scenario: Bot linked to owner
- **WHEN** a bot is added via the dashboard
- **THEN** the `bot_instances.owner_telegram_id` SHALL reference a valid `owners.user_id`

### Requirement: Encryption error handling uses specific exceptions
The `encryption.py` module SHALL catch specific exception types (`ValueError`, `binascii.Error`, `InvalidTag`) instead of bare `except Exception`.

#### Scenario: Invalid key raises ValueError
- **WHEN** an invalid base64 key is passed to decrypt
- **THEN** the system SHALL raise `ValueError` with a descriptive message

### Requirement: post_init and post_shutdown hooks in dashboard mode
The bot manager SHALL configure `post_init` and `post_shutdown` callbacks when running bots in dashboard mode.

#### Scenario: Bot initializes with post_init
- **WHEN** a bot starts in dashboard mode
- **THEN** the `post_init` callback SHALL execute to set up commands and register handlers
