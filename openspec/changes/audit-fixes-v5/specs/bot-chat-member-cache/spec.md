## ADDED Requirements

### Requirement: getChatMember results cached in Redis
The bot SHALL cache `getChatMember` API responses in Redis with a configurable TTL (default 5 minutes) per `(user_id, chat_id)` pair.

#### Scenario: First membership check calls API
- **WHEN** a user sends a message and their membership status is not cached
- **THEN** the system SHALL call the Telegram `getChatMember` API and cache the result

#### Scenario: Subsequent checks use cache
- **WHEN** a user sends another message within the TTL window
- **THEN** the system SHALL return the cached membership status without calling the API

#### Scenario: Cache expires after TTL
- **WHEN** the TTL (5 minutes) expires for a cached entry
- **THEN** the next membership check SHALL call the API and refresh the cache

### Requirement: Verification flow always uses live check
The verification callback handler SHALL always call the live `getChatMember` API, bypassing the cache to ensure accurate verification results.

#### Scenario: User clicks verify button
- **WHEN** a user presses the "Verify" inline button
- **THEN** the system SHALL call the live API to check membership status, ignoring any cache
